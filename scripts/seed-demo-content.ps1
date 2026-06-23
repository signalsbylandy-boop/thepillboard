# Seed demo content into the live preview API
# Usage: powershell -ExecutionPolicy Bypass -File scripts\seed-demo-content.ps1

$BASE = "https://thepillboard-api-preview.signalsbylandy.workers.dev"
$CF_ACCOUNT = "0617757ef697032f95b1de5b5aaf03f9"
$KV_NAMESPACE = "00e2b81a97b74be780c9c5e8ea86a0ef"

# Parse CF oauth token for cache busting
$cfConfigPath = "$env:APPDATA\xdg.config\.wrangler\config\default.toml"
$cfToken = ""
if (Test-Path $cfConfigPath) {
    $cfConfig = Get-Content $cfConfigPath -Raw
    if ($cfConfig -match 'oauth_token\s*=\s*"([^"]+)"') {
        $cfToken = $Matches[1]
    }
}

function Invoke-Api {
    param($Method, $Path, $Body, $Token)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $uri = "$BASE$Path"
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            $resp = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $json -ErrorAction Stop
        } else {
            $resp = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ErrorAction Stop
        }
        return $resp
    } catch {
        $errBody = $_.ErrorDetails.Message
        Write-Host "  ERROR $Method $Path : $errBody" -ForegroundColor Red
        return $null
    }
}

# 1. Login as admin
Write-Host "`n==> Logging in as admin..." -ForegroundColor Cyan
$loginResp = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = "test@thepillboard.com"; password = "TestPass123!" }
if (-not $loginResp) { Write-Host "Admin login failed — ensure test user exists in D1" -ForegroundColor Red; exit 1 }
$adminToken = $loginResp.token
Write-Host "  Logged in: $($loginResp.user.username)" -ForegroundColor Green

# 2. Register seed users
$seedUsers = @(
    @{ username = "alice_writes"; email = "alice@example.com"; password = "SeedPass123!" },
    @{ username = "bob_techie"; email = "bob@example.com"; password = "SeedPass123!" },
    @{ username = "carol_curates"; email = "carol@example.com"; password = "SeedPass123!" },
    @{ username = "dave_codes"; email = "dave@example.com"; password = "SeedPass123!" }
)

$userTokens = @()
Write-Host "`n==> Registering seed users..." -ForegroundColor Cyan
foreach ($u in $seedUsers) {
    $r = Invoke-Api -Method POST -Path "/auth/register" -Body $u
    if ($r -and $r.token) {
        $userTokens += $r.token
        Write-Host "  Created: $($u.username)" -ForegroundColor Green
    } else {
        # Try login if already exists
        $r = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = $u.email; password = $u.password }
        if ($r -and $r.token) {
            $userTokens += $r.token
            Write-Host "  Existing: $($u.username)" -ForegroundColor Yellow
        }
    }
}

# 3. Define posts
$posts = @(
    @{ type = "url"; title = "OpenAI announces GPT-5 with 10x reasoning improvement over GPT-4"; url = "https://openai.com/research/gpt-5"; tags = @("ai","tech") },
    @{ type = "url"; title = "Google DeepMind's AlphaFold 3 can now predict all molecules of life"; url = "https://deepmind.google/research/alphafold"; tags = @("ai","science") },
    @{ type = "url"; title = "Cloudflare Workers now runs Python natively at the edge"; url = "https://blog.cloudflare.com/python-workers"; tags = @("tech","cloudflare") },
    @{ type = "url"; title = "The TypeScript team announces TypeScript 6.0 with full type-safe SQL"; url = "https://devblogs.microsoft.com/typescript"; tags = @("tech","programming") },
    @{ type = "url"; title = "Elon Musk's xAI releases Grok 3, claims to beat GPT-5 on math benchmarks"; url = "https://x.ai/blog/grok-3"; tags = @("ai","tech") },
    @{ type = "url"; title = "Anthropic's Claude can now browse the web and write code autonomously"; url = "https://www.anthropic.com/news/claude-update"; tags = @("ai") },
    @{ type = "url"; title = "MIT researchers develop AI that can predict protein-drug interactions with 99% accuracy"; url = "https://news.mit.edu/protein-drug-ai"; tags = @("ai","science","health") },
    @{ type = "url"; title = "AI-generated music now accounts for 20% of all new tracks on Spotify"; url = "https://techcrunch.com/ai-music-spotify"; tags = @("ai","culture") },
    @{ type = "url"; title = "NASA confirms water ice deposits on the Moon's south pole -- enough to sustain a base"; url = "https://www.nasa.gov/moon-water-ice-confirmed"; tags = @("science","space") },
    @{ type = "url"; title = "CERN physicists observe a new particle that could explain dark matter"; url = "https://home.cern/news/new-particle-dark-matter"; tags = @("science") },
    @{ type = "url"; title = "Scientists grow functional human heart tissue in lab for first time"; url = "https://nature.com/heart-tissue-lab"; tags = @("science","health") },
    @{ type = "url"; title = "GTA VI delayed to 2027, Rockstar says they are not satisfied with current state"; url = "https://www.rockstargames.com/newswire"; tags = @("gaming") },
    @{ type = "url"; title = "Steam hits 40 million concurrent users for the first time in history"; url = "https://store.steampowered.com/news/concurrent-record"; tags = @("gaming","tech") },
    @{ type = "url"; title = "Nintendo Switch 2 sells 5 million units in first weekend"; url = "https://www.nintendo.com/news/switch-2-sales"; tags = @("gaming") },
    @{ type = "url"; title = "Remote work is officially mainstream: 60% of knowledge workers now work from home"; url = "https://www.pewresearch.org/remote-work-2026"; tags = @("culture") },
    @{ type = "url"; title = "The average American now spends more time in AR/VR than watching TV"; url = "https://variety.com/ar-vr-screen-time"; tags = @("culture","tech") },
    @{ type = "url"; title = "Bitcoin hits 200000 as institutional adoption reaches all-time high"; url = "https://coindesk.com/bitcoin-200k"; tags = @("crypto") },
    @{ type = "url"; title = "Ethereum's new sharding upgrade cuts gas fees by 99%"; url = "https://ethereum.org/blog/sharding-complete"; tags = @("crypto","tech") },
    @{ type = "url"; title = "SpaceX Starship successfully completes first crewed flight to orbit"; url = "https://www.spacex.com/updates/starship-crewed"; tags = @("space") },
    @{ type = "text"; title = "Ask ThePillboard: What are the most underrated tools in your dev stack?"; text = "Been thinking about this lately -- there are so many tools that transformed how I work but most people have never heard of them. For me it's Warp terminal, Bruno (API client), and Bun for JS runtime. What are yours? Drop your hidden gems below."; tags = @("tech","programming") }
)

