import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}

function nanoid() {
  return text('id').primaryKey()
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  'users',
  {
    id: nanoid(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['user', 'moderator', 'admin'] })
      .notNull()
      .default('user'),
    karma: integer('karma').notNull().default(0),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    emailVerifyToken: text('email_verify_token'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiry: text('password_reset_expiry'),
    bannedAt: text('banned_at'),
    bannedReason: text('banned_reason'),
    ...timestamps,
  },
  (t) => [
    index('users_email_idx').on(t.email),
    index('users_username_idx').on(t.username),
  ]
)

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = sqliteTable(
  'sessions',
  {
    id: nanoid(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_token_idx').on(t.token),
  ]
)

// ─── OAuth Accounts ───────────────────────────────────────────────────────────

export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: nanoid(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['github', 'google'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    ...timestamps,
  },
  (t) => [uniqueIndex('oauth_provider_account_idx').on(t.provider, t.providerAccountId)]
)

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = sqliteTable(
  'posts',
  {
    id: nanoid(),
    title: text('title').notNull(),
    url: text('url'),
    text: text('text'),
    domain: text('domain'),
    slug: text('slug').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    score: integer('score').notNull().default(0),
    upVotes: integer('up_votes').notNull().default(0),
    downVotes: integer('down_votes').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    // Wilson score lower bound — precomputed for fast sorting
    hotScore: real('hot_score').notNull().default(0),
    status: text('status', { enum: ['pending', 'approved', 'rejected', 'removed'] })
      .notNull()
      .default('pending'),
    ogTitle: text('og_title'),
    ogDescription: text('og_description'),
    ogImageUrl: text('og_image_url'),
    ...timestamps,
  },
  (t) => [
    index('posts_user_id_idx').on(t.userId),
    index('posts_status_hot_idx').on(t.status, t.hotScore),
    index('posts_status_created_idx').on(t.status, t.createdAt),
    index('posts_status_score_idx').on(t.status, t.score),
    index('posts_domain_idx').on(t.domain),
    index('posts_slug_idx').on(t.slug),
  ]
)

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tags = sqliteTable(
  'tags',
  {
    id: nanoid(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    postCount: integer('post_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('tags_slug_idx').on(t.slug)]
)

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('post_tags_unique_idx').on(t.postId, t.tagId)]
)

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = sqliteTable(
  'comments',
  {
    id: nanoid(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    parentId: text('parent_id'),
    text: text('text').notNull(),
    score: integer('score').notNull().default(0),
    upVotes: integer('up_votes').notNull().default(0),
    downVotes: integer('down_votes').notNull().default(0),
    depth: integer('depth').notNull().default(0),
    isRemoved: integer('is_removed', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('comments_post_id_idx').on(t.postId),
    index('comments_parent_id_idx').on(t.parentId),
    index('comments_user_id_idx').on(t.userId),
    index('comments_post_score_idx').on(t.postId, t.score),
  ]
)

// ─── Votes ────────────────────────────────────────────────────────────────────

export const votes = sqliteTable(
  'votes',
  {
    id: nanoid(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetId: text('target_id').notNull(),
    targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
    value: integer('value', { mode: 'number' }).notNull(), // 1 or -1
    ...timestamps,
  },
  (t) => [
    uniqueIndex('votes_unique_idx').on(t.userId, t.targetId, t.targetType),
    index('votes_target_idx').on(t.targetId, t.targetType),
  ]
)

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reports = sqliteTable(
  'reports',
  {
    id: nanoid(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetId: text('target_id').notNull(),
    targetType: text('target_type', { enum: ['post', 'comment', 'user'] }).notNull(),
    reason: text('reason').notNull(),
    status: text('status', { enum: ['open', 'resolved', 'dismissed'] })
      .notNull()
      .default('open'),
    resolvedById: text('resolved_by_id').references(() => users.id),
    resolvedAt: text('resolved_at'),
    ...timestamps,
  },
  (t) => [
    index('reports_target_idx').on(t.targetId, t.targetType),
    index('reports_status_idx').on(t.status),
  ]
)

// ─── Moderation Queue ─────────────────────────────────────────────────────────

export const moderationQueue = sqliteTable(
  'moderation_queue',
  {
    id: nanoid(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    reportCount: integer('report_count').notNull().default(0),
    autoFlagged: integer('auto_flagged', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('moderation_queue_post_idx').on(t.postId)]
)

// ─── Moderation Log ───────────────────────────────────────────────────────────

export const moderationLogs = sqliteTable(
  'moderation_logs',
  {
    id: nanoid(),
    moderatorId: text('moderator_id')
      .notNull()
      .references(() => users.id),
    targetId: text('target_id').notNull(),
    targetType: text('target_type', { enum: ['post', 'comment', 'user'] }).notNull(),
    action: text('action', {
      enum: ['approve', 'reject', 'remove', 'warn', 'ban'],
    }).notNull(),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => [
    index('mod_logs_moderator_idx').on(t.moderatorId),
    index('mod_logs_target_idx').on(t.targetId),
  ]
)

// ─── Domain Bans ─────────────────────────────────────────────────────────────

export const domainBans = sqliteTable('domain_bans', {
  id: nanoid(),
  domain: text('domain').notNull().unique(),
  reason: text('reason'),
  bannedById: text('banned_by_id').references(() => users.id),
  ...timestamps,
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type DbUser = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type DbSession = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type DbPost = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type DbComment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type DbVote = typeof votes.$inferSelect
export type NewVote = typeof votes.$inferInsert
export type DbTag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type DbReport = typeof reports.$inferSelect
