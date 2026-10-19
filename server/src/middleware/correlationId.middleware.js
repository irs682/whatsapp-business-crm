const crypto = require('crypto');

/**
 * Correlation ID Middleware
 * Assigns or propagates unique request correlation IDs for distributed tracing and structured audit logging.
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = correlationIdMiddleware;
