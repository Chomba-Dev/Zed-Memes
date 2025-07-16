/**
 * Meme Manager - Handles meme loading, interactions, and grid management
 */
class MemeManager {
  constructor() {
    this.memes = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.isLoading = false;
    this.hasMoreMemes = true;
    this.totalMemes = 0;
    this.currentFilter = 'all';
    this.currentSort = 'latest';
    this.likedMemes = new Set();
    this.savedMemes = new Set();
    this.currentGalleryIndex = 0;
    this.galleryMemes = [];
    this.currentSection = 'home';
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
    this.currentSection = 'home'; // Set initial section
    this.loadHomeMemes(true); // Load home memes on initialization
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

    // Listen for scroll events for infinite loading
    window.addEventListener('scroll', () => {
      this.handleScroll();
    });

    // Listen for meme interactions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.meme-view-btn')) {
        e.preventDefault();
        this.handleView(e.target.closest('.meme-view-btn'));
      }
      
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
      
      if (e.target.closest('.btn-upvote')) {
        e.preventDefault();
        this.handleUpvote(e.target.closest('.btn-upvote'));
      }
      
      if (e.target.closest('.btn-downvote')) {
        e.preventDefault();
        this.handleDownvote(e.target.closest('.btn-downvote'));
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
    // Reset pagination when switching sections
    this.currentPage = 1;
    this.hasMoreMemes = true;
    this.currentSection = section;
    
    switch (section) {
      case 'home':
        this.loadHomeMemes(true); // true = reset grid
        break;
      case 'trending':
        this.loadTrendingMemes(true);
        break;
      case 'likes':
        this.loadLikedMemes(true);
        break;
      case 'uploads':
        this.loadUserUploads(true);
        break;
    }
  }

