# ThePillboard — Build Progress

**Domain:** thepillboard.com (registered on Cloudflare)
**GitHub:** Not created yet — create account first, then `gh auth login`
**Status:** Building local codebase

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Cloudflare Workers | Free tier, edge, scales instantly |
| API framework | Hono v4 | Built for Workers, great TS support |
| Database | Cloudflare D1 (SQLite) | Free tier, edge-native, SQL |
| ORM | Drizzle ORM | Lightweight, D1 adapter, type-safe |
| Auth | Custom (jose JWT + Web Crypto) | Workers-compatible, no deps needed |
| Sessions | D1 + KV cache | Queryable + fast lookup |
| Real-time | Cloudflare Durable Objects | Persistent WS at edge, zero infra |
| File storage | Cloudflare R2 | 10GB free, S3-compatible |
| Frontend | React 18 + Vite + TypeScript | Fast build, great DX |
| Styling | TailwindCSS + Radix UI | Headless, accessible |
| State | Zustand | Minimal, no boilerplate |
| Data fetching | TanStack Query | Cache + real-time sync |
| Router | React Router v6 | Industry standard |
| Monorepo | Turborepo | Parallel builds, caching |
| CI/CD | GitHub Actions | Free, integrates with Cloudflare |

---

## Monorepo Structure

```
thepillboard/
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   └── ISSUE_TEMPLATE/   # GitHub issue templates
├── apps/
│   ├── api/              # Cloudflare Worker (Hono)
│   └── web/              # React + Vite frontend
├── packages/
│   ├── db/               # Drizzle schema + migrations
│   └── types/            # Shared TypeScript types
├── scripts/
│   ├── create-github-issues.ps1   # Creates full GitHub epic
│   └── setup.ps1                  # First-time setup
└── BUILD_PROGRESS.md     # ← this file
```

---

## File Checklist

### Root Config
- [x] `package.json`
- [x] `turbo.json`
- [x] `.gitignore`
- [x] `.env.example`
- [x] `.prettierrc`
- [x] `eslint.config.js`
- [x] `tsconfig.base.json`
- [x] `cliff.toml` (changelog config)

### GitHub
- [x] `.github/workflows/ci.yml`
- [x] `.github/workflows/deploy-preview.yml`
- [x] `.github/workflows/deploy-production.yml`
- [x] `.github/ISSUE_TEMPLATE/config.yml`
- [x] `.github/ISSUE_TEMPLATE/bug_report.yml`
- [x] `.github/ISSUE_TEMPLATE/feature_request.yml`
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] `.github/CODEOWNERS`

### packages/types
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `src/index.ts` — all shared types (User, Post, Comment, Vote, WSMessage, etc.)

### packages/db
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `src/schema.ts` — full Drizzle schema (11 tables)
- [x] `src/index.ts`

### apps/api (Cloudflare Worker)
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `wrangler.toml` — D1, KV, R2, Durable Object bindings
- [x] `drizzle.config.ts`
- [x] `src/types.ts` — Env + Variables types
- [x] `src/index.ts` — Hono app entry point + DO exports
- [x] `src/lib/auth.ts` — JWT (jose) + password hashing (Web Crypto PBKDF2)
- [x] `src/lib/db.ts` — Drizzle D1 client
- [x] `src/lib/ranking.ts` — Wilson score + time decay hot ranking
- [x] `src/middleware/auth.ts` — JWT verification, requireAuth/requireMod/requireAdmin
- [x] `src/middleware/rateLimit.ts` — per-user/IP via RateLimiter DO
- [x] `src/routes/auth.ts` — register, login, logout, me, forgot/reset password
- [x] `src/routes/posts.ts` — CRUD + ranking + OG scraping + KV cache
- [x] `src/routes/votes.ts` — upvote/downvote + real-time push
- [x] `src/routes/comments.ts` — nested threads + real-time push
- [x] `src/routes/moderation.ts` — review queue, actions, ban, logs
- [x] `src/routes/presence.ts` — WebSocket upgrade proxy to DOs
- [x] `src/durable-objects/GlobalPresence.ts` — site-wide visitor tracking + activity feed
- [x] `src/durable-objects/RoomPresence.ts` — per-post viewer tracking + vote/comment push
- [x] `src/durable-objects/RateLimiter.ts` — cooldown + sliding window rate limit

