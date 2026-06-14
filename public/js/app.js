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
    
    // Authentication State
    this.currentUser = null;
    this.isAuthenticating = true;
    
    this.initDrawer();
    this.initModals();
    
    // Check local session before initiating routes
    this.checkSession().then(() => {
      this.isAuthenticating = false;
      this.handleRoute();
    });
  }

  /**
   * Check for cached credentials to restore user session
   */
  async checkSession() {
    const token = localStorage.getItem('campusos_token') || sessionStorage.getItem('campusos_token');
    if (token) {
      try {
        const res = await window.studentApi.getMe();
        if (res && res.success) {
          this.currentUser = res.data;
        }
      } catch (err) {
        localStorage.removeItem('campusos_token');
        sessionStorage.removeItem('campusos_token');
      }
    }
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
   * Renders Landing experience, Auth views OR wraps inside Portal layouts based on URL hash routing.
   */
  async handleRoute() {
    if (this.isAuthenticating) return; // Prevent early routing before session load
    if (this.isLoadingRoute) return;
    this.isLoadingRoute = true;
    try {
      this.closeDrawer();
      let hash = window.location.hash || '#/landing';

      // Parse params for dynamic routes
      const parts = hash.split('/');
      const isVerifyEmail = hash.startsWith('#/verify-email/');
      const isResetPassword = hash.startsWith('#/reset-password/');

      // Automatically close mobile sidebar on navigation change
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }

      // Guest routes list
      const guestRoutes = ['#/login', '#/register', '#/forgot-password', '#/landing', '#/', '#/check-email'];

      // Redirect logic based on Auth status
      if (!this.currentUser) {
        // Logged out redirects: if accessing protected views, send to login
        if (!guestRoutes.includes(hash) && !isVerifyEmail && !isResetPassword) {
          window.location.hash = '#/login';
          return;
        }
      } else {
        // Logged in redirects:
        if (!this.currentUser.is_verified) {
          // Unverified user: can only access logout, verification-required page, or verify-email
          if (hash !== '#/verification-required' && hash !== '#/logout' && !isVerifyEmail) {
            window.location.hash = '#/verification-required';
            return;
          }
        } else {
          // Verified user: if accessing guest/auth screens, send to dashboard
          if (hash === '#/login' || hash === '#/register' || hash === '#/forgot-password' || hash === '#/verification-required') {
            window.location.hash = '#/dashboard';
            return;
          }
        }
      }

      // Render Auth Pages
      if (hash === '#/login') {
        this.renderLoginPage();
        return;
      }
      if (hash === '#/register') {
        this.renderRegisterPage();
        return;
      }
      if (hash === '#/forgot-password') {
        this.renderForgotPasswordPage();
        return;
      }
      if (hash === '#/check-email') {
        this.renderCheckEmailPage();
        return;
      }
      if (hash === '#/verification-required') {
        this.renderVerificationRequiredPage();
        return;
      }
      if (isVerifyEmail) {
        const token = parts[parts.length - 1];
        await this.renderVerifyEmailPage(token);
        return;
      }
      if (isResetPassword) {
        const token = parts[parts.length - 1];
        this.renderResetPasswordPage(token);
        return;
      }

      // Handle logout
      if (hash === '#/logout') {
        await this.logout();
        return;
      }

      // 1. SaaS Landing Page layout
      if (hash === '#/landing' || hash === '' || hash === '#/') {
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
        <!-- Minimal Navbar -->
        <header class="landing-nav">
          <div class="brand">
            <span class="brand-text">Campus<span>.OS</span></span>
          </div>
          <div class="landing-nav-actions" style="display: flex; gap: 20px; align-items: center;">
            ${this.currentUser 
              ? `<a href="#/dashboard" class="btn btn-primary btn-sm">Launch Platform</a>`
              : `<a href="#/login" class="auth-link" style="font-size: 13.5px; font-weight: 500;">Sign In</a>
                 <a href="#/register" class="btn btn-primary btn-sm">Get Started</a>`
            }
          </div>
        </header>

        <!-- Hero Section -->
        <section class="landing-hero">
          <div class="hero-tag">
            <i class="fa-solid fa-circle" style="font-size: 6px; color: var(--primary-color);"></i> Workspace Version 1.2.0
          </div>
          <h1 class="hero-title">
            The minimal student directory<br><span>engineered for performance.</span>
          </h1>
          <p class="hero-subtitle">
            An elegant, portfolio-grade registry platform structured with clean MVC principles, optimized MySQL query pooling, server-validated inputs, and custom visual metrics.
          </p>
          <div class="hero-ctas">
            <a href="#/dashboard" class="btn btn-primary">Launch Workspace</a>
            <a href="#/students" class="btn btn-secondary">Explore Directory</a>
          </div>
        </section>

        <!-- Metrics Section -->
        <section class="landing-stats" id="landing-stats-container">
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-uptime">99.9%</div>
            <div class="landing-stat-label">System Availability</div>
          </div>
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-latency">&lt; 1.2s</div>
            <div class="landing-stat-label">Query Speed</div>
          </div>
          <div class="landing-stat-card">
            <div class="landing-stat-number" id="count-pooling">Active</div>
            <div class="landing-stat-label">Database Pooling</div>
          </div>
        </section>

        <!-- Capabilities Section -->
        <section class="landing-features">
          <div class="section-label">Features</div>
          <h2 class="section-title">Refined administrative tools.</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-lock"></i></div>
              <h3 class="feature-card-title">Secured SQL Queries</h3>
              <p class="feature-card-desc">Comprehensive mitigation against SQL Injection vectors using parameter-binding prepared statements.</p>
            </div>
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-power-off"></i></div>
              <h3 class="feature-card-title">Graceful Resource Lifecycles</h3>
              <p class="feature-card-desc">Active process hooks close database connection pools safely upon intercepting termination signals.</p>
            </div>
            <div class="feature-card">
              <div class="feature-card-icon"><i class="fa-solid fa-cube"></i></div>
              <h3 class="feature-card-title">Structured Architecture</h3>
              <p class="feature-card-desc">Rigid Model-View-Controller codebase division ensuring maintainable logic flow and clean styling.</p>
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
          <!-- Left Docked Sidebar -->
          <aside class="portal-sidebar" id="sidebar">
            <div class="portal-sidebar-brand">
              <span>Campus<span>.OS</span></span>
            </div>
            
            <nav class="portal-sidebar-menu">
              <a href="#/dashboard" class="portal-menu-item" id="nav-dashboard">
                <i class="fa-solid fa-chart-pie"></i>
                <span>Overview</span>
              </a>
              <a href="#/students" class="portal-menu-item" id="nav-students">
                <i class="fa-solid fa-users"></i>
                <span>Catalog</span>
              </a>
              <a href="#/students/add" class="portal-menu-item" id="nav-add-student">
                <i class="fa-solid fa-user-plus"></i>
                <span>Register</span>
              </a>
              <a href="#/profile" class="portal-menu-item" id="nav-profile">
                <i class="fa-solid fa-user-gear"></i>
                <span>Profile</span>
              </a>
              <a href="#/logout" class="portal-menu-item" id="nav-logout">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
              </a>
            </nav>
            
            <div class="portal-sidebar-footer">
              <div class="status">
                <span class="status-indicator ${this.currentUser?.is_verified ? 'verified' : 'unverified'}"></span>
                <span>${this.currentUser?.is_verified ? 'Verified Pool' : 'Unverified Pool'}</span>
              </div>
              <div class="version">v1.2.0</div>
            </div>
          </aside>

          <!-- Main Workspace -->
          <main class="portal-main">
            <header class="portal-header">
              <button class="portal-sidebar-toggle" id="sidebar-toggle" aria-label="Toggle Navigation">
                <i class="fa-solid fa-bars"></i>
              </button>
              <div class="portal-header-title">
                <h1 id="portal-title">Overview</h1>
              </div>
              <div class="portal-header-user" style="cursor: pointer;" onclick="window.location.hash = '#/profile'">
                <div class="portal-user-avatar" id="header-avatar">${this.getInitials(this.currentUser?.name)}</div>
                <div class="portal-user-details">
                  <span class="portal-user-name">${this.currentUser ? this.currentUser.name : 'User'}</span>
                  <span class="portal-user-role" style="display: flex; align-items: center; gap: 6px;">
                    ${this.currentUser ? this.currentUser.email : ''}
                    ${this.currentUser?.is_verified 
                      ? '<span class="sidebar-user-verified-badge verified" style="margin-top: 0; padding: 1px 4px;"><i class="fa-solid fa-circle-check"></i></span>'
                      : '<span class="sidebar-user-verified-badge unverified" style="margin-top: 0; padding: 1px 4px;"><i class="fa-solid fa-circle-xmark"></i></span>'
                    }
                  </span>
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

    // Render verification warning banner if user is unverified
    const isUnverified = this.currentUser && !this.currentUser.is_verified;
    const bannerContainerId = 'portal-warning-banner-container';
    let bannerContainer = document.getElementById(bannerContainerId);
    
    if (isUnverified) {
      if (!bannerContainer) {
        bannerContainer = document.createElement('div');
        bannerContainer.id = bannerContainerId;
        portalContent.parentNode.insertBefore(bannerContainer, portalContent);
      }
      bannerContainer.innerHTML = `
        <div class="verification-warning-banner" style="margin: 0 32px 24px 32px;">
          <div class="verification-banner-content">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Your email address (<strong>${this.currentUser.email}</strong>) is not verified. Please verify your email to unlock all administrative features.</span>
          </div>
          <button class="btn-banner-action" id="btn-banner-resend">Resend Verification</button>
        </div>
      `;
      const btnResend = document.getElementById('btn-banner-resend');
      if (btnResend) {
        btnResend.addEventListener('click', async () => {
          try {
            btnResend.disabled = true;
            btnResend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';
            await window.studentApi.resendVerification(this.currentUser.email);
            this.showToast('Verification link resent. Please check your email.');
          } catch (err) {
            this.showToast(err.message, 'error');
          } finally {
            btnResend.disabled = false;
            btnResend.innerHTML = 'Resend Verification';
          }
        });
      }
    } else {
      if (bannerContainer) {
        bannerContainer.remove();
      }
    }

    // Loader
    portalContent.innerHTML = `
      <div class="view-loader">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Loading secure workspace...</span>
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
    } else if (activeHash === '#/profile') {
      portalTitle.textContent = 'Profile Settings';
      this.renderProfilePage(portalContent);
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
    const profileItem = document.getElementById('nav-profile');

    if (dashboardItem && studentsItem && addItem && profileItem) {
      if (hash === '#/dashboard') {
        dashboardItem.classList.add('active');
      } else if (hash === '#/students') {
        studentsItem.classList.add('active');
      } else if (hash === '#/students/add') {
        addItem.classList.add('active');
      } else if (hash === '#/profile') {
        profileItem.classList.add('active');
      }
    }
  }

  /* ==========================================================================
     Portal View: Dashboard Analytics Rendering
     ========================================================================== */

  async loadAndRenderDashboard(target) {
    if (this.currentUser && !this.currentUser.is_verified) {
      this.renderUnverifiedLock(target);
      return;
    }
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
        <!-- Visual Narrative Section -->
        <div class="narrative-summary-box">
          <p class="narrative-summary-text">
            Currently orchestrating <strong>${totalCount}</strong> active student profiles inside the <span class="accent-highlight">Campus.OS</span> directory database. Within this directory, <strong>${csCount}</strong> scholars specialize in Computer Science & Information Technology majors, with <strong>${otherCount}</strong> allocations mapped to other academic disciplines.
          </p>
        </div>

        <!-- Charts Grid -->
        <div class="dashboard-visuals-grid">
          <div class="glassmorphic-card">
            <div class="chart-card-header">
              <h2>Enrollment growth trends</h2>
            </div>
            <div class="chart-container" style="height: 250px;">
              <canvas id="growthLineChart"></canvas>
            </div>
          </div>
          
          <div class="glassmorphic-card">
            <div class="chart-card-header">
              <h2>Department allocations</h2>
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

    // Dynamic theme colors
    const isLightMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const accentColor = isLightMode ? '#b45309' : '#e2b76c';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)';
    const textColor = isLightMode ? '#52525b' : '#a1a1aa';
    const pointBorderColor = isLightMode ? '#ffffff' : '#0a0a0a';
    
    // Gradient fills
    const lineGradient = lineCtx.getContext('2d').createLinearGradient(0, 0, 0, 250);
    if (isLightMode) {
      lineGradient.addColorStop(0, 'rgba(180, 83, 9, 0.12)');
      lineGradient.addColorStop(1, 'rgba(180, 83, 9, 0.0)');
    } else {
      lineGradient.addColorStop(0, 'rgba(226, 183, 108, 0.12)');
      lineGradient.addColorStop(1, 'rgba(226, 183, 108, 0.0)');
    }

    this.growthChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: sortedDates.length > 0 ? sortedDates : ['None'],
        datasets: [{
          label: 'Students Enrolled',
          data: growthData.length > 0 ? growthData : [0],
          borderColor: accentColor,
          borderWidth: 2,
          backgroundColor: lineGradient,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: accentColor,
          pointBorderColor: pointBorderColor,
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
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 10 }, stepSize: 1 } }
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
    const deptColors = isLightMode
      ? ['#b45309', '#52525b', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5']
      : ['#e2b76c', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#18181b'];

    this.deptChartInstance = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: deptLabels.length > 0 ? deptLabels : ['Empty'],
        datasets: [{
          data: deptData.length > 0 ? deptData : [1],
          backgroundColor: deptColors,
          borderWidth: 1,
          borderColor: isLightMode ? '#ffffff' : '#0d0d0d'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: 'Inter', size: 10 } }
          }
        },
        cutout: '75%'
      }
    });
  }

  /* ==========================================================================
     Portal View: Student Profile Cards Grid
     ========================================================================== */

  async loadAndRenderStudentsGrid(target) {
    if (this.currentUser && !this.currentUser.is_verified) {
      this.renderUnverifiedLock(target);
      return;
    }
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
          <h2>No students registered yet.</h2>
          <p>Register a student record to populate the directory database.</p>
          <a href="#/students/add" class="btn btn-glow btn-sm">Register Student</a>
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
          <div class="profile-card-top">
            <span class="profile-card-meta">ID / #${student.id}</span>
            <span class="profile-card-initials">${initials}</span>
          </div>
          
          <div class="profile-card-mid">
            <h3 class="profile-card-name">${student.name}</h3>
            <span class="profile-card-email">${student.email}</span>
          </div>

          <div class="profile-card-footer">
            <span class="profile-badge dept">${student.department}</span>
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

    // If totalPages <= 1, hide controls (Previous, Next, page numbers) but show info if there are entries
    if (totalPages <= 1) {
      if (totalStudents > 0) {
        paginationContainer.innerHTML = `
          <div class="pagination-info">
            Showing <strong>${startIndex + 1}</strong> to <strong>${endIndex}</strong> of <strong>${totalStudents}</strong> entries
          </div>
        `;
      } else {
        paginationContainer.innerHTML = '';
      }
      return;
    }

    let pagesHtml = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pagesHtml += `
        <button class="page-num ${this.currentPage === i ? 'active' : ''}" data-page="${i}" aria-label="Page ${i}">${i}</button>
      `;
    }

    paginationContainer.innerHTML = `
      <div class="pagination-info">
        Showing <strong>${startIndex + 1}</strong> to <strong>${endIndex}</strong> of <strong>${totalStudents}</strong> entries
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" id="btn-page-prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Previous Page">
          <i class="fa-solid fa-angle-left"></i>
        </button>
        <div class="pagination-pages">
          ${pagesHtml}
        </div>
        <button class="pagination-btn" id="btn-page-next" ${this.currentPage === totalPages ? 'disabled' : ''} aria-label="Next Page">
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
      <div class="drawer-product-spec">
        <div class="spec-header">
          <span class="spec-id">FILE / #${student.id}</span>
          <span class="spec-monogram">${initials}</span>
        </div>
        
        <div class="spec-title-area">
          <h2 class="spec-title">${student.name}</h2>
          <span class="spec-subtitle">${student.email}</span>
        </div>
        
        <div class="spec-grid">
          <div class="spec-row">
            <span class="spec-label">DEPARTMENT / MAJOR</span>
            <span class="spec-value">${student.department}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">ACADEMIC LEVEL</span>
            <span class="spec-value">YEAR ${student.year}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">REGISTRATION DATE</span>
            <span class="spec-value">${formattedDate}</span>
          </div>
        </div>

        <div class="spec-actions">
          <button class="btn btn-secondary btn-sm" id="drawer-btn-edit" data-id="${student.id}">
            <i class="fa-solid fa-pen-to-square"></i> EDIT RECORD
          </button>
          <button class="btn btn-danger btn-sm" id="drawer-btn-delete" data-id="${student.id}">
            <i class="fa-solid fa-trash-can"></i> DISMISS RECORD
          </button>
        </div>
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
    if (this.currentUser && !this.currentUser.is_verified) {
      this.renderUnverifiedLock(target);
      return;
    }
    target.innerHTML = `
      <div class="form-wrapper">
        <div class="form-title-box">
          <h2>Enroll Student</h2>
          <p>Register a new student profile under the Campus.OS domain</p>
        </div>
        
        <div class="form-card">
          <!-- Progress indicator -->
          <div class="form-progress-text">
            <span>Progress</span>
            <span id="form-progress-percentage">0% Complete</span>
          </div>
          <div class="form-progress-container">
            <div class="form-progress-fill" id="form-progress-bar"></div>
          </div>

          <form id="student-form" novalidate>
            <!-- Section 1: Identity -->
            <div class="form-group-section active" id="form-sec-identity">
              <div class="input-group">
                <label class="input-label" for="form-name">Name</label>
                <input type="text" class="input-field" id="form-name" placeholder="Johnathan Doe" autocomplete="off" required>
                <div class="capitalize-suggest" id="name-suggest-box" style="display: none;"></div>
                <div class="validation-badge neutral" id="name-validation">
                  <i class="fa-solid fa-circle-info"></i> Enter full name
                </div>
              </div>

              <div class="input-group" style="margin-bottom: 0;">
                <label class="input-label" for="form-email">Email Address</label>
                <input type="email" class="input-field" id="form-email" placeholder="john.doe@school.edu" autocomplete="off" required>
                <div class="validation-badge neutral" id="email-validation">
                  <i class="fa-solid fa-circle-info"></i> Enter email address
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--border-glow); margin: 32px 0;">

            <!-- Section 2: Academic Details -->
            <div class="form-group-section" id="form-sec-academic">
              <div class="input-group">
                <label class="input-label" for="form-dept">Major / Department</label>
                <div class="autocomplete-wrapper">
                  <input type="text" class="input-field" id="form-dept" placeholder="Computer Science" autocomplete="off" required>
                  <div class="autocomplete-dropdown" id="dept-dropdown"></div>
                </div>
                <div class="recent-suggestions-container" id="recent-suggestions" style="display: none;">
                  <div class="recent-suggestions-label">Recent Departments</div>
                  <div class="recent-suggestions-list"></div>
                </div>
                <div class="validation-badge neutral" id="dept-validation">
                  <i class="fa-solid fa-circle-info"></i> Specify major
                </div>
              </div>

              <div class="input-group" style="margin-bottom: 0;">
                <label class="input-label" for="year-trigger">Academic Year</label>
                <div class="custom-select-wrapper">
                  <div class="custom-select-trigger" id="year-trigger" tabindex="0">
                    <span id="year-trigger-text">Select academic year</span>
                    <i class="fa-solid fa-chevron-down"></i>
                  </div>
                  <div class="custom-select-dropdown" id="year-dropdown">
                    <div class="custom-select-search-wrapper">
                      <i class="fa-solid fa-magnifying-glass"></i>
                      <input type="text" class="custom-select-search" id="year-search" placeholder="Search academic year..." autocomplete="off">
                    </div>
                    <div class="custom-select-options" id="year-options">
                      <div class="custom-select-option" data-value="1">1st Year</div>
                      <div class="custom-select-option" data-value="2">2nd Year</div>
                      <div class="custom-select-option" data-value="3">3rd Year</div>
                      <div class="custom-select-option" data-value="4">4th Year</div>
                      <div class="custom-select-option" data-value="5">Postgraduate</div>
                      <div class="custom-select-option" data-value="6">Alumni</div>
                    </div>
                  </div>
                  <input type="hidden" id="form-year" value="">
                </div>
                <div class="validation-badge neutral" id="year-validation">
                  <i class="fa-solid fa-circle-info"></i> Select academic year
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 40px;">
              <a href="#/students" class="btn btn-secondary">Cancel</a>
              <button type="submit" class="btn btn-primary" id="btn-form-submit">
                <i class="fa-solid fa-floppy-disk"></i> Enroll Student
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupInteractiveForm(false);

    const form = document.getElementById('student-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.validateForm()) {
        await this.submitStudentData(null);
      }
    });
  }

  async loadAndRenderEditStudentForm(target, id) {
    if (this.currentUser && !this.currentUser.is_verified) {
      this.renderUnverifiedLock(target);
      return;
    }
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
            <!-- Progress indicator -->
            <div class="form-progress-text">
              <span>Progress</span>
              <span id="form-progress-percentage">100% Complete</span>
            </div>
            <div class="form-progress-container">
              <div class="form-progress-fill" id="form-progress-bar" style="width: 100%;"></div>
            </div>

            <form id="student-form" novalidate>
              <!-- Section 1: Identity -->
              <div class="form-group-section active" id="form-sec-identity">
                <div class="input-group">
                  <label class="input-label" for="form-name">Name</label>
                  <input type="text" class="input-field" id="form-name" value="${student.name}" autocomplete="off" required>
                  <div class="capitalize-suggest" id="name-suggest-box" style="display: none;"></div>
                  <div class="validation-badge neutral" id="name-validation">
                    <i class="fa-solid fa-circle-info"></i> Enter full name
                  </div>
                </div>

                <div class="input-group" style="margin-bottom: 0;">
                  <label class="input-label" for="form-email">Email Address</label>
                  <input type="email" class="input-field" id="form-email" value="${student.email}" autocomplete="off" required>
                  <div class="validation-badge neutral" id="email-validation">
                    <i class="fa-solid fa-circle-info"></i> Enter email address
                  </div>
                </div>
              </div>

              <hr style="border: none; border-top: 1px solid var(--border-glow); margin: 32px 0;">

              <!-- Section 2: Academic Details -->
              <div class="form-group-section" id="form-sec-academic">
                <div class="input-group">
                  <label class="input-label" for="form-dept">Major / Department</label>
                  <div class="autocomplete-wrapper">
                    <input type="text" class="input-field" id="form-dept" value="${student.department}" autocomplete="off" required>
                    <div class="autocomplete-dropdown" id="dept-dropdown"></div>
                  </div>
                  <div class="recent-suggestions-container" id="recent-suggestions" style="display: none;">
                    <div class="recent-suggestions-label">Recent Departments</div>
                    <div class="recent-suggestions-list"></div>
                  </div>
                  <div class="validation-badge neutral" id="dept-validation">
                    <i class="fa-solid fa-circle-info"></i> Specify major
                  </div>
                </div>

                <div class="input-group" style="margin-bottom: 0;">
                  <label class="input-label" for="year-trigger">Academic Year</label>
                  <div class="custom-select-wrapper">
                    <div class="custom-select-trigger" id="year-trigger" tabindex="0">
                      <span id="year-trigger-text">Select academic year</span>
                      <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="custom-select-dropdown" id="year-dropdown">
                      <div class="custom-select-search-wrapper">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" class="custom-select-search" id="year-search" placeholder="Search academic year..." autocomplete="off">
                      </div>
                      <div class="custom-select-options" id="year-options">
                        <div class="custom-select-option" data-value="1">1st Year</div>
                        <div class="custom-select-option" data-value="2">2nd Year</div>
                        <div class="custom-select-option" data-value="3">3rd Year</div>
                        <div class="custom-select-option" data-value="4">4th Year</div>
                        <div class="custom-select-option" data-value="5">Postgraduate</div>
                        <div class="custom-select-option" data-value="6">Alumni</div>
                      </div>
                    </div>
                    <input type="hidden" id="form-year" value="${student.year}">
                  </div>
                  <div class="validation-badge neutral" id="year-validation">
                    <i class="fa-solid fa-circle-info"></i> Select academic year
                  </div>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 40px;">
                <a href="#/students" class="btn btn-secondary">Cancel</a>
                <button type="submit" class="btn btn-primary" id="btn-form-submit">
                  <i class="fa-solid fa-floppy-disk"></i> Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      this.setupInteractiveForm(true, student.year);

      const form = document.getElementById('student-form');
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

  setupInteractiveForm(isEditMode = false, initialYear = null) {
    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const deptInput = document.getElementById('form-dept');
    const yearInput = document.getElementById('form-year');
    
    const deptDropdown = document.getElementById('dept-dropdown');
    
    const yearTrigger = document.getElementById('year-trigger');
    const yearDropdown = document.getElementById('year-dropdown');
    const yearSearch = document.getElementById('year-search');
    const yearOptions = document.querySelectorAll('.custom-select-option');
    const yearTriggerText = document.getElementById('year-trigger-text');

    const states = {
      name: false,
      email: false,
      dept: false,
      year: false
    };

    const capitalizeName = (name) => {
      return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const updateFormProgress = () => {
      let score = 0;
      if (states.name) score += 25;
      if (states.email) score += 25;
      if (states.dept) score += 25;
      if (states.year) score += 25;
      
      const fillBar = document.getElementById('form-progress-bar');
      const textPercentage = document.getElementById('form-progress-percentage');
      if (fillBar) fillBar.style.width = `${score}%`;
      if (textPercentage) textPercentage.textContent = `${score}% Complete`;
    };
    
    const focusSection = (inputId, groupIndex) => {
      const sections = document.querySelectorAll('.form-group-section');
      sections.forEach((sec, idx) => {
        if (idx === groupIndex) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });
    };
    
    nameInput.addEventListener('focus', () => focusSection('form-name', 0));
    emailInput.addEventListener('focus', () => focusSection('form-email', 0));
    deptInput.addEventListener('focus', () => focusSection('form-dept', 1));
    yearTrigger.addEventListener('focus', () => focusSection('year-trigger', 1));

    const validateName = () => {
      const val = nameInput.value.trim();
      const badge = document.getElementById('name-validation');
      const suggestBox = document.getElementById('name-suggest-box');
      
      nameInput.classList.remove('invalid');
      
      if (val.length >= 2) {
        states.name = true;
        badge.className = 'validation-badge success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Name valid';
        
        const capitalized = capitalizeName(val);
        if (val !== capitalized) {
          suggestBox.style.display = 'block';
          suggestBox.innerHTML = `Suggest capitalization: <span class="capitalize-suggest-link">${capitalized}</span>`;
          const link = suggestBox.querySelector('.capitalize-suggest-link');
          link.addEventListener('click', () => {
            nameInput.value = capitalized;
            suggestBox.style.display = 'none';
            validateName();
            updateFormProgress();
          });
        } else {
          suggestBox.style.display = 'none';
        }
      } else if (val.length > 0) {
        states.name = false;
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Name must be at least 2 characters';
        suggestBox.style.display = 'none';
      } else {
        states.name = false;
        badge.className = 'validation-badge neutral';
        badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Enter full name';
        suggestBox.style.display = 'none';
      }
    };
    nameInput.addEventListener('input', validateName);
    nameInput.addEventListener('blur', validateName);

    const validateEmail = () => {
      const val = emailInput.value.trim();
      const badge = document.getElementById('email-validation');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      emailInput.classList.remove('invalid');
      
      if (emailRegex.test(val)) {
        states.email = true;
        badge.className = 'validation-badge success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Email valid';
      } else if (val.length > 0) {
        states.email = false;
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Please enter a valid email format';
      } else {
        states.email = false;
        badge.className = 'validation-badge neutral';
        badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Enter email address';
      }
    };
    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('blur', validateEmail);

    const DEPARTMENTS_BY_CATEGORY = {
      "Engineering & Technology": [
        "Computer Science Engineering (CSE)",
        "Information Technology (IT)",
        "Artificial Intelligence & Machine Learning",
        "Data Science",
        "Cyber Security",
        "Electronics & Communication Engineering (ECE)",
        "Electrical & Electronics Engineering (EEE)",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Biotechnology",
        "Mechatronics",
        "Aerospace Engineering"
      ],
      "Business & Commerce": [
        "Commerce",
        "Accounting",
        "Finance",
        "Banking",
        "Business Administration (BBA)",
        "Marketing",
        "Human Resources",
        "Entrepreneurship",
        "International Business"
      ],
      "Arts & Humanities": [
        "English Literature",
        "History",
        "Political Science",
        "Philosophy",
        "Sociology",
        "Anthropology",
        "Linguistics"
      ],
      "Psychology & Social Sciences": [
        "Psychology",
        "Clinical Psychology",
        "Counseling Psychology",
        "Social Work",
        "Criminology"
      ],
      "Science": [
        "Physics",
        "Chemistry",
        "Mathematics",
        "Statistics",
        "Environmental Science",
        "Geology"
      ],
      "Medical & Health Sciences": [
        "Nursing",
        "Pharmacy",
        "Physiotherapy",
        "Public Health",
        "Nutrition & Dietetics",
        "Medical Laboratory Technology"
      ],
      "Law": [
        "LLB",
        "Corporate Law",
        "Criminal Law",
        "Constitutional Law"
      ],
      "Design & Creative Arts": [
        "Graphic Design",
        "Fashion Design",
        "Interior Design",
        "Animation",
        "Fine Arts",
        "Photography"
      ],
      "Media & Communication": [
        "Journalism",
        "Mass Communication",
        "Digital Media",
        "Film Studies"
      ],
      "Hospitality & Culinary Arts": [
        "Hotel Management",
        "Hospitality Management",
        "Culinary Arts",
        "Bakery & Pastry Arts",
        "Food Production"
      ],
      "Education": [
        "B.Ed",
        "Early Childhood Education",
        "Special Education"
      ],
      "Agriculture": [
        "Agriculture",
        "Horticulture",
        "Forestry",
        "Food Technology"
      ]
    };

    let currentFocus = -1;

    const showDeptSuggestions = (query) => {
      const filterQuery = query.toLowerCase().trim();
      deptDropdown.innerHTML = '';
      currentFocus = -1;

      if (filterQuery.length === 0) {
        deptDropdown.classList.remove('active');
        return;
      }

      // Calculate frequency of selections in current cache
      const freq = {};
      this.students.forEach(s => {
        if (s.department) {
          freq[s.department] = (freq[s.department] || 0) + 1;
        }
      });

      // Gather all matched departments
      const matchedMap = new Map(); // deptName -> category
      
      // Check predefined departments
      for (const [cat, depts] of Object.entries(DEPARTMENTS_BY_CATEGORY)) {
        depts.forEach(dept => {
          if (dept.toLowerCase().includes(filterQuery)) {
            matchedMap.set(dept, cat);
          }
        });
      }

      // Check database custom departments not in predefined list
      this.students.forEach(s => {
        const dept = s.department;
        if (dept && dept.toLowerCase().includes(filterQuery) && !matchedMap.has(dept)) {
          matchedMap.set(dept, "Other / Custom Majors");
        }
      });

      const escapeHtml = (str) => {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      };

      if (matchedMap.size === 0) {
        deptDropdown.classList.add('active');
        
        const noMatchItem = document.createElement('div');
        noMatchItem.className = 'autocomplete-no-match';
        noMatchItem.textContent = 'No matching department found';
        deptDropdown.appendChild(noMatchItem);
        
        const customItem = document.createElement('div');
        customItem.className = 'autocomplete-item custom-create-item';
        customItem.innerHTML = `Use "<strong>${escapeHtml(query)}</strong>" as custom department`;
        customItem.addEventListener('mousedown', (ev) => ev.preventDefault());
        customItem.addEventListener('click', () => {
          deptInput.value = query;
          deptDropdown.classList.remove('active');
          validateDept();
          updateFormProgress();
          saveRecentDept(query);
        });
        deptDropdown.appendChild(customItem);
        return;
      }

      deptDropdown.classList.add('active');

      const allMatches = Array.from(matchedMap.keys());
      
      // Extract top frequently selected matches (frequency > 0)
      const frequentMatches = allMatches
        .filter(dept => (freq[dept] || 0) > 0)
        .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
        .slice(0, 3);

      const groups = {};
      
      if (frequentMatches.length > 0) {
        groups["Frequently Selected"] = frequentMatches;
      }

      allMatches.forEach(dept => {
        if (frequentMatches.includes(dept)) return;
        const cat = matchedMap.get(dept);
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(dept);
      });

      const highlightMatch = (text, q) => {
        const escapedQ = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedQ})`, 'gi');
        return escapeHtml(text).replace(regex, '<span class="highlight-text">$1</span>');
      };

      for (const [groupTitle, depts] of Object.entries(groups)) {
        if (depts.length === 0) continue;
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'autocomplete-group-title';
        groupHeader.textContent = groupTitle;
        deptDropdown.appendChild(groupHeader);
        
        depts.forEach(dept => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.innerHTML = highlightMatch(dept, filterQuery);
          
          item.addEventListener('mousedown', (ev) => ev.preventDefault());
          item.addEventListener('click', () => {
            deptInput.value = dept;
            deptDropdown.classList.remove('active');
            validateDept();
            updateFormProgress();
            saveRecentDept(dept);
          });
          
          deptDropdown.appendChild(item);
        });
      }
    };

    const validateDept = () => {
      const val = deptInput.value.trim();
      const badge = document.getElementById('dept-validation');
      
      deptInput.classList.remove('invalid');
      
      if (val.length >= 2) {
        states.dept = true;
        badge.className = 'validation-badge success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Department specified';
      } else if (val.length > 0) {
        states.dept = false;
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Department name is too short';
      } else {
        states.dept = false;
        badge.className = 'validation-badge neutral';
        badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Specify major';
      }
    };

    deptInput.addEventListener('input', (e) => {
      showDeptSuggestions(e.target.value);
      validateDept();
    });

    deptInput.addEventListener('blur', () => {
      deptDropdown.classList.remove('active');
      validateDept();
      updateFormProgress();
    });

    deptInput.addEventListener('keydown', (e) => {
      const items = deptDropdown.querySelectorAll('.autocomplete-item');
      if (items.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        currentFocus++;
        addHighlight(items);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        currentFocus--;
        addHighlight(items);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (currentFocus > -1 && items[currentFocus]) {
          items[currentFocus].click();
          e.preventDefault();
        }
      }
    });

    const addHighlight = (items) => {
      removeHighlight(items);
      if (currentFocus >= items.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items[currentFocus].classList.add('highlighted');
      items[currentFocus].scrollIntoView({ block: 'nearest' });
    };

    const removeHighlight = (items) => {
      items.forEach(item => item.classList.remove('highlighted'));
    };

    const saveRecentDept = (dept) => {
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem('campusos_recent_depts')) || [];
      } catch (e) {}
      recent = recent.filter(d => d !== dept);
      recent.unshift(dept);
      recent = recent.slice(0, 3);
      localStorage.setItem('campusos_recent_depts', JSON.stringify(recent));
      renderRecentDepts();
    };

    const renderRecentDepts = () => {
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem('campusos_recent_depts')) || [];
      } catch (e) {}
      const container = document.getElementById('recent-suggestions');
      if (!container) return;
      
      if (recent.length > 0) {
        container.style.display = 'block';
        const listDiv = container.querySelector('.recent-suggestions-list');
        listDiv.innerHTML = recent.map(dept => `
          <button type="button" class="recent-suggestion-chip">${dept}</button>
        `).join('');
        
        listDiv.querySelectorAll('.recent-suggestion-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            deptInput.value = btn.textContent;
            validateDept();
            updateFormProgress();
            saveRecentDept(btn.textContent);
          });
        });
      } else {
        container.style.display = 'none';
      }
    };

    const validateYear = () => {
      const val = yearInput.value;
      const badge = document.getElementById('year-validation');
      
      yearTrigger.classList.remove('invalid');
      
      if (val) {
        states.year = true;
        badge.className = 'validation-badge success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Academic year selected';
      } else {
        states.year = false;
        badge.className = 'validation-badge neutral';
        badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Select academic year';
      }
    };

    yearTrigger.addEventListener('click', (e) => {
      yearDropdown.classList.toggle('active');
      yearTrigger.classList.toggle('active');
      if (yearDropdown.classList.contains('active')) {
        yearSearch.value = '';
        yearOptions.forEach(o => o.style.display = 'block');
        yearSearch.focus();
      }
      e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      if (!yearTrigger.contains(e.target) && !yearDropdown.contains(e.target)) {
        yearDropdown.classList.remove('active');
        yearTrigger.classList.remove('active');
      }
    });

    yearOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.getAttribute('data-value');
        const text = opt.textContent;
        
        yearInput.value = val;
        yearTriggerText.textContent = text;
        
        yearOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        
        yearDropdown.classList.remove('active');
        yearTrigger.classList.remove('active');
        
        validateYear();
        updateFormProgress();
      });
    });

    yearSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      yearOptions.forEach(opt => {
        const text = opt.textContent.toLowerCase();
        if (text.includes(q)) {
          opt.style.display = 'block';
        } else {
          opt.style.display = 'none';
        }
      });
    });

    yearTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        yearDropdown.classList.add('active');
        yearTrigger.classList.add('active');
        yearSearch.focus();
        e.preventDefault();
      }
    });

    yearSearch.addEventListener('keydown', (e) => {
      const visibleOpts = Array.from(yearOptions).filter(o => o.style.display !== 'none');
      if (visibleOpts.length === 0) return;
      
      let selectFocus = visibleOpts.findIndex(o => o.classList.contains('highlighted'));
      
      if (e.key === 'ArrowDown') {
        selectFocus++;
        if (selectFocus >= visibleOpts.length) selectFocus = 0;
        visibleOpts.forEach(o => o.classList.remove('highlighted'));
        visibleOpts[selectFocus].classList.add('highlighted');
        visibleOpts[selectFocus].scrollIntoView({ block: 'nearest' });
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        selectFocus--;
        if (selectFocus < 0) selectFocus = visibleOpts.length - 1;
        visibleOpts.forEach(o => o.classList.remove('highlighted'));
        visibleOpts[selectFocus].classList.add('highlighted');
        visibleOpts[selectFocus].scrollIntoView({ block: 'nearest' });
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (selectFocus > -1 && visibleOpts[selectFocus]) {
          visibleOpts[selectFocus].click();
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        yearDropdown.classList.remove('active');
        yearTrigger.classList.remove('active');
        yearTrigger.focus();
        e.preventDefault();
      }
    });

    renderRecentDepts();
    
    if (isEditMode) {
      validateName();
      validateEmail();
      validateDept();
      
      if (initialYear) {
        yearInput.value = initialYear;
        const matchingOpt = Array.from(yearOptions).find(o => o.getAttribute('data-value') === String(initialYear));
        if (matchingOpt) {
          yearTriggerText.textContent = matchingOpt.textContent;
          matchingOpt.classList.add('selected');
        }
        validateYear();
      }
      updateFormProgress();
    }
  }

  validateForm() {
    let isValid = true;

    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const deptInput = document.getElementById('form-dept');
    const yearSelect = document.getElementById('form-year');
    const yearTrigger = document.getElementById('year-trigger');

    nameInput.classList.remove('invalid');
    emailInput.classList.remove('invalid');
    deptInput.classList.remove('invalid');
    yearSelect.classList.remove('invalid');
    if (yearTrigger) yearTrigger.classList.remove('invalid');

    if (!nameInput.value.trim()) {
      nameInput.classList.add('invalid');
      const badge = document.getElementById('name-validation');
      if (badge) {
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Name is required';
      }
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
      emailInput.classList.add('invalid');
      const badge = document.getElementById('email-validation');
      if (badge) {
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Please enter a valid email format';
      }
      isValid = false;
    }

    if (!deptInput.value.trim()) {
      deptInput.classList.add('invalid');
      const badge = document.getElementById('dept-validation');
      if (badge) {
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Department is required';
      }
      isValid = false;
    }

    if (!yearSelect.value) {
      yearSelect.classList.add('invalid');
      if (yearTrigger) yearTrigger.classList.add('invalid');
      const badge = document.getElementById('year-validation');
      if (badge) {
        badge.className = 'validation-badge error';
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Academic year is required';
      }
      isValid = false;
    }

    return isValid;
  }

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
        this.renderFormSuccess(id, payload.name, true);
      } else {
        await window.studentApi.create(payload);
        this.showToast('Student added successfully');
        this.renderFormSuccess(null, payload.name, false);
      }
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        err.errors.forEach(valErr => {
          if (valErr.field === 'email') {
            emailInput.classList.add('invalid');
            const badge = document.getElementById('email-validation');
            if (badge) {
              badge.className = 'validation-badge error';
              badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${valErr.message}`;
            }
          } else if (valErr.field === 'name') {
            nameInput.classList.add('invalid');
            const badge = document.getElementById('name-validation');
            if (badge) {
              badge.className = 'validation-badge error';
              badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${valErr.message}`;
            }
          } else if (valErr.field === 'department') {
            deptInput.classList.add('invalid');
            const badge = document.getElementById('dept-validation');
            if (badge) {
              badge.className = 'validation-badge error';
              badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${valErr.message}`;
            }
          } else if (valErr.field === 'year') {
            yearSelect.classList.add('invalid');
            const yearTrigger = document.getElementById('year-trigger');
            if (yearTrigger) yearTrigger.classList.add('invalid');
            const badge = document.getElementById('year-validation');
            if (badge) {
              badge.className = 'validation-badge error';
              badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${valErr.message}`;
            }
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

  renderFormSuccess(id, studentName, isEditMode = false) {
    const target = document.getElementById('portal-content-area') || this.viewTarget;
    
    target.innerHTML = `
      <div class="form-wrapper">
        <div class="form-card onboarding-success-screen">
          <div class="success-check-icon">
            <i class="fa-solid fa-check"></i>
          </div>
          <h2 class="success-title">${isEditMode ? 'Profile Updated' : 'Record Enrolled'}</h2>
          <p class="success-desc">
            Student profile for <strong>${studentName}</strong> has been successfully ${isEditMode ? 'updated in' : 'added to'} the secure registry database.
          </p>
          
          <div style="display: flex; gap: 16px; justify-content: center; max-width: 320px; margin: 0 auto;">
            ${isEditMode 
              ? `<a href="#/students" class="btn btn-primary btn-sm">Catalog Directory</a>`
              : `<button type="button" class="btn btn-primary btn-sm" id="btn-success-reset">Register Another</button>
                 <a href="#/students" class="btn btn-secondary btn-sm">Catalog Directory</a>`
            }
          </div>
        </div>
      </div>
    `;
    
    if (!isEditMode) {
      document.getElementById('btn-success-reset').addEventListener('click', () => {
        this.renderAddStudentForm(target);
      });
    }
  }

  /* ==========================================================================
     Authentication Views & Handlers
     ========================================================================== */

  renderUnverifiedLock(target) {
    target.innerHTML = `
      <div style="text-align: center; padding: 80px 24px; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; animation: fadeIn var(--transition-slow) ease;">
        <div class="verification-status-icon error">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h2 class="verification-status-title">Workspace Locked</h2>
        <p class="verification-status-desc">
          Email verification is required to access directory listings, metrics, and registration panels. Please click the button below to resend the activation link to your registered email.
        </p>
        <button class="btn btn-primary" id="btn-lock-resend" style="padding: 12px 24px; font-size: 13px;">Resend Verification Link</button>
      </div>
    `;
    const btnResend = document.getElementById('btn-lock-resend');
    if (btnResend) {
      btnResend.addEventListener('click', async () => {
        try {
          btnResend.disabled = true;
          btnResend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending link...';
          await window.studentApi.resendVerification(this.currentUser.email);
          this.showToast('Verification email resent. Please check your inbox.');
        } catch (err) {
          this.showToast(err.message, 'error');
        } finally {
          btnResend.disabled = false;
          btnResend.innerHTML = 'Resend Verification Link';
        }
      });
    }
  }

  getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  async logout() {
    localStorage.removeItem('campusos_token');
    sessionStorage.removeItem('campusos_token');
    this.currentUser = null;
    this.showToast('Logged out successfully.');
    window.location.hash = '#/login';
  }

  renderLoginPage() {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Welcome Back</h2>
            <p class="auth-subtitle">Sign in to your administrative registry workspace</p>
          </div>
          
          <form id="login-form">
            <div class="form-group">
              <label class="input-label" for="login-email">Email Address</label>
              <input type="email" class="input-field" id="login-email" required placeholder="admin@campusos.edu" autocomplete="username email">
              <div id="login-email-badge" class="validation-badge" style="display:none;"></div>
            </div>
            
            <div class="form-group">
              <label class="input-label" for="login-password">Password</label>
              <div class="password-input-wrapper">
                <input type="password" class="input-field" id="login-password" required placeholder="Enter password" autocomplete="current-password">
                <button type="button" class="btn-toggle-password" id="btn-toggle-login-pass">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="auth-options">
              <label class="checkbox-label">
                <input type="checkbox" id="login-remember">
                <span>Remember me</span>
              </label>
              <a href="#/forgot-password" class="auth-link">Forgot password?</a>
            </div>
            
            <div id="login-error-container" style="display:none; margin-bottom: 16px;"></div>
            
            <button type="submit" class="btn btn-primary" id="btn-login-submit">
              Sign In to Dashboard
            </button>
          </form>
          
          <div class="auth-footer">
            Don't have an account? <a href="#/register" class="auth-link">Register here</a>
          </div>
        </div>
      </div>
    `;

    // Toggle password visibility
    const passInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('btn-toggle-login-pass');
    toggleBtn.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      } else {
        passInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
      }
    });

    // Handle Form Submission
    const form = document.getElementById('login-form');
    const btnSubmit = document.getElementById('btn-login-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = passInput.value;
      const rememberMe = document.getElementById('login-remember').checked;
      const errorContainer = document.getElementById('login-error-container');

      try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        errorContainer.style.display = 'none';

        const res = await window.studentApi.login({ email, password, rememberMe });
        
        if (res.success) {
          if (rememberMe) {
            localStorage.setItem('campusos_token', res.token);
          } else {
            sessionStorage.setItem('campusos_token', res.token);
          }
          this.currentUser = res.data;
          this.showToast('Login successful. Welcome back!');
          window.location.hash = '#/dashboard';
        }
      } catch (err) {
        if (err.status === 403 || (err.message && err.message.includes('verify your email'))) {
          errorContainer.style.display = 'block';
          errorContainer.innerHTML = `
            <div class="auth-error-banner">
              <span>${err.message}</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-login-resend">
                Resend Verification Email
              </button>
            </div>
          `;
          const btnResend = document.getElementById('btn-login-resend');
          btnResend.addEventListener('click', async () => {
            try {
              btnResend.disabled = true;
              btnResend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resending...';
              await window.studentApi.resendVerification(email);
              this.showToast('Verification link resent. Please check your inbox.');
            } catch (resendErr) {
              this.showToast(resendErr.message, 'error');
            } finally {
              btnResend.disabled = false;
              btnResend.innerHTML = 'Resend Verification Email';
            }
          });
        } else {
          errorContainer.style.display = 'none';
          this.showToast(err.message, 'error');
        }
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Sign In to Dashboard';
      }
    });
  }

  renderRegisterPage() {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Create Account</h2>
            <p class="auth-subtitle">Register a new administrative console profile</p>
          </div>
          
          <form id="register-form">
            <div class="form-group">
              <label class="input-label" for="reg-name">Full Name</label>
              <input type="text" class="input-field" id="reg-name" required placeholder="John Doe" autocomplete="name">
            </div>
            
            <div class="form-group">
              <label class="input-label" for="reg-email">Email Address</label>
              <input type="email" class="input-field" id="reg-email" required placeholder="admin@campusos.edu" autocomplete="email">
              <div id="reg-email-badge" class="validation-badge" style="display: none;"></div>
            </div>
            
            <div class="form-group">
              <label class="input-label" for="reg-password">Password</label>
              <div class="password-input-wrapper">
                <input type="password" class="input-field" id="reg-password" required placeholder="Minimum 6 characters" autocomplete="new-password">
                <button type="button" class="btn-toggle-password" id="btn-toggle-reg-pass">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
              <div class="password-strength-container" id="strength-container" style="display:none;">
                <div class="password-strength-bar">
                  <div class="password-strength-progress" id="strength-bar"></div>
                </div>
                <div class="password-strength-text">Password Strength: <span id="strength-label">Weak</span></div>
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary" id="btn-reg-submit">
              Register Account
            </button>
          </form>
          
          <div class="auth-footer">
            Already have an account? <a href="#/login" class="auth-link">Sign in instead</a>
          </div>
        </div>
      </div>
    `;

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-password');
    const toggleBtn = document.getElementById('btn-toggle-reg-pass');
    const strengthContainer = document.getElementById('strength-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthLabel = document.getElementById('strength-label');
    const emailBadge = document.getElementById('reg-email-badge');

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      } else {
        passInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
      }
    });

    // Real-time Email Validation
    emailInput.addEventListener('input', () => {
      const email = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        emailBadge.style.display = 'none';
        emailInput.classList.remove('invalid');
      } else if (emailRegex.test(email)) {
        emailBadge.style.display = 'block';
        emailBadge.className = 'validation-badge valid';
        emailBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Email format valid';
        emailInput.classList.remove('invalid');
      } else {
        emailBadge.style.display = 'block';
        emailBadge.className = 'validation-badge error';
        emailBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Invalid email format';
        emailInput.classList.add('invalid');
      }
    });

    // Real-time Password Strength Check
    passInput.addEventListener('input', () => {
      const val = passInput.value;
      if (!val) {
        strengthContainer.style.display = 'none';
        return;
      }
      strengthContainer.style.display = 'block';

      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 1) {
        strengthBar.style.width = '33%';
        strengthBar.style.backgroundColor = '#ef4444'; // Red
        strengthLabel.textContent = 'Weak';
        strengthLabel.style.color = '#ef4444';
      } else if (score <= 3) {
        strengthBar.style.width = '66%';
        strengthBar.style.backgroundColor = '#f59e0b'; // Amber
        strengthLabel.textContent = 'Medium';
        strengthLabel.style.color = '#f59e0b';
      } else {
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#10b981'; // Green
        strengthLabel.textContent = 'Strong';
        strengthLabel.style.color = '#10b981';
      }
    });

    // Form Submit
    const form = document.getElementById('register-form');
    const btnSubmit = document.getElementById('btn-reg-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passInput.value;

      try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Provisioning account...';

        const res = await window.studentApi.register({ name, email, password });
        if (res.success) {
          this.showToast('Registration successful! Verification email sent.');
          window.location.hash = '#/check-email';
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Register Account';
      }
    });
  }

  renderForgotPasswordPage() {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Recover Password</h2>
            <p class="auth-subtitle">Request an authentication reset transmission link</p>
          </div>
          
          <form id="forgot-form">
            <div class="form-group">
              <label class="input-label" for="forgot-email">Email Address</label>
              <input type="email" class="input-field" id="forgot-email" required placeholder="admin@campusos.edu" autocomplete="email">
            </div>
            
            <button type="submit" class="btn btn-primary" id="btn-forgot-submit">
              Send Recovery Link
            </button>
          </form>
          
          <div class="auth-footer">
            Remembered your credentials? <a href="#/login" class="auth-link">Sign in here</a>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('forgot-form');
    const btnSubmit = document.getElementById('btn-forgot-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();

      try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Triggering recovery...';

        const res = await window.studentApi.forgotPassword(email);
        if (res.success) {
          this.showToast('Password reset email recovery triggered.');
          document.getElementById('forgot-form').innerHTML = `
            <div class="auth-card-notice">
              <div class="verification-status-icon success">
                <i class="fa-solid fa-paper-plane"></i>
              </div>
              <p>An email recovery link has been issued. Please check your inbox to update your password profile.</p>
            </div>
            <a href="#/login" class="btn btn-secondary">Back to Login</a>
          `;
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Send Recovery Link';
      }
    });
  }

  renderResetPasswordPage(token) {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Reset Password</h2>
            <p class="auth-subtitle">Establish new credentials for administrative access</p>
          </div>
          
          <form id="reset-form">
            <div class="form-group">
              <label class="input-label" for="reset-password">New Password</label>
              <div class="password-input-wrapper">
                <input type="password" class="input-field" id="reset-password" required placeholder="Minimum 6 characters" autocomplete="new-password">
                <button type="button" class="btn-toggle-password" id="btn-toggle-reset-pass">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
              <div class="password-strength-container" id="reset-strength-container" style="display:none;">
                <div class="password-strength-bar">
                  <div class="password-strength-progress" id="reset-strength-bar"></div>
                </div>
                <div class="password-strength-text">Password Strength: <span id="reset-strength-label">Weak</span></div>
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary" id="btn-reset-submit">
              Apply New Password
            </button>
          </form>
        </div>
      </div>
    `;

    const passInput = document.getElementById('reset-password');
    const toggleBtn = document.getElementById('btn-toggle-reset-pass');
    const strengthContainer = document.getElementById('reset-strength-container');
    const strengthBar = document.getElementById('reset-strength-bar');
    const strengthLabel = document.getElementById('reset-strength-label');

    toggleBtn.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      } else {
        passInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
      }
    });

    passInput.addEventListener('input', () => {
      const val = passInput.value;
      if (!val) {
        strengthContainer.style.display = 'none';
        return;
      }
      strengthContainer.style.display = 'block';

      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 1) {
        strengthBar.style.width = '33%';
        strengthBar.style.backgroundColor = '#ef4444';
        strengthLabel.textContent = 'Weak';
        strengthLabel.style.color = '#ef4444';
      } else if (score <= 3) {
        strengthBar.style.width = '66%';
        strengthBar.style.backgroundColor = '#f59e0b';
        strengthLabel.textContent = 'Medium';
        strengthLabel.style.color = '#f59e0b';
      } else {
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#10b981';
        strengthLabel.textContent = 'Strong';
        strengthLabel.style.color = '#10b981';
      }
    });

    const form = document.getElementById('reset-form');
    const btnSubmit = document.getElementById('btn-reset-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passInput.value;

      try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving credentials...';

        const res = await window.studentApi.resetPassword(token, password);
        if (res.success) {
          this.showToast('Password reset successful! You can now log in.');
          window.location.hash = '#/login';
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Apply New Password';
      }
    });
  }

  renderCheckEmailPage() {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Check Your Email</h2>
            <p class="auth-subtitle">A verification link has been dispatched to your inbox</p>
          </div>
          
          <div class="auth-card-notice">
            <div class="verification-status-icon success" style="background-color: rgba(16, 185, 129, 0.1); color: rgb(16, 185, 129); border: 1px solid rgba(16, 185, 129, 0.2); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; font-size: 28px;">
              <i class="fa-solid fa-envelope-open-text"></i>
            </div>
            <p style="margin-bottom: 20px;">We have sent an email containing an activation link. Please click on the link to verify your account and unlock access to the Campus.OS workspace.</p>
          </div>
          
          <a href="#/login" class="btn btn-secondary">Back to Sign In</a>
        </div>
      </div>
    `;
  }

  renderVerificationRequiredPage() {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-brand">Campus<span>.OS</span></div>
            <h2 class="auth-title">Verification Required</h2>
            <p class="auth-subtitle">Your email address must be verified first</p>
          </div>
          
          <div class="auth-card-notice">
            <div class="verification-status-icon error" style="background-color: rgba(239, 68, 68, 0.1); color: rgb(239, 68, 68); border: 1px solid rgba(239, 68, 68, 0.2); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; font-size: 28px;">
              <i class="fa-solid fa-envelope-circle-check"></i>
            </div>
            <p style="margin-bottom: 20px;">You cannot access the Campus.OS dashboard, catalog, or registration systems until your email address is verified.</p>
          </div>
          
          <button class="btn btn-primary" id="btn-verification-resend" style="margin-bottom: 12px;">
            Resend Verification Email
          </button>
          
          <a href="#/logout" class="btn btn-secondary">Sign Out</a>
        </div>
      </div>
    `;

    const btnResend = document.getElementById('btn-verification-resend');
    if (btnResend) {
      btnResend.addEventListener('click', async () => {
        try {
          btnResend.disabled = true;
          btnResend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending link...';
          await window.studentApi.resendVerification(this.currentUser.email);
          this.showToast('Verification link resent. Please check your inbox.');
        } catch (err) {
          this.showToast(err.message, 'error');
        } finally {
          btnResend.disabled = false;
          btnResend.innerHTML = 'Resend Verification Email';
        }
      });
    }
  }

  async renderVerifyEmailPage(token) {
    this.viewTarget.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card verification-status-card" id="verification-card">
          <div class="verification-status-icon loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
          </div>
          <h2 class="verification-status-title">Verifying Account</h2>
          <p class="verification-status-desc">Communicating with administrative registry to activate your credentials...</p>
        </div>
      </div>
    `;

    const card = document.getElementById('verification-card');
    try {
      // Artificial delay for smooth experience
      await new Promise(r => setTimeout(r, 1500));
      const res = await window.studentApi.verifyEmail(token);
      if (res.success) {
        if (localStorage.getItem('campusos_token') || sessionStorage.getItem('campusos_token')) {
          await this.checkSession();
        }
        card.innerHTML = `
          <div class="verification-status-icon success">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h2 class="verification-status-title">Account Verified</h2>
          <p class="verification-status-desc">
            Your email address has been successfully verified. Administrative privileges have been activated.
          </p>
          <a href="#/dashboard" class="btn btn-primary">Go to Dashboard</a>
        `;
      }
    } catch (err) {
      card.innerHTML = `
        <div class="verification-status-icon error">
          <i class="fa-solid fa-circle-xmark"></i>
        </div>
        <h2 class="verification-status-title">Verification Failed</h2>
        <p class="verification-status-desc">
          ${err.message || 'The verification link has expired, is invalid, or has already been used.'}
        </p>
        <div class="form-group">
          <a href="#/login" class="btn btn-secondary">Back to Sign In</a>
        </div>
      `;
    }
  }

  renderProfilePage(target) {
    target.innerHTML = `
      <div class="form-wrapper" style="animation: fadeIn var(--transition-slow) ease;">
        <div class="form-card" style="max-width: 480px; margin: 0 auto; padding: 40px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div class="spec-monogram" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid var(--border-glow); background-color: var(--btn-hover-bg); font-family: var(--font-display); font-weight: 700; color: var(--text-main);">
              ${this.getInitials(this.currentUser?.name)}
            </div>
            <h2 style="font-family: var(--font-display); font-weight: 700; color: var(--text-main); margin: 0; font-size: 22px;">${this.currentUser ? this.currentUser.name : 'Administrative User'}</h2>
            <p style="font-family: var(--font-ui); color: var(--text-muted); margin: 4px 0 0 0; font-size: 14px;">${this.currentUser ? this.currentUser.email : ''}</p>
          </div>
          
          <div style="border-top: 1px solid var(--border-glow); border-bottom: 1px solid var(--border-glow); padding: 24px 0; margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center;">
              <span style="font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Verification Status</span>
              <span>${this.currentUser?.is_verified 
                ? '<span class="sidebar-user-verified-badge verified" style="margin-top:0;"><i class="fa-solid fa-circle-check"></i> Verified Account</span>' 
                : '<span class="sidebar-user-verified-badge unverified" style="margin-top:0;"><i class="fa-solid fa-circle-xmark"></i> Unverified Account</span>'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Joined Registry</span>
              <span style="font-family: var(--font-ui); font-size: 13.5px; color: var(--text-main); font-weight: 500;">
                ${this.currentUser ? new Date(this.currentUser.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </span>
            </div>
          </div>
          
          <div style="display: flex; gap: 16px;">
            <a href="#/dashboard" class="btn btn-secondary" style="flex: 1; text-align: center; justify-content: center;">Workspace Directory</a>
            <a href="#/logout" class="btn btn-danger" style="flex: 1; text-align: center; justify-content: center; border: 1px solid rgba(239, 68, 68, 0.4); background-color: rgba(239, 68, 68, 0.05); color: #ef4444;">Sign Out</a>
          </div>
        </div>
      </div>
    `;
  }
}

// Instantiate and bind routing triggers
document.addEventListener('DOMContentLoaded', () => {
  const controller = new AppController();

  window.addEventListener('hashchange', () => controller.handleRoute());
  controller.handleRoute();
});
