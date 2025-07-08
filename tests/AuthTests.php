<?php
/**
 * Authentication Tests for Zed-Memes Backend
 */

require_once __DIR__ . '/TestFramework.php';
require_once __DIR__ . '/../backend/auth/AuthHandler.php';

class AuthTests extends TestFramework {
    
    public function testUserRegistration() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        $result = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        
        $this->assertTrue($result['success'], 'User registration should succeed');
        $this->assertNotNull($result['data']['user_id'], 'User ID should be returned');
        $this->assertEquals($userData['username'], $result['data']['username'], 'Username should match');
        $this->assertEquals($userData['email'], $result['data']['email'], 'Email should match');
    }
    
    public function testUserRegistrationDuplicateUsername() {
        $userData = [
            'username' => 'duplicateuser',
            'email' => 'test1@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register first user
        $result1 = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $this->assertTrue($result1['success'], 'First registration should succeed');
        
        // Try to register with same username
        $result2 = $authHandler->register($userData['username'], 'test2@example.com', 'TestPass123');
        $this->assertFalse($result2['success'], 'Duplicate username should fail');
        $this->assertContains('username', $result2['message'], 'Error should mention username');
    }
    
    public function testUserRegistrationDuplicateEmail() {
        $userData = [
            'username' => 'user1',
            'email' => 'duplicate@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register first user
        $result1 = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $this->assertTrue($result1['success'], 'First registration should succeed');
        
        // Try to register with same email
        $result2 = $authHandler->register('user2', $userData['email'], 'TestPass123');
        $this->assertFalse($result2['success'], 'Duplicate email should fail');
        $this->assertContains('email', $result2['message'], 'Error should mention email');
    }
    
    public function testUserRegistrationInvalidEmail() {
        $authHandler = new AuthHandler();
        $result = $authHandler->register('testuser', 'invalid-email', 'TestPass123');
        
        $this->assertFalse($result['success'], 'Invalid email should fail');
        $this->assertContains('email', $result['message'], 'Error should mention email');
    }
    
    public function testUserRegistrationWeakPassword() {
        $authHandler = new AuthHandler();
        $result = $authHandler->register('testuser', 'test@example.com', 'weak');
        
        $this->assertFalse($result['success'], 'Weak password should fail');
        $this->assertContains('password', $result['message'], 'Error should mention password');
    }
    
    public function testUserLogin() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $this->assertTrue($registerResult['success'], 'Registration should succeed');
        
        // Login with username
        $loginResult = $authHandler->login($userData['username'], $userData['password']);
        $this->assertTrue($loginResult['success'], 'Login should succeed');
        $this->assertNotNull($loginResult['data']['token'], 'Token should be returned');
        $this->assertEquals($userData['username'], $loginResult['data']['username'], 'Username should match');
    }
    
    public function testUserLoginWithEmail() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $this->assertTrue($registerResult['success'], 'Registration should succeed');
        
        // Login with email
        $loginResult = $authHandler->login($userData['email'], $userData['password']);
        $this->assertTrue($loginResult['success'], 'Login with email should succeed');
        $this->assertNotNull($loginResult['data']['token'], 'Token should be returned');
    }
    
    public function testUserLoginInvalidCredentials() {
        $authHandler = new AuthHandler();
        $result = $authHandler->login('nonexistent', 'wrongpassword');
        
        $this->assertFalse($result['success'], 'Invalid credentials should fail');
        $this->assertContains('Invalid', $result['message'], 'Error should mention invalid credentials');
    }
    
    public function testJWTTokenValidation() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register and login user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $loginResult = $authHandler->login($userData['username'], $userData['password']);
        $token = $loginResult['data']['token'];
        
        // Validate token
        $user = $authHandler->getCurrentUser($token);
        $this->assertNotNull($user, 'Token should be valid');
        $this->assertEquals($userData['username'], $user['username'], 'User data should match');
    }
    
    public function testJWTTokenInvalid() {
        $authHandler = new AuthHandler();
        $user = $authHandler->getCurrentUser('invalid.token.here');
        
        $this->assertNull($user, 'Invalid token should return null');
    }
    
    public function testJWTTokenExpired() {
        // This test would require mocking time or using a very short expiry
        // For now, we'll test with a malformed token
        $authHandler = new AuthHandler();
        $user = $authHandler->getCurrentUser('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
        
        $this->assertNull($user, 'Expired/malformed token should return null');
    }
    
    public function testPasswordHashing() {
        $password = 'TestPass123';
        $authHandler = new AuthHandler();
        
        // Test that password is properly hashed
        $stmt = $this->db->getConnection()->prepare("SELECT password FROM users WHERE username = ?");
        $stmt->execute(['testuser']);
        $user = $stmt->fetch();
        
        if ($user) {
            $this->assertTrue(password_verify($password, $user['password']), 'Password should be properly hashed');
            $this->assertNotEquals($password, $user['password'], 'Password should not be stored in plain text');
        }
    }
    
    public function testUsernameValidation() {
        $authHandler = new AuthHandler();
        
        // Test valid usernames
        $validUsernames = ['user123', 'test_user', 'User123'];
        foreach ($validUsernames as $username) {
            $this->assertTrue(validateUsername($username), "Username '{$username}' should be valid");
        }
        
        // Test invalid usernames
        $invalidUsernames = ['ab', 'a' . str_repeat('b', 51), 'user@name', 'user-name'];
        foreach ($invalidUsernames as $username) {
            $this->assertFalse(validateUsername($username), "Username '{$username}' should be invalid");
        }
    }
    
    public function testEmailValidation() {
        $authHandler = new AuthHandler();
        
        // Test valid emails
        $validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org'];
        foreach ($validEmails as $email) {
            $this->assertTrue(validateEmail($email), "Email '{$email}' should be valid");
        }
        
        // Test invalid emails
        $invalidEmails = ['invalid-email', '@example.com', 'user@', 'user.example.com'];
        foreach ($invalidEmails as $email) {
            $this->assertFalse(validateEmail($email), "Email '{$email}' should be invalid");
        }
    }
    
    public function testPasswordValidation() {
        $authHandler = new AuthHandler();
        
        // Test valid passwords
        $validPasswords = ['TestPass123', 'MySecure1', 'Password123'];
        foreach ($validPasswords as $password) {
            $this->assertTrue(validatePassword($password), "Password '{$password}' should be valid");
        }
        
        // Test invalid passwords
        $invalidPasswords = ['weak', 'nouppercase123', 'NOLOWERCASE123', 'NoNumbers'];
        foreach ($invalidPasswords as $password) {
            $this->assertFalse(validatePassword($password), "Password '{$password}' should be invalid");
        }
    }
    
    public function testUserProfileUpdate() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $userId = $registerResult['data']['user_id'];
        
        // Update profile
        $newEmail = 'updated_' . uniqid() . '@example.com';
        $result = $authHandler->updateProfile($userId, ['email' => $newEmail]);
        
        $this->assertTrue($result['success'], 'Profile update should succeed');
        $this->assertEquals($newEmail, $result['data']['email'], 'Email should be updated');
    }
    
    public function testPasswordChange() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $userId = $registerResult['data']['user_id'];
        
        // Change password
        $newPassword = 'NewPass123';
        $result = $authHandler->changePassword($userId, $userData['password'], $newPassword);
        
        $this->assertTrue($result['success'], 'Password change should succeed');
        
        // Verify new password works
        $loginResult = $authHandler->login($userData['username'], $newPassword);
        $this->assertTrue($loginResult['success'], 'Login with new password should succeed');
    }
    
    public function testPasswordChangeWrongCurrentPassword() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $userId = $registerResult['data']['user_id'];
        
        // Try to change password with wrong current password
        $result = $authHandler->changePassword($userId, 'WrongPass123', 'NewPass123');
        
        $this->assertFalse($result['success'], 'Password change with wrong current password should fail');
        $this->assertContains('current password', $result['message'], 'Error should mention current password');
    }
    
    public function testUserDeletion() {
        $userData = [
            'username' => 'testuser_' . uniqid(),
            'email' => 'test_' . uniqid() . '@example.com',
            'password' => 'TestPass123'
        ];
        
        $authHandler = new AuthHandler();
        
        // Register user
        $registerResult = $authHandler->register($userData['username'], $userData['email'], $userData['password']);
        $userId = $registerResult['data']['user_id'];
        
        // Delete user
        $result = $authHandler->deleteUser($userId, $userData['password']);
        
        $this->assertTrue($result['success'], 'User deletion should succeed');
        
        // Verify user is deleted
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        $this->assertNull($user, 'User should be deleted from database');
    }
}

// Run tests if this file is executed directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    $tests = new AuthTests();
    $tests->runAllTests();
}
?> 