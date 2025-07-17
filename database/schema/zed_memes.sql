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
('alice', 'alice@example.com', '$2y$10$PxljkCLdRczoQEJ7f7MlL.mdQroWLYizThrRisuWAOYYDloJbt3Im'),
('bob', 'bob@example.com', '$2y$10$xYyvxRV6APermg7VPDbYVevSaIwh9ZcLr85IJeiIMkXWXQGJkhol6'),
('charlie', 'charlie@example.com', '$2y$10$TBmxdc2dh8rxUNyo7tgrAelRkwvNUWsJJbp/y4xMEK3RUdA6w4/le'),
('diana', 'diana@example.com', '$2y$10$Q5.m9ICmg5fL1YcEbmiXEeeV3k5UzzZJ2vZga7lThe5Z3XEMIPl06');

-- Sample memes
INSERT INTO memes (user_id, image_path, caption) VALUES
(1, 'assets/images/At-Nandos-Lol.jpg', 'At Nandos Lol'),
(1, 'assets/images/Being-poor-you-say-yes-to-anything.jpg', 'Being poor you say yes to anything'),
(3, 'assets/images/Damn-the-goat-on-some-fly-shit.jpg', 'Damn the goat on some fly shit'),
(4, 'assets/images/Eh-ma-inglishes-nayo.jpg', 'Eh ma inglishes nayo'),
(4, 'assets/images/God-is-the-greatest.jpg', 'God is the greatest'),
(4, 'assets/images/Hard-on-this-money-shit-bro.jpg', 'Hard on this money shit bro'),
(3, 'assets/images/Life-Is-a-gamble.jpg', 'Life Is a gamble'),
(4, 'assets/images/No off days my nigga.jpg', 'No off days my nigga'),
(3, 'assets/images/Remontada.jpg', 'Remontada'),
(2, 'assets/images/Teine-Best-Student-mayo.jpg', 'Teine Best Student mayo'),
(3, 'assets/images/They-Gonna-call-you-crazy.jpg', 'They Gonna call you crazy'),
(4, 'assets/images/a.jpg', 'a'),
(1, 'assets/images/aura.jpg', 'aura'),
(1, 'assets/images/ba-guy-vopatikiza.jpg', 'ba guy vopatikiza'),
(4, 'assets/images/better-fye.jpg', 'better fye'),
(3, 'assets/images/called-the-gang-lets-go-chilling.jpg', 'called the gang lets go chilling'),
(4, 'assets/images/current-situation.jpg', 'current situation'),
(2, 'assets/images/does-it.jpg', 'does it'),
(1, 'assets/images/dont-tell-me-what-to-do.jpg', 'dont tell me what to do'),
(1, 'assets/images/fima-koko-wetata.jpg', 'fima koko wetata'),
(2, 'assets/images/first-year-inipasa-chizwezwe.jpg', 'first year inipasa chizwezwe'),
(3, 'assets/images/give-us-our-daily-bread.jpg', 'give us our daily bread'),
(3, 'assets/images/how-you-get-treated-after-failing.jpg', 'how you get treated after failing'),
(1, 'assets/images/i-cant-even-remember-the-last-time-i-was-tired.jpg', 'i cant even remember the last time i was tired'),
(4, 'assets/images/i-cant-trust-my-guys.jpg', 'i cant trust my guys'),
(1, 'assets/images/i-need-this-paper.jpg', 'i need this paper'),
(1, 'assets/images/imagine-ba-guy-aii.jpg', 'imagine ba guy aii'),
(4, 'assets/images/in-other-words-i-am-him.jpg', 'in other words i am him'),
(4, 'assets/images/kaili.jpg', 'kaili'),
(2, 'assets/images/kukumyanga.jpg', 'kukumyanga'),
(1, 'assets/images/lassst.jpg', 'lassst'),
(1, 'assets/images/ma-kale-bwangu.jpg', 'ma kale bwangu'),
(2, 'assets/images/me-with-bae.jpg', 'me with bae'),
(2, 'assets/images/me-with-the-gang.jpg', 'me with the gang'),
(1, 'assets/images/minister-of-enjoyment.jpg', 'minister of enjoyment'),
(4, 'assets/images/mupeleni-bra-uyo-cinderella.jpg', 'mupeleni bra uyo cinderella'),
(4, 'assets/images/my-problem.jpg', 'my problem'),
(4, 'assets/images/naikosa.jpg', 'naikosa'),
(2, 'assets/images/ndekweba.jpg', 'ndekweba'),
(1, 'assets/images/ndepishamo-pen.jpg', 'ndepishamo pen'),
(3, 'assets/images/never.jpg', 'never'),
(1, 'assets/images/niggas-be-dating-anything.jpg', 'niggas be dating anything'),
(2, 'assets/images/ninkaba.jpg', 'ninkaba'),
(1, 'assets/images/nzelu-no-bwino-bwino.jpg', 'nzelu no bwino bwino'),
(1, 'assets/images/outside-i-dont-encourage.jpg', 'outside i dont encourage'),
(3, 'assets/images/palapya-at-this-point.jpg', 'palapya at this point'),
(3, 'assets/images/real-madrid-at-it.jpg', 'real madrid at it'),
(1, 'assets/images/sharp-bine-anyone-lol.jpg', 'sharp bine anyone lol'),
(2, 'assets/images/she-will-leave-you-with-your-muscles.jpg', 'she will leave you with your muscles'),
(3, 'assets/images/so-inspiring-ndekweba.jpg', 'so inspiring ndekweba'),
(4, 'assets/images/soft-life-nayo.jpg', 'soft life nayo'),
(2, 'assets/images/tabesha.jpg', 'tabesha'),
(1, 'assets/images/talk-to-me-nicely.jpg', 'talk to me nicely'),
(4, 'assets/images/tapali-efyo-wingalanda.jpg', 'tapali efyo wingalanda'),
(3, 'assets/images/there-will-be-signs.jpg', 'there will be signs'),
(2, 'assets/images/they-scammed-us.jpg', 'they scammed us'),
(4, 'assets/images/this-july-lol.jpg', 'this july lol'),
(3, 'assets/images/tu-gelo-nato.jpg', 'tu gelo nato'),
(1, 'assets/images/tuma-small-boys.jpg', 'tuma small boys'),
(4, 'assets/images/vizingu-sivatu.jpg', 'vizingu sivatu'),
(4, 'assets/images/waulesi-asadye.jpg', 'waulesi asadye'),
(1, 'assets/images/when-the-prize-isnt-prizing.jpg', 'when the prize isnt prizing'),
(4, 'assets/images/when-you-didnt-work-hard-in-yo-20s.jpg', 'when you didnt work hard in yo 20s'),
(3, 'assets/images/work-hard-untill-they-ask-for-a-photo-lol.jpg', 'work hard untill they ask for a photo lol'),
(2, 'assets/images/yalikaba-wetata.jpg', 'yalikaba wetata'),
(2, 'assets/images/yes.jpg', 'yes'),
(1, 'assets/images/yo-hustling-husband.jpg', 'yo hustling husband');

