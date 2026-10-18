const ApiError = require('./apiError');
const HTTP_STATUS = require('../constants/httpStatusCodes');

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = []) {
    super(HTTP_STATUS.BAD_REQUEST, message, errors);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access', errors = []) {
    super(HTTP_STATUS.UNAUTHORIZED, message, errors);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden resource', errors = []) {
    super(HTTP_STATUS.FORBIDDEN, message, errors);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', errors = []) {
    super(HTTP_STATUS.NOT_FOUND, message, errors);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', errors = []) {
    super(HTTP_STATUS.CONFLICT, message, errors);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, errors);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
