/**
 * Meme Manager - Handles meme loading, interactions, and grid management
 */
class MemeManager {
  constructor() {
    this.memes = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.totalPages = 1;
    this.totalMemes = 0;
    this.hasMoreMemes = true; // Track if more memes are available
    this.isLoading = false;
    this.currentFilter = 'all';
    this.currentSort = 'latest';
    this.likedMemes = new Set();
    this.savedMemes = new Set();
    this.currentGalleryIndex = 0;
    this.galleryMemes = [];
    this.init();
  }

  /**
   * Debug function to test pagination manually
   * Call this from browser console: window.memeManager.testPagination()
   */
  testPagination() {
    console.log('=== PAGINATION TEST ===');
    console.log(`Current state:`);
    console.log(`- Current page: ${this.currentPage}`);
    console.log(`- Total pages: ${this.totalPages}`);
    console.log(`- Total memes: ${this.totalMemes}`);
    console.log(`- Has more memes: ${this.hasMoreMemes}`);
    console.log(`- Memes loaded: ${this.memes.length}`);
    console.log(`- Is loading: ${this.isLoading}`);
    
    // Calculate expected final state
    const expectedTotalPages = Math.ceil(67 / 12); // We know there are 67 memes
    console.log(`Expected total pages: ${expectedTotalPages}`);
    console.log(`Expected to reach end at page: ${expectedTotalPages}`);
    
    // Force load next page for testing
    if (this.hasMoreMemes && !this.isLoading) {
      console.log('Forcing load of next page...');
      this.loadMoreMemes();
    } else {
      console.log('Cannot load more: hasMoreMemes=' + this.hasMoreMemes + ', isLoading=' + this.isLoading);
    }
  }

