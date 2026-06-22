import type { JwtPayload } from './lib/auth'

export interface Env {
  // D1 Database
  DB: D1Database
  // KV Namespaces
  SESSIONS: KVNamespace
  CACHE: KVNamespace
  // R2
  MEDIA: R2Bucket
  // Durable Objects (use base type — generic brand constraint requires wrangler-generated types)
  GLOBAL_PRESENCE: DurableObjectNamespace
  ROOM_PRESENCE: DurableObjectNamespace
  RATE_LIMITER: DurableObjectNamespace
  // Secrets / Vars
  JWT_SECRET: string
  APP_URL: string
  SUBMISSION_COOLDOWN_SECONDS: string
  COMMENT_COOLDOWN_SECONDS: string
  MAX_SUBMISSIONS_PER_HOUR: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  RESEND_API_KEY?: string
}

// Hono context variables set by auth middleware
export interface Variables {
  user: JwtPayload | null
  requestId: string
}
