<?php
/**
 * Upload API for Zed-Memes
 * Handles meme image uploads and storage
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../auth/AuthHandler.php';
require_once '../upload/UploadHandler.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handleUpload();
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Upload API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Handle meme upload
 */
function handleUpload() {
    // Check if user is authenticated
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'Authentication required');
    }
    
    $token = $matches[1];
    $authHandler = new AuthHandler();
    $currentUser = $authHandler->getCurrentUser($token);
    
    if (!$currentUser) {
        sendResponse(false, 'Invalid or expired token');
    }
    
    // Validate form data
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $category = trim($_POST['category'] ?? '');
    
    if (empty($title)) {
        sendResponse(false, 'Meme title is required');
    }
    
    if (strlen($title) < 3 || strlen($title) > 100) {
        sendResponse(false, 'Title must be between 3 and 100 characters');
    }
    
    if (!empty($description) && strlen($description) > 500) {
        sendResponse(false, 'Description must be less than 500 characters');
    }
    
    $validCategories = ['funny', 'gaming', 'animals', 'politics', 'other'];
    if (!in_array($category, $validCategories)) {
        sendResponse(false, 'Invalid category');
    }
    
    // Check if file was uploaded
    if (!isset($_FILES['meme_image']) || $_FILES['meme_image']['error'] !== UPLOAD_ERR_OK) {
        sendResponse(false, 'Please select an image file');
    }
    
    $uploadedFile = $_FILES['meme_image'];
    
    try {
        $uploadHandler = new UploadHandler();
        $result = $uploadHandler->uploadMeme($uploadedFile, $title, $description, $category, $currentUser['user_id']);
        
        if ($result['success']) {
            sendResponse(true, 'Meme uploaded successfully', $result['data']);
        } else {
            sendResponse(false, $result['message']);
        }
        
    } catch (Exception $e) {
        error_log("Upload error: " . $e->getMessage());
        sendResponse(false, 'Upload failed');
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