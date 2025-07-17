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
('alice', 'alice@example.com', '$2y$10$0lMNiTDRM24I0t2EQiEjbupiMgsiirbegQRXpY5u3RxHd15tqFwkS'),
('bob', 'bob@example.com', '$2y$10$qqomWwnLOuRTseov7J18r.frNRgO/7YLj9Z5wfkhcvyC43gBgpVp6'),
('charlie', 'charlie@example.com', '$2y$10$XcUPKatpwlzrSMMr29BoSufBSyNrxBIDrC6mtxL4lODXEVpTJfWEq'),
('diana', 'diana@example.com', '$2y$10$h920N754kpUccgCRxvqJ/ukbkEh5CasJyzGTAZaa3Q5s36bwfwPAe');

-- Sample memes
INSERT INTO memes (user_id, image_path, caption) VALUES
(4, 'assets/images/At-Nandos-Lol.jpg', 'At Nandos Lol'),
(4, 'assets/images/Being-poor-you-say-yes-to-anything.jpg', 'Being poor you say yes to anything'),
(4, 'assets/images/Damn-the-goat-on-some-fly-shit.jpg', 'Damn the goat on some fly shit'),
(1, 'assets/images/Eh-ma-inglishes-nayo.jpg', 'Eh ma inglishes nayo'),
(3, 'assets/images/God-is-the-greatest.jpg', 'God is the greatest'),
(2, 'assets/images/Hard-on-this-money-shit-bro.jpg', 'Hard on this money shit bro'),
(1, 'assets/images/Life-Is-a-gamble.jpg', 'Life Is a gamble'),
(4, 'assets/images/No off days my nigga.jpg', 'No off days my nigga'),
(2, 'assets/images/Remontada.jpg', 'Remontada'),
(3, 'assets/images/Teine-Best-Student-mayo.jpg', 'Teine Best Student mayo'),
(1, 'assets/images/They-Gonna-call-you-crazy.jpg', 'They Gonna call you crazy'),
(1, 'assets/images/a.jpg', 'a'),
(2, 'assets/images/aura.jpg', 'aura'),
(4, 'assets/images/ba-guy-vopatikiza.jpg', 'ba guy vopatikiza'),
(3, 'assets/images/better-fye.jpg', 'better fye'),
(4, 'assets/images/called-the-gang-lets-go-chilling.jpg', 'called the gang lets go chilling'),
(4, 'assets/images/current-situation.jpg', 'current situation'),
(1, 'assets/images/does-it.jpg', 'does it'),
(2, 'assets/images/dont-tell-me-what-to-do.jpg', 'dont tell me what to do'),
(2, 'assets/images/fima-koko-wetata.jpg', 'fima koko wetata'),
(1, 'assets/images/first-year-inipasa-chizwezwe.jpg', 'first year inipasa chizwezwe'),
(3, 'assets/images/give-us-our-daily-bread.jpg', 'give us our daily bread'),
(3, 'assets/images/how-you-get-treated-after-failing.jpg', 'how you get treated after failing'),
(4, 'assets/images/i-cant-even-remember-the-last-time-i-was-tired.jpg', 'i cant even remember the last time i was tired'),
(1, 'assets/images/i-cant-trust-my-guys.jpg', 'i cant trust my guys'),
(2, 'assets/images/i-need-this-paper.jpg', 'i need this paper'),
(2, 'assets/images/imagine-ba-guy-aii.jpg', 'imagine ba guy aii'),
(1, 'assets/images/in-other-words-i-am-him.jpg', 'in other words i am him'),
(3, 'assets/images/kaili.jpg', 'kaili'),
(1, 'assets/images/kukumyanga.jpg', 'kukumyanga'),
(3, 'assets/images/lassst.jpg', 'lassst'),
(3, 'assets/images/ma-kale-bwangu.jpg', 'ma kale bwangu'),
(4, 'assets/images/me-with-bae.jpg', 'me with bae'),
(4, 'assets/images/me-with-the-gang.jpg', 'me with the gang'),
(3, 'assets/images/minister-of-enjoyment.jpg', 'minister of enjoyment'),
(3, 'assets/images/mupeleni-bra-uyo-cinderella.jpg', 'mupeleni bra uyo cinderella'),
(4, 'assets/images/my-problem.jpg', 'my problem'),
(4, 'assets/images/naikosa.jpg', 'naikosa'),
(1, 'assets/images/ndekweba.jpg', 'ndekweba'),
(4, 'assets/images/ndepishamo-pen.jpg', 'ndepishamo pen'),
(1, 'assets/images/never.jpg', 'never'),
(1, 'assets/images/niggas-be-dating-anything.jpg', 'niggas be dating anything'),
(2, 'assets/images/ninkaba.jpg', 'ninkaba'),
(1, 'assets/images/nzelu-no-bwino-bwino.jpg', 'nzelu no bwino bwino'),
(3, 'assets/images/outside-i-dont-encourage.jpg', 'outside i dont encourage'),
(2, 'assets/images/palapya-at-this-point.jpg', 'palapya at this point'),
(4, 'assets/images/real-madrid-at-it.jpg', 'real madrid at it'),
(4, 'assets/images/sharp-bine-anyone-lol.jpg', 'sharp bine anyone lol'),
(2, 'assets/images/she-will-leave-you-with-your-muscles.jpg', 'she will leave you with your muscles'),
(2, 'assets/images/so-inspiring-ndekweba.jpg', 'so inspiring ndekweba'),
(2, 'assets/images/soft-life-nayo.jpg', 'soft life nayo'),
(4, 'assets/images/tabesha.jpg', 'tabesha'),
(3, 'assets/images/talk-to-me-nicely.jpg', 'talk to me nicely'),
(3, 'assets/images/tapali-efyo-wingalanda.jpg', 'tapali efyo wingalanda'),
(2, 'assets/images/there-will-be-signs.jpg', 'there will be signs'),
(1, 'assets/images/they-scammed-us.jpg', 'they scammed us'),
(2, 'assets/images/this-july-lol.jpg', 'this july lol'),
(3, 'assets/images/tu-gelo-nato.jpg', 'tu gelo nato'),
(3, 'assets/images/tuma-small-boys.jpg', 'tuma small boys'),
(1, 'assets/images/vizingu-sivatu.jpg', 'vizingu sivatu'),
(3, 'assets/images/waulesi-asadye.jpg', 'waulesi asadye'),
(4, 'assets/images/when-the-prize-isnt-prizing.jpg', 'when the prize isnt prizing'),
(2, 'assets/images/when-you-didnt-work-hard-in-yo-20s.jpg', 'when you didnt work hard in yo 20s'),
(3, 'assets/images/work-hard-untill-they-ask-for-a-photo-lol.jpg', 'work hard untill they ask for a photo lol'),
(4, 'assets/images/yalikaba-wetata.jpg', 'yalikaba wetata'),
(1, 'assets/images/yes.jpg', 'yes'),
(2, 'assets/images/yo-hustling-husband.jpg', 'yo hustling husband');

