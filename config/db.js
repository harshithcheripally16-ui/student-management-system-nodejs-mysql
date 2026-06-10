/**
 * Database Connection Configuration
 * Uses connection pooling for optimal performance and resource sharing.
 * Relies on environment variables for sensitive credentials.
 * Automatically handles Database & Table initialization.
 */

const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
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
 * Validates database connectivity on application startup.
 * Automatically creates the database and populates tables if they do not exist.
 */
async function testConnection() {
  let connection;
  try {
    // 1. Check database connection and verify/create database schema first
    const setupPool = mysql.createPool({
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      password: poolConfig.password,
      waitForConnections: true,
      connectionLimit: 1
    });

    // Automatically create database if it doesn't exist
    await setupPool.query(`CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\``);
    await setupPool.end();

    // 2. Establish connections to the targeted database pool
    connection = await pool.getConnection();
    console.log(`[Database] Connection pool established successfully with ${poolConfig.host}:${poolConfig.port}`);

    // 3. Auto-initialize tables if the 'students' table does not exist
    const [tables] = await connection.query(`SHOW TABLES LIKE 'students'`);
    if (tables.length === 0) {
      console.log('[Database] "students" table not found. Auto-initializing schema from db/schema.sql...');
      const schemaPath = path.join(__dirname, '../db/schema.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf8');

      // Clean comment indicators and split script into individual query statements
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('CREATE DATABASE') && !q.startsWith('USE'));

      for (const query of queries) {
        await connection.query(query);
      }
      console.log('[Database] Auto-initialization completed successfully.');
    }
  } catch (err) {
    console.error('[Database Error] Failed to connect or auto-initialize MySQL database:', err.message);
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
