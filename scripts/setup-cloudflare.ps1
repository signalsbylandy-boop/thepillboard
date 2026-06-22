# ThePillboard — First-time Cloudflare resource creation
# Run this once after `wrangler login`
# Usage: .\scripts\setup-cloudflare.ps1

Write-Host "ThePillboard — Cloudflare Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check wrangler is installed
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Error "wrangler not found. Install with: npm install -g wrangler"
    exit 1
}

Write-Host "[1/6] Creating D1 database 'pillboard-db'..." -ForegroundColor Yellow
$d1Output = wrangler d1 create pillboard-db 2>&1
Write-Host $d1Output -ForegroundColor Gray
Write-Host "  Copy the database_id above into apps/api/wrangler.toml [d1_databases]" -ForegroundColor Green

Write-Host "`n[2/6] Creating KV namespace 'pillboard-sessions'..." -ForegroundColor Yellow
$kvSessions = wrangler kv namespace create pillboard-sessions 2>&1
Write-Host $kvSessions -ForegroundColor Gray
Write-Host "  Copy the id above into apps/api/wrangler.toml [kv_namespaces] SESSIONS binding" -ForegroundColor Green

Write-Host "`n[3/6] Creating KV preview namespace 'pillboard-sessions'..." -ForegroundColor Yellow
$kvSessionsPrev = wrangler kv namespace create pillboard-sessions --preview 2>&1
Write-Host $kvSessionsPrev -ForegroundColor Gray

Write-Host "`n[4/6] Creating KV namespace 'pillboard-cache'..." -ForegroundColor Yellow
$kvCache = wrangler kv namespace create pillboard-cache 2>&1
Write-Host $kvCache -ForegroundColor Gray
Write-Host "  Copy the id above into apps/api/wrangler.toml [kv_namespaces] CACHE binding" -ForegroundColor Green

Write-Host "`n[5/6] Creating KV preview namespace 'pillboard-cache'..." -ForegroundColor Yellow
$kvCachePrev = wrangler kv namespace create pillboard-cache --preview 2>&1
Write-Host $kvCachePrev -ForegroundColor Gray

Write-Host "`n[6/6] Creating R2 bucket 'pillboard-media'..." -ForegroundColor Yellow
$r2 = wrangler r2 bucket create pillboard-media 2>&1
Write-Host $r2 -ForegroundColor Gray

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Resources created! Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update apps/api/wrangler.toml with the IDs printed above"
Write-Host "2. Set secrets:"
Write-Host "   wrangler secret put JWT_SECRET --env production"
Write-Host "   (paste a random 64-char string)"
Write-Host ""
Write-Host "3. Run initial migrations:"
Write-Host "   npm run db:generate"
Write-Host "   npm run db:migrate"
Write-Host ""
Write-Host "4. Start local dev:"
Write-Host "   npm run dev"
