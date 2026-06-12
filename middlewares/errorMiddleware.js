/**
 * Centralized Error Handling Middleware
 * Catch-all error handler for Express application.
 * Formats errors and logs them appropriately.
 * Maps technical errors (SQL, DB) to clear recruiter-friendly messages.
 */

require('dotenv').config();

function errorHandler(err, req, res, next) {
  // Log the detailed error stack trace locally for debugging
  console.error('[Error Handler Log]:', err);

  // Determine HTTP status code, default to 500 (Internal Server Error)
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'An unexpected error occurred on the server.';
  let details = err.details || null;

  // Map technical database errors to specific, human-readable UI messages
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503; // Service Unavailable
    message = 'Database connection failed. Verify MySQL is active and credentials match.';
  } else if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = 'Students table not found. Verify the database auto-setup initialized correctly.';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    message = 'Email address is already registered to another student.';
  } else if (err.status === 400 || statusCode === 400) {
    message = message || 'Invalid request data.';
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
