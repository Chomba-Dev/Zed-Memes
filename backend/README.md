# Zed-Memes Backend

A robust, scalable backend API for the Zed-Memes platform built with PHP, MySQL, and modern web technologies.

## 🏗️ Architecture

The backend follows a modular, layered architecture:

```
backend/
├── config/          # Configuration files
├── core/           # Core framework classes
├── auth/           # Authentication handlers
├── api/            # API endpoints
├── upload/         # File upload handlers
└── tests/          # Test suite
```

### Key Components

- **BaseAPI Class**: Provides common functionality for all API endpoints
- **Database Layer**: Singleton pattern with connection pooling
- **Authentication**: JWT-based authentication with rate limiting
- **File Upload**: Secure image upload with validation
- **Testing Framework**: Comprehensive test suite with reporting

## 🚀 Features

### Authentication & Security
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting (100 requests/minute)
- Input sanitization and validation
- CORS support
- Session management

### Meme Management
- CRUD operations for memes
- Image upload with validation
- Category-based organization
- Search functionality
- Pagination support

### Social Features
- User reactions (like, love, haha, wow, sad, angry)
- Comments with threading
- User following system
- Favorites/bookmarks
- Notifications

### Advanced Features
- Tag system for content organization
- User statistics and analytics
- Admin panel capabilities
- System settings management
- API rate limiting
- Comprehensive logging

## 📋 Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server
- PHP Extensions:
  - PDO MySQL
  - GD (for image processing)
  - JSON
  - OpenSSL
  - FileInfo

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Zed-Memes
```

### 2. Configure Database
```bash
# Import the database schema
mysql -u root -p < database/schema/zed_memes.sql
```

### 3. Configure Environment
Copy and modify the configuration:
```bash
cp backend/config/config.php.example backend/config/config.php
```

Update the database settings in `backend/config/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'zed_memes');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
```

### 4. Set Up Directories
```bash
# Create required directories
mkdir -p assets/images
mkdir -p assets/uploads
mkdir -p logs
mkdir -p cache
mkdir -p backups
mkdir -p reports

# Set permissions
chmod 755 assets/images
chmod 755 assets/uploads
chmod 755 logs
chmod 755 cache
chmod 755 backups
chmod 755 reports
```

### 5. Configure Web Server

#### Apache (.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ backend/api/$1 [QSA,L]
```

#### Nginx
```nginx
location /api/ {
    try_files $uri $uri/ /backend/api/index.php?$query_string;
}
```

## 🧪 Testing

### Running Tests

#### Run All Tests
```bash
php run_tests.php
```

#### Run Specific Test Suite
```bash
php run_tests.php suite Auth
php run_tests.php suite Meme
php run_tests.php suite API
```

#### Run Specific Test Method
```bash
php run_tests.php method Auth testUserRegistration
```

#### List Available Tests
```bash
php run_tests.php list
```

### Test Coverage

The test suite covers:

- **Authentication Tests** (15 tests)
  - User registration and validation
  - Login and JWT token handling
  - Password management
  - Profile updates

- **Meme Tests** (15 tests)
  - CRUD operations
  - Search and filtering
  - Reactions and comments
  - Pagination

- **API Tests** (20 tests)
  - Endpoint functionality
  - Request/response handling
  - Error scenarios
  - Rate limiting

### Test Reports

Tests generate HTML reports in the `reports/` directory with:
- Test results summary
- Success/failure rates
- Execution time
- Detailed breakdown by test suite

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth.php
Content-Type: application/json

{
    "username": "newuser",
    "email": "user@example.com",
    "password": "SecurePass123"
}
```

#### Login
```http
POST /api/auth.php
Content-Type: application/json

