# ThePillboard - Create full GitHub epic + sub-issues
# Prerequisites: gh CLI installed and authenticated, repo already created
# Usage: .\scripts\create-github-issues.ps1 -Repo "yourusername/thepillboard"

param(
    [Parameter(Mandatory=$true)]
    [string]$Repo
)

Write-Host "Creating labels..." -ForegroundColor Cyan

$labels = @(
    @{ name = "infra";       color = "0075ca"; description = "Infrastructure & DevOps" },
    @{ name = "auth";        color = "d93f0b"; description = "Authentication & Sessions" },
    @{ name = "content";     color = "e4e669"; description = "Posts, Votes, Comments" },
    @{ name = "realtime";    color = "0e8a16"; description = "WebSocket & Durable Objects" },
    @{ name = "moderation";  color = "e11d48"; description = "Content moderation" },
    @{ name = "frontend";    color = "a2eeef"; description = "UI/UX & Frontend" },
    @{ name = "perf";        color = "f9d0c4"; description = "Performance & Caching" },
    @{ name = "analytics";   color = "bfd4f2"; description = "Analytics & Metrics" },
    @{ name = "db";          color = "fef2ff"; description = "Database & Schema" },
    @{ name = "epic";        color = "6f42c1"; description = "Epic parent issue" },
    @{ name = "P0";          color = "b60205"; description = "Critical" },
    @{ name = "P1";          color = "d93f0b"; description = "High priority" },
    @{ name = "P2";          color = "e4e669"; description = "Medium priority" },
    @{ name = "P3";          color = "c5def5"; description = "Nice to have" }
)

foreach ($label in $labels) {
    gh label create $label.name --color $label.color --description $label.description --repo $Repo --force 2>$null
    Write-Host "  Label: $($label.name)" -ForegroundColor Gray
}

Write-Host "`nCreating milestones..." -ForegroundColor Cyan

$milestones = @(
    "v0.1 - Foundation",
    "v0.2 - Auth and Users",
    "v0.3 - Content Core",
    "v0.4 - Real-Time Presence",
    "v0.5 - Moderation",
    "v0.6 - Frontend Polish",
    "v0.7 - Performance and Analytics"
)
foreach ($ms in $milestones) {
    gh api repos/$Repo/milestones --method POST --field title="$ms" 2>$null
    Write-Host "  Milestone: $ms" -ForegroundColor Gray
}

Write-Host "`nCreating issues..." -ForegroundColor Cyan

