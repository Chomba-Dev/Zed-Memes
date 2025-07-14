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
    this.loadSavedInteractions();
    this.setupEventListeners();
    this.loadMemes();
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
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) return;
    
    this.currentFilter = 'featured';
    this.renderMemeGrid(grid, this.generateSampleMemes(6));
  }

  /**
   * Load trending memes
   */
  loadTrendingMemes() {
    const grid = document.querySelector('#trending-content .meme-grid');
    if (!grid) return;
    
    this.currentFilter = 'trending';
    this.renderMemeGrid(grid, this.generateSampleMemes(12, 'trending'));
  }

  /**
   * Load liked memes
   */
  loadLikedMemes() {
    const grid = document.querySelector('#likes-content .meme-grid');
    if (!grid) return;
    
    const likedMemesData = this.memes.filter(meme => 
      this.likedMemes.has(meme.id)
    );
    
    if (likedMemesData.length === 0) {
      this.showEmptyState(grid, 'No liked memes yet', 'Start exploring and heart your favorite memes!');
    } else {
      this.renderMemeGrid(grid, likedMemesData);
    }
  }

  /**
   * Load user uploads
   */
  loadUserUploads() {
    const grid = document.querySelector('#uploads-content .meme-grid');
    if (!grid) return;
    
    // For demo purposes, show empty state
    this.showEmptyState(grid, 'No uploads yet', 'Share your first meme and become a creator!');
  }

  /**
   * Generate sample memes for demo
   * @param {number} count - Number of memes to generate
   * @param {string} type - Type of memes
   * @returns {Array} Sample memes array
   */
  generateSampleMemes(count = 12, type = 'default') {
    const memes = [];
    
    for (let i = 1; i <= count; i++) {
      const id = `meme-${type}-${i}`;
      const likes = Math.floor(Math.random() * 2000) + 50;
      
      memes.push({
        id,
        title: `${type === 'trending' ? 'Trending' : 'Sample'} Meme ${i}`,
        likes,
        image: null, // Will use placeholder
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
    if (!container) return;
    
    container.innerHTML = '';
    container.classList.remove('loading');
    
    if (memes.length === 0) {
      this.showEmptyState(container, 'No memes found', 'Try adjusting your filters or check back later.');
      return;
    }
    
    memes.forEach(meme => {
      const memeCard = this.createMemeCard(meme);
      container.appendChild(memeCard);
    });
  }

  /**
   * Create meme card element
   * @param {Object} meme - Meme data
   * @returns {HTMLElement} Meme card element
   */
  createMemeCard(meme) {
    const card = document.createElement('div');
    card.className = 'meme-card';
    card.setAttribute('data-meme-id', meme.id);
    
    if (meme.isLiked) card.classList.add('liked');
    if (meme.isSaved) card.classList.add('saved');
    
    card.innerHTML = `
      <div class="meme-image-container">
        ${meme.image ? 
          `<img class="meme-image" src="${meme.image}" alt="${meme.title}" loading="lazy">` :
          `<div class="meme-placeholder">
            <i class="bi-image"></i>
            <p>${meme.title}</p>
          </div>`
        }
      </div>
      
      <div class="meme-content">
        <div class="meme-title">
          <h4>${meme.title}</h4>
        </div>
        
        <div class="meme-actions">
          <button class="btn-action meme-like-btn ${meme.isLiked ? 'liked' : ''}" data-action="like" data-meme-id="${meme.id}">
            <i class="bi-heart${meme.isLiked ? '-fill' : ''}"></i>
            <span class="like-count">${this.formatNumber(meme.likes)}</span>
          </button>
          
          <button class="btn-action meme-share-btn" data-action="share" data-meme-id="${meme.id}">
            <i class="bi-share"></i>
            Share
          </button>
          
          <button class="btn-action meme-save-btn ${meme.isSaved ? 'saved' : ''}" data-action="save" data-meme-id="${meme.id}">
            <i class="bi-bookmark${meme.isSaved ? '-fill' : ''}"></i>
            Save
          </button>
          
          <div class="meme-menu dropdown">
            <button class="btn-action dropdown-toggle" data-action="menu">
              <i class="bi-three-dots"></i>
            </button>
            
            <div class="dropdown-menu">
              <a class="dropdown-item" href="#" data-action="report" data-meme-id="${meme.id}">
                <i class="bi-flag"></i> Report
              </a>
              <a class="dropdown-item" href="#" data-action="download" data-meme-id="${meme.id}">
                <i class="bi-download"></i> Download
              </a>
              <a class="dropdown-item" href="#" data-action="copy-link" data-meme-id="${meme.id}">
                <i class="bi-link"></i> Copy Link
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return card;
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
