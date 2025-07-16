<?php
/**
 * votes API for Zed-Memes
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
            case 'add_vote':
                handleAddVote($db, $authHandler);
                break;
            case 'remove_vote':
                handleRemoveVote($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("votes API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Handle adding a vote (like/dislike)
 */
function handleAddVote($db, $authHandler) {
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
    $voteType = trim($_POST['vote_type'] ?? '');
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    if (!in_array($voteType, ['upvote', 'downvote'])) {
        sendResponse(false, 'Invalid vote type');
    }
    
    try {
        // Check if meme exists
        $stmt = $db->prepare("SELECT meme_id FROM memes WHERE meme_id = ?");
        $stmt->execute([$memeId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Meme not found');
        }
        
        // Check if user already has a vote
        $stmt = $db->prepare("
            SELECT vote_id, vote_type 
            FROM user_meme_votes 
            WHERE meme_id = ? AND user_id = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id']]);
        $existingVote = $stmt->fetch();
        
        if ($existingVote) {
            // Update existing vote
            if ($existingVote['vote_type'] === $voteType) {
                // Remove vote if clicking the same type
                $stmt = $db->prepare("DELETE FROM user_meme_votes WHERE vote_id = ?");
                $stmt->execute([$existingVote['vote_id']]);
            } else {
                // Change vote type
                $stmt = $db->prepare("
                    UPDATE user_meme_votes 
                    SET vote_type = ? 
                    WHERE vote_id = ?
                ");
                $stmt->execute([$voteType, $existingVote['vote_id']]);
            }
        } else {
            // Add new vote
            $stmt = $db->prepare("
                INSERT INTO user_meme_votes (meme_id, user_id, vote_type) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$memeId, $currentUser['user_id'], $voteType]);
        }
        
        // Get updated vote counts
        $upvotes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM user_meme_votes 
            WHERE meme_id = ? AND vote_type = 'upvote'
        ");
        $upvotes->execute([$memeId]);
        $upvotesCount = $upvotes->fetch()['count'];
        
        $downvotes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM user_meme_votes 
            WHERE meme_id = ? AND vote_type = 'downvote'
        ");
        $downvotes->execute([$memeId]);
        $downvotesCount = $downvotes->fetch()['count'];
        
        // Get user's current vote
        $uservote = null;
        if ($existingVote) {
            if ($existingVote['vote_type'] === $voteType) {
                // vote was removed
                $uservote = null;
            } else {
                // vote was changed
                $uservote = $voteType;
            }
        } else {
            // New vote added
            $uservote = $voteType;
        }
        
        sendResponse(true, 'vote updated successfully', [
            'upvotes' => $upvotesCount,
            'downvotes' => $downvotesCount,
            'user_vote' => $uservote
        ]);
        
    } catch (Exception $e) {
        error_log("Add vote error: " . $e->getMessage());
        sendResponse(false, 'Failed to add vote');
    }
}

/**
 * Handle removing a vote
 */
function handleRemoveVote($db, $authHandler) {
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
        // Remove user's vote
        $stmt = $db->prepare("
            DELETE FROM user_meme_votes 
            WHERE meme_id = ? AND user_id = ?
        ");
        $stmt->execute([$memeId, $currentUser['user_id']]);
        
        // Get updated vote counts
        $upvotes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM user_meme_votes 
            WHERE meme_id = ? AND vote_type = 'upvote'
        ");
        $upvotes->execute([$memeId]);
        $upvotesCount = $upvotes->fetch()['count'];
        
        $downvotes = $db->prepare("
            SELECT COUNT(*) as count 
            FROM user_meme_votes 
            WHERE meme_id = ? AND vote_type = 'downvote'
        ");
        $downvotes->execute([$memeId]);
        $downvotesCount = $downvotes->fetch()['count'];
        
        sendResponse(true, 'vote removed successfully', [
            'upvotes' => $upvotesCount,
            'downvotes' => $downvotesCount,
            'user_vote' => null
        ]);
        
    } catch (Exception $e) {
        error_log("Remove vote error: " . $e->getMessage());
        sendResponse(false, 'Failed to remove vote');
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