<?php
/**
 * API Tests for Zed-Memes Backend
 */

require_once __DIR__ . '/TestFramework.php';
require_once __DIR__ . '/../backend/core/BaseAPI.php';

class APITests extends TestFramework {
    
    public function testAuthAPI() {
        $this->mockRequest('POST', [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/auth.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Registration should succeed');
        $this->assertNotNull($response['data']['user_id'], 'User ID should be returned');
    }
    
    public function testAuthAPILogin() {
        // First register a user
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $this->mockRequest('POST', $userData);
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/auth.php';
        });
        $registerResponse = $this->parseJsonResponse($output);
        
        // Then login
        $this->mockRequest('POST', [
            'username' => $userData['username'],
            'password' => $userData['password']
        ]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/auth.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Login should succeed');
        $this->assertNotNull($response['data']['token'], 'Token should be returned');
    }
    
    public function testAuthAPIInvalidCredentials() {
        $this->mockRequest('POST', [
            'username' => 'nonexistent',
            'password' => 'wrongpassword'
        ]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/auth.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertFalse($response['success'], 'Invalid credentials should fail');
        $this->assertContains('Invalid', $response['message'], 'Error should mention invalid credentials');
    }
    
    public function testMemesAPIGetAll() {
        $user = $this->createTestUser();
        $this->createTestMeme($user['id']);
        $this->createTestMeme($user['id']);
        
        $this->mockRequest('GET');
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Get memes should succeed');
        $this->assertCount(2, $response['data'], 'Should return 2 memes');
    }
    
    public function testMemesAPIGetById() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $this->mockRequest('GET', ['id' => $meme['id']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Get meme by ID should succeed');
        $this->assertEquals($meme['id'], $response['data']['meme_id'], 'Meme ID should match');
    }
    
    public function testMemesAPICreate() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        
        $memeData = [
            'title' => 'Test Meme ' . uniqid(),
            'description' => 'Test description',
            'category' => 'funny',
            'image_path' => 'test_meme_' . uniqid() . '.jpg'
        ];
        
        $this->mockRequest('POST', $memeData, ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Create meme should succeed');
        $this->assertNotNull($response['data']['meme_id'], 'Meme ID should be returned');
    }
    
    public function testMemesAPIUpdate() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        
        $updateData = [
            'id' => $meme['id'],
            'title' => 'Updated Title',
            'description' => 'Updated description'
        ];
        
        $this->mockRequest('PUT', $updateData, ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Update meme should succeed');
        $this->assertEquals('Updated Title', $response['data']['title'], 'Title should be updated');
    }
    
    public function testMemesAPIDelete() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        
        $this->mockRequest('DELETE', ['id' => $meme['id']], ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Delete meme should succeed');
        
        // Verify meme is deleted
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM memes WHERE meme_id = ?");
        $stmt->execute([$meme['id']]);
        $deletedMeme = $stmt->fetch();
        $this->assertNull($deletedMeme, 'Meme should be deleted from database');
    }
    
    public function testMemesAPISearch() {
        $user = $this->createTestUser();
        $this->createTestMeme($user['id'], ['title' => 'Funny Cat Meme']);
        $this->createTestMeme($user['id'], ['title' => 'Dog Meme']);
        
        $this->mockRequest('GET', ['search' => 'Funny']);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Search should succeed');
        $this->assertCount(1, $response['data'], 'Should find 1 meme with "Funny"');
    }
    
    public function testReactionsAPIAdd() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        
        $reactionData = [
            'meme_id' => $meme['id'],
            'reaction_type' => 'like'
        ];
        
        $this->mockRequest('POST', $reactionData, ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/reactions.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Add reaction should succeed');
        $this->assertNotNull($response['data']['reaction_id'], 'Reaction ID should be returned');
    }
    
    public function testReactionsAPIRemove() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        $reactionId = $this->createTestReaction($meme['id'], $user['id']);
        
        $this->mockRequest('DELETE', ['id' => $reactionId], ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/reactions.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Remove reaction should succeed');
        
        // Verify reaction is deleted
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM reactions WHERE reaction_id = ?");
        $stmt->execute([$reactionId]);
        $deletedReaction = $stmt->fetch();
        $this->assertNull($deletedReaction, 'Reaction should be deleted from database');
    }
    
    public function testCommentsAPIAdd() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        
        $commentData = [
            'meme_id' => $meme['id'],
            'comment_text' => 'This is a test comment'
        ];
        
        $this->mockRequest('POST', $commentData, ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/comments.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Add comment should succeed');
        $this->assertNotNull($response['data']['comment_id'], 'Comment ID should be returned');
    }
    
    public function testCommentsAPIGetByMeme() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        $this->createTestComment($meme['id'], $user['id'], 'Comment 1');
        $this->createTestComment($meme['id'], $user['id'], 'Comment 2');
        
        $this->mockRequest('GET', ['meme_id' => $meme['id']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/comments.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Get comments should succeed');
        $this->assertCount(2, $response['data'], 'Should return 2 comments');
    }
    
    public function testCommentsAPIDelete() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        $meme = $this->createTestMeme($user['id']);
        $commentId = $this->createTestComment($meme['id'], $user['id']);
        
        $this->mockRequest('DELETE', ['id' => $commentId], ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/comments.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Delete comment should succeed');
        
        // Verify comment is deleted
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM comments WHERE comment_id = ?");
        $stmt->execute([$commentId]);
        $deletedComment = $stmt->fetch();
        $this->assertNull($deletedComment, 'Comment should be deleted from database');
    }
    
    public function testUploadAPI() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        
        // Create a mock file upload
        $_FILES['image'] = [
            'name' => 'test_image.jpg',
            'type' => 'image/jpeg',
            'tmp_name' => __DIR__ . '/test_image.jpg',
            'error' => UPLOAD_ERR_OK,
            'size' => 1024
        ];
        
        // Create a test image file
        $testImagePath = __DIR__ . '/test_image.jpg';
        file_put_contents($testImagePath, 'fake image data');
        
        $this->mockRequest('POST', [], ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/upload.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Upload should succeed');
        $this->assertNotNull($response['data']['image_path'], 'Image path should be returned');
        
        // Clean up test file
        if (file_exists($testImagePath)) {
            unlink($testImagePath);
        }
    }
    
    public function testAPIUnauthorizedAccess() {
        $this->mockRequest('GET', ['id' => 1]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertFalse($response['success'], 'Unauthorized access should fail');
        $this->assertEquals(401, http_response_code(), 'Should return 401 status code');
    }
    
    public function testAPIInvalidMethod() {
        $this->mockRequest('PATCH', ['id' => 1]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertFalse($response['success'], 'Invalid method should fail');
        $this->assertEquals(405, http_response_code(), 'Should return 405 status code');
    }
    
    public function testAPIMissingRequiredFields() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        
        $this->mockRequest('POST', ['title' => 'Test'], ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertFalse($response['success'], 'Missing required fields should fail');
        $this->assertContains('required', $response['message'], 'Error should mention required fields');
    }
    
    public function testAPIRateLimiting() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        
        // Make multiple requests quickly
        for ($i = 0; $i < 105; $i++) {
            $this->mockRequest('GET', [], ['Authorization' => 'Bearer ' . $loginResult['token']]);
            
            $output = $this->captureOutput(function() {
                include __DIR__ . '/../backend/api/memes.php';
            });
            
            $response = $this->parseJsonResponse($output);
            
            if ($i >= 100) {
                $this->assertFalse($response['success'], 'Rate limit should be exceeded');
                $this->assertEquals(429, http_response_code(), 'Should return 429 status code');
                break;
            }
        }
    }
    
    public function testAPIPagination() {
        $user = $this->createTestUser();
        
        // Create 15 memes
        for ($i = 1; $i <= 15; $i++) {
            $this->createTestMeme($user['id'], ['title' => "Meme {$i}"]);
        }
        
        $this->mockRequest('GET', ['page' => 2, 'limit' => 5]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Pagination should succeed');
        $this->assertCount(5, $response['data'], 'Should return 5 memes for page 2');
        $this->assertNotNull($response['pagination'], 'Pagination info should be returned');
        $this->assertEquals(2, $response['pagination']['current_page'], 'Current page should be 2');
    }
    
    public function testAPISanitization() {
        $user = $this->createTestUser();
        $loginResult = $this->loginUser($user);
        
        $memeData = [
            'title' => '<script>alert("xss")</script>Test Meme',
            'description' => 'Test description with <b>HTML</b>',
            'category' => 'funny',
            'image_path' => 'test_meme.jpg'
        ];
        
        $this->mockRequest('POST', $memeData, ['Authorization' => 'Bearer ' . $loginResult['token']]);
        
        $output = $this->captureOutput(function() {
            include __DIR__ . '/../backend/api/memes.php';
        });
        
        $response = $this->parseJsonResponse($output);
        $this->assertTrue($response['success'], 'Create meme should succeed');
        
        // Verify data is sanitized
        $this->assertNotContains('<script>', $response['data']['title'], 'Title should be sanitized');
        $this->assertNotContains('<b>', $response['data']['description'], 'Description should be sanitized');
    }
    
    private function loginUser($user) {
        $authHandler = new AuthHandler();
        $result = $authHandler->login($user['username'], $user['password']);
        return $result['data'];
    }
}

// Run tests if this file is executed directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    $tests = new APITests();
    $tests->runAllTests();
}
?> 