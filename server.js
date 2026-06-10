/**
 * Server Entry Point
 * Loads environment variables, validates database connectivity,
 * boots the HTTP server, and handles safe process terminations.
 */

const app = require('./app');
const { testConnection, pool } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

/**
 * Boots the application after verifying critical dependencies.
 */
async function startServer() {
  try {
    // 1. Verify connection to the MySQL Database before starting the web server
    await testConnection();

    // 2. Start listening on the specified port
    const server = app.listen(PORT, () => {
      console.log(`[Server] Application is running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[Server] Local server URL: http://localhost:${PORT}`);
    });

    // 3. Graceful shutdown handler
    const gracefulShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
      
      // Stop accepting new HTTP requests
      server.close(async () => {
        console.log('[Server] HTTP server has closed.');

        try {
          // Close all connections in the database connection pool
          await pool.end();
          console.log('[Server] MySQL connection pool closed safely.');
          process.exit(0);
        } catch (err) {
          console.error('[Server Error] Error closing MySQL connection pool:', err.message);
          process.exit(1);
        }
      });

      // Force terminate after 10 seconds if graceful shutdown takes too long
      setTimeout(() => {
        console.error('[Server Warning] Graceful shutdown timed out. Force exiting...');
        process.exit(1);
      }, 10000);
    };

    // Listen for system termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Startup Failure] Failed to start Student Management System server:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] Reason:', reason);
});

// Handle uncaught exceptions globally
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] Error details:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Start the server boot lifecycle
startServer();
