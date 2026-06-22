// Custom Cloudflare OAuth login with 5-minute timeout
// Usage: node scripts/cf-login.mjs
// Then open the URL in browser and click Allow — you have 5 minutes.

import http from 'http';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const REDIRECT_URI = 'http://localhost:8976/oauth/callback';
const SCOPES = [
  'account:read','user:read','workers:write','workers_kv:write',
  'workers_routes:write','workers_scripts:write','workers_tail:read',
  'd1:write','pages:write','zone:read','ssl_certs:write','ai:write',
  'queues:write','pipelines:write','offline_access'
].join(' ');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

const state = base64url(crypto.randomBytes(32));
const verifier = base64url(crypto.randomBytes(32));
const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

const authUrl = `https://dash.cloudflare.com/oauth2/auth?` +
  `response_type=code&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&state=${state}` +
  `&code_challenge=${challenge}` +
  `&code_challenge_method=S256`;

console.log('\n=== Cloudflare Login (5-minute window) ===\n');
console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for authorization (5 minutes)...\n');

// Try to open browser automatically
try {
  execSync(`start "" "${authUrl}"`, { stdio: 'ignore', shell: true });
} catch {}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8976');
  if (url.pathname !== '/oauth/callback') { res.end('not found'); return; }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (returnedState !== state) {
    res.end('<h1>State mismatch - try again</h1>');
    server.close();
    return;
  }

  // Exchange code for token
  const tokenRes = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    res.end('<h1>Token exchange failed - check console</h1>');
    server.close();
    return;
  }

  // Save to wrangler config location
  const configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'default.toml');

  const config = `oauth_token = "${tokens.access_token}"
refresh_token = "${tokens.refresh_token || ''}"
expiration_time = "${new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()}"
`;
  fs.writeFileSync(configPath, config);

  res.end('<h1>Authorization successful! You can close this tab.</h1><p>Return to Claude Code.</p>');
  console.log('\n✓ Authorization complete! Credentials saved.');
  console.log('Now run: powershell -ExecutionPolicy Bypass -File scripts\\setup-cloudflare-auto.ps1\n');
  server.close();
  process.exit(0);
});

server.listen(8976, 'localhost');

// 5-minute timeout
setTimeout(() => {
  console.error('\n✘ Timed out after 5 minutes. Run the script again.\n');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