{
    "username": "newuser",
    "password": "SecurePass123"
}
```

### Meme Endpoints

#### Get All Memes
```http
GET /api/memes.php?page=1&limit=10
```

#### Get Meme by ID
```http
GET /api/memes.php?id=1
```

#### Create Meme
```http
POST /api/memes.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "title": "My Meme",
    "description": "A funny meme",
    "category": "funny",
    "image_path": "meme.jpg"
}
```

#### Update Meme
```http
PUT /api/memes.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "id": 1,
    "title": "Updated Title",
    "description": "Updated description"
}
```

#### Delete Meme
```http
DELETE /api/memes.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "id": 1
}
```

### Reaction Endpoints

#### Add Reaction
```http
POST /api/reactions.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "meme_id": 1,
    "reaction_type": "like"
}
```

#### Remove Reaction
```http
DELETE /api/reactions.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "id": 1
}
```

### Comment Endpoints

#### Add Comment
```http
POST /api/comments.php
Authorization: Bearer <token>
Content-Type: application/json

{
    "meme_id": 1,
    "comment_text": "Great meme!"
}
```

#### Get Comments
```http
GET /api/comments.php?meme_id=1
```

### Upload Endpoints

#### Upload Image
```http
POST /api/upload.php
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: [file]
```

## 🔧 Configuration

### Environment Variables

Set these environment variables for production:

```bash
APP_ENV=production
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASS=your_db_password
JWT_SECRET=your_secure_jwt_secret
APP_URL=https://yourdomain.com
```

### Configuration Options

Key configuration settings in `config.php`:

```php
// Upload settings
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_ALLOWED_TYPES', ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);

// Security settings
define('PASSWORD_MIN_LENGTH', 8);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 15 * 60); // 15 minutes

// API settings
define('API_RATE_LIMIT', 100); // requests per minute
define('MEMES_PER_PAGE', 12);
```

## 🔒 Security Features

### Input Validation
- Email format validation
- Password strength requirements
- Username format validation
- File type and size validation
- SQL injection prevention with prepared statements

### Authentication Security
- JWT tokens with expiration
- Password hashing with bcrypt
- Login attempt limiting
- Account lockout protection
- Secure session handling

### API Security
- Rate limiting per user/IP
- CORS configuration
- Input sanitization
- Error message sanitization
- Request validation

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `memes` - Meme content and metadata
- `reactions` - User reactions to memes
- `comments` - User comments on memes
- `tags` - Content categorization
- `notifications` - User notifications

### Relationship Tables
- `meme_tags` - Many-to-many relationship between memes and tags
- `user_follows` - User following relationships
- `user_favorites` - User favorite memes

### Views and Procedures
- `meme_stats` - Meme statistics view
- `user_stats` - User statistics view
- `GetMemeWithStats()` - Stored procedure for meme details
- `GetUserFeed()` - Stored procedure for user feed

## 🚀 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Stored procedures for complex queries
- Database views for common aggregations
- Connection pooling

### Caching
- Rate limit caching
- Session caching
- Query result caching (configurable)

### Image Processing
- Automatic thumbnail generation
- Image format optimization
- File size validation

## 📝 Logging

### Log Files
- `logs/error.log` - Error messages and exceptions
- `logs/info.log` - Information messages (debug mode only)

### Log Format
```
[2024-01-15 10:30:45] Error message {"context": "data"}
```

### Log Levels
- **Error**: System errors and exceptions
- **Info**: General information and API requests
- **Debug**: Detailed debugging information

## 🔧 Maintenance

### Database Maintenance
```sql
-- Clean up old rate limits
CALL CleanupOldRateLimits();

-- Optimize tables
OPTIMIZE TABLE users, memes, reactions, comments;

-- Check database size
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'zed_memes';
```

### File Cleanup
```bash
# Clean old uploads (older than 30 days)
find assets/uploads -type f -mtime +30 -delete

# Clean old logs (older than 90 days)
find logs -type f -mtime +90 -delete

# Clean old backups (older than 7 days)
find backups -type f -mtime +7 -delete
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

### Code Standards
- Follow PSR-12 coding standards
- Add comments for complex logic
- Write unit tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test suite for examples

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added comprehensive testing framework
- **v1.2.0** - Enhanced security and performance optimizations 