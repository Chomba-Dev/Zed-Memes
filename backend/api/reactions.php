<?php
/**
 * Reactions API for Zed-Memes
 * Handles like/dislike functionality
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
    $db = getDB();
    $authHandler = new AuthHandler();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'add_reaction':
                handleAddReaction($db, $authHandler);
                break;
            case 'remove_reaction':
                handleRemoveReaction($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'get_user_likes':
                handleGetUserLikes($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Reactions API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Handle adding a reaction (like/dislike)
 */
function handleAddReaction($db, $authHandler) {
    // Check authentication
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'Authentication required');
    }
    
    $token = $matches[1];
    $currentUser = $authHandler->getCurrentUser($token);
    
    if (!$currentUser) {
        sendResponse(false, 'Invalid or expired token');
    }
    
    // Validate input
    $memeId = intval($_POST['meme_id'] ?? 0);
    $reactionType = trim($_POST['reaction_type'] ?? '');
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    $allowedTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!in_array($reactionType, $allowedTypes)) {
        sendResponse(false, 'Invalid reaction type');
    }
    
    try {
        // Check if meme exists
        $stmt = $db->prepare("SELECT meme_id FROM memes WHERE meme_id = ?");
        $stmt->execute([$memeId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Meme not found');
        }
        
        // Check if user already has a reaction
        $stmt = $db->prepare("
            SELECT reaction_id, vote_type 
            FROM user_meme_reaction 
            WHERE meme_id = ? AND user_id = ? AND vote_type = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id'], $reactionType]);
        $existingReaction = $stmt->fetch();
        
        if ($existingReaction) {
            // Update existing reaction
            // Remove reaction if clicking the same type
            $stmt = $db->prepare("DELETE FROM user_meme_reaction WHERE reaction_id = ?");
            $stmt->execute([$existingReaction['reaction_id']]);
        } else {
            // Add new reaction
            $stmt = $db->prepare("
                INSERT INTO user_meme_reaction (meme_id, user_id, vote_type) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$memeId, $currentUser['user_id'], $reactionType]);
        }
        
        // Get updated reaction counts for all types
        $counts = [];
        foreach ($allowedTypes as $type) {
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM user_meme_reaction 
                WHERE meme_id = ? AND vote_type = ?
            ");
            $stmt->execute([$memeId, $type]);
            $counts[$type] = (int)($stmt->fetch()['count'] ?? 0);
        }
        
        // Get user's current reaction
        $userReaction = null;
        if ($existingReaction) {
            // Reaction was removed
            $userReaction = null;
        } else {
            // New reaction added
            $userReaction = $reactionType;
        }
        sendResponse(true, 'Reaction updated successfully', [
            'reactions' => $counts,
            'user_reaction' => $userReaction
        ]);
        
    } catch (Exception $e) {
        error_log("Add reaction error: " . $e->getMessage());
        sendResponse(false, 'Failed to add reaction');
    }
}

/**
 * Handle removing a reaction
 */
function handleRemoveReaction($db, $authHandler) {
    // Check authentication
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'Authentication required');
    }
    
    $token = $matches[1];
    $currentUser = $authHandler->getCurrentUser($token);
    
    if (!$currentUser) {
        sendResponse(false, 'Invalid or expired token');
    }
    
    // Validate input
    $memeId = intval($_POST['meme_id'] ?? 0);
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    try {
        // Remove user's reaction
        $stmt = $db->prepare("
            DELETE FROM user_meme_reaction 
            WHERE meme_id = ? AND user_id = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id']]);
        // Get updated reaction counts for all types
        $allowedTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
        $counts = [];
        foreach ($allowedTypes as $type) {
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM user_meme_reaction 
                WHERE meme_id = ? AND vote_type = ?
            ");
            $stmt->execute([$memeId, $type]);
            $counts[$type] = (int)($stmt->fetch()['count'] ?? 0);
        }
        sendResponse(true, 'Reaction removed successfully', [
            'reactions' => $counts,
            'user_reaction' => null
        ]);
        
    } catch (Exception $e) {
        error_log("Remove reaction error: " . $e->getMessage());
        sendResponse(false, 'Failed to remove reaction');
    }
}

/**
 * Handle getting all meme_ids liked by the current user
 */
function handleGetUserLikes($db, $authHandler) {
    // Check authentication
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendResponse(false, 'Authentication required');
    }
    
    $token = $matches[1];
    $currentUser = $authHandler->getCurrentUser($token);
    
    if (!$currentUser) {
        sendResponse(false, 'Invalid or expired token');
    }
    
    try {
        $stmt = $db->prepare("SELECT meme_id FROM user_meme_reaction WHERE user_id = ? AND vote_type = 'like'");
        $stmt->execute([$currentUser['user_id']]);
        $likedMemes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        sendResponse(true, 'User liked memes fetched successfully', [
            'liked_meme_ids' => $likedMemes
        ]);
    } catch (Exception $e) {
        error_log("Get user likes error: " . $e->getMessage());
        sendResponse(false, 'Failed to fetch liked memes');
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