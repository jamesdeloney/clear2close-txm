const cron = require('node-cron');
const { processEmailQueue } = require('./services/emailService');

function startScheduler() {
  // Process email queue every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await processEmailQueue();
      if (results.length > 0) {
        console.log(`[Scheduler] Processed ${results.length} emails`);
      }
    } catch (err) {
      console.error('[Scheduler] Email queue processing error:', err.message);
    }
  });

  console.log('[Scheduler] Email queue processor running (every 5 minutes)');
}

module.exports = { startScheduler };