-- Sample votes
INSERT INTO user_meme_votes (user_id, meme_id, vote_type) VALUES
(1, 1, 'upvote'),
(2, 1, 'upvote'),
(4, 1, 'downvote'),
(2, 2, 'downvote'),
(4, 2, 'downvote'),
(1, 3, 'upvote'),
(4, 3, 'upvote'),
(4, 4, 'upvote'),
(1, 5, 'downvote'),
(3, 5, 'upvote'),
(2, 6, 'upvote'),
(1, 7, 'downvote'),
(3, 8, 'upvote'),
(4, 8, 'downvote'),
(1, 9, 'downvote'),
(2, 10, 'upvote'),
(4, 10, 'upvote'),
(1, 11, 'upvote'),
(2, 11, 'downvote'),
(4, 11, 'downvote'),
(1, 12, 'upvote'),
(2, 13, 'upvote'),
(4, 13, 'downvote'),
(3, 14, 'upvote'),
(4, 14, 'downvote'),
(1, 15, 'downvote'),
(2, 15, 'upvote'),
(1, 16, 'upvote'),
(3, 16, 'upvote'),
(4, 16, 'downvote'),
(1, 17, 'downvote'),
(2, 17, 'upvote'),
(2, 18, 'upvote'),
(3, 18, 'downvote'),
(2, 19, 'upvote'),
(4, 20, 'upvote'),
(2, 21, 'downvote'),
(3, 21, 'downvote'),
(4, 21, 'downvote'),
(1, 22, 'upvote'),
(3, 23, 'downvote'),
(4, 23, 'downvote'),
(1, 24, 'upvote'),
(4, 24, 'upvote'),
(2, 25, 'downvote'),
(3, 25, 'upvote'),
(4, 25, 'downvote'),
(2, 26, 'upvote'),
(2, 28, 'upvote'),
(2, 29, 'upvote'),
(2, 30, 'downvote'),
(4, 30, 'downvote'),
(2, 31, 'upvote'),
(1, 32, 'upvote'),
(2, 32, 'upvote'),
(4, 32, 'upvote'),
(1, 34, 'upvote'),
(2, 34, 'downvote'),
(4, 35, 'upvote'),
(1, 36, 'upvote'),
(2, 36, 'upvote'),
(4, 36, 'downvote'),
(2, 37, 'upvote'),
(3, 37, 'upvote'),
(1, 38, 'upvote'),
(4, 38, 'downvote'),
(3, 39, 'downvote'),
(3, 40, 'upvote'),
(4, 40, 'downvote'),
(3, 41, 'upvote'),
(4, 41, 'upvote'),
(1, 42, 'downvote'),
(3, 42, 'upvote'),
(1, 43, 'upvote'),
(4, 43, 'downvote'),
(2, 44, 'downvote'),
(2, 45, 'upvote'),
(3, 45, 'upvote'),
(3, 46, 'upvote'),
(4, 46, 'downvote'),
(1, 47, 'upvote'),
(3, 47, 'downvote'),
(4, 47, 'upvote'),
(1, 48, 'upvote'),
(2, 48, 'downvote'),
(2, 49, 'downvote'),
(3, 49, 'upvote'),
(2, 50, 'upvote'),
(3, 50, 'upvote'),
(4, 50, 'upvote'),
(4, 51, 'downvote'),
(1, 52, 'downvote'),
(3, 53, 'downvote'),
(1, 54, 'downvote'),
(2, 55, 'downvote'),
(3, 55, 'downvote'),
(4, 55, 'upvote'),
(2, 56, 'downvote'),
(3, 56, 'downvote'),
(1, 57, 'downvote'),
(2, 57, 'upvote'),
(1, 58, 'upvote'),
(2, 58, 'downvote'),
(3, 59, 'downvote'),
(1, 60, 'upvote'),
(4, 60, 'downvote'),
(1, 61, 'upvote'),
(3, 61, 'downvote'),
(1, 62, 'upvote'),
(4, 62, 'upvote'),
(3, 63, 'downvote'),
(4, 63, 'downvote'),
(3, 64, 'upvote'),
(4, 64, 'downvote'),
(1, 66, 'downvote'),
(2, 67, 'downvote');

