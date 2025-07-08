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

require_once '../config/database.php';
require_once '../auth/AuthHandler.php';

try {
    $authHandler = new AuthHandler();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
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
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // Validate input
    if (empty($username) || empty($email) || empty($password)) {
        sendResponse(false, 'All fields are required');
    }
    
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
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validate input
    if (empty($email) || empty($password)) {
        sendResponse(false, 'Email and password are required');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format');
    }
    
    try {
        $result = $authHandler->login($email, $password);
        
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