  /**
   * Handle scroll events for infinite loading
   */
  handleScroll() {
    // Don't load if already loading or no more memes
    if (this.isLoading || !this.hasMoreMemes) return;

    // Check if user scrolled near bottom (200px from bottom)
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 200) {
      console.log('Near bottom, loading more memes...');
      this.loadMoreMemes();
    }
  }

  /**
   * Load more memes for current section
   */
  async loadMoreMemes() {
    if (this.isLoading || !this.hasMoreMemes) return;

    this.isLoading = true;
    this.currentPage++;

    try {
      switch (this.currentSection) {
        case 'home':
          await this.loadHomeMemes(false); // false = append to grid
          break;
        case 'trending':
          await this.loadTrendingMemes(false);
          break;
        case 'likes':
          await this.loadLikedMemes(false);
          break;
        case 'uploads':
          await this.loadUserUploads(false);
          break;
      }
    } catch (error) {
      console.error('Error loading more memes:', error);
      this.currentPage--; // Revert page increment on error
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load memes for home section
   * @param {boolean} resetGrid - Whether to reset the grid or append to it
   */
  async loadHomeMemes(resetGrid = true) {
    console.log('Loading home memes...');
    const grid = document.getElementById('homeMemeGrid');
    if (!grid) {
      console.error('Home meme grid not found!');
      return;
    }
    
    if (resetGrid) {
      this.currentPage = 1;
      this.hasMoreMemes = true;
      this.currentSection = 'home';
      grid.innerHTML = '<div class="ui active centered inline loader"></div><p style="text-align: center; margin-top: 20px;">Loading memes...</p>';
    }
    
    this.isLoading = true;
    this.currentFilter = 'featured';
    
    try {
      // Calculate offset for pagination
      const offset = (this.currentPage - 1) * this.itemsPerPage;
      
      // For now, use sample data with pagination simulation
      // TODO: Replace with actual API call when backend pagination is ready
      const allSampleMemes = this.generateSampleMemes(48); // Simulate all 48 memes from database
      const startIndex = offset;
      const endIndex = startIndex + this.itemsPerPage;
      const paginatedMemes = allSampleMemes.slice(startIndex, endIndex);
      
      console.log(`Loading page ${this.currentPage}, showing memes ${startIndex + 1}-${Math.min(endIndex, allSampleMemes.length)} of ${allSampleMemes.length}`);
      
      // Check if we have more memes to load
      this.hasMoreMemes = endIndex < allSampleMemes.length;
      
      if (resetGrid) {
        this.renderMemeGrid(grid, paginatedMemes);
      } else {
        this.appendMemesToGrid(grid, paginatedMemes);
      }
      
    } catch (error) {
      console.error('Error loading home memes:', error);
      if (resetGrid) {
        grid.innerHTML = '<div class="error-message" style="text-align: center; padding: 20px;">Failed to load memes. Please try again.</div>';
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load trending memes
   * @param {boolean} resetGrid - Whether to reset the grid or append to it
   */
  async loadTrendingMemes(resetGrid = true) {
    const grid = document.querySelector('#trending-content .meme-grid');
    if (!grid) return;
    
    if (resetGrid) {
      this.currentPage = 1;
      this.hasMoreMemes = true;
      this.currentSection = 'trending';
      grid.innerHTML = '<div class="ui active centered inline loader"></div><p style="text-align: center; margin-top: 20px;">Loading trending memes...</p>';
    }
    
    this.isLoading = true;
    this.currentFilter = 'trending';
    
    try {
      const offset = (this.currentPage - 1) * this.itemsPerPage;
      const allTrendingMemes = this.generateSampleMemes(48, 'trending');
      const paginatedMemes = allTrendingMemes.slice(offset, offset + this.itemsPerPage);
      
      this.hasMoreMemes = (offset + this.itemsPerPage) < allTrendingMemes.length;
      
      if (resetGrid) {
        this.renderMemeGrid(grid, paginatedMemes);
      } else {
        this.appendMemesToGrid(grid, paginatedMemes);
      }
    } catch (error) {
      console.error('Error loading trending memes:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load liked memes
   * @param {boolean} resetGrid - Whether to reset the grid or append to it
   */
  async loadLikedMemes(resetGrid = true) {
    const grid = document.querySelector('#likes-content .meme-grid');
    if (!grid) return;
    
    if (resetGrid) {
      this.currentPage = 1;
      this.hasMoreMemes = true;
      this.currentSection = 'likes';
      grid.innerHTML = '<div class="ui active centered inline loader"></div><p style="text-align: center; margin-top: 20px;">Loading liked memes...</p>';
    }
    
    this.isLoading = true;
    this.currentFilter = 'liked';
    
    try {
      const offset = (this.currentPage - 1) * this.itemsPerPage;
      const allLikedMemes = this.generateSampleMemes(48, 'liked');
      const paginatedMemes = allLikedMemes.slice(offset, offset + this.itemsPerPage);
      
      this.hasMoreMemes = (offset + this.itemsPerPage) < allLikedMemes.length;
      
      if (resetGrid) {
        this.renderMemeGrid(grid, paginatedMemes);
      } else {
        this.appendMemesToGrid(grid, paginatedMemes);
      }
    } catch (error) {
      console.error('Error loading liked memes:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load user uploads
   * @param {boolean} resetGrid - Whether to reset the grid or append to it
   */
  async loadUserUploads(resetGrid = true) {
    const grid = document.querySelector('#uploads-content .meme-grid');
    if (!grid) return;
    
    if (resetGrid) {
      this.currentPage = 1;
      this.hasMoreMemes = true;
      this.currentSection = 'uploads';
      grid.innerHTML = '<div class="ui active centered inline loader"></div><p style="text-align: center; margin-top: 20px;">Loading your uploads...</p>';
    }
    
    this.isLoading = true;
    this.currentFilter = 'uploads';
    
    try {
      const offset = (this.currentPage - 1) * this.itemsPerPage;
      const allUploadMemes = this.generateSampleMemes(48, 'uploads');
      const paginatedMemes = allUploadMemes.slice(offset, offset + this.itemsPerPage);
      
      this.hasMoreMemes = (offset + this.itemsPerPage) < allUploadMemes.length;
      
      if (resetGrid) {
        this.renderMemeGrid(grid, paginatedMemes);
      } else {
        this.appendMemesToGrid(grid, paginatedMemes);
      }
    } catch (error) {
      console.error('Error loading user uploads:', error);
    } finally {
      this.isLoading = false;
    }
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
        views: "2.2k",
        upvotes: 84,
        downvotes: 12
      },
      {
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Modern Workspace",
        likes: 87,
        views: "3.4k",
        upvotes: 142,
        downvotes: 23
      },
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Business Meeting",
        likes: 42,
        views: "1.8k",
        upvotes: 67,
        downvotes: 8
      },
      {
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Tech Innovation",
        likes: 96,
        views: "4.1k",
        upvotes: 203,
        downvotes: 31
      },
      {
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Digital Strategy",
        likes: 71,
        views: "2.9k",
        upvotes: 118,
        downvotes: 15
      },
      {
        image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Creative Process",
        likes: 38,
        views: "1.5k",
        upvotes: 52,
        downvotes: 7
      },
      {
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Data Analytics",
        likes: 124,
        views: "5.2k",
        upvotes: 287,
        downvotes: 43
      },
      {
        image: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Startup Culture",
        likes: 67,
        views: "2.7k",
        upvotes: 95,
        downvotes: 18
      },
      {
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Remote Work",
        likes: 89,
        views: "3.6k",
        upvotes: 156,
        downvotes: 21
      },
      {
        image: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Office Design",
        likes: 55,
        views: "2.1k",
        upvotes: 78,
        downvotes: 9
      },
      {
        image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Product Launch",
        likes: 103,
        views: "4.5k",
        upvotes: 234,
        downvotes: 38
      },
      {
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Brand Strategy",
        likes: 76,
        views: "3.1k",
        upvotes: 124,
        downvotes: 19
      },
      {
        image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Marketing Campaign",
        likes: 91,
        views: "3.8k",
        upvotes: 167,
        downvotes: 25
      },
      {
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Growth Hacking",
        likes: 62,
        views: "2.4k",
        upvotes: 89,
        downvotes: 13
      },
      {
        image: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "User Experience",
        likes: 84,
        views: "3.3k",
        upvotes: 145,
        downvotes: 22
      },
      {
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Digital Transformation",
        likes: 118,
        views: "4.9k",
        upvotes: 298,
        downvotes: 47
      },
      {
        image: "https://images.unsplash.com/photo-1552664688-cf412ec27db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Team Building",
        likes: 47,
        views: "1.9k",
        upvotes: 63,
        downvotes: 6
      },
      {
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Leadership",
        likes: 79,
        views: "3.2k",
        upvotes: 132,
        downvotes: 17
      },
      {
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        title: "Future of Work",
        likes: 112,
        views: "4.7k",
        upvotes: 256,
        downvotes: 41
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
        upvotes: sourceData.upvotes,
        downvotes: sourceData.downvotes,
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
   * Append new memes to existing grid (for pagination)
   * @param {HTMLElement} container - Grid container
   * @param {Array} newMemes - New memes to append
   */
  appendMemesToGrid(container, newMemes) {
    console.log('Appending memes to grid:', container, newMemes.length);
    if (!container || newMemes.length === 0) {
      console.log('Nothing to append');
      return;
    }
    
    // Remove any loading indicators
    const loadingElements = container.querySelectorAll('.ui.loader, .loading-message');
    loadingElements.forEach(el => el.remove());
    
    // Append new memes to existing ones
    this.memes = [...this.memes, ...newMemes];
    
    // Create and append new meme cards
    newMemes.forEach(meme => {
      const memeCard = this.createMemeCard(meme);
      container.appendChild(memeCard);
    });
    
    // Add loading indicator if there are more memes to load
    if (this.hasMoreMemes) {
      this.addLoadingIndicator(container);
    } else {
      this.addEndMessage(container);
    }
    
    console.log('Memes appended successfully');
  }

  /**
   * Add loading indicator to the bottom of the grid
   * @param {HTMLElement} container - Grid container
   */
  addLoadingIndicator(container) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.style.cssText = 'width: 100%; text-align: center; padding: 20px; color: #666;';
    loadingDiv.innerHTML = '<i class="spinner icon"></i> Loading more memes...';
    container.appendChild(loadingDiv);
  }

  /**
   * Add "no more memes" indicator
   * @param {HTMLElement} container - Grid container
   */
  addEndMessage(container) {
    const endDiv = document.createElement('div');
    endDiv.className = 'end-message';
    endDiv.style.cssText = 'width: 100%; text-align: center; padding: 20px; color: #999; font-style: italic;';
    endDiv.innerHTML = '🎉 You\'ve reached the end! No more memes to load.';
    container.appendChild(endDiv);
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
                  <a class="btn2 btn2--circle btn2--secondary-alt meme-view-btn" title="View" href="#" data-meme-id="${meme.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
                      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </li>
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
            <div class="photo">ZM</div>
            <span class="display-name">ZedMemes</span>
            
            <!-- Vote buttons -->
            <div class="meme-vote-container">
              <button class="btn-vote btn-upvote" data-meme-id="${meme.id}" data-action="upvote" title="Upvote">
                <svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path>
                </svg>
                <span class="vote-count">${meme.upvotes || 0}</span>
              </button>
              
              <button class="btn-vote btn-downvote" data-meme-id="${meme.id}" data-action="downvote" title="Downvote">
                <svg fill="currentColor" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Zm0 17.193 7.315-7.264a.251.251 0 0 0-.177-.429H12.5V5.184A2.631 2.631 0 0 0 10.136 2.5a2.441 2.441 0 0 0-1.856.682A2.478 2.478 0 0 0 7.5 5v5.5H2.861a.251.251 0 0 0-.176.429L10 18.193Z"></path>
                </svg>
                <span class="vote-count">${meme.downvotes || 0}</span>
              </button>
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
   * Handle upvote action
   * @param {HTMLElement} button - Upvote button element
   */
  handleUpvote(button) {
    const memeId = button.getAttribute('data-meme-id');
    const countSpan = button.querySelector('.vote-count');
    const card = button.closest('.meme-card');
    const downvoteBtn = card.querySelector('.btn-downvote');
    
    if (button.classList.contains('active')) {
      // Remove upvote
      button.classList.remove('active');
      card.classList.remove('upvoted');
      
      // Decrease count
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount - 1;
    } else {
      // Add upvote
      button.classList.add('active');
      card.classList.add('upvoted');
      card.classList.remove('downvoted');
      
      // Remove downvote if active
      if (downvoteBtn.classList.contains('active')) {
        downvoteBtn.classList.remove('active');
        const downvoteCount = downvoteBtn.querySelector('.vote-count');
        const downvoteCurrentCount = parseInt(downvoteCount.textContent) || 0;
        downvoteCount.textContent = downvoteCurrentCount - 1;
      }
      
      // Increase count
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;
      
      // Add animation
      button.style.transform = 'scale(1.2)';
      setTimeout(() => {
        button.style.transform = '';
      }, 200);
    }
  }

  /**
   * Handle downvote action
   * @param {HTMLElement} button - Downvote button element
   */
  handleDownvote(button) {
    const memeId = button.getAttribute('data-meme-id');
    const countSpan = button.querySelector('.vote-count');
    const card = button.closest('.meme-card');
    const upvoteBtn = card.querySelector('.btn-upvote');
    
    if (button.classList.contains('active')) {
      // Remove downvote
      button.classList.remove('active');
      card.classList.remove('downvoted');
      
      // Decrease count (or increase since it's negative)
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount - 1;
    } else {
      // Add downvote
      button.classList.add('active');
      card.classList.add('downvoted');
      card.classList.remove('upvoted');
      
      // Remove upvote if active
      if (upvoteBtn.classList.contains('active')) {
        upvoteBtn.classList.remove('active');
        const upvoteCount = upvoteBtn.querySelector('.vote-count');
        const upvoteCurrentCount = parseInt(upvoteCount.textContent) || 0;
        upvoteCount.textContent = upvoteCurrentCount - 1;
      }
      
      // Increase count
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;
      
      // Add animation
      button.style.transform = 'scale(1.2)';
      setTimeout(() => {
        button.style.transform = '';
      }, 200);
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
}
