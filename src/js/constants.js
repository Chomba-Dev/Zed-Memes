const APP_CONFIG = {
  BASE_URL: 'http://localhost/Zed-Memes',
  
  
  API: {
    AUTH: {
      LOGIN: '/backend/api/auth.php?action=login',
      REGISTER: '/backend/api/auth.php?action=register',
      VERIFY_TOKEN: '/backend/api/auth.php?action=verify_token',
      PROFILE: '/backend/api/auth.php?action=profile',
      EDIT_PROFILE: '/backend/api/auth.php?action=edit_profile',
      DELETE_PROFILE: '/backend/api/auth.php?action=delete_profile'
    },
    
    MEMES: {
      GET_RELEVANT: '/backend/api/memes.php?action=get_relevant',
      GET_TRENDING: '/backend/api/memes.php?action=get_trending',
      GET_USER_UPLOADS: '/backend/api/memes.php?action=get_user_uploads',
      SEARCH: '/backend/api/memes.php?action=search_memes'
    },
    
    UPLOAD: {
      UPLOAD_MEME: '/backend/api/upload.php',
      UPLOAD_PROFILE_PICTURE: '/backend/api/upload.php?action=upload_profile_picture',
      DELETE_MEME: '/backend/api/upload.php?action=delete_meme',
      DELETE_PROFILE_PICTURE: '/backend/api/upload.php?action=delete_profile_picture'
    },
    
    REACTIONS: {
      ADD_REACTION: '/backend/api/reactions.php',
      GET_REACTIONS: '/backend/api/reactions.php?action=get_reactions'
    },
    
    VOTES: {
      ADD_VOTE: '/backend/api/upvote.php',
      GET_VOTES: '/backend/api/upvote.php?action=get_votes'
    },
    
    COMMENTS: {
      ADD_COMMENT: '/backend/api/comments.php?action=add_comment',
      GET_COMMENTS: '/backend/api/comments.php?action=get_comments',
      DELETE_COMMENT: '/backend/api/comments.php?action=delete_comment'
    }
  },
  
  STORAGE: {
    TOKEN: 'zedmemes-token',
    USER: 'zedmemes-user',
    THEME: 'zedmemes-theme',
    SAVED_MEMES: 'zedmemes-saved-memes',
    LIKED_MEMES: 'zedmemes-liked-memes',
    INTERACTIONS: 'zedmemes-interactions'
  },
  
  UI: {
    TOAST_DURATION: 4000,
    SEARCH_DELAY: 500,
    ANIMATION_DURATION: 300,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  
  PAGINATION: {
    MEMES_PER_PAGE: 12,
    COMMENTS_PER_PAGE: 10,
    MAX_SEARCH_RESULTS: 20
  }
};

function getApiUrl(endpoint) {
  return APP_CONFIG.BASE_URL + endpoint;
}

function getAuthHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const storedToken = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
  }
  
  return headers;
}

function getUploadHeaders(token = null) {
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const storedToken = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
  }
  
  return headers;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APP_CONFIG, getApiUrl, getAuthHeaders, getUploadHeaders };
} 