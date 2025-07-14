// Navigation functionality
class Navigation {
  constructor() {
    this.currentSection = 'home';
    this.init();
  }

  init() {
    this.initMobileToggle();
    this.initMegaMenu();
    this.initThemeDropdown();
    this.initProfileDropdown();
    this.initClickOutside();
    this.initWindowResize();
    this.initSPANavigation(); // Add SPA functionality
    this.initCategoriesContent(); // Initialize category content management
  }

  // Single Page Application Navigation
  initSPANavigation() {
    // Handle navigation clicks
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
        if (window.innerWidth <= 768) {
          const mainNav = document.getElementById('mainNav');
          const mobileToggle = document.getElementById('mobileToggle');
          const toggleIcon = mobileToggle.querySelector('i');
          
          mainNav.classList.remove('active');
          toggleIcon.className = 'bi-list';
        }
      });
    });

    // Initialize first section
    this.switchContent('home');
  }

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
      }, 150);
    } else {
      // First load - no animation needed
      targetSection.classList.add('active');
      this.currentSection = sectionName;
    }

    // Update page title
    this.updatePageTitle(sectionName);
  }

  updatePageTitle(sectionName) {
    const titles = {
      'home': 'ZedMemes | Home',
      'trending': 'ZedMemes | Trending',
      'likes': 'ZedMemes | Your Likes',
      'uploads': 'ZedMemes | Your Uploads',
      'categories': 'ZedMemes | Categories'
    };
    
    document.title = titles[sectionName] || 'ZedMemes';
  }

  // Mobile Navigation Toggle
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
        if (window.innerWidth <= 768) {
          mainNav.classList.remove('active');
          toggleIcon.className = 'bi-list';
        }
      });
    });
  }

  // Categories Mega Menu
  initMegaMenu() {
    // Main categories toggle
    const categoriesMenu = document.getElementById('categoriesMegaMenu');
    if (!categoriesMenu) return;
    
    const categoriesParent = categoriesMenu.closest('.hs-has-sub-menu');

    categoriesMenu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close all other mega menus
      this.closeAllMegaMenus();
      
      // Toggle current mega menu
      categoriesParent.classList.toggle('active');
    });

    // Sub-menu toggles
    this.initSubMenus();
  }

  initSubMenus() {
    const subMenuItems = document.querySelectorAll('.hs-has-sub-menu .dropdown-item.dropdown-toggle');
    
    subMenuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const parent = item.closest('.hs-has-sub-menu');
        const isMainCategory = parent.closest('.main-nav');
        
        if (isMainCategory) return; // Skip main categories toggle
        
        // Close siblings
        const siblings = parent.parentElement.querySelectorAll(':scope > .hs-has-sub-menu');
        siblings.forEach(sibling => {
          if (sibling !== parent) {
            sibling.classList.remove('active');
          }
        });
        
        // Toggle current submenu
        parent.classList.toggle('active');
      });

      // Add hover functionality for desktop
      if (window.innerWidth > 768) {
        const parent = item.closest('.hs-has-sub-menu');
        
        parent.addEventListener('mouseenter', () => {
          if (!parent.closest('.main-nav')) { // Only for nested submenus
            parent.classList.add('active');
          }
        });

        parent.addEventListener('mouseleave', () => {
          if (!parent.closest('.main-nav')) { // Only for nested submenus
            parent.classList.remove('active');
          }
        });
      }
    });
  }

  closeAllMegaMenus() {
    const allMegaMenus = document.querySelectorAll('.hs-has-sub-menu');
    allMegaMenus.forEach(menu => {
      menu.classList.remove('active');
    });
  }

  // Theme Dropdown
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

  // Profile Dropdown
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

  closeAllDropdowns() {
    const allDropdowns = document.querySelectorAll('.dropdown.active');
    allDropdowns.forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }

  // Click Outside Handler
  initClickOutside() {
    document.addEventListener('click', (e) => {
      const categoriesMenu = document.getElementById('categoriesMegaMenu');
      const themeToggle = document.getElementById('themeToggle');
      const profileToggle = document.getElementById('accountNavbarDropdown');
      
      if (!categoriesMenu || !themeToggle || !profileToggle) return;
      
      const categoriesParent = categoriesMenu.closest('.hs-has-sub-menu');
      const themeParent = themeToggle.closest('.dropdown');
      const profileParent = profileToggle.closest('.dropdown');
      
      // Close categories mega menu if clicked outside
      if (categoriesParent && !categoriesParent.contains(e.target)) {
        this.closeAllMegaMenus();
      }
      
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

  // Window Resize Handler
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

  // Categories Content Management
  initCategoriesContent() {
    // Initialize category hover events for desktop
    if (window.innerWidth > 768) {
      const categoryItems = document.querySelectorAll('.category-nav-item.hs-has-sub-menu');
      
      categoryItems.forEach(item => {
        const submenu = item.querySelector('.category-submenu.hs-sub-menu');
        
        if (submenu) {
          item.addEventListener('mouseenter', () => {
            // Clear any existing timeout
            if (this.categoryTimeout) {
              clearTimeout(this.categoryTimeout);
            }
            // Show submenu
            submenu.style.display = 'block';
          });
          
          item.addEventListener('mouseleave', () => {
            // Add small delay before hiding
            this.categoryTimeout = setTimeout(() => {
              submenu.style.display = 'none';
            }, 100);
          });
        }
      });
    } else {
      // Mobile behavior - toggle on click
      const categoryItems = document.querySelectorAll('.category-nav-item.hs-has-sub-menu');
      
      categoryItems.forEach(item => {
        const link = item.querySelector('.category-nav-link');
        const submenu = item.querySelector('.category-submenu.hs-sub-menu');
        
        if (link && submenu) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle current submenu
            const isActive = item.classList.contains('active');
            
            // Close all other submenus
            categoryItems.forEach(otherItem => {
              otherItem.classList.remove('active');
              const otherSubmenu = otherItem.querySelector('.category-submenu.hs-sub-menu');
              if (otherSubmenu) {
                otherSubmenu.style.display = 'none';
              }
            });
            
            // Toggle current submenu
            if (!isActive) {
              item.classList.add('active');
              submenu.style.display = 'block';
            }
          });
        }
      });
    }
  }
}

// Global function for showing category content
function showCategoryContent(categoryId) {
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
    'gaming-general': {
      title: '🎮 General Gaming',
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
      
      <div class="meme-grid">
        <div class="meme-card">
          <div class="meme-placeholder">
            <i class="bi-image"></i>
            <p>Sample Meme 1</p>
          </div>
          <div class="meme-actions">
            <button class="btn-action"><i class="bi-heart"></i> 234</button>
            <button class="btn-action"><i class="bi-share"></i> Share</button>
          </div>
        </div>
        
        <div class="meme-card">
          <div class="meme-placeholder">
            <i class="bi-image"></i>
            <p>Sample Meme 2</p>
          </div>
          <div class="meme-actions">
            <button class="btn-action"><i class="bi-heart"></i> 456</button>
            <button class="btn-action"><i class="bi-share"></i> Share</button>
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
}

// Global function for external access
function switchContent(sectionName) {
  if (window.navigationInstance) {
    window.navigationInstance.switchContent(sectionName);
  }
}

// Initialize navigation when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.navigationInstance = new Navigation();
  });
} else {
  window.navigationInstance = new Navigation();
}
