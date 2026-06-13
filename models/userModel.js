/**
 * User Model
 * Handles database operations for user accounts, credentials, and verification tokens.
 * Uses parameterized queries to secure data and prevent SQL injection.
 */

const { pool } = require('../config/db');

class UserModel {
  /**
   * Find user by unique ID.
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User record or null if not found
   */
  async findById(id) {
    const query = 'SELECT id, name, email, password_hash, is_verified, verification_token, reset_token, created_at FROM users WHERE id = ?';
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by email.
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} User record or null if not found
   */
  async findByEmail(email) {
    const query = 'SELECT id, name, email, password_hash, is_verified, verification_token, reset_token, created_at FROM users WHERE email = ?';
    const [rows] = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by verification token.
   * @param {string} token - Verification token
   * @returns {Promise<Object|null>} User record or null if not found
   */
  async findByVerificationToken(token) {
    const query = 'SELECT id, name, email, password_hash, is_verified, verification_token, reset_token, created_at FROM users WHERE verification_token = ?';
    const [rows] = await pool.query(query, [token]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by password reset token.
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} User record or null if not found
   */
  async findByResetToken(token) {
    const query = 'SELECT id, name, email, password_hash, is_verified, verification_token, reset_token, created_at FROM users WHERE reset_token = ?';
    const [rows] = await pool.query(query, [token]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create a new user record.
   * @param {Object} userData - Fields { name, email, password_hash, verification_token }
   * @returns {Promise<Object>} The fully created user record
   */
  async create(userData) {
    const { name, email, password_hash, verification_token } = userData;
    const query = 'INSERT INTO users (name, email, password_hash, is_verified, verification_token) VALUES (?, ?, ?, 0, ?)';
    const [result] = await pool.query(query, [name, email, password_hash, verification_token]);
    return await this.findById(result.insertId);
  }

  /**
   * Update a user's details or tokens dynamically.
   * @param {number} id - User ID
   * @param {Object} updateData - Fields to update { name, is_verified, verification_token, reset_token, password_hash }
   * @returns {Promise<Object|null>} Updated user record or null if update failed
   */
  async update(id, updateData) {
    const fields = [];
    const values = [];

    // Dynamically build the update query based on fields supplied
    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return await this.findById(id);

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) return null;

    return await this.findById(id);
  }
}

module.exports = new UserModel();
