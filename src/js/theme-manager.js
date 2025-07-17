/**
 * Theme Manager - Handles theme switching and persistence
 */
class ThemeManager {
  constructor() {
    this.currentTheme = 'auto';
    this.init();
  }

  /**
   * Initialize theme manager
   */
  init() {
    this.loadSavedTheme();
    this.setupSystemThemeListener();
    this.applyTheme(this.currentTheme);
  }

  /**
   * Load theme from localStorage
   */
  loadSavedTheme() {
    const savedTheme = localStorage.getItem('zedmemes-theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }
  }

  /**
   * Save theme to localStorage
   * @param {string} theme - Theme to save
   */
  saveTheme(theme) {
    localStorage.setItem('zedmemes-theme', theme);
    this.currentTheme = theme;
  }

  /**
   * Setup system theme change listener
   */
  setupSystemThemeListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  /**
   * Apply theme
   * @param {string} theme - Theme to apply ('light', 'dark', 'auto')
   */
  applyTheme(theme) {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    switch(theme) {
      case 'dark':
        root.classList.add('theme-dark');
        this.setThemeColors('dark');
        break;
      case 'auto':
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('theme-dark');
          this.setThemeColors('dark');
        } else {
          root.classList.add('theme-light');
          this.setThemeColors('light');
        }
        break;
      default: // light
        root.classList.add('theme-light');
        this.setThemeColors('light');
    }
    
    // Update theme toggle button
    this.updateThemeToggle(theme);
    
    // Save theme
    this.saveTheme(theme);
    
    // Dispatch theme change event
    this.dispatchThemeChange(theme);
  }

  /**
   * Set CSS custom properties for theme colors
   * @param {string} mode - 'light' or 'dark'
   */
  setThemeColors(mode) {
    const root = document.documentElement;
    
    if (mode === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#404040');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b3b3b3');
      root.style.setProperty('--text-muted', '#808080');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-tertiary', '#e9ecef');
      root.style.setProperty('--text-primary', '#343a40');
      root.style.setProperty('--text-secondary', '#6c757d');
      root.style.setProperty('--text-muted', '#adb5bd');
      root.style.setProperty('--border-color', '#dee2e6');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
    }
  }

  /**
   * Update theme toggle button icon
   * @param {string} theme - Current theme
   */
  updateThemeToggle(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (!icon) return;
    
    const iconMap = {
      'light': 'bi-brightness-high',
      'dark': 'bi-moon',
      'auto': 'bi-moon-stars'
    };
    
    icon.className = iconMap[theme] || 'bi-moon-stars';
  }

  /**
   * Dispatch theme change event
   * @param {string} theme - New theme
   */
  dispatchThemeChange(theme) {
    const event = new CustomEvent('themeChange', {
      detail: { theme }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current theme
   * @returns {string} Current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
