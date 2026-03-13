const { Router } = require('express');
const pool = require('../db');

const router = Router();

// GET /api/tasks/:transactionId — all tasks for a transaction
router.get('/:transactionId', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM workflow_tasks
       WHERE transaction_id = $1
       ORDER BY stage_key, sort_order`,
      [req.params.transactionId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id — update task status
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes, completed_by } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (status) {
      updates.push(`status = $${idx++}`);
      values.push(status);
      if (status === 'completed') {
        updates.push(`completed_at = now()`);
        if (completed_by) {
          updates.push(`completed_by = $${idx++}`);
          values.push(completed_by);
        }
      }
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes);
    }

    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE workflow_tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
