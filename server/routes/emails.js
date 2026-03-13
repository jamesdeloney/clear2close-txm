const { Router } = require('express');
const pool = require('../db');
const { sendQueuedEmail } = require('../services/emailService');

const router = Router();

// GET /api/emails/:transactionId — email queue for a transaction
router.get('/:transactionId', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT eq.*, et.template_name
       FROM email_queue eq
       LEFT JOIN email_templates et ON eq.template_id = et.id
       WHERE eq.transaction_id = $1
       ORDER BY eq.scheduled_for`,
      [req.params.transactionId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/emails/:id/send — trigger immediate send
router.post('/:id/send', async (req, res, next) => {
  try {
    const result = await sendQueuedEmail(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/emails — all email templates (for template management)
router.get('/', async (req, res, next) => {
  try {
    const { stage_key } = req.query;
    let query = 'SELECT * FROM email_templates WHERE 1=1';
    const params = [];

    if (stage_key) {
      params.push(stage_key);
      query += ` AND stage_key = $${params.length}`;
    }

    query += ' ORDER BY sort_order';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
