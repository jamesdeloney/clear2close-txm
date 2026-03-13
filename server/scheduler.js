const cron = require('node-cron');
const pool = require('./db');
const { processEmailQueue } = require('./services/emailService');

let dbReady = false;

async function checkDbReady() {
  try {
    await pool.query('SELECT 1 FROM email_queue LIMIT 0');
    dbReady = true;
    return true;
  } catch {
    return false;
  }
}

function startScheduler() {
  // Process email queue every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      if (!dbReady) {
        const ready = await checkDbReady();
        if (!ready) return; // tables not yet migrated — skip silently
      }
      const results = await processEmailQueue();
      if (results.length > 0) {
        console.log(`[Scheduler] Processed ${results.length} emails`);
      }
    } catch (err) {
      console.error('[Scheduler] Email queue processing error:', err.stack || err.message || err);
    }
  });

  console.log('[Scheduler] Email queue processor running (every 5 minutes)');
}

module.exports = { startScheduler };
