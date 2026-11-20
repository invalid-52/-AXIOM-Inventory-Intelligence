/**
 * AXIOM INVENTORY INTELLIGENCE - BACKEND SERVER
 * Serves REST APIs and Static Frontend
 * Includes automatic port conflict resolution, dedicated API 404 routing,
 * and graceful shutdown handling.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 1. Mount API Routes
const apiRoutes = require('./server/routes');
app.use('/api', apiRoutes);

// 2. Dedicated JSON 404 Handler for any unmatched /api/* requests
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 3. Serve Frontend Static Files
app.use(express.static(path.join(__dirname)));

// 4. Fallback to index.html ONLY for frontend non-API GET requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  res.status(500).send('Internal Server Error');
});

/**
 * Start Server with dynamic EADDRINUSE conflict handling & graceful shutdown
 */
let activeServerInstance = null;

function startServer(port, maxAttempts = 5) {
  let attempts = 0;

  function tryListen(currentPort) {
    attempts++;
    const server = app.listen(currentPort, () => {
      activeServerInstance = server;
      console.log(`\n======================================================`);
      console.log(`✈️  AXIOM INVENTORY INTELLIGENCE v2.0 ONLINE`);
      console.log(`📡 Server running at: http://localhost:${currentPort}`);
      console.log(`🤖 AI Provider:      ${(process.env.AI_PROVIDER || 'groq').toUpperCase()}`);
      console.log(`🧠 AI Model:         ${process.env.AI_MODEL || 'openai/gpt-oss-120b'}`);
      console.log(`🔒 Security:         Admin Auth & Dedicated API 404 Guards`);
      console.log(`======================================================\n`);

      // Initialize persistent background scheduler & event watchdog
      try {
        const automationService = require('./server/services/automationService');
        automationService.initScheduler();
      } catch (err) {
        console.warn('⚠️  Automation scheduler init warning:', err.message);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${currentPort} is already in use by another process.`);
        if (attempts < maxAttempts) {
          const nextPort = currentPort + 1;
          console.log(`🔄 Attempting to bind to next available port: http://localhost:${nextPort}...`);
          tryListen(nextPort);
        } else {
          console.error(`❌ Could not find an open port after ${maxAttempts} attempts. Please free port ${DEFAULT_PORT}.`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server startup error:', err);
        process.exit(1);
      }
    });
  }

  tryListen(port);
}

// Graceful shutdown
function handleGracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing server gracefully...`);
  try {
    const automationService = require('./server/services/automationService');
    if (automationService.stopScheduler) {
      automationService.stopScheduler();
    }
  } catch (e) {}

  if (activeServerInstance) {
    activeServerInstance.close(() => {
      console.log('[SHUTDOWN] HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = app;
