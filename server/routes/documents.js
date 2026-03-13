const { Router } = require('express');
const { getDocuments, getDocumentByKey, upsertDocument } = require('../services/documentService');

const router = Router();

// GET /api/documents — list documents with optional filters
router.get('/', async (req, res, next) => {
  try {
    const docs = await getDocuments({
      stageKey: req.query.stage_key,
      documentType: req.query.type,
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:key — single document by key
router.get('/:key', async (req, res, next) => {
  try {
    const doc = await getDocumentByKey(req.params.key);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents — create or update a document
router.post('/', async (req, res, next) => {
  try {
    const doc = await upsertDocument(req.body);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
