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
      let errMsg = (payload.error && payload.error.message) || payload.message;
      if (!errMsg) {
        if (payload.errors && payload.errors.length > 0) {
          errMsg = 'Validation failed';
        } else {
          errMsg = 'Server operation failed';
        }
      }
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
      // Automatically load JWT token from storage and inject Bearer header
      const token = localStorage.getItem('campusos_token') || sessionStorage.getItem('campusos_token');
      if (token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${this.baseUrl}${url}`, options);
      return await this._handleResponse(res);
    } catch (err) {
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

  /* ==========================================================================
     Authentication API Requests
     ========================================================================== */

  /**
   * Register a new user account
   */
  async register(userData) {
    return this._request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
  }

  /**
   * Authenticate credentials and establish session
   */
  async login(credentials) {
    return this._request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
  }

  /**
   * Verify email address using token
   */
  async verifyEmail(token) {
    return this._request('/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
  }

  /**
   * Resend the verification link
   */
  async resendVerification(email) {
    return this._request('/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
  }

  /**
   * Trigger password recovery link
   */
  async forgotPassword(email) {
    return this._request('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
  }

  /**
   * Set new password using reset token
   */
  async resetPassword(token, password) {
    return this._request('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, password })
    });
  }

  /**
   * Fetch current authenticated session profile details
   */
  async getMe() {
    return this._request('/auth/me');
  }
}

// Expose client instance globally on window
window.studentApi = new StudentAPI();

