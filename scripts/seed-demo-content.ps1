# Seed demo content into the live preview API
param()

$BASE = "https://thepillboard-api-preview.signalsbylandy.workers.dev"
$CF_ACCOUNT = "0617757ef697032f95b1de5b5aaf03f9"
$KV_NAMESPACE = "00e2b81a97b74be780c9c5e8ea86a0ef"

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
        $msg = $_.ErrorDetails.Message
        Write-Host "  ERROR $Method $Path : $msg" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "==> Logging in as admin..." -ForegroundColor Cyan
$loginResp = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = "test@thepillboard.com"; password = "TestPass123!" }
if (-not $loginResp) {
    Write-Host "Admin login failed" -ForegroundColor Red
    exit 1
}
$adminToken = $loginResp.token
Write-Host "  Logged in: $($loginResp.user.username)" -ForegroundColor Green

$seedUsers = @(
    @{ username = "alice_writes"; email = "alice@example.com"; password = "SeedPass123!" },
    @{ username = "bob_techie";   email = "bob@example.com";   password = "SeedPass123!" },
    @{ username = "carol_curator";email = "carol@example.com"; password = "SeedPass123!" },
    @{ username = "dave_codes";   email = "dave@example.com";  password = "SeedPass123!" }
)

$userTokens = @()
Write-Host ""
Write-Host "==> Registering seed users..." -ForegroundColor Cyan
foreach ($u in $seedUsers) {
    $r = Invoke-Api -Method POST -Path "/auth/register" -Body $u
    if ($r -and $r.token) {
        $userTokens += $r.token
        Write-Host "  Created: $($u.username)" -ForegroundColor Green
    } else {
        $r = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = $u.email; password = $u.password }
        if ($r -and $r.token) {
            $userTokens += $r.token
            Write-Host "  Existing: $($u.username)" -ForegroundColor Yellow
        }
    }
}

$posts = @(
    @{ type = "url"; title = "OpenAI announces GPT-5 with 10x reasoning improvement over GPT-4"; url = "https://openai.com/research/gpt-5"; tags = @("ai","tech") },
    @{ type = "url"; title = "Google DeepMind AlphaFold 3 can now predict all molecules of life"; url = "https://deepmind.google/research/alphafold"; tags = @("ai","science") },
    @{ type = "url"; title = "Cloudflare Workers now runs Python natively at the edge"; url = "https://blog.cloudflare.com/python-workers"; tags = @("tech","cloudflare") },
    @{ type = "url"; title = "TypeScript team announces TypeScript 6.0 with full type-safe SQL"; url = "https://devblogs.microsoft.com/typescript"; tags = @("tech","programming") },
    @{ type = "url"; title = "xAI releases Grok 3, claims to beat GPT-5 on math benchmarks"; url = "https://x.ai/blog/grok-3"; tags = @("ai","tech") },
    @{ type = "url"; title = "Claude can now browse the web and write code autonomously"; url = "https://www.anthropic.com/news/claude-update"; tags = @("ai") },
    @{ type = "url"; title = "MIT AI can predict protein-drug interactions with 99% accuracy"; url = "https://news.mit.edu/protein-drug-ai"; tags = @("ai","science","health") },
    @{ type = "url"; title = "AI-generated music now accounts for 20% of all new tracks on Spotify"; url = "https://techcrunch.com/ai-music-spotify"; tags = @("ai","culture") },
    @{ type = "url"; title = "NASA confirms water ice on Moon south pole -- enough to sustain a base"; url = "https://www.nasa.gov/moon-water-ice"; tags = @("science","space") },
    @{ type = "url"; title = "CERN physicists observe new particle that could explain dark matter"; url = "https://home.cern/news/new-particle"; tags = @("science") },
    @{ type = "url"; title = "Scientists grow functional human heart tissue in lab for first time"; url = "https://www.nature.com/heart-tissue-lab"; tags = @("science","health") },
    @{ type = "url"; title = "GTA VI delayed to 2027, Rockstar says they are not satisfied with current state"; url = "https://www.rockstargames.com/newswire"; tags = @("gaming") },
    @{ type = "url"; title = "Steam hits 40 million concurrent users for the first time in history"; url = "https://store.steampowered.com/news"; tags = @("gaming","tech") },
    @{ type = "url"; title = "Nintendo Switch 2 sells 5 million units in first weekend"; url = "https://www.nintendo.com/news"; tags = @("gaming") },
    @{ type = "url"; title = "Remote work is mainstream: 60% of knowledge workers now work from home"; url = "https://www.pewresearch.org/remote-work-2026"; tags = @("culture") },
    @{ type = "url"; title = "Average American now spends more time in AR/VR than watching TV"; url = "https://variety.com/ar-vr-screen-time"; tags = @("culture","tech") },
    @{ type = "url"; title = "Bitcoin hits 200k as institutional adoption reaches all-time high"; url = "https://coindesk.com/bitcoin-200k"; tags = @("crypto") },
    @{ type = "url"; title = "Ethereum sharding upgrade cuts gas fees by 99%"; url = "https://ethereum.org/blog/sharding"; tags = @("crypto","tech") },
    @{ type = "url"; title = "SpaceX Starship completes first crewed flight to orbit"; url = "https://www.spacex.com/updates/starship-crewed"; tags = @("space") },
    @{ type = "text"; title = "Ask ThePillboard: What are the most underrated tools in your dev stack?"; text = "Been thinking about this -- so many tools transformed how I work but most people have never heard of them. For me its Warp terminal, Bruno API client, and Bun. What are yours?"; tags = @("tech","programming") }
)

