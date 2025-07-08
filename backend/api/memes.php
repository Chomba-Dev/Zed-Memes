<?php
/**
 * Memes API for Zed-Memes
 * Handles meme retrieval, details, trending, and search
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
            case 'get_memes':
                handleGetMemes($db, $authHandler);
                break;
            case 'get_meme_detail':
                handleGetMemeDetail($db, $authHandler);
                break;
            case 'get_trending':
                handleGetTrending($db, $authHandler);
                break;
            case 'search_memes':
                handleSearchMemes($db, $authHandler);
                break;
            case 'filter_memes':
                handleFilterMemes($db, $authHandler);
                break;
            default:
                sendResponse(false, 'Invalid action');
        }
    } else {
        sendResponse(false, 'Method not allowed');
    }
} catch (Exception $e) {
    error_log("Memes API Error: " . $e->getMessage());
    sendResponse(false, 'Internal server error');
}

/**
 * Get all memes with pagination
 */
function handleGetMemes($db, $authHandler) {
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(20, max(1, intval($_GET['limit'] ?? 12)));
    $offset = ($page - 1) * $limit;
    
    try {
        $sql = "
            SELECT 
                m.id,
                m.title,
                m.description,
                m.image_path,
                m.category,
                m.created_at,
                u.username as author,
                u.id as user_id,
                COUNT(DISTINCT r.id) as likes,
                COUNT(DISTINCT c.id) as comments_count,
                (
                    SELECT COUNT(*) 
                    FROM reactions r2 
                    WHERE r2.meme_id = m.id AND r2.reaction_type = 'dislike'
                ) as dislikes
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN reactions r ON m.id = r.meme_id AND r.reaction_type = 'like'
            LEFT JOIN comments c ON m.id = c.meme_id
            GROUP BY m.id
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $memes = $stmt->fetchAll();
        
        // Get total count for pagination
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM memes");
        $countStmt->execute();
        $total = $countStmt->fetch()['total'];
        
        sendResponse(true, 'Memes retrieved successfully', [
            'memes' => $memes,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($total / $limit),
                'total_items' => $total,
                'items_per_page' => $limit
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve memes');
    }
}

/**
 * Get meme detail with user reaction
 */
function handleGetMemeDetail($db, $authHandler) {
    $memeId = intval($_GET['meme_id'] ?? 0);
    
    if ($memeId <= 0) {
        sendResponse(false, 'Invalid meme ID');
    }
    
    try {
        // Get current user from token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $userReaction = null;
        
        if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $currentUser = $authHandler->getCurrentUser($token);
            
            if ($currentUser) {
                // Get user's reaction to this meme
                $reactionStmt = $db->prepare("
                    SELECT reaction_type 
                    FROM reactions 
                    WHERE meme_id = ? AND user_id = ?
                ");
                $reactionStmt->execute([$memeId, $currentUser['user_id']]);
                $reaction = $reactionStmt->fetch();
                $userReaction = $reaction ? $reaction['reaction_type'] : null;
            }
        }
        
        // Get meme details
        $sql = "
            SELECT 
                m.id,
                m.title,
                m.description,
                m.image_path,
                m.category,
                m.created_at,
                u.username as author,
                u.id as user_id,
                COUNT(DISTINCT r_like.id) as likes,
                COUNT(DISTINCT r_dislike.id) as dislikes,
                COUNT(DISTINCT c.id) as comments_count
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN reactions r_like ON m.id = r_like.meme_id AND r_like.reaction_type = 'like'
            LEFT JOIN reactions r_dislike ON m.id = r_dislike.meme_id AND r_dislike.reaction_type = 'dislike'
            LEFT JOIN comments c ON m.id = c.meme_id
            WHERE m.id = ?
            GROUP BY m.id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$memeId]);
        $meme = $stmt->fetch();
        
        if (!$meme) {
            sendResponse(false, 'Meme not found');
        }
        
        $meme['user_reaction'] = $userReaction;
        
        sendResponse(true, 'Meme details retrieved successfully', $meme);
        
    } catch (Exception $e) {
        error_log("Get meme detail error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve meme details');
    }
}

/**
 * Get trending memes (most liked in last 7 days)
 */
function handleGetTrending($db, $authHandler) {
    $limit = min(20, max(1, intval($_GET['limit'] ?? 12)));
    
    try {
        $sql = "
            SELECT 
                m.id,
                m.title,
                m.description,
                m.image_path,
                m.category,
                m.created_at,
                u.username as author,
                u.id as user_id,
                COUNT(DISTINCT r_like.id) as likes,
                COUNT(DISTINCT r_dislike.id) as dislikes,
                COUNT(DISTINCT c.id) as comments_count
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN reactions r_like ON m.id = r_like.meme_id AND r_like.reaction_type = 'like'
            LEFT JOIN reactions r_dislike ON m.id = r_dislike.meme_id AND r_dislike.reaction_type = 'dislike'
            LEFT JOIN comments c ON m.id = c.meme_id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY m.id
            ORDER BY likes DESC, comments_count DESC
            LIMIT ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$limit]);
        $memes = $stmt->fetchAll();
        
        sendResponse(true, 'Trending memes retrieved successfully', $memes);
        
    } catch (Exception $e) {
        error_log("Get trending memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve trending memes');
    }
}

