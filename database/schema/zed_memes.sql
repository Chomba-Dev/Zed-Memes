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