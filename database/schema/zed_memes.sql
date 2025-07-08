-- Zed-Memes Database Schema
-- This file contains the complete database structure for the Zed-Memes application

-- Create database
CREATE DATABASE IF NOT EXISTS zed_memes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zed_memes;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT NULL,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- Memes table
CREATE TABLE IF NOT EXISTS memes (
    meme_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    image_path VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(255) DEFAULT NULL,
    category ENUM('funny', 'sad', 'angry', 'surprised', 'love', 'other') DEFAULT 'funny',
    user_id INT NOT NULL,
    views INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_views (views),
    INDEX idx_featured (is_featured)
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
    reaction_id INT AUTO_INCREMENT PRIMARY KEY,
    meme_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry') DEFAULT 'like',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (meme_id) REFERENCES memes(meme_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_meme_reaction (user_id, meme_id, reaction_type),
    INDEX idx_meme_id (meme_id),
    INDEX idx_user_id (user_id),
    INDEX idx_reaction_type (reaction_type)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    meme_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    parent_comment_id INT DEFAULT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (meme_id) REFERENCES memes(meme_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    INDEX idx_meme_id (meme_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_comment (parent_comment_id),
    INDEX idx_created_at (created_at)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT DEFAULT NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_usage_count (usage_count)
);

-- Meme tags junction table
CREATE TABLE IF NOT EXISTS meme_tags (
    meme_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (meme_id, tag_id),
    FOREIGN KEY (meme_id) REFERENCES memes(meme_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
    INDEX idx_meme_id (meme_id),
    INDEX idx_tag_id (tag_id)
);

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id)
);

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INT NOT NULL,
    meme_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, meme_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (meme_id) REFERENCES memes(meme_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_meme_id (meme_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('reaction', 'comment', 'follow', 'mention', 'system') NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    related_meme_id INT DEFAULT NULL,
    related_user_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_meme_id) REFERENCES memes(meme_id) ON DELETE SET NULL,
    FOREIGN KEY (related_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_identifier (identifier),
    INDEX idx_endpoint (endpoint),
    INDEX idx_window_start (window_start)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_upload_size', '5242880', 'Maximum file upload size in bytes (5MB)'),
('allowed_image_types', 'jpg,jpeg,png,gif', 'Comma-separated list of allowed image types'),
('max_memes_per_user', '1000', 'Maximum number of memes a user can upload'),
('auto_feature_threshold', '100', 'Minimum reactions to auto-feature a meme'),
('comment_moderation', 'enabled', 'Enable comment moderation (enabled/disabled)'),
('registration_enabled', 'true', 'Allow new user registrations'),
('maintenance_mode', 'false', 'Enable maintenance mode');

-- Insert sample tags
INSERT INTO tags (name, description) VALUES
('funny', 'Humorous and comedic content'),
('sad', 'Melancholic and emotional content'),
('angry', 'Frustrating and rage-inducing content'),
('surprised', 'Unexpected and shocking content'),
('love', 'Heartwarming and romantic content'),
('gaming', 'Video game related content'),
('animals', 'Animal and pet related content'),
('food', 'Food and cooking related content'),
('work', 'Work and office related content'),
('school', 'Education and academic content');

-- Insert sample users (passwords are hashed versions of 'TestPass123')
INSERT INTO users (username, email, password, bio, is_verified, is_admin) VALUES
('admin', 'admin@zedmemes.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', TRUE, TRUE),
('memelord', 'memelord@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Professional meme creator', TRUE, FALSE),
('funnyguy', 'funnyguy@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Making the internet laugh one meme at a time', TRUE, FALSE),
('testuser', 'test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test user account', TRUE, FALSE);

-- Insert sample memes
INSERT INTO memes (title, description, image_path, category, user_id, views) VALUES
('Classic Programming Meme', 'When you finally fix that bug at 3 AM', 'sample_meme_1.jpg', 'funny', 2, 150),
('Monday Morning Mood', 'How everyone feels on Monday mornings', 'sample_meme_2.jpg', 'sad', 3, 89),
('Cat vs Dog', 'The eternal debate continues', 'sample_meme_3.jpg', 'funny', 2, 234),
('Debugging Life', 'Life is just one big debugging session', 'sample_meme_4.jpg', 'funny', 4, 67),
('Coffee Addiction', 'I can stop anytime I want... but I don\'t want to', 'sample_meme_5.jpg', 'funny', 3, 123);

-- Insert sample reactions
INSERT INTO reactions (meme_id, user_id, reaction_type) VALUES
(1, 3, 'like'),
(1, 4, 'love'),
(2, 2, 'sad'),
(2, 4, 'like'),
(3, 3, 'haha'),
(3, 4, 'love'),
(4, 2, 'like'),
(4, 3, 'wow'),
(5, 2, 'love'),
(5, 4, 'like');

-- Insert sample comments
INSERT INTO comments (meme_id, user_id, comment_text) VALUES
(1, 3, 'This is so relatable! 😂'),
(1, 4, 'Been there, done that!'),
(2, 2, 'Monday blues are real'),
(3, 4, 'Dogs are clearly superior'),
(4, 3, 'Debugging is life'),
(5, 2, 'Coffee is life fuel');

-- Insert sample meme tags
INSERT INTO meme_tags (meme_id, tag_id) VALUES
(1, 1), -- Programming meme -> funny
(1, 6), -- Programming meme -> gaming
(2, 2), -- Monday meme -> sad
(2, 9), -- Monday meme -> work
(3, 1), -- Cat vs Dog -> funny
(3, 7), -- Cat vs Dog -> animals
(4, 1), -- Debugging meme -> funny
(4, 6), -- Debugging meme -> gaming
(5, 1), -- Coffee meme -> funny
(5, 8); -- Coffee meme -> food

-- Create views for common queries
CREATE VIEW meme_stats AS
SELECT 
    m.meme_id,
    m.title,
    m.views,
    COUNT(DISTINCT r.reaction_id) as reaction_count,
    COUNT(DISTINCT c.comment_id) as comment_count,
    u.username as author_name
FROM memes m
LEFT JOIN reactions r ON m.meme_id = r.meme_id
LEFT JOIN comments c ON m.meme_id = c.meme_id
JOIN users u ON m.user_id = u.user_id
GROUP BY m.meme_id, m.title, m.views, u.username;

CREATE VIEW user_stats AS
SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT m.meme_id) as meme_count,
    COUNT(DISTINCT r.reaction_id) as reactions_given,
    COUNT(DISTINCT c.comment_id) as comments_made,
    COUNT(DISTINCT f.following_id) as following_count,
    COUNT(DISTINCT f2.follower_id) as followers_count
FROM users u
LEFT JOIN memes m ON u.user_id = m.user_id
LEFT JOIN reactions r ON u.user_id = r.user_id
LEFT JOIN comments c ON u.user_id = c.user_id
LEFT JOIN user_follows f ON u.user_id = f.follower_id
LEFT JOIN user_follows f2 ON u.user_id = f2.following_id
GROUP BY u.user_id, u.username;

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetMemeWithStats(IN meme_id_param INT)
BEGIN
    SELECT 
        m.*,
        u.username as author_name,
        COUNT(DISTINCT r.reaction_id) as total_reactions,
        COUNT(DISTINCT c.comment_id) as total_comments,
        GROUP_CONCAT(DISTINCT t.name) as tags
    FROM memes m
    JOIN users u ON m.user_id = u.user_id
    LEFT JOIN reactions r ON m.meme_id = r.meme_id
    LEFT JOIN comments c ON m.meme_id = c.meme_id
    LEFT JOIN meme_tags mt ON m.meme_id = mt.meme_id
    LEFT JOIN tags t ON mt.tag_id = t.tag_id
    WHERE m.meme_id = meme_id_param
    GROUP BY m.meme_id, m.title, m.description, m.image_path, m.category, m.user_id, m.views, m.created_at, u.username;
END //

CREATE PROCEDURE GetUserFeed(IN user_id_param INT, IN page_param INT, IN limit_param INT)
BEGIN
    DECLARE offset_val INT;
    SET offset_val = (page_param - 1) * limit_param;
    
    SELECT 
        m.*,
        u.username as author_name,
        COUNT(DISTINCT r.reaction_id) as reaction_count,
        COUNT(DISTINCT c.comment_id) as comment_count,
        EXISTS(SELECT 1 FROM user_favorites uf WHERE uf.user_id = user_id_param AND uf.meme_id = m.meme_id) as is_favorited
    FROM memes m
    JOIN users u ON m.user_id = u.user_id
    LEFT JOIN reactions r ON m.meme_id = r.meme_id
    LEFT JOIN comments c ON m.meme_id = c.comment_id
    WHERE m.user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = user_id_param
    ) OR m.user_id = user_id_param
    GROUP BY m.meme_id, m.title, m.description, m.image_path, m.category, m.user_id, m.views, m.created_at, u.username
    ORDER BY m.created_at DESC
    LIMIT limit_param OFFSET offset_val;
END //

CREATE PROCEDURE CleanupOldRateLimits()
BEGIN
    DELETE FROM api_rate_limits 
    WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR);
END //

DELIMITER ;

-- Create events for maintenance
CREATE EVENT IF NOT EXISTS cleanup_rate_limits
ON SCHEDULE EVERY 1 HOUR
DO CALL CleanupOldRateLimits();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON zed_memes.* TO 'zed_memes_user'@'localhost';
-- FLUSH PRIVILEGES; 