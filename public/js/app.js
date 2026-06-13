/**
 * Academix Student Portal Frontend Engine
 * Implements client-side Hash Router, SaaS Landing layout, Dashboard Analytics,
 * Profile Card Grids, Slide-Out details Drawer, CSS transitions, and Chart.js.
 */

class AppController {
  constructor() {
    this.students = [];       // Cached list of all students (source of truth)
    this.filteredStudents = []; // Active list after search/filter constraints
    this.searchQuery = '';
    this.departmentFilter = '';
    this.sortField = 'created_at';
    this.sortOrder = 'desc';
    
    // Pagination state
    this.currentPage = 1;
    this.itemsPerPage = 8; // 8 cards per page fits grid layout perfectly
    
    // Cached DOM targets
    this.viewTarget = document.getElementById('view-target');
    
    // Active chart instances
    this.growthChartInstance = null;
    this.deptChartInstance = null;
    
    // Toast and Route locks
    this.activeToasts = new Set();
    this.isLoadingRoute = false;
    
    this.initDrawer();
    this.initModals();
  }

  /**
   * Bind event listeners for global modals (Cancel & Close buttons).
   */
  initModals() {
    // Delete Confirmation cancel
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');
    if (btnDeleteCancel) {
      btnDeleteCancel.addEventListener('click', () => {
        document.getElementById('delete-modal').classList.remove('active');
      });
    }

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
   * Bind event handlers for Notion-Style Details Drawer.
   */
  initDrawer() {
    const btnDrawerClose = document.getElementById('btn-drawer-close');
    const drawerOverlay = document.getElementById('drawer-overlay');
    
    if (btnDrawerClose) {
      btnDrawerClose.addEventListener('click', () => this.closeDrawer());
    }
    
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', () => this.closeDrawer());
    }
  }

