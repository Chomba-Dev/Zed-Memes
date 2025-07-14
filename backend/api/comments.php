<?php
/**
 * Comments API for Zed-Memes
 * Handles comment functionality
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
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_comments':
                handleGetComments($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'add_comment':
                handleAddComment($db, $authHandler);
                break;
            case 'delete_comment':
                handleDeleteComment($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Comments API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Get comments for a meme
 */
function handleGetComments($db, $authHandler) {
    $memeId = intval($_GET['meme_id'] ?? 0);
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(50, max(1, intval($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    try {
        // Check if meme exists
        $stmt = $db->prepare("SELECT meme_id FROM memes WHERE meme_id = ?");
        $stmt->execute([$memeId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Meme not found');
        }
        
        // Get comments with user info
        $sql = "
            SELECT 
                c.comment_id,
                c.comment_text,
                c.created_at,
                u.username,
                u.user_id as user_id
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.meme_id = ?
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$memeId, $limit, $offset]);
        $comments = $stmt->fetchAll();
        
        // Get total count for pagination
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM comments WHERE meme_id = ?");
        $countStmt->execute([$memeId]);
        $total = $countStmt->fetch()['total'];
        
        sendResponse(true, 'Comments retrieved successfully', [
            'comments' => $comments,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($total / $limit),
                'total_items' => $total,
                'items_per_page' => $limit
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get comments error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve comments');
    }
}

/**
 * Add a comment to a meme
 */
function handleAddComment($db, $authHandler) {
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
    $commentText = trim($_POST['comment_text'] ?? '');
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    if (empty($commentText)) {
        sendResponse(false, 'Comment text is required');
    }
    
    if (strlen($commentText) > 500) {
        sendResponse(false, 'Comment must be less than 500 characters');
    }
    
    try {
        // Check if meme exists
        $stmt = $db->prepare("SELECT meme_id FROM memes WHERE meme_id = ?");
        $stmt->execute([$memeId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Meme not found');
        }
        
        // Add comment
        $stmt = $db->prepare("
            INSERT INTO comments (meme_id, user_id, comment_text, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$memeId, $currentUser['user_id'], $commentText]);
        $commentId = $db->lastInsertId();
        
        // Get updated comment count
        $countStmt = $db->prepare("SELECT COUNT(*) as count FROM comments WHERE meme_id = ?");
        $countStmt->execute([$memeId]);
        $commentsCount = $countStmt->fetch()['count'];
        
        // Get the newly created comment
        $commentStmt = $db->prepare("
            SELECT 
                c.comment_id,
                c.comment_text,
                c.created_at,
                u.username,
                u.user_id as user_id
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        ");
        $commentStmt->execute([$commentId]);
        $comment = $commentStmt->fetch();
        
        sendResponse(true, 'Comment added successfully', [
            'comment' => $comment,
            'comments_count' => $commentsCount
        ]);
        
    } catch (Exception $e) {
        error_log("Add comment error: " . $e->getMessage());
        sendResponse(false, 'Failed to add comment');
    }
}

/**
 * Delete a comment
 */
function handleDeleteComment($db, $authHandler) {
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
    $commentId = intval($_POST['comment_id'] ?? 0);
    
    if ($commentId <= 0) {
        sendResponse(false, 'Invalid comment ID');
    }
    
    try {
        // Get comment info
        $stmt = $db->prepare("
            SELECT c.comment_id, c.meme_id, c.user_id 
            FROM comments c 
            WHERE c.comment_id = ?
        ");
        $stmt->execute([$commentId]);
        $comment = $stmt->fetch();
        
        if (!$comment) {
            sendResponse(false, 'Comment not found');
        }
        
        // Check if user owns the comment or is admin
        if ($comment['user_id'] != $currentUser['user_id']) {
            // TODO: Add admin check here if needed
            sendResponse(false, 'Unauthorized to delete this comment');
        }
        
        // Delete comment
        $stmt = $db->prepare("DELETE FROM comments WHERE comment_id = ?");
        $stmt->execute([$commentId]);
        
        // Get updated comment count
        $countStmt = $db->prepare("SELECT COUNT(*) as count FROM comments WHERE meme_id = ?");
        $countStmt->execute([$comment['meme_id']]);
        $commentsCount = $countStmt->fetch()['count'];
        
        sendResponse(true, 'Comment deleted successfully', [
            'comments_count' => $commentsCount
        ]);
        
    } catch (Exception $e) {
        error_log("Delete comment error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete comment');
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