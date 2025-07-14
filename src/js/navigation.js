/**
 * Navigation Class - Handles all navigation functionality
 */
class Navigation {
  constructor() {
    this.currentSection = 'home';
    this.init();
  }

  /**
   * Initialize all navigation components
   */
  init() {
    this.initMobileToggle();
    this.initThemeDropdown();
    this.initProfileDropdown();
    this.initClickOutside();
    this.initWindowResize();
    this.initSPANavigation();
  }

  /**
   * Single Page Application Navigation
   */
  initSPANavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-content]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = link.getAttribute('data-content');
        this.switchContent(targetSection);
        
        // Update active state
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Close mobile menu if open
        this.closeMobileMenu();
      });
    });

    // Initialize first section
    this.switchContent('home');
  }

  /**
   * Switch between content sections
   * @param {string} sectionName - Name of the section to switch to
   */
  switchContent(sectionName) {
    const currentSection = document.querySelector('.content-section.active');
    const targetSection = document.getElementById(`${sectionName}-content`);
    
    if (!targetSection || this.currentSection === sectionName) return;
    
    // Add slide-out class to current section
    if (currentSection) {
      currentSection.classList.add('slide-out');
      
      // Wait for slide-out animation, then hide and show new section
      setTimeout(() => {
        currentSection.classList.remove('active', 'slide-out');
        
        // Show target section with slide-in animation
        targetSection.classList.add('active');
        
        // Force reflow to ensure animation works
        targetSection.offsetHeight;
        
        this.currentSection = sectionName;
        
        // Dispatch custom event for section change
        this.dispatchSectionChange(sectionName);
      }, 150);
    } else {
      // First load - no animation needed
      targetSection.classList.add('active');
      this.currentSection = sectionName;
      this.dispatchSectionChange(sectionName);
    }

    // Update page title
    this.updatePageTitle(sectionName);
  }

  /**
   * Update page title based on section
   * @param {string} sectionName - Current section name
   */
  updatePageTitle(sectionName) {
    const titles = {
      'home': 'ZedMemes | Home',
      'trending': 'ZedMemes | Trending',
      'likes': 'ZedMemes | Your Likes',
      'uploads': 'ZedMemes | Your Uploads'
    };
    
    document.title = titles[sectionName] || 'ZedMemes';
  }

  /**
   * Dispatch section change event
   * @param {string} sectionName - New section name
   */
  dispatchSectionChange(sectionName) {
    const event = new CustomEvent('sectionChange', {
      detail: { section: sectionName }
    });
    document.dispatchEvent(event);
  }

  /**
   * Close mobile navigation menu
   */
  closeMobileMenu() {
    if (window.innerWidth <= 768) {
      const mainNav = document.getElementById('mainNav');
      const mobileToggle = document.getElementById('mobileToggle');
      const toggleIcon = mobileToggle?.querySelector('i');
      
      if (mainNav && toggleIcon) {
        mainNav.classList.remove('active');
        toggleIcon.className = 'bi-list';
      }
    }
  }

  /**
   * Mobile Navigation Toggle
   */
  initMobileToggle() {
    const mobileToggle = document.getElementById('mobileToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (!mobileToggle || !mainNav) return;
    
    const toggleIcon = mobileToggle.querySelector('i');

    mobileToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      
      if (mainNav.classList.contains('active')) {
        toggleIcon.className = 'bi-x';
      } else {
        toggleIcon.className = 'bi-list';
      }
    });

    // Close mobile menu when clicking on nav links
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    });
  }

  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    const allDropdowns = document.querySelectorAll('.dropdown.active');
    allDropdowns.forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }

  /**
   * Click Outside Handler
   */
  initClickOutside() {
    document.addEventListener('click', (e) => {
      const themeToggle = document.getElementById('themeToggle');
      const profileToggle = document.getElementById('accountNavbarDropdown');
      
      if (!themeToggle || !profileToggle) return;
      
      const themeParent = themeToggle.closest('.dropdown');
      const profileParent = profileToggle.closest('.dropdown');
      
      // Close theme dropdown if clicked outside
      if (themeParent && !themeParent.contains(e.target)) {
        themeParent.classList.remove('active');
      }
      
      // Close profile dropdown if clicked outside
      if (profileParent && !profileParent.contains(e.target)) {
        profileParent.classList.remove('active');
      }
    });

    // Prevent dropdown menus from closing when clicking inside them
    const dropdownMenus = document.querySelectorAll('.dropdown-menu, .hs-sub-menu');
    dropdownMenus.forEach(menu => {
      menu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }

  /**
   * Window Resize Handler
   */
  initWindowResize() {
    window.addEventListener('resize', () => {
      const mainNav = document.getElementById('mainNav');
      const mobileToggle = document.getElementById('mobileToggle');
      
      if (!mainNav || !mobileToggle) return;
      
      const toggleIcon = mobileToggle.querySelector('i');
      
      if (window.innerWidth > 768) {
        mainNav.classList.remove('active');
        if (toggleIcon) {
          toggleIcon.className = 'bi-list';
        }
        // Reinitialize hover effects for desktop
        this.initSubMenus();
      }
    });
  }

  /**
   * Initialize theme dropdown
   */
  initThemeDropdown() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const themeParent = themeToggle.closest('.dropdown');
    const themeIcon = themeToggle.querySelector('i');

    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close other dropdowns
      this.closeAllDropdowns();
      this.closeAllMegaMenus();
      
      themeParent.classList.toggle('active');
    });

    // Theme selection functionality
    const themeItems = themeParent.querySelectorAll('.dropdown-item');

    themeItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const value = item.getAttribute('data-value');
        const icon = item.getAttribute('data-icon');
        
        // Update the button icon
        themeIcon.className = icon;
        
        // Apply theme
        this.applyTheme(value);
        
        // Close dropdown
        themeParent.classList.remove('active');
      });
    });
  }

  /**
   * Apply theme
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    switch(theme) {
      case 'dark':
        document.body.style.background = '#1a1a1a';
        document.body.style.color = 'white';
        break;
      case 'auto':
        // Detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.body.style.background = '#1a1a1a';
          document.body.style.color = 'white';
        } else {
          document.body.style.background = '#f8f9fa';
          document.body.style.color = 'initial';
        }
        break;
      default: // light
        document.body.style.background = '#f8f9fa';
        document.body.style.color = 'initial';
    }
  }

  /**
   * Initialize profile dropdown
   */
  initProfileDropdown() {
    const profileToggle = document.getElementById('accountNavbarDropdown');
    if (!profileToggle) return;
    
    const profileParent = profileToggle.closest('.dropdown');

    profileToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close other dropdowns
      this.closeAllDropdowns();
      this.closeAllMegaMenus();
      
      profileParent.classList.toggle('active');
    });
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
}
