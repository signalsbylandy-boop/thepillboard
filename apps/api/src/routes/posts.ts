import { Hono } from 'hono'
import { eq, desc, sql, and, like, inArray } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { getDb } from '../lib/db'
import { posts, tags, postTags, votes, users, moderationQueue } from '@pillboard/db'
import { authMiddleware, requireAuth } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'

const postsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

postsRouter.use('*', authMiddleware)

// ─── List posts ───────────────────────────────────────────────────────────────
postsRouter.get('/', async (c) => {
  const sort = c.req.query('sort') ?? 'hot'
  const tag = c.req.query('tag')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const pageSize = Math.min(50, parseInt(c.req.query('pageSize') ?? '25', 10))
  const offset = (page - 1) * pageSize
  const search = c.req.query('search')

  const db = getDb(c.env)
  const cacheKey = `posts:${sort}:${tag ?? ''}:${page}:${pageSize}:${search ?? ''}`

  // KV cache for approved lists (5 min TTL)
  const cached = await c.env.CACHE.get(cacheKey)
  if (cached && !search) {
    return c.json(JSON.parse(cached))
  }

  let orderBy
  switch (sort) {
    case 'new':
      orderBy = desc(posts.createdAt)
      break
    case 'top':
      orderBy = desc(posts.score)
      break
    case 'controversial':
      orderBy = desc(posts.downVotes)
      break
    default:
      orderBy = desc(posts.hotScore)
  }

  const conditions = [eq(posts.status, 'approved')]
  if (search) {
    conditions.push(like(posts.title, `%${search}%`))
  }

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        url: posts.url,
        text: posts.text,
        domain: posts.domain,
        slug: posts.slug,
        score: posts.score,
        upVotes: posts.upVotes,
        downVotes: posts.downVotes,
        commentCount: posts.commentCount,
        status: posts.status,
        ogImageUrl: posts.ogImageUrl,
        createdAt: posts.createdAt,
        userId: posts.userId,
        username: users.username,
        avatarUrl: users.avatarUrl,
        userKarma: users.karma,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset)
      .all(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(...conditions))
      .get(),
  ])

  // Attach user votes if authenticated
  const currentUser = c.get('user')
  const userVotes = currentUser
    ? await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.userId, currentUser.sub),
            eq(votes.targetType, 'post'),
            inArray(votes.targetId, rows.map((r) => r.id).filter((id): id is string => id !== null))
          )
        )
        .all()
    : []

  const voteMap = new Map(userVotes.map((v) => [v.targetId, v.value]))

  // Attach tags (batch query)
  const postIds = rows.map((r) => r.id).filter((id): id is string => id !== null)
  const tagRows =
    postIds.length > 0
      ? await db
          .select({
            postId: postTags.postId,
            id: tags.id,
            name: tags.name,
            slug: tags.slug,
          })
          .from(postTags)
          .leftJoin(tags, eq(postTags.tagId, tags.id))
          .where(inArray(postTags.postId, postIds))
          .all()
      : []

  const tagsByPost = new Map<string, Array<{ id: string; name: string; slug: string }>>()
  for (const t of tagRows) {
    if (!tagsByPost.has(t.postId)) tagsByPost.set(t.postId, [])
    if (t.id && t.name && t.slug) {
      tagsByPost.get(t.postId)!.push({ id: t.id, name: t.name, slug: t.slug })
    }
  }

  // Filter by tag if requested
  let filteredRows = rows
  if (tag) {
    filteredRows = rows.filter((r) => tagsByPost.get(r.id)?.some((t) => t.slug === tag))
  }

  const items = filteredRows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    text: r.text,
    domain: r.domain,
    slug: r.slug,
    score: r.score,
    upVotes: r.upVotes,
    downVotes: r.downVotes,
    commentCount: r.commentCount,
    status: r.status,
    ogImageUrl: r.ogImageUrl,
    createdAt: r.createdAt,
    author: {
      id: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl,
      karma: r.userKarma,
    },
    tags: tagsByPost.get(r.id) ?? [],
    userVote: voteMap.get(r.id) ?? null,
  }))

  const response = {
    items,
    total: countResult?.count ?? 0,
    page,
    pageSize,
    hasMore: offset + items.length < (countResult?.count ?? 0),
  }

  // Cache for 5 min (non-search, non-personalised)
  if (!search && !currentUser) {
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })
  }

  return c.json(response)
})

