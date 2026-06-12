/**
 * Academix Student Portal API Consumer
 * Wraps native fetch calls inside a clean, promise-based client.
 * Standardizes error interceptions and validation message extractions.
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
      // Extract custom error messages returned by Express errorMiddleware
      const errMsg = (payload.error && payload.error.message) || payload.message || 'Server operation failed.';
      const error = new Error(errMsg);
      error.status = response.status;
      error.errors = payload.errors || null; // validation checks
      throw error;
    }

    return payload;
  }

  /**
   * Universal request helper that wraps fetch and maps network down exceptions
   * @param {string} url - Target URL path
   * @param {Object} options - Fetch options
   * @private
   */
  async _request(url, options = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${url}`, options);
      return await this._handleResponse(res);
    } catch (err) {
      // If error is a fetch failure (e.g. server is down/offline)
      if (err.message === 'Failed to fetch' || (err instanceof TypeError && err.message.toLowerCase().includes('fetch'))) {
        throw new Error('Server unavailable. Please check if the backend service is running.');
      }
      throw err;
    }
  }

  /**
   * Fetch all student records.
   * @returns {Promise<Object>} API response with list and count
   */
  async getAll() {
    return this._request('/students');
  }

  /**
   * Fetch a single student record by ID.
   * @param {number} id - Student ID
   * @returns {Promise<Object>} API response with student record
   */
  async getById(id) {
    return this._request(`/students/${id}`);
  }

  /**
   * Create a new student record.
   * @param {Object} studentData - { name, email, department, year }
   * @returns {Promise<Object>} API response with created record
   */
  async create(studentData) {
    return this._request('/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });
  }

  /**
   * Update an existing student record.
   * @param {number} id - Student ID
   * @param {Object} studentData - { name, email, department, year }
   * @returns {Promise<Object>} API response with updated record
   */
  async update(id, studentData) {
    return this._request(`/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });
  }

  /**
   * Delete a student record by ID.
   * @param {number} id - Student ID
   * @returns {Promise<Object>} API response with status message
   */
  async delete(id) {
    return this._request(`/students/${id}`, {
      method: 'DELETE'
    });
  }
}

// Expose client instance globally on window
window.studentApi = new StudentAPI();
