/**
 * Student Model
 * Handles database communication for student records.
 * Uses parameterized queries to prevent SQL Injection attacks.
 */

const { pool } = require('../config/db');

class StudentModel {
  /**
   * Fetch all students from the database.
   * Sorts by creation date descending.
   * @returns {Promise<Array>} List of students
   */
  async findAll() {
    const query = 'SELECT id, name, email, department, year, created_at FROM students ORDER BY created_at DESC';
    const [rows] = await pool.query(query);
    return rows;
  }

  /**
   * Find a student by their unique ID.
   * @param {number} id - Student ID
   * @returns {Promise<Object|null>} Student record or null if not found
   */
  async findById(id) {
    const query = 'SELECT id, name, email, department, year, created_at FROM students WHERE id = ?';
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a student by their unique email.
   * Useful for duplicate email checks during validation.
   * @param {string} email - Student email address
   * @returns {Promise<Object|null>} Student record or null if not found
   */
  async findByEmail(email) {
    const query = 'SELECT id, name, email, department, year, created_at FROM students WHERE email = ?';
    const [rows] = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Insert a new student record.
   * Performs an immediate SELECT to return the fully created database object (with timestamps).
   * @param {Object} studentData - Fields { name, email, department, year }
   * @returns {Promise<Object>} The fully created student record
   */
  async create(studentData) {
    const { name, email, department, year } = studentData;
    const query = 'INSERT INTO students (name, email, department, year) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [name, email, department, year]);
    
    // Retrieve and return the exact inserted record (ensures auto-generated timestamp is included)
    return await this.findById(result.insertId);
  }

  /**
   * Update an existing student record by ID.
   * @param {number} id - Student ID
   * @param {Object} studentData - Fields to update { name, email, department, year }
   * @returns {Promise<Object|null>} The updated student record, or null if student doesn't exist
   */
  async update(id, studentData) {
    const { name, email, department, year } = studentData;
    const query = 'UPDATE students SET name = ?, email = ?, department = ?, year = ? WHERE id = ?';
    const [result] = await pool.query(query, [name, email, department, year, id]);
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    // Retrieve and return the updated record
    return await this.findById(id);
  }

  /**
   * Delete a student record by ID.
   * @param {number} id - Student ID
   * @returns {Promise<boolean>} True if record was deleted, false if no record was found/deleted
   */
  async delete(id) {
    const query = 'DELETE FROM students WHERE id = ?';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new StudentModel();
