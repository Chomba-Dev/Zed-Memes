<?php
/**
 * Upload Handler for Zed-Memes
 * Manages file uploads, image processing, and database storage
 */

require_once '../config/database.php';

class UploadHandler {
    private $db;
    private $uploadDir = '../../assets/images/';
    private $maxFileSize = 5 * 1024 * 1024; // 5MB
    private $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    private $maxWidth = 1920;
    private $maxHeight = 1080;
    
    public function __construct() {
        $this->db = getDB();
        
        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    /**
     * Upload a meme image
     */
    public function uploadMeme($file, $caption, $userId) {
        try {
            // Validate file
            $validation = $this->validateFile($file);
            if (!$validation['success']) {
                return $validation;
            }
            
            // Generate unique filename
            $filename = $this->generateFilename($file['name']);
            $filepath = $this->uploadDir . $filename;
            
            // Process and save image
            $processResult = $this->processImage($file['tmp_name'], $filepath);
            if (!$processResult['success']) {
                return $processResult;
            }
            
            // Save to database
            $dbResult = $this->saveToDatabase($caption, $filename, $userId);
            if (!$dbResult['success']) {
                // Delete uploaded file if database save fails
                if (file_exists($filepath)) {
                    unlink($filepath);
                }
                return $dbResult;
            }
            
            return [
                'success' => true,
                'message' => 'Meme uploaded successfully',
                'data' => [
                    'meme_id' => $dbResult['data']['meme_id'],
                    'filename' => $filename,
                    'caption' => $caption
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Upload error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Upload failed'];
        }
    }
    
    /**
     * Validate uploaded file
     */
    private function validateFile($file) {
        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            return ['success' => false, 'message' => 'File size must be less than 5MB'];
        }
        
        // Check file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $this->allowedTypes)) {
            return ['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, and GIF are allowed'];
        }
        
        // Check if file is actually an image
        if (!getimagesize($file['tmp_name'])) {
            return ['success' => false, 'message' => 'Invalid image file'];
        }
        
        return ['success' => true];
    }
    
    /**
     * Generate unique filename
     */
    private function generateFilename($originalName) {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $timestamp = time();
        $random = bin2hex(random_bytes(8));
        return "meme_{$timestamp}_{$random}.{$extension}";
    }
    
    /**
     * Process and save image
     */
    private function processImage($sourcePath, $destinationPath) {
        try {
            // Get image info
            $imageInfo = getimagesize($sourcePath);
            if (!$imageInfo) {
                return ['success' => false, 'message' => 'Invalid image file'];
            }
            
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $type = $imageInfo[2];
            
            // Create image resource based on type
            switch ($type) {
                case IMAGETYPE_JPEG:
                    $source = imagecreatefromjpeg($sourcePath);
                    break;
                case IMAGETYPE_PNG:
                    $source = imagecreatefrompng($sourcePath);
                    break;
                case IMAGETYPE_GIF:
                    $source = imagecreatefromgif($sourcePath);
                    break;
                default:
                    return ['success' => false, 'message' => 'Unsupported image type'];
            }
            
            if (!$source) {
                return ['success' => false, 'message' => 'Failed to create image resource'];
            }
            
            // Resize if necessary
            if ($width > $this->maxWidth || $height > $this->maxHeight) {
                $source = $this->resizeImage($source, $width, $height);
            }
            
            // Save image
            $saveResult = $this->saveImage($source, $destinationPath, $type);
            imagedestroy($source);
            
            return $saveResult;
            
        } catch (Exception $e) {
            error_log("Image processing error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Image processing failed'];
        }
    }
    
    /**
     * Resize image to fit within max dimensions
     */
    private function resizeImage($source, $width, $height) {
        // Calculate new dimensions
        $ratio = min($this->maxWidth / $width, $this->maxHeight / $height);
        $newWidth = round($width * $ratio);
        $newHeight = round($height * $ratio);
        
        // Create new image
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG and GIF
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
        imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
        
        // Resize
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        return $resized;
    }
    
    /**
     * Save image to file
     */
    private function saveImage($image, $path, $type) {
        try {
            switch ($type) {
                case IMAGETYPE_JPEG:
                    $result = imagejpeg($image, $path, 85);
                    break;
                case IMAGETYPE_PNG:
                    $result = imagepng($image, $path, 8);
                    break;
                case IMAGETYPE_GIF:
                    $result = imagegif($image, $path);
                    break;
                default:
                    return ['success' => false, 'message' => 'Unsupported image type'];
            }
            
            if (!$result) {
                return ['success' => false, 'message' => 'Failed to save image'];
            }
            
            return ['success' => true];
            
        } catch (Exception $e) {
            error_log("Image save error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save image'];
        }
    }
    
    /**
     * Save meme data to database
     */
    private function saveToDatabase($caption, $filename, $userId) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO memes (caption, image_path, user_id, uploaded_at) 
                VALUES (?, ?, ?, NOW())
            ");
            
            $stmt->execute([$caption, $filename, $userId]);
            $memeId = $this->db->lastInsertId();
            
            return [
                'success' => true,
                'data' => ['meme_id' => $memeId]
            ];
            
        } catch (Exception $e) {
            error_log("Database save error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save meme data'];
        }
    }
    
    /**
     * Upload a profile picture and update user record
     */
    public function uploadProfilePicture($file, $userId) {
        try {
            // Validate file
            $validation = $this->validateFile($file);
            if (!$validation['success']) {
                return $validation;
            }

            // Generate unique filename
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $timestamp = time();
            $random = bin2hex(random_bytes(8));
            $filename = "profile_{$userId}_{$timestamp}_{$random}.{$extension}";
            $filepath = $this->uploadDir . $filename;

            // Process and save image
            $processResult = $this->processImage($file['tmp_name'], $filepath);
            if (!$processResult['success']) {
                return $processResult;
            }

            // Update user profile_picture_path in DB
            $stmt = $this->db->prepare("UPDATE users SET profile_picture_path = ? WHERE user_id = ?");
            $stmt->execute([$filename, $userId]);

            return [
                'success' => true,
                'data' => [
                    'profile_picture_path' => $filename
                ]
            ];
        } catch (Exception $e) {
            error_log("Profile picture upload error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Profile picture upload failed'];
        }
    }
    
    /**
     * Delete meme and associated files
     */
    public function deleteMeme($memeId, $userId) {
        try {
            // Get meme info
            $stmt = $this->db->prepare("
                SELECT image_path, user_id 
                FROM memes 
                WHERE meme_id = ?
            ");
            $stmt->execute([$memeId]);
            $meme = $stmt->fetch();
            
            if (!$meme) {
                return ['success' => false, 'message' => 'Meme not found'];
            }
            
            // Check if user owns the meme
            if ($meme['user_id'] != $userId) {
                return ['success' => false, 'message' => 'Unauthorized'];
            }
            
            $this->db->beginTransaction();
            
            // Delete reactions
            $stmt = $this->db->prepare("DELETE FROM reactions WHERE meme_id = ?");
            $stmt->execute([$memeId]);
            
            // Delete comments
            $stmt = $this->db->prepare("DELETE FROM comments WHERE meme_id = ?");
            $stmt->execute([$memeId]);
            
            // Delete meme
            $stmt = $this->db->prepare("DELETE FROM memes WHERE meme_id = ?");
            $stmt->execute([$memeId]);
            
            $this->db->commit();
            
            // Delete image file
            $filepath = $this->uploadDir . $meme['image_path'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            
            return ['success' => true, 'message' => 'Meme deleted successfully'];
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Delete meme error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete meme'];
        }
    }
    
    /**
     * Delete meme and associated image file
     */
    public function deleteMemeWithImage($memeId, $userId) {
        try {
            // Get meme info
            $stmt = $this->db->prepare("SELECT image_path, user_id FROM memes WHERE meme_id = ?");
            $stmt->execute([$memeId]);
            $meme = $stmt->fetch();
            if (!$meme) {
                return ['success' => false, 'message' => 'Meme not found'];
            }
            if ($meme['user_id'] != $userId) {
                return ['success' => false, 'message' => 'Unauthorized'];
            }
            $this->db->beginTransaction();
            // Delete meme record
            $stmt = $this->db->prepare("DELETE FROM memes WHERE meme_id = ?");
            $stmt->execute([$memeId]);
            $this->db->commit();
            // Delete image file
            $filepath = $this->uploadDir . $meme['image_path'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            return ['success' => true, 'message' => 'Meme and image deleted successfully'];
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Delete meme with image error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete meme and image'];
        }
    }

    /**
     * Delete user's profile picture (set to NULL and remove file)
     */
    public function deleteProfilePicture($userId) {
        try {
            // Get current profile picture path
            $stmt = $this->db->prepare("SELECT profile_picture_path FROM users WHERE user_id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if (!$user || !$user['profile_picture_path']) {
                return ['success' => false, 'message' => 'No profile picture to delete'];
            }
            $filepath = $this->uploadDir . $user['profile_picture_path'];
            // Set profile_picture_path to NULL
            $stmt = $this->db->prepare("UPDATE users SET profile_picture_path = NULL WHERE user_id = ?");
            $stmt->execute([$userId]);
            // Delete image file
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            return ['success' => true, 'message' => 'Profile picture deleted successfully'];
        } catch (Exception $e) {
            error_log("Delete profile picture error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete profile picture'];
        }
    }
    
    /**
     * Get upload statistics
     */
    public function getUploadStats($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total_memes,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as memes_this_week,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as memes_this_month
                FROM memes 
                WHERE user_id = ?
            ");
            $stmt->execute([$userId]);
            
            return ['success' => true, 'data' => $stmt->fetch()];
            
        } catch (Exception $e) {
            error_log("Upload stats error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to get upload statistics'];
        }
    }
}
?> 