-- Sample votes
INSERT INTO user_meme_votes (user_id, meme_id, vote_type) VALUES
(1, 1, 'upvote'),
(3, 1, 'upvote'),
(4, 1, 'upvote'),
(1, 2, 'upvote'),
(2, 2, 'upvote'),
(3, 2, 'upvote'),
(4, 2, 'upvote'),
(2, 3, 'upvote'),
(3, 3, 'downvote'),
(4, 3, 'downvote'),
(2, 4, 'downvote'),
(3, 4, 'downvote'),
(4, 4, 'upvote'),
(2, 5, 'upvote'),
(3, 5, 'downvote'),
(2, 6, 'downvote'),
(3, 6, 'upvote'),
(4, 6, 'upvote'),
(4, 7, 'downvote'),
(2, 8, 'downvote'),
(3, 8, 'upvote'),
(1, 9, 'upvote'),
(2, 10, 'upvote'),
(1, 11, 'downvote'),
(2, 11, 'downvote'),
(3, 11, 'upvote'),
(1, 12, 'downvote'),
(2, 12, 'upvote'),
(4, 13, 'upvote'),
(1, 14, 'upvote'),
(2, 14, 'downvote'),
(3, 14, 'upvote'),
(1, 15, 'downvote'),
(2, 15, 'downvote'),
(3, 15, 'downvote'),
(4, 15, 'downvote'),
(2, 16, 'downvote'),
(4, 16, 'upvote'),
(2, 17, 'downvote'),
(1, 18, 'upvote'),
(4, 18, 'upvote'),
(4, 19, 'upvote'),
(1, 20, 'downvote'),
(2, 20, 'upvote'),
(4, 20, 'downvote'),
(1, 21, 'downvote'),
(2, 21, 'downvote'),
(4, 22, 'downvote'),
(2, 23, 'upvote'),
(3, 23, 'upvote'),
(4, 23, 'upvote'),
(2, 24, 'downvote'),
(4, 24, 'upvote'),
(1, 25, 'downvote'),
(2, 25, 'downvote'),
(2, 26, 'downvote'),
(3, 26, 'upvote'),
(2, 27, 'downvote'),
(4, 27, 'downvote'),
(1, 28, 'downvote'),
(2, 28, 'downvote'),
(3, 29, 'downvote'),
(1, 30, 'upvote'),
(1, 31, 'upvote'),
(2, 31, 'upvote'),
(1, 32, 'downvote'),
(4, 32, 'downvote'),
(2, 33, 'upvote'),
(3, 33, 'downvote'),
(3, 34, 'upvote'),
(2, 35, 'upvote'),
(3, 35, 'upvote'),
(4, 35, 'downvote'),
(2, 36, 'downvote'),
(3, 36, 'downvote'),
(4, 36, 'downvote'),
(1, 37, 'downvote'),
(2, 37, 'upvote'),
(4, 37, 'upvote'),
(1, 38, 'downvote'),
(2, 38, 'upvote'),
(3, 38, 'upvote'),
(4, 38, 'downvote'),
(3, 39, 'upvote'),
(2, 40, 'downvote'),
(4, 40, 'downvote'),
(1, 41, 'downvote'),
(4, 41, 'downvote'),
(2, 42, 'upvote'),
(4, 42, 'downvote'),
(3, 43, 'downvote'),
(4, 43, 'upvote'),
(2, 44, 'upvote'),
(4, 44, 'upvote'),
(3, 45, 'downvote'),
(3, 47, 'downvote'),
(1, 48, 'downvote'),
(2, 48, 'downvote'),
(1, 49, 'upvote'),
(3, 49, 'upvote'),
(3, 50, 'downvote'),
(4, 50, 'upvote'),
(1, 51, 'upvote'),
(2, 51, 'downvote'),
(3, 51, 'upvote'),
(4, 51, 'upvote'),
(2, 52, 'downvote'),
(3, 52, 'upvote'),
(2, 53, 'downvote'),
(4, 53, 'upvote'),
(4, 54, 'upvote'),
(1, 55, 'downvote'),
(2, 55, 'downvote'),
(1, 56, 'upvote'),
(1, 57, 'upvote'),
(2, 57, 'downvote'),
(4, 57, 'upvote'),
(1, 58, 'downvote'),
(2, 58, 'upvote'),
(4, 58, 'downvote'),
(1, 59, 'downvote'),
(2, 59, 'downvote'),
(2, 60, 'downvote'),
(3, 60, 'downvote'),
(1, 61, 'downvote'),
(2, 61, 'upvote'),
(3, 61, 'downvote'),
(1, 62, 'upvote'),
(4, 62, 'upvote'),
(1, 63, 'downvote'),
(3, 63, 'upvote'),
(1, 64, 'upvote'),
(3, 64, 'upvote'),
(1, 65, 'downvote'),
(2, 65, 'upvote'),
(3, 65, 'upvote'),
(2, 66, 'downvote'),
(1, 67, 'upvote'),
(2, 67, 'downvote');

