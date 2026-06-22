import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../types'

const TOKEN_EXPIRY = '7d'
const RESET_EXPIRY = '1h'

// ─── Password Hashing (Web Crypto PBKDF2) ────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const combined = new Uint8Array(salt.length + hash.byteLength)
  combined.set(salt)
  combined.set(new Uint8Array(hash), salt.length)
  return btoa(String.fromCharCode(...combined))
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
    const salt = combined.slice(0, 16)
    const existingHash = combined.slice(16)
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ])
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    const newHash = new Uint8Array(hash)
    if (newHash.length !== existingHash.length) return false
    // Constant-time comparison
    let diff = 0
    for (let i = 0; i < newHash.length; i++) {
      diff |= newHash[i]! ^ existingHash[i]!
    }
    return diff === 0
  } catch {
    return false
  }
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function getJwtSecret(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export interface JwtPayload {
  sub: string
  username: string
  role: string
  sessionId: string
}

export async function signToken(payload: JwtPayload, env: Env): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuer('thepillboard.com')
    .sign(getJwtSecret(env))
}

export async function verifyToken(token: string, env: Env): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(env), {
      issuer: 'thepillboard.com',
    })
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function signResetToken(userId: string, env: Env): Promise<string> {
  return new SignJWT({ sub: userId, type: 'reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(RESET_EXPIRY)
    .sign(getJwtSecret(env))
}

export async function verifyResetToken(
  token: string,
  env: Env
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(env))
    if (payload['type'] !== 'reset' || !payload.sub) return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}

// ─── Session Token ────────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '')
}

export function generateVerifyToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '')
}

// ─── Extract token from request ───────────────────────────────────────────────

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
