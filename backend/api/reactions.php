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
    
    if (!in_array($reactionType, ['like', 'dislike'])) {
        sendResponse(false, 'Invalid reaction type');
    }
    
    try {
        // Check if meme exists
        $stmt = $db->prepare("SELECT id FROM memes WHERE id = ?");
        $stmt->execute([$memeId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Meme not found');
        }
        
        // Check if user already has a reaction
        $stmt = $db->prepare("
            SELECT id, reaction_type 
            FROM reactions 
            WHERE meme_id = ? AND user_id = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id']]);
        $existingReaction = $stmt->fetch();
        
        if ($existingReaction) {
            // Update existing reaction
            if ($existingReaction['reaction_type'] === $reactionType) {
                // Remove reaction if clicking the same type
                $stmt = $db->prepare("DELETE FROM reactions WHERE id = ?");
                $stmt->execute([$existingReaction['id']]);
            } else {
                // Change reaction type
                $stmt = $db->prepare("
                    UPDATE reactions 
                    SET reaction_type = ?, updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmt->execute([$reactionType, $existingReaction['id']]);
            }
        } else {
            // Add new reaction
            $stmt = $db->prepare("
                INSERT INTO reactions (meme_id, user_id, reaction_type, created_at) 
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$memeId, $currentUser['user_id'], $reactionType]);
        }
        
        // Get updated reaction counts
        $likes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reactions 
            WHERE meme_id = ? AND reaction_type = 'like'
        ");
        $likes->execute([$memeId]);
        $likesCount = $likes->fetch()['count'];
        
        $dislikes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reactions 
            WHERE meme_id = ? AND reaction_type = 'dislike'
        ");
        $dislikes->execute([$memeId]);
        $dislikesCount = $dislikes->fetch()['count'];
        
        // Get user's current reaction
        $userReaction = null;
        if ($existingReaction) {
            if ($existingReaction['reaction_type'] === $reactionType) {
                // Reaction was removed
                $userReaction = null;
            } else {
                // Reaction was changed
                $userReaction = $reactionType;
            }
        } else {
            // New reaction added
            $userReaction = $reactionType;
        }
        
        sendResponse(true, 'Reaction updated successfully', [
            'likes' => $likesCount,
            'dislikes' => $dislikesCount,
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
            DELETE FROM reactions 
            WHERE meme_id = ? AND user_id = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id']]);
        
        // Get updated reaction counts
        $likes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reactions 
            WHERE meme_id = ? AND reaction_type = 'like'
        ");
        $likes->execute([$memeId]);
        $likesCount = $likes->fetch()['count'];
        
        $dislikes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reactions 
            WHERE meme_id = ? AND reaction_type = 'dislike'
        ");
        $dislikes->execute([$memeId]);
        $dislikesCount = $dislikes->fetch()['count'];
        
        sendResponse(true, 'Reaction removed successfully', [
            'likes' => $likesCount,
            'dislikes' => $dislikesCount,
            'user_reaction' => null
        ]);
        
    } catch (Exception $e) {
        error_log("Remove reaction error: " . $e->getMessage());
        sendResponse(false, 'Failed to remove reaction');
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