const { google } = require('googleapis');

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || 'me';

let cachedAuth = null;

/**
 * Build (or return cached) OAuth2 client with the stored refresh token.
 */
function getAuth() {
  if (cachedAuth) return cachedAuth;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      'Gmail credentials missing. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN in your environment.'
    );
  }

  const oauth2 = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET
  );

  oauth2.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  cachedAuth = oauth2;
  return oauth2;
}

/**
 * Build a RFC 2822 MIME message string with UTF-8 HTML body.
 */
function buildMimeMessage({ to, cc, subject, bodyHtml, from }) {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    `From: ${from || GMAIL_SENDER_EMAIL}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join('\r\n');

  const plainText = bodyHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plainText, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(bodyHtml, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return `${headers}\r\n\r\n${body}`;
}

/**
 * Send an email via the Gmail API.
 *
 * @param {Object} opts
 * @param {string} opts.to       - Comma-separated recipient addresses
 * @param {string} [opts.cc]     - Comma-separated CC addresses
 * @param {string} opts.subject  - Email subject
 * @param {string} opts.bodyHtml - HTML body content
 * @param {string} [opts.from]   - Sender address (defaults to GMAIL_SENDER_EMAIL)
 * @returns {Promise<string>}    - Gmail API message ID
 */
async function sendEmail({ to, cc, subject, bodyHtml, from }) {
  const auth = getAuth();
  const gmail = google.gmail({ version: 'v1', auth });

  const mimeMessage = buildMimeMessage({ to, cc, subject, bodyHtml, from });

  // Gmail API expects URL-safe base64
  const encodedMessage = Buffer.from(mimeMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  console.log(`[GmailClient] Sent message ${res.data.id} to ${to}`);
  return res.data.id;
}

module.exports = { sendEmail };