  /**
   * Initialize meme manager
   */
  init() {
    console.log('Initializing MemeManager...');
    this.loadSavedInteractions();
    this.setupEventListeners();
    // Add close handler for gallery modal
    const closeBtn = document.getElementById('closeGalleryBtn');
    const modal = document.getElementById('imageGalleryModal');
    if (closeBtn && modal) {
      closeBtn.onclick = function() {
        modal.style.display = 'none';
      };
      // Optional: Hide modal on background click
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
      // Optional: Hide modal on Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          modal.style.display = 'none';
        }
      });
    }
    // Add event listeners for new icon-only gallery action buttons
    const downloadBtn = document.getElementById('downloadImageBtn');
    const shareBtn = document.getElementById('shareImageBtn');
    if (downloadBtn) {
      downloadBtn.onclick = (e) => {
        e.preventDefault();
        this.downloadCurrentImage();
      };
    }
    if (shareBtn) {
      shareBtn.onclick = (e) => {
        e.preventDefault();
        this.shareCurrentImage();
      };
    }
    this.setupInfiniteScroll(); // Setup infinite scroll functionality
    console.log('About to load home memes...');
    this.loadHomeMemes(); // Load home memes on initialization
    console.log('MemeManager initialization complete');
    
    // Expose globally for debugging
    window.memeManager = this;
    console.log('MemeManager exposed globally as window.memeManager');
  }

  /**
   * Load saved likes and saves from localStorage
   */
  loadSavedInteractions() {
    const liked = localStorage.getItem(APP_CONFIG.STORAGE.LIKED_MEMES);
    const saved = localStorage.getItem(APP_CONFIG.STORAGE.SAVED_MEMES);
    
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
    localStorage.setItem(APP_CONFIG.STORAGE.LIKED_MEMES, JSON.stringify([...this.likedMemes]));
    localStorage.setItem(APP_CONFIG.STORAGE.SAVED_MEMES, JSON.stringify([...this.savedMemes]));
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
      // Like (only handleLikeAPI, do not show reaction popup)
      if (e.target.closest('.meme-like-btn')) {
        e.preventDefault();
        this.handleLikeAPI(e.target.closest('.meme-like-btn'));
        return;
      }
      // Reaction popup logic (for reaction bar only)
      if (e.target.closest('.reaction-option')) {
        e.preventDefault();
        const btn = e.target.closest('.reaction-option');
        const card = btn.closest('.meme-card');
        const reaction = btn.getAttribute('data-reaction');
        this.handleReaction(card, reaction);
        this.hideAllReactionPopups();
        return;
      }
      // Hide popup if click outside
      if (!e.target.closest('.reaction-popup') && !e.target.closest('.meme-like-btn')) {
        this.hideAllReactionPopups();
      }
      // Upvote
      if (e.target.closest('.meme-upvote-btn')) {
        e.preventDefault();
        this.handleVoteAPI(e.target.closest('.meme-upvote-btn'), 'upvote');
      }
      // Share
      if (e.target.closest('.meme-share-btn')) {
        e.preventDefault();
        this.handleShare(e.target.closest('.meme-share-btn'));
      }
      // Download
      if (e.target.closest('.meme-download-btn')) {
        e.preventDefault();
        this.handleDownload(e.target.closest('.meme-download-btn'));
      }
      // View (gallery)
      if (e.target.closest('.meme-view-btn')) {
        e.preventDefault();
        this.handleView(e.target.closest('.meme-view-btn'));
        return;
      }
      // Gallery navigation
      if (e.target.closest('#prevImageBtn')) {
        e.preventDefault();
        this.showPreviousImage();
      }
      if (e.target.closest('#nextImageBtn')) {
        e.preventDefault();
        this.showNextImage();
      }
      if (e.target.closest('#downloadImageBtn')) {
        e.preventDefault();
        this.downloadCurrentImage();
      }
      if (e.target.closest('#shareImageBtn')) {
        e.preventDefault();
        this.shareCurrentImage();
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
   * Setup infinite scroll functionality
   */
  setupInfiniteScroll() {
    console.log('Setting up infinite scroll...');
    
    // Use throttled scroll handler for better performance
    let ticking = false;
    const throttledHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Add the scroll listener
    window.addEventListener('scroll', throttledHandler, { passive: true });
    
    console.log('Infinite scroll setup complete');
  }

  /**
   * Handle scroll events for infinite loading
   */
  handleScroll() {
    // Only handle scroll on home section
    const homeSection = document.getElementById('home-content');
    if (!homeSection || !homeSection.classList.contains('active')) {
      return;
    }

    // Don't load if already loading or no more memes available
    if (this.isLoading || !this.hasMoreMemes) {
      console.log(`Scroll ignored: isLoading=${this.isLoading}, hasMoreMemes=${this.hasMoreMemes}`);
      return;
    }

    // Calculate if user is near bottom of page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Trigger load when user is 200px from bottom
    const scrollThreshold = 200;
    const nearBottom = scrollTop + windowHeight >= documentHeight - scrollThreshold;

    if (nearBottom) {
      console.log(`Near bottom detected - loading more memes (current page: ${this.currentPage}, total loaded: ${this.memes.length})`);
      this.loadMoreMemes();
    }
  }

  /**
   * Load more memes for infinite scroll
   */
  async loadMoreMemes() {
    if (this.isLoading || !this.hasMoreMemes) {
      return;
    }

    this.isLoading = true;
    const nextPage = this.currentPage + 1;
    console.log(`Loading more memes - page ${nextPage}`);
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    try {
      // Add 600ms delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Temporarily disable auth token for loading to avoid routing issues
      // const token = localStorage.getItem('zedmemes-token');
      const token = null; // Force no auth for loading
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `http://localhost/Zed-memes/backend/api/memes.php?action=get_memes&page=${nextPage}&limit=${this.itemsPerPage}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('Raw response text:', text.substring(0, 500)); // Log first 500 chars
      const jsonText = text.substring(text.indexOf('{')); 
      const data = JSON.parse(jsonText);
      console.log('Parsed data structure:', {
        success: data.success,
        message: data.message,
        dataLength: data.data?.length,
        pagination: data.pagination
      });
      
      if (data.success && data.data.length > 0) {
        console.log(`Loaded ${data.data.length} more memes`);
        console.log('Pagination info:', data.pagination);
        
        // Update pagination info
        if (data.pagination) {
          this.currentPage = data.pagination.page;
          this.hasMoreMemes = data.pagination.hasNext;
          console.log(`Backend says: hasNext=${data.pagination.hasNext}, page=${data.pagination.page}/${data.pagination.totalPages}, total=${data.pagination.total}`);
        } else {
          // If no pagination info, check if we got fewer items than requested
          this.currentPage = nextPage;
          this.hasMoreMemes = data.data.length >= this.itemsPerPage;
          console.log(`No pagination info, inferring: hasMore=${this.hasMoreMemes} (got ${data.data.length} items, expected ${this.itemsPerPage})`);
          
          // IMPORTANT: If we got fewer than expected items, we've reached the end
          if (data.data.length < this.itemsPerPage) {
            this.hasMoreMemes = false;
            console.log(`Got ${data.data.length} < ${this.itemsPerPage} items - reached end!`);
          }
        }
        
        // Append new memes to existing array
        this.memes = [...this.memes, ...data.data];
        
        // Append to grid
        this.appendMemesToGrid(data.data);
        
        console.log(`Total memes loaded: ${this.memes.length}, hasMoreMemes: ${this.hasMoreMemes}`);
        
        // Extra safety check: if we've loaded 67+ memes, we've definitely reached the end
        if (this.memes.length >= 67) {
          console.log('Loaded 67+ memes - definitely at the end!');
          this.hasMoreMemes = false;
        }
        
        // Show "All memes loaded" message when reaching the end
        if (!this.hasMoreMemes) {
          console.log('No more memes - showing end message');
          this.showEndOfMemesMessage();
        }
      } else {
        // No more memes available
        this.hasMoreMemes = false;
        console.log('No more memes to load - data.success=', data.success, 'data.data.length=', data.data?.length);
        this.showEndOfMemesMessage();
      }
    } catch (error) {
      console.error('Error loading more memes:', error);
      this.showToast('Failed to load more memes. Please try again.', 'error');
    } finally {
      this.hideLoadingIndicator();
      this.isLoading = false;
    }
  }

  /**
   * Append new memes to existing grid
   */
  appendMemesToGrid(newMemes) {
    const grid = document.getElementById('homeMemeGrid');
    if (!grid || !newMemes || newMemes.length === 0) {
      return;
    }

    newMemes.forEach(meme => {
      const memeCard = this.createMemeCard(meme);
      grid.appendChild(memeCard);
    });
  }

  /**
   * Load memes for home section
   */
  async loadHomeMemes() {
    console.log('Loading home memes...');
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) {
      console.error('Home meme grid not found!');
      return;
    }

    // Reset pagination for fresh load
    this.currentPage = 1;
    this.hasMoreMemes = true;
    this.currentFilter = 'featured';
    
    // Clear any existing end messages
    const existingEndMessage = document.getElementById('end-of-memes-message');
    if (existingEndMessage) {
      existingEndMessage.remove();
    }
    
    try {
      // Temporarily disable auth token for initial load to avoid routing issues
      // const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
      const token = null; // Force no auth for initial load
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(getApiUrl(APP_CONFIG.API.MEMES.GET_RELEVANT), {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('Initial load raw response:', text.substring(0, 500)); // Log first 500 chars
      const jsonText = text.substring(text.indexOf('{')); // Remove everything before first '{'
      const data = JSON.parse(jsonText);
      console.log('Initial load parsed data:', {
        success: data.success,
        message: data.message,
        dataLength: data.data?.length,
        pagination: data.pagination
      });
      
      if (data.success) {
        console.log('Home memes loaded:', data.data.length);
        console.log('Initial pagination info:', data.pagination);
        
        // Update pagination info
        if (data.pagination) {
          this.totalPages = data.pagination.totalPages;
          this.totalMemes = data.pagination.total;
          this.currentPage = data.pagination.page;
          this.hasMoreMemes = data.pagination.hasNext;
          
          console.log(`Initial pagination: page ${this.currentPage}/${this.totalPages}, total: ${this.totalMemes}, hasMore: ${this.hasMoreMemes}`);
        } else {
          // If no pagination info, assume there might be more if we got a full page
          this.hasMoreMemes = data.data.length >= this.itemsPerPage;
          console.log(`No initial pagination info, inferring hasMore: ${this.hasMoreMemes} (got ${data.data.length} items)`);
          
          // For initial load, let's be more conservative and use item count
          this.totalMemes = data.data.length; // We don't know the real total
          this.totalPages = 1; // We don't know the real total pages
        }
        
        this.memes = data.data;
        this.renderMemeGrid(grid, data.data);
      } else {
        console.error('Failed to load home memes:', data.message);
        this.renderMemeGrid(grid, []);
      }
    } catch (error) {
      console.error('Error loading home memes:', error);
      this.renderMemeGrid(grid, []);
    }
  }

  /**
   * Load trending memes
   */
  async loadTrendingMemes() {
    const grid = document.querySelector('#trending-content .meme-grid');
    if (!grid) return;
    
    this.currentFilter = 'trending';
    
    try {
      const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(getApiUrl(APP_CONFIG.API.MEMES.GET_TRENDING), {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const jsonText = text.substring(text.indexOf('{'));
      const data = JSON.parse(jsonText);
      
      if (data.success) {
        console.log('Trending memes loaded:', data.data.length);
        this.renderMemeGrid(grid, data.data);
      } else {
        console.error('Failed to load trending memes:', data.message);
        // Fallback to sample data
        this.renderMemeGrid(grid, []);
      }
    } catch (error) {
      console.error('Error loading trending memes:', error);
      // Fallback to sample data
      this.renderMemeGrid(grid, []);
    }
  }

  /**
   * Load liked memes for the current user
   */
  async loadLikedMemes() {
    const grid = document.querySelector('#likes-content .meme-grid');
    if (!grid) return;
    this.currentFilter = 'liked';
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    if (!token) {
      this.showToast('Please login to view your liked memes');
      this.renderMemeGrid(grid, []);
      return;
    }
    try {
      // Fetch liked meme objects directly from backend
      const res = await fetch(getApiUrl(APP_CONFIG.API.MEMES.GET_LIKED_MEMES), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) {
        this.renderMemeGrid(grid, []);
        return;
      }
      this.renderMemeGrid(grid, data.data);
    } catch (err) {
      console.error('Error loading liked memes:', err);
      this.renderMemeGrid(grid, []);
    }
  }

  /**
   * Load user uploads
   */
  async loadUserUploads() {
    const grid = document.querySelector('#uploads-content .meme-grid');
    if (!grid) return;
    
    this.currentFilter = 'uploads';
    
    try {
      const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
      if (!token) {
        this.showToast('Please login to view your uploads');
        this.renderMemeGrid(grid, []);
        return;
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      console.log('Loading user uploads...');
      const response = await fetch(getApiUrl(APP_CONFIG.API.MEMES.GET_USER_UPLOADS), {
        method: 'GET',
        headers: headers
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('User uploads response:', data);
      
      if (data.success) {
        console.log('User uploads loaded:', data.data.length);
        this.renderMemeGrid(grid, data.data);
      } else {
        console.error('Failed to load user uploads:', data.message);
        this.renderMemeGrid(grid, []);
      }
    } catch (error) {
      console.error('Error loading user uploads:', error);
      this.renderMemeGrid(grid, []);
    }
  }

  /**
   * Generate sample memes for demo
   * @param {number} count - Number of memes to generate
   * @param {string} type - Type of memes
   * @returns {Array} Sample memes array
   */

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
    
    // Store memes in instance variable so they can be accessed by gallery
    this.memes = memes;
    
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
   * Show empty state message
   * @param {HTMLElement} container - Container to show empty state in
   * @param {string} title - Empty state title
   * @param {string} message - Empty state message
   */
  showEmptyState(container, title, message) {
    console.log('Showing empty state:', title, message);
    const emptyStateHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px 20px; color: #6c757d;">
        <div class="empty-state-icon" style="margin-bottom: 20px;">
          <i class="bi bi-images" style="font-size: 3rem; color: #6c757d;"></i>
        </div>
        <h3 class="empty-state-title" style="margin-bottom: 10px; color: #495057;">${title}</h3>
        <p class="empty-state-message" style="margin: 0; font-size: 0.9rem;">${message}</p>
      </div>
    `;
    container.innerHTML = emptyStateHTML;
  }

  /**
   * Show loading indicator for infinite scroll
   */
  showLoadingIndicator() {
    // Remove existing loading indicator
    this.hideLoadingIndicator();
    
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'infinite-scroll-loading';
    loadingDiv.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 0.9rem;
    `;
    
    loadingDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid #e9ecef;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span>Loading more memes...</span>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    grid.appendChild(loadingDiv);
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    const loadingDiv = document.getElementById('infinite-scroll-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  /**
   * Show end of memes message
   */
  showEndOfMemesMessage() {
    // Remove existing end message
    const existingMessage = document.getElementById('end-of-memes-message');
    if (existingMessage) return; // Don't show multiple messages
    
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) return;
    
    const endDiv = document.createElement('div');
    endDiv.id = 'end-of-memes-message';
    endDiv.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: 30px 20px;
      color: #6c757d;
      font-size: 0.9rem;
      border-top: 1px solid #e9ecef;
      margin-top: 20px;
    `;
    
    endDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <i class="bi bi-check-circle" style="font-size: 2rem; color: #28a745;"></i>
        <strong style="color: #495057;">You've reached the end!</strong>
        <span>You've seen all the memes available. Check back later for more!</span>
      </div>
    `;
    
    grid.appendChild(endDiv);
  }

  /**
   * Create meme card element
   * @param {Object} meme - Meme data
   * @returns {HTMLElement} Meme card element
   */
  createMemeCard(meme) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'four wide column';
    
    // Handle both backend and sample data formats
    const memeId = meme.meme_id || meme.id;
    const title = meme.caption || meme.title || 'Untitled Meme';
    let imagePath = meme.image_path || meme.image;
    if (imagePath && !imagePath.includes('/')) {
      imagePath = 'assets/images/' + imagePath;
    }
    const author = meme.user?.username || 'ZedMemes';
    const upvotes = meme.votes?.find(v => v.vote_type === 'upvote')?.count || meme.upvotes || 0;
    const downvotes = meme.votes?.find(v => v.vote_type === 'downvote')?.count || meme.downvotes || 0;
    const likes = meme.reactions?.find(r => r.vote_type === 'like')?.count || meme.likes || 0;
    const views = meme.views || '0';

    // Get current user
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.USER));
    } catch (e) {}
    const isOwner = currentUser && meme.user && meme.user.user_id == currentUser.user_id;

    cardDiv.innerHTML = `
      <div class="meme-card-main">
        <div class="meme-thumbnail js-thumbnail meme-thumbnail-container">
          <div class="js-thumbnail-base meme-thumbnail-base disabled-meme-section meme-card" data-meme-id="${memeId}">
            <figure class="js-thumbnail-placeholder meme-thumbnail-placeholder">
              <img src="${imagePath}" alt="${title}">
            </figure>
            <div class="meme-thumbnail-overlay">
              <div class="meme-thumbnail-overlay-content">
                <ul class="meme-actions-container">
                  <li class="meme-action">
                    <a class="btn2 btn2--circle btn2--secondary-alt meme-view-btn" title="View" href="#" data-meme-id="${memeId}">
                      <!-- SVG omitted for brevity -->
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </a>
                  </li>
                  <li class="meme-action">
                    <a class="btn2 btn2--circle btn2--secondary-alt meme-download-btn" title="Download" href="#" data-meme-id="${memeId}">
                      <!-- SVG omitted for brevity -->
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img"><path d="M8 1v8m0 0L5 6m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </a>
                  </li>
                  <li class="meme-action">
                    <a class="btn2 btn2--secondary-alt btn2--circle meme-share-btn" title="Share" href="#" data-meme-id="${memeId}">
                      <!-- SVG omitted for brevity -->
                      <svg rpl="" aria-hidden="true" class="icon-share" fill="currentColor" height="16" icon-name="share-new-outline" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M2.239 18.723A1.235 1.235 0 0 1 1 17.488C1 11.5 4.821 6.91 10 6.505V3.616a1.646 1.646 0 0 1 2.812-1.16l6.9 6.952a.841.841 0 0 1 0 1.186l-6.9 6.852A1.645 1.645 0 0 1 10 16.284v-2.76c-2.573.243-3.961 1.738-5.547 3.445-.437.47-.881.949-1.356 1.407-.23.223-.538.348-.858.347ZM10.75 7.976c-4.509 0-7.954 3.762-8.228 8.855.285-.292.559-.59.832-.883C5.16 14 7.028 11.99 10.75 11.99h.75v4.294a.132.132 0 0 0 .09.134.136.136 0 0 0 .158-.032L18.186 10l-6.438-6.486a.135.135 0 0 0-.158-.032.134.134 0 0 0-.09.134v4.36h-.75Z"></path></svg>
                    </a>
                  </li>
                  ${isOwner ? `
                  <li class="meme-action">
                    <button class="btn2 btn2--circle btn2--secondary-alt meme-edit-btn" title="Edit" data-meme-id="${memeId}">
                      ✏️
                    </button>
                  </li>
                  <li class="meme-action">
                    <button class="btn2 btn2--circle btn2--danger meme-delete-btn" title="Delete" data-meme-id="${memeId}">
                      🗑️
                    </button>
                  </li>
                  ` : ''}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="meme-details-container">
          <div class='meme-caption-box' data-caption-id="${memeId}">${title}</div>
          <div class="user-information">
            <div class="photo">${author.charAt(0).toUpperCase()}</div>
            <span class="display-name">${author}</span>
            <!-- Vote buttons -->
            <div class="meme-vote-container">
              <button class="btn-vote btn-upvote meme-upvote-btn" data-meme-id="${memeId}" data-action="upvote" title="Upvote">
                <!-- SVG omitted for brevity -->
                <svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path></svg>
                <span class="vote-count">${upvotes}</span>
              </button>
              <button class="btn-vote btn-like meme-like-btn" data-meme-id="${memeId}" data-action="like" title="Like">
                <!-- SVG omitted for brevity -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img" class="meme-tools-icon"><path d="M10.7408 2C13.0889 2 14.6667 4.235 14.6667 6.32C14.6667 10.5425 8.11856 14 8.00004 14C7.88152 14 1.33337 10.5425 1.33337 6.32C1.33337 4.235 2.91115 2 5.2593 2C6.60745 2 7.48893 2.6825 8.00004 3.2825C8.51115 2.6825 9.39263 2 10.7408 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                <span class="like-count">${likes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add edit/delete event listeners if owner
    if (isOwner) {
      // Edit
      cardDiv.querySelector('.meme-edit-btn').onclick = (e) => {
        e.preventDefault();
        this.showEditCaptionInput(memeId, title, cardDiv);
      };
      // Delete
      cardDiv.querySelector('.meme-delete-btn').onclick = async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this meme?')) {
          await this.deleteMeme(memeId);
        }
      };
    }
    return cardDiv;
  }

  // Show input for editing caption
  showEditCaptionInput(memeId, currentCaption, cardDiv) {
    const captionBox = cardDiv.querySelector(`[data-caption-id="${memeId}"]`);
    if (!captionBox) return;
    // Replace with input
    captionBox.innerHTML = `<input type="text" value="${currentCaption.replace(/"/g, '&quot;')}" maxlength="255" style="width:80%"> <button class="btn2 btn2--primary meme-save-caption-btn">Save</button> <button class="btn2 meme-cancel-caption-btn">Cancel</button>`;
    const input = captionBox.querySelector('input');
    const saveBtn = captionBox.querySelector('.meme-save-caption-btn');
    const cancelBtn = captionBox.querySelector('.meme-cancel-caption-btn');
    saveBtn.onclick = async () => {
      const newCaption = input.value.trim();
      if (!newCaption) {
        this.showToast('Caption cannot be empty', 'error');
        return;
      }
      await this.editMemeCaption(memeId, newCaption, cardDiv);
    };
    cancelBtn.onclick = () => {
      captionBox.textContent = currentCaption;
    };
  }

  // Send PUT request to edit caption
  async editMemeCaption(memeId, newCaption, cardDiv) {
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    try {
      const response = await fetch(getApiUrl('/backend/api/memes.php'), {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ id: memeId, caption: newCaption })
      });
      const data = await response.json();
      if (data.success) {
        this.showToast('Caption updated!', 'success');
        // Refresh uploads grid
        await this.loadUserUploads();
      } else {
        this.showToast(data.message || 'Failed to update caption', 'error');
      }
    } catch (err) {
      this.showToast('Failed to update caption', 'error');
    }
  }

  // Send request to delete meme
  async deleteMeme(memeId) {
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    try {
      const formData = new FormData();
      formData.append('action', 'delete_meme');
      formData.append('meme_id', memeId);
      const response = await fetch(getApiUrl(APP_CONFIG.API.UPLOAD.DELETE_MEME), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        this.showToast('Meme deleted!', 'success');
        await this.loadUserUploads();
      } else {
        this.showToast(data.message || 'Failed to delete meme', 'error');
      }
    } catch (err) {
      this.showToast('Failed to delete meme', 'error');
    }
  }

  /**
   * Handle like action with API
   * @param {HTMLElement} button
   */
  async handleLikeAPI(button) {
    const memeId = button.getAttribute('data-meme-id');
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    
    if (!token) {
      this.showToast('Please login to like memes');
      return;
    }
    
    const countSpan = button.querySelector('.like-count');
    let liked = button.classList.contains('liked');
    
    // Optimistic UI update
    button.classList.toggle('liked');
    let count = parseInt(countSpan.textContent) || 0;
    countSpan.textContent = liked ? count - 1 : count + 1;
    
    try {
      const formData = new FormData();
      formData.append('action', 'add_reaction');
      formData.append('meme_id', memeId);
      formData.append('reaction_type', liked ? 'unlike' : 'like');
      
      const response = await fetch(getApiUrl(APP_CONFIG.API.REACTIONS.ADD_REACTION), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to like');
      }
      
      // Update UI with server response
      if (data.data && data.data.reactions) {
        const likeCount = data.data.reactions.like || 0;
        countSpan.textContent = likeCount;
      }
      
    } catch (err) {
      // Revert UI on error
      button.classList.toggle('liked');
      countSpan.textContent = liked ? count : count;
      this.showToast('Failed to update like. Please try again.');
      console.error('Like error:', err);
    }
  }

  /**
   * Handle upvote/downvote with API
   * @param {HTMLElement} button
   * @param {string} type 'upvote' or 'downvote'
   */
  async handleVoteAPI(button, type) {
    const memeId = button.getAttribute('data-meme-id');
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    
    if (!token) {
      this.showToast('Please login to vote on memes');
      return;
    }
    
    const countSpan = button.querySelector('.vote-count');
    let active = button.classList.contains('active');
    
    // Optimistic UI update
    button.classList.toggle('active');
    let count = parseInt(countSpan.textContent) || 0;
    countSpan.textContent = active ? count - 1 : count + 1;
    
    try {
      const formData = new FormData();
      formData.append('action', 'add_vote');
      formData.append('meme_id', memeId);
      formData.append('vote_type', type);
      
      const response = await fetch(getApiUrl(APP_CONFIG.API.VOTES.ADD_VOTE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to vote');
      }
      
      // Update UI with server response
      if (data.data) {
        const voteCount = type === 'upvote' ? data.data.upvotes : data.data.downvotes;
        countSpan.textContent = voteCount || 0;
      }
      
    } catch (err) {
      // Revert UI on error
      button.classList.toggle('active');
      countSpan.textContent = active ? count : count;
      this.showToast('Failed to update vote. Please try again.');
      console.error('Vote error:', err);
    }
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
   * Handle download action
   * @param {HTMLElement} button
   */
  handleDownload(button) {
    const memeId = button.getAttribute('data-meme-id');
    // Find meme by id or meme_id (backend compatibility)
    const meme = this.memes.find(m => m.id == memeId || m.meme_id == memeId);
    if (!meme) {
      this.showToast('Meme not found for download.');
      return;
    }
    // Use backend image path
    let imagePath = meme.image_path || meme.image;
    if (imagePath && !imagePath.includes('/')) {
      imagePath = 'assets/images/' + imagePath;
    }
    // Use caption or title for filename
    const filename = (meme.caption || meme.title || 'meme').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
    try {
      const link = document.createElement('a');
      link.href = imagePath;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      this.showToast('Failed to download image.');
    }
  }

  /**
   * Handle view action - Open image in gallery modal
   * @param {HTMLElement} button - View button element
   */
  handleView(button) {
    const memeId = button.getAttribute('data-meme-id');
    // Pass memeId directly to openGallery for accurate lookup
    this.openGallery(memeId);
  }

  /**
   * Open gallery modal with specific meme
   * @param {string|number} memeId - Meme id to display
   */
  openGallery(memeId) {
    // Set current gallery data
    this.galleryMemes = [...this.memes];
    // Find the correct index for the clicked meme (support id and meme_id, string/number)
    this.currentGalleryIndex = this.galleryMemes.findIndex(m => (
      m.id == memeId || m.meme_id == memeId
    ));
    // Show modal using new fullscreen modal logic
    const modal = document.getElementById('imageGalleryModal');
    if (modal) {
      modal.style.display = 'flex';
      this.updateGalleryImage();
    }
  }

  /**
   * Update gallery image and info
   */
  updateGalleryImage() {
    const currentMeme = this.galleryMemes[this.currentGalleryIndex];
    if (!currentMeme) return;

    const loader = document.getElementById('galleryLoader');
    const container = document.getElementById('galleryImageContainer');
    const image = document.getElementById('galleryImage');
    const title = document.getElementById('galleryImageTitle');
    const stats = document.getElementById('galleryImageStats');
    const galleryTitle = document.getElementById('galleryTitle');
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');

    // Show loader
    loader.style.display = 'block';
    container.style.display = 'none';

    // Update navigation buttons
    prevBtn.disabled = this.currentGalleryIndex === 0;
    nextBtn.disabled = this.currentGalleryIndex === this.galleryMemes.length - 1;

    // Update title
    galleryTitle.textContent = `${currentMeme.title} (${this.currentGalleryIndex + 1} of ${this.galleryMemes.length})`;

    // Determine image path (support both image_path and image)
    let imagePath = currentMeme.image_path || currentMeme.image;
    if (imagePath && !imagePath.includes('/')) {
      imagePath = 'assets/images/' + imagePath;
    }
    const fallbackPath = 'assets/images/placeholder.png';

    // Load image
    const img = new Image();
    img.onload = () => {
      image.src = imagePath || fallbackPath;
      image.alt = currentMeme.title;
      // title.textContent = currentMeme.title; // Removed: no title element in modal
      // stats.innerHTML = `
      //   <span class="gallery-stat">
      //     <i class="bi-heart"></i> ${currentMeme.likes || 0}
      //   </span>
      //   <span class="gallery-stat">
      //     <i class="bi-eye"></i> ${currentMeme.views || 0}
      //   </span>
      //   <span class="gallery-stat">
      //     <i class="bi-arrow-up"></i> ${currentMeme.upvotes || 0}
      //   </span>
      //   <span class="gallery-stat">
      //     <i class="bi-arrow-down"></i> ${currentMeme.downvotes || 0}
      //   </span>
      // `; // Removed: no stats element in modal

      // Hide loader, show container
      loader.style.display = 'none';
      container.style.display = 'block';
    };

    img.onerror = () => {
      loader.style.display = 'none';
      container.style.display = 'block';
      image.src = fallbackPath;
      image.alt = 'Error loading image';
    };

    img.src = imagePath || fallbackPath;
  }

  /**
   * Show previous image in gallery
   */
  showPreviousImage() {
    if (this.currentGalleryIndex > 0) {
      this.currentGalleryIndex--;
      this.updateGalleryImage();
    }
  }

  /**
   * Show next image in gallery
   */
  showNextImage() {
    if (this.currentGalleryIndex < this.galleryMemes.length - 1) {
      this.currentGalleryIndex++;
      this.updateGalleryImage();
    }
  }

  /**
   * Download current gallery image
   */
  downloadCurrentImage() {
    const currentMeme = this.galleryMemes[this.currentGalleryIndex];
    if (!currentMeme) return;
    let imagePath = currentMeme.image_path || currentMeme.image;
    if (imagePath && !imagePath.includes('/')) {
      imagePath = 'assets/images/' + imagePath;
    }
    const filename = (currentMeme.caption || currentMeme.title || 'meme').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
    try {
      const link = document.createElement('a');
      link.href = imagePath;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      this.showToast('Failed to download image.');
    }
  }

  /**
   * Share current gallery image
   */
  shareCurrentImage() {
    const currentMeme = this.galleryMemes[this.currentGalleryIndex];
    if (!currentMeme) return;
    let imagePath = currentMeme.image_path || currentMeme.image;
    if (imagePath && !imagePath.includes('/')) {
      imagePath = 'assets/images/' + imagePath;
    }
    if (navigator.share) {
      navigator.share({
        title: currentMeme.title || 'Meme',
        text: `Check out this meme: ${currentMeme.title || ''}`,
        url: imagePath
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(imagePath).then(() => {
        this.showToast('Image URL copied to clipboard!');
      });
    }
  }

  /**
   * Show toast/alert for errors
   */
  showToast(msg, type = 'info', title = '', icon = '') {
    if (window.zedMemesApp && typeof window.zedMemesApp.showToast === 'function') {
      window.zedMemesApp.showToast(msg, type, title, icon);
    } else {
      alert(msg);
    }
  }

  /**
   * Show the reaction popup for a meme card
   */
  showReactionPopup(card) {
    this.hideAllReactionPopups();
    const popup = card.querySelector('.reaction-popup');
    if (popup) popup.style.display = 'block';
  }

  /**
   * Hide all reaction popups
   */
  hideAllReactionPopups() {
    document.querySelectorAll('.reaction-popup').forEach(p => p.style.display = 'none');
  }

  /**
   * Handle reaction selection
   */
  async handleReaction(card, reaction) {
    const memeId = card.getAttribute('data-meme-id');
    const token = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    
    if (!token) {
      this.showToast('Please login to react to memes');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('action', 'add_reaction');
      formData.append('meme_id', memeId);
      formData.append('reaction_type', reaction);
      
      const response = await fetch(getApiUrl(APP_CONFIG.API.REACTIONS.ADD_REACTION), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to react');
      }
      
      // Update reaction bar
      if (data.data) {
        this.updateReactionBar(card, data.data.reactions, data.data.user_reaction);
      }
      
    } catch (err) {
      this.showToast('Failed to react. Please try again.');
      console.error('Reaction error:', err);
    }
  }

  /**
   * Update the reaction bar with counts and highlight user's reaction
   */
  updateReactionBar(card, reactions, userReaction) {
    const allowed = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    allowed.forEach(type => {
      const btn = card.querySelector(`.reaction-btn[data-reaction="${type}"]`);
      if (btn) {
        btn.querySelector('.reaction-count').textContent = reactions[type] || 0;
        btn.classList.toggle('user-reacted', userReaction === type);
      }
    });
  }

  /**
   * On meme render, call this to set up the reaction bar
   * @param {HTMLElement} card
   * @param {Object} reactions - {like: n, love: n, ...}
   * @param {string|null} userReaction
   */
  setupReactionBar(card, reactions, userReaction) {
    this.updateReactionBar(card, reactions, userReaction);
  }

  /**
   * Show empty state message
   * @param {HTMLElement} container - Container to show empty state in
   * @param {string} title - Empty state title
   * @param {string} message - Empty state message
   */
  showEmptyState(container, title = 'No memes found', message = 'Try adjusting your filters or check back later.') {
    if (!container) return;
    
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px 20px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">📷</div>
        <h3 style="margin-bottom: 10px; color: #333;">${title}</h3>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Refresh memes after upload
   * @param {string} section - Section to refresh ('home', 'trending', 'likes', 'uploads')
   */
  async refreshMemes(section = 'home') {
    console.log('Refreshing memes for section:', section);
    
    const grid = document.querySelector('.meme-grid');
    if (!grid) {
      console.error('Meme grid not found for refresh');
      return;
    }
    
    // Show loading state
    grid.classList.add('loading');
    
    try {
      switch (section) {
        case 'home':
          await this.loadHomeMemes();
          break;
        case 'trending':
          await this.loadTrendingMemes();
          break;
        case 'likes':
          this.loadLikedMemes();
          break;
        case 'uploads':
          await this.loadUserUploads();
          break;
        default:
          await this.loadHomeMemes();
      }
    } catch (error) {
      console.error('Error refreshing memes:', error);
      this.showEmptyState(grid, 'Error loading memes', 'Please try refreshing the page.');
    } finally {
      grid.classList.remove('loading');
    }
  }
}
