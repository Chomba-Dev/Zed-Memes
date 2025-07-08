<?php
/**
 * Test Framework for Zed-Memes Backend
 * Provides comprehensive testing capabilities
 */

// Set testing environment
putenv('APP_ENV=testing');
putenv('DB_NAME=zed_memes_test');

require_once __DIR__ . '/../backend/config/config.php';
require_once __DIR__ . '/../backend/config/database.php';

abstract class TestFramework {
    protected $db;
    protected $testData = [];
    protected $backupFile;
    
    public function __construct() {
        $this->db = getDatabase();
        $this->setupTestDatabase();
    }
    
    /**
     * Setup test database
     */
    protected function setupTestDatabase() {
        try {
            // Create test database if it doesn't exist
            $pdo = new PDO("mysql:host=" . DB_HOST, DB_USER, DB_PASS);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // Import test schema
            $schemaFile = __DIR__ . '/../database/schema/zed_memes.sql';
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                $sql = str_replace('USE zed_memes;', 'USE ' . DB_NAME . ';', $sql);
                
                $this->db->getConnection()->exec("USE " . DB_NAME);
                $statements = explode(';', $sql);
                
                foreach ($statements as $statement) {
                    $statement = trim($statement);
                    if (!empty($statement) && !preg_match('/^(--|#)/', $statement)) {
                        try {
                            $this->db->getConnection()->exec($statement);
                        } catch (PDOException $e) {
                            // Ignore errors for existing tables
                        }
                    }
                }
            }
            
            // Create backup for cleanup
            $this->backupFile = $this->db->backup('test_backup.sql');
            
        } catch (Exception $e) {
            throw new Exception("Failed to setup test database: " . $e->getMessage());
        }
    }
    
    /**
     * Cleanup after tests
     */
    public function cleanup() {
        if ($this->backupFile && file_exists($this->backupFile)) {
            $this->db->restore($this->backupFile);
            unlink($this->backupFile);
        }
    }
    
    /**
     * Create test user
     */
    protected function createTestUser($data = []) {
        $defaultData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $userData = array_merge($defaultData, $data);
        
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO users (username, email, password, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
        $stmt->execute([$userData['username'], $userData['email'], $hashedPassword]);
        
        $userId = $this->db->getLastInsertId();
        
        return [
            'id' => $userId,
            'username' => $userData['username'],
            'email' => $userData['email'],
            'password' => $userData['password']
        ];
    }
    
    /**
     * Create test meme
     */
    protected function createTestMeme($userId, $data = []) {
        $defaultData = [
            'title' => 'Test Meme ' . uniqid(),
            'description' => 'Test description',
            'image_path' => 'test_meme_' . uniqid() . '.jpg',
            'category' => 'funny'
        ];
        
        $memeData = array_merge($defaultData, $data);
        
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO memes (title, description, image_path, category, user_id, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $memeData['title'],
            $memeData['description'],
            $memeData['image_path'],
            $memeData['category'],
            $userId
        ]);
        
        $memeId = $this->db->getLastInsertId();
        
        return [
            'id' => $memeId,
            'title' => $memeData['title'],
            'description' => $memeData['description'],
            'image_path' => $memeData['image_path'],
            'category' => $memeData['category'],
            'user_id' => $userId
        ];
    }
    
    /**
     * Create test reaction
     */
    protected function createTestReaction($memeId, $userId, $reactionType = 'like') {
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO reactions (meme_id, user_id, reaction_type, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([$memeId, $userId, $reactionType]);
        
        return $this->db->getLastInsertId();
    }
    
    /**
     * Create test comment
     */
    protected function createTestComment($memeId, $userId, $commentText = 'Test comment') {
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO comments (meme_id, user_id, comment_text, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([$memeId, $userId, $commentText]);
        
        return $this->db->getLastInsertId();
    }
    
    /**
     * Assert equals
     */
    protected function assertEquals($expected, $actual, $message = '') {
        if ($expected !== $actual) {
            throw new Exception("Assertion failed: {$message}. Expected: " . json_encode($expected) . ", Got: " . json_encode($actual));
        }
    }
    
    /**
     * Assert true
     */
    protected function assertTrue($condition, $message = '') {
        if (!$condition) {
            throw new Exception("Assertion failed: {$message}. Expected true, got false");
        }
    }
    
    /**
     * Assert false
     */
    protected function assertFalse($condition, $message = '') {
        if ($condition) {
            throw new Exception("Assertion failed: {$message}. Expected false, got true");
        }
    }
    
    /**
     * Assert not null
     */
    protected function assertNotNull($value, $message = '') {
        if ($value === null) {
            throw new Exception("Assertion failed: {$message}. Expected not null, got null");
        }
    }
    
    /**
     * Assert null
     */
    protected function assertNull($value, $message = '') {
        if ($value !== null) {
            throw new Exception("Assertion failed: {$message}. Expected null, got " . json_encode($value));
        }
    }
    
    /**
     * Assert array contains
     */
    protected function assertContains($needle, $haystack, $message = '') {
        if (!in_array($needle, $haystack)) {
            throw new Exception("Assertion failed: {$message}. Expected " . json_encode($needle) . " to be in " . json_encode($haystack));
        }
    }
    
    /**
     * Assert array not contains
     */
    protected function assertNotContains($needle, $haystack, $message = '') {
        if (in_array($needle, $haystack)) {
            throw new Exception("Assertion failed: {$message}. Expected " . json_encode($needle) . " not to be in " . json_encode($haystack));
        }
    }
    
    /**
     * Assert count
     */
    protected function assertCount($expected, $array, $message = '') {
        $actual = count($array);
        if ($expected !== $actual) {
            throw new Exception("Assertion failed: {$message}. Expected count {$expected}, got {$actual}");
        }
    }
    
    /**
     * Mock HTTP request
     */
    protected function mockRequest($method, $data = [], $headers = []) {
        $_SERVER['REQUEST_METHOD'] = $method;
        $_GET = $method === 'GET' ? $data : [];
        $_POST = $method === 'POST' ? $data : [];
        
        // Mock headers
        foreach ($headers as $key => $value) {
            $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $key))] = $value;
        }
    }
    
    /**
     * Capture output
     */
    protected function captureOutput($callback) {
        ob_start();
        $callback();
        $output = ob_get_clean();
        return $output;
    }
    
    /**
     * Parse JSON response
     */
    protected function parseJsonResponse($response) {
        return json_decode($response, true);
    }
    
    /**
     * Run test with cleanup
     */
    public function runTest($testName, $callback) {
        try {
            echo "Running test: {$testName}... ";
            $callback();
            echo "PASS\n";
            return true;
        } catch (Exception $e) {
            echo "FAIL\n";
            echo "Error: " . $e->getMessage() . "\n";
            return false;
        } finally {
            $this->cleanup();
        }
    }
    
    /**
     * Run all tests
     */
    public function runAllTests() {
        $methods = get_class_methods($this);
        $testMethods = array_filter($methods, function($method) {
            return strpos($method, 'test') === 0;
        });
        
        $passed = 0;
        $failed = 0;
        
        echo "Running " . count($testMethods) . " tests...\n\n";
        
        foreach ($testMethods as $method) {
            try {
                echo "Running {$method}... ";
                $this->$method();
                echo "PASS\n";
                $passed++;
            } catch (Exception $e) {
                echo "FAIL\n";
                echo "Error: " . $e->getMessage() . "\n";
                $failed++;
            } finally {
                $this->cleanup();
            }
        }
        
        echo "\nTest Results: {$passed} passed, {$failed} failed\n";
        return $failed === 0;
    }
}
?> 