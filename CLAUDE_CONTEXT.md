# ThePillboard — Claude Session Context
> Load this file at the start of every new session. It is the single source of truth for who we are, what we've built, and where we're going.

---

## Who You Are

**Name:** Mark  
**Email:** markboohaker@gmail.com  
**Role:** Non-technical founder. Product vision, brand instincts, content strategy — Claude handles all code, infra, and deployment.  
**Working style:** You review in browser and give feedback verbally. You cannot paste screenshots into Claude (limitation of the current setup). You run terminal commands by prefixing them with `!` in the Claude Code prompt, which executes them in the session.  
**Goal:** Commercial launch of ThePillboard as a real product with real users.

---

## Who Claude Is (For This Project)

Your senior full-stack developer, DevOps engineer, and technical co-founder. Claude:
- Writes all code, reviews its own work, deploys via wrangler CLI and GitHub Actions
- Explains decisions in plain language — no assumed technical knowledge
- Asks for input only when a decision is genuinely yours to make (brand, product direction, color, content)
- Cannot open a browser or control your screen. Relies on you clicking around and reporting back what you see, or pasting console errors (F12 in browser → Console tab)
- Remembers context via this file + the memory system at `C:\Users\dev_landy\.claude\projects\...`

---

## The Product

**Name:** ThePillboard  
**Domain:** thepillboard.com (purchased, not yet pointed to Cloudflare)  
**Concept:** A "He Said / She Said" gender dialog platform — a place where both sides of relationship, dating, and cultural gender dynamics get equal airtime. Think Digg.com but for gender discourse.  
**Tagline:** *he said · she said*  
**Design inspiration:** Digg.com — dark header, editorial grid, IBM Plex font stack, strong typographic hierarchy  
**Target audience:** People in their 20s–40s navigating dating, relationships, and modern gender expectations

### Core Mechanics
- Posts are submitted with a URL or text and tagged to a category
- All posts require moderator approval before going live
- Visitors vote **He Said** or **She Said** on each post (indicating whose "lament" it represents)
- Standard upvote/downvote drives the hot score and feed ranking
- Categories: He Said, She Said, Dating, Relationships, Culture, Red Flags, Hot Takes, Marriage, Divorce, Workplace

---

## Tech Stack

### Monorepo Structure (Turborepo)
```
thepillboard/
├── apps/
│   ├── api/          # Cloudflare Worker (Hono v4)
│   └── web/          # React + Vite (Cloudflare Pages)
├── packages/
│   ├── db/           # Drizzle ORM schema (source-only, no build step)
│   └── types/        # Shared TypeScript types (source-only, no build step)
├── CLAUDE_CONTEXT.md # ← This file
└── .github/workflows/
    ├── ci.yml              # lint + type-check + build on push to master
    └── deploy-preview.yml  # PR → Cloudflare Pages preview deploy
```

### Backend — `apps/api`
- **Runtime:** Cloudflare Workers
- **Framework:** Hono v4
- **Auth:** JWT (jose library), PBKDF2 password hashing
- **Roles:** admin / mod / user
- **Worker name (preview):** `thepillboard-api-preview`
- **Live URL:** `https://thepillboard-api-preview.signalsbylandy.workers.dev`

### Frontend — `apps/web`
- **Framework:** React + Vite (NOT Next.js)
- **Styling:** Tailwind CSS v3 + custom design tokens
- **State:** TanStack Query (server state), Zustand (auth + presence stores)
- **Router:** React Router v6
- **Fonts:** IBM Plex Sans (body), IBM Plex Mono (scores/metadata), IBM Plex Sans Condensed (headers)
- **Pages project:** `thepillboard-web`
- **Live preview URL:** `https://preview.thepillboard-web.pages.dev`

### Data Layer
| Service | Purpose | Notes |
|---|---|---|
| Cloudflare D1 (SQLite) | All persistent data — posts, users, votes, comments, tags | Via Drizzle ORM |
| Cloudflare KV | Session tokens + post list cache (5-min TTL) | Cache keys: `posts:hot::1:25:` etc. |
| Cloudflare Durable Objects | GlobalPresence, RoomPresence, RateLimiter | Requires `new_sqlite_classes` in wrangler.toml (free plan) |
| Cloudflare R2 | Media/image storage | Purchased but NOT yet enabled |

### Key Environment Variables
- `VITE_API_URL` — must be baked in at Vite build time. Set to `https://thepillboard-api-preview.signalsbylandy.workers.dev` for preview builds
- `VITE_WS_URL` — WebSocket URL for presence (same host as API, `wss://`)
- GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (already set on the repo)

---

## Color Palette (Intentional — Do Not Add Colors)

**Rule: 3 accent colors only.** Everything else is slate.

