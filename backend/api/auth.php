<?php
/**
 * Authentication API for Zed-Memes
 * Handles user registration, login, and token verification
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../auth/AuthHandler.php';

try {
    $authHandler = new AuthHandler();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_REQUEST['action'] ?? '';
        switch ($action) {
            case 'register':
                handleRegister($authHandler);
                break;
            case 'login':
                handleLogin($authHandler);
                break;
            case 'verify_token':
                handleVerifyToken($authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_REQUEST['action'] ?? '';

        switch ($action) {
            case 'profile':
                handleGetProfile($authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $action = $_REQUEST['action'] ?? '';

        switch ($action) {
            case 'edit_profile':
                handleEditProfile($authHandler);
                break;
            case 'delete_profile':
                handleDeleteProfile($authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Handle user registration
 */
function handleRegister($authHandler) {
    $json = json_decode(file_get_contents("php://input"), true);
    $username = $json['username'];
    $email = $json['email'];
    $password = $json['password'];
    $confirmPassword = $json['confirm_password'];
    
    // Validate input
    if (empty($username)) sendResponse(false, 'username is required');
    if (empty($email)) sendResponse(false, 'email is required');
    if (empty($password)) sendResponse(false, 'password is required');
    if (empty($confirmPassword)) sendResponse(false, 'confirm password is required');
    
    if (strlen($username) < 3) {
        sendResponse(false, 'Username must be at least 3 characters long');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format');
    }
    
    if (strlen($password) < 8) {
        sendResponse(false, 'Password must be at least 8 characters long');
    }
    
    if ($password !== $confirmPassword) {
        sendResponse(false, 'Passwords do not match');
    }
    
    // Check password strength
    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', $password)) {
        sendResponse(false, 'Password must contain uppercase, lowercase, and number');
    }
    
    try {
        $result = $authHandler->register($username, $email, $password);
        
        if ($result['success']) {
            sendResponse(true, 'Registration successful', $result['data']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());
        sendResponse(false, 'Registration failed');
    }
}

/**
 * Handle user login
 */
function handleLogin($authHandler) {
    $json = json_decode(file_get_contents("php://input"), true);
    $identifier = $json['email'] ?? '';
    $password = $json['password'] ?? '';
    echo $identifier;
    echo $password;
    if (empty($identifier) || empty($password)) {
        sendResponse(false, 'Username/email and password are required');
    }
    try {
        $result = $authHandler->login($identifier, $password);
        if ($result['success']) {
            sendResponse(true, 'Login successful', $result['data']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        sendResponse(false, 'Login failed');
    }
}

/**
 * Handle token verification
 */
function handleVerifyToken($authHandler) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'No token provided');
    }
    
    $token = $matches[1];
    
    try {
        $result = $authHandler->verifyToken($token);
        
        if ($result['success']) {
            sendResponse(true, 'Token valid', $result['data']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Token verification error: " . $e->getMessage());
        sendResponse(false, 'Token verification failed');
    }
}

/**
 * Handle get user profile
 */
function handleGetProfile($authHandler) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'No token provided');
    }
    $token = $matches[1];
    $user = $authHandler->getCurrentUser($token);
    if (!$user) {
        sendResponse(false, 'Invalid or expired token');
    }
    $result = $authHandler->getProfile($user['user_id']);
    if ($result['success']) {
        sendResponse(true, 'Profile fetched', $result['data']);
    } else {
        sendResponse(false, $result['message']);
    }
}

/**
 * Handle edit user profile
 */
function handleEditProfile($authHandler) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'No token provided');
    }
    $token = $matches[1];
    $user = $authHandler->getCurrentUser($token);
    if (!$user) {
        sendResponse(false, 'Invalid or expired token');
    }
    $json = json_decode(file_get_contents("php://input"), true);
    if (!$json) {
        sendResponse(false, 'No data provided');
    }
    $fields = array_intersect_key($json, array_flip(['username', 'email', 'profile_picture_path']));
    if (empty($fields)) {
        sendResponse(false, 'No valid fields to update');
    }
    $result = $authHandler->updateProfile($user['user_id'], $fields);
    if ($result['success']) {
        sendResponse(true, $result['message']);
    } else {
        sendResponse(false, $result['message']);
    }
}

/**
 * Handle delete user profile
 */
function handleDeleteProfile($authHandler) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'No token provided');
    }
    $token = $matches[1];
    $user = $authHandler->getCurrentUser($token);
    if (!$user) {
        sendResponse(false, 'Invalid or expired token');
    }
    $result = $authHandler->deleteProfile($user['user_id']);
    if ($result['success']) {
        sendResponse(true, $result['message']);
    } else {
        sendResponse(false, $result['message']);
    }
}

/**
 * Send JSON response
 */
function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit();
}
?> 