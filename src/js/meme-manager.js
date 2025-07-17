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
    // Section changes
    document.addEventListener('sectionChange', (e) => {
      this.handleSectionChange(e.detail.section);
    });

    // Scroll for infinite loading
    window.addEventListener('scroll', () => {
      this.handleScroll();
    });

    // Meme interactions
    document.addEventListener('click', (e) => {
      // Reaction bar: open popup
      if (e.target.closest('.reaction-btn')) {
        e.preventDefault();
        const card = e.target.closest('.meme-card');
        this.showReactionPopup(card);
        return;
      }
      // Reaction popup: select reaction
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
      if (!e.target.closest('.reaction-popup') && !e.target.closest('.reaction-btn')) {
        this.hideAllReactionPopups();
      }
      // Upvote
      if (e.target.closest('.meme-upvote-btn')) {
        e.preventDefault();
        this.handleVoteAPI(e.target.closest('.meme-upvote-btn'), 'upvote');
        return;
      }
      // Downvote
      if (e.target.closest('.meme-downvote-btn')) {
        e.preventDefault();
        this.handleVoteAPI(e.target.closest('.meme-downvote-btn'), 'downvote');
        return;
      }
      // Share
      if (e.target.closest('.meme-share-btn')) {
        e.preventDefault();
        this.handleShare(e.target.closest('.meme-share-btn'));
        return;
      }
      // Download
      if (e.target.closest('.meme-download-btn')) {
        e.preventDefault();
        this.handleDownload(e.target.closest('.meme-download-btn'));
        return;
      }
      // Dropdown menu toggle
      if (e.target.closest('.dropdown-toggle')) {
        e.preventDefault();
        const card = e.target.closest('.meme-card');
        const menu = card.querySelector('.dropdown-menu');
        if (menu) menu.classList.toggle('show');
        return;
      }
      // Dropdown menu actions (report/copy link)
      if (e.target.closest('.dropdown-item')) {
        e.preventDefault();
        const action = e.target.closest('.dropdown-item').getAttribute('data-action');
        const card = e.target.closest('.meme-card');
        const memeId = card.getAttribute('data-meme-id');
        if (action === 'copy-link') {
          const url = `${window.location.origin}/meme/${memeId}`;
          navigator.clipboard.writeText(url).then(() => {
            this.showToast('Link copied to clipboard!');
          });
        } else if (action === 'report') {
          this.showToast('Report submitted. Thank you!');
        }
        // Hide menu after action
        const menu = card.querySelector('.dropdown-menu');
        if (menu) menu.classList.remove('show');
        return;
      }
    });
    // Hide all dropdown menus on document click (except when clicking toggle)
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-toggle') && !e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
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
    const template = document.createElement('template');
    template.innerHTML = `
      <div class="meme-card" data-meme-id="${meme.meme_id || meme.id}">
        <div class="meme-image-container">
          <img class="meme-image" src="${meme.image_path || meme.image}" alt="${meme.caption || meme.title || ''}" loading="lazy">
        </div>
        <div class="meme-content">
          <div class="meme-title">
            <h4>${meme.caption || meme.title || 'Untitled Meme'}</h4>
          </div>
          <div class="meme-actions">
            <button class="reaction-option" data-reaction="like">
              <span class="reaction-icon">👍</span>
              <span class="like-count">${this.getReactionCount(meme, 'like')}</span>
            </button>
            <button class="btn-action meme-upvote-btn" data-action="upvote" data-meme-id="${meme.meme_id || meme.id}"><i class="bi-arrow-up"></i> <span class="vote-count">${this.getVoteCount(meme, 'upvote')}</span></button>
            <button class="btn-action meme-downvote-btn" data-action="downvote" data-meme-id="${meme.meme_id || meme.id}"><i class="bi-arrow-down"></i> <span class="vote-count">${this.getVoteCount(meme, 'downvote')}</span></button>
            <button class="btn-action meme-share-btn" data-action="share" data-meme-id="${meme.meme_id || meme.id}"><i class="bi-share"></i> Share</button>
            <button class="btn-action meme-download-btn" data-action="download" data-meme-id="${meme.meme_id || meme.id}"><i class="bi-download"></i> Download</button>
          </div>
        </div>
      </div>
    `.trim();
    const card = template.content.firstElementChild;
    const img = card.querySelector('.meme-image');
    if (img) {
      img.onerror = function() {
        this.src = 'https://via.placeholder.com/400x220?text=No+Image';
      };
    }
    return card;
  }

  getReactionCount(meme, type) {
    if (meme.reactions && Array.isArray(meme.reactions)) {
      return meme.reactions.length
    }
    return 0;
  }

  getVoteCount(meme, type) {
    if (meme.votes && Array.isArray(meme.votes)) {
      const found = meme.votes.find(v => v.vote_type === type);
      return found ? found.count : 0;
    }
    return 0;
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
    const card = button.closest('.meme-card');
    const upvoteBtn = card.querySelector('.meme-upvote-btn');
    const downvoteBtn = card.querySelector('.meme-downvote-btn');
    const upvoteCountSpan = upvoteBtn.querySelector('.vote-count');
    const downvoteCountSpan = downvoteBtn.querySelector('.vote-count');
    const token = localStorage.getItem('zedmemes-token');
    if (!token) { this.showToast('Please login to vote on memes'); return; }
    // Mutually exclusive logic
    if (type === 'upvote') {
      const wasActive = upvoteBtn.classList.contains('active');
      upvoteBtn.classList.toggle('active');
      if (upvoteBtn.classList.contains('active')) {
        upvoteCountSpan.textContent = parseInt(upvoteCountSpan.textContent) + 1;
        if (downvoteBtn.classList.contains('active')) {
          downvoteBtn.classList.remove('active');
          downvoteCountSpan.textContent = Math.max(0, parseInt(downvoteCountSpan.textContent) - 1);
        }
      } else if (wasActive) {
        upvoteCountSpan.textContent = Math.max(0, parseInt(upvoteCountSpan.textContent) - 1);
      }
    } else {
      const wasActive = downvoteBtn.classList.contains('active');
      downvoteBtn.classList.toggle('active');
      if (downvoteBtn.classList.contains('active')) {
        downvoteCountSpan.textContent = parseInt(downvoteCountSpan.textContent) + 1;
        if (upvoteBtn.classList.contains('active')) {
          upvoteBtn.classList.remove('active');
          upvoteCountSpan.textContent = Math.max(0, parseInt(upvoteCountSpan.textContent) - 1);
        }
      } else if (wasActive) {
        downvoteCountSpan.textContent = Math.max(0, parseInt(downvoteCountSpan.textContent) - 1);
      }
    }
    // Backend
    try {
      const formData = new FormData();
      formData.append('action', 'add_vote');
      formData.append('meme_id', memeId);
      formData.append('vote_type', type);
      const response = await fetch('http://localhost/Zed-memes/backend/api/upvote.php', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to vote');
      // Update UI with server response
      if (data.data) {
        upvoteCountSpan.textContent = data.data.upvotes || 0;
        downvoteCountSpan.textContent = data.data.downvotes || 0;
      }
    } catch (err) {
      this.showToast('Failed to update vote. Please try again.');
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
    const url = `${window.location.origin}/meme/${memeId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this meme!',
        text: 'Found this hilarious meme on ZedMemes',
        url: url
      }).catch(console.error);
    } else {
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
    const card = button.closest('.meme-card');
    const img = card.querySelector('.meme-image');
    if (!img) return;
    try {
      const link = document.createElement('a');
      link.href = img.src;
      link.download = `${memeId}.jpg`;
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
      image.alt = currentMeme.caption;
      title.textContent = currentMeme.caption;
      // Calculate likes from reactions
      let likes = 0;
      if (currentMeme.reactions && Array.isArray(currentMeme.reactions)) {
        const likeObj = currentMeme.reactions.find(r => r.vote_type === 'like');
        likes = likeObj ? likeObj.count : 0;
      }
      stats.innerHTML = `
        <span class="gallery-stat">
          <i class="bi-heart"></i> ${likes}
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
  showToast(msg) {
    alert(msg); // Replace with custom toast if available
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