| Color | Tailwind | Used For |
|---|---|---|
| Orange | `orange-500` / `orange-600` | Logo, brand, votes, scores, CTAs, live dots, hover states |
| Blue | `blue-600` / `blue-700` | **He Said only** — category tab, featured gradient, scoreboard |
| Rose | `rose-500` / `rose-600` | **She Said only** — category tab, featured gradient, scoreboard, downvote |
| Slate | `slate-*` | All backgrounds, borders, body text, neutral UI |

**Never add:** green, teal, violet, amber, red-700+, purple. These were all removed intentionally.

---

## Design System

- **Dark mode:** Always supported via Tailwind `dark:` classes. Toggle stored in localStorage.
- **Font scale:** IBM Plex Sans (body), IBM Plex Mono (all numbers, scores, timestamps, metadata, domain badges), IBM Plex Sans Condensed (section headers, ALL CAPS labels)
- **Border radius:** Cards use `rounded-xl`, buttons use `rounded-full` (pill style)
- **Animations:** Cards stagger-fade in (`animate-fade-in` + `animationDelay`). Highlight cards pop in (`animate-pop-in`). Sidebar slides from left.
- **Category tab order:** He Said / She Said tabs **randomly swap** on each page load (useState initializer with Math.random) — this is intentional product behavior

---

## What Is Currently Working

- **Homepage:** Featured editorial grid (1 hero + 4 mini cards), post feed with staggered animations, He Said/She Said scoreboard sidebar, Rising Stories sidebar, Browse by Topic tag cloud
- **Article pages:** Click any card → opens `/p/:slug` with hero image, story body, vote bar, comment thread. Fully working after fixing a React infinite-loop bug in the WebSocket presence selector.
- **Auth:** Register, login, logout, JWT sessions stored in KV
- **Voting:** Upvote (orange) / downvote (rose) on posts and comments with optimistic UI
- **Comments:** Threaded, up to 6 levels deep, with reply forms
- **Moderation queue:** Approve/reject submitted posts
- **Category filtering:** Click any tag/category → filters feed
- **Sort:** Hot / New / Top
- **Pagination:** Centered pill-style ← Prev / Page N / Next →
- **SPA routing:** `apps/web/public/_redirects` → `/* /index.html 200` — all URLs work on direct access and refresh
- **CORS:** API allows all `*.pages.dev` origins for preview deployments
- **Error boundary:** App.tsx wraps routes in ErrorBoundary — crashes show a message instead of white screen
- **CI/CD:** GitHub Actions on push to `master` → lint + type-check + build. PRs → auto-deploy to Pages preview.
- **48 seed posts** across all categories, with realistic vote spreads

---

## What Is NOT Working / In Progress

| Issue | Status | Notes |
|---|---|---|
| Room WebSocket presence | Disabled on PostPage | The Durable Object WS endpoint fails in preview. The bug that caused white-screen crashes (infinite loop from `?? []` Zustand selector) is fixed, but the feature is commented out. Re-enable once WS is verified stable. |
| R2 image storage | Not enabled | Need to enable in Cloudflare dashboard and wire up image upload endpoint |
| Domain pointing | Not done | thepillboard.com is purchased. Need to: add site to Cloudflare → update nameservers at registrar → deploy prod Workers/Pages |
| Profile page route | Missing | `/u/:username` route is not in `App.tsx`. `ProfilePage` component exists at `apps/web/src/pages/Profile.tsx` but is not routed. |
| He Said / She Said vote mechanic | Not built | The core product vote (binary perspective label, not score) doesn't exist yet. See "Next Features" below. |
| Reddit content ingestion | Not built | See "Next Features" below |
| Global presence WS | Connected but harmless errors | The global socket tries to connect and retries. Doesn't crash, but logs WebSocket errors to console. |

---

## Development Workflow

### How We Deploy
```powershell
# Build frontend (from apps/web):
$env:VITE_API_URL = "https://thepillboard-api-preview.signalsbylandy.workers.dev"
$env:VITE_WS_URL = "wss://thepillboard-api-preview.signalsbylandy.workers.dev"
npx vite build

# Deploy to Cloudflare Pages preview:
npx wrangler pages deploy dist --project-name thepillboard-web --branch preview

# Deploy API worker:
npx wrangler deploy --name thepillboard-api-preview  # (run from apps/api)

# Push to GitHub (triggers CI):
git push origin master
```

### Important Commands
```powershell
# Run D1 SQL directly on remote DB:
npx wrangler d1 execute DB --remote --command "SELECT * FROM posts LIMIT 5"

# Bust KV post cache (after seeding data):
# Must use Cloudflare REST API — list keys then DELETE each one

# Check GitHub CI status:
gh run list --repo signalsbylandy-boop/thepillboard --limit 3
```

