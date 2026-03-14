#!/usr/bin/env node

/**
 * One-time helper to obtain a Gmail OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID (type: Web application)
 *   3. Add http://localhost:3333/callback as an Authorized redirect URI
 *   4. Copy the Client ID and Client Secret into your .env file
 *
 * Usage:
 *   node scripts/get-gmail-token.js
 *
 * The script will:
 *   - Open your browser to Google's consent screen
 *   - Listen on localhost:3333 for the callback
 *   - Exchange the code for tokens
 *   - Print the refresh token for you to add to your .env
 */

require('dotenv').config();
const http = require('http');
const { google } = require('googleapis');
const { exec } = require('child_process');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env');
  console.error('   Set these first, then re-run this script.\n');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n🔑  Gmail OAuth2 Token Helper');
console.log('─'.repeat(50));
console.log('\nOpening browser for Google consent...\n');

// Open browser cross-platform
const openCmd = process.platform === 'win32' ? 'start'
  : process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${openCmd} "${authUrl}"`);

// Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const url = new URL(req.url, `http://localhost:3333`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization failed</h2><p>${error}</p>`);
    console.error(`\n❌  Authorization failed: ${error}\n`);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h2>No authorization code received</h2>');
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: Inter, sans-serif; max-width: 600px; margin: 60px auto; text-align: center;">
          <h2 style="color: #2ECC71;">✅ Authorization Successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </body>
      </html>
    `);

    console.log('✅  Authorization successful!\n');
    console.log('─'.repeat(50));
    console.log('\nAdd this to your .env file (and Railway env vars):\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n─'.repeat(50));

    if (tokens.access_token) {
      console.log(`\n(Access token, for reference only — not needed in .env):`);
      console.log(`${tokens.access_token.substring(0, 30)}...`);
    }

    console.log('\n');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h2>Token exchange failed</h2><p>${err.message}</p>`);
    console.error(`\n❌  Token exchange failed: ${err.message}\n`);
  }

  server.close();
  setTimeout(() => process.exit(0), 500);
});

server.listen(3333, () => {
  console.log('Waiting for Google callback on http://localhost:3333/callback ...\n');
});
