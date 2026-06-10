/**
 * Database Connection Configuration
 * Uses connection pooling for optimal performance and resource sharing.
 * Relies on environment variables for sensitive credentials.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Define configuration parameters with production-ready defaults
const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_db',
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) : 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create a connection pool to avoid opening a new connection for every single query
const pool = mysql.createPool(poolConfig);

/**
 * Validates the database connectivity on application startup.
 * Logs success or throws error to fail fast if config is wrong.
 */
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`[Database] Connection pool established successfully with ${poolConfig.host}:${poolConfig.port}`);
  } catch (err) {
    console.error('[Database Error] Failed to connect to MySQL database:', err.message);
    throw err;
  } finally {
    if (connection) {
      connection.release(); // release connection back to pool
    }
  }
}

module.exports = {
  pool,
  testConnection
};
