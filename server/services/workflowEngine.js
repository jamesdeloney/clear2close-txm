const pool = require('../db');

/**
 * Advance a transaction to a new stage.
 * 1. Updates the transaction's current_stage
 * 2. Inserts a stage_history record
 * 3. Clones default_tasks for the new stage into workflow_tasks
 * 4. Queues email templates for the new stage into email_queue
 */
async function advanceStage(transactionId, newStage, triggeredBy = 'system') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current transaction
    const txRes = await client.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    if (txRes.rows.length === 0) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    const transaction = txRes.rows[0];
    const fromStage = transaction.current_stage;

    // Update transaction stage
    await client.query(
      'UPDATE transactions SET current_stage = $1, updated_at = now() WHERE id = $2',
      [newStage, transactionId]
    );

    // Insert stage history
    await client.query(
      `INSERT INTO stage_history (transaction_id, from_stage, to_stage, transitioned_by)
       VALUES ($1, $2, $3, $4)`,
      [transactionId, fromStage, newStage, triggeredBy]
    );

    // Clone default tasks for this stage
    const tasksRes = await client.query(
      `SELECT * FROM default_tasks WHERE stage_key = $1 ORDER BY sort_order`,
      [newStage]
    );

    const referenceDate = getReferenceDate(transaction, newStage);

    for (const task of tasksRes.rows) {
      const dueDate = referenceDate && task.due_offset_days !== null
        ? addDays(referenceDate, task.due_offset_days)
        : null;

      await client.query(
        `INSERT INTO workflow_tasks
         (transaction_id, stage_key, task_name, task_description, assigned_to, due_offset_days, due_date, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          transactionId, newStage, task.task_name, task.task_description,
          task.assigned_to, task.due_offset_days, dueDate, task.sort_order,
        ]
      );
    }

    // Queue emails for this stage
    const emailRes = await client.query(
      `SELECT * FROM email_templates WHERE stage_key = $1 AND is_active = true ORDER BY sort_order`,
      [newStage]
    );

    for (const template of emailRes.rows) {
      const toAddresses = resolveRecipients(template.send_to, transaction);
      if (toAddresses.length === 0) continue;

      const subject = interpolateTemplate(template.subject, transaction);
      const bodyHtml = interpolateTemplate(template.body_html, transaction);

      const scheduledFor = referenceDate && template.send_offset_days !== null
        ? addDays(referenceDate, template.send_offset_days)
        : new Date();

      await client.query(
        `INSERT INTO email_queue
         (transaction_id, template_id, template_key, to_addresses, subject, body_html, links, scheduled_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          transactionId, template.id, template.template_key,
          toAddresses, subject, bodyHtml,
          template.include_links, scheduledFor,
        ]
      );
    }

    await client.query('COMMIT');
    return { success: true, fromStage, toStage: newStage };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get a transaction with all its tasks grouped by stage.
 */
async function getTransactionWithTasks(transactionId) {
  const txRes = await pool.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
  if (txRes.rows.length === 0) return null;

  const transaction = txRes.rows[0];

  const tasksRes = await pool.query(
    `SELECT * FROM workflow_tasks WHERE transaction_id = $1 ORDER BY stage_key, sort_order`,
    [transactionId]
  );

  const tasksByStage = {};
  for (const task of tasksRes.rows) {
    if (!tasksByStage[task.stage_key]) tasksByStage[task.stage_key] = [];
    tasksByStage[task.stage_key].push(task);
  }

  const emailsRes = await pool.query(
    `SELECT * FROM email_queue WHERE transaction_id = $1 ORDER BY scheduled_for`,
    [transactionId]
  );

  const historyRes = await pool.query(
    `SELECT * FROM stage_history WHERE transaction_id = $1 ORDER BY transitioned_at`,
    [transactionId]
  );

  return {
    ...transaction,
    tasks: tasksByStage,
    emails: emailsRes.rows,
    stage_history: historyRes.rows,
  };
}

// --- Helpers ---

function getReferenceDate(transaction, stage) {
  switch (stage) {
    case 'pre_listing': return transaction.created_at ? new Date(transaction.created_at) : new Date();
    case 'active_listing': return transaction.list_date ? new Date(transaction.list_date) : new Date();
    case 'under_contract': return transaction.contract_date ? new Date(transaction.contract_date) : new Date();
    case 'closing': return transaction.closing_date ? new Date(transaction.closing_date) : new Date();
    default: return new Date();
  }
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveRecipients(sendTo, transaction) {
  if (!sendTo || sendTo.length === 0) return [];
  const addresses = [];
  const map = {
    seller: transaction.seller_email,
    buyer: transaction.buyer_email,
    title: transaction.title_contact_email,
    lender: transaction.lender_email,
  };
  for (const role of sendTo) {
    if (map[role]) addresses.push(map[role]);
  }
  return addresses;
}

function interpolateTemplate(text, transaction) {
  if (!text) return '';
  return text
    .replace(/\{\{property_address\}\}/g, transaction.property_address || '')
    .replace(/\{\{seller_name\}\}/g, transaction.seller_name || '')
    .replace(/\{\{buyer_name\}\}/g, transaction.buyer_name || '')
    .replace(/\{\{closing_date\}\}/g, transaction.closing_date ? new Date(transaction.closing_date).toLocaleDateString() : 'TBD')
    .replace(/\{\{agent_name\}\}/g, 'Your Agent')
    .replace(/\{\{list_price\}\}/g, transaction.list_price ? `$${Number(transaction.list_price).toLocaleString()}` : 'TBD')
    .replace(/\{\{contract_price\}\}/g, transaction.contract_price ? `$${Number(transaction.contract_price).toLocaleString()}` : 'TBD');
}

module.exports = { advanceStage, getTransactionWithTasks };