-- Sample reactions
INSERT INTO user_meme_reaction (user_id, meme_id, vote_type) VALUES
(1, 1, 'wow'),
(2, 1, 'like'),
(3, 1, 'wow'),
(4, 1, 'like'),
(3, 2, 'love'),
(1, 3, 'wow'),
(3, 3, 'angry'),
(3, 4, 'wow'),
(4, 4, 'angry'),
(2, 6, 'angry'),
(3, 6, 'angry'),
(1, 7, 'like'),
(2, 8, 'angry'),
(3, 8, 'like'),
(4, 8, 'wow'),
(1, 9, 'sad'),
(1, 10, 'angry'),
(2, 10, 'wow'),
(3, 10, 'haha'),
(4, 11, 'haha'),
(2, 12, 'haha'),
(1, 13, 'like'),
(2, 13, 'angry'),
(3, 13, 'sad'),
(4, 13, 'haha'),
(2, 14, 'sad'),
(3, 14, 'sad'),
(1, 15, 'sad'),
(2, 15, 'love'),
(1, 16, 'wow'),
(1, 17, 'angry'),
(2, 17, 'like'),
(3, 17, 'like'),
(2, 18, 'love'),
(4, 18, 'haha'),
(3, 19, 'love'),
(3, 20, 'angry'),
(2, 21, 'angry'),
(4, 21, 'wow'),
(1, 22, 'wow'),
(2, 22, 'haha'),
(3, 22, 'like'),
(4, 22, 'like'),
(2, 24, 'haha'),
(3, 24, 'like'),
(4, 25, 'wow'),
(1, 26, 'love'),
(2, 26, 'angry'),
(3, 26, 'like'),
(4, 26, 'love'),
(3, 27, 'love'),
(1, 28, 'like'),
(2, 28, 'love'),
(3, 28, 'haha'),
(2, 29, 'like'),
(3, 29, 'love'),
(4, 29, 'wow'),
(1, 30, 'love'),
(2, 30, 'love'),
(3, 30, 'wow'),
(4, 30, 'haha'),
(2, 32, 'haha'),
(3, 32, 'haha'),
(4, 32, 'love'),
(3, 33, 'like'),
(2, 34, 'like'),
(3, 34, 'haha'),
(1, 35, 'wow'),
(1, 36, 'wow'),
(2, 36, 'sad'),
(3, 36, 'like'),
(1, 37, 'angry'),
(2, 37, 'love'),
(3, 37, 'like'),
(4, 37, 'wow'),
(2, 38, 'angry'),
(4, 38, 'haha'),
(1, 39, 'haha'),
(2, 39, 'love'),
(3, 39, 'sad'),
(2, 40, 'angry'),
(4, 40, 'love'),
(2, 41, 'wow'),
(2, 42, 'like'),
(3, 42, 'haha'),
(4, 43, 'sad'),
(1, 44, 'like'),
(2, 44, 'like'),
(4, 44, 'haha'),
(1, 45, 'angry'),
(2, 45, 'love'),
(1, 46, 'like'),
(2, 46, 'sad'),
(4, 46, 'angry'),
(1, 47, 'sad'),
(2, 48, 'love'),
(3, 48, 'haha'),
(2, 49, 'sad'),
(2, 50, 'sad'),
(3, 50, 'haha'),
(1, 51, 'angry'),
(3, 52, 'wow'),
(4, 52, 'like'),
(3, 53, 'love'),
(1, 54, 'like'),
(2, 54, 'love'),
(3, 54, 'sad'),
(1, 55, 'love'),
(2, 55, 'haha'),
(1, 56, 'haha'),
(4, 56, 'like'),
(1, 57, 'haha'),
(2, 57, 'like'),
(4, 57, 'like'),
(1, 58, 'sad'),
(2, 58, 'wow'),
(4, 58, 'sad'),
(4, 59, 'haha'),
(2, 60, 'sad'),
(1, 61, 'angry'),
(3, 61, 'wow'),
(2, 62, 'sad'),
(3, 62, 'haha'),
(1, 63, 'sad'),
(4, 63, 'wow'),
(1, 64, 'angry'),
(4, 64, 'wow'),
(1, 65, 'love'),
(2, 65, 'like'),
(4, 65, 'haha'),
(2, 66, 'angry'),
(4, 66, 'love');

