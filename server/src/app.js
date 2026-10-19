const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const corsOptions = require('./config/cors');
const requestLogger = require('./middleware/requestLogger.middleware');
const { apiRateLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const notFound = require('./middleware/notFound.middleware');
const apiRoutes = require('./routes');

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP Request Logging
app.use(requestLogger);

// Request parsing with bounded payloads and rawBody capture for webhook signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
app.use(env.API_PREFIX, apiRateLimiter);

// API v1 Routes
app.use(env.API_PREFIX, apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Business CRM API',
    version: '1.0.0',
    documentation: '/docs',
    health: `${env.API_PREFIX}/health`,
  });
});

// 404 Not Found Handling
app.use(notFound);

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
