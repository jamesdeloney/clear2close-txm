const { Router } = require('express');
const pool = require('../db');
const { advanceStage, getTransactionWithTasks } = require('../services/workflowEngine');

const router = Router();

// GET /api/transactions — list all active transactions with stage + task counts
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        (SELECT count(*) FROM workflow_tasks wt WHERE wt.transaction_id = t.id) AS total_tasks,
        (SELECT count(*) FROM workflow_tasks wt WHERE wt.transaction_id = t.id AND wt.status = 'completed') AS completed_tasks
      FROM transactions t
      WHERE t.status = $1
      ORDER BY t.updated_at DESC
    `, [req.query.status || 'active']);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions — create a new transaction, auto-trigger pre_listing workflow
router.post('/', async (req, res, next) => {
  try {
    const {
      property_address, city, state, zip, mls_number, transaction_type,
      seller_name, seller_email, seller_phone, buyer_name, buyer_email,
      buyer_agent_name, buyer_agent_email, title_company, title_contact_email,
      lender_name, lender_email, list_price, contract_price, earnest_money,
      option_fee, option_period_end, financing_deadline, closing_date,
      possession_date, list_date, contract_date, notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO transactions (
        property_address, city, state, zip, mls_number, transaction_type,
        seller_name, seller_email, seller_phone, buyer_name, buyer_email,
        buyer_agent_name, buyer_agent_email, title_company, title_contact_email,
        lender_name, lender_email, list_price, contract_price, earnest_money,
        option_fee, option_period_end, financing_deadline, closing_date,
        possession_date, list_date, contract_date, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      ) RETURNING *`,
      [
        property_address, city, state || 'TX', zip, mls_number, transaction_type || 'listing',
        seller_name, seller_email, seller_phone, buyer_name, buyer_email,
        buyer_agent_name, buyer_agent_email, title_company, title_contact_email,
        lender_name, lender_email, list_price, contract_price, earnest_money,
        option_fee, option_period_end, financing_deadline, closing_date,
        possession_date, list_date, contract_date, notes,
      ]
    );

    const transaction = result.rows[0];

    // Auto-trigger pre_listing workflow
    await advanceStage(transaction.id, 'pre_listing', 'system');

    // Return the full transaction with tasks
    const full = await getTransactionWithTasks(transaction.id);
    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id — full detail
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await getTransactionWithTasks(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transactions/:id — update fields
router.patch('/:id', async (req, res, next) => {
  try {
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
      [...keys.map(k => fields[k]), req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transactions/:id/stage — advance to a new stage
router.patch('/:id/stage', async (req, res, next) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });

    const validStages = ['pre_listing', 'active_listing', 'under_contract', 'closing', 'closed'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const result = await advanceStage(req.params.id, stage, 'agent');

    if (stage === 'closed') {
      await pool.query(
        'UPDATE transactions SET status = $1, updated_at = now() WHERE id = $2',
        ['closed', req.params.id]
      );
    }

    const full = await getTransactionWithTasks(req.params.id);
    res.json(full);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
