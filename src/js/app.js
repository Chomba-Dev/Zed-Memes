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
      
      console.log('ZedMemes App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ZedMemes App:', error);
    }
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
    
    // Handle category quick navigation
    this.setupCategoryQuickNav();
    
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
   * Setup category quick navigation
   */
  setupCategoryQuickNav() {
    const categoryLinks = document.querySelectorAll('.category-quick-link');
    
    categoryLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-category');
        
        if (category === 'all') {
          // Switch to categories section
          this.navigation.switchContent('categories');
        } else {
          // Switch to categories section and show specific category
          this.navigation.switchContent('categories');
          setTimeout(() => {
            this.showCategoryContent(category);
          }, 200);
        }
      });
    });
  }

  /**
   * Show category content
   * @param {string} categoryId - Category ID to show
   */
  showCategoryContent(categoryId) {
    // This function is exposed globally for backward compatibility
    window.showCategoryContent(categoryId);
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
        case '5':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.navigation.switchContent('categories');
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
  const contentArea = document.getElementById('category-content-area');
  if (!contentArea) return;

  // Category content data
  const categories = {
    'funny': {
      title: '😂 Funny Memes',
      description: 'The funniest memes that will make you laugh out loud',
      stats: [
        { label: 'Total Memes', value: '12,345' },
        { label: 'Daily Posts', value: '234' },
        { label: 'Likes Today', value: '45.6k' }
      ]
    },
    'wholesome': {
      title: '🥰 Wholesome Memes',
      description: 'Feel-good memes that warm your heart',
      stats: [
        { label: 'Total Memes', value: '8,756' },
        { label: 'Daily Posts', value: '123' },
        { label: 'Likes Today', value: '23.4k' }
      ]
    },
    'dank': {
      title: '🔥 Dank Memes',
      description: 'The spiciest and most savage memes',
      stats: [
        { label: 'Total Memes', value: '15,234' },
        { label: 'Daily Posts', value: '456' },
        { label: 'Likes Today', value: '67.8k' }
      ]
    },
    'gaming': {
      title: '🎮 Gaming Memes',
      description: 'Memes about gaming culture and experiences',
      stats: [
        { label: 'Total Memes', value: '9,456' },
        { label: 'Daily Posts', value: '189' },
        { label: 'Likes Today', value: '34.2k' }
      ]
    },
    'all': {
      title: '📋 All Categories',
      description: 'Browse all available meme categories',
      stats: [
        { label: 'Total Categories', value: '25' },
        { label: 'Total Memes', value: '156k' },
        { label: 'Active Users', value: '89.3k' }
      ]
    }
  };

  const category = categories[categoryId] || {
    title: '🎯 ' + categoryId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Explore this exciting meme category',
    stats: [
      { label: 'Total Memes', value: '1,234' },
      { label: 'Daily Posts', value: '56' },
      { label: 'Likes Today', value: '12.3k' }
    ]
  };

  // Create content HTML
  const contentHTML = `
    <div class="category-display active">
      <div class="category-header">
        <h2>${category.title}</h2>
        <p>${category.description}</p>
      </div>
      
      <div class="category-stats">
        ${category.stats.map(stat => `
          <div class="category-stat">
            <h4>${stat.value}</h4>
            <p>${stat.label}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="meme-grid" data-grid-type="default">
        <!-- Sample meme cards -->
        <div class="meme-card">
          <div class="meme-image-container">
            <div class="meme-placeholder">
              <i class="bi-image"></i>
              <p>Sample Meme 1</p>
            </div>
          </div>
          <div class="meme-content">
            <div class="meme-title">
              <h4>Sample Meme 1</h4>
              <span class="meme-category">${categoryId}</span>
            </div>
            <div class="meme-actions">
              <button class="btn-action meme-like-btn"><i class="bi-heart"></i> 234</button>
              <button class="btn-action meme-share-btn"><i class="bi-share"></i> Share</button>
            </div>
          </div>
        </div>
        
        <div class="meme-card">
          <div class="meme-image-container">
            <div class="meme-placeholder">
              <i class="bi-image"></i>
              <p>Sample Meme 2</p>
            </div>
          </div>
          <div class="meme-content">
            <div class="meme-title">
              <h4>Sample Meme 2</h4>
              <span class="meme-category">${categoryId}</span>
            </div>
            <div class="meme-actions">
              <button class="btn-action meme-like-btn"><i class="bi-heart"></i> 456</button>
              <button class="btn-action meme-share-btn"><i class="bi-share"></i> Share</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update content with fade effect
  contentArea.style.opacity = '0';
  
  setTimeout(() => {
    contentArea.innerHTML = contentHTML;
    contentArea.style.opacity = '1';
  }, 150);
};

// Initialize the app
const app = new ZedMemesApp();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZedMemesApp;
}