$issues = @(
    # v0.1 Foundation
    @{
        title = "[INFRA] Set up Cloudflare D1, KV, R2, and Durable Object namespaces"
        body = "## Goal`nCreate all Cloudflare resources needed to run the platform.`n`n## Tasks`n- [ ] Create D1 database pillboard-db`n- [ ] Create KV namespace pillboard-sessions`n- [ ] Create KV namespace pillboard-cache`n- [ ] Create R2 bucket pillboard-media`n- [ ] Fill in wrangler.toml with real IDs`n- [ ] Verify wrangler dev --local starts successfully`n`n## Acceptance Criteria`nwrangler dev runs locally without errors."
        labels = "infra,P0"
        milestone = "v0.1 - Foundation"
    },
    @{
        title = "[INFRA] Configure Wrangler multi-environment (preview / production)"
        body = "## Goal`nEnsure preview deploys go to thepillboard-api-preview worker and production goes to thepillboard-api.`n`n## Tasks`n- [ ] Set [env.preview] and [env.production] in wrangler.toml`n- [ ] Verify CI deploy-preview.yml and deploy-production.yml work`n- [ ] Add all secrets via wrangler secret put for both envs"
        labels = "infra,P0"
        milestone = "v0.1 - Foundation"
    },
    @{
        title = "[DB] Run initial D1 migrations"
        body = "## Goal`nApply the Drizzle schema to D1 locally and remotely.`n`n## Tasks`n- [ ] Run npm run db:generate to generate SQL migrations`n- [ ] Run npm run db:migrate locally`n- [ ] Verify all tables exist with wrangler d1 execute`n- [ ] Add migration step to CI deploy-production.yml"
        labels = "db,infra,P0"
        milestone = "v0.1 - Foundation"
    },
    @{
        title = "[INFRA] GitHub Actions CI/CD pipeline verification"
        body = "## Goal`nEnsure all three workflows pass on a fresh branch.`n`n## Tasks`n- [ ] Add all required GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PREVIEW_API_URL, PREVIEW_WS_URL)`n- [ ] Trigger ci.yml and verify lint + type-check + build all pass`n- [ ] Open a PR and verify deploy-preview.yml runs`n- [ ] Merge to main and verify deploy-production.yml runs"
        labels = "infra,P1"
        milestone = "v0.1 - Foundation"
    },

    # v0.2 Auth
    @{
        title = "[AUTH] Email/password registration with PBKDF2 hashing"
        body = "## Goal`nUsers can register with email + password. Password hashed with Web Crypto PBKDF2.`n`n## API`nPOST /auth/register -> 201 { user, token, expiresAt }`n`n## Acceptance Criteria`n- [ ] Registration returns JWT`n- [ ] Duplicate email/username returns 409`n- [ ] Password stored as PBKDF2 hash, never plaintext`n- [ ] Session row created in D1"
        labels = "auth,P0"
        milestone = "v0.2 - Auth and Users"
    },
    @{
        title = "[AUTH] Login flow with JWT session management"
        body = "## Goal`nUsers can log in and receive a JWT valid for 7 days.`n`n## API`nPOST /auth/login -> 200 { user, token, expiresAt }`n`n## Acceptance Criteria`n- [ ] Invalid credentials return 401`n- [ ] Banned users see 403 message`n- [ ] Token stored in Zustand (persisted to localStorage)`n- [ ] GET /auth/me returns current user with valid token"
        labels = "auth,P0"
        milestone = "v0.2 - Auth and Users"
    },
    @{
        title = "[AUTH] Logout and session invalidation"
        body = "Calling POST /auth/logout deletes the session row from D1. Frontend clears Zustand auth store and redirects to /"
        labels = "auth,P1"
        milestone = "v0.2 - Auth and Users"
    },
    @{
        title = "[AUTH] Forgot password / reset password flow"
        body = "## Goal`nUsers can reset their password via a signed reset token.`n`n## Tasks`n- [ ] POST /auth/forgot-password generates a signed 1h JWT and stores token in user row`n- [ ] When RESEND_API_KEY is set, send email with reset link`n- [ ] POST /auth/reset-password validates token and updates password hash`n- [ ] All existing sessions invalidated on reset"
        labels = "auth,P2"
        milestone = "v0.2 - Auth and Users"
    },
    @{
        title = "[AUTH] OAuth - GitHub provider"
        body = "## Goal`nUsers can sign in with GitHub.`n`n## Tasks`n- [ ] Add GitHub OAuth app in Cloudflare env`n- [ ] GET /auth/github -> redirect to GitHub`n- [ ] GET /auth/github/callback -> exchange code, upsert user, return JWT`n- [ ] Link to existing account if email matches"
        labels = "auth,P2"
        milestone = "v0.2 - Auth and Users"
    },

    # v0.3 Content
    @{
        title = "[CONTENT] URL submission with OG metadata scraping"
        body = "## Goal`nWhen a URL is submitted, fetch og:title, og:description, og:image (3s timeout).`n`n## Acceptance Criteria`n- [ ] OG data stored in post row`n- [ ] OG image shown as thumbnail in PostCard`n- [ ] Duplicate URL within 24h returns 409 with existing postId`n- [ ] Invalid URL returns 400"
        labels = "content,P0"
        milestone = "v0.3 - Content Core"
    },
    @{
        title = "[CONTENT] Text post submission"
        body = "Users can submit text posts (no URL required). Max 40,000 characters. Text rendered as pre-wrap in post detail view."
        labels = "content,P0"
        milestone = "v0.3 - Content Core"
    },
    @{
        title = "[CONTENT] Upvote / downvote with optimistic UI"
        body = "## Goal`nReal-time score updates with optimistic UI.`n`n## Acceptance Criteria`n- [ ] Un-voting (click same direction again) removes vote`n- [ ] Flip vote (click opposite) adjusts score by 2`n- [ ] Vote updates pushed to all room viewers via Durable Object WS`n- [ ] Unauthenticated users see disabled buttons with tooltip"
        labels = "content,realtime,P0"
        milestone = "v0.3 - Content Core"
    },
    @{
        title = "[CONTENT] Hot / New / Top ranking algorithm"
        body = "## Goal`nThree sort orders available on home page.`n`n## Implementation`n- Hot: Wilson score lower bound x time decay (pre-computed hot_score column, updated on each vote)`n- New: ORDER BY created_at DESC`n- Top: ORDER BY score DESC`n`n## Acceptance Criteria`n- [ ] hot_score recomputed on every vote mutation`n- [ ] KV cache invalidated on vote to ensure fresh sort"
        labels = "content,P1"
        milestone = "v0.3 - Content Core"
    },
    @{
        title = "[CONTENT] Tag / topic system"
        body = "## Goal`nPosts can have up to 5 tags. Tags are browsable (filter by tag).`n`n## Acceptance Criteria`n- [ ] Tags created lazily on first use`n- [ ] GET /posts?tag=technology filters posts`n- [ ] Tag pills link to filtered homepage`n- [ ] post_count incremented when tag is used"
        labels = "content,P1"
        milestone = "v0.3 - Content Core"
    },
    @{
        title = "[CONTENT] Nested comment threads (max 6 levels)"
        body = "## Goal`nComments support threading up to 6 levels deep.`n`n## Acceptance Criteria`n- [ ] Frontend renders tree correctly (indent by depth)`n- [ ] Soft delete keeps thread structure ([removed])`n- [ ] New comment pushed to room viewers in real time via Durable Object`n- [ ] comment_count on post incremented on new comment"
        labels = "content,realtime,P1"
        milestone = "v0.3 - Content Core"
    },

    # v0.4 Real-Time
    @{
        title = "[RT] GlobalPresence Durable Object - site-wide visitor tracking"
        body = "## Goal`nOne singleton Durable Object tracks all WebSocket connections site-wide.`n`n## Broadcasts`n- global_stats: { online, authenticated, anonymous, recentIPs, activeRooms }`n`n## Acceptance Criteria`n- [ ] Visitor count updates within 1s of join/leave`n- [ ] IP addresses masked to first 2 octets`n- [ ] Heartbeat every 25s to keep connection alive`n- [ ] Reconnect with exponential backoff (1s -> 30s max)"
        labels = "realtime,infra,P0"
        milestone = "v0.4 - Real-Time Presence"
    },
    @{
        title = "[RT] RoomPresence Durable Object - per-post viewer tracking"
        body = "## Goal`nOne Durable Object per post. Tracks all viewers and pushes vote/comment updates.`n`n## Acceptance Criteria`n- [ ] presence message shows viewer count + authenticated usernames`n- [ ] Viewer count shown live on PostCard (home) and Post detail`n- [ ] DO is keyed post:{postId} via idFromName`n- [ ] Vote mutation in /routes/votes.ts pushes to room DO"
        labels = "realtime,infra,P0"
        milestone = "v0.4 - Real-Time Presence"
    },
    @{
        title = "[RT] Live visitor counter in header with anon IP display"
        body = "## Goal`nHeader shows: live - 1,234 online / 456 logged in / 778 anon`n`n## Acceptance Criteria`n- [ ] Updates in real time via GlobalPresence WS`n- [ ] Sidebar shows recent IP addresses (masked)`n- [ ] Shows reconnecting state when WS drops"
        labels = "realtime,frontend,P0"
        milestone = "v0.4 - Real-Time Presence"
    },
    @{
        title = "[RT] Live activity feed in sidebar"
        body = "## Goal`nRight sidebar shows real-time events: new submissions, big votes, new comments.`n`n## Events`n- new_post: triggered when mod approves a submission`n- big_vote: triggered when a post crosses score thresholds (10, 50, 100)`n- new_comment: triggered on every new comment`n`n## Acceptance Criteria`n- [ ] Max 30 events shown, newest first`n- [ ] Fade-in animation on new event`n- [ ] Relative timestamps update live"
        labels = "realtime,frontend,P1"
        milestone = "v0.4 - Real-Time Presence"
    },
    @{
        title = "[RT] WebSocket heartbeat + auto-reconnect with exponential backoff"
        body = "Client sends heartbeat every 25s. On disconnect: retry at 1s, 2s, 4s, 8s... max 30s. Reconnect restores room join messages."
        labels = "realtime,P1"
        milestone = "v0.4 - Real-Time Presence"
    },

    # v0.5 Moderation
    @{
        title = "[MOD] RateLimiter Durable Object - submission cooldown"
        body = "## Goal`nPer-user/IP rate limiting enforced at the edge.`n`n## Rules`n- Submission: 30s cooldown, max 5/hour`n- Comment: 10s cooldown, max 20/hour`n`n## Acceptance Criteria`n- [ ] 429 response includes retryAfter seconds`n- [ ] Frontend shows countdown timer on submit button`n- [ ] Rate limit keyed by userId if authenticated, IP if not"
        labels = "moderation,infra,P0"
        milestone = "v0.5 - Moderation"
    },
    @{
        title = "[MOD] Submission review queue - pending to approved/rejected"
        body = "## Goal`nAll submissions start as pending and go to the moderation queue.`n`n## Acceptance Criteria`n- [ ] GET /moderation/queue requires moderator role`n- [ ] Actions: approve, reject, remove`n- [ ] Approved post pushed to global activity feed`n- [ ] Moderator action logged in moderation_logs"
        labels = "moderation,P0"
        milestone = "v0.5 - Moderation"
    },
    @{
        title = "[MOD] Duplicate URL detection (24h window)"
        body = "When a URL was submitted in the last 24h, return 409 with the existing postId so the user can upvote the existing post instead of re-submitting."
        labels = "moderation,content,P1"
        milestone = "v0.5 - Moderation"
    },
    @{
        title = "[MOD] Report / flag system for posts and comments"
        body = "## Goal`nAuthenticated users can report content. Reports go to /moderation/reports.`n`n## API`nPOST /reports { targetId, targetType, reason }`n`n## Acceptance Criteria`n- [ ] One report per user per target`n- [ ] Auto-flag post to moderation queue at 3+ reports`n- [ ] Mods can resolve or dismiss reports"
        labels = "moderation,P2"
        milestone = "v0.5 - Moderation"
    },
    @{
        title = "[MOD] User banning (admin only)"
        body = "POST /moderation/ban/:userId sets banned_at and banned_reason. Banned users get 403 on login. Ban logged in moderation_logs."
        labels = "moderation,P2"
        milestone = "v0.5 - Moderation"
    },

    # v0.6 Frontend Polish
    @{
        title = "[FE] Responsive mobile-first layout"
        body = "## Goal`nFully usable on mobile (320px+).`n`n## Tasks`n- [ ] Sidebar hidden on mobile, shown on desktop`n- [ ] PostCard responsive (thumbnail hidden on small)`n- [ ] Header collapses to icon-only on small screens`n- [ ] Comment form works on mobile"
        labels = "frontend,P1"
        milestone = "v0.6 - Frontend Polish"
    },
    @{
        title = "[FE] Dark / light theme toggle"
        body = "Toggle in header. Persisted to localStorage. Respects system preference on first visit. Applied via class=dark on html element."
        labels = "frontend,P2"
        milestone = "v0.6 - Frontend Polish"
    },
    @{
        title = "[FE] SEO - meta tags and Open Graph per post"
        body = "Post detail page sets title, og:title, og:description, og:image from post data. Home page has site-level defaults."
        labels = "frontend,P2"
        milestone = "v0.6 - Frontend Polish"
    },
    @{
        title = "[FE] User profile page"
        body = "## Goal`n/u/:username shows user's submissions, comment history, karma, and join date.`n`n## API`nGET /users/:username -> public profile + paginated posts + comments"
        labels = "frontend,content,P2"
        milestone = "v0.6 - Frontend Polish"
    },
    @{
        title = "[FE] Infinite scroll / load more on post list"
        body = "Replace pagination buttons with Load more button (or intersection observer) that appends next page to current list."
        labels = "frontend,P3"
        milestone = "v0.6 - Frontend Polish"
    },

    # v0.7 Performance and Analytics
    @{
        title = "[PERF] Cloudflare Cache API for approved post list responses"
        body = "Cache GET /posts?sort=hot&page=1 at the Cloudflare edge for 5 minutes. Bust cache on new post approval."
        labels = "perf,P2"
        milestone = "v0.7 - Performance and Analytics"
    },
    @{
        title = "[PERF] KV caching layer for hot content"
        body = "Top 10 posts by score cached in KV with 5-min TTL. Vote mutations invalidate KV cache. Reduces D1 reads for the hot path."
        labels = "perf,P2"
        milestone = "v0.7 - Performance and Analytics"
    },
    @{
        title = "[PERF] D1 query optimization and index audit"
        body = "## Tasks`n- [ ] Run EXPLAIN QUERY PLAN on all major queries`n- [ ] Verify all indexes in schema are being used`n- [ ] Add composite index on (status, hot_score) for the primary list query`n- [ ] Add full-text search support for ?search= param"
        labels = "perf,db,P2"
        milestone = "v0.7 - Performance and Analytics"
    },
    @{
        title = "[ANALYTICS] Cloudflare Analytics Engine integration"
        body = "## Goal`nTrack page views, vote events, submission events using Cloudflare Analytics Engine (free tier).`n`n## Tasks`n- [ ] Add Analytics Engine binding to wrangler.toml`n- [ ] Log page views in presence route`n- [ ] Log vote events in votes route`n- [ ] Build internal stats endpoint GET /stats"
        labels = "analytics,P3"
        milestone = "v0.7 - Performance and Analytics"
    }
)

foreach ($issue in $issues) {
    $labelList = $issue.labels -split "," | ForEach-Object { "--label"; $_ }
    $result = gh issue create `
        --repo $Repo `
        --title $issue.title `
        --body $issue.body `
        --milestone $issue.milestone `
        @labelList 2>&1

    Write-Host "  Created: $($issue.title.Substring(0, [Math]::Min(60, $issue.title.Length)))..." -ForegroundColor Gray
    Start-Sleep -Milliseconds 300
}

Write-Host "`nDone! $($issues.Count) issues created." -ForegroundColor Green
Write-Host "View at: https://github.com/$Repo/issues" -ForegroundColor Cyan
