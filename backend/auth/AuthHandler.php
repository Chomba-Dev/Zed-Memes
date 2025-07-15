<?php
/**
 * Authentication Handler for Zed-Memes
 * Manages user registration, login, and token generation
 */

require_once '../config/database.php';

class AuthHandler {
    private $db;
    private $jwtSecret = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Register a new user
     */
    public function register($username, $email, $password) {
        try {
            // Check if username already exists
            $stmt = $this->db->prepare("SELECT user_id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                return ['success' => false, 'message' => 'Username already exists'];
            }
            // Check if email already exists
            $stmt = $this->db->prepare("SELECT user_id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                return ['success' => false, 'message' => 'Email already registered'];
            }
            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            // Insert new user
            $stmt = $this->db->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
            $stmt->execute([$username, $email, $hashedPassword]);
            $userId = $this->db->lastInsertId();
            // Generate token
            $token = $this->generateToken($userId, $username, $email);
            return [
                'success' => true,
                'message' => 'Registration successful',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'user_id' => $userId,
                        'username' => $username,
                        'email' => $email
                    ]
                ]
            ];
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Registration failed'];
        }
    }

    /**
     * Login user (by email or username)
     */
    public function login($identifier, $password) {
        try {
            // Get user by email or username
            $stmt = $this->db->prepare("SELECT user_id, username, email, password_hash FROM users WHERE email = ? OR username = ?");
            $stmt->execute([$identifier, $identifier]);
            $user = $stmt->fetch();
            if (!$user) {
                return ['success' => false, 'message' => 'Invalid username/email or password'];
            }
            // Verify password
            if (!password_verify($password, $user['password_hash'])) {
                return ['success' => false, 'message' => 'Invalid username/email or password'];
            }
            // Generate token
            $token = $this->generateToken($user['user_id'], $user['username'], $user['email']);
            return [
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'user_id' => $user['user_id'],
                        'username' => $user['username'],
                        'email' => $user['email']
                    ]
                ]
            ];
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Login failed'];
        }
    }

    /**
     * Verify JWT token
     */
    public function verifyToken($token) {
        try {
            $payload = $this->decodeToken($token);
            
            if (!$payload) {
                return ['success' => false, 'message' => 'Invalid token'];
            }
            
            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return ['success' => false, 'message' => 'Token expired'];
            }
            
            // Get user from database
            $stmt = $this->db->prepare("
                SELECT user_id, username, email 
                FROM users 
                WHERE user_id = ?
            ");
            $stmt->execute([$payload['user_id']]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return ['success' => false, 'message' => 'User not found'];
            }
            
            return [
                'success' => true,
                'message' => 'Token valid',
                'data' => [
                    'user_id' => $user['user_id'],
                    'username' => $user['username'],
                    'email' => $user['email']
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Token verification error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Token verification failed'];
        }
    }
    
    /**
     * Get current user from token
     */
    public function getCurrentUser($token) {
        $result = $this->verifyToken($token);
        if ($result['success']) {
            return $result['data'];
        }
        return null;
    }
    
    /**
     * Generate JWT token
     */
    private function generateToken($userId, $username, $email) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $userId,
            'username' => $username,
            'email' => $email,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60) // 24 hours
        ]);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->jwtSecret, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    /**
     * Decode JWT token
     */
    private function decodeToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], $this->jwtSecret, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }
        
        return json_decode($payload, true);
    }
    
    /**
     * Update user password
     */
    public function updatePassword($userId, $newPassword) {
        try {
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $this->db->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
            $stmt->execute([$hashedPassword, $userId]);
            return ['success' => true, 'message' => 'Password updated successfully'];
        } catch (Exception $e) {
            error_log("Password update error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Password update failed'];
        }
    }
    
    /**
     * Delete user account
     */
    public function deleteAccount($userId) {
        try {
            $this->db->beginTransaction();
            // Delete user's memes
            $stmt = $this->db->prepare("DELETE FROM memes WHERE user_id = ?");
            $stmt->execute([$userId]);
            // Delete user's votes
            $stmt = $this->db->prepare("DELETE FROM user_meme_votes WHERE user_id = ?");
            $stmt->execute([$userId]);
            // Delete user's reactions
            $stmt = $this->db->prepare("DELETE FROM user_meme_reaction WHERE user_id = ?");
            $stmt->execute([$userId]);
            // Delete user
            $stmt = $this->db->prepare("DELETE FROM users WHERE user_id = ?");
            $stmt->execute([$userId]);
            $this->db->commit();
            return ['success' => true, 'message' => 'Account deleted successfully'];
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Account deletion error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Account deletion failed'];
        }
    }

    /**
     * Get user profile
     */
    public function getProfile($userId) {
        try {
            $stmt = $this->db->prepare("SELECT user_id, username, email, profile_picture_path FROM users WHERE user_id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if (!$user) {
                return ['success' => false, 'message' => 'User not found'];
            }
            return ['success' => true, 'data' => $user];
        } catch (Exception $e) {
            error_log("Get profile error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to get profile'];
        }
    }

    /**
     * Update user profile (username, email, profile_picture_path)
     */
    public function updateProfile($userId, $fields) {
        try {
            $allowed = ['username', 'email', 'profile_picture_path'];
            $set = [];
            $params = [];
            foreach ($fields as $key => $value) {
                if (in_array($key, $allowed)) {
                    $set[] = "$key = ?";
                    $params[] = $value;
                }
            }
            if (empty($set)) {
                return ['success' => false, 'message' => 'No valid fields to update'];
            }
            $params[] = $userId;
            $sql = "UPDATE users SET " . implode(", ", $set) . " WHERE user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return ['success' => true, 'message' => 'Profile updated successfully'];
        } catch (Exception $e) {
            error_log("Update profile error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to update profile'];
        }
    }

    /**
     * Delete user profile (alias for deleteAccount)
     */
    public function deleteProfile($userId) {
        return $this->deleteAccount($userId);
    }
}
?> 