# 4. Submit posts
Write-Host "`n==> Submitting $($posts.Count) posts..." -ForegroundColor Cyan
$postIds = @()
foreach ($p in $posts) {
    $body = @{ type = $p.type; title = $p.title; tags = $p.tags }
    if ($p.url) { $body.url = $p.url }
    if ($p.text) { $body.text = $p.text }
    $r = Invoke-Api -Method POST -Path "/posts" -Body $body -Token $adminToken
    if ($r -and $r.id) {
        $postIds += $r.id
        Write-Host "  Created: $($r.id) | $($p.title.Substring(0, [Math]::Min(50, $p.title.Length)))..." -ForegroundColor Green
    } else {
        $postIds += $null
        Write-Host "  SKIPPED: $($p.title.Substring(0, [Math]::Min(50, $p.title.Length)))" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 200
}

# 5. Fetch pending queue and approve all
Write-Host "`n==> Fetching moderation queue..." -ForegroundColor Cyan
$queue = Invoke-Api -Method GET -Path "/moderation/queue" -Token $adminToken
$approved = 0
if ($queue -and $queue.items) {
    foreach ($item in $queue.items) {
        $r = Invoke-Api -Method POST -Path "/moderation/queue/$($item.id)/action" -Body @{ action = "approve" } -Token $adminToken
        if ($r) { $approved++; Write-Host "  Approved: $($item.id)" -ForegroundColor Green }
        Start-Sleep -Milliseconds 100
    }
}
Write-Host "  Approved $approved posts" -ForegroundColor Green

# Give D1 a moment
Start-Sleep -Seconds 2

# 6. Re-fetch post IDs from the live feed (now that they're approved)
Write-Host "`n==> Fetching approved posts for voting..." -ForegroundColor Cyan
$feed = Invoke-Api -Method GET -Path "/posts?sort=new&pageSize=25"
$liveIds = @()
if ($feed -and $feed.items) {
    $liveIds = $feed.items | ForEach-Object { $_.id }
    Write-Host "  Found $($liveIds.Count) approved posts" -ForegroundColor Green
}

# 7. Add votes
Write-Host "`n==> Adding votes..." -ForegroundColor Cyan
$allTokens = @($adminToken) + $userTokens

for ($i = 0; $i -lt $liveIds.Count; $i++) {
    $pid = $liveIds[$i]
    # More votes for top posts (first ones submitted = hottest)
    $voteCount = if ($i -lt 5) { Get-Random -Minimum 15 -Maximum 25 }
                 elseif ($i -lt 10) { Get-Random -Minimum 8 -Maximum 15 }
                 else { Get-Random -Minimum 2 -Maximum 8 }

    $tokensToUse = $allTokens | Select-Object -First ([Math]::Min($voteCount, $allTokens.Count))
    foreach ($t in $tokensToUse) {
        Invoke-Api -Method POST -Path "/votes" -Body @{ targetId = $pid; targetType = "post"; value = 1 } -Token $t | Out-Null
    }
    Write-Host "  Post $($i+1): $voteCount votes" -ForegroundColor Green
    Start-Sleep -Milliseconds 100
}

# 8. Bust KV cache
Write-Host "`n==> Busting KV cache..." -ForegroundColor Cyan
if ($cfToken) {
    $cacheKeys = @(
        "posts:hot:undefined:1:25:undefined",
        "posts:new:undefined:1:25:undefined",
        "posts:top:undefined:1:25:undefined",
        "posts:hot::1:25:",
        "posts:new::1:25:",
        "posts:top::1:25:"
    )
    foreach ($key in $cacheKeys) {
        $encoded = [Uri]::EscapeDataString($key)
        try {
            Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/storage/kv/namespaces/$KV_NAMESPACE/values/$encoded" `
                -Method DELETE `
                -Headers @{ "Authorization" = "Bearer $cfToken" } `
                -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Deleted cache: $key" -ForegroundColor Green
        } catch { }
    }
} else {
    Write-Host "  No CF token found, skipping cache bust" -ForegroundColor Yellow
}

Write-Host "`n==> Done! Preview live at https://preview.thepillboard-web.pages.dev" -ForegroundColor Cyan