### apps/web (React + Vite)
- [x] `package.json`
- [x] `tsconfig.json`
- [x] `vite.config.ts`
- [x] `tailwind.config.ts`
- [x] `index.html`
- [x] `src/main.tsx`
- [x] `src/App.tsx` — lazy routes, QueryClient, global presence init
- [x] `src/index.css` — Tailwind + custom component classes
- [x] `src/lib/api.ts` — fully typed API client (auth, posts, comments, votes, moderation)
- [x] `src/lib/websocket.ts` — PillboardSocket class with reconnect, singleton sockets
- [x] `src/lib/utils.ts` — cn, formatDistanceToNow, formatNumber, etc.
- [x] `src/store/authStore.ts` — Zustand auth (persisted)
- [x] `src/store/presenceStore.ts` — Zustand real-time presence state
- [x] `src/hooks/useAuth.ts` — useMutation wrappers for auth
- [x] `src/hooks/usePresence.ts` — useGlobalPresence, useRoomPresence, useRoomViewerCount
- [x] `src/components/layout/Header.tsx` — nav, theme toggle, user menu, live badge
- [x] `src/components/posts/PostCard.tsx` — full card with vote, tags, viewer count
- [x] `src/components/posts/VoteButton.tsx` — optimistic voting UI
- [x] `src/components/posts/SubmitForm.tsx` — URL/text toggle, rate limit feedback
- [x] `src/components/realtime/LivePresence.tsx` — GlobalPresenceBadge, RoomViewerBadge, IPFeed
- [x] `src/components/realtime/ActivityFeed.tsx` — live event stream
- [x] `src/pages/Home.tsx` — hot/new/top feed + real-time sidebar
- [x] `src/pages/Post.tsx` — post detail, comment tree, room presence
- [x] `src/pages/Login.tsx`
- [x] `src/pages/Register.tsx`
- [x] `src/pages/Submit.tsx`
- [x] `src/pages/Moderation.tsx` — moderation queue (mod/admin only)
- [x] `src/pages/Profile.tsx` — public user profile + recent submissions
- [x] `src/components/layout/Footer.tsx` — footer with live presence badge
- [x] `src/vite-env.d.ts` — Vite env type reference

### packages/db
- [x] `drizzle.config.ts` — points to sqlite/d1-http dialect
- [x] `migrations/0000_faithful_hedge_knight.sql` — initial schema (44 SQL commands, all 12 tables)

### Scripts
- [x] `scripts/create-github-issues.ps1` — creates 35 issues across 7 milestones via gh CLI
- [x] `scripts/setup-cloudflare.ps1` — first-time Cloudflare resource creation

---

## GitHub Epic Structure (to be created via script)

### Milestone v0.1 — Platform Foundation
- [ ] [INFRA] Set up Cloudflare D1, KV, R2, Durable Objects
- [ ] [INFRA] Configure Wrangler multi-environment (preview/production)
- [ ] [INFRA] Turborepo monorepo structure
- [ ] [INFRA] GitHub Actions CI/CD pipeline
- [ ] [DB] Drizzle ORM schema + initial migrations

### Milestone v0.2 — Auth & Users
- [ ] [AUTH] Email/password registration with PBKDF2 hashing
- [ ] [AUTH] Login with JWT + KV session
- [ ] [AUTH] OAuth — GitHub provider
- [ ] [AUTH] OAuth — Google provider
- [ ] [AUTH] Email verification flow
- [ ] [AUTH] Password reset flow
- [ ] [USER] User profile page + karma display
- [ ] [USER] Account settings page

