import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { Env, Variables } from './types'

// Routes
import authRoutes from './routes/auth'
import postsRoutes from './routes/posts'
import votesRoutes from './routes/votes'
import commentsRoutes from './routes/comments'
import moderationRoutes from './routes/moderation'
import presenceRoutes from './routes/presence'
import usersRoutes from './routes/users'

// Durable Object exports — must be exported from main worker entry
export { GlobalPresence } from './durable-objects/GlobalPresence'
export { RoomPresence } from './durable-objects/RoomPresence'
export { RateLimiter } from './durable-objects/RateLimiter'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── Global middleware ────────────────────────────────────────────────────────

app.use('*', logger())
app.use('*', secureHeaders())

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = [
        c.env.APP_URL,
        'https://thepillboard.com',
        'https://www.thepillboard.com',
        'http://localhost:5173',
        'http://localhost:4173',
      ]
      if (allowed.includes(origin)) return origin
      // Allow all Cloudflare Pages preview deployments
      if (origin?.endsWith('.thepillboard-web.pages.dev')) return origin
      if (origin?.endsWith('.pages.dev')) return origin
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  })
)

// Request ID for tracing
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (c) =>
  c.json({
    service: 'thepillboard-api',
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
)

app.get('/health', (c) => c.json({ status: 'ok' }))

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route('/auth', authRoutes)
app.route('/posts', postsRoutes)
app.route('/votes', votesRoutes)
app.route('/comments', commentsRoutes)
app.route('/moderation', moderationRoutes)
app.route('/presence', presenceRoutes)
app.route('/users', usersRoutes)

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404))

app.onError((err, c) => {
  console.error(`[${c.get('requestId')}]`, err)
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500)
})

export default app