  /**
   * Opens details drawer using custom sliding drawer animation states.
   */
  openDrawer() {
    const drawer = document.getElementById('details-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    overlay.classList.add('active');
    drawer.classList.add('active');
    
  }

  /**
   * Closes details drawer.
   */
  closeDrawer() {
    document.getElementById('details-drawer').classList.remove('active');
    document.getElementById('drawer-overlay').classList.remove('active');
  }

  /**
   * Renders success or error notifications.
   * Prevents duplicates by scanning existing toast text content.
   * @param {string} message - Message text
   * @param {'success'|'error'} type - Theme format
   */
  showToast(message, type = 'success') {
    if (this.activeToasts.has(message)) return;
    this.activeToasts.add(message);

    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
        this.activeToasts.delete(message);
      });
    }, 3500);
  }

  /**
   * Refreshes cache connection database.
   */
  async refreshCache() {
    const response = await window.studentApi.getAll();
    this.students = response.data || [];
  }

  /**
   * Router Dispatcher
   * Renders Landing experience OR wraps inside Portal layouts based on URL hash routing.
   */
  async handleRoute() {
    if (this.isLoadingRoute) return;
    this.isLoadingRoute = true;
    try {
      this.closeDrawer();
      const hash = window.location.hash || '#/landing';

      // Automatically close mobile sidebar on navigation change
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }

      // 1. SaaS Landing Page layout
      if (hash === '#/landing' || hash === '') {
        await this.renderLandingPage();
        return;
      }

      // 2. Portal Workspace layouts (Dashboard, List, Form enrollments)
      await this.renderPortalWrapper(hash);
    } finally {
      this.isLoadingRoute = false;
    }
  }

  /* ==========================================================================
     SaaS Landing Page Renderer
     ========================================================================== */

  async renderLandingPage() {
    this.viewTarget.innerHTML = `
      <div class="landing-wrapper">
        <!-- Minimal floating Navbar -->
        <header class="landing-nav">
          <div class="brand">
            <i class="fa-solid fa-graduation-cap"></i>
            <span class="brand-text">Academix</span>
          </div>
          <a href="#/dashboard" class="btn btn-primary btn-sm">Launch Portal</a>
        </header>

        <!-- Hero section -->
        <section class="landing-hero">
          <div class="hero-tag">
            <i class="fa-solid fa-bolt"></i> Version 1.2.0 Released
          </div>
          <h1 class="hero-title">
            The Next-Generation<br><span>Student Registry Portal.</span>
          </h1>
          <p class="hero-subtitle">
            A secure, portfolio-grade management platform structured with clean MVC architecture, parameterized MySQL interfaces, robust validator guards, and elegant glassmorphic dashboard analytics.
          </p>
          <div class="hero-ctas">
            <a href="#/dashboard" class="btn btn-glow">Launch Workspace</a>
            <a href="#/students" class="btn btn-secondary">Explore Directory</a>
          </div>
        </section>

        <!-- Live metrics counter grid -->
        <section class="landing-stats" id="landing-stats-container">
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-uptime">99.9%</div>
            <div class="landing-stat-label">System Uptime</div>
          </div>
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-latency">&lt; 1.2s</div>
            <div class="landing-stat-label">Database Response</div>
          </div>
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-pooling">Active</div>
            <div class="landing-stat-label">Connection Pooling</div>
          </div>
        </section>

        <!-- Features grid -->
        <section class="landing-features">
          <div class="section-label">Capabilities</div>
          <h2 class="section-title">Designed for modern administration.</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-shield-halved"></i></div>
              <h3 class="feature-card-title">Prepared Statement SQL Bindings</h3>
              <p class="feature-card-desc">Complete mitigation against SQL Injection vectors using parameter-binding query protocols.</p>
            </div>
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-arrows-rotate"></i></div>
              <h3 class="feature-card-title">Graceful Database Lifecycles</h3>
              <p class="feature-card-desc">Active process shutdown handlers close database connection pools safely on SIGINT/SIGTERM signals.</p>
            </div>
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-diagram-project"></i></div>
              <h3 class="feature-card-title">Structured MVC Code Pattern</h3>
              <p class="feature-card-desc">Isolates route schemes, request validator schemas, database models, and controller routers cleanly.</p>
            </div>
          </div>
        </section>
      </div>
    `;

  }

  /* ==========================================================================
     Portal Workspace Wrapper Setup
     ========================================================================== */

  async renderPortalWrapper(activeHash) {
    // Check if portal shell is already loaded to avoid redrawing sidebar/header structure
    let sidebar = document.getElementById('sidebar');
    if (!sidebar) {
      this.viewTarget.innerHTML = `
        <div class="portal-wrapper">
          <!-- Translucent left docked floating sidebar -->
          <aside class="portal-sidebar" id="sidebar">
            <div class="portal-sidebar-brand">
              <i class="fa-solid fa-graduation-cap" style="font-size: 20px; color: var(--primary-color);"></i>
              <span>Academix</span>
            </div>
            
            <nav class="portal-sidebar-menu">
              <a href="#/dashboard" class="portal-menu-item" id="nav-dashboard">
                <i class="fa-solid fa-chart-pie"></i>
                <span>Dashboard</span>
              </a>
              <a href="#/students" class="portal-menu-item" id="nav-students">
                <i class="fa-solid fa-users"></i>
                <span>Students</span>
              </a>
              <a href="#/students/add" class="portal-menu-item" id="nav-add-student">
                <i class="fa-solid fa-user-plus"></i>
                <span>Enroll Student</span>
              </a>
            </nav>
            
            <div class="portal-sidebar-footer">
              <div class="status">
                <span class="status-indicator"></span>
                <span>Active Pool</span>
              </div>
              <div class="version">v1.2.0</div>
            </div>
          </aside>

          <!-- Main portal area -->
          <main class="portal-main">
            <header class="portal-header">
              <button class="portal-sidebar-toggle" id="sidebar-toggle">
                <i class="fa-solid fa-bars"></i>
              </button>
              <div class="portal-header-title">
                <h1 id="portal-title">Dashboard</h1>
              </div>
              <div class="portal-header-user">
                <div class="portal-user-avatar">AD</div>
                <div class="portal-user-details">
                  <span class="portal-user-name">Delivery Admin</span>
                  <span class="portal-user-role">System Administrator</span>
                </div>
              </div>
            </header>

            <div class="portal-content" id="portal-content-area">
              <!-- Sub-views are dynamically injected here -->
            </div>
          </main>
        </div>
      `;

      // Re-bind sidebar togglers
      const sidebarToggle = document.getElementById('sidebar-toggle');
      sidebar = document.getElementById('sidebar');
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });

    }

    // Dynamically inject target view
    const portalContent = document.getElementById('portal-content-area');
    const portalTitle = document.getElementById('portal-title');
    this.updateSidebarActiveItem(activeHash);

    // Destroy active charts to prevent memory leak
    if (this.growthChartInstance) this.growthChartInstance.destroy();
    if (this.deptChartInstance) this.deptChartInstance.destroy();

    // Loader
    portalContent.innerHTML = `
      <div class="view-loader">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Synchronizing data...</span>
      </div>
    `;

    if (activeHash === '#/dashboard') {
      portalTitle.textContent = 'Dashboard Analytics';
      await this.loadAndRenderDashboard(portalContent);
    } else if (activeHash === '#/students') {
      portalTitle.textContent = 'Student Directory';
      await this.loadAndRenderStudentsGrid(portalContent);
    } else if (activeHash === '#/students/add') {
      portalTitle.textContent = 'Student Enrollment';
      this.renderAddStudentForm(portalContent);
    } else if (activeHash.startsWith('#/students/edit/')) {
      portalTitle.textContent = 'Modify Profile';
      const parts = activeHash.split('/');
      const id = parseInt(parts[parts.length - 1], 10);
      await this.loadAndRenderEditStudentForm(portalContent, id);
    }
  }

  /**
   * Highlights active menu items inside sidebar container.
   * @param {string} hash - Route string
   */
  updateSidebarActiveItem(hash) {
    const menuItems = document.querySelectorAll('.portal-menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const dashboardItem = document.getElementById('nav-dashboard');
    const studentsItem = document.getElementById('nav-students');
    const addItem = document.getElementById('nav-add-student');

    if (dashboardItem && studentsItem && addItem) {
      if (hash === '#/dashboard') {
        dashboardItem.classList.add('active');
      } else if (hash === '#/students') {
        studentsItem.classList.add('active');
      } else if (hash === '#/students/add') {
        addItem.classList.add('active');
      }
    }
  }

  /* ==========================================================================
     Portal View: Dashboard Analytics Rendering
     ========================================================================== */

  async loadAndRenderDashboard(target) {
    try {
      await this.refreshCache();

      // Stats calculations
      const totalCount = this.students.length;
      const csCount = this.students.filter(s => 
        s.department.toLowerCase().includes('computer science') || 
        s.department.toLowerCase().includes('cs') ||
        s.department.toLowerCase().includes('information technology') ||
        s.department.toLowerCase().includes('it')
      ).length;
      const otherCount = totalCount - csCount;

      target.innerHTML = `
        <!-- Row 1: KPI Grid -->
        <div class="metrics-grid">
          <div class="glassmorphic-card kpi-card">
            <div class="kpi-header">
              <span>TOTAL REGISTRATIONS</span>
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <span class="kpi-value">${totalCount}</span>
            <div class="kpi-footer">Active student database rows</div>
          </div>
          <div class="glassmorphic-card kpi-card">
            <div class="kpi-header">
              <span>CS & IT SPECIALISTS</span>
              <i class="fa-solid fa-laptop-code"></i>
            </div>
            <span class="kpi-value">${csCount}</span>
            <div class="kpi-footer"><span>${totalCount > 0 ? Math.round((csCount/totalCount)*100) : 0}%</span> of total database</div>
          </div>
          <div class="glassmorphic-card kpi-card">
            <div class="kpi-header">
              <span>OTHER MAJORS</span>
              <i class="fa-solid fa-gears"></i>
            </div>
            <span class="kpi-value">${otherCount}</span>
            <div class="kpi-footer">Engineering, Science, Arts</div>
          </div>
        </div>

        <!-- Row 2: Charts Grid -->
        <div class="dashboard-visuals-grid">
          <div class="glassmorphic-card">
            <div class="chart-card-header">
              <h2>Enrollment Growth Trend</h2>
            </div>
            <div class="chart-container" style="height: 250px;">
              <canvas id="growthLineChart"></canvas>
            </div>
          </div>
          
          <div class="glassmorphic-card">
            <div class="chart-card-header">
              <h2>Department Allocation</h2>
            </div>
            <div class="chart-container" style="height: 250px; display: flex; align-items: center; justify-content: center;">
              <canvas id="deptDoughnutChart" style="max-height: 220px; max-width: 220px;"></canvas>
            </div>
          </div>
        </div>
      `;

      // Initialize charts
      this.initDashboardCharts();
    } catch (error) {
      this.showToast(error.message, 'error');
      console.error(error);
      target.innerHTML = `
        <div class="empty-state-wrapper">
          <div class="empty-state-screen glassmorphic-card">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: var(--danger-color); margin-bottom: 16px;"></i>
            <h2>Failed to load Dashboard</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">${error.message}</p>
            <button class="btn btn-primary btn-sm" id="btn-retry-dashboard">Retry Connection</button>
          </div>
        </div>
      `;
      document.getElementById('btn-retry-dashboard').addEventListener('click', () => this.loadAndRenderDashboard(target));
    }
  }

  /**
   * Initializes Line and Doughnut metrics using Chart.js.
   */
  initDashboardCharts() {
    const lineCtx = document.getElementById('growthLineChart');
    const doughnutCtx = document.getElementById('deptDoughnutChart');

    if (!lineCtx || !doughnutCtx) return;

    // Graceful fallback if Chart.js fails to load
    if (typeof Chart === 'undefined') {
      const lineContainer = lineCtx.parentElement;
      const doughnutContainer = doughnutCtx.parentElement;
      if (lineContainer) {
        lineContainer.innerHTML = `
          <div class="chart-fallback" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); text-align: center; gap: 8px;">
            <i class="fa-solid fa-chart-line" style="font-size: 24px;"></i>
            <span>Analytics charts unavailable (Chart.js failed to load)</span>
          </div>
        `;
      }
      if (doughnutContainer) {
        doughnutContainer.innerHTML = `
          <div class="chart-fallback" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); text-align: center; gap: 8px;">
            <i class="fa-solid fa-chart-pie" style="font-size: 24px;"></i>
            <span>Analytics charts unavailable (Chart.js failed to load)</span>
          </div>
        `;
      }
      return;
    }

    // 1. Line Chart Data setup: Group enrollment counts by date
    const dateGroups = {};
    this.students.forEach(s => {
      const dateStr = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    });

    // Sort dates chronologically (using latest as fallback, here we take unique sorted dates)
    const sortedDates = Object.keys(dateGroups).slice(-7); // Last 7 unique entry dates
    const growthData = sortedDates.map(date => dateGroups[date]);

    // Gradient fills
    const lineGradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 250);
    lineGradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    lineGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    this.growthChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: sortedDates.length > 0 ? sortedDates : ['None'],
        datasets: [{
          label: 'Students Enrolled',
          data: growthData.length > 0 ? growthData : [0],
          borderColor: '#6366f1',
          borderWidth: 3,
          backgroundColor: lineGradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#ffffff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9ca3af' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9ca3af', stepSize: 1 } }
        }
      }
    });

    // 2. Doughnut Chart Data setup: Group by department allocations
    const deptAllocations = {};
    this.students.forEach(s => {
      deptAllocations[s.department] = (deptAllocations[s.department] || 0) + 1;
    });

    const deptLabels = Object.keys(deptAllocations);
    const deptData = deptLabels.map(dept => deptAllocations[dept]);

    this.deptChartInstance = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: deptLabels.length > 0 ? deptLabels : ['Empty'],
        datasets: [{
          data: deptData.length > 0 ? deptData : [1],
          backgroundColor: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e'],
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 10 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  /* ==========================================================================
     Portal View: Student Profile Cards Grid
     ========================================================================== */

  async loadAndRenderStudentsGrid(target) {
    try {
      this.closeDrawer();
      await this.refreshCache();
      
      // Default list layout structure
      target.innerHTML = `
        <div class="search-filter-panel">
          <!-- Search bar with command center design -->
          <div class="command-search-wrapper">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" class="command-search-input" id="search-box" placeholder="Search by name, email, major..." value="${this.searchQuery}" aria-label="Search students">
          </div>

          <!-- Horizontal filter pill list -->
          <div class="filter-pills-list" id="dept-pills-container">
            <!-- Dynamic Pills will be loaded here -->
          </div>
        </div>

        <!-- Profile Card responsive Grid -->
        <div class="profile-card-grid" id="grid-container">
          <!-- Cards are dynamically rendered here -->
        </div>

        <!-- Pagination Controls -->
        <div class="grid-pagination" id="grid-pagination-container">
          <!-- Pagination controls here -->
        </div>
      `;

      // Bind real-time input search event
      const searchBox = document.getElementById('search-box');
      searchBox.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.updateGridAndPagination();
      });

      this.updateGridAndPagination();
    } catch (error) {
      this.showToast(error.message, 'error');
      console.error(error);
      target.innerHTML = `
        <div class="empty-state-wrapper">
          <div class="empty-state-screen glassmorphic-card">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: var(--danger-color); margin-bottom: 16px;"></i>
            <h2>Failed to load Directory</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">${error.message}</p>
            <button class="btn btn-primary btn-sm" id="btn-retry-grid">Retry Connection</button>
          </div>
        </div>
      `;
      document.getElementById('btn-retry-grid').addEventListener('click', () => this.loadAndRenderStudentsGrid(target));
    }
  }

  /**
   * Filters and sorts the cached students list based on search queries and department filters.
   */
  processListState() {
    // 1. Filter students
    this.filteredStudents = this.students.filter(student => {
      // Filter by department pill
      if (this.departmentFilter && student.department !== this.departmentFilter) {
        return false;
      }
      
      // Filter by search query (name, email, department/major, year)
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const nameMatch = student.name.toLowerCase().includes(query);
        const emailMatch = student.email.toLowerCase().includes(query);
        const deptMatch = student.department.toLowerCase().includes(query);
        const yearMatch = student.year.toString() === query;
        
        return nameMatch || emailMatch || deptMatch || yearMatch;
      }
      
      return true;
    });

    // 2. Sort students (by sortField and sortOrder)
    this.filteredStudents.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      // Handle strings case-insensitively
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Refreshes list state: populates filter pills, creates cards, and builds pagination tags.
   */
  updateGridAndPagination() {
    this.processListState();
    
    const gridContainer = document.getElementById('grid-container');
    const paginationContainer = document.getElementById('grid-pagination-container');
    const pillsContainer = document.getElementById('dept-pills-container');

    // 1. Populate clean department filter pills (Linear style)
    const departments = [...new Set(this.students.map(s => s.department))].sort();
    pillsContainer.innerHTML = `
      <div class="filter-pill ${this.departmentFilter === '' ? 'active' : ''}" data-dept="">All Majors</div>
      ${departments.map(dept => `
        <div class="filter-pill ${this.departmentFilter === dept ? 'active' : ''}" data-dept="${dept}">${dept}</div>
      `).join('')}
    `;

    // Bind pills clicks
    const pills = pillsContainer.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.departmentFilter = pill.getAttribute('data-dept');
        this.currentPage = 1;
        this.updateGridAndPagination();
      });
    });

    // 2. Evaluate Absolute Empty States vs Filter Empty States
    if (this.students.length === 0) {
      gridContainer.innerHTML = '';
      paginationContainer.innerHTML = '';
      document.getElementById('grid-container').className = 'empty-state-wrapper';
      document.getElementById('grid-container').innerHTML = `
        <div class="empty-state-screen glassmorphic-card">
          <i class="fa-solid fa-users-slash"></i>
          <h2>No students enrolled</h2>
          <p>Enrolling your first student record will populate the directory database.</p>
          <a href="#/students/add" class="btn btn-glow btn-sm">Add First Student</a>
        </div>
      `;
      return;
    }

    if (this.filteredStudents.length === 0) {
      gridContainer.innerHTML = '';
      paginationContainer.innerHTML = '';
      document.getElementById('grid-container').className = 'empty-state-wrapper';
      document.getElementById('grid-container').innerHTML = `
        <div class="empty-state-screen glassmorphic-card">
          <i class="fa-solid fa-magnifying-glass-minus"></i>
          <h2>No matching profiles</h2>
          <p>No student details match your query. Try refining your keyword or filter.</p>
        </div>
      `;
      return;
    }

    // Set layout class
    document.getElementById('grid-container').className = 'profile-card-grid';

    // 3. Paginate student lists
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const paginatedItems = this.filteredStudents.slice(startIndex, startIndex + this.itemsPerPage);

    // 4. Render Profile cards
    gridContainer.innerHTML = paginatedItems.map(student => {
      const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return `
        <div class="profile-card glassmorphic-card" data-id="${student.id}">
          <div class="profile-card-header">
            <div class="profile-card-avatar">${initials}</div>
            <div class="profile-card-info">
              <span class="profile-card-name">${student.name}</span>
              <span class="profile-card-id">ID: #${student.id}</span>
            </div>
          </div>
          
          <div class="profile-card-details">
            <div class="detail-item">
              <span class="detail-label">Email</span>
              <span class="detail-value" style="font-size:12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${student.email}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Major</span>
              <span class="detail-value">${student.department}</span>
            </div>
          </div>

          <div class="profile-card-footer">
            <span class="profile-badge dept">${student.department.substring(0, 15)}${student.department.length > 15 ? '...' : ''}</span>
            <span class="profile-badge year">Year ${student.year}</span>
          </div>
        </div>
      `;
    }).join('');



    // Bind card click listener to open the slide drawer
    const cards = gridContainer.querySelectorAll('.profile-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        const student = this.students.find(s => s.id === id);
        if (student) this.renderStudentDrawer(student);
      });
    });

    // 5. Render Pagination controls
    const totalStudents = this.filteredStudents.length;
    const totalPages = Math.ceil(totalStudents / this.itemsPerPage);
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalStudents);

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
      <div class="pagination-info" style="font-size: 13px; color: var(--text-secondary);">
        Showing <strong>${startIndex + 1}</strong> to <strong>${endIndex}</strong> of <strong>${totalStudents}</strong> entries
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="btn-page-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-angle-left"></i>
        </button>
        <div class="pagination-pages">
          ${pagesHtml}
        </div>
        <button class="pagination-btn" id="btn-page-next" ${this.currentPage === totalPages ? 'disabled' : ''}>
          <i class="fa-solid fa-angle-right"></i>
        </button>
      </div>
    `;

    // Bind page buttons click triggers
    const prevBtn = document.getElementById('btn-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentPage--;
        this.updateGridAndPagination();
      });
    }

    const nextBtn = document.getElementById('btn-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentPage++;
        this.updateGridAndPagination();
      });
    }

    const pageNums = paginationContainer.querySelectorAll('.page-num');
    pageNums.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        this.updateGridAndPagination();
      });
    });
  }

  /**
   * Renders details inside the Notion-style Slide-Out Drawer and slide it out.
   * @param {Object} student - Student record details
   */
  renderStudentDrawer(student) {
    const drawerBody = document.getElementById('drawer-body-content');
    const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const formattedDate = new Date(student.created_at).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    drawerBody.innerHTML = `
      <div class="drawer-profile-summary">
        <div class="drawer-profile-avatar">${initials}</div>
        <h3 class="drawer-profile-name">${student.name}</h3>
        <span class="drawer-profile-email">${student.email}</span>
      </div>

      <div class="drawer-info-grid">
        <div class="drawer-info-row">
          <span class="drawer-info-label">Student ID</span>
          <span class="drawer-info-value">#${student.id}</span>
        </div>
        <div class="drawer-info-row">
          <span class="drawer-info-label">Major/Department</span>
          <span class="drawer-info-value">${student.department}</span>
        </div>
        <div class="drawer-info-row">
          <span class="drawer-info-label">Academic Year</span>
          <span class="drawer-info-value">Year ${student.year}</span>
        </div>
        <div class="drawer-info-row">
          <span class="drawer-info-label">Enrollment Date</span>
          <span class="drawer-info-value">${formattedDate}</span>
        </div>
      </div>

      <div class="drawer-actions-box">
        <button class="btn btn-secondary btn-sm" id="drawer-btn-edit" data-id="${student.id}">
          <i class="fa-solid fa-pen-to-square"></i> Edit Profile
        </button>
        <button class="btn btn-danger btn-sm" id="drawer-btn-delete" data-id="${student.id}">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    `;

    // Bind action events inside the drawer
    document.getElementById('drawer-btn-edit').addEventListener('click', () => {
      this.closeDrawer();
      window.location.hash = `#/students/edit/${student.id}`;
    });

    document.getElementById('drawer-btn-delete').addEventListener('click', () => {
      this.closeDrawer();
      this.showDeleteConfirm(student);
    });

    this.openDrawer();
  }

  /**
   * Renders the delete confirmation warning card.
   * @param {Object} student - Student record details
   */
  showDeleteConfirm(student) {
    const previewBox = document.getElementById('delete-preview-box');
    previewBox.innerHTML = `
      <div><strong>ID:</strong> #${student.id}</div>
      <div><strong>Name:</strong> ${student.name}</div>
      <div><strong>Major:</strong> ${student.department}</div>
    `;

    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');

    const btnConfirm = document.getElementById('btn-delete-confirm');
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    newBtnConfirm.addEventListener('click', async () => {
      try {
        newBtnConfirm.disabled = true;
        newBtnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        
        await window.studentApi.delete(student.id);
        
        modal.classList.remove('active');
        this.showToast('Student deleted successfully');
        
        await this.loadAndRenderStudentsGrid(document.getElementById('portal-content-area'));
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        newBtnConfirm.disabled = false;
        newBtnConfirm.textContent = 'Delete Record';
      }
    });
  }

  /* ==========================================================================
     Portal View: Vercel Style Forms (Add / Edit Student)
     ========================================================================== */

  renderAddStudentForm(target) {
    target.innerHTML = `
      <div class="form-wrapper">
        <div class="form-title-box">
          <h2>Enroll Student</h2>
          <p>Enter profile details to register the student record</p>
        </div>
        
        <div class="form-card">
          <form id="student-form" novalidate>
            <div class="input-group">
              <label class="input-label" for="form-name">Name</label>
              <input type="text" class="input-field" id="form-name" placeholder="Johnathan Doe" required>
              <span class="error-hint">Please enter a valid student name.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="form-email">Email Address</label>
              <input type="email" class="input-field" id="form-email" placeholder="john.doe@school.edu" required>
              <span class="error-hint" id="email-error">Please enter a valid school email address.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="form-dept">Major / Department</label>
              <input type="text" class="input-field" id="form-dept" placeholder="Computer Science" required>
              <span class="error-hint">Please specify the academic major.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="form-year">Academic Year</label>
              <select class="input-field" id="form-year" style="cursor: pointer;" required>
                <option value="" disabled selected>Select academic year</option>
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
                <option value="5">Year 5</option>
                <option value="6">Year 6</option>
              </select>
              <span class="error-hint">Please select an academic year (1-6).</span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
              <a href="#/students" class="btn btn-secondary">Cancel</a>
              <button type="submit" class="btn btn-primary" id="btn-form-submit">
                <i class="fa-solid fa-floppy-disk"></i> Enroll Student
              </button>
            </div>
          </form>
        </div>
      </div>
    `;



    const form = document.getElementById('student-form');
    // Clear invalid states on typing
    const inputs = form.querySelectorAll('.input-field');
    inputs.forEach(input => {
      input.addEventListener('input', () => input.classList.remove('invalid'));
      input.addEventListener('change', () => input.classList.remove('invalid'));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.validateForm()) {
        await this.submitStudentData(null);
      }
    });
  }

  async loadAndRenderEditStudentForm(target, id) {
    try {
      const response = await window.studentApi.getById(id);
      const student = response.data;

      if (!student) {
        target.innerHTML = `
          <div class="form-wrapper glassmorphic-card" style="text-align: center; padding: 40px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: var(--warning-color); margin-bottom: 16px;"></i>
            <h2>Student Not Found</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">The student record you are looking to edit does not exist or has been deleted.</p>
            <a href="#/students" class="btn btn-primary">Back to Directory</a>
          </div>
        `;
        return;
      }

      target.innerHTML = `
        <div class="form-wrapper">
          <div class="form-title-box">
            <h2>Modify Details</h2>
            <p>Modify student details for Student ID #${student.id}</p>
          </div>
          
          <div class="form-card">
            <form id="student-form" novalidate>
              <div class="input-group">
                <label class="input-label" for="form-name">Name</label>
                <input type="text" class="input-field" id="form-name" value="${student.name}" required>
                <span class="error-hint">Please enter a valid student name.</span>
              </div>

              <div class="input-group">
                <label class="input-label" for="form-email">Email Address</label>
                <input type="email" class="input-field" id="form-email" value="${student.email}" required>
                <span class="error-hint" id="email-error">Please enter a valid school email address.</span>
              </div>

              <div class="input-group">
                <label class="input-label" for="form-dept">Major / Department</label>
                <input type="text" class="input-field" id="form-dept" value="${student.department}" required>
                <span class="error-hint">Please specify the academic major.</span>
              </div>

              <div class="input-group">
                <label class="input-label" for="form-year">Academic Year</label>
                <select class="input-field" id="form-year" style="cursor: pointer;" required>
                  <option value="" disabled>Select academic year</option>
                  <option value="1" ${student.year === 1 ? 'selected' : ''}>Year 1 (Freshman)</option>
                  <option value="2" ${student.year === 2 ? 'selected' : ''}>Year 2 (Sophomore)</option>
                  <option value="3" ${student.year === 3 ? 'selected' : ''}>Year 3 (Junior)</option>
                  <option value="4" ${student.year === 4 ? 'selected' : ''}>Year 4 (Senior)</option>
                  <option value="5" ${student.year === 5 ? 'selected' : ''}>Year 5</option>
                  <option value="6" ${student.year === 6 ? 'selected' : ''}>Year 6</option>
                </select>
                <span class="error-hint">Please select an academic year (1-6).</span>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
                <a href="#/students" class="btn btn-secondary">Cancel</a>
                <button type="submit" class="btn btn-primary" id="btn-form-submit">
                  <i class="fa-solid fa-floppy-disk"></i> Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      `;



      const form = document.getElementById('student-form');
      // Clear invalid states on typing
      const inputs = form.querySelectorAll('.input-field');
      inputs.forEach(input => {
        input.addEventListener('input', () => input.classList.remove('invalid'));
        input.addEventListener('change', () => input.classList.remove('invalid'));
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (this.validateForm()) {
          await this.submitStudentData(student.id);
        }
      });
    } catch (err) {
      this.showToast(err.message, 'error');
      console.error(err);
      target.innerHTML = `
        <div class="form-wrapper glassmorphic-card" style="text-align: center; padding: 40px;">
          <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: var(--danger-color); margin-bottom: 16px;"></i>
          <h2>Operation Failed</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">${err.message}</p>
          <a href="#/students" class="btn btn-primary">Back to Directory</a>
        </div>
      `;
    }
  }

  /**
   * Client-side validation checking values using regex patterns before contacting server.
   */
  validateForm() {
    let isValid = true;

    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const deptInput = document.getElementById('form-dept');
    const yearSelect = document.getElementById('form-year');

    const controls = [nameInput, emailInput, deptInput, yearSelect];
    controls.forEach(control => control.classList.remove('invalid'));

    if (!nameInput.value.trim()) {
      nameInput.classList.add('invalid');
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
      emailInput.classList.add('invalid');
      document.getElementById('email-error').textContent = 'Please enter a valid school email address.';
      isValid = false;
    }

    if (!deptInput.value.trim()) {
      deptInput.classList.add('invalid');
      isValid = false;
    }

    if (!yearSelect.value) {
      yearSelect.classList.add('invalid');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Submits data to REST APIs and manages active button spinner states.
   * @param {number|null} id - Student ID or null
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
        this.showToast('Student updated successfully');
      } else {
        await window.studentApi.create(payload);
        this.showToast('Student added successfully');
      }

      window.location.hash = '#/students';
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        err.errors.forEach(valErr => {
          if (valErr.field === 'email') {
            emailInput.classList.add('invalid');
            document.getElementById('email-error').textContent = valErr.message;
          } else if (valErr.field === 'name') {
            nameInput.classList.add('invalid');
          } else if (valErr.field === 'department') {
            deptInput.classList.add('invalid');
          } else if (valErr.field === 'year') {
            yearSelect.classList.add('invalid');
          }
        });
        this.showToast('Validation failed', 'error');
      } else {
        this.showToast(err.message, 'error');
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${id ? 'Apply Changes' : 'Enroll Student'}`;
    }
  }
}

// Instantiate and bind routing triggers
document.addEventListener('DOMContentLoaded', () => {
  const controller = new AppController();

  window.addEventListener('hashchange', () => controller.handleRoute());
  controller.handleRoute();
});