### Milestone v0.3 — Content Core
- [ ] [CONTENT] URL submission with og:title/description scraping
- [ ] [CONTENT] Text post submission
- [ ] [CONTENT] Upvote / downvote with score recalculation
- [ ] [CONTENT] Hot / New / Top ranking algorithm (Wilson score)
- [ ] [CONTENT] Tag / topic system
- [ ] [CONTENT] Nested comment threads
- [ ] [CONTENT] Comment voting

### Milestone v0.4 — Real-Time Presence
- [ ] [RT] GlobalPresence Durable Object — site-wide visitor tracking
- [ ] [RT] RoomPresence Durable Object — per-post viewer count
- [ ] [RT] WebSocket connection manager (frontend)
- [ ] [RT] Live visitor counter (anon IP + authenticated users)
- [ ] [RT] Real-time vote count push to all viewers
- [ ] [RT] Live activity feed (new posts, big votes, comments)
- [ ] [RT] Heartbeat / reconnect logic

### Milestone v0.5 — Content Moderation
- [ ] [MOD] RateLimiter Durable Object (submission cooldown + flood guard)
- [ ] [MOD] Submission review queue (pending → approved/rejected)
- [ ] [MOD] Moderator dashboard
- [ ] [MOD] Report / flag system for posts and comments
- [ ] [MOD] Spam detection — duplicate URL within 24h
- [ ] [MOD] Domain and user banning
- [ ] [MOD] Moderator action audit log

### Milestone v0.6 — Frontend Polish
- [ ] [FE] Responsive layout (mobile-first)
- [ ] [FE] Infinite scroll on post list
- [ ] [FE] Dark / light theme toggle
- [ ] [FE] SEO — meta tags, Open Graph, structured data
- [ ] [FE] PWA manifest + service worker
- [ ] [FE] Accessibility audit (WCAG 2.1 AA)

### Milestone v0.7 — Performance & Analytics
- [ ] [PERF] Cloudflare Cache API for hot post responses
- [ ] [PERF] KV caching layer for ranked lists
- [ ] [ANALYTICS] Cloudflare Analytics Engine integration
- [ ] [ANALYTICS] Internal stats dashboard

---

## Real-Time WebSocket Protocol

### Client → Server
```json
{ "type": "join",      "room": "post:abc123", "userId": "u1", "anon": false }
{ "type": "leave",     "room": "post:abc123" }
{ "type": "heartbeat" }
{ "type": "join_global" }
```

### Server → Client
```json
{ "type": "presence",    "room": "post:abc123", "count": 42, "anon": 15, "users": [...] }
{ "type": "global_stats","online": 1234, "authenticated": 456, "recentIPs": [...] }
{ "type": "vote_update", "postId": "abc123", "score": 99, "up": 110, "down": 11 }
{ "type": "new_comment", "postId": "abc123", "comment": {...} }
{ "type": "activity",    "event": "new_post|big_vote|new_comment", "data": {...} }
{ "type": "rate_limit",  "retryAfter": 28, "message": "Wait 28s before next submission" }
```

---

## Cloudflare Resource Names (to create via setup script)

| Resource | Name | Binding |
|---|---|---|
| D1 Database | `pillboard-db` | `DB` |
| KV Namespace | `pillboard-sessions` | `SESSIONS` |
| KV Namespace | `pillboard-cache` | `CACHE` |
| R2 Bucket | `pillboard-media` | `MEDIA` |
| Durable Object | `GlobalPresence` | `GLOBAL_PRESENCE` |
| Durable Object | `RoomPresence` | `ROOM_PRESENCE` |
| Durable Object | `RateLimiter` | `RATE_LIMITER` |

---

## Session Log

