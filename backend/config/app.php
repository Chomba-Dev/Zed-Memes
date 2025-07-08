<?php
/**
 * Application Configuration for Zed-Memes
 */

// Application settings
define('APP_NAME', 'Zed-Memes');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/Zed-Memes');
define('APP_ENV', 'development'); // development, production

// Database settings
define('DB_HOST', 'localhost');
define('DB_NAME', 'zed_memes');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// JWT settings
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('JWT_EXPIRY', 24 * 60 * 60); // 24 hours in seconds

// Upload settings
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_ALLOWED_TYPES', ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);
define('UPLOAD_MAX_WIDTH', 1920);
define('UPLOAD_MAX_HEIGHT', 1080);
define('UPLOAD_DIR', '../../assets/images/');
define('UPLOAD_TEMP_DIR', '../../assets/uploads/');

// Security settings
define('PASSWORD_MIN_LENGTH', 8);
define('USERNAME_MIN_LENGTH', 3);
define('USERNAME_MAX_LENGTH', 50);
define('COMMENT_MAX_LENGTH', 500);
define('TITLE_MAX_LENGTH', 100);

// Pagination settings
define('MEMES_PER_PAGE', 12);
define('COMMENTS_PER_PAGE', 10);
define('MAX_SEARCH_RESULTS', 20);

// Error reporting
if (APP_ENV === 'development') {
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

function getAppUrl() {
    return APP_URL;
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
    if (isDevelopment()) {
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
?> 