-- Sample download logs
INSERT INTO meme_download_log (user_id, meme_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(1, 2),
(2, 2),
(4, 2),
(2, 3),
(3, 3),
(4, 3),
(3, 4),
(4, 4),
(1, 5),
(4, 5),
(3, 7),
(4, 8),
(1, 9),
(2, 9),
(3, 9),
(4, 9),
(2, 10),
(4, 10),
(1, 11),
(2, 11),
(3, 11),
(4, 11),
(1, 12),
(2, 12),
(3, 13),
(1, 14),
(2, 15),
(3, 15),
(1, 17),
(2, 17),
(3, 18),
(2, 19),
(4, 19),
(2, 20),
(1, 21),
(1, 22),
(3, 22),
(4, 22),
(1, 23),
(3, 23),
(4, 23),
(3, 24),
(4, 24),
(1, 25),
(2, 25),
(3, 25),
(1, 26),
(2, 26),
(3, 26),
(1, 27),
(3, 28),
(1, 29),
(4, 29),
(2, 30),
(3, 30),
(4, 30),
(2, 31),
(3, 31),
(2, 32),
(3, 32),
(3, 33),
(1, 34),
(2, 34),
(3, 34),
(4, 34),
(3, 35),
(4, 35),
(1, 36),
(2, 37),
(1, 38),
(2, 38),
(3, 38),
(4, 38),
(3, 39),
(1, 40),
(4, 40),
(1, 41),
(4, 41),
(2, 42),
(3, 42),
(3, 43),
(2, 44),
(4, 44),
(2, 45),
(3, 45),
(4, 45),
(2, 46),
(2, 47),
(3, 47),
(4, 47),
(1, 48),
(2, 48),
(3, 48),
(4, 48),
(3, 49),
(1, 50),
(4, 50),
(2, 51),
(3, 51),
(2, 52),
(4, 52),
(1, 53),
(3, 53),
(2, 54),
(3, 54),
(4, 54),
(1, 55),
(3, 55),
(4, 55),
(2, 56),
(3, 56),
(1, 57),
(4, 57),
(3, 58),
(2, 59),
(3, 59),
(1, 60),
(2, 60),
(3, 60),
(4, 60),
(1, 61),
(3, 61),
(2, 62),
(4, 62),
(1, 63),
(2, 63),
(4, 63),
(1, 64),
(2, 64),
(4, 64),
(1, 65),
(3, 66),
(1, 67),
(2, 67),
(3, 67);

-- Sample share logs
INSERT INTO meme_share_log (user_id, meme_id) VALUES
(2, 1),
(3, 1),
(4, 1),
(1, 2),
(3, 2),
(4, 2),
(1, 3),
(2, 3),
(1, 4),
(2, 5),
(3, 5),
(4, 5),
(2, 6),
(3, 6),
(3, 7),
(1, 8),
(2, 8),
(3, 8),
(4, 8),
(4, 9),
(2, 10),
(3, 10),
(4, 10),
(1, 11),
(3, 11),
(4, 11),
(2, 12),
(4, 12),
(1, 13),
(1, 14),
(3, 14),
(4, 14),
(1, 15),
(4, 15),
(1, 17),
(4, 17),
(1, 18),
(2, 18),
(3, 18),
(4, 18),
(1, 19),
(2, 19),
(3, 19),
(4, 19),
(2, 20),
(3, 20),
(4, 20),
(1, 21),
(2, 21),
(3, 21),
(4, 21),
(1, 22),
(1, 23),
(3, 23),
(1, 24),
(2, 24),
(3, 24),
(4, 24),
(2, 25),
(3, 25),
(1, 26),
(3, 26),
(4, 26),
(2, 27),
(3, 27),
(4, 27),
(4, 28),
(1, 29),
(2, 29),
(4, 29),
(1, 30),
(3, 30),
(1, 32),
(4, 32),
(2, 33),
(3, 33),
(4, 33),
(2, 34),
(3, 34),
(2, 35),
(1, 36),
(1, 37),
(3, 37),
(4, 37),
(3, 38),
(1, 39),
(3, 39),
(1, 40),
(2, 40),
(3, 41),
(3, 42),
(4, 42),
(1, 43),
(2, 43),
(3, 43),
(4, 43),
(1, 44),
(3, 44),
(1, 45),
(3, 45),
(1, 46),
(3, 46),
(4, 46),
(1, 47),
(2, 47),
(1, 49),
(3, 49),
(4, 49),
(2, 50),
(3, 50),
(4, 50),
(1, 51),
(3, 51),
(4, 51),
(1, 52),
(4, 52),
(3, 53),
(1, 54),
(2, 54),
(3, 54),
(2, 55),
(2, 56),
(4, 56),
(1, 57),
(2, 57),
(2, 58),
(3, 58),
(4, 58),
(2, 59),
(3, 59),
(4, 60),
(1, 61),
(4, 62),
(2, 63),
(4, 63),
(2, 64),
(3, 64),
(3, 65),
(4, 65),
(2, 66),
(3, 66);
