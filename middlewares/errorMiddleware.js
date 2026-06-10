/**
 * Centralized Error Handling Middleware
 * Catch-all error handler for Express application.
 * Formats errors and logs them appropriately.
 */

require('dotenv').config();

function errorHandler(err, req, res, next) {
  // Log the detailed error stack trace for debugging
  console.error('[Error Handler Log]:', err);

  // Determine HTTP status code, default to 500 (Internal Server Error)
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  
  // Clean error response payload
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred on the server.',
      status: statusCode
    }
  };

  // Expose stack trace and debug info ONLY in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || null;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
