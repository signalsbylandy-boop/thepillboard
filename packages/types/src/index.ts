// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'moderator' | 'admin'
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'removed'
export type VoteValue = 1 | -1
export type VoteTarget = 'post' | 'comment'
export type SortOrder = 'hot' | 'new' | 'top' | 'controversial'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type ModerationAction = 'approve' | 'reject' | 'remove' | 'warn' | 'ban'

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  karma: number
  avatarUrl: string | null
  bio: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export type PublicUser = Pick<User, 'id' | 'username' | 'role' | 'karma' | 'avatarUrl' | 'bio' | 'createdAt'>

export interface Session {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
}

export interface Post {
  id: string
  title: string
  url: string | null
  text: string | null
  domain: string | null
  slug: string
  userId: string
  author: PublicUser
  score: number
  upVotes: number
  downVotes: number
  commentCount: number
  status: PostStatus
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
  tags: Tag[]
  viewerCount?: number
  userVote?: VoteValue | null
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  userId: string
  author: PublicUser
  parentId: string | null
  text: string
  score: number
  upVotes: number
  downVotes: number
  depth: number
  replies: Comment[]
  userVote?: VoteValue | null
  createdAt: string
  updatedAt: string
}

export interface Vote {
  id: string
  userId: string
  targetId: string
  targetType: VoteTarget
  value: VoteValue
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  description: string | null
  postCount: number
}

export interface Report {
  id: string
  reporterId: string
  targetId: string
  targetType: VoteTarget | 'user'
  reason: string
  status: ReportStatus
  createdAt: string
}

export interface ModerationQueueItem {
  id: string
  post: Post
  reason: string | null
  reportCount: number
  createdAt: string
}

export interface ModerationLog {
  id: string
  moderatorId: string
  moderator: PublicUser
  targetId: string
  targetType: 'post' | 'comment' | 'user'
  action: ModerationAction
  reason: string | null
  createdAt: string
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  error: string
  code: string
  details?: Record<string, string>
}

// Auth
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  expiresAt: string
}

// Posts
export interface CreatePostRequest {
  title: string
  url?: string
  text?: string
  tags?: string[]
}

export interface UpdatePostRequest {
  title?: string
  text?: string
  tags?: string[]
}

export interface PostsQuery {
  sort?: SortOrder
  tag?: string
  page?: number
  pageSize?: number
  search?: string
}

// Comments
export interface CreateCommentRequest {
  postId: string
  parentId?: string
  text: string
}

// Moderation
export interface ModerationActionRequest {
  action: ModerationAction
  reason?: string
}

// ─── Real-time WebSocket Messages ────────────────────────────────────────────

export type WSMessageType =
  | 'join'
  | 'leave'
  | 'heartbeat'
  | 'join_global'
  | 'presence'
  | 'global_stats'
  | 'vote_update'
  | 'new_comment'
  | 'new_post'
  | 'activity'
  | 'rate_limit'
  | 'error'

// Client → Server
export interface WSJoinMessage {
  type: 'join'
  room: string
  userId?: string
  username?: string
}

export interface WSLeaveMessage {
  type: 'leave'
  room: string
}

export interface WSHeartbeatMessage {
  type: 'heartbeat'
}

export interface WSJoinGlobalMessage {
  type: 'join_global'
  userId?: string
  username?: string
}

export type WSClientMessage = WSJoinMessage | WSLeaveMessage | WSHeartbeatMessage | WSJoinGlobalMessage

// Server → Client
export interface WSPresenceMessage {
  type: 'presence'
  room: string
  count: number
  anonCount: number
  users: Array<{ id: string; username: string }>
}

export interface WSGlobalStatsMessage {
  type: 'global_stats'
  online: number
  authenticated: number
  anonymous: number
  recentIPs: string[]
  activeRooms: Array<{ room: string; count: number }>
}

export interface WSVoteUpdateMessage {
  type: 'vote_update'
  postId: string
  score: number
  upVotes: number
  downVotes: number
}

export interface WSNewCommentMessage {
  type: 'new_comment'
  postId: string
  comment: Comment
}

export interface WSNewPostMessage {
  type: 'new_post'
  post: Post
}

export interface WSActivityMessage {
  type: 'activity'
  event: 'new_post' | 'big_vote' | 'new_comment' | 'user_joined'
  data: Record<string, unknown>
  timestamp: string
}

export interface WSRateLimitMessage {
  type: 'rate_limit'
  retryAfter: number
  message: string
}

export interface WSErrorMessage {
  type: 'error'
  code: string
  message: string
}

export type WSServerMessage =
  | WSPresenceMessage
  | WSGlobalStatsMessage
  | WSVoteUpdateMessage
  | WSNewCommentMessage
  | WSNewPostMessage
  | WSActivityMessage
  | WSRateLimitMessage
  | WSErrorMessage

// ─── Presence / Visitor Tracking ─────────────────────────────────────────────

export interface VisitorInfo {
  id: string
  ip: string
  userId?: string
  username?: string
  isAuthenticated: boolean
  joinedAt: string
  path: string
}

export interface RoomState {
  room: string
  visitors: VisitorInfo[]
  count: number
  anonCount: number
  authenticatedCount: number
  lastActivity: string
}

export interface GlobalPresenceState {
  totalOnline: number
  authenticated: number
  anonymous: number
  rooms: Map<string, RoomState>
  recentActivity: WSActivityMessage[]
}
