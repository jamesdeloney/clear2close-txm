const pool = require('../db');

/**
 * Get all documents, optionally filtered by stage or type.
 */
async function getDocuments({ stageKey, documentType, activeOnly = true } = {}) {
  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  if (activeOnly) {
    params.push(true);
    query += ` AND is_active = $${params.length}`;
  }
  if (stageKey) {
    params.push(stageKey);
    query += ` AND stage_key = $${params.length}`;
  }
  if (documentType) {
    params.push(documentType);
    query += ` AND document_type = $${params.length}`;
  }

  query += ' ORDER BY stage_key, document_name';
  const res = await pool.query(query, params);
  return res.rows;
}

/**
 * Get a single document by key.
 */
async function getDocumentByKey(documentKey) {
  const res = await pool.query('SELECT * FROM documents WHERE document_key = $1', [documentKey]);
  return res.rows[0] || null;
}

/**
 * Create or update a document record.
 */
async function upsertDocument(doc) {
  const res = await pool.query(
    `INSERT INTO documents (document_key, document_name, document_type, stage_key, drive_file_id, drive_folder_id, public_url, mime_type, file_size_bytes, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (document_key) DO UPDATE SET
       document_name = EXCLUDED.document_name,
       document_type = EXCLUDED.document_type,
       stage_key = EXCLUDED.stage_key,
       drive_file_id = EXCLUDED.drive_file_id,
       drive_folder_id = EXCLUDED.drive_folder_id,
       public_url = EXCLUDED.public_url,
       mime_type = EXCLUDED.mime_type,
       file_size_bytes = EXCLUDED.file_size_bytes,
       version = EXCLUDED.version,
       updated_at = now()
     RETURNING *`,
    [
      doc.document_key, doc.document_name, doc.document_type, doc.stage_key,
      doc.drive_file_id, doc.drive_folder_id, doc.public_url,
      doc.mime_type, doc.file_size_bytes, doc.version || '1.0',
    ]
  );
  return res.rows[0];
}

module.exports = { getDocuments, getDocumentByKey, upsertDocument };
