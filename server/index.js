require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const transactionsRouter = require('./routes/transactions');
const tasksRouter = require('./routes/tasks');
const emailsRouter = require('./routes/emails');
const documentsRouter = require('./routes/documents');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Clear2Close TM',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/documents', documentsRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`[Clear2Close TM] Server running on port ${PORT}`);
  startScheduler();
});
