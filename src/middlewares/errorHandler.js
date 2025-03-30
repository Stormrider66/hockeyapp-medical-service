const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  // Check for specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || []
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Your session has expired. Please log in again.'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token.'
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message || 'The requested resource was not found.'
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message || 'You do not have permission to access this resource.'
    });
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) {
    // PostgreSQL error codes starting with 23 are integrity constraint violations
    return res.status(400).json({
      error: 'Database Error',
      message: 'A database constraint violation occurred.',
      details: err.detail || err.message
    });
  }

  // Default to 500 for unhandled errors
  return res.status(500).json({
    error: 'Server Error',
    message: 'An unexpected error occurred on the server.',
    // Only include error details in development
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
};

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message || 'Resource not found');
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message || 'Access forbidden');
    this.name = 'ForbiddenError';
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  NotFoundError,
  ForbiddenError
};