-- Sample reactions
INSERT INTO user_meme_reaction (user_id, meme_id, vote_type) VALUES
(1, 1, 'love'),
(2, 1, 'love'),
(1, 2, 'angry'),
(2, 2, 'wow'),
(1, 3, 'love'),
(2, 3, 'wow'),
(3, 3, 'love'),
(1, 4, 'like'),
(3, 4, 'angry'),
(1, 5, 'like'),
(2, 5, 'love'),
(3, 5, 'like'),
(4, 5, 'haha'),
(2, 6, 'like'),
(3, 6, 'angry'),
(2, 7, 'love'),
(3, 7, 'haha'),
(4, 7, 'like'),
(1, 8, 'love'),
(3, 8, 'haha'),
(1, 9, 'sad'),
(2, 9, 'sad'),
(3, 9, 'angry'),
(1, 10, 'haha'),
(2, 11, 'like'),
(3, 11, 'angry'),
(1, 12, 'wow'),
(3, 12, 'haha'),
(4, 12, 'haha'),
(4, 13, 'haha'),
(1, 14, 'like'),
(3, 14, 'sad'),
(1, 15, 'sad'),
(3, 15, 'haha'),
(4, 15, 'like'),
(2, 16, 'angry'),
(4, 16, 'like'),
(1, 17, 'sad'),
(2, 17, 'like'),
(3, 17, 'haha'),
(3, 18, 'sad'),
(3, 19, 'like'),
(2, 20, 'sad'),
(4, 20, 'like'),
(2, 21, 'haha'),
(4, 21, 'wow'),
(3, 22, 'like'),
(4, 22, 'love'),
(1, 23, 'haha'),
(2, 23, 'haha'),
(3, 23, 'angry'),
(4, 23, 'haha'),
(3, 24, 'haha'),
(1, 25, 'wow'),
(2, 25, 'sad'),
(3, 25, 'wow'),
(1, 26, 'sad'),
(2, 26, 'angry'),
(3, 26, 'like'),
(4, 26, 'wow'),
(1, 27, 'haha'),
(4, 27, 'sad'),
(3, 28, 'angry'),
(4, 28, 'like'),
(2, 29, 'sad'),
(3, 29, 'haha'),
(4, 29, 'angry'),
(2, 30, 'like'),
(3, 31, 'haha'),
(4, 31, 'love'),
(1, 32, 'love'),
(3, 32, 'like'),
(4, 32, 'angry'),
(2, 33, 'love'),
(1, 34, 'wow'),
(2, 34, 'sad'),
(1, 35, 'sad'),
(2, 35, 'angry'),
(1, 36, 'like'),
(2, 36, 'angry'),
(3, 36, 'like'),
(1, 37, 'like'),
(4, 37, 'like'),
(1, 38, 'angry'),
(2, 38, 'angry'),
(4, 38, 'angry'),
(1, 39, 'haha'),
(3, 39, 'wow'),
(4, 39, 'love'),
(1, 40, 'like'),
(2, 40, 'sad'),
(3, 40, 'sad'),
(3, 41, 'angry'),
(4, 41, 'haha'),
(2, 42, 'wow'),
(1, 43, 'angry'),
(4, 43, 'angry'),
(1, 44, 'love'),
(2, 44, 'like'),
(3, 44, 'sad'),
(2, 45, 'like'),
(3, 45, 'haha'),
(3, 46, 'love'),
(2, 47, 'like'),
(3, 47, 'love'),
(4, 47, 'wow'),
(1, 48, 'love'),
(3, 48, 'love'),
(3, 49, 'haha'),
(4, 49, 'haha'),
(2, 51, 'angry'),
(4, 51, 'sad'),
(1, 52, 'angry'),
(2, 52, 'sad'),
(4, 52, 'haha'),
(2, 53, 'haha'),
(4, 55, 'haha'),
(1, 56, 'wow'),
(3, 56, 'sad'),
(2, 57, 'angry'),
(3, 58, 'sad'),
(1, 59, 'sad'),
(3, 61, 'wow'),
(1, 62, 'angry'),
(2, 62, 'like'),
(4, 62, 'haha'),
(1, 64, 'angry'),
(2, 64, 'wow'),
(3, 64, 'haha'),
(4, 64, 'haha'),
(1, 65, 'haha'),
(1, 66, 'like'),
(3, 66, 'like'),
(2, 67, 'sad'),
(3, 67, 'wow');

