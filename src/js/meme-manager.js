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
    this.currentGalleryIndex = 0;
    this.galleryMemes = [];
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
      // Reaction popup logic
      if (e.target.closest('.meme-like-btn')) {
        e.preventDefault();
        this.showReactionPopup(e.target.closest('.meme-card'));
        return;
      }
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
      // Like
      if (e.target.closest('.meme-like-btn')) {
        e.preventDefault();
        this.handleLikeAPI(e.target.closest('.meme-like-btn'));
      }
      // Upvote
      if (e.target.closest('.meme-upvote-btn')) {
        e.preventDefault();
        this.handleVoteAPI(e.target.closest('.meme-upvote-btn'), 'upvote');
      }
      // Downvote
      if (e.target.closest('.meme-downvote-btn')) {
        e.preventDefault();
        this.handleVoteAPI(e.target.closest('.meme-downvote-btn'), 'downvote');
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
   * Load memes for home section
   */
  async loadHomeMemes() {
    console.log('Loading home memes...');
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) {
      console.error('Home meme grid not found!');
      return;
    }
    
    this.currentFilter = 'featured';
    
    try {
      const token = localStorage.getItem('zedmemes-token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/memes.php?action=get_relevant', {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const jsonText = text.substring(text.indexOf('{')); // Remove everything before first '{'
      const data = JSON.parse(jsonText);
      
      if (data.success) {
        console.log('Home memes loaded:', data.data.length);
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
      const token = localStorage.getItem('zedmemes-token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/memes.php?action=get_trending', {
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
   * Load liked memes
   */
  loadLikedMemes() {
    const grid = document.querySelector('#likes-content .meme-grid');
    if (!grid) return;
    
    // Show the same grid for likes section
    this.currentFilter = 'liked';
    this.renderMemeGrid(grid, []);
  }

  /**
   * Load user uploads
   */
  async loadUserUploads() {
    const grid = document.querySelector('#uploads-content .meme-grid');
    if (!grid) return;
    
    this.currentFilter = 'uploads';
    
    try {
      const token = localStorage.getItem('zedmemes-token');
      if (!token) {
        this.showToast('Please login to view your uploads');
        this.renderMemeGrid(grid, []);
        return;
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/memes.php?action=get_user_uploads', {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
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
    const imagePath = meme.image_path || meme.image;
    const author = meme.user?.username || 'ZedMemes';
    const upvotes = meme.votes?.find(v => v.vote_type === 'upvote')?.count || meme.upvotes || 0;
    const downvotes = meme.votes?.find(v => v.vote_type === 'downvote')?.count || meme.downvotes || 0;
    const likes = meme.reactions?.find(r => r.vote_type === 'like')?.count || meme.likes || 0;
    const views = meme.views || '0';
    
    cardDiv.innerHTML = `
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
                      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </li>
                <li class="meme-action">
                  <a class="btn2 btn2--circle btn2--secondary-alt meme-download-btn" title="Download" href="#" data-meme-id="${memeId}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
                      <path d="M8 1v8m0 0L5 6m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </li>
                <li class="meme-action">
                  <a class="btn2 btn2--secondary-alt btn2--circle meme-share-btn" title="Share" href="#" data-meme-id="${memeId}">
                    <svg rpl="" aria-hidden="true" class="icon-share" fill="currentColor" height="16" icon-name="share-new-outline" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.239 18.723A1.235 1.235 0 0 1 1 17.488C1 11.5 4.821 6.91 10 6.505V3.616a1.646 1.646 0 0 1 2.812-1.16l6.9 6.952a.841.841 0 0 1 0 1.186l-6.9 6.852A1.645 1.645 0 0 1 10 16.284v-2.76c-2.573.243-3.961 1.738-5.547 3.445-.437.47-.881.949-1.356 1.407-.23.223-.538.348-.858.347ZM10.75 7.976c-4.509 0-7.954 3.762-8.228 8.855.285-.292.559-.59.832-.883C5.16 14 7.028 11.99 10.75 11.99h.75v4.294a.132.132 0 0 0 .09.134.136.136 0 0 0 .158-.032L18.186 10l-6.438-6.486a.135.135 0 0 0-.158-.032.134.134 0 0 0-.09.134v4.36h-.75Z"></path>
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="meme-details-container">
          <div class="user-information">
            <div class="photo">${author.charAt(0).toUpperCase()}</div>
            <span class="display-name">${author}</span>
            
            <!-- Vote buttons -->
            <div class="meme-vote-container">
              <button class="btn-vote btn-upvote meme-upvote-btn" data-meme-id="${memeId}" data-action="upvote" title="Upvote">
                <svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path>
                </svg>
                <span class="vote-count">${upvotes}</span>
              </button>
              
              <button class="btn-vote btn-downvote meme-downvote-btn" data-meme-id="${memeId}" data-action="downvote" title="Downvote">
                <svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Zm0 17.193 7.315-7.264a.251.251 0 0 0-.177-.429H12.5V5.184A2.631 2.631 0 0 0 10.136 2.5a2.441 2.441 0 0 0-1.856.682A2.478 2.478 0 0 0 7.5 5v5.5H2.861a.251.251 0 0 0-.176.429L10 18.193Z"></path>
                </svg>
                <span class="vote-count">${downvotes}</span>
              </button>
            </div>
            
            <div class="meme-statistic">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img" class="meme-tools-icon">
                <path d="M10.7408 2C13.0889 2 14.6667 4.235 14.6667 6.32C14.6667 10.5425 8.11856 14 8.00004 14C7.88152 14 1.33337 10.5425 1.33337 6.32C1.33337 4.235 2.91115 2 5.2593 2C6.60745 2 7.48893 2.6825 8.00004 3.2825C8.51115 2.6825 9.39263 2 10.7408 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              <span>${views}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return cardDiv;
  }

  /**
   * Handle like action with API
   * @param {HTMLElement} button
   */
  async handleLikeAPI(button) {
    const memeId = button.getAttribute('data-meme-id');
    const token = localStorage.getItem('zedmemes-token');
    
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
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/reactions.php', {
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
    const token = localStorage.getItem('zedmemes-token');
    
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
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/upvote.php', {
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
    const meme = this.memes.find(m => m.id === memeId);
    if (!meme) {
      this.showToast('Meme not found for download.');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = meme.image;
      link.download = `${meme.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
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
    const meme = this.memes.find(m => m.id === memeId);
    
    if (meme) {
      this.openGallery(meme);
    }
  }

  /**
   * Open gallery modal with specific meme
   * @param {Object} meme - Meme object to display
   */
  openGallery(meme) {
    // Set current gallery data
    this.galleryMemes = [...this.memes];
    this.currentGalleryIndex = this.galleryMemes.findIndex(m => m.id === meme.id);
    
    // Show modal
    if (typeof $ !== 'undefined' && $.fn.modal) {
      $('#imageGalleryModal').modal('show');
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

    // Load image
    const img = new Image();
    img.onload = () => {
      image.src = currentMeme.image;
      image.alt = currentMeme.title;
      title.textContent = currentMeme.title;
      stats.innerHTML = `
        <span class="gallery-stat">
          <i class="bi-heart"></i> ${currentMeme.likes || 0}
        </span>
        <span class="gallery-stat">
          <i class="bi-eye"></i> ${currentMeme.views || 0}
        </span>
        <span class="gallery-stat">
          <i class="bi-arrow-up"></i> ${currentMeme.upvotes || 0}
        </span>
        <span class="gallery-stat">
          <i class="bi-arrow-down"></i> ${currentMeme.downvotes || 0}
        </span>
      `;

      // Hide loader, show container
      loader.style.display = 'none';
      container.style.display = 'block';
    };

    img.onerror = () => {
      loader.style.display = 'none';
      container.style.display = 'block';
      image.src = 'src/images/placeholder.png';
      image.alt = 'Error loading image';
    };

    img.src = currentMeme.image;
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

    const link = document.createElement('a');
    link.href = currentMeme.image;
    link.download = `${currentMeme.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Share current gallery image
   */
  shareCurrentImage() {
    const currentMeme = this.galleryMemes[this.currentGalleryIndex];
    if (!currentMeme) return;

    if (navigator.share) {
      navigator.share({
        title: currentMeme.title,
        text: `Check out this meme: ${currentMeme.title}`,
        url: currentMeme.image
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(currentMeme.image).then(() => {
        alert('Image URL copied to clipboard!');
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
    const token = localStorage.getItem('zedmemes-token');
    
    if (!token) {
      this.showToast('Please login to react to memes');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('action', 'add_reaction');
      formData.append('meme_id', memeId);
      formData.append('reaction_type', reaction);
      
      const response = await fetch('http://localhost/Zed-memes/backend/api/reactions.php', {
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
}
