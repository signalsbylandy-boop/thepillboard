import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import { posts, moderationQueue, moderationLogs, reports, users } from '@pillboard/db'
import { authMiddleware, requireMod, requireAdmin } from '../middleware/auth'

const modRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

modRouter.use('*', authMiddleware)

// GET /moderation/queue — pending submissions
modRouter.get('/queue', requireMod, async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const pageSize = Math.min(50, parseInt(c.req.query('pageSize') ?? '25', 10))
  const offset = (page - 1) * pageSize

  const db = getDb(c.env)

  // innerJoin posts because we filter by posts.status — they must exist
  const rows = await db
    .select({
      queueId: moderationQueue.id,
      reason: moderationQueue.reason,
      reportCount: moderationQueue.reportCount,
      autoFlagged: moderationQueue.autoFlagged,
      queuedAt: moderationQueue.createdAt,
      postId: posts.id,
      title: posts.title,
      url: posts.url,
      domain: posts.domain,
      slug: posts.slug,
      score: posts.score,
      status: posts.status,
      postCreatedAt: posts.createdAt,
      userId: posts.userId,
      username: users.username,
    })
    .from(moderationQueue)
    .innerJoin(posts, eq(moderationQueue.postId, posts.id))
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.status, 'pending'))
    .orderBy(desc(moderationQueue.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all()

  return c.json({ items: rows, page, pageSize })
})

// POST /moderation/queue/:postId/action — approve, reject, or remove
modRouter.post('/queue/:postId/action', requireMod, async (c) => {
  const postId = c.req.param('postId')!
  const body = await c.req.json<{
    action: 'approve' | 'reject' | 'remove'
    reason?: string
  }>()

  if (!['approve', 'reject', 'remove'].includes(body.action)) {
    return c.json({ error: 'Invalid action', code: 'VALIDATION_ERROR' }, 400)
  }

  const user = c.get('user')!
  const db = getDb(c.env)

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get()
  if (!post) return c.json({ error: 'Post not found', code: 'NOT_FOUND' }, 404)

  const newStatus =
    body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'removed'

  await db.update(posts).set({ status: newStatus }).where(eq(posts.id, postId))
  await db.delete(moderationQueue).where(eq(moderationQueue.postId, postId))

  await db.insert(moderationLogs).values({
    id: crypto.randomUUID(),
    moderatorId: user.sub,
    targetId: postId,
    targetType: 'post',
    action: body.action,
    reason: body.reason ?? null,
  })

  if (body.action === 'approve') {
    const globalId = c.env.GLOBAL_PRESENCE.idFromName('global')
    const globalStub = c.env.GLOBAL_PRESENCE.get(globalId)
    void globalStub
      .fetch('https://global/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          type: 'new_post',
          post: { id: post.id, title: post.title, slug: post.slug },
        }),
      })
      .catch(() => null)
  }

  return c.json({ ok: true, newStatus })
})

// GET /moderation/reports
modRouter.get('/reports', requireMod, async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.status, 'open'))
    .orderBy(desc(reports.createdAt))
    .limit(50)
    .all()
  return c.json(rows)
})

// POST /moderation/reports/:id/resolve
modRouter.post('/reports/:id/resolve', requireMod, async (c) => {
  const id = c.req.param('id')!
  const { status } = await c.req.json<{ status: 'resolved' | 'dismissed' }>()
  const user = c.get('user')!
  const db = getDb(c.env)

  await db
    .update(reports)
    .set({ status, resolvedById: user.sub, resolvedAt: new Date().toISOString() })
    .where(eq(reports.id, id))

  return c.json({ ok: true })
})

// GET /moderation/logs
modRouter.get('/logs', requireMod, async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select()
    .from(moderationLogs)
    .orderBy(desc(moderationLogs.createdAt))
    .limit(100)
    .all()
  return c.json(rows)
})

// POST /moderation/ban/:userId (admin only)
modRouter.post('/ban/:userId', requireAdmin, async (c) => {
  const userId = c.req.param('userId')!
  const { reason } = await c.req.json<{ reason: string }>()
  const db = getDb(c.env)

  await db
    .update(users)
    .set({ bannedAt: new Date().toISOString(), bannedReason: reason ?? 'TOS violation' })
    .where(eq(users.id, userId))

  const moderator = c.get('user')!
  await db.insert(moderationLogs).values({
    id: crypto.randomUUID(),
    moderatorId: moderator.sub,
    targetId: userId,
    targetType: 'user',
    action: 'ban',
    reason: reason ?? null,
  })

  return c.json({ ok: true })
})

export default modRouter
