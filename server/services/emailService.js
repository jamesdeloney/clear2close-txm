const pool = require('../db');
const { sendEmail } = require('./gmailClient');

/**
 * Send an email from the queue via the Gmail API.
 */
async function sendQueuedEmail(emailId) {
  const res = await pool.query('SELECT * FROM email_queue WHERE id = $1', [emailId]);
  if (res.rows.length === 0) throw new Error(`Email ${emailId} not found in queue`);

  const email = res.rows[0];
  if (email.status === 'sent') throw new Error('Email already sent');
  if (email.status === 'cancelled') throw new Error('Email was cancelled');

  try {
    const to = email.to_addresses.join(', ');
    const cc = email.cc_addresses && email.cc_addresses.length > 0
      ? email.cc_addresses.join(', ')
      : undefined;

    const gmailMessageId = await sendEmail({
      to,
      cc,
      subject: email.subject,
      bodyHtml: email.body_html,
    });

    await pool.query(
      `UPDATE email_queue
       SET status = 'sent', sent_at = now(), gmail_message_id = $1, updated_at = now()
       WHERE id = $2`,
      [gmailMessageId, emailId]
    );

    console.log(`[EmailService] Sent "${email.subject}" to ${to} (Gmail ID: ${gmailMessageId})`);
    return { success: true, emailId, subject: email.subject, gmailMessageId };
  } catch (err) {
    await pool.query(
      `UPDATE email_queue SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2`,
      [err.message, emailId]
    );
    throw err;
  }
}

/**
 * Process all pending emails that are due.
 */
async function processEmailQueue() {
  const res = await pool.query(
    `SELECT id FROM email_queue
     WHERE status = 'pending' AND scheduled_for <= now()
     ORDER BY scheduled_for
     LIMIT 50`
  );

  const results = [];
  for (const row of res.rows) {
    try {
      const result = await sendQueuedEmail(row.id);
      results.push(result);
    } catch (err) {
      results.push({ success: false, emailId: row.id, error: err.message });
    }
  }
  return results;
}

module.exports = { sendQueuedEmail, processEmailQueue };
