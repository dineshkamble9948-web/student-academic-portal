const ApiError = require('../utils/apiError');

/**
 * Grant access to specific roles
 * @param  {...string} roles - e.g. 'Student', 'Senior', 'Admin'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User identity not verified'));
    }

    // Standardize comparison to case-insensitive match
    const allowedRoles = roles.map((r) => r.toLowerCase());
    const userRole = (req.user.role || '').toLowerCase();

    if (!allowedRoles.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Allowed roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

module.exports = { authorize };
