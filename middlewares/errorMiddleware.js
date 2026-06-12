/**
 * Centralized Error Handling Middleware
 * Catch-all error handler for Express application.
 * Formats errors and logs them appropriately.
 * Includes database constraint normalization (e.g., duplicate entries).
 */

require('dotenv').config();

function errorHandler(err, req, res, next) {
  // Log the detailed error stack trace locally for site reliability review
  console.error('[Error Handler Log]:', err);

  // Determine HTTP status code, default to 500 (Internal Server Error)
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'An unexpected error occurred on the server.';
  let details = err.details || null;

  // Senior Engineer Enhancement: Handle database constraint errors gracefully (SQL defense-in-depth)
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    message = 'Email address is already registered to another student.';
    details = {
      code: err.code,
      sqlMessage: err.sqlMessage
    };
  }

  // Clean error response payload
  const errorResponse = {
    success: false,
    error: {
      message,
      status: statusCode
    }
  };

  // Expose stack trace and debug info ONLY in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = details || err.details || null;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
