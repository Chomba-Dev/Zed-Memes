/**
 * Meme Manager - Handles meme loading, interactions, and grid management
 */
class MemeManager {
  constructor() {
    this.memes = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.isLoading = false;
    this.currentFilter = 'all';
    this.currentSort = 'latest';
    this.likedMemes = new Set();
    this.savedMemes = new Set();
    this.init();
  }

  /**
   * Initialize meme manager
   */
  init() {
    console.log('Initializing MemeManager...');
    this.loadSavedInteractions();
    this.setupEventListeners();
    console.log('About to load home memes...');
    this.loadHomeMemes(); // Load home memes on initialization
    console.log('MemeManager initialization complete');
  }

  /**
   * Load saved likes and saves from localStorage
   */
  loadSavedInteractions() {
    const liked = localStorage.getItem('zedmemes-liked');
    const saved = localStorage.getItem('zedmemes-saved');
    
    if (liked) {
      this.likedMemes = new Set(JSON.parse(liked));
    }
    
    if (saved) {
      this.savedMemes = new Set(JSON.parse(saved));
    }
  }

  /**
   * Save interactions to localStorage
   */
  saveInteractions() {
    localStorage.setItem('zedmemes-liked', JSON.stringify([...this.likedMemes]));
    localStorage.setItem('zedmemes-saved', JSON.stringify([...this.savedMemes]));
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for section changes
    document.addEventListener('sectionChange', (e) => {
      this.handleSectionChange(e.detail.section);
    });

    // Listen for meme interactions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.meme-like-btn')) {
        e.preventDefault();
        this.handleLike(e.target.closest('.meme-like-btn'));
      }
      
      if (e.target.closest('.meme-save-btn')) {
        e.preventDefault();
        this.handleSave(e.target.closest('.meme-save-btn'));
      }
      
