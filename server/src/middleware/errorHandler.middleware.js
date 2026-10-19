const { ApiError } = require('../errors');
const env = require('../config/env');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token is invalid or expired';
  } else if (err.code && err.code.startsWith('P')) {
    // Prisma database error mapping
    logger.error('Prisma Error Code:', err.code, err.meta);
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = err.meta?.target ? ` (${err.meta.target.join(', ')})` : '';
      message = `A unique constraint failed${target}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record was not found';
    } else {
      message = 'Database operation failed';
    }
  } else {
    logger.error('Unhandled Application Error:', err);
  }

  const response = {
    success: false,
    message,
    correlationId: req.correlationId,
    ...(errors.length > 0 && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
