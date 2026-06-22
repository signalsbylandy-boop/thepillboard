import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import {
  hashPassword,
  verifyPassword,
  signToken,
  generateSessionToken,
  generateVerifyToken,
  verifyResetToken,
  signResetToken,
  extractBearerToken,
  verifyToken,
} from '../lib/auth'
import { users, sessions } from '@pillboard/db'
import { authMiddleware, requireAuth } from '../middleware/auth'

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()

auth.use('*', authMiddleware)

// POST /auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json<{ username: string; email: string; password: string }>()

  if (!body.username || !body.email || !body.password) {
    return c.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, 400)
  }

  if (body.username.length < 3 || body.username.length > 20) {
    return c.json({ error: 'Username must be 3-20 characters', code: 'VALIDATION_ERROR' }, 400)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(body.username)) {
    return c.json(
      { error: 'Username can only contain letters, numbers, _ and -', code: 'VALIDATION_ERROR' },
      400
    )
  }

  if (body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' }, 400)
  }

  const db = getDb(c.env)

  const [existingEmail, existingUsername] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase())).get(),
    db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).get(),
  ])

  if (existingEmail) {
    return c.json({ error: 'Email already registered', code: 'EMAIL_EXISTS' }, 409)
  }
  if (existingUsername) {
    return c.json({ error: 'Username already taken', code: 'USERNAME_EXISTS' }, 409)
  }

  const [passwordHash, verifyToken2] = await Promise.all([
    hashPassword(body.password),
    Promise.resolve(generateVerifyToken()),
  ])

  const userId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.insert(users).values({
    id: userId,
    username: body.username,
    email: body.email.toLowerCase(),
    passwordHash,
    emailVerifyToken: verifyToken2,
  })

  const sessionToken = generateSessionToken()
  const sessionId = crypto.randomUUID()

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    token: sessionToken,
    expiresAt,
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  })

  const jwt = await signToken(
    { sub: userId, username: body.username, role: 'user', sessionId },
    c.env
  )

  return c.json(
    {
      user: { id: userId, username: body.username, email: body.email, role: 'user', karma: 0 },
      token: jwt,
      expiresAt,
    },
    201
  )
})

// POST /auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>()

  if (!body.email || !body.password) {
    return c.json({ error: 'Missing email or password', code: 'VALIDATION_ERROR' }, 400)
  }

  const db = getDb(c.env)
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .get()

  if (!user) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401)
  }

  if (user.bannedAt) {
    return c.json({ error: 'Account suspended', code: 'ACCOUNT_BANNED' }, 403)
  }

  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401)
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const sessionToken = generateSessionToken()
  const sessionId = crypto.randomUUID()

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    token: sessionToken,
    expiresAt,
    ipAddress: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  })

  const jwt = await signToken(
    { sub: user.id, username: user.username, role: user.role, sessionId },
    c.env
  )

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      karma: user.karma,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    },
    token: jwt,
    expiresAt,
  })
})

// POST /auth/logout
auth.post('/logout', requireAuth, async (c) => {
  const token = extractBearerToken(c.req.header('Authorization') ?? null)
  if (!token) return c.json({ ok: true })

  const payload = await verifyToken(token, c.env)
  if (payload?.sessionId) {
    const db = getDb(c.env)
    await db.delete(sessions).where(eq(sessions.id, payload.sessionId))
  }

  return c.json({ ok: true })
})

// GET /auth/me
auth.get('/me', requireAuth, async (c) => {
  const payload = c.get('user')!
  const db = getDb(c.env)

  const user = await db.select().from(users).where(eq(users.id, payload.sub)).get()
  if (!user) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404)

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    karma: user.karma,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  })
})

// POST /auth/forgot-password
auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>()
  if (!email) return c.json({ ok: true }) // always 200 to prevent enumeration

  const db = getDb(c.env)
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get()
  if (!user) return c.json({ ok: true })

  const resetToken = await signResetToken(user.id, c.env)
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await db
    .update(users)
    .set({ passwordResetToken: resetToken, passwordResetExpiry: expiry })
    .where(eq(users.id, user.id))

  // TODO: send email via Resend when RESEND_API_KEY is configured
  return c.json({ ok: true })
})

// POST /auth/reset-password
auth.post('/reset-password', async (c) => {
  const { token, password } = await c.req.json<{ token: string; password: string }>()
  if (!token || !password) {
    return c.json({ error: 'Missing fields', code: 'VALIDATION_ERROR' }, 400)
  }

  if (password.length < 8) {
    return c.json({ error: 'Password too short', code: 'VALIDATION_ERROR' }, 400)
  }

  const payload = await verifyResetToken(token, c.env)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, 400)
  }

  const db = getDb(c.env)
  const passwordHash = await hashPassword(password)

  await db
    .update(users)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
    .where(eq(users.id, payload.userId))

  // Invalidate all sessions
  await db.delete(sessions).where(eq(sessions.userId, payload.userId))

  return c.json({ ok: true })
})

export default auth