- **2026-06-22** — Project started. Domain registered at Cloudflare. Full monorepo scaffolded.
  - ✅ Root config, Turborepo, ESLint, Prettier
  - ✅ GitHub Actions (CI + deploy preview + deploy production)
  - ✅ GitHub issue templates + PR template + CODEOWNERS
  - ✅ packages/types — all shared TypeScript interfaces + WS protocol types
  - ✅ packages/db — full Drizzle D1 schema (11 tables: users, sessions, posts, comments, votes, tags, reports, moderation queue/logs, domain bans, oauth)
  - ✅ apps/api — complete Hono Worker: auth routes, posts, votes, comments, moderation, presence + 3 Durable Objects (GlobalPresence, RoomPresence, RateLimiter)
  - ✅ apps/web — React 18 + Vite frontend: all pages, real-time hooks, WebSocket manager, stores
  - ✅ scripts/create-github-issues.ps1 — 35 issues across 7 milestones
  - ✅ scripts/setup-cloudflare.ps1 — first-time resource creation

- **2026-06-22 (session 2)** — TypeScript compilation fully resolved, dev environment live.
  - ✅ Fixed all TS errors: `noUncheckedIndexedAccess` removed (too aggressive with Hono/Drizzle), `DurableObjectNamespace<T>` brand constraint resolved by using base type, `$defaultFn` removed from nanoid() helper (Drizzle excludes these from insert types), `c.req.param()` calls all have `!` assertions, `scoreDelta` variable naming fixed in votes.ts, TanStack Query v5 `onSuccess` replaced with `useEffect`
  - ✅ Created missing files: `apps/api/src/routes/users.ts`, `apps/web/src/pages/Profile.tsx`, `apps/web/src/components/layout/Footer.tsx`, `apps/web/src/vite-env.d.ts`
  - ✅ Added `ogImageUrl`/`ogTitle`/`ogDescription` to shared `Post` type
  - ✅ Generated first D1 migration (44 SQL commands) via `drizzle-kit generate`
  - ✅ Applied migration to local D1 via `wrangler d1 migrations apply --local`
  - ✅ Created `apps/api/.dev.vars` for local secrets (JWT_SECRET, APP_URL, rate limits)
  - ✅ **Both dev servers running:**
    - API: `http://127.0.0.1:8787` (Wrangler local + local D1)
    - Web: `http://localhost:5173` (Vite)
  - ✅ Verified: `GET /health → {status: ok}`, `POST /auth/register → JWT + user object`

- **2026-06-22 (session 3)** — Cloudflare resources provisioned, full cloud preview live.
  - ✅ GitHub repo created: https://github.com/signalsbylandy-boop/thepillboard
  - ✅ GitHub epic created: 34 issues across 7 milestones (v0.1–v0.7)
  - ✅ Cloudflare D1 database: pillboard-db (04d66099-51cf-4e93-a9ad-a7e536bc402c)
  - ✅ Cloudflare KV Sessions: 9fabed49e9a74b72a6edf8188325e61f
  - ✅ Cloudflare KV Cache: 00e2b81a97b74be780c9c5e8ea86a0ef
  - ✅ D1 migrations applied to remote (44 SQL commands)
  - ✅ workers.dev subdomain claimed: signalsbylandy.workers.dev
  - ✅ JWT_SECRET set on preview worker
  - ✅ Preview API live: https://thepillboard-api-preview.signalsbylandy.workers.dev
  - ✅ Preview frontend live: https://preview.thepillboard-web.pages.dev
  - ✅ End-to-end verified: /health, /auth/register, /auth/login, /posts all working

**Preview environment (review before prod):**
- API: https://thepillboard-api-preview.signalsbylandy.workers.dev
- Frontend: https://preview.thepillboard-web.pages.dev

**Next steps:**
1. Add proxied DNS record `preview-api.thepillboard.com` → A `192.0.2.1` in Cloudflare dashboard
2. Enable R2 in Cloudflare dashboard → re-add R2 binding → redeploy
3. Add GitHub Actions secrets:
   - CLOUDFLARE_API_TOKEN (create at dash.cloudflare.com/profile/api-tokens)
   - CLOUDFLARE_ACCOUNT_ID = 0617757ef697032f95b1de5b5aaf03f9
   - PREVIEW_API_URL = https://thepillboard-api-preview.signalsbylandy.workers.dev
4. Push a branch → CI auto-deploys preview, merge to main → production deploys
