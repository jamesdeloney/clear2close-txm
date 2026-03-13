const pool = require('../db');

/**
 * Send an email from the queue.
 * Currently a stub — will be replaced with Gmail MCP integration.
 */
async function sendQueuedEmail(emailId) {
  const res = await pool.query('SELECT * FROM email_queue WHERE id = $1', [emailId]);
  if (res.rows.length === 0) throw new Error(`Email ${emailId} not found in queue`);

  const email = res.rows[0];
  if (email.status === 'sent') throw new Error('Email already sent');
  if (email.status === 'cancelled') throw new Error('Email was cancelled');

  try {
    // --- Gmail MCP integration will go here ---
    // For now, log the email and mark as sent
    console.log(`[EmailService] Sending email: "${email.subject}" to ${email.to_addresses.join(', ')}`);

    await pool.query(
      `UPDATE email_queue SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1`,
      [emailId]
    );

    return { success: true, emailId, subject: email.subject };
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