// ─── Get single post ──────────────────────────────────────────────────────────
postsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug')!
  const db = getDb(c.env)

  const post = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      text: posts.text,
      domain: posts.domain,
      slug: posts.slug,
      score: posts.score,
      upVotes: posts.upVotes,
      downVotes: posts.downVotes,
      commentCount: posts.commentCount,
      status: posts.status,
      ogTitle: posts.ogTitle,
      ogDescription: posts.ogDescription,
      ogImageUrl: posts.ogImageUrl,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      userId: posts.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      userKarma: users.karma,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.slug, slug))
    .get()

  if (!post) return c.json({ error: 'Post not found', code: 'NOT_FOUND' }, 404)

  // Get viewer count from room presence DO
  const roomId = c.env.ROOM_PRESENCE.idFromName(`post:${post.id}`)
  const roomStub = c.env.ROOM_PRESENCE.get(roomId)
  let viewerCount = 0
  try {
    const res = await roomStub.fetch('https://room/count')
    const data = (await res.json()) as { count: number }
    viewerCount = data.count
  } catch {
    // DO not yet instantiated
  }

  const currentUser = c.get('user')
  let userVote = null
  if (currentUser) {
    const v = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, currentUser.sub),
          eq(votes.targetId, post.id),
          eq(votes.targetType, 'post')
        )
      )
      .get()
    userVote = v?.value ?? null
  }

  const postTags2 = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(postTags)
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, post.id))
    .all()

  return c.json({
    ...post,
    author: { id: post.userId, username: post.username, avatarUrl: post.avatarUrl, karma: post.userKarma },
    tags: postTags2.filter((t) => t.id),
    viewerCount,
    userVote,
  })
})

// ─── Submit post ──────────────────────────────────────────────────────────────
postsRouter.post(
  '/',
  requireAuth,
  rateLimit({ action: 'submission', cooldown: 30, maxInWindow: 5 }),
  async (c) => {
    const body = await c.req.json<{
      title: string
      url?: string
      text?: string
      tags?: string[]
    }>()

    if (!body.title?.trim()) {
      return c.json({ error: 'Title is required', code: 'VALIDATION_ERROR' }, 400)
    }

    if (!body.url && !body.text) {
      return c.json({ error: 'Either a URL or text is required', code: 'VALIDATION_ERROR' }, 400)
    }

    const user = c.get('user')!
    const db = getDb(c.env)

    // Check for duplicate URL submitted in last 24h
    if (body.url) {
      const duplicate = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.url, body.url),
            sql`created_at > datetime('now', '-24 hours')`
          )
        )
        .get()

      if (duplicate) {
        return c.json(
          { error: 'This URL was submitted recently', code: 'DUPLICATE_URL', postId: duplicate.id },
          409
        )
      }
    }

    // Extract domain
    let domain: string | null = null
    if (body.url) {
      try {
        domain = new URL(body.url).hostname.replace('www.', '')
      } catch {
        return c.json({ error: 'Invalid URL', code: 'VALIDATION_ERROR' }, 400)
      }
    }

    // Generate slug
    const slug = `${body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60)}-${Date.now().toString(36)}`

    // Fetch OG data if URL (fire and forget — don't block submission)
    let ogData: { title?: string; description?: string; image?: string } = {}
    if (body.url) {
      try {
        const ogRes = await fetch(body.url, {
          headers: { 'User-Agent': 'ThePillboard/1.0 (+https://thepillboard.com)' },
          signal: AbortSignal.timeout(3000),
        })
        const html = await ogRes.text()
        const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
        const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
        const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
        ogData = {
          title: titleMatch?.[1],
          description: descMatch?.[1],
          image: imgMatch?.[1],
        }
      } catch {
        // OG fetch failed — continue without
      }
    }

    const postId = crypto.randomUUID()

    await db.insert(posts).values({
      id: postId,
      title: body.title.trim(),
      url: body.url ?? null,
      text: body.text ?? null,
      domain,
      slug,
      userId: user.sub,
      status: 'pending',
      hotScore: 0,
      ogTitle: ogData.title ?? null,
      ogDescription: ogData.description ?? null,
      ogImageUrl: ogData.image ?? null,
    })

    // Queue for moderation
    await db.insert(moderationQueue).values({
      id: crypto.randomUUID(),
      postId,
      reason: 'new_submission',
    })

    // Handle tags
    if (body.tags && body.tags.length > 0) {
      for (const tagName of body.tags.slice(0, 5)) {
        const slug2 = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        let tag = await db.select().from(tags).where(eq(tags.slug, slug2)).get()
        if (!tag) {
          const tagId = crypto.randomUUID()
          await db.insert(tags).values({ id: tagId, name: tagName, slug: slug2 })
          tag = { id: tagId, name: tagName, slug: slug2, description: null, postCount: 0, createdAt: '', updatedAt: '' }
        }
        await db.insert(postTags).values({ postId, tagId: tag.id }).onConflictDoNothing()
      }
    }

    // Push new submission to global activity feed
    const globalId = c.env.GLOBAL_PRESENCE.idFromName('global')
    const globalStub = c.env.GLOBAL_PRESENCE.get(globalId)
    await globalStub.fetch('https://global/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'activity',
        event: 'new_post',
        data: { postId, title: body.title, username: user.username },
        timestamp: new Date().toISOString(),
      }),
    })

    return c.json({ id: postId, slug, status: 'pending' }, 201)
  }
)

// ─── Delete post ──────────────────────────────────────────────────────────────
postsRouter.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')!
  const user = c.get('user')!
  const db = getDb(c.env)

  const post = await db.select().from(posts).where(eq(posts.id, id)).get()
  if (!post) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  if (post.userId !== user.sub && user.role !== 'moderator' && user.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }

  await db.update(posts).set({ status: 'removed' }).where(eq(posts.id, id))
  return c.json({ ok: true })
})

export default postsRouter
