import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import { users, posts } from '@pillboard/db'
import { authMiddleware } from '../middleware/auth'

const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

usersRouter.use('*', authMiddleware)

// GET /users/:username — public profile
usersRouter.get('/:username', async (c) => {
  const username = c.req.param('username')!
  const db = getDb(c.env)

  const user = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      karma: users.karma,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .get()

  if (!user) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404)

  const recentPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      score: posts.score,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.userId, user.id))
    .orderBy(desc(posts.createdAt))
    .limit(10)
    .all()

  return c.json({ ...user, recentPosts })
})

export default usersRouter