### Gotchas / Lessons Learned
- **packages/types and packages/db have NO build step** — they are source-only TS packages. Never add `npm run build` for them in CI.
- **VITE_API_URL must be set before `npx vite build`** — it's baked in at compile time, not runtime.
- **KV cache serves stale data** after D1 changes. Must bust manually via Cloudflare REST API.
- **Wrangler login on Windows has a 60-second OAuth timeout** — a custom login script exists at `scripts/cf-login.mjs`.
- **Durable Objects on free plan** require `new_sqlite_classes` (not `new_classes`) in `wrangler.toml` migrations.
- **`bg-slate-750` does not exist** in Tailwind — use `bg-slate-700/30` instead.
- **Zustand selectors that return new object/array references cause infinite re-renders.** Always use a module-level constant as a fallback (e.g. `const EMPTY = []` outside the component).

---

## GitHub
- **Repo:** `signalsbylandy-boop/thepillboard`
- **Default branch:** `master` (not `main`)
- **Secrets set:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

---

## Cloudflare Account
- **Account:** signalsbylandy  
- **Billing protection:** Spending cap is set — the free tier covers development usage. You are NOT at risk of a surprise bill during development. Production traffic will require reviewing the plan.
- **Free tier covers:** Workers (100k req/day), D1 (5M reads/day), KV (100k reads/day), Pages (500 deploys/month)

---

## Next Features (Prioritized)

### 1. He Said / She Said Binary Vote (Core Product — HIGH)
The current upvote/downvote drives ranking. The *perspective vote* is different: visitors label each post as representing a "He Said" lament or "She Said" lament. This is the core differentiator of the platform.

**What to build:**
- New DB table: `perspectives` (postId, userId/sessionId, choice: 'he' | 'she', createdAt)
- New API endpoint: `POST /perspectives` — unauthenticated allowed (use IP-based rate limiting)
- New UI: Replace or supplement the current upvote/downvote with a two-button perspective bar on each PostCard
- Show the split % on article pages (the scoreboard widget already does this visually)

### 2. Reddit Content Ingestion (Content Engine — HIGH)
Pull top posts from gender/relationship subreddits nightly as seeded ThePillboard posts.

**Target subreddits:** r/AmItheAsshole, r/relationship_advice, r/TrueOffMyChest, r/dating, r/dating_advice, r/BreakUps

**What to build:**
- Cloudflare Worker cron job (scheduled trigger in wrangler.toml)
- Reddit public API (no auth needed for public posts — `https://www.reddit.com/r/{sub}/top.json?t=day&limit=10`)
- Map Reddit post → ThePillboard post (title, text/url, auto-tag based on subreddit)
- Auto-approve posts from trusted source (or put in mod queue with `source: reddit` label)

**Why Reddit over Twitter/X:** Free API, richer content, no monthly cost, better content fit

### 3. Domain Go-Live (Infrastructure — MEDIUM)
- Add thepillboard.com to Cloudflare (Sites → Add Site)
- Update nameservers at registrar to Cloudflare nameservers
- Deploy production Worker (`thepillboard-api`) and Pages project (main branch)
- Set `APP_URL=https://thepillboard.com` in production Worker env vars

### 4. Profile Page Route (Bug Fix — LOW)
- Add `<Route path="/u/:username" element={<ProfilePage />} />` to `apps/web/src/App.tsx`
- Import: `const ProfilePage = lazy(() => import('@/pages/Profile').then(m => ({ default: m.ProfilePage })))`

### 5. Re-enable Room Presence (Nice to Have — LOW)
- Verify WebSocket endpoint works in preview environment
- Re-add `useRoomPresence(post?.id)` and `RoomViewerBadge` to `apps/web/src/pages/Post.tsx`

---

## Content & Seeding

- **48 approved posts** in D1 across all 7 categories
- Posts were seeded manually via API using test user tokens
- Votes were added via 6 seed user accounts to create realistic hot scores
- Old tech/GPT posts were deleted (`DELETE FROM posts WHERE title LIKE '%GPT%'...`)
- **KV cache must be busted** after any direct D1 data changes or new seed runs

---

## Session Handoff Checklist

When starting a new session, tell Claude:
1. "Read CLAUDE_CONTEXT.md in the project root"
2. What you observed / feedback from last session (what looked wrong, what you liked)
3. Which feature you want to work on next

Claude will read this file, check current file state, and pick up immediately.

---

*Last updated: 2026-06-23*  
*Working preview: https://preview.thepillboard-web.pages.dev*  
*API preview: https://thepillboard-api-preview.signalsbylandy.workers.dev*
