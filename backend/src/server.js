require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { seedCampusKnowledgeBase } = require('./rag/seedDocs');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/docs')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount API Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
    service: 'Digital Campus Pass & PostgreSQL RAG Assistant'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Process-level unhandled error safeguards
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Server Initialization
async function startServer() {
  try {
    // 1. Initialize PostgreSQL database, run migrations, and seed initial records
    await db.initDatabase();

    // 2. Auto-seed campus knowledge documents into PostgreSQL RAG vector store
    await seedCampusKnowledgeBase();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Digital Campus Pass Backend running on port ${PORT}`);
      console.log(`🐘 Database: PostgreSQL (Production Source of Truth)`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`====================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by another process.`);
        console.error(`This typically happens if another Node.js instance (or background service) is running.`);
        console.error(`To identify and terminate the process holding port ${PORT} on Windows:`);
        console.error(`  PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select-Object OwningProcess`);
        console.error(`  CMD:        netstat -ano | findstr :${PORT}`);
        console.error(`  Taskkill:   taskkill /PID <PID> /F\n`);
      } else {
        console.error('❌ HTTP Server error:', err);
      }
      process.exit(1);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down HTTP server gracefully...`);
      server.close(async () => {
        try {
          await db.closePool();
          console.log('✅ PostgreSQL connection pool closed cleanly.');
        } catch (e) {
          // ignore
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return server;
  } catch (err) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;

