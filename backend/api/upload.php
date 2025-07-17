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
        $action = $_POST['action'] ?? 'upload_meme';
        if ($action === 'upload_profile_picture') {
            handleProfilePictureUpload();
        } else if ($action === 'delete_meme') {
            handleDeleteMeme();
        } else if ($action === 'delete_profile_picture') {
            handleDeleteProfilePicture();
        } else {
            handleUpload();
        }
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
    error_log("Upload request received");
    
    // Check if user is authenticated
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        error_log("Authentication required");
        sendResponse(false, 'Authentication required');
    }
    
    $token = $matches[1];
    $authHandler = new AuthHandler();
    $currentUser = $authHandler->getCurrentUser($token);
    
    if (!$currentUser) {
        error_log("Invalid or expired token");
        sendResponse(false, 'Invalid or expired token');
    }
    
    error_log("User authenticated: " . $currentUser['user_id']);
    
    // Validate form data
    $caption = trim($_POST['caption'] ?? '');
    error_log("Caption: " . $caption);
    
    if (!empty($caption) && strlen($caption) > 255) {
        error_log("Caption too long");
        sendResponse(false, 'Caption must be less than 255 characters');
    }
    
    // Check if file was uploaded
    if (!isset($_FILES['meme_image']) || $_FILES['meme_image']['error'] !== UPLOAD_ERR_OK) {
        error_log("File upload error: " . ($_FILES['meme_image']['error'] ?? 'No file'));
        sendResponse(false, 'Please select an image file');
    }
    
    $uploadedFile = $_FILES['meme_image'];
    error_log("File uploaded: " . $uploadedFile['name'] . " (" . $uploadedFile['size'] . " bytes)");
    
    try {
        $uploadHandler = new UploadHandler();
        error_log("Calling uploadMeme with parameters: " . $caption . ", " . $currentUser['user_id']);
        $result = $uploadHandler->uploadMeme($uploadedFile, $caption, $currentUser['user_id']);
        
        error_log("Upload result: " . json_encode($result));
        
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
 * Handle profile picture upload
 */
function handleProfilePictureUpload() {
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
    if (!isset($_FILES['profile_picture']) || $_FILES['profile_picture']['error'] !== UPLOAD_ERR_OK) {
        sendResponse(false, 'Please select a profile picture image file');
    }
    $uploadedFile = $_FILES['profile_picture'];
    try {
        $uploadHandler = new UploadHandler();
        $result = $uploadHandler->uploadProfilePicture($uploadedFile, $currentUser['user_id']);
        if ($result['success']) {
            sendResponse(true, 'Profile picture uploaded successfully', $result['data']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Profile picture upload error: " . $e->getMessage());
        sendResponse(false, 'Profile picture upload failed');
    }
}

/**
 * Handle meme deletion (with image cleanup)
 */
function handleDeleteMeme() {
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
    $memeId = intval($_POST['meme_id'] ?? 0);
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    try {
        $uploadHandler = new UploadHandler();
        $result = $uploadHandler->deleteMemeWithImage($memeId, $currentUser['user_id']);
        if ($result['success']) {
            sendResponse(true, $result['message']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Delete meme error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete meme');
    }
}

/**
 * Handle profile picture deletion (with image cleanup)
 */
function handleDeleteProfilePicture() {
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
    try {
        $uploadHandler = new UploadHandler();
        $result = $uploadHandler->deleteProfilePicture($currentUser['user_id']);
        if ($result['success']) {
            sendResponse(true, $result['message']);
        } else {
            sendResponse(false, $result['message']);
        }
    } catch (Exception $e) {
        error_log("Delete profile picture error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete profile picture');
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