import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import { votes, posts, comments, users } from '@pillboard/db'
import { authMiddleware, requireAuth } from '../middleware/auth'
import { computeHotScore } from '../lib/ranking'

const votesRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

votesRouter.use('*', authMiddleware)

// POST /votes  { targetId, targetType, value }
votesRouter.post('/', requireAuth, async (c) => {
  const body = await c.req.json<{
    targetId: string
    targetType: 'post' | 'comment'
    value: 1 | -1
  }>()

  if (!body.targetId || !body.targetType || ![1, -1].includes(body.value)) {
    return c.json({ error: 'Invalid vote', code: 'VALIDATION_ERROR' }, 400)
  }

  const user = c.get('user')!
  const db = getDb(c.env)

  // Check existing vote
  const existing = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.userId, user.sub),
        eq(votes.targetId, body.targetId),
        eq(votes.targetType, body.targetType)
      )
    )
    .get()

  // Use plain number for deltas — these are score adjustments, not vote values
  let scoreDelta: number = body.value
  let upDelta: number = body.value === 1 ? 1 : 0
  let downDelta: number = body.value === -1 ? 1 : 0

  if (existing) {
    if (existing.value === body.value) {
      // Un-vote
      await db
        .delete(votes)
        .where(
          and(
            eq(votes.userId, user.sub),
            eq(votes.targetId, body.targetId),
            eq(votes.targetType, body.targetType)
          )
        )
      scoreDelta = -body.value
      upDelta = body.value === 1 ? -1 : 0
      downDelta = body.value === -1 ? -1 : 0
    } else {
      // Flip vote
      await db
        .update(votes)
        .set({ value: body.value })
        .where(
          and(
            eq(votes.userId, user.sub),
            eq(votes.targetId, body.targetId),
            eq(votes.targetType, body.targetType)
          )
        )
      scoreDelta = body.value * 2
      upDelta = body.value === 1 ? 1 : -1
      downDelta = body.value === -1 ? 1 : -1
    }
  } else {
    await db.insert(votes).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      targetId: body.targetId,
      targetType: body.targetType,
      value: body.value,
    })
  }

  // Update score on target
  if (body.targetType === 'post') {
    const post = await db.select().from(posts).where(eq(posts.id, body.targetId)).get()
    if (post) {
      const newUp = Math.max(0, post.upVotes + upDelta)
      const newDown = Math.max(0, post.downVotes + downDelta)
      const newScore = post.score + scoreDelta
      const newHotScore = computeHotScore(newUp, newDown, post.createdAt)

      await db
        .update(posts)
        .set({
          score: newScore,
          upVotes: newUp,
          downVotes: newDown,
          hotScore: newHotScore,
        })
        .where(eq(posts.id, body.targetId))

      // Invalidate KV cache for this post list
      await c.env.CACHE.delete(`posts:hot:1`).catch(() => null)

      // Push vote update to all room viewers in real time
      try {
        const roomId = c.env.ROOM_PRESENCE.idFromName(`post:${post.id}`)
        const roomStub = c.env.ROOM_PRESENCE.get(roomId)
        await roomStub.fetch('https://room/push', {
          method: 'POST',
          body: JSON.stringify({
            type: 'vote_update',
            postId: post.id,
            score: newScore,
            upVotes: newUp,
            downVotes: newDown,
          }),
        })
      } catch {
        // room DO not yet active — no viewers
      }

      // Karma award to post author
      if (post.userId && post.userId !== user.sub) {
        await db
          .update(users)
          .set({ karma: sql<number>`karma + ${scoreDelta}` })
          .where(eq(users.id, post.userId))
      }

      return c.json({ score: newScore, upVotes: newUp, downVotes: newDown, userVote: existing?.value === body.value ? null : body.value })
    }
  }

  if (body.targetType === 'comment') {
    const comment = await db.select().from(comments).where(eq(comments.id, body.targetId)).get()
    if (comment) {
      const newUp = Math.max(0, comment.upVotes + upDelta)
      const newDown = Math.max(0, comment.downVotes + downDelta)
      await db
        .update(comments)
        .set({ score: comment.score + scoreDelta, upVotes: newUp, downVotes: newDown })
        .where(eq(comments.id, body.targetId))

      return c.json({ score: comment.score + scoreDelta, upVotes: newUp, downVotes: newDown })
    }
  }

  return c.json({ error: 'Target not found', code: 'NOT_FOUND' }, 404)
})

export default votesRouter
