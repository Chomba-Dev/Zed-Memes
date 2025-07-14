# Zed-Memes Website

A modular meme sharing platform built with HTML, Semantic UI, JavaScript/jQuery, PHP, and MySQL.

## Project Structure

```
Zed-Memes/
├── frontend/
│   ├── html/           # HTML templates and layouts
│   ├── css/            # Semantic UI and custom styles
│   └── js/             # JavaScript/jQuery functionality
├── backend/
│   ├── api/            # PHP API endpoints
│   ├── auth/           # Authentication logic
│   ├── upload/         # File upload handling
│   └── config/         # Database and app configuration
├── database/
│   ├── schema/         # MySQL database schema
│   └── migrations/     # Database migrations
└── assets/
    ├── images/         # Uploaded memes and static images
    └── uploads/        # Temporary upload directory
```

## Setup Instructions

1. **Database Setup**
   - Import the schema from `database/schema/zed_memes.sql`
   - Configure database connection in `backend/config/database.php`

2. **Backend Setup**
   - Ensure PHP 7.4+ is installed
   - Configure upload directory permissions
   - Set up authentication settings

3. **Frontend Setup**
   - Open `frontend/html/index.html` in your browser
   - Ensure all CSS and JS files are properly linked

## Features

- User authentication and registration
- Meme upload and sharing
- Like/dislike reactions
- Comment system
- Responsive design with Semantic UI
- AJAX-powered dynamic interactions

## Technologies Used

- **Frontend**: HTML5, Semantic UI, JavaScript, jQuery
- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+
- **Server**: Apache/Nginx (XAMPP recommended)
