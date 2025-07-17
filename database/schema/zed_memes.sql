-- Zed-Memes Database Schema
-- This file contains the complete database structure for the Zed-Memes application

-- Create database
CREATE DATABASE IF NOT EXISTS zed_memes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zed_memes;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture_path VARCHAR(255) NULL
);

CREATE TABLE memes (
    meme_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key referencing the users table (uploader)
    image_path VARCHAR(255) NOT NULL, -- Path to the meme image file on the server
    caption VARCHAR(255) NULL, -- Optional caption for the meme
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the meme was uploaded
    
    -- Foreign key constraint to link memes to users
    CONSTRAINT fk_memes_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE -- If a user is deleted, their memes are also deleted
        ON UPDATE CASCADE
);

CREATE TABLE meme_download_log (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key referencing the users table (performer of activity)
    meme_id INT NOT NULL,
    
    -- Foreign key constraint to link activities to users
    CONSTRAINT fk_meme_download_log_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Foreign key constraint to link activities to memes
    CONSTRAINT fk_meme_download_log_meme
        FOREIGN KEY (meme_id)
        REFERENCES memes (meme_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meme_share_log (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key referencing the users table (performer of activity)
    meme_id INT NOT NULL,
    
    -- Foreign key constraint to link activities to users
    CONSTRAINT fk_meme_share_log_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Foreign key constraint to link activities to memes
    CONSTRAINT fk_meme_share_log_meme
        FOREIGN KEY (meme_id)
        REFERENCES memes (meme_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Table `user_meme_votes`
-- this table records 'Like' and 'Upvote' reactions, ensuring uniqueness 
-- -----------------------------------------------------
CREATE TABLE user_meme_votes (
    vote_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key referencing the users table (voter)
    meme_id INT NOT NULL, -- Foreign key referencing the memes table (voted meme)
    vote_type ENUM('downvote', 'upvote') NOT NULL, -- Type of vote (e.g., 'downvote', 'upvote')
    
    -- Unique constraint to ensure a user can only 'like' a meme once and 'upvote' it once
    CONSTRAINT uk_user_meme_votes_vote_type UNIQUE (user_id, meme_id, vote_type),
    
    -- Foreign key constraint to link votes to users
    CONSTRAINT fk_user_meme_votes_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Foreign key constraint to link votes to memes
    CONSTRAINT fk_user_meme_votes_meme
        FOREIGN KEY (meme_id)
        REFERENCES memes (meme_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE user_meme_reaction (
    reaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key referencing the users table (voter)
    meme_id INT NOT NULL, -- Foreign key referencing the memes table (voted meme)
    vote_type ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry') DEFAULT 'like', -- Type of vote (e.g., 'downvote', 'upvote')
    
    -- Unique constraint to ensure a user can only 'like' a meme once and 'upvote' it once
    CONSTRAINT uk_user_meme_reaction_vote_type UNIQUE (user_id, meme_id, vote_type),
    
    -- Foreign key constraint to link votes to users
    CONSTRAINT fk_user_meme_reaction_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    -- Foreign key constraint to link votes to memes
    CONSTRAINT fk_user_meme_reaction_meme
        FOREIGN KEY (meme_id)
        REFERENCES memes (meme_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =============================
-- STORED PROCEDURES
-- =============================

-- 1. Get Trending Memes (by upvotes-downvotes in last 7 days)
DELIMITER //
CREATE PROCEDURE get_trending_memes()
BEGIN
    SELECT m.*, 
           COALESCE(SUM(CASE WHEN umv.vote_type = 'upvote' THEN 1 WHEN umv.vote_type = 'downvote' THEN -1 ELSE 0 END), 0) AS trending_score,
           COUNT(DISTINCT umr.reaction_id) AS total_reactions
    FROM memes m
    LEFT JOIN user_meme_votes umv ON m.meme_id = umv.meme_id AND umv.vote_id IS NOT NULL
    LEFT JOIN user_meme_reaction umr ON m.meme_id = umr.meme_id AND umr.reaction_id IS NOT NULL
    WHERE m.uploaded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY m.meme_id
    ORDER BY trending_score DESC, total_reactions DESC, m.uploaded_at DESC;
END //
DELIMITER ;

-- 2. Get User's Uploaded Memes
DELIMITER //
CREATE PROCEDURE get_user_uploaded_memes(IN p_user_id INT)
BEGIN
    SELECT * FROM memes WHERE user_id = p_user_id ORDER BY uploaded_at DESC;
END //
DELIMITER ;

-- 3. Get Memes Relevant to a User (collaborative filtering)
DELIMITER //
CREATE PROCEDURE get_relevant_memes_for_user(IN p_user_id INT)
BEGIN
    -- Step 1: Find memes the user has upvoted or reacted to
    CREATE TEMPORARY TABLE IF NOT EXISTS user_liked_memes AS
        (SELECT meme_id FROM user_meme_votes WHERE user_id = p_user_id AND vote_type = 'upvote'
         UNION
         SELECT meme_id FROM user_meme_reaction WHERE user_id = p_user_id);
    
    -- Step 2: Find other users who liked the same memes
    CREATE TEMPORARY TABLE IF NOT EXISTS similar_users AS
        (SELECT DISTINCT user_id FROM user_meme_votes WHERE meme_id IN (SELECT meme_id FROM user_liked_memes) AND user_id != p_user_id AND vote_type = 'upvote'
         UNION
         SELECT DISTINCT user_id FROM user_meme_reaction WHERE meme_id IN (SELECT meme_id FROM user_liked_memes) AND user_id != p_user_id);
    
    -- Step 3: Find memes those users liked/upvoted, excluding memes already liked by the original user
    SELECT m.*, 
           COALESCE(SUM(CASE WHEN umv.vote_type = 'upvote' THEN 1 WHEN umv.vote_type = 'downvote' THEN -1 ELSE 0 END), 0) AS score,
           COUNT(DISTINCT umr.reaction_id) AS total_reactions
    FROM memes m
    LEFT JOIN user_meme_votes umv ON m.meme_id = umv.meme_id AND umv.user_id IN (SELECT user_id FROM similar_users)
    LEFT JOIN user_meme_reaction umr ON m.meme_id = umr.meme_id AND umr.user_id IN (SELECT user_id FROM similar_users)
    WHERE m.meme_id NOT IN (SELECT meme_id FROM user_liked_memes)
    GROUP BY m.meme_id
    ORDER BY score DESC, total_reactions DESC, m.uploaded_at DESC
    LIMIT 50;
    
    DROP TEMPORARY TABLE IF EXISTS user_liked_memes;
    DROP TEMPORARY TABLE IF EXISTS similar_users;
END //
DELIMITER ;

-- Sample users
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@example.com', '$2y$10$5smxmCAFWnkRjQ1LlKjAjO0ARDx5B1FquJA9EVHV/eCEd1pGHmmVm'),
('bob', 'bob@example.com', '$2y$10$4DzPJkcz0/33iQqlxm17zO5a7xA2uSYjXrA7h71X05h0fLELymT1G'),
('charlie', 'charlie@example.com', '$2y$10$E9c2YS7FzC8QW7pdmUOcEuESjtXPU4fLWqnRBe5w2gJUjIqJ3WFju'),
('diana', 'diana@example.com', '$2y$10$kUp8WxmsK8uyOiCBTzAbEeV8IJrn0IDJgjaIX1mHV1CQqNnzci4vW');

-- Sample memes
INSERT INTO memes (user_id, image_path, caption) VALUES
(2, 'assets/images/meme_1752478377_9c8b20c20e61774f.jpg', 'meme 1752478377 9c8b20c20e61774f'),
(1, 'assets/images/meme_1752478497_5b5520d6af769ea0.jpg', 'meme 1752478497 5b5520d6af769ea0'),
(2, 'assets/images/meme_1752478502_6d6102d021e380c2.jpg', 'meme 1752478502 6d6102d021e380c2'),
(4, 'assets/images/meme_1752478506_8a3d05c34f8aaf62.jpg', 'meme 1752478506 8a3d05c34f8aaf62');

-- Sample votes
INSERT INTO user_meme_votes (user_id, meme_id, vote_type) VALUES
(2, 1, 'downvote'),
(4, 1, 'downvote'),
(1, 2, 'downvote'),
(1, 3, 'upvote'),
(2, 4, 'downvote'),
(3, 4, 'downvote'),
(4, 4, 'downvote');

-- Sample reactions
INSERT INTO user_meme_reaction (user_id, meme_id, vote_type) VALUES
(1, 1, 'sad'),
(3, 1, 'love'),
(3, 2, 'angry'),
(2, 3, 'wow'),
(2, 4, 'love'),
(3, 4, 'sad');

-- Sample download logs
INSERT INTO meme_download_log (user_id, meme_id) VALUES
(1, 1),
(3, 1),
(1, 2),
(3, 2),
(4, 2),
(3, 3),
(1, 4),
(2, 4),
(4, 4);

-- Sample share logs
INSERT INTO meme_share_log (user_id, meme_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(1, 2),
(2, 2),
(3, 2),
(3, 3),
(1, 4),
(4, 4);

-- Sample users
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@example.com', '$2y$10$EqeV//V183fY3sX8NjRHXOr7mv8HWlP4ZA4sTiCT0sYussxCE/1IW'),
('bob', 'bob@example.com', '$2y$10$JF2bk/H/iFE86FLsTFm.2uEylkB6g/CqOxvpC.cjv0r13bbK0aMey'),
('charlie', 'charlie@example.com', '$2y$10$ADBjppEfKhj9zKR8mvi1UOEXrCZd4R/y8zYLhsnFRvRVvoU1JAcSS'),
('diana', 'diana@example.com', '$2y$10$1k1lKkg9y1uc67gtgmcRj.g9j.th3T2pNMfBNlFKMxHRHgBABaJuu');

-- Sample memes
INSERT INTO memes (user_id, image_path, caption) VALUES
(4, 'assets/images/IMG-20250716-WA0038.jpg', 'IMG 20250716 WA0038'),
(3, 'assets/images/IMG-20250716-WA0039.jpg', 'IMG 20250716 WA0039'),
(2, 'assets/images/IMG-20250716-WA0040.jpg', 'IMG 20250716 WA0040'),
(4, 'assets/images/IMG-20250716-WA0042.jpg', 'IMG 20250716 WA0042'),
(2, 'assets/images/IMG-20250716-WA0063.jpg', 'IMG 20250716 WA0063'),
(2, 'assets/images/IMG-20250716-WA0064.jpg', 'IMG 20250716 WA0064'),
(2, 'assets/images/IMG-20250716-WA0065.jpg', 'IMG 20250716 WA0065'),
(1, 'assets/images/IMG-20250716-WA0066.jpg', 'IMG 20250716 WA0066'),
(2, 'assets/images/IMG-20250716-WA0067.jpg', 'IMG 20250716 WA0067'),
(1, 'assets/images/IMG-20250716-WA0068.jpg', 'IMG 20250716 WA0068'),
(2, 'assets/images/IMG-20250716-WA0069.jpg', 'IMG 20250716 WA0069'),
(2, 'assets/images/IMG-20250716-WA0070.jpg', 'IMG 20250716 WA0070'),
(3, 'assets/images/IMG-20250716-WA0071.jpg', 'IMG 20250716 WA0071'),
(4, 'assets/images/IMG-20250716-WA0072.jpg', 'IMG 20250716 WA0072'),
(3, 'assets/images/IMG-20250716-WA0073.jpg', 'IMG 20250716 WA0073'),
(1, 'assets/images/IMG-20250716-WA0074.jpg', 'IMG 20250716 WA0074'),
(3, 'assets/images/IMG-20250716-WA0075.jpg', 'IMG 20250716 WA0075'),
(2, 'assets/images/IMG-20250716-WA0076.jpg', 'IMG 20250716 WA0076'),
(2, 'assets/images/IMG-20250716-WA0077.jpg', 'IMG 20250716 WA0077'),
(1, 'assets/images/IMG-20250716-WA0078.jpg', 'IMG 20250716 WA0078'),
(3, 'assets/images/IMG-20250716-WA0079.jpg', 'IMG 20250716 WA0079'),
(4, 'assets/images/IMG-20250716-WA0080.jpg', 'IMG 20250716 WA0080'),
(1, 'assets/images/IMG-20250716-WA0104.jpg', 'IMG 20250716 WA0104'),
(3, 'assets/images/IMG-20250716-WA0105.jpg', 'IMG 20250716 WA0105'),
(1, 'assets/images/IMG-20250716-WA0107.jpg', 'IMG 20250716 WA0107'),
(1, 'assets/images/IMG-20250716-WA0114.jpg', 'IMG 20250716 WA0114'),
(1, 'assets/images/IMG-20250716-WA0116.jpg', 'IMG 20250716 WA0116'),
(4, 'assets/images/IMG-20250716-WA0117.jpg', 'IMG 20250716 WA0117'),
(4, 'assets/images/IMG-20250716-WA0118.jpg', 'IMG 20250716 WA0118'),
(2, 'assets/images/IMG-20250716-WA0119.jpg', 'IMG 20250716 WA0119'),
(2, 'assets/images/IMG-20250716-WA0120.jpg', 'IMG 20250716 WA0120'),
(3, 'assets/images/IMG-20250716-WA0122.jpg', 'IMG 20250716 WA0122'),
(3, 'assets/images/IMG-20250716-WA0123.jpg', 'IMG 20250716 WA0123'),
(3, 'assets/images/IMG-20250716-WA0125.jpg', 'IMG 20250716 WA0125'),
(1, 'assets/images/IMG-20250716-WA0152.jpg', 'IMG 20250716 WA0152'),
(3, 'assets/images/IMG-20250716-WA0153.jpg', 'IMG 20250716 WA0153'),
(2, 'assets/images/IMG-20250716-WA0154.jpg', 'IMG 20250716 WA0154'),
(3, 'assets/images/IMG-20250716-WA0155.jpg', 'IMG 20250716 WA0155'),
(3, 'assets/images/IMG-20250716-WA0157.jpg', 'IMG 20250716 WA0157'),
(4, 'assets/images/WhatsApp Image 2025-07-16 at 11.48.21_40a1d82c.jpg', 'WhatsApp Image 2025 07 16 at 11.48.21 40a1d82c'),
(3, 'assets/images/WhatsApp Image 2025-07-16 at 13.33.20_1a74d4cb.jpg', 'WhatsApp Image 2025 07 16 at 13.33.20 1a74d4cb'),
(2, 'assets/images/WhatsApp Image 2025-07-16 at 13.33.20_501cb0fb.jpg', 'WhatsApp Image 2025 07 16 at 13.33.20 501cb0fb'),
(4, 'assets/images/WhatsApp Image 2025-07-16 at 13.33.24_aa8b99f1.jpg', 'WhatsApp Image 2025 07 16 at 13.33.24 aa8b99f1'),
(2, 'assets/images/WhatsApp Image 2025-07-16 at 17.02.30_9f14bf22.jpg', 'WhatsApp Image 2025 07 16 at 17.02.30 9f14bf22'),
(1, 'assets/images/meme_1752478377_9c8b20c20e61774f.jpg', 'meme 1752478377 9c8b20c20e61774f'),
(2, 'assets/images/meme_1752478497_5b5520d6af769ea0.jpg', 'meme 1752478497 5b5520d6af769ea0'),
(1, 'assets/images/meme_1752478502_6d6102d021e380c2.jpg', 'meme 1752478502 6d6102d021e380c2'),
(2, 'assets/images/meme_1752478506_8a3d05c34f8aaf62.jpg', 'meme 1752478506 8a3d05c34f8aaf62');

-- Sample votes
INSERT INTO user_meme_votes (user_id, meme_id, vote_type) VALUES
(1, 1, 'downvote'),
(3, 1, 'downvote'),
(3, 2, 'upvote'),
(4, 2, 'downvote'),
(1, 3, 'downvote'),
(2, 4, 'downvote'),
(3, 4, 'downvote'),
(4, 4, 'upvote'),
(1, 5, 'upvote'),
(3, 5, 'downvote'),
(1, 6, 'upvote'),
(3, 6, 'upvote'),
(4, 6, 'upvote'),
(2, 7, 'downvote'),
(3, 7, 'upvote'),
(4, 7, 'downvote'),
(1, 8, 'upvote'),
(4, 8, 'downvote'),
(1, 9, 'downvote'),
(2, 10, 'upvote'),
(3, 10, 'upvote'),
(3, 11, 'downvote'),
(2, 12, 'downvote'),
(4, 12, 'downvote'),
(3, 13, 'downvote'),
(1, 14, 'downvote'),
(2, 14, 'upvote'),
(3, 14, 'downvote'),
(1, 15, 'downvote'),
(2, 15, 'upvote'),
(4, 15, 'downvote'),
(1, 16, 'upvote'),
(2, 16, 'downvote'),
(3, 16, 'downvote'),
(2, 17, 'upvote'),
(3, 17, 'upvote'),
(2, 18, 'downvote'),
(4, 18, 'upvote'),
(1, 19, 'upvote'),
(4, 19, 'downvote'),
(1, 20, 'downvote'),
(3, 20, 'upvote'),
(2, 21, 'upvote'),
(1, 22, 'upvote'),
(2, 22, 'downvote'),
(3, 22, 'downvote'),
(1, 23, 'upvote'),
(3, 23, 'downvote'),
(4, 23, 'downvote'),
(1, 24, 'downvote'),
(2, 24, 'downvote'),
(3, 24, 'upvote'),
(1, 25, 'downvote'),
(2, 25, 'upvote'),
(4, 25, 'upvote'),
(1, 26, 'downvote'),
(3, 26, 'downvote'),
(3, 28, 'downvote'),
(2, 29, 'upvote'),
(4, 29, 'upvote'),
(1, 30, 'upvote'),
(3, 30, 'upvote'),
(2, 31, 'upvote'),
(1, 32, 'upvote'),
(2, 32, 'downvote'),
(3, 32, 'upvote'),
(4, 32, 'upvote'),
(1, 33, 'downvote'),
(3, 33, 'upvote'),
(2, 34, 'upvote'),
(3, 34, 'downvote'),
(4, 34, 'upvote'),
(1, 35, 'downvote'),
(3, 35, 'downvote'),
(1, 37, 'upvote'),
(3, 37, 'downvote'),
(1, 38, 'downvote'),
(2, 38, 'upvote'),
(4, 39, 'downvote'),
(2, 40, 'upvote'),
(1, 41, 'upvote'),
(2, 41, 'downvote'),
(3, 41, 'upvote'),
(4, 41, 'downvote'),
(3, 42, 'downvote'),
(1, 43, 'upvote'),
(2, 43, 'downvote'),
(4, 43, 'downvote'),
(1, 44, 'upvote'),
(2, 44, 'upvote'),
(2, 45, 'upvote'),
(3, 45, 'downvote'),
(4, 45, 'upvote'),
(1, 46, 'downvote'),
(2, 46, 'upvote'),
(4, 46, 'downvote'),
(2, 47, 'upvote'),
(1, 48, 'upvote'),
(3, 48, 'downvote');

-- Sample reactions
INSERT INTO user_meme_reaction (user_id, meme_id, vote_type) VALUES
(1, 1, 'angry'),
(4, 1, 'love'),
(3, 2, 'haha'),
(2, 3, 'wow'),
(3, 3, 'love'),
(4, 3, 'like'),
(2, 4, 'wow'),
(4, 4, 'sad'),
(1, 5, 'sad'),
(2, 5, 'love'),
(1, 6, 'wow'),
(2, 6, 'like'),
(1, 7, 'love'),
(2, 7, 'like'),
(4, 7, 'angry'),
(3, 8, 'love'),
(1, 9, 'angry'),
(2, 9, 'like'),
(4, 9, 'wow'),
(1, 10, 'like'),
(2, 10, 'angry'),
(3, 10, 'wow'),
(4, 10, 'haha'),
(2, 11, 'love'),
(3, 11, 'sad'),
(4, 11, 'haha'),
(2, 12, 'haha'),
(3, 12, 'love'),
(4, 12, 'sad'),
(1, 13, 'sad'),
(3, 13, 'wow'),
(2, 14, 'love'),
(3, 14, 'angry'),
(2, 15, 'wow'),
(4, 15, 'sad'),
(1, 16, 'wow'),
(2, 16, 'haha'),
(3, 16, 'haha'),
(4, 16, 'like'),
(2, 17, 'haha'),
(3, 17, 'like'),
(4, 17, 'haha'),
(1, 18, 'sad'),
(4, 18, 'like'),
(2, 19, 'love'),
(3, 19, 'angry'),
(4, 19, 'love'),
(2, 20, 'haha'),
(1, 21, 'wow'),
(2, 21, 'wow'),
(3, 22, 'wow'),
(1, 23, 'sad'),
(3, 23, 'sad'),
(4, 23, 'like'),
(4, 24, 'haha'),
(4, 25, 'haha'),
(1, 26, 'love'),
(3, 26, 'sad'),
(4, 26, 'angry'),
(2, 27, 'sad'),
(4, 27, 'sad'),
(1, 28, 'love'),
(2, 28, 'haha'),
(2, 29, 'haha'),
(3, 29, 'angry'),
(1, 30, 'love'),
(4, 30, 'love'),
(2, 31, 'haha'),
(1, 32, 'wow'),
(3, 32, 'love'),
(1, 33, 'haha'),
(3, 33, 'love'),
(4, 33, 'angry'),
(1, 34, 'sad'),
(4, 34, 'wow'),
(2, 35, 'love'),
(3, 35, 'angry'),
(4, 35, 'angry'),
(2, 37, 'angry'),
(4, 37, 'like'),
(3, 38, 'wow'),
(4, 38, 'haha'),
(1, 39, 'sad'),
(2, 39, 'love'),
(1, 40, 'love'),
(2, 40, 'love'),
(4, 40, 'love'),
(1, 41, 'like'),
(2, 41, 'sad'),
(4, 41, 'love'),
(1, 42, 'angry'),
(3, 42, 'like'),
(4, 42, 'wow'),
(1, 43, 'sad'),
(2, 44, 'haha'),
(4, 44, 'like'),
(1, 45, 'sad'),
(2, 45, 'angry'),
(3, 45, 'sad'),
(1, 46, 'angry'),
(2, 46, 'haha'),
(3, 47, 'like'),
(4, 47, 'love'),
(4, 48, 'like');

-- Sample download logs
INSERT INTO meme_download_log (user_id, meme_id) VALUES
(4, 1),
(3, 2),
(4, 2),
(1, 3),
(2, 3),
(4, 3),
(1, 4),
(2, 4),
(3, 5),
(4, 6),
(1, 7),
(4, 7),
(1, 8),
(3, 8),
(2, 9),
(3, 9),
(1, 10),
(2, 10),
(3, 10),
(4, 11),
(2, 12),
(4, 12),
(2, 13),
(4, 13),
(1, 14),
(2, 14),
(3, 14),
(2, 16),
(3, 16),
(4, 16),
(1, 17),
(3, 17),
(4, 17),
(3, 18),
(2, 19),
(3, 19),
(1, 20),
(3, 21),
(4, 21),
(1, 22),
(3, 22),
(4, 23),
(4, 24),
(1, 25),
(2, 25),
(4, 25),
(3, 26),
(2, 27),
(2, 28),
(4, 28),
(2, 29),
(3, 29),
(3, 30),
(4, 31),
(1, 32),
(2, 32),
(4, 32),
(4, 34),
(2, 35),
(3, 35),
(4, 35),
(3, 36),
(4, 36),
(2, 37),
(3, 37),
(4, 37),
(2, 38),
(2, 39),
(4, 39),
(2, 40),
(3, 40),
(4, 40),
(2, 41),
(3, 41),
(3, 42),
(1, 43),
(4, 44),
(2, 45),
(3, 45),
(3, 46),
(4, 46),
(4, 47),
(1, 48),
(3, 48),
(4, 48);

-- Sample share logs
INSERT INTO meme_share_log (user_id, meme_id) VALUES
(1, 1),
(2, 1),
(4, 1),
(1, 2),
(2, 2),
(3, 2),
(4, 2),
(4, 3),
(2, 5),
(1, 6),
(3, 6),
(4, 6),
(1, 7),
(2, 7),
(4, 7),
(1, 8),
(2, 8),
(3, 8),
(2, 9),
(2, 10),
(3, 10),
(1, 11),
(4, 11),
(1, 12),
(3, 12),
(1, 13),
(2, 13),
(4, 13),
(2, 14),
(3, 14),
(4, 14),
(2, 15),
(3, 15),
(4, 15),
(2, 16),
(4, 16),
(1, 17),
(2, 17),
(4, 17),
(1, 18),
(2, 18),
(3, 18),
(1, 19),
(2, 19),
(4, 19),
(1, 20),
(2, 20),
(4, 20),
(1, 21),
(2, 21),
(4, 21),
(1, 22),
(2, 22),
(3, 22),
(2, 23),
(2, 24),
(4, 24),
(2, 26),
(4, 26),
(1, 27),
(3, 27),
(4, 27),
(2, 28),
(3, 28),
(1, 29),
(2, 29),
(3, 29),
(4, 29),
(1, 30),
(2, 30),
(4, 30),
(1, 31),
(4, 31),
(3, 32),
(4, 32),
(2, 33),
(3, 33),
(4, 33),
(3, 34),
(4, 34),
(2, 35),
(4, 35),
(4, 36),
(1, 37),
(2, 37),
(1, 38),
(3, 38),
(4, 38),
(3, 39),
(4, 39),
(2, 40),
(2, 41),
(1, 42),
(3, 42),
(4, 42),
(4, 43),
(2, 44),
(4, 44),
(2, 45),
(3, 45),
(4, 45),
(2, 47),
(4, 47),
(1, 48),
(2, 48);