-- Sample download logs
INSERT INTO meme_download_log (user_id, meme_id) VALUES
(1, 1),
(4, 1),
(1, 2),
(4, 2),
(2, 3),
(1, 4),
(2, 4),
(4, 4),
(3, 5),
(2, 6),
(2, 7),
(4, 7),
(2, 8),
(3, 8),
(1, 9),
(2, 9),
(3, 9),
(4, 9),
(1, 10),
(2, 10),
(3, 10),
(2, 11),
(3, 11),
(4, 11),
(1, 12),
(3, 12),
(4, 12),
(1, 13),
(2, 13),
(3, 13),
(1, 14),
(2, 14),
(4, 14),
(3, 15),
(4, 15),
(1, 16),
(3, 16),
(1, 17),
(2, 17),
(4, 17),
(2, 18),
(1, 19),
(3, 19),
(1, 20),
(2, 20),
(3, 21),
(3, 22),
(1, 23),
(1, 24),
(3, 24),
(4, 24),
(3, 25),
(3, 26),
(1, 27),
(2, 27),
(3, 27),
(4, 27),
(1, 28),
(2, 28),
(4, 29),
(1, 31),
(2, 31),
(3, 31),
(1, 32),
(3, 32),
(2, 33),
(1, 34),
(2, 34),
(3, 34),
(4, 34),
(1, 37),
(2, 37),
(1, 38),
(3, 38),
(1, 40),
(3, 40),
(3, 41),
(3, 42),
(4, 42),
(2, 43),
(3, 43),
(4, 43),
(2, 44),
(3, 44),
(4, 44),
(2, 45),
(4, 45),
(2, 46),
(3, 46),
(2, 47),
(3, 47),
(1, 49),
(2, 49),
(1, 50),
(3, 50),
(1, 51),
(3, 51),
(1, 52),
(2, 52),
(3, 52),
(1, 53),
(2, 53),
(3, 53),
(4, 53),
(3, 54),
(3, 56),
(4, 56),
(1, 57),
(3, 57),
(4, 57),
(2, 58),
(3, 58),
(1, 59),
(2, 59),
(3, 59),
(4, 59),
(1, 60),
(4, 60),
(1, 61),
(2, 61),
(3, 61),
(4, 61),
(1, 63),
(2, 64),
(3, 64),
(4, 64),
(4, 65),
(1, 66),
(3, 66),
(4, 66),
(3, 67);

