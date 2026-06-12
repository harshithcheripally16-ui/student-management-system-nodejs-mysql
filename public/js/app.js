/**
 * Academix Student Portal Frontend Engine
 * Implements a lightweight client-side Router, View Renderers, State Management,
 * Form Validations, Modal overlays, and Toast Notifications.
 */

class AppController {
  constructor() {
    this.students = [];       // Cached list of all students (source of truth)
    this.filteredStudents = []; // Active list after search/filter constraints
    this.searchQuery = '';
    this.departmentFilter = '';
    this.sortField = 'created_at';
    this.sortOrder = 'desc';    // 'asc' or 'desc'
    
    // Pagination state
    this.currentPage = 1;
    this.itemsPerPage = 10;
    
    // Cached DOM elements
    this.contentArea = document.getElementById('content-area');
    this.pageTitle = document.getElementById('page-title');
    
    // Bind event handlers
    this.initSidebar();
    this.initModals();
  }

  /**
   * Initialize general UI listeners (Sidebar toggles and click highlights).
   */
  initSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
    }

    // Close sidebar on menu clicks (mobile experience)
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        if (sidebar && window.innerWidth <= 768) {
          sidebar.classList.remove('active');
        }
      });
    });
  }

  /**
   * Bind event listeners for global modals (Cancel & Close buttons).
   */
  initModals() {
    // Delete Confirmation cancel
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');
    btnDeleteCancel.addEventListener('click', () => {
      document.getElementById('delete-modal').classList.remove('active');
    });

    // Details close
    const btnDetailsClose = document.getElementById('btn-details-close');
    btnDetailsClose.addEventListener('click', () => {
      document.getElementById('details-modal').classList.remove('active');
    });

    // Close modals on clicking overlay background
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  /**
   * Renders a success or error notification on screen.
   * Senior Engineer Fix: Prevents duplicate notification spam for identical messages.
   * @param {string} message - Message text
   * @param {'success'|'error'} type - Theme format
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Scan active toasts to filter duplicate notifications
    const activeToasts = Array.from(container.querySelectorAll('.toast'));
    const isDuplicate = activeToasts.some(t => {
      const textSpan = t.querySelector('span');
      return textSpan && textSpan.textContent === message && t.classList.contains(type);
    });

    if (isDuplicate) {
      return; // Skip rendering to prevent duplication
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast from DOM after 4 seconds
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  /**
   * Updates sidebar links to highlight the currently active path.
   * @param {string} route - Active hash route
   */
  updateSidebarActiveItem(route) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    if (route.startsWith('#/dashboard') || route === '') {
      document.getElementById('nav-dashboard').classList.add('active');
    } else if (route.startsWith('#/students/add')) {
      document.getElementById('nav-add-student').classList.add('active');
    } else if (route.startsWith('#/students')) {
      document.getElementById('nav-students').classList.add('active');
    }
  }

  /**
   * Router Dispatcher
   * Maps current URL hash to respective view renderers.
   */
  async handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    this.updateSidebarActiveItem(hash);

    // Dynamic router matches
    if (hash === '#/dashboard') {
      this.pageTitle.textContent = 'Dashboard';
      await this.loadAndRenderDashboard();
    } else if (hash === '#/students') {
      this.pageTitle.textContent = 'Students Portal';
      await this.loadAndRenderStudentsList();
    } else if (hash === '#/students/add') {
      this.pageTitle.textContent = 'New Enrollment';
      this.renderAddStudentForm();
    } else if (hash.startsWith('#/students/edit/')) {
      this.pageTitle.textContent = 'Modify Student Profile';
      const parts = hash.split('/');
      const id = parseInt(parts[parts.length - 1], 10);
      await this.loadAndRenderEditStudentForm(id);
    } else {
      // Fallback
      window.location.hash = '#/dashboard';
    }
  }

  /**
   * Helper loader spinner.
   */
  showLoader() {
    this.contentArea.innerHTML = `
      <div class="view-loader">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Loading database records...</span>
      </div>
    `;
  }

  /**
   * Fetches latest database records to local cache state.
   */
  async refreshCache() {
    try {
      const response = await window.studentApi.getAll();
      this.students = response.data || [];
    } catch (error) {
      this.showToast(error.message, 'error');
      console.error(error);
      this.students = []; // fallback to empty on connection failures
    }
  }

  /* ==========================================================================
     View Renderers: Dashboard
     ========================================================================== */

  async loadAndRenderDashboard() {
    this.showLoader();
    await this.refreshCache();

    // 1. Calculate dashboard metrics
    const totalCount = this.students.length;
    const csCount = this.students.filter(s => 
      s.department.toLowerCase().includes('computer science') || 
      s.department.toLowerCase().includes('cs') ||
      s.department.toLowerCase().includes('information technology') ||
      s.department.toLowerCase().includes('it')
    ).length;
    const otherCount = totalCount - csCount;

    // 2. Fetch top 5 recently added students (Sorted by created_at desc)
    const recentStudents = [...this.students]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // 3. Render view HTML structure
    let recentRowsHtml = '';
    if (recentStudents.length === 0) {
      recentRowsHtml = `
        <div class="view-loader" style="height: 150px;">
          <i class="fa-solid fa-folder-open" style="font-size: 24px;"></i>
          <span>No students enrolled in the system yet.</span>
        </div>
      `;
    } else {
      recentRowsHtml = recentStudents.map(student => {
        // Initial Avatar name abbreviation
        const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const formattedDate = new Date(student.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        return `
          <div class="activity-item">
            <div class="activity-info">
              <div class="activity-avatar">${initials}</div>
              <div class="activity-text">
                <span class="activity-name">${student.name}</span>
                <span class="activity-dept">${student.department}</span>
              </div>
            </div>
            <div class="activity-meta">
              <div><span class="activity-year">Year ${student.year}</span></div>
              <span class="activity-time">${formattedDate}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    this.contentArea.innerHTML = `
      <div class="dashboard-stats-grid">
        <div class="glass-card stat-card interactive">
          <div class="stat-icon total">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div class="stat-details">
            <span class="stat-label">Total Enrollment</span>
            <span class="stat-value">${totalCount}</span>
          </div>
        </div>
        <div class="glass-card stat-card interactive">
          <div class="stat-icon cs">
            <i class="fa-solid fa-laptop-code"></i>
          </div>
          <div class="stat-details">
            <span class="stat-label">CS & IT Majors</span>
            <span class="stat-value">${csCount}</span>
          </div>
        </div>
        <div class="glass-card stat-card interactive">
          <div class="stat-icon other">
            <i class="fa-solid fa-gears"></i>
          </div>
          <div class="stat-details">
            <span class="stat-label">Other Majors</span>
            <span class="stat-value">${otherCount}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-content-layout">
        <!-- Recently Added Section -->
        <div class="glass-card">
          <div class="dashboard-section-header">
            <h2>Recently Enrolled Students</h2>
            <a href="#/students" class="btn btn-secondary btn-sm">View All</a>
          </div>
          <div class="recent-activities-list">
            ${recentRowsHtml}
          </div>
        </div>

        <!-- Quick Actions Panel -->
        <div class="glass-card">
          <div class="dashboard-section-header">
            <h2>Quick Actions</h2>
          </div>
          <div class="quick-actions-box">
            <a href="#/students/add" class="action-card">
              <div class="action-card-icon">
                <i class="fa-solid fa-user-plus"></i>
              </div>
              <div class="action-card-text">
                <span class="action-card-title">Enroll Student</span>
                <span class="action-card-desc">Add a new record to the DB</span>
              </div>
            </a>
            <a href="#/students" class="action-card">
              <div class="action-card-icon">
                <i class="fa-solid fa-table-list"></i>
              </div>
              <div class="action-card-text">
                <span class="action-card-title">Search Directory</span>
                <span class="action-card-desc">Search, sort, edit records</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     View Renderers: Students List & Operations
     ========================================================================== */

  async loadAndRenderStudentsList() {
    this.showLoader();
    await this.refreshCache();
    this.renderListUI();
  }

  /**
   * Applies local search filters, sorts fields, and splits pages.
   */
  processListState() {
    // 1. Apply Search and Filters
    this.filteredStudents = this.students.filter(student => {
      const matchQuery = 
        student.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        student.department.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchDept = !this.departmentFilter || student.department === this.departmentFilter;

      return matchQuery && matchDept;
    });

    // 2. Apply Sorting
    this.filteredStudents.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return this.sortOrder === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return this.sortOrder === 'asc'
          ? valA - valB
          : valB - valA;
      }
    });

    // Reset page if out of bounds
    const maxPage = Math.ceil(this.filteredStudents.length / this.itemsPerPage) || 1;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
  }

  /**
   * Renders the Students List layout wrapper.
   */
  renderListUI() {
    this.processListState();

    // Get unique departments for the dropdown filter
    const departments = [...new Set(this.students.map(s => s.department))].sort();
    const deptOptionsHtml = departments.map(d => 
      `<option value="${d}" ${this.departmentFilter === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    this.contentArea.innerHTML = `
      <div class="glass-card">
        <!-- List Header Controls -->
        <div class="list-controls">
          <div class="search-box-wrapper">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" class="search-input" id="student-search-input" placeholder="Search by name, email, major..." value="${this.searchQuery}">
          </div>
          
          <div class="filter-controls">
            <select class="select-dropdown" id="filter-dept-select">
              <option value="">All Departments</option>
              ${deptOptionsHtml}
            </select>
            <a href="#/students/add" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> Add Student
            </a>
          </div>
        </div>

        <!-- Dynamic Table Wrapper -->
        <div class="table-responsive" id="students-table-container">
          <!-- Table rows injected here -->
        </div>

        <!-- Pagination Footer -->
        <div class="table-pagination" id="students-pagination-container">
          <!-- Pagination injected here -->
        </div>
      </div>
    `;

    // Bind event listeners for input searches
    const searchInput = document.getElementById('student-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1; // reset page
      this.updateTableAndPagination();
    });

    const filterSelect = document.getElementById('filter-dept-select');
    filterSelect.addEventListener('change', (e) => {
      this.departmentFilter = e.target.value;
      this.currentPage = 1; // reset page
      this.updateTableAndPagination();
    });

    // Populate actual table rows
    this.updateTableAndPagination();
  }

  /**
   * Refreshes table body and pagination state.
   * Senior Engineer Design: Adds distinct Empty States for empty DB vs filtered results.
   */
  updateTableAndPagination() {
    this.processListState();
    
    const tableContainer = document.getElementById('students-table-container');
    const paginationContainer = document.getElementById('students-pagination-container');

    // Case A: Database is completely empty (Absolute Empty State)
    if (this.students.length === 0) {
      tableContainer.innerHTML = `
        <div class="view-loader empty-state" style="height: 250px; text-align: center;">
          <i class="fa-solid fa-users-slash" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;"></i>
          <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">No students found.</span>
          <span style="color: var(--text-secondary); font-size: 13px; display: block; margin-top: 4px;">Add your first student to get started.</span>
          <a href="#/students/add" class="btn btn-primary btn-sm" style="margin-top: 20px;">
            <i class="fa-solid fa-plus"></i> Enroll First Student
          </a>
        </div>
      `;
      paginationContainer.innerHTML = '';
      return;
    }

    // Case B: Search/Filter yields no matches (Search Empty State)
    if (this.filteredStudents.length === 0) {
      tableContainer.innerHTML = `
        <div class="view-loader" style="height: 200px; text-align: center;">
          <i class="fa-solid fa-magnifying-glass-minus" style="font-size: 36px; color: var(--text-muted); margin-bottom: 12px;"></i>
          <span style="font-size: 14px; font-weight: 500; display: block;">No students match the criteria.</span>
        </div>
      `;
      paginationContainer.innerHTML = '';
      return;
    }

    // Paginate items slice
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const paginatedItems = this.filteredStudents.slice(startIndex, startIndex + this.itemsPerPage);

    // Helper sort icon generator
    const getSortIcon = (field) => {
      if (this.sortField !== field) return '<i class="fa-solid fa-sort"></i>';
      return this.sortOrder === 'asc' ? '<i class="fa-solid fa-sort-up"></i>' : '<i class="fa-solid fa-sort-down"></i>';
    };

    // Table HTML build
    tableContainer.innerHTML = `
      <table class="custom-table">
        <thead>
          <tr>
            <th data-sort="id">ID ${getSortIcon('id')}</th>
            <th data-sort="name">Name ${getSortIcon('name')}</th>
            <th data-sort="email">Email ${getSortIcon('email')}</th>
            <th data-sort="department">Department ${getSortIcon('department')}</th>
            <th data-sort="year">Year ${getSortIcon('year')}</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedItems.map(student => `
            <tr>
              <td>#${student.id}</td>
              <td style="font-weight: 600;">${student.name}</td>
              <td style="color: var(--text-secondary);">${student.email}</td>
              <td>${student.department}</td>
              <td><span class="activity-year">Year ${student.year}</span></td>
              <td style="text-align: right;">
                <div class="row-actions" style="justify-content: flex-end;">
                  <button class="btn-icon view" data-id="${student.id}" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                  <button class="btn-icon edit" data-id="${student.id}" title="Edit Student">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="btn-icon delete" data-id="${student.id}" title="Delete Record">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Render pagination controls
    const totalStudents = this.filteredStudents.length;
    const totalPages = Math.ceil(totalStudents / this.itemsPerPage);
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalStudents);

    // Renders active page numbers
    let pagesHtml = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pagesHtml += `
        <button class="page-num ${this.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
      `;
    }

    paginationContainer.innerHTML = `
      <div class="pagination-info">
        Showing <strong>${startIndex + 1}</strong> to <strong>${endIndex}</strong> of <strong>${totalStudents}</strong> entries
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="btn-page-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-angle-left"></i> Previous
        </button>
        <div class="pagination-pages">
          ${pagesHtml}
        </div>
        <button class="pagination-btn" id="btn-page-next" ${this.currentPage === totalPages ? 'disabled' : ''}>
          Next <i class="fa-solid fa-angle-right"></i>
        </button>
      </div>
    `;

    this.bindTableEventListeners();
  }

  /**
   * Bind event handlers inside the dynamically generated table DOM layout.
   */
  bindTableEventListeners() {
    // 1. Sorting Headers
    const headers = this.contentArea.querySelectorAll('.custom-table th[data-sort]');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.getAttribute('data-sort');
        if (this.sortField === field) {
          this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortOrder = 'asc';
        }
        this.updateTableAndPagination();
      });
    });

    // 2. Pagination Clicks
    const prevBtn = document.getElementById('btn-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentPage--;
        this.updateTableAndPagination();
      });
    }

    const nextBtn = document.getElementById('btn-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentPage++;
        this.updateTableAndPagination();
      });
    }

    const pageNums = this.contentArea.querySelectorAll('.page-num');
    pageNums.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        this.updateTableAndPagination();
      });
    });

    // 3. Row Actions (View Details, Edit, Delete)
    const viewButtons = this.contentArea.querySelectorAll('.btn-icon.view');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const student = this.students.find(s => s.id === id);
        if (student) this.showStudentDetails(student);
      });
    });

    const editButtons = this.contentArea.querySelectorAll('.btn-icon.edit');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.location.hash = `#/students/edit/${id}`;
      });
    });

    const deleteButtons = this.contentArea.querySelectorAll('.btn-icon.delete');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const student = this.students.find(s => s.id === id);
        if (student) this.showDeleteConfirm(student);
      });
    });
  }

  /**
   * Renders the View Student details profile overlay modal.
   * @param {Object} student - Student record object
   */
  showStudentDetails(student) {
    const modalBody = document.getElementById('details-modal-body');
    const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const formattedDate = new Date(student.created_at).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });

    modalBody.innerHTML = `
      <div class="details-modal-grid">
        <div class="details-avatar-circle">${initials}</div>
        
        <div class="details-info-table">
          <div class="details-row">
            <span class="details-label">Student ID</span>
            <span class="details-value">#${student.id}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Full Name</span>
            <span class="details-value">${student.name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Email Address</span>
            <span class="details-value">${student.email}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Department / Major</span>
            <span class="details-value">${student.department}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Academic Year</span>
            <span class="details-value">Year ${student.year}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Enrolled At</span>
            <span class="details-value">${formattedDate}</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('details-modal').classList.add('active');
  }

  /**
   * Renders the Deletion Confirmation alert overlay.
   * @param {Object} student - Student record object
   */
  showDeleteConfirm(student) {
    const previewBox = document.getElementById('delete-preview-box');
    previewBox.innerHTML = `
      <div><strong>ID:</strong> #${student.id}</div>
      <div><strong>Name:</strong> ${student.name}</div>
      <div><strong>Email:</strong> ${student.email}</div>
      <div><strong>Major:</strong> ${student.department}</div>
    `;

    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');

    // Override the confirm action
    const btnConfirm = document.getElementById('btn-delete-confirm');
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    newBtnConfirm.addEventListener('click', async () => {
      try {
        newBtnConfirm.disabled = true;
        newBtnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        
        await window.studentApi.delete(student.id);
        
        modal.classList.remove('active');
        this.showToast('Student record has been successfully deleted.');
        
        await this.loadAndRenderStudentsList();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        newBtnConfirm.disabled = false;
        newBtnConfirm.textContent = 'Delete Record';
      }
    });
  }

  /* ==========================================================================
     View Renderers: Add / Edit Student Forms
     ========================================================================== */

  renderAddStudentForm() {
    this.contentArea.innerHTML = `
      <div class="form-layout-wrapper glass-card">
        <div class="form-header">
          <h2>Enroll New Student</h2>
          <p>Register a student record directly into the database system</p>
        </div>
        
        <form id="student-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="form-name">Full Name</label>
            <input type="text" class="form-control" id="form-name" placeholder="e.g. Johnathan Doe" required>
            <span class="invalid-feedback">Please enter a valid student name.</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="form-email">Email Address</label>
            <input type="email" class="form-control" id="form-email" placeholder="e.g. john.doe@school.edu" required>
            <span class="invalid-feedback" id="email-feedback">Please enter a valid school email address.</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="form-dept">Department / Major</label>
            <input type="text" class="form-control" id="form-dept" placeholder="e.g. Computer Science" required>
            <span class="invalid-feedback">Please specify the academic major.</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="form-year">Academic Year</label>
            <select class="form-control" id="form-year" required>
              <option value="" disabled selected>Select active year</option>
              <option value="1">Year 1 (Freshman)</option>
              <option value="2">Year 2 (Sophomore)</option>
              <option value="3">Year 3 (Junior)</option>
              <option value="4">Year 4 (Senior)</option>
              <option value="5">Year 5</option>
              <option value="6">Year 6</option>
            </select>
            <span class="invalid-feedback">Please select an academic year (1-6).</span>
          </div>

          <div class="form-actions">
            <a href="#/students" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary" id="btn-form-submit">
              <i class="fa-solid fa-floppy-disk"></i> Save Student
            </button>
          </div>
        </form>
      </div>
    `;

    const form = document.getElementById('student-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.validateForm(form)) {
        await this.submitStudentData(null);
      }
    });
  }

  async loadAndRenderEditStudentForm(id) {
    this.showLoader();
    try {
      const response = await window.studentApi.getById(id);
      const student = response.data;

      if (!student) {
        this.contentArea.innerHTML = `
          <div class="glass-card form-layout-wrapper" style="text-align: center; padding: 40px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--warning-color); margin-bottom: 16px;"></i>
            <h2>Student Not Found</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">The student record you are looking to edit does not exist or has been deleted.</p>
            <a href="#/students" class="btn btn-primary">Back to Directory</a>
          </div>
        `;
        return;
      }

      this.contentArea.innerHTML = `
        <div class="form-layout-wrapper glass-card">
          <div class="form-header">
            <h2>Modify Student Details</h2>
            <p>Update database entries for student ID #${student.id}</p>
          </div>
          
          <form id="student-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="form-name">Full Name</label>
              <input type="text" class="form-control" id="form-name" value="${student.name}" required>
              <span class="invalid-feedback">Please enter a valid student name.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="form-email">Email Address</label>
              <input type="email" class="form-control" id="form-email" value="${student.email}" required>
              <span class="invalid-feedback" id="email-feedback">Please enter a valid school email address.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="form-dept">Department / Major</label>
              <input type="text" class="form-control" id="form-dept" value="${student.department}" required>
              <span class="invalid-feedback">Please specify the academic major.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="form-year">Academic Year</label>
              <select class="form-control" id="form-year" required>
                <option value="" disabled>Select active year</option>
                <option value="1" ${student.year === 1 ? 'selected' : ''}>Year 1 (Freshman)</option>
                <option value="2" ${student.year === 2 ? 'selected' : ''}>Year 2 (Sophomore)</option>
                <option value="3" ${student.year === 3 ? 'selected' : ''}>Year 3 (Junior)</option>
                <option value="4" ${student.year === 4 ? 'selected' : ''}>Year 4 (Senior)</option>
                <option value="5" ${student.year === 5 ? 'selected' : ''}>Year 5</option>
                <option value="6" ${student.year === 6 ? 'selected' : ''}>Year 6</option>
              </select>
              <span class="invalid-feedback">Please select an academic year (1-6).</span>
            </div>

            <div class="form-actions">
              <a href="#/students" class="btn btn-secondary">Cancel</a>
              <button type="submit" class="btn btn-primary" id="btn-form-submit">
                <i class="fa-solid fa-floppy-disk"></i> Apply Changes
              </button>
            </div>
          </form>
        </div>
      `;

      const form = document.getElementById('student-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.validateForm(form)) {
          await this.submitStudentData(student.id);
        }
      });
    } catch (err) {
      this.showToast(err.message, 'error');
      console.error(err);
    }
  }

  /**
   * Client-side validation checking values using regex patterns before contacting server.
   * @param {HTMLFormElement} form - Form element target
   * @returns {boolean} True if form validates successfully, false otherwise
   */
  validateForm(form) {
    let isValid = true;

    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const deptInput = document.getElementById('form-dept');
    const yearSelect = document.getElementById('form-year');

    // Reset validation statuses
    const controls = [nameInput, emailInput, deptInput, yearSelect];
    controls.forEach(control => control.classList.remove('invalid'));

    // Validate Name
    if (!nameInput.value.trim()) {
      nameInput.classList.add('invalid');
      isValid = false;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
      emailInput.classList.add('invalid');
      document.getElementById('email-feedback').textContent = 'Please enter a valid school email address.';
      isValid = false;
    }

    // Validate Department
    if (!deptInput.value.trim()) {
      deptInput.classList.add('invalid');
      isValid = false;
    }

    // Validate Year
    if (!yearSelect.value) {
      yearSelect.classList.add('invalid');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Sends student data back to REST API. Parses schema uniqueness constraints returned by backend.
   * @param {number|null} id - Student ID if updating, null if enrolling new student
   */
  async submitStudentData(id) {
    const btnSubmit = document.getElementById('btn-form-submit');
    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const deptInput = document.getElementById('form-dept');
    const yearSelect = document.getElementById('form-year');

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      department: deptInput.value.trim(),
      year: parseInt(yearSelect.value, 10)
    };

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      if (id) {
        await window.studentApi.update(id, payload);
        this.showToast('Student record updated successfully.');
      } else {
        await window.studentApi.create(payload);
        this.showToast('Student enrolled successfully.');
      }

      // Redirect back to main portal directory
      window.location.hash = '#/students';
    } catch (err) {
      // Highlight exact field validation failures (e.g. duplicate email database constraints)
      if (err.errors && err.errors.length > 0) {
        err.errors.forEach(valErr => {
          if (valErr.field === 'email') {
            emailInput.classList.add('invalid');
            document.getElementById('email-feedback').textContent = valErr.message;
          } else if (valErr.field === 'name') {
            nameInput.classList.add('invalid');
          } else if (valErr.field === 'department') {
            deptInput.classList.add('invalid');
          } else if (valErr.field === 'year') {
            yearSelect.classList.add('invalid');
          }
        });
        this.showToast('Please correct validation errors.', 'error');
      } else {
        this.showToast(err.message, 'error');
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${id ? 'Apply Changes' : 'Save Student'}`;
    }
  }
}

// Instantiate and start routing lifecycle once DOM content loads
document.addEventListener('DOMContentLoaded', () => {
  const controller = new AppController();

  // Bind router triggers
  window.addEventListener('hashchange', () => controller.handleRoute());
  
  // Trigger initial route load on load
  controller.handleRoute();
});
