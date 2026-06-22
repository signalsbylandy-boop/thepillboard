import { Hono } from 'hono'
import { eq, and, isNull, asc } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import { comments, posts, votes, users } from '@pillboard/db'
import { authMiddleware, requireAuth } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'

const commentsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

commentsRouter.use('*', authMiddleware)

// GET /comments?postId=xxx
commentsRouter.get('/', async (c) => {
  const postId = c.req.query('postId')
  if (!postId) return c.json({ error: 'postId required', code: 'VALIDATION_ERROR' }, 400)

  const db = getDb(c.env)

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      text: comments.text,
      score: comments.score,
      upVotes: comments.upVotes,
      downVotes: comments.downVotes,
      depth: comments.depth,
      isRemoved: comments.isRemoved,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userId: comments.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.postId, postId)))
    .orderBy(asc(comments.createdAt))
    .all()

  // Attach user votes
  const currentUser = c.get('user')
  const userVotes = currentUser
    ? await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.userId, currentUser.sub),
            eq(votes.targetType, 'comment')
          )
        )
        .all()
    : []
  const voteMap = new Map(userVotes.map((v) => [v.targetId, v.value]))

  // Build nested tree
  const commentMap = new Map<string, Record<string, unknown>>()
  const roots: Array<Record<string, unknown>> = []

  for (const row of rows) {
    const c2 = {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      text: row.isRemoved ? '[removed]' : row.text,
      score: row.score,
      upVotes: row.upVotes,
      downVotes: row.downVotes,
      depth: row.depth,
      isRemoved: row.isRemoved,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.isRemoved
        ? null
        : { id: row.userId, username: row.username, avatarUrl: row.avatarUrl },
      replies: [] as unknown[],
      userVote: voteMap.get(row.id) ?? null,
    }
    commentMap.set(row.id, c2)
  }

  for (const c2 of commentMap.values()) {
    if (c2['parentId']) {
      const parent = commentMap.get(c2['parentId'] as string)
      if (parent) {
        ;(parent['replies'] as unknown[]).push(c2)
      } else {
        roots.push(c2)
      }
    } else {
      roots.push(c2)
    }
  }

  return c.json(roots)
})

// POST /comments
commentsRouter.post(
  '/',
  requireAuth,
  rateLimit({ action: 'comment', cooldown: 10, maxInWindow: 20 }),
  async (c) => {
    const body = await c.req.json<{ postId: string; parentId?: string; text: string }>()

    if (!body.postId || !body.text?.trim()) {
      return c.json({ error: 'postId and text required', code: 'VALIDATION_ERROR' }, 400)
    }

    if (body.text.length > 10000) {
      return c.json({ error: 'Comment too long (max 10000 chars)', code: 'VALIDATION_ERROR' }, 400)
    }

    const user = c.get('user')!
    const db = getDb(c.env)

    // Verify post exists and is approved
    const post = await db.select().from(posts).where(eq(posts.id, body.postId)).get()
    if (!post || post.status !== 'approved') {
      return c.json({ error: 'Post not found or not approved', code: 'NOT_FOUND' }, 404)
    }

    let depth = 0
    if (body.parentId) {
      const parent = await db.select().from(comments).where(eq(comments.id, body.parentId)).get()
      if (!parent) return c.json({ error: 'Parent comment not found', code: 'NOT_FOUND' }, 404)
      depth = Math.min(parent.depth + 1, 6) // max 6 levels deep
    }

    const commentId = crypto.randomUUID()
    await db.insert(comments).values({
      id: commentId,
      postId: body.postId,
      userId: user.sub,
      parentId: body.parentId ?? null,
      text: body.text.trim(),
      depth,
    })

    // Increment comment count on post
    await db
      .update(posts)
      .set({ commentCount: post.commentCount + 1 })
      .where(eq(posts.id, body.postId))

    // Push to room viewers in real time
    const author = { id: user.sub, username: user.username }
    const newComment = {
      id: commentId,
      postId: body.postId,
      parentId: body.parentId ?? null,
      text: body.text.trim(),
      score: 0,
      upVotes: 0,
      downVotes: 0,
      depth,
      author,
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const roomId = c.env.ROOM_PRESENCE.idFromName(`post:${body.postId}`)
      const roomStub = c.env.ROOM_PRESENCE.get(roomId)
      await roomStub.fetch('https://room/push', {
        method: 'POST',
        body: JSON.stringify({ type: 'new_comment', postId: body.postId, comment: newComment }),
      })
    } catch {
      // no viewers active
    }

    return c.json(newComment, 201)
  }
)

// DELETE /comments/:id
commentsRouter.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')!
  const user = c.get('user')!
  const db = getDb(c.env)

  const comment = await db.select().from(comments).where(eq(comments.id, id)).get()
  if (!comment) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  if (comment.userId !== user.sub && user.role !== 'moderator' && user.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }

  await db.update(comments).set({ isRemoved: true }).where(eq(comments.id, id))
  return c.json({ ok: true })
})

export default commentsRouter
