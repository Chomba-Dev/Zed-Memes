<?php
/**
 * Centralized Configuration for Zed-Memes Backend
 */

// Application settings
define('APP_NAME', 'Zed-Memes Backend');
define('APP_VERSION', '1.0.0');
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_DEBUG', APP_ENV === 'development');

// Database settings
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'zed_memes');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');
define('DB_PORT', getenv('DB_PORT') ?: 3306);

// JWT settings
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production');
define('JWT_EXPIRY', 24 * 60 * 60); // 24 hours in seconds
define('JWT_ALGORITHM', 'HS256');

// Upload settings
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_ALLOWED_TYPES', ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);
define('UPLOAD_MAX_WIDTH', 1920);
define('UPLOAD_MAX_HEIGHT', 1080);
define('UPLOAD_DIR', __DIR__ . '/../../assets/images/');
define('UPLOAD_TEMP_DIR', __DIR__ . '/../../assets/uploads/');

// Security settings
define('PASSWORD_MIN_LENGTH', 8);
define('USERNAME_MIN_LENGTH', 3);
define('USERNAME_MAX_LENGTH', 50);
define('COMMENT_MAX_LENGTH', 500);
define('TITLE_MAX_LENGTH', 100);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 15 * 60); // 15 minutes

// Pagination settings
define('MEMES_PER_PAGE', 12);
define('COMMENTS_PER_PAGE', 10);
define('MAX_SEARCH_RESULTS', 20);

// API settings
define('API_RATE_LIMIT', 100); // requests per minute
define('API_RATE_LIMIT_WINDOW', 60); // seconds

// Error reporting
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('UTC');

// Session settings
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
if (APP_ENV === 'production') {
    ini_set('session.cookie_secure', 1);
}

// CORS settings
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Helper functions
function isProduction() {
    return APP_ENV === 'production';
}

function isDevelopment() {
    return APP_ENV === 'development';
}

function isTesting() {
    return APP_ENV === 'testing';
}

function getAppUrl() {
    return getenv('APP_URL') ?: 'http://localhost/Zed-Memes';
}

function getUploadDir() {
    return UPLOAD_DIR;
}

function getTempUploadDir() {
    return UPLOAD_TEMP_DIR;
}

function validateImageFile($file) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    return in_array($mimeType, UPLOAD_ALLOWED_TYPES);
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

function logError($message, $context = []) {
    $logFile = __DIR__ . '/../../logs/error.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
    $logEntry = "[{$timestamp}] {$message}{$contextStr}" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

function logInfo($message, $context = []) {
    if (APP_DEBUG) {
        $logFile = __DIR__ . '/../../logs/info.log';
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] {$message}{$contextStr}" . PHP_EOL;
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validatePassword($password) {
    return strlen($password) >= PASSWORD_MIN_LENGTH &&
           preg_match('/[A-Z]/', $password) &&
           preg_match('/[a-z]/', $password) &&
           preg_match('/[0-9]/', $password);
}

function validateUsername($username) {
    return strlen($username) >= USERNAME_MIN_LENGTH &&
           strlen($username) <= USERNAME_MAX_LENGTH &&
           preg_match('/^[a-zA-Z0-9_]+$/', $username);
}
?> 