Write-Host ""
Write-Host "==> Submitting $($posts.Count) posts..." -ForegroundColor Cyan
$postIds = @()
foreach ($p in $posts) {
    $body = @{ type = $p.type; title = $p.title; tags = $p.tags }
    if ($p.url) { $body.url = $p.url }
    if ($p.text) { $body.text = $p.text }
    $r = Invoke-Api -Method POST -Path "/posts" -Body $body -Token $adminToken
    if ($r -and $r.id) {
        $postIds += $r.id
        $short = $p.title.Substring(0, [Math]::Min(55, $p.title.Length))
        Write-Host "  OK: $short" -ForegroundColor Green
    } else {
        $postIds += $null
        Write-Host "  SKIP: $($p.title)" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "==> Approving all submitted posts by ID..." -ForegroundColor Cyan
$approved = 0
foreach ($submittedId in $postIds) {
    if (-not $submittedId) { continue }
    $r = Invoke-Api -Method POST -Path "/moderation/queue/$submittedId/action" -Body @{ action = "approve" } -Token $adminToken
    if ($r) {
        $approved++
        Write-Host "  Approved: $submittedId" -ForegroundColor Green
    }
    Start-Sleep -Milliseconds 200
}
Write-Host "  Approved $approved posts" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==> Adding votes to submitted posts..." -ForegroundColor Cyan
$allTokens = @($adminToken) + $userTokens
$validIds = $postIds | Where-Object { $_ -ne $null }

for ($i = 0; $i -lt $validIds.Count; $i++) {
    $targetId = $validIds[$i]
    if ($i -lt 5)       { $voteCount = Get-Random -Minimum 15 -Maximum 25 }
    elseif ($i -lt 10)  { $voteCount = Get-Random -Minimum 8 -Maximum 15 }
    else                 { $voteCount = Get-Random -Minimum 2 -Maximum 8 }

    $max = [Math]::Min($voteCount, $allTokens.Count)
    $tokensToUse = $allTokens | Select-Object -First $max
    foreach ($t in $tokensToUse) {
        Invoke-Api -Method POST -Path "/votes" -Body @{ targetId = $targetId; targetType = "post"; value = 1 } -Token $t | Out-Null
    }
    Write-Host "  Post $($i+1): $max votes" -ForegroundColor Green
    Start-Sleep -Milliseconds 150
}

Write-Host ""
Write-Host "==> Busting KV cache..." -ForegroundColor Cyan
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
        $cfUri = "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/storage/kv/namespaces/$KV_NAMESPACE/values/$encoded"
        try {
            Invoke-RestMethod -Uri $cfUri -Method DELETE -Headers @{ "Authorization" = "Bearer $cfToken" } -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Deleted: $key" -ForegroundColor Green
        } catch { }
    }
} else {
    Write-Host "  No CF token found, skipping" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==> Seeding complete!" -ForegroundColor Cyan
Write-Host "    Preview: https://preview.thepillboard-web.pages.dev" -ForegroundColor White
