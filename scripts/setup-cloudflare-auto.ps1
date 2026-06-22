# ThePillboard - Fully automated Cloudflare setup
# Run this after: npx wrangler login
# Usage: .\scripts\setup-cloudflare-auto.ps1
# It creates all resources, patches wrangler.toml, sets secrets, and deploys preview.

param(
    [switch]$SkipDeploy
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$WRANGLER_TOML = Join-Path $PSScriptRoot "..\apps\api\wrangler.toml"

function Extract-Id($text, $pattern) {
    if ($text -match $pattern) { return $Matches[1].Trim() } else { return $null }
}

Write-Host ""
Write-Host "ThePillboard - Cloudflare Auto Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# ── Verify auth ──────────────────────────────────────────────────────────────
Write-Host "[0] Verifying Cloudflare auth..." -ForegroundColor Yellow
$whoami = npx wrangler whoami 2>&1
if ($whoami -match "not authenticated") {
    Write-Host "Not logged in. Run: npx wrangler login" -ForegroundColor Red
    exit 1
}
$accountLine = $whoami | Where-Object { $_ -match "Account Name" } | Select-Object -First 1
Write-Host "  Logged in: $accountLine" -ForegroundColor Green

# Extract account ID
$accountId = ($whoami | Where-Object { $_ -match "Account ID" } | Select-Object -First 1) -replace ".*:\s*", "" -replace "\s+", ""
Write-Host "  Account ID: $accountId" -ForegroundColor Gray

# ── D1 Database ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Creating D1 database 'pillboard-db'..." -ForegroundColor Yellow
$d1Out = npx wrangler d1 create pillboard-db 2>&1 | Out-String
Write-Host $d1Out -ForegroundColor Gray

$d1Id = $null
if ($d1Out -match 'database_id\s*=\s*"([a-f0-9-]{36})"') {
    $d1Id = $Matches[1]
    Write-Host "  D1 ID: $d1Id" -ForegroundColor Green
} elseif ($d1Out -match "already exists") {
    # Fetch existing
    $existing = npx wrangler d1 list 2>&1 | Out-String
    if ($existing -match "pillboard-db\s+([a-f0-9-]{36})") {
        $d1Id = $Matches[1]
        Write-Host "  D1 already exists, ID: $d1Id" -ForegroundColor Green
    }
}

# ── KV Sessions ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Creating KV namespace 'pillboard-sessions'..." -ForegroundColor Yellow
$kvSessOut = npx wrangler kv namespace create pillboard-sessions 2>&1 | Out-String
Write-Host $kvSessOut -ForegroundColor Gray

$kvSessId = $null
$kvSessPreviewId = $null
if ($kvSessOut -match 'id\s*=\s*"([a-f0-9]{32})"') {
    $kvSessId = $Matches[1]
    Write-Host "  KV Sessions ID: $kvSessId" -ForegroundColor Green
}
$kvSessPreviewOut = npx wrangler kv namespace create pillboard-sessions --preview 2>&1 | Out-String
if ($kvSessPreviewOut -match 'id\s*=\s*"([a-f0-9]{32})"') {
    $kvSessPreviewId = $Matches[1]
    Write-Host "  KV Sessions Preview ID: $kvSessPreviewId" -ForegroundColor Green
}

# ── KV Cache ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Creating KV namespace 'pillboard-cache'..." -ForegroundColor Yellow
$kvCacheOut = npx wrangler kv namespace create pillboard-cache 2>&1 | Out-String
Write-Host $kvCacheOut -ForegroundColor Gray

$kvCacheId = $null
$kvCachePreviewId = $null
if ($kvCacheOut -match 'id\s*=\s*"([a-f0-9]{32})"') {
    $kvCacheId = $Matches[1]
    Write-Host "  KV Cache ID: $kvCacheId" -ForegroundColor Green
}
$kvCachePreviewOut = npx wrangler kv namespace create pillboard-cache --preview 2>&1 | Out-String
if ($kvCachePreviewOut -match 'id\s*=\s*"([a-f0-9]{32})"') {
    $kvCachePreviewId = $Matches[1]
    Write-Host "  KV Cache Preview ID: $kvCachePreviewId" -ForegroundColor Green
}

# ── R2 Bucket ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Creating R2 bucket 'pillboard-media'..." -ForegroundColor Yellow
$r2Out = npx wrangler r2 bucket create pillboard-media 2>&1 | Out-String
Write-Host $r2Out -ForegroundColor Gray
Write-Host "  R2 bucket uses name binding, no ID needed." -ForegroundColor Green

# ── Patch wrangler.toml ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Patching apps/api/wrangler.toml with real IDs..." -ForegroundColor Yellow

$toml = Get-Content $WRANGLER_TOML -Raw

if ($d1Id)            { $toml = $toml -replace "REPLACE_WITH_YOUR_D1_DATABASE_ID", $d1Id }
if ($kvSessId)        { $toml = $toml -replace "REPLACE_WITH_YOUR_KV_SESSIONS_ID", $kvSessId }
if ($kvSessPreviewId) { $toml = $toml -replace "REPLACE_WITH_YOUR_KV_SESSIONS_PREVIEW_ID", $kvSessPreviewId }
if ($kvCacheId)       { $toml = $toml -replace "REPLACE_WITH_YOUR_KV_CACHE_ID", $kvCacheId }
if ($kvCachePreviewId){ $toml = $toml -replace "REPLACE_WITH_YOUR_KV_CACHE_PREVIEW_ID", $kvCachePreviewId }

Set-Content $WRANGLER_TOML $toml -Encoding utf8
Write-Host "  wrangler.toml updated." -ForegroundColor Green

# ── JWT Secret ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Setting JWT_SECRET..." -ForegroundColor Yellow
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$jwtSecret | npx wrangler secret put JWT_SECRET 2>&1 | Out-Null
$jwtSecret | npx wrangler secret put JWT_SECRET --env preview 2>&1 | Out-Null
Write-Host "  JWT_SECRET set for production and preview." -ForegroundColor Green

# ── D1 Migrations ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Running D1 migrations..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "..\apps\api")
$migrateOut = npx wrangler d1 migrations apply pillboard-db 2>&1 | Out-String
Write-Host $migrateOut -ForegroundColor Gray
$migratePrev = npx wrangler d1 migrations apply pillboard-db --env preview 2>&1 | Out-String
Write-Host $migratePrev -ForegroundColor Gray
Pop-Location

# ── Deploy Preview ────────────────────────────────────────────────────────────
if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "Deploying preview worker..." -ForegroundColor Yellow
    Push-Location (Join-Path $PSScriptRoot "..\apps\api")
    $deployOut = npx wrangler deploy --env preview 2>&1 | Out-String
    Write-Host $deployOut -ForegroundColor Gray

    if ($deployOut -match "https://[^\s]+\.workers\.dev") {
        $previewUrl = $Matches[0]
        Write-Host "  Preview API live at: $previewUrl" -ForegroundColor Green
    }
    Pop-Location
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Setup complete! Resource IDs:" -ForegroundColor Cyan
Write-Host "  D1:              $d1Id"
Write-Host "  KV Sessions:     $kvSessId"
Write-Host "  KV Cache:        $kvCacheId"
Write-Host ""
Write-Host "Next: add GitHub Actions secrets at" -ForegroundColor Yellow
Write-Host "  https://github.com/signalsbylandy-boop/thepillboard/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "  CLOUDFLARE_API_TOKEN = <your token>"
Write-Host "  CLOUDFLARE_ACCOUNT_ID = $accountId"
Write-Host ""
Write-Host "Then push a branch to trigger a preview deploy via GitHub Actions." -ForegroundColor Green
