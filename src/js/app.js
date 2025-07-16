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
        } else {
          this.showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        this.showToast('Registration error: ' + err.message, 'error');
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
  performSearch(query) {
    console.log('Searching for:', query);
    // TODO: Implement search functionality
    // For now, just show a toast
    this.showToast(`Searching for "${query}"...`);
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