/**
 * Search memes by title or description
 */
function handleSearchMemes($db, $authHandler) {
    $query = trim($_GET['query'] ?? '');
    
    if (empty($query)) {
        sendResponse(false, 'Search query is required');
    }
    
    if (strlen($query) < 2) {
        sendResponse(false, 'Search query must be at least 2 characters');
    }
    
    try {
        $searchTerm = '%' . $query . '%';
        
        $sql = "
            SELECT 
                m.id,
                m.title,
                m.description,
                m.image_path,
                m.category,
                m.created_at,
                u.username as author,
                u.id as user_id,
                COUNT(DISTINCT r_like.id) as likes,
                COUNT(DISTINCT r_dislike.id) as dislikes,
                COUNT(DISTINCT c.id) as comments_count
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN reactions r_like ON m.id = r_like.meme_id AND r_like.reaction_type = 'like'
            LEFT JOIN reactions r_dislike ON m.id = r_dislike.meme_id AND r_dislike.reaction_type = 'dislike'
            LEFT JOIN comments c ON m.id = c.meme_id
            WHERE m.title LIKE ? OR m.description LIKE ?
            GROUP BY m.id
            ORDER BY m.created_at DESC
            LIMIT 20
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm]);
        $memes = $stmt->fetchAll();
        
        sendResponse(true, 'Search completed successfully', $memes);
        
    } catch (Exception $e) {
        error_log("Search memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to search memes');
    }
}

/**
 * Filter memes by category
 */
function handleFilterMemes($db, $authHandler) {
    $category = trim($_GET['category'] ?? '');
    
    if (empty($category)) {
        sendResponse(false, 'Category is required');
    }
    
    $validCategories = ['funny', 'gaming', 'animals', 'politics', 'other'];
    if (!in_array($category, $validCategories)) {
        sendResponse(false, 'Invalid category');
    }
    
    try {
        $sql = "
            SELECT 
                m.id,
                m.title,
                m.description,
                m.image_path,
                m.category,
                m.created_at,
                u.username as author,
                u.id as user_id,
                COUNT(DISTINCT r_like.id) as likes,
                COUNT(DISTINCT r_dislike.id) as dislikes,
                COUNT(DISTINCT c.id) as comments_count
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.id
            LEFT JOIN reactions r_like ON m.id = r_like.meme_id AND r_like.reaction_type = 'like'
            LEFT JOIN reactions r_dislike ON m.id = r_dislike.meme_id AND r_dislike.reaction_type = 'dislike'
            LEFT JOIN comments c ON m.id = c.meme_id
            WHERE m.category = ?
            GROUP BY m.id
            ORDER BY m.created_at DESC
            LIMIT 20
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$category]);
        $memes = $stmt->fetchAll();
        
        sendResponse(true, 'Filtered memes retrieved successfully', $memes);
        
    } catch (Exception $e) {
        error_log("Filter memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to filter memes');
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