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
    // Add debugging first
    this.initDropdownDebugging();
    
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
   * Close all mega menus (placeholder for future mega menu functionality)
   */
  closeAllMegaMenus() {
    // Placeholder for mega menu functionality
    console.log('Closing mega menus...');
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
      
      let clickedInsideDropdown = false;
      
      // Check if clicked inside any dropdown
      if (themeParent && themeParent.contains(e.target)) {
        clickedInsideDropdown = true;
      }
      if (profileParent && profileParent.contains(e.target)) {
        clickedInsideDropdown = true;
      }
      
      // If clicked outside all dropdowns, close them all
      if (!clickedInsideDropdown) {
        this.closeAllDropdowns();
      }
    });

    // Prevent dropdown menus from closing when clicking inside them
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
      menu.addEventListener('click', (e) => {
        // Only stop propagation for the menu container, not the items
        if (e.target === menu) {
          e.stopPropagation();
        }
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
    if (!themeToggle) {
      console.error('Theme toggle element not found!');
      return;
    }
    
    const themeParent = themeToggle.closest('.dropdown');
    if (!themeParent) {
      console.error('Theme dropdown parent not found!');
      return;
    }
    
    const themeIcon = themeToggle.querySelector('i');
    console.log('Theme dropdown initialized successfully');

    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Theme toggle clicked!');
      
      // Close other dropdowns first
      this.closeOtherDropdowns(themeParent);
      
      // Toggle this dropdown
      const isActive = themeParent.classList.contains('active');
      themeParent.classList.toggle('active');
      
      console.log('Theme dropdown is now:', isActive ? 'closed' : 'open');
    });

    // Theme selection functionality
    const themeItems = themeParent.querySelectorAll('.dropdown-item');
    console.log('Found theme items:', themeItems.length);

    themeItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const value = item.getAttribute('data-value');
        const icon = item.getAttribute('data-icon');
        
        console.log('Theme selected:', value);
        
        // Update the button icon
        if (themeIcon && icon) {
          themeIcon.className = icon;
        }
        
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
    if (!profileToggle) {
      console.error('Profile toggle element not found!');
      return;
    }
    
    const profileParent = profileToggle.closest('.dropdown');
    if (!profileParent) {
      console.error('Profile dropdown parent not found!');
      return;
    }
    
    console.log('Profile dropdown initialized successfully');

    profileToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Profile toggle clicked!');
      
      // Close other dropdowns first
      this.closeOtherDropdowns(profileParent);
      
      // Toggle this dropdown
      const isActive = profileParent.classList.contains('active');
      profileParent.classList.toggle('active');
      
      console.log('Profile dropdown is now:', isActive ? 'closed' : 'open');
    });

    // Add click handlers for profile menu items
    const profileItems = profileParent.querySelectorAll('.dropdown-item');
    console.log('Found profile items:', profileItems.length);
    
    profileItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const text = item.textContent.trim();
        console.log('Profile menu item clicked:', text);
        
        // Handle different menu items
        switch(text) {
          case 'Profile & account':
            console.log('Opening profile...');
            break;
          case 'Settings':
            console.log('Opening settings...');
            break;
          case 'Sign out':
            console.log('Signing out...');
            break;
        }
        
        // Close dropdown
        profileParent.classList.remove('active');
      });
    });
  }

  /**
   * Close other dropdowns except the specified one
   */
  closeOtherDropdowns(exceptDropdown = null) {
    const allDropdowns = document.querySelectorAll('.dropdown.active');
    allDropdowns.forEach(dropdown => {
      if (dropdown !== exceptDropdown) {
        dropdown.classList.remove('active');
      }
    });
  }

  /**
   * Enhanced dropdown debugging and initialization
   */
  initDropdownDebugging() {
    console.log('Initializing dropdown debugging...');
    
    // Check if elements exist
    const themeToggle = document.getElementById('themeToggle');
    const profileToggle = document.getElementById('accountNavbarDropdown');
    
    console.log('Theme toggle element:', themeToggle);
    console.log('Profile toggle element:', profileToggle);
    
    if (!themeToggle) {
      console.error('Theme toggle not found!');
    }
    
    if (!profileToggle) {
      console.error('Profile toggle not found!');
    }
    
    // Add debugging to see if clicks are being detected
    document.addEventListener('click', (e) => {
      console.log('Click detected on:', e.target);
      if (e.target.closest('#themeToggle')) {
        console.log('Theme toggle clicked!');
      }
      if (e.target.closest('#accountNavbarDropdown')) {
        console.log('Profile toggle clicked!');
      }
    });
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
}
