/**
 * Main Application Entry Point
 */
class ZedMemesApp {
  constructor() {
    this.navigation = null;
    this.themeManager = null;
    this.memeManager = null;
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize core modules
      this.initModules();
      
      // Setup global event listeners
      this.setupGlobalEvents();
      
      // Initialize components
      this.initComponents();

      // Setup registration handler
      this.setupRegistration();
      // Setup login handler
      this.setupLogin();
      // Update auth UI on init
      this.updateAuthUI();
      
      console.log('ZedMemes App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ZedMemes App:', error);
    }
  }
  /**
   * Setup registration form handler
   */
  setupRegistration() {
    const signupModal = document.getElementById('signupModal');
    if (!signupModal) return;
    const form = signupModal.querySelector('form.ui.form');
    if (!form) return;

    // Ensure clicking the modal's Sign Up button submits the form
    const signupBtn = signupModal.querySelector('.ui.positive.button');
    if (signupBtn) {
      signupBtn.addEventListener('click', function (e) {
        e.preventDefault();
        form.requestSubmit();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = form.querySelector('input[name="name"]').value.trim();
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;
      const confirm_password = form.querySelector('input[name="confirm_password"]').value;

      // Basic validation
      if (!username || !email || !password || !confirm_password) {
        this.showToast('Please fill in all fields', 'error');
        return;
      }
      if (password !== confirm_password) {
        this.showToast('Passwords do not match', 'error');
        return;
      }

      // Prepare request
      const payload = {
        username: username,
        email: email,
        password: password,
        confirm_password: confirm_password
      };

      try {
        const response = await fetch('http://localhost/Zed-memes/backend/api/auth.php?action=register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
          // Store session info
          localStorage.setItem('zedmemes-token', data.data.token);
          localStorage.setItem('zedmemes-user', JSON.stringify(data.data.user));
          this.showToast('Registration successful! Welcome, ' + data.data.user.username, 'success');
          // Optionally close modal (if using jQuery/Semantic UI)
          if (typeof $ !== 'undefined' && $.fn.modal) {
            $('#signupModal').modal('hide');
          }
          this.updateAuthUI();
        } else {
          this.showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        this.showToast('Registration error: ' + err.message, 'error');
      }
    });
  }

  /**
   * Setup login form handler
   */
  setupLogin() {
    const loginModal = document.getElementById('loginModal');
    if (!loginModal) return;
    const form = loginModal.querySelector('form.ui.form');
    if (!form) return;

    // Ensure clicking the modal's Login button submits the form
    const loginBtn = loginModal.querySelector('.ui.positive.button');
    if (loginBtn) {
      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        form.requestSubmit();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;

      // Basic validation
      if (!email || !password) {
        this.showToast('Please enter both email and password', 'error');
        return;
      }

      // Prepare request
      const payload = {
        email: email,
        password: password
      };

      try {
        const response = await fetch('http://localhost/Zed-memes/backend/api/auth.php?action=login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
          // Store session info
          localStorage.setItem('zedmemes-token', data.data.token);
          localStorage.setItem('zedmemes-user', JSON.stringify(data.data.user));
          this.showToast('Login successful! Welcome, ' + data.data.user.username, 'success');
          // Optionally close modal (if using jQuery/Semantic UI)
          if (typeof $ !== 'undefined' && $.fn.modal) {
            $('#loginModal').modal('hide');
          }
          this.updateAuthUI();
        } else {
          this.showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        this.showToast('Login error: ' + err.message, 'error');
      }
    });
  }

  /**
   * Initialize core modules
   */
  initModules() {
    // Initialize theme manager first (for proper styling)
    this.themeManager = new ThemeManager();
    
    // Initialize navigation
    this.navigation = new Navigation();
    
    // Initialize meme manager
    this.memeManager = new MemeManager();
    
    // Store instances globally for external access
    window.zedMemesApp = this;
    window.navigationInstance = this.navigation;
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEvents() {
    // Handle search functionality
    this.setupSearch();
    
    // Handle window events
    this.setupWindowEvents();
  }

  /**
   * Setup search functionality
   */
  setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length === 0) return;
      
      searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 500);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchTimeout);
        this.performSearch(e.target.value.trim());
      }
    });
  }

  /**
   * Perform search
   * @param {string} query - Search query
   */
  async performSearch(query) {
    console.log('Searching for:', query);
    
    if (!query || query.trim().length < 2) {
      this.showToast('Please enter at least 2 characters to search');
      return;
    }
    
    try {
      const token = localStorage.getItem('zedmemes-token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`http://localhost/Zed-memes/backend/api/memes.php?action=search_memes&query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Search results:', data.data.length);
        // Update the current grid with search results
        const currentGrid = document.querySelector('.meme-grid.active') || document.getElementById('homeMemeGrid');
        if (currentGrid && this.memeManager) {
          this.memeManager.renderMemeGrid(currentGrid, data.data);
        }
      } else {
        console.error('Search failed:', data.message);
        this.showToast('Search failed. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showToast('Search failed. Please try again.');
    }
  }

  /**
   * Setup window events
   */
  setupWindowEvents() {
    // Handle online/offline status
    window.addEventListener('online', () => {
      this.showToast('Connection restored');
    });

    window.addEventListener('offline', () => {
      this.showToast('You are offline');
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // App became visible - could refresh data
        console.log('App became visible');
      }
    });
  }

  /**
   * Initialize components
   */
  initComponents() {
    // Initialize any additional components here
    this.initNotifications();
    this.initKeyboardShortcuts();
  }

  /**
   * Initialize notifications
   */
  initNotifications() {
    const notificationBtn = document.getElementById('notificationBtn');
    if (!notificationBtn) return;

    notificationBtn.addEventListener('click', () => {
      this.showToast('Notifications feature coming soon!');
    });
  }

  /**
   * Initialize keyboard shortcuts
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case '1':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.navigation.switchContent('home');
          }
          break;
        case '2':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.navigation.switchContent('trending');
          }
          break;
        case '3':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.navigation.switchContent('likes');
          }
          break;
        case '4':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.navigation.switchContent('uploads');
          }
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case 'Escape':
          // Close all dropdowns and menus
          this.navigation.closeAllDropdowns();
          this.navigation.closeAllMegaMenus();
          break;
      }
    });
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type ('info', 'success', 'warning', 'error')
   */
  showToast(message, type = 'info') {
    if (this.memeManager && this.memeManager.showToast) {
      this.memeManager.showToast(message);
    } else {
      console.log(`Toast: ${message}`);
    }
  }

  /**
   * Update the UI based on authentication state
   */
  updateAuthUI() {
    const token = localStorage.getItem('zedmemes-token');
    const user = localStorage.getItem('zedmemes-user') ? JSON.parse(localStorage.getItem('zedmemes-user')) : null;
    // Desktop auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    // Mobile auth buttons
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    const signupBtnMobile = document.getElementById('signupBtnMobile');
    // User profile dropdown (desktop)
    const profileNavItem = document.querySelector('.navbar-nav .nav-item[style*="display: none;"]');
    // Profile dropdown in menu
    const profileDropdown = profileNavItem ? profileNavItem : null;
    // Show/hide auth buttons and profile
    if (token && user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (loginBtnMobile) loginBtnMobile.style.display = 'none';
      if (signupBtnMobile) signupBtnMobile.style.display = 'none';
      if (profileNavItem) profileNavItem.style.display = '';
      // Set user info in dropdown if present
      if (profileDropdown) {
        const nameEl = profileDropdown.querySelector('h5.mb-0');
        const emailEl = profileDropdown.querySelector('p.card-text');
        const initialsEl = profileDropdown.querySelectorAll('.avatar-initials');
        if (nameEl) nameEl.textContent = user.username || user.name || user.email;
        if (emailEl) emailEl.textContent = user.email;
        if (initialsEl && initialsEl.length) {
          const initials = (user.username || user.name || user.email || '?').split(' ').map(w => w[0]).join('').toUpperCase();
          initialsEl.forEach(el => el.textContent = initials);
        }
      }
    } else {
      if (loginBtn) loginBtn.style.display = '';
      if (signupBtn) signupBtn.style.display = '';
      if (loginBtnMobile) loginBtnMobile.style.display = '';
      if (signupBtnMobile) signupBtnMobile.style.display = '';
      if (profileNavItem) profileNavItem.style.display = 'none';
    }
    // Hook up logout button
    const logoutBtn = document.querySelector('.navbar-dropdown-account a.dropdown-item[href="#"]:last-child');
    if (logoutBtn) {
      logoutBtn.removeEventListener('click', this._logoutHandler);
      this._logoutHandler = (e) => {
        e.preventDefault();
        this.logout();
      };
      logoutBtn.addEventListener('click', this._logoutHandler);
    }
  }

  /**
   * Logout the user
   */
  logout() {
    localStorage.removeItem('zedmemes-token');
    localStorage.removeItem('zedmemes-user');
    this.showToast('You have been logged out', 'info');
    this.updateAuthUI();
    // Optionally reload the page or redirect to home
    // location.reload();
  }

  /**
   * Get app instance
   * @returns {ZedMemesApp} App instance
   */
  static getInstance() {
    return window.zedMemesApp;
  }
}

// Global functions for backward compatibility
window.switchContent = function(sectionName) {
  const app = ZedMemesApp.getInstance();
  if (app && app.navigation) {
    app.navigation.switchContent(sectionName);
  }
};

window.showCategoryContent = function(categoryId) {
  // Categories feature has been removed
  console.log('Categories feature has been removed');
};

// Initialize the app
const app = new ZedMemesApp();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZedMemesApp;
}
