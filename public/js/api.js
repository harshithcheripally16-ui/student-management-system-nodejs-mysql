/**
 * Academix Student Portal API Consumer
 * Wraps native fetch calls inside a clean, promise-based client.
 * Standardizes error interceptions and validation message Extractions.
 */

class StudentAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Evaluates HTTP response. Converts successes to JSON and formats failures.
   * @param {Response} response - Fetch Response object
   * @private
   */
  async _handleResponse(response) {
    let payload;
    try {
      payload = await response.json();
    } catch (e) {
      throw new Error(`Server returned invalid response structure (${response.status})`);
    }

    if (!response.ok) {
      // Create a descriptive error object
      const error = new Error(payload.message || 'Server operation failed.');
      error.status = response.status;
      error.errors = payload.errors || null; // express-validator structures
      throw error;
    }

    return payload;
  }

  /**
   * Fetch all student records.
   * @returns {Promise<Object>} API response with list and count
   */
  async getAll() {
    const res = await fetch(`${this.baseUrl}/students`);
    return this._handleResponse(res);
  }

  /**
   * Fetch a single student record by ID.
   * @param {number} id - Student ID
   * @returns {Promise<Object>} API response with student record
   */
  async getById(id) {
    const res = await fetch(`${this.baseUrl}/students/${id}`);
    return this._handleResponse(res);
  }

  /**
   * Create a new student record.
   * @param {Object} studentData - { name, email, department, year }
   * @returns {Promise<Object>} API response with created record
   */
  async create(studentData) {
    const res = await fetch(`${this.baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });
    return this._handleResponse(res);
  }

  /**
   * Update an existing student record.
   * @param {number} id - Student ID
   * @param {Object} studentData - { name, email, department, year }
   * @returns {Promise<Object>} API response with updated record
   */
  async update(id, studentData) {
    const res = await fetch(`${this.baseUrl}/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });
    return this._handleResponse(res);
  }

  /**
   * Delete a student record by ID.
   * @param {number} id - Student ID
   * @returns {Promise<Object>} API response with status message
   */
  async delete(id) {
    const res = await fetch(`${this.baseUrl}/students/${id}`, {
      method: 'DELETE'
    });
    return this._handleResponse(res);
  }
}

// Expose client instance globally on window
window.studentApi = new StudentAPI();
