<?php
// generate_sample_data.php
// Generates sample users, memes, votes, reactions, and logs, and appends SQL to database/schema/zed_memes.sql

$imagesDir = realpath(__DIR__ . '/../assets/images/') . '/';
$sqlFile = realpath(__DIR__ . '/../database/schema/zed_memes.sql');
if ($sqlFile === false) {
    echo "Could not resolve path to zed_memes.sql.\n";
    exit(1);
}
echo "Appending to: $sqlFile\n";

// 1. Generate users
$users = [
    ['username' => 'alice',   'email' => 'alice@example.com'],
    ['username' => 'bob',     'email' => 'bob@example.com'],
    ['username' => 'charlie', 'email' => 'charlie@example.com'],
    ['username' => 'diana',   'email' => 'diana@example.com'],
];

$password = 'password';
$userSql = "\n-- Sample users\nINSERT INTO users (username, email, password_hash) VALUES\n";
foreach ($users as $i => $user) {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $userSql .= sprintf("('%s', '%s', '%s')%s\n",
        $user['username'],
        $user['email'],
        $hash,
        $i < count($users) - 1 ? ',' : ';'
    );
}

// 2. Scan images and generate memes
$images = array_values(array_filter(scandir($imagesDir), function($f) use ($imagesDir) {
    return is_file($imagesDir . $f) && preg_match('/\.(jpg|jpeg|png|gif)$/i', $f);
}));

$memeSql = "\n-- Sample memes\nINSERT INTO memes (user_id, image_path, caption) VALUES\n";
$memes = [];
foreach ($images as $i => $img) {
    $userId = rand(1, count($users));
    $imagePath = 'assets/images/' . $img;
    $caption = preg_replace('/[-_]/', ' ', pathinfo($img, PATHINFO_FILENAME));
    $memeSql .= sprintf("(%d, '%s', '%s')%s\n",
        $userId,
        $imagePath,
        addslashes($caption),
        $i < count($images) - 1 ? ',' : ';'
    );
    $memes[] = ['meme_id' => $i + 1, 'user_id' => $userId];
}

// 3. Generate random votes, reactions, logs
$voteTypes = ['upvote', 'downvote'];
$reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

$voteSql = "\n-- Sample votes\nINSERT INTO user_meme_votes (user_id, meme_id, vote_type) VALUES\n";
$reactionSql = "\n-- Sample reactions\nINSERT INTO user_meme_reaction (user_id, meme_id, vote_type) VALUES\n";
$downloadSql = "\n-- Sample download logs\nINSERT INTO meme_download_log (user_id, meme_id) VALUES\n";
$shareSql = "\n-- Sample share logs\nINSERT INTO meme_share_log (user_id, meme_id) VALUES\n";

$voteRows = $reactionRows = $downloadRows = $shareRows = 0;
foreach ($memes as $meme) {
    foreach ($users as $uid => $user) {
        // Randomly add a vote
        if (rand(0, 1)) {
            $voteType = $voteTypes[array_rand($voteTypes)];
            $voteSql .= sprintf("(%d, %d, '%s'),\n", $uid + 1, $meme['meme_id'], $voteType);
            $voteRows++;
        }
        // Randomly add a reaction
        if (rand(0, 1)) {
            $reactionType = $reactionTypes[array_rand($reactionTypes)];
            $reactionSql .= sprintf("(%d, %d, '%s'),\n", $uid + 1, $meme['meme_id'], $reactionType);
            $reactionRows++;
        }
        // Randomly add a download log
        if (rand(0, 1)) {
            $downloadSql .= sprintf("(%d, %d),\n", $uid + 1, $meme['meme_id']);
            $downloadRows++;
        }
        // Randomly add a share log
        if (rand(0, 1)) {
            $shareSql .= sprintf("(%d, %d),\n", $uid + 1, $meme['meme_id']);
            $shareRows++;
        }
    }
}

// Remove trailing commas and add semicolons
if ($voteRows) $voteSql = rtrim($voteSql, ",\n") . ";\n";
else $voteSql = '';
if ($reactionRows) $reactionSql = rtrim($reactionSql, ",\n") . ";\n";
else $reactionSql = '';
if ($downloadRows) $downloadSql = rtrim($downloadSql, ",\n") . ";\n";
else $downloadSql = '';
if ($shareRows) $shareSql = rtrim($shareSql, ",\n") . ";\n";
else $shareSql = '';

// 4. Append to SQL file
$result = file_put_contents($sqlFile, $userSql . $memeSql . $voteSql . $reactionSql . $downloadSql . $shareSql, FILE_APPEND);
if ($result === false) {
    echo "Failed to append sample data to $sqlFile\n";
    exit(1);
}

echo "Sample data SQL appended to $sqlFile\n"; 