const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');
const { initSocket } = require('./socket');

const PORT = env.PORT || 5000;
const httpServer = http.createServer(app);

const campaignQueue = require('./modules/campaigns/campaign.queue');

// Initialize real-time Socket.IO server
initSocket(httpServer);

// Start background campaign queue workers
if (env.NODE_ENV !== 'test') {
  campaignQueue.startWorkers();
}

const server = httpServer.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Business CRM Server running on port ${PORT} [${env.NODE_ENV}]`);
  logger.info(`📡 API endpoint: http://localhost:${PORT}${env.API_PREFIX}`);
  logger.info(`⚡ Socket.IO real-time engine active`);
});

// Graceful Shutdown Handling
const handleShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);
  campaignQueue.stopWorkers();
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force shutdown if taking longer than 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
