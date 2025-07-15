# Zed-Memes Backend API Documentation

## Overview

The Zed-Memes backend is a RESTful API built in PHP, providing endpoints for user authentication, meme management, reactions, voting, image uploads, and logging. The backend uses JWT-based authentication for protected routes and returns all responses in JSON format.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Memes](#memes)
3. [Reactions](#reactions)
4. [Votes](#votes)
5. [Upload](#upload)
6. [Logs](#logs)
7. [Error Handling](#error-handling)
8. [CORS & Headers](#cors--headers)

---

## Authentication

**Base URL:** `/backend/api/auth.php`

### 1. Register
- **Method:** `POST`
- **Action:** `register`
- **Request Body (JSON):**
  ```json
  {
    "username": "string (min 3 chars)",
    "email": "valid email",
    "password": "string (min 8 chars, upper, lower, number)",
    "confirm_password": "string (must match password)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "token": "JWT token",
      "user": {
        "id": 1,
        "username": "string",
        "email": "string"
      }
    }
  }
  ```
- **Errors:**
  - Missing/invalid fields, password mismatch, weak password, duplicate email/username, etc.

### 2. Login
- **Method:** `POST`
- **Action:** `login`
- **Request Body (JSON):**
  ```json
  {
    "identifier": "username or email",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "JWT token",
      "user": {
        "id": 1,
        "username": "string",
        "email": "string"
      }
    }
  }
  ```
- **Errors:**
  - Invalid credentials, missing fields, etc.

### 3. Verify Token
- **Method:** `POST`
- **Action:** `verify_token`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Token valid",
    "data": {
      "user_id": 1,
      "username": "string",
      "email": "string"
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token

### 4. Get Profile
- **Method:** `GET`
- **Action:** `profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Profile fetched",
    "data": {
      "user_id": 1,
      "username": "string",
      "email": "string",
      "profile_picture": "url or null",
      "bio": "string or null",
      "is_verified": false,
      "is_admin": false,
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token

### 5. Edit Profile
- **Method:** `PUT`
- **Action:** `edit_profile`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body (JSON):**
  ```json
  {
    "username": "string (optional)",
    "email": "string (optional)",
    "profile_picture_path": "url (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token, no valid fields

### 6. Delete Profile
- **Method:** `PUT`
- **Action:** `delete_profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Profile deleted successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token

---

## Memes

**Base URL:** `/backend/api/memes.php`

### 1. Get Memes (Relevant/Random)
- **Method:** `GET`
- **Action:** `get_memes` or `get_relevant`
- **Headers (optional):** `Authorization: Bearer <token>`
- **Query Params:**
  - `limit` (optional, default 12, max 20)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Relevant memes retrieved successfully",
    "data": [
      {
        "meme_id": 1,
        "user": { "user_id": 1, "username": "string", "email": "string" },
        "image_path": "url",
        "caption": "string",
        "uploaded_at": "datetime",
        "download_logs": [ ... ],
        "share_logs": [ ... ],
        "reactions": [ { "vote_type": "like", "count": 10 }, ... ],
        "votes": [ { "vote_type": "upvote", "count": 5 }, ... ]
      }
    ]
  }
  ```
- **Notes:**
  - If no token is provided, returns random memes.

### 2. Get Trending Memes
- **Method:** `GET`
- **Action:** `get_trending`
- **Query Params:**
  - `limit` (optional, default 12, max 20)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Trending memes retrieved successfully",
    "data": [ ... ]
  }
  ```

### 3. Search Memes
- **Method:** `GET`
- **Action:** `search_memes`
- **Query Params:**
  - `query` (required, min 2 chars)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Search completed successfully",
    "data": [
      {
        "meme_id": 1,
        "title": "string",
        "description": "string",
        "image_path": "url",
        "category": "string",
        "created_at": "datetime",
        "author": "string",
        "user_id": 1,
        "likes": 10,
        "dislikes": 2,
        "comments_count": 5
      }
    ]
  }
  ```
- **Errors:**
  - Missing/short query, etc.

### 4. Get User Uploads
- **Method:** `GET`
- **Action:** `get_user_uploads`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "User uploaded memes retrieved successfully",
    "data": [ ... ]
  }
  ```
- **Errors:**
  - No token, invalid/expired token

---

## Reactions

**Base URL:** `/backend/api/reactions.php`

### 1. Add Reaction
- **Method:** `POST`
- **Form Data:**
  - `action=add_reaction`
  - `meme_id` (int, required)
  - `reaction_type` (string, one of: like, love, haha, wow, sad, angry)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reaction updated successfully",
    "data": {
      "reactions": { "like": 10, "love": 2, ... },
      "user_reaction": "like" // or null if removed
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID/type

### 2. Remove Reaction
- **Method:** `POST`
- **Form Data:**
  - `action=remove_reaction`
  - `meme_id` (int, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reaction removed successfully",
    "data": {
      "reactions": { "like": 9, "love": 2, ... },
      "user_reaction": null
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID

---

## Votes

**Base URL:** `/backend/api/upvote.php`

### 1. Add Vote
- **Method:** `POST`
- **Form Data:**
  - `action=add_vote`
  - `meme_id` (int, required)
  - `vote_type` (string, one of: upvote, downvote)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "vote updated successfully",
    "data": {
      "upvotes": 10,
      "downvotes": 2,
      "user_vote": "upvote" // or null if removed
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID/type

### 2. Remove Vote
- **Method:** `POST`
- **Form Data:**
  - `action=remove_vote`
  - `meme_id` (int, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "vote removed successfully",
    "data": {
      "upvotes": 9,
      "downvotes": 2,
      "user_vote": null
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID

---

## Upload

**Base URL:** `/backend/api/upload.php`

### 1. Upload Meme
- **Method:** `POST`
- **Form Data (multipart/form-data):**
  - `caption` (string, optional, max 255 chars)
  - `meme_image` (file, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Meme uploaded successfully",
    "data": {
      "meme_id": 1,
      "image_path": "url",
      ...
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, missing/invalid file, caption too long

### 2. Upload Profile Picture
- **Method:** `POST`
- **Form Data (multipart/form-data):**
  - `action=upload_profile_picture`
  - `profile_picture` (file, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Profile picture uploaded successfully",
    "data": {
      "profile_picture_path": "url"
    }
  }
  ```
- **Errors:**
  - No token, invalid/expired token, missing/invalid file

### 3. Delete Meme
- **Method:** `POST`
- **Form Data:**
  - `action=delete_meme`
  - `meme_id` (int, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Meme deleted successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID

### 4. Delete Profile Picture
- **Method:** `POST`
- **Form Data:**
  - `action=delete_profile_picture`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Profile picture deleted successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token

---

## Logs

**Base URL:** `/backend/api/logs.php`

### 1. Add Download Log
- **Method:** `POST`
- **Form Data:**
  - `action=add_download_log`
  - `meme_id` (int, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Download log added successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID

### 2. Add Share Log
- **Method:** `POST`
- **Form Data:**
  - `action=add_share_log`
  - `meme_id` (int, required)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Share log added successfully"
  }
  ```
- **Errors:**
  - No token, invalid/expired token, invalid meme ID

---

## Error Handling

- All responses include a `success` boolean and a `message` string.
- On error, `success` is `false` and `message` describes the issue.
- HTTP status codes may not always reflect error state; always check the JSON response.

---

## CORS & Headers

- All endpoints support CORS (`Access-Control-Allow-Origin: *`).
- Always set `Content-Type: application/json` for JSON requests.
- For protected endpoints, include `Authorization: Bearer <token>`.

---

## Example Usage

**Register:**
```bash
curl -X POST "http://<host>/backend/api/auth.php" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"TestPass123","confirm_password":"TestPass123","action":"register"}'
```

**Login:**
```bash
curl -X POST "http://<host>/backend/api/auth.php" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"TestPass123","action":"login"}'
```

**Get Memes:**
```bash
curl -X GET "http://<host>/backend/api/memes.php?action=get_memes&limit=12"
```

**Upload Meme:**
```bash
curl -X POST "http://<host>/backend/api/upload.php" \
  -H "Authorization: Bearer <token>" \
  -F "caption=My Meme" \
  -F "meme_image=@/path/to/image.jpg"
```

---

## Notes for Frontend Developers

- Always check the `success` field in responses.
- Use the JWT token for all protected actions.
- For file uploads, use `multipart/form-data`.
- Pagination is supported for memes (see `limit` param).
- Categories and reaction types are validated on the backend.
- Comments API is currently **deprecated/removed**. 