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
                handleGetRelevant($db, $authHandler);
                break;
            case 'get_trending':
                handleGetTrending($db, $authHandler);
                break;
            case 'get_relevant':
                handleGetRelevant($db, $authHandler);
                break;
            case 'get_user_uploads':
                handleGetUserUploads($db, $authHandler);
                break;
            case 'search_memes':
                handleSearchMemes($db, $authHandler);
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


function enrichMeme($db, $meme) {
    // Get user info
    $userStmt = $db->prepare("SELECT user_id, username, email FROM users WHERE user_id = ?");
    $userStmt->execute([$meme['user_id']]);
    $user = $userStmt->fetch();
    $meme['user'] = $user;
    // Download logs
    $dlStmt = $db->prepare("SELECT * FROM meme_download_log WHERE meme_id = ?");
    $dlStmt->execute([$meme['meme_id']]);
    $meme['download_logs'] = $dlStmt->fetchAll();
    // Share logs
    $slStmt = $db->prepare("SELECT * FROM meme_share_log WHERE meme_id = ?");
    $slStmt->execute([$meme['meme_id']]);
    $meme['share_logs'] = $slStmt->fetchAll();
    // Reactions
    $reactionsStmt = $db->prepare("SELECT vote_type, COUNT(*) as count FROM user_meme_reaction WHERE meme_id = ? GROUP BY vote_type");
    $reactionsStmt->execute([$meme['meme_id']]);
    $meme['reactions'] = $reactionsStmt->fetchAll();
    // Votes
    $votesStmt = $db->prepare("SELECT vote_type, COUNT(*) as count FROM user_meme_votes WHERE meme_id = ? GROUP BY vote_type");
    $votesStmt->execute([$meme['meme_id']]);
    $meme['votes'] = $votesStmt->fetchAll();
    return [
        'meme_id' => $meme['meme_id'],
        'user' => $meme['user'],
        'image_path' => $meme['image_path'],
        'caption' => $meme['caption'] ?? null,
        'uploaded_at' => $meme['uploaded_at'] ?? null,
        'download_logs' => $meme['download_logs'],
        'share_logs' => $meme['share_logs'],
        'reactions' => $meme['reactions'],
        'votes' => $meme['votes']
    ];
}

function handleGetRandom($db) {
    $limit = min(20, max(1, intval($_GET['limit'] ?? 12)));
    try {
        $stmt = $db->prepare("SELECT meme_id, user_id, image_path, caption, uploaded_at FROM memes ORDER BY RAND() LIMIT ?");
        $stmt->execute([$limit]);
        $memes = $stmt->fetchAll();
        $result = [];
        foreach ($memes as $meme) {
            $result[] = enrichMeme($db, $meme);
        }
        sendResponse(true, 'Random memes retrieved successfully', $result);
    } catch (Exception $e) {
        error_log("Get random memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve random memes');
    }
}
/**
 * Get trending memes (most liked in last 7 days)
 */
function handleGetTrending($db, $authHandler) {
    $limit = min(20, max(1, intval($_GET['limit'] ?? 12)));
    try {
        $stmt = $db->prepare("CALL get_trending_memes()");
        $stmt->execute();
        $memes = $stmt->fetchAll();
        $stmt->closeCursor();
        $result = [];
        foreach ($memes as $meme) {
            $result[] = enrichMeme($db, $meme);
        }
        sendResponse(true, 'Trending memes retrieved successfully', array_slice($result, 0, $limit));
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
        return;
    }
    
    if (strlen($query) < 2) {
        sendResponse(false, 'Search query must be at least 2 characters');
        return;
    }
    
    try {
        $searchTerm = '%' . $query . '%';
        
        $sql = "
            SELECT 
                m.meme_id,
                m.user_id,
                m.image_path,
                m.caption,
                m.uploaded_at,
                u.username as author,
                COALESCE(SUM(CASE WHEN umv.vote_type = 'upvote' THEN 1 ELSE 0 END), 0) as upvotes,
                COALESCE(SUM(CASE WHEN umv.vote_type = 'downvote' THEN 1 ELSE 0 END), 0) as downvotes,
                COUNT(DISTINCT umr.reaction_id) as reactions_count
            FROM memes m
            LEFT JOIN users u ON m.user_id = u.user_id
            LEFT JOIN user_meme_votes umv ON m.meme_id = umv.meme_id
            LEFT JOIN user_meme_reaction umr ON m.meme_id = umr.meme_id
            WHERE m.caption LIKE ? OR u.username LIKE ?
            GROUP BY m.meme_id, m.user_id, m.image_path, m.caption, m.uploaded_at, u.username
            ORDER BY m.uploaded_at DESC
            LIMIT 20
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm]);
        $memes = $stmt->fetchAll();
        
        // Transform the data to match expected format
        $result = [];
        foreach ($memes as $meme) {
            $result[] = [
                'meme_id' => $meme['meme_id'],
                'user_id' => $meme['user_id'],
                'image_path' => $meme['image_path'],
                'caption' => $meme['caption'],
                'uploaded_at' => $meme['uploaded_at'],
                'author' => $meme['author'],
                'upvotes' => (int)$meme['upvotes'],
                'downvotes' => (int)$meme['downvotes'],
                'reactions_count' => (int)$meme['reactions_count']
            ];
        }
        
        sendResponse(true, 'Search completed successfully', $result);
        return;
        
    } catch (Exception $e) {
        error_log("Search memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to search memes: ' . $e->getMessage());
        return;
    }
}

function handleGetRelevant($db, $authHandler) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        handleGetRandom($db);
    }
    $token = $matches[1];
    $currentUser = $authHandler->getCurrentUser($token);
    if (!$currentUser) {
        sendResponse(false, 'Invalid or expired token');
    }
    try {
        $stmt = $db->prepare("CALL get_relevant_memes_for_user(?)");
        $stmt->execute([$currentUser['user_id']]);
        $memes = $stmt->fetchAll();
        $stmt->closeCursor();
        $result = [];
        foreach ($memes as $meme) {
            $result[] = enrichMeme($db, $meme);
        }
        sendResponse(true, 'Relevant memes retrieved successfully', $result);
    } catch (Exception $e) {
        error_log("Get relevant memes error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve relevant memes');
    }
}

function handleGetUserUploads($db, $authHandler) {
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
        $stmt = $db->prepare("CALL get_user_uploaded_memes(?)");
        $stmt->execute([$currentUser['user_id']]);
        $memes = $stmt->fetchAll();
        $stmt->closeCursor();
        $result = [];
        foreach ($memes as $meme) {
            $result[] = enrichMeme($db, $meme);
        }
        sendResponse(true, 'User uploaded memes retrieved successfully', $result);
    } catch (Exception $e) {
        error_log("Get user uploads error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve user uploaded memes');
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