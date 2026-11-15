const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verifies JWT Bearer token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication required. Bearer token missing in authorization header'));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'student_analytics_jwt_secret_dev_key'
    );

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists'));
    }

    if (!user.isActive) {
      return next(ApiError.forbidden('Your account is deactivated. Please contact administration'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expired. Please log in again'));
    }
    return next(ApiError.unauthorized('Invalid authentication token'));
  }
});

module.exports = { protect };
