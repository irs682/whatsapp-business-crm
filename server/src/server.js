const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Business CRM Server running on port ${PORT} [${env.NODE_ENV}]`);
  logger.info(`📡 API endpoint: http://localhost:${PORT}${env.API_PREFIX}`);
});

// Graceful Shutdown Handling
const handleShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);
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
