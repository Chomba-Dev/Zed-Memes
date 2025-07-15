<?php
/**
 * Logs API for Zed-Memes
 * Handles share and download log updates
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

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        switch ($action) {
            case 'add_download_log':
                handleAddDownloadLog();
                break;
            case 'add_share_log':
                handleAddShareLog();
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Logs API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

function handleAddDownloadLog() {
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
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO meme_download_log (user_id, meme_id) VALUES (?, ?)");
        $stmt->execute([$currentUser['user_id'], $memeId]);
        sendResponse(true, 'Download log added successfully');
    } catch (Exception $e) {
        error_log("Add download log error: " . $e->getMessage());
        sendResponse(false, 'Failed to add download log');
    }
}

function handleAddShareLog() {
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
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO meme_share_log (user_id, meme_id) VALUES (?, ?)");
        $stmt->execute([$currentUser['user_id'], $memeId]);
        sendResponse(true, 'Share log added successfully');
    } catch (Exception $e) {
        error_log("Add share log error: " . $e->getMessage());
        sendResponse(false, 'Failed to add share log');
    }
}

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