-- Sample share logs
INSERT INTO meme_share_log (user_id, meme_id) VALUES
(1, 1),
(3, 1),
(4, 1),
(3, 2),
(2, 3),
(3, 3),
(2, 4),
(4, 5),
(1, 6),
(4, 6),
(1, 7),
(3, 7),
(4, 7),
(1, 8),
(2, 8),
(3, 8),
(4, 8),
(1, 9),
(2, 9),
(4, 9),
(3, 10),
(1, 11),
(2, 11),
(4, 11),
(2, 12),
(3, 13),
(4, 13),
(1, 14),
(2, 14),
(1, 15),
(2, 15),
(4, 15),
(1, 16),
(2, 16),
(1, 17),
(2, 17),
(3, 17),
(4, 17),
(1, 18),
(3, 18),
(4, 18),
(1, 19),
(3, 19),
(4, 19),
(1, 20),
(2, 20),
(3, 21),
(4, 21),
(2, 22),
(3, 23),
(1, 24),
(3, 24),
(1, 26),
(4, 26),
(2, 27),
(3, 27),
(1, 28),
(3, 28),
(2, 29),
(4, 29),
(1, 30),
(2, 30),
(1, 31),
(2, 31),
(3, 31),
(4, 31),
(1, 32),
(4, 32),
(1, 33),
(4, 33),
(1, 34),
(2, 34),
(1, 35),
(2, 35),
(4, 35),
(2, 36),
(3, 36),
(1, 37),
(2, 37),
(2, 38),
(1, 39),
(2, 39),
(4, 39),
(1, 40),
(2, 40),
(3, 40),
(1, 41),
(4, 41),
(2, 42),
(2, 43),
(4, 43),
(2, 44),
(3, 44),
(2, 45),
(3, 45),
(4, 45),
(2, 47),
(4, 47),
(1, 48),
(3, 48),
(4, 48),
(2, 49),
(1, 50),
(2, 50),
(3, 50),
(4, 50),
(1, 51),
(2, 51),
(3, 51),
(4, 51),
(4, 53),
(1, 54),
(2, 54),
(3, 54),
(1, 55),
(4, 55),
(2, 56),
(1, 57),
(2, 57),
(4, 57),
(1, 58),
(2, 58),
(3, 58),
(1, 60),
(2, 60),
(2, 61),
(4, 61),
(1, 62),
(2, 62),
(1, 63),
(2, 63),
(2, 65),
(3, 65),
(1, 66),
(2, 66),
(3, 66),
(1, 67),
(2, 67),
(4, 67);
