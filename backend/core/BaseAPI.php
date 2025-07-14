<?php
/**
 * Base API Class for Zed-Memes
 * Provides common functionality for all API endpoints
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../auth/AuthHandler.php';

abstract class BaseAPI {
    protected $db;
    protected $authHandler;
    protected $requestMethod;
    protected $requestData;
    protected $headers;
    
    public function __construct() {
        $this->db = getDB();
        $this->authHandler = new AuthHandler();
        $this->requestMethod = $_SERVER['REQUEST_METHOD'];
        $this->requestData = $this->getRequestData();
        $this->headers = getallheaders();
        
        // Set response headers
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        
        // Handle preflight requests
        if ($this->requestMethod === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
    
    /**
     * Get request data based on method
     */
    protected function getRequestData() {
        switch ($this->requestMethod) {
            case 'GET':
                return $_GET;
            case 'POST':
                return $_POST;
            case 'PUT':
            case 'DELETE':
                parse_str(file_get_contents('php://input'), $data);
                return $data;
            default:
                return [];
        }
    }
    
    /**
     * Get current authenticated user
     */
    protected function getCurrentUser() {
        $authHeader = $this->headers['Authorization'] ?? '';
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        return $this->authHandler->getCurrentUser($token);
    }
    
    /**
     * Require authentication
     */
    protected function requireAuth() {
        $user = $this->getCurrentUser();
        if (!$user) {
            $this->sendResponse(false, 'Authentication required', null, 401);
        }
        return $user;
    }
    
    /**
     * Validate required fields
     */
    protected function validateRequired($data, $fields) {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            $this->sendResponse(false, 'Missing required fields: ' . implode(', ', $missing));
        }
        
        return true;
    }
    
    /**
     * Validate email format
     */
    protected function validateEmail($email) {
        if (!validateEmail($email)) {
            $this->sendResponse(false, 'Invalid email format');
        }
        return true;
    }
    
    /**
     * Validate password strength
     */
    protected function validatePassword($password) {
        if (!validatePassword($password)) {
            $this->sendResponse(false, 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters with uppercase, lowercase, and number');
        }
        return true;
    }
    
    /**
     * Validate username format
     */
    protected function validateUsername($username) {
        if (!validateUsername($username)) {
            $this->sendResponse(false, 'Username must be ' . USERNAME_MIN_LENGTH . '-' . USERNAME_MAX_LENGTH . ' characters and contain only letters, numbers, and underscores');
        }
        return true;
    }
    
    /**
     * Sanitize input
     */
    protected function sanitize($input) {
        if (is_array($input)) {
            return array_map([$this, 'sanitize'], $input);
        }
        return sanitizeInput($input);
    }
    
    /**
     * Rate limiting check
     */
    protected function checkRateLimit($identifier = null) {
        if ($identifier === null) {
            $user = $this->getCurrentUser();
            $identifier = $user ? $user['user_id'] : $_SERVER['REMOTE_ADDR'];
        }
        
        $cacheFile = __DIR__ . '/../../cache/rate_limit_' . md5($identifier) . '.txt';
        $cacheDir = dirname($cacheFile);
        
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        
        $now = time();
        $requests = [];
        
        if (file_exists($cacheFile)) {
            $requests = json_decode(file_get_contents($cacheFile), true) ?: [];
        }
        
        // Remove old requests outside the window
        $requests = array_filter($requests, function($timestamp) use ($now) {
            return $timestamp > ($now - API_RATE_LIMIT_WINDOW);
        });
        
        // Check if limit exceeded
        if (count($requests) >= API_RATE_LIMIT) {
            $this->sendResponse(false, 'Rate limit exceeded. Please try again later.', null, 429);
        }
        
        // Add current request
        $requests[] = $now;
        file_put_contents($cacheFile, json_encode($requests));
        
        return true;
    }
    
    /**
     * Send JSON response
     */
    protected function sendResponse($success, $message, $data = null, $statusCode = 200) {
        http_response_code($statusCode);
        
        $response = [
            'success' => $success,
            'message' => $message,
            'timestamp' => date('c')
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        if (APP_DEBUG) {
            $response['debug'] = [
                'request_method' => $this->requestMethod,
                'request_data' => $this->requestData,
                'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
            ];
        }
        
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * Send error response
     */
    protected function sendError($message, $statusCode = 400) {
        $this->sendResponse(false, $message, null, $statusCode);
    }
    
    /**
     * Send success response
     */
    protected function sendSuccess($message, $data = null) {
        $this->sendResponse(true, $message, $data);
    }
    
    /**
     * Log API request
     */
    protected function logRequest($action, $data = []) {
        $user = $this->getCurrentUser();
        $logData = [
            'action' => $action,
            'method' => $this->requestMethod,
            'user_id' => $user ? $user['user_id'] : null,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'data' => $data
        ];
        
        logInfo("API Request: {$action}", $logData);
    }
    
    /**
     * Handle exceptions
     */
    protected function handleException($e) {
        logError("API Exception: " . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        
        if (APP_DEBUG) {
            $this->sendError("Exception: " . $e->getMessage(), 500);
        } else {
            $this->sendError("Internal server error", 500);
        }
    }
    
    /**
     * Validate file upload
     */
    protected function validateFileUpload($file, $maxSize = null, $allowedTypes = null) {
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            $this->sendError('File upload failed');
        }
        
        if ($maxSize === null) {
            $maxSize = UPLOAD_MAX_SIZE;
        }
        
        if ($allowedTypes === null) {
            $allowedTypes = UPLOAD_ALLOWED_TYPES;
        }
        
        // Check file size
        if ($file['size'] > $maxSize) {
            $this->sendError('File size exceeds limit');
        }
        
        // Check file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            $this->sendError('Invalid file type');
        }
        
        return true;
    }
    
    /**
     * Paginate results
     */
    protected function paginate($query, $params = [], $page = 1, $limit = 10) {
        $page = max(1, intval($page));
        $limit = min(100, max(1, intval($limit)));
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countQuery = preg_replace('/SELECT .* FROM/', 'SELECT COUNT(*) as total FROM', $query);
        $countQuery = preg_replace('/ORDER BY .*/', '', $countQuery);
        $countQuery = preg_replace('/LIMIT .*/', '', $countQuery);
        
        $countStmt = $this->db->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];
        
        // Get paginated results
        $query .= " LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        return [
            'data' => $results,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($total / $limit),
                'total_items' => $total,
                'items_per_page' => $limit,
                'has_next' => $page < ceil($total / $limit),
                'has_prev' => $page > 1
            ]
        ];
    }
    
    /**
     * Abstract method that must be implemented by child classes
     */
    abstract public function handleRequest();
}
?> 