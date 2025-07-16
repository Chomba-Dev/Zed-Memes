
/**
 * Main Application Entry Point
 */
class ZedMemesApp {
  /**
   * Setup login form handler
   */
  setupLogin() {
    const loginModal = document.getElementById('loginModal');
    if (!loginModal) return;
    const form = loginModal.querySelector('form.ui.form');
    if (!form) return;

    const self = this;

    //Get All buttons
    const loginButtonMobile = document.getElementById('loginBtnMobile');
    const loginButtonDesktop = document.getElementById('loginBtn');
    const signupButtonMobile = document.getElementById('signupBtnMobile');
    const signupButtonDesktop = document.getElementById('signupBtn');
    const accountButton = document.getElementById('accountNavbarDropdown');
    const notificationButton = document.getElementById('notificationNavbarDropdown');

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
      const identifier = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value;

      // Basic validation
      if (!identifier || !password) {
        self.showToast('Please fill in all fields', 'error');
        return;
      }

      // Prepare request
      const payload = {
        identifier: identifier,
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
          // Update UI elements
          if (loginButtonMobile) loginButtonMobile.style.display = 'none';
          if (loginButtonDesktop) loginButtonDesktop.style.display = 'none';
          if (signupButtonMobile) signupButtonMobile.style.display = 'none';
          if (signupButtonDesktop) signupButtonDesktop.style.display = 'none';
          if (accountButton) accountButton.style.display = 'block';
          if (notificationButton) notificationButton.style.display = 'block';
          if (navLikes) navLikes.style.display = '';
          if (navUploads) navUploads.style.display = '';
          self.updateUserProfileUI(data.data.user);
          // Re-initialize profile dropdown if needed (REMOVED to prevent multiple listeners)
          // if (window.navigationInstance && typeof window.navigationInstance.initProfileDropdown === 'function') {
          //   window.navigationInstance.initProfileDropdown();
          // }
          self.showToast('Login successful! Welcome, ' + data.data.user.username, 'success');
          // Optionally close modal (if using jQuery/Semantic UI)
          if (typeof $ !== 'undefined' && $.fn.modal) {
            $('#loginModal').modal('hide');
          }
        } else {
          self.showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        self.showToast('Login error: ' + err.message, 'error');
      }
    });
  }
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

      // Show/hide auth/profile UI based on login state
      const token = localStorage.getItem('zedmemes-token');
      const userStr = localStorage.getItem('zedmemes-user');
      const user = userStr ? JSON.parse(userStr) : null;
      const loginButtonMobile = document.getElementById('loginBtnMobile');
      const loginButtonDesktop = document.getElementById('loginBtn');
      const signupButtonMobile = document.getElementById('signupBtnMobile');
      const signupButtonDesktop = document.getElementById('signupBtn');
      const accountButton = document.getElementById('accountNavbarDropdown');
      const notificationButton = document.getElementById('notificationNavbarDropdown');
      const navLikes = document.getElementById('navLikes');
      const navUploads = document.getElementById('navUploads');
      if (token) {
        if (loginButtonMobile) loginButtonMobile.style.display = 'none';
        if (loginButtonDesktop) loginButtonDesktop.style.display = 'none';
        if (signupButtonMobile) signupButtonMobile.style.display = 'none';
        if (signupButtonDesktop) signupButtonDesktop.style.display = 'none';
        if (accountButton) accountButton.style.display = 'block';
        if (notificationButton) notificationButton.style.display = 'block';
        if (navLikes) navLikes.style.display = '';
        if (navUploads) navUploads.style.display = '';
        this.updateUserProfileUI(user);
      } else {
        if (loginButtonMobile) loginButtonMobile.style.display = '';
        if (loginButtonDesktop) loginButtonDesktop.style.display = '';
        if (signupButtonMobile) signupButtonMobile.style.display = '';
        if (signupButtonDesktop) signupButtonDesktop.style.display = '';
        if (accountButton) accountButton.style.display = 'none';
        if (notificationButton) notificationButton.style.display = 'none';
        if (navLikes) navLikes.style.display = 'none';
        if (navUploads) navUploads.style.display = 'none';
        this.updateUserProfileUI({ username: '', email: '' });
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
   * Log out the current user
   */
  logout() {
    // Clear session info
    localStorage.removeItem('zedmemes-token');
    localStorage.removeItem('zedmemes-user');

    // Update UI elements
    const loginButtonMobile = document.getElementById('loginBtnMobile');
    const loginButtonDesktop = document.getElementById('loginBtn');
    const signupButtonMobile = document.getElementById('signupBtnMobile');
    const signupButtonDesktop = document.getElementById('signupBtn');
    const accountButton = document.getElementById('accountNavbarDropdown');
    const notificationButton = document.getElementById('notificationNavbarDropdown');
    const navLikes = document.getElementById('navLikes');
    const navUploads = document.getElementById('navUploads');

    if (loginButtonMobile) loginButtonMobile.style.display = '';
    if (loginButtonDesktop) loginButtonDesktop.style.display = '';
    if (signupButtonMobile) signupButtonMobile.style.display = '';
    if (signupButtonDesktop) signupButtonDesktop.style.display = '';
    if (accountButton) accountButton.style.display = 'none';
    if (notificationButton) notificationButton.style.display = 'none';
    if (navLikes) navLikes.style.display = 'none';
    if (navUploads) navUploads.style.display = 'none';
    this.updateUserProfileUI({ username: '', email: '' });
    this.showToast('You have been logged out.', 'info');
  }

  /**
   * Initialize components
   */
  initComponents() {
    // Initialize any additional components here
    this.initNotifications();
    this.initKeyboardShortcuts();
    this.initLogoutHandler();
  }

  /**
   * Attach logout handler to account dropdown
   */
  initLogoutHandler() {
    // Find the sign out link in the account dropdown
    const accountDropdown = document.getElementById('accountNavbarDropdown');
    if (!accountDropdown) return;
    const dropdownMenu = accountDropdown.parentElement && accountDropdown.parentElement.querySelector('.dropdown-menu');
    if (!dropdownMenu) return;
    const signOutLink = Array.from(dropdownMenu.querySelectorAll('a.dropdown-item')).find(a => a.textContent && a.textContent.trim().toLowerCase() === 'sign out');
    if (!signOutLink) return;
    signOutLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
      // Optionally close the dropdown if using Semantic UI/jQuery
      if (typeof $ !== 'undefined' && $.fn.dropdown) {
        $(accountDropdown).dropdown('hide');
      }
    });
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
  showToast(message, type = 'info', title = '', icon = '') {
    // If memeManager has a toast, use it
    if (this.memeManager && this.memeManager.showToast) {
      this.memeManager.showToast(message, type, title, icon);
      return;
    }

    // Toast type to color/icon/title
    const typeMap = {
      info:    { color: '#2563eb', icon: 'ℹ️', title: 'Info' },
      success: { color: '#16a34a', icon: '✔️', title: 'Success' },
      warning: { color: '#f59e42', icon: '⚠️', title: 'Warning' },
      error:   { color: '#dc2626', icon: '⛔', title: 'Error' }
    };
    const t = typeMap[type] || typeMap.info;
    const toastTitle = title || t.title;
    const toastIcon = icon || t.icon;
    const toastColor = t.color;

    // Ensure toast container exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.style.position = 'fixed';
      toastContainer.style.bottom = '0';
      toastContainer.style.right = '0';
      toastContainer.style.zIndex = '1055';
      toastContainer.style.padding = '1rem';
      toastContainer.style.maxWidth = '350px';
      toastContainer.style.display = 'flex';
      toastContainer.style.flexDirection = 'column';
      toastContainer.style.gap = '10px';
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.style.minWidth = '250px';
    toast.style.background = '#fff';
    toast.style.border = `1.5px solid ${toastColor}`;
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
    toast.style.overflow = 'hidden';
    toast.style.animation = 'fadeInToast 0.3s';
    toast.style.display = 'flex';
    toast.style.flexDirection = 'column';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;padding:0.5rem 1rem;background:${toastColor};color:#fff;">
        <span style="font-size:1.3em;margin-right:0.5em;">${toastIcon}</span>
        <strong style="flex:1;">${toastTitle}</strong>
        <small style="opacity:0.8;">Just now</small>
        <button type="button" aria-label="Close" style="background:none;border:none;color:#fff;font-size:1.2em;margin-left:0.5em;cursor:pointer;">&times;</button>
      </div>
      <div style="padding:0.75rem 1rem;">${message}</div>
    `;

    // Close button handler
    toast.querySelector('button[aria-label="Close"]').onclick = () => {
      toast.style.animation = 'fadeOutToast 0.3s';
      setTimeout(() => toast.remove(), 300);
    };

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeOutToast 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    // Add keyframes for fade in/out if not present
    if (!document.getElementById('toastKeyframes')) {
      const style = document.createElement('style');
      style.id = 'toastKeyframes';
      style.innerHTML = `
        @keyframes fadeInToast { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes fadeOutToast { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(20px);} }
      `;
      document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);
  }

  // --- END OF showToast ---

  /**
   * Update the user profile UI in the dropdown
   * @param {Object} user - The user object with username and email
   */
  updateUserProfileUI(user) {
    if (!user) return;
    // Get initials from username
    let initials = '';
    if (user.username) {
      const parts = user.username.trim().split(' ');
      initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0][0];
      initials = initials.toUpperCase();
    }
    // Update initials in both avatar spots
    const initialsEl = document.getElementById('profileInitials');
    const initialsDropdownEl = document.getElementById('profileInitialsDropdown');
    if (initialsEl) initialsEl.textContent = initials;
    if (initialsDropdownEl) initialsDropdownEl.textContent = initials;
    // Update name and email
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.textContent = user.username || '';
    if (emailEl) emailEl.textContent = user.email || '';
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
