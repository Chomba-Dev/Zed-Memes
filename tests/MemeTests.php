<?php
/**
 * Meme Tests for Zed-Memes Backend
 */

require_once __DIR__ . '/TestFramework.php';
require_once __DIR__ . '/../backend/api/memes.php';

class MemeTests extends TestFramework {
    
    public function testCreateMeme() {
        $user = $this->createTestUser();
        $memeData = [
            'title' => 'Test Meme ' . uniqid(),
            'description' => 'Test description',
            'category' => 'funny',
            'image_path' => 'test_meme_' . uniqid() . '.jpg'
        ];
        
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO memes (title, description, image_path, category, user_id, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $memeData['title'],
            $memeData['description'],
            $memeData['image_path'],
            $memeData['category'],
            $user['id']
        ]);
        
        $memeId = $this->db->getLastInsertId();
        
        $this->assertNotNull($memeId, 'Meme ID should be returned');
        
        // Verify meme was created
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM memes WHERE meme_id = ?");
        $stmt->execute([$memeId]);
        $meme = $stmt->fetch();
        
        $this->assertNotNull($meme, 'Meme should exist in database');
        $this->assertEquals($memeData['title'], $meme['title'], 'Title should match');
        $this->assertEquals($memeData['description'], $meme['description'], 'Description should match');
        $this->assertEquals($memeData['category'], $meme['category'], 'Category should match');
        $this->assertEquals($user['id'], $meme['user_id'], 'User ID should match');
    }
    
    public function testGetMeme() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            WHERE m.meme_id = ?
        ");
        $stmt->execute([$meme['id']]);
        $result = $stmt->fetch();
        
        $this->assertNotNull($result, 'Meme should be retrieved');
        $this->assertEquals($meme['title'], $result['title'], 'Title should match');
        $this->assertEquals($user['username'], $result['author_name'], 'Author name should match');
    }
    
    public function testGetAllMemes() {
        $user = $this->createTestUser();
        
        // Create multiple memes
        $meme1 = $this->createTestMeme($user['id'], ['title' => 'Meme 1']);
        $meme2 = $this->createTestMeme($user['id'], ['title' => 'Meme 2']);
        $meme3 = $this->createTestMeme($user['id'], ['title' => 'Meme 3']);
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            ORDER BY m.created_at DESC
        ");
        $stmt->execute();
        $memes = $stmt->fetchAll();
        
        $this->assertCount(3, $memes, 'Should return 3 memes');
        $this->assertEquals('Meme 3', $memes[0]['title'], 'Latest meme should be first');
    }
    
    public function testUpdateMeme() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $newTitle = 'Updated Meme Title';
        $newDescription = 'Updated description';
        
        $stmt = $this->db->getConnection()->prepare("
            UPDATE memes 
            SET title = ?, description = ? 
            WHERE meme_id = ? AND user_id = ?
        ");
        $result = $stmt->execute([$newTitle, $newDescription, $meme['id'], $user['id']]);
        
        $this->assertTrue($result, 'Update should succeed');
        
        // Verify update
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM memes WHERE meme_id = ?");
        $stmt->execute([$meme['id']]);
        $updatedMeme = $stmt->fetch();
        
        $this->assertEquals($newTitle, $updatedMeme['title'], 'Title should be updated');
        $this->assertEquals($newDescription, $updatedMeme['description'], 'Description should be updated');
    }
    
    public function testDeleteMeme() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $stmt = $this->db->getConnection()->prepare("DELETE FROM memes WHERE meme_id = ? AND user_id = ?");
        $result = $stmt->execute([$meme['id'], $user['id']]);
        
        $this->assertTrue($result, 'Delete should succeed');
        
        // Verify deletion
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM memes WHERE meme_id = ?");
        $stmt->execute([$meme['id']]);
        $deletedMeme = $stmt->fetch();
        
        $this->assertNull($deletedMeme, 'Meme should be deleted');
    }
    
    public function testSearchMemes() {
        $user = $this->createTestUser();
        
        // Create memes with different titles
        $this->createTestMeme($user['id'], ['title' => 'Funny Cat Meme']);
        $this->createTestMeme($user['id'], ['title' => 'Dog Meme']);
        $this->createTestMeme($user['id'], ['title' => 'Funny Dog Meme']);
        
        $searchTerm = 'Funny';
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            WHERE m.title LIKE ? OR m.description LIKE ?
            ORDER BY m.created_at DESC
        ");
        $stmt->execute(["%{$searchTerm}%", "%{$searchTerm}%"]);
        $results = $stmt->fetchAll();
        
        $this->assertCount(2, $results, 'Should find 2 memes with "Funny" in title');
        
        foreach ($results as $meme) {
            $this->assertTrue(
                stripos($meme['title'], $searchTerm) !== false || 
                stripos($meme['description'], $searchTerm) !== false,
                'Meme should contain search term'
            );
        }
    }
    
    public function testGetMemesByCategory() {
        $user = $this->createTestUser();
        
        // Create memes with different categories
        $this->createTestMeme($user['id'], ['category' => 'funny']);
        $this->createTestMeme($user['id'], ['category' => 'funny']);
        $this->createTestMeme($user['id'], ['category' => 'sad']);
        $this->createTestMeme($user['id'], ['category' => 'funny']);
        
        $category = 'funny';
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            WHERE m.category = ?
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$category]);
        $results = $stmt->fetchAll();
        
        $this->assertCount(3, $results, 'Should find 3 memes in funny category');
        
        foreach ($results as $meme) {
            $this->assertEquals($category, $meme['category'], 'All memes should be in funny category');
        }
    }
    
    public function testGetMemesByUser() {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();
        
        // Create memes for different users
        $this->createTestMeme($user1['id'], ['title' => 'User 1 Meme 1']);
        $this->createTestMeme($user1['id'], ['title' => 'User 1 Meme 2']);
        $this->createTestMeme($user2['id'], ['title' => 'User 2 Meme 1']);
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            WHERE m.user_id = ?
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$user1['id']]);
        $results = $stmt->fetchAll();
        
        $this->assertCount(2, $results, 'Should find 2 memes for user 1');
        
        foreach ($results as $meme) {
            $this->assertEquals($user1['id'], $meme['user_id'], 'All memes should belong to user 1');
        }
    }
    
    public function testAddReaction() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $reactionType = 'like';
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO reactions (meme_id, user_id, reaction_type, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$meme['id'], $user['id'], $reactionType]);
        
        $reactionId = $this->db->getLastInsertId();
        $this->assertNotNull($reactionId, 'Reaction ID should be returned');
        
        // Verify reaction was added
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM reactions WHERE reaction_id = ?");
        $stmt->execute([$reactionId]);
        $reaction = $stmt->fetch();
        
        $this->assertNotNull($reaction, 'Reaction should exist in database');
        $this->assertEquals($meme['id'], $reaction['meme_id'], 'Meme ID should match');
        $this->assertEquals($user['id'], $reaction['user_id'], 'User ID should match');
        $this->assertEquals($reactionType, $reaction['reaction_type'], 'Reaction type should match');
    }
    
    public function testRemoveReaction() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        $reactionId = $this->createTestReaction($meme['id'], $user['id']);
        
        $stmt = $this->db->getConnection()->prepare("DELETE FROM reactions WHERE reaction_id = ? AND user_id = ?");
        $result = $stmt->execute([$reactionId, $user['id']]);
        
        $this->assertTrue($result, 'Reaction removal should succeed');
        
        // Verify reaction was removed
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM reactions WHERE reaction_id = ?");
        $stmt->execute([$reactionId]);
        $reaction = $stmt->fetch();
        
        $this->assertNull($reaction, 'Reaction should be deleted');
    }
    
    public function testGetMemeReactions() {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();
        $meme = $this->createTestMeme($user1['id']);
        
        // Add reactions
        $this->createTestReaction($meme['id'], $user1['id'], 'like');
        $this->createTestReaction($meme['id'], $user2['id'], 'love');
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT r.*, u.username 
            FROM reactions r 
            JOIN users u ON r.user_id = u.user_id 
            WHERE r.meme_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$meme['id']]);
        $reactions = $stmt->fetchAll();
        
        $this->assertCount(2, $reactions, 'Should return 2 reactions');
        
        $reactionTypes = array_column($reactions, 'reaction_type');
        $this->assertContains('like', $reactionTypes, 'Should contain like reaction');
        $this->assertContains('love', $reactionTypes, 'Should contain love reaction');
    }
    
    public function testAddComment() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        
        $commentText = 'This is a test comment';
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO comments (meme_id, user_id, comment_text, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$meme['id'], $user['id'], $commentText]);
        
        $commentId = $this->db->getLastInsertId();
        $this->assertNotNull($commentId, 'Comment ID should be returned');
        
        // Verify comment was added
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM comments WHERE comment_id = ?");
        $stmt->execute([$commentId]);
        $comment = $stmt->fetch();
        
        $this->assertNotNull($comment, 'Comment should exist in database');
        $this->assertEquals($meme['id'], $comment['meme_id'], 'Meme ID should match');
        $this->assertEquals($user['id'], $comment['user_id'], 'User ID should match');
        $this->assertEquals($commentText, $comment['comment_text'], 'Comment text should match');
    }
    
    public function testGetMemeComments() {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();
        $meme = $this->createTestMeme($user1['id']);
        
        // Add comments
        $this->createTestComment($meme['id'], $user1['id'], 'First comment');
        $this->createTestComment($meme['id'], $user2['id'], 'Second comment');
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT c.*, u.username 
            FROM comments c 
            JOIN users u ON c.user_id = u.user_id 
            WHERE c.meme_id = ?
            ORDER BY c.created_at ASC
        ");
        $stmt->execute([$meme['id']]);
        $comments = $stmt->fetchAll();
        
        $this->assertCount(2, $comments, 'Should return 2 comments');
        $this->assertEquals('First comment', $comments[0]['comment_text'], 'First comment should be first');
        $this->assertEquals('Second comment', $comments[1]['comment_text'], 'Second comment should be second');
    }
    
    public function testDeleteComment() {
        $user = $this->createTestUser();
        $meme = $this->createTestMeme($user['id']);
        $commentId = $this->createTestComment($meme['id'], $user['id']);
        
        $stmt = $this->db->getConnection()->prepare("DELETE FROM comments WHERE comment_id = ? AND user_id = ?");
        $result = $stmt->execute([$commentId, $user['id']]);
        
        $this->assertTrue($result, 'Comment deletion should succeed');
        
        // Verify comment was deleted
        $stmt = $this->db->getConnection()->prepare("SELECT * FROM comments WHERE comment_id = ?");
        $stmt->execute([$commentId]);
        $comment = $stmt->fetch();
        
        $this->assertNull($comment, 'Comment should be deleted');
    }
    
    public function testGetMemeStats() {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();
        $meme = $this->createTestMeme($user1['id']);
        
        // Add reactions and comments
        $this->createTestReaction($meme['id'], $user1['id'], 'like');
        $this->createTestReaction($meme['id'], $user2['id'], 'love');
        $this->createTestComment($meme['id'], $user1['id'], 'Comment 1');
        $this->createTestComment($meme['id'], $user2['id'], 'Comment 2');
        
        // Get reaction counts
        $stmt = $this->db->getConnection()->prepare("
            SELECT reaction_type, COUNT(*) as count 
            FROM reactions 
            WHERE meme_id = ? 
            GROUP BY reaction_type
        ");
        $stmt->execute([$meme['id']]);
        $reactionStats = $stmt->fetchAll();
        
        $this->assertCount(2, $reactionStats, 'Should have 2 reaction types');
        
        // Get comment count
        $stmt = $this->db->getConnection()->prepare("SELECT COUNT(*) as count FROM comments WHERE meme_id = ?");
        $stmt->execute([$meme['id']]);
        $commentCount = $stmt->fetch()['count'];
        
        $this->assertEquals(2, $commentCount, 'Should have 2 comments');
    }
    
    public function testMemePagination() {
        $user = $this->createTestUser();
        
        // Create 15 memes
        for ($i = 1; $i <= 15; $i++) {
            $this->createTestMeme($user['id'], ['title' => "Meme {$i}"]);
        }
        
        $page = 2;
        $limit = 5;
        $offset = ($page - 1) * $limit;
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT m.*, u.username as author_name 
            FROM memes m 
            JOIN users u ON m.user_id = u.user_id 
            ORDER BY m.created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        $memes = $stmt->fetchAll();
        
        $this->assertCount(5, $memes, 'Should return 5 memes for page 2');
        
        // Get total count
        $stmt = $this->db->getConnection()->prepare("SELECT COUNT(*) as total FROM memes");
        $stmt->execute();
        $total = $stmt->fetch()['total'];
        
        $this->assertEquals(15, $total, 'Should have 15 total memes');
    }
    
    public function testMemeValidation() {
        $user = $this->createTestUser();
        
        // Test empty title
        $stmt = $this->db->getConnection()->prepare("
            INSERT INTO memes (title, description, image_path, category, user_id, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        try {
            $stmt->execute(['', 'Description', 'image.jpg', 'funny', $user['id']]);
            $this->fail('Should not allow empty title');
        } catch (PDOException $e) {
            // Expected to fail due to NOT NULL constraint
        }
        
        // Test invalid category
        try {
            $stmt->execute(['Valid Title', 'Description', 'image.jpg', 'invalid_category', $user['id']]);
            $this->fail('Should not allow invalid category');
        } catch (PDOException $e) {
            // Expected to fail due to ENUM constraint
        }
    }
    
    public function testMemeOwnership() {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();
        $meme = $this->createTestMeme($user1['id']);
        
        // User 2 should not be able to update user 1's meme
        $stmt = $this->db->getConnection()->prepare("
            UPDATE memes 
            SET title = 'Hacked Title' 
            WHERE meme_id = ? AND user_id = ?
        ");
        $result = $stmt->execute([$meme['id'], $user2['id']]);
        
        $this->assertFalse($result, 'User 2 should not be able to update user 1\'s meme');
        
        // Verify meme was not changed
        $stmt = $this->db->getConnection()->prepare("SELECT title FROM memes WHERE meme_id = ?");
        $stmt->execute([$meme['id']]);
        $title = $stmt->fetch()['title'];
        
        $this->assertNotEquals('Hacked Title', $title, 'Meme title should not be changed');
    }
}

// Run tests if this file is executed directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    $tests = new MemeTests();
    $tests->runAllTests();
}
?> 