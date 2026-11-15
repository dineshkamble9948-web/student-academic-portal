/**
 * Standardized API Response Helper
 * Ensures uniform response structure across all endpoints for easy frontend integration.
 */
class ApiResponse {
  constructor(statusCode, message = 'Success', data = null, meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
  }

  static success(res, message = 'Success', data = null, statusCode = 200, meta = null) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data, meta));
  }

  static created(res, message = 'Resource created successfully', data = null, meta = null) {
    return res.status(201).json(new ApiResponse(201, message, data, meta));
  }
}

module.exports = ApiResponse;