      if (e.target.closest('.meme-share-btn')) {
        e.preventDefault();
        this.handleShare(e.target.closest('.meme-share-btn'));
      }
    });
  }

  /**
   * Handle section changes
   * @param {string} section - New section
   */
  handleSectionChange(section) {
    switch (section) {
      case 'home':
        this.loadHomeMemes();
        break;
      case 'trending':
        this.loadTrendingMemes();
        break;
      case 'likes':
        this.loadLikedMemes();
        break;
      case 'uploads':
        this.loadUserUploads();
        break;
    }
  }

  /**
   * Load memes for home section
   */
  loadHomeMemes() {
    console.log('Loading home memes...');
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) {
      console.error('Home meme grid not found!');
      return;
    }
    
    console.log('Home meme grid found, generating memes...');
    this.currentFilter = 'featured';
    const memes = this.generateSampleMemes(20);
    console.log('Generated memes:', memes.length);
    this.renderMemeGrid(grid, memes);
  }

  /**
   * Load trending memes
   */
  loadTrendingMemes() {
    const grid = document.querySelector('#trending-content .meme-grid');
    if (!grid) return;
    
    this.currentFilter = 'trending';
    this.renderMemeGrid(grid, this.generateSampleMemes(20, 'trending'));
  }

  /**
   * Load liked memes
   */
  loadLikedMemes() {
    const grid = document.querySelector('#likes-content .meme-grid');
    if (!grid) return;
    
    // Show the same grid for likes section
    this.currentFilter = 'liked';
    this.renderMemeGrid(grid, this.generateSampleMemes(20, 'liked'));
  }

  /**
   * Load user uploads
   */
  loadUserUploads() {
    const grid = document.querySelector('#uploads-content .meme-grid');
    if (!grid) return;
    
    // Show the same grid for uploads section
    this.currentFilter = 'uploads';
    this.renderMemeGrid(grid, this.generateSampleMemes(20, 'uploads'));
  }

  /**
   * Generate sample memes for demo
   * @param {number} count - Number of memes to generate
   * @param {string} type - Type of memes
   * @returns {Array} Sample memes array
   */
  generateSampleMemes(count = 12, type = 'default') {
    const cardData = [
      {
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        title: "Team Collaboration",
        likes: 53,
        views: "2.2k"
      },
      {
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Modern Workspace",
        likes: 87,
        views: "3.4k"
      },
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Business Meeting",
        likes: 42,
        views: "1.8k"
      },
      {
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Tech Innovation",
        likes: 96,
        views: "4.1k"
      },
      {
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Digital Strategy",
        likes: 71,
        views: "2.9k"
      },
      {
        image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Creative Process",
        likes: 38,
        views: "1.5k"
      },
      {
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Data Analytics",
        likes: 124,
        views: "5.2k"
      },
      {
        image: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Startup Culture",
        likes: 67,
        views: "2.7k"
      },
      {
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Remote Work",
        likes: 89,
        views: "3.6k"
      },
      {
        image: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Office Design",
        likes: 55,
        views: "2.1k"
      },
      {
        image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Product Launch",
        likes: 103,
        views: "4.5k"
      },
      {
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Brand Strategy",
        likes: 76,
        views: "3.1k"
      },
      {
        image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Marketing Campaign",
        likes: 91,
        views: "3.8k"
      },
      {
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Growth Hacking",
        likes: 62,
        views: "2.4k"
      },
      {
        image: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "User Experience",
        likes: 84,
        views: "3.3k"
      },
      {
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Digital Transformation",
        likes: 118,
        views: "4.9k"
      },
      {
        image: "https://images.unsplash.com/photo-1552664688-cf412ec27db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Team Building",
        likes: 47,
        views: "1.9k"
      },
      {
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Leadership",
        likes: 79,
        views: "3.2k"
      },
      {
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Future of Work",
        likes: 112,
        views: "4.7k"
      }
    ];
    
    const memes = [];
    
    for (let i = 0; i < count; i++) {
      const sourceData = cardData[i % cardData.length];
      const id = `meme-${type}-${i + 1}`;
      
      memes.push({
        id,
        title: sourceData.title,
        likes: sourceData.likes,
        views: sourceData.views,
        image: sourceData.image,
        isLiked: this.likedMemes.has(id),
        isSaved: this.savedMemes.has(id),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
    
    return memes;
  }

  /**
   * Render meme grid
   * @param {HTMLElement} container - Grid container
   * @param {Array} memes - Memes to render
   */
  renderMemeGrid(container, memes) {
    console.log('Rendering meme grid:', container, memes.length);
    if (!container) {
      console.error('Container not found for rendering grid');
      return;
    }
    
    container.innerHTML = '';
    container.classList.remove('loading');
    
    if (memes.length === 0) {
      console.log('No memes to render, showing empty state');
      this.showEmptyState(container, 'No memes found', 'Try adjusting your filters or check back later.');
      return;
    }
    
    console.log('Creating meme cards...');
    memes.forEach(meme => {
      const memeCard = this.createMemeCard(meme);
      container.appendChild(memeCard);
    });
    
    console.log('Meme grid rendered successfully');
  }

  /**
   * Create meme card element
   * @param {Object} meme - Meme data
   * @returns {HTMLElement} Meme card element
   */
  createMemeCard(meme) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'four wide column';
    
    cardDiv.innerHTML = `
      <div class="meme-thumbnail js-thumbnail meme-thumbnail-container">
        <div class="js-thumbnail-base meme-thumbnail-base disabled-meme-section meme-card" data-meme-id="${meme.id}">
          <figure class="js-thumbnail-placeholder meme-thumbnail-placeholder">
            <img src="${meme.image}" alt="${meme.title}">
          </figure>

          <div class="meme-thumbnail-overlay">
            <div class="meme-thumbnail-overlay-content">
              <ul class="meme-actions-container">
                <li class="meme-action">
                  <a class="btn2 btn2--circle btn2--secondary-alt" title="Download" href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
                      <path d="M8 1v8m0 0L5 6m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </li>
                <li class="meme-action">
                  <a class="btn2 btn2--secondary-alt btn2--circle" title="Share" href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
                      <path d="M4 8a2 2 0 100-4 2 2 0 000 4zM12 8a2 2 0 100-4 2 2 0 000 4zM8 14a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10.5 6.5L5.5 9.5M5.5 4.5L10.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="meme-details-container">
          <div class="user-information">
            <div class="photo">ZM</div>
            <span class="display-name">ZedMemes</span>
            <div class="meme-statistic">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img" class="meme-tools-icon">
                <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" fill="currentColor"/>
              </svg>
              <span>${meme.likes}</span>
            </div>
            <div class="meme-statistic">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img" class="meme-tools-icon">
                <path d="M10.7408 2C13.0889 2 14.6667 4.235 14.6667 6.32C14.6667 10.5425 8.11856 14 8.00004 14C7.88152 14 1.33337 10.5425 1.33337 6.32C1.33337 4.235 2.91115 2 5.2593 2C6.60745 2 7.48893 2.6825 8.00004 3.2825C8.51115 2.6825 9.39263 2 10.7408 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              <span>${meme.views}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return cardDiv;
  }

  /**
   * Handle like action
   * @param {HTMLElement} button - Like button element
   */
  handleLike(button) {
    const memeId = button.getAttribute('data-meme-id');
    const icon = button.querySelector('i');
    const countSpan = button.querySelector('.like-count');
    const card = button.closest('.meme-card');
    
    if (this.likedMemes.has(memeId)) {
      // Unlike
      this.likedMemes.delete(memeId);
      button.classList.remove('liked');
      icon.className = 'bi-heart';
      card.classList.remove('liked');
      
      // Decrease count
      const currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, ''));
      countSpan.textContent = this.formatNumber(currentCount - 1);
    } else {
      // Like
      this.likedMemes.add(memeId);
      button.classList.add('liked');
      icon.className = 'bi-heart-fill';
      card.classList.add('liked');
      
      // Increase count
      const currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, ''));
      countSpan.textContent = this.formatNumber(currentCount + 1);
      
      // Add animation
      button.style.transform = 'scale(1.2)';
      setTimeout(() => {
        button.style.transform = '';
      }, 200);
    }
    
    this.saveInteractions();
  }

  /**
   * Handle save action
   * @param {HTMLElement} button - Save button element
   */
  handleSave(button) {
    const memeId = button.getAttribute('data-meme-id');
    const icon = button.querySelector('i');
    const card = button.closest('.meme-card');
    
    if (this.savedMemes.has(memeId)) {
      // Unsave
      this.savedMemes.delete(memeId);
      button.classList.remove('saved');
      icon.className = 'bi-bookmark';
      card.classList.remove('saved');
    } else {
      // Save
      this.savedMemes.add(memeId);
      button.classList.add('saved');
      icon.className = 'bi-bookmark-fill';
      card.classList.add('saved');
      
      // Add animation
      button.style.transform = 'scale(1.1)';
      setTimeout(() => {
        button.style.transform = '';
      }, 200);
    }
    
    this.saveInteractions();
  }

  /**
   * Handle share action
   * @param {HTMLElement} button - Share button element
   */
  handleShare(button) {
    const memeId = button.getAttribute('data-meme-id');
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this meme!',
        text: 'Found this hilarious meme on ZedMemes',
        url: `${window.location.origin}/meme/${memeId}`
      }).catch(console.error);
    } else {
      // Fallback to clipboard
      const url = `${window.location.origin}/meme/${memeId}`;
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Link copied to clipboard!');
      }).catch(() => {
        this.showToast('Unable to copy link');
      });
    }
  }

  /**
   * Show empty state
   * @param {HTMLElement} container - Container element
   * @param {string} title - Empty state title
   * @param {string} message - Empty state message
   */
  showEmptyState(container, title, message) {
    container.innerHTML = `
      <div class="meme-grid-empty">
        <i class="bi-emoji-frown"></i>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Format number for display
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #343a40;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      z-index: 9999;
      transform: translateY(100px);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  /**
   * Load more memes (for infinite scroll)
   */
  loadMoreMemes() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.currentPage++;
    
    // Simulate API call
    setTimeout(() => {
      const newMemes = this.generateSampleMemes(this.itemsPerPage);
      this.memes.push(...newMemes);
      this.isLoading = false;
    }, 1000);
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemeManager;
}
