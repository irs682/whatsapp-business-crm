const { ForbiddenError } = require('../errors');
const ROLES = require('../constants/roles');

/**
 * Checks if authenticated user has one of the required roles.
 * SUPER_ADMIN is automatically granted access.
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication context required'));
    }

    if (req.user.role === ROLES.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(new ForbiddenError('You do not have the required role to access this resource'));
  };
};

/**
 * Checks if authenticated user has all or any of the specified permission slugs.
 * SUPER_ADMIN is automatically granted access.
 */
const requirePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication context required'));
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const hasPermissions = requiredPermissions.every((perm) =>
      req.user.permissions.includes(perm)
    );

    if (!hasPermissions) {
      return next(new ForbiddenError('You lack necessary permissions for this operation'));
    }

    next();
  };
};

module.exports = {
  requireRoles,
  requirePermissions,
};
