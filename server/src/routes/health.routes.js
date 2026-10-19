const { Router } = require('express');
const prisma = require('../config/prisma');
const whatsAppConfig = require('../integrations/whatsapp/whatsapp.config');
const env = require('../config/env');

const router = Router();

/**
 * GET /api/v1/health
 * High-level service health summary
 */
router.get('/', async (req, res) => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = 'unreachable';
  }

  const isHealthy = dbStatus === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'whatsapp-business-crm-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    correlationId: req.correlationId,
    dependencies: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      whatsapp: {
        mode: whatsAppConfig.mode,
        enabled: whatsAppConfig.enabled,
        isConfigured: Boolean(whatsAppConfig.accessToken && whatsAppConfig.phoneNumberId),
      },
      worker: {
        enabled: env.CAMPAIGN_WORKER_ENABLED,
        rateLimitDelayMs: env.CAMPAIGN_RATE_LIMIT_DELAY_MS,
      },
    },
  });
});

/**
 * GET /api/v1/health/live
 * Kubernetes / Container Liveness Probe (process is alive)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/health/ready
 * Container Readiness Probe (database connectivity & worker ready)
 */
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
