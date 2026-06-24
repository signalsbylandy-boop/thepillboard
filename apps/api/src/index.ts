import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { eq, desc } from 'drizzle-orm'
import { posts } from '@pillboard/db'
import { getDb } from './lib/db'
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

// ─── Sitemap ──────────────────────────────────────────────────────────────────

app.get('/sitemap.xml', async (c) => {
  const db = getDb(c.env)
  const items = await db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, 'approved'))
    .orderBy(desc(posts.updatedAt))
    .limit(1000)

  const baseUrl = 'https://thepillboard.com'
  const staticUrls = [
    { loc: '/', priority: '1.0', changefreq: 'hourly' },
    { loc: '/?tag=he-said', priority: '0.9', changefreq: 'daily' },
    { loc: '/?tag=she-said', priority: '0.9', changefreq: 'daily' },
    { loc: '/?tag=dating', priority: '0.8', changefreq: 'daily' },
    { loc: '/?tag=relationships', priority: '0.8', changefreq: 'daily' },
    { loc: '/?tag=culture', priority: '0.7', changefreq: 'daily' },
  ]

  const urlEntries = [
    ...staticUrls.map(
      (p) =>
        `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
    ),
    ...items.map((p) => {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : ''
      return `  <url>\n    <loc>${baseUrl}/p/${p.slug}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    }),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

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
