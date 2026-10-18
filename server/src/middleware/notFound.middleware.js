const { NotFoundError } = require('../errors');

const notFound = (req, res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
