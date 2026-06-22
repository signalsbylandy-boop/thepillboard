import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'
import { verifyToken, extractBearerToken } from '../lib/auth'

// Populates c.var.user if a valid token is present — does not reject unauthenticated requests
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const token = extractBearerToken(c.req.header('Authorization') ?? null)
  if (token) {
    const payload = await verifyToken(token, c.env)
    c.set('user', payload)
  } else {
    c.set('user', null)
  }
  await next()
}

// Rejects unauthenticated requests
export function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  if (!c.get('user')) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }
  return next()
}

// Rejects non-moderator/admin requests
export function requireMod(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const user = c.get('user')
  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }
  return next()
}

export function requireAdmin(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const user = c.get('user')
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }
  return next()
}
