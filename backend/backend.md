# Zed-Memes Backend Documentation

## Overview

The Zed-Memes backend is a RESTful API built in PHP, providing endpoints for user authentication, meme management, comments, reactions, and image uploads. The backend uses JWT-based authentication for protected routes and returns all responses in JSON format.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [API Endpoints](#api-endpoints)
    - [Auth](#auth)
    - [Memes](#memes)
    - [Comments](#comments)
    - [Reactions](#reactions)
    - [Upload](#upload)
3. [Database Structure](#database-structure)
4. [Error Handling](#error-handling)
5. [CORS & Headers](#cors--headers)
6. [Example Usage](#example-usage)

---

## Authentication & Authorization

- **JWT (JSON Web Token)** is used for authentication.
- After registration or login, the API returns a `token` which must be included in the `Authorization` header for protected endpoints.
- Format:  
  ```
  Authorization: Bearer <token>
  ```
- Tokens are valid for 24 hours.

---

## API Endpoints

### Auth

**Base URL:** `/backend/api/auth.php?action=<action>`

#### 1. Register

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

#### 2. Login

- **Method:** `POST`
- **Action:** `login`
- **Request Body (JSON):**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**  
  Same as registration.

#### 3. Verify Token

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

#### 4. Get Profile

- **Method:** `POST`
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

#### 5. Edit Profile

- **Method:** `POST`
- **Action:** `edit_profile`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body (JSON):**
  ```json
  {
    "username": "string (optional)",
    "email": "string (optional)",
    "bio": "string (optional)",
    "profile_picture": "url (optional)"
  }
  ```
- **Response:**  
  Standard success/error response.

#### 6. Delete Profile

- **Method:** `POST`
- **Action:** `delete_profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**  
  Standard success/error response.

---

### Memes

**Base URL:** `/backend/api/memes.php?action=<action>`

#### 1. Get Memes (Paginated)

- **Method:** `GET`
- **Action:** `get_memes`
- **Query Params:** `page`, `limit`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Memes retrieved successfully",
    "data": {
      "memes": [ ... ],
      "pagination": {
        "current_page": 1,
        "total_pages": 10,
        "total_items": 100,
        "items_per_page": 12
      }
    }
  }
  ```

#### 2. Get Meme Detail

- **Method:** `GET`
- **Action:** `get_meme_detail`
- **Query Params:** `meme_id`
- **Headers (optional):** `Authorization: Bearer <token>` (to get user reaction)
- **Response:**  
  Meme details, including user reaction if authenticated.

#### 3. Get Trending Memes

- **Method:** `GET`
- **Action:** `get_trending`
- **Response:**  
  List of trending memes.

#### 4. Search Memes

- **Method:** `GET`
- **Action:** `search_memes`
- **Query Params:** `query`
- **Response:**  
  List of memes matching the search.

#### 5. Filter Memes

- **Method:** `GET`
- **Action:** `filter_memes`
- **Query Params:** `category` (e.g., funny, gaming, animals, politics, other)
- **Response:**  
  List of memes in the category.

---

### Comments

**Base URL:** `/backend/api/comments.php`

#### 1. Get Comments

- **Method:** `GET`
- **Action:** `get_comments`
- **Query Params:** `meme_id`, `page`, `limit`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comments retrieved successfully",
    "data": {
      "comments": [ ... ],
      "pagination": { ... }
    }
  }
  ```

#### 2. Add Comment

- **Method:** `POST`
- **Form Data:**
  - `action=add_comment`
  - `meme_id`
  - `comment_text`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**  
  Newly created comment and updated comment count.

#### 3. Delete Comment

- **Method:** `POST`
- **Form Data:**
  - `action=delete_comment`
  - `comment_id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**  
  Updated comment count.

---

### Reactions

**Base URL:** `/backend/api/reactions.php`

#### 1. Add Reaction

- **Method:** `POST`
- **Form Data:**
  - `action=add_reaction`
  - `meme_id`
  - `reaction_type` (`like` or `dislike`)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**  
  Updated reaction counts.

#### 2. Remove Reaction

- **Method:** `POST`
- **Form Data:**
  - `action=remove_reaction`
  - `meme_id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**  
  Updated reaction counts.

---

### Upload

**Base URL:** `/backend/api/upload.php`

#### 1. Upload Meme

- **Method:** `POST`
- **Form Data (multipart/form-data):**
  - `title` (string, 3-100 chars)
  - `description` (optional, max 500 chars)
  - `category` (funny, gaming, animals, politics, other)
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

---

## Database Structure

- **users:** User accounts, profile info, admin/verified flags.
- **memes:** Meme posts, images, categories, author, stats.
- **reactions:** User reactions to memes (like, dislike, etc.).
- **comments:** Comments on memes, supports threading.
- **tags, meme_tags:** Tagging system for memes.
- **user_follows, user_favorites:** Social features.
- **notifications:** User notifications.
- **api_rate_limits:** API rate limiting.
- **system_settings:** Configurable backend settings.

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
curl -X POST "http://<host>/backend/api/auth.php?action=register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"TestPass123","confirm_password":"TestPass123"}'
```

**Login:**
```bash
curl -X POST "http://<host>/backend/api/auth.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

**Get Memes:**
```bash
curl -X GET "http://<host>/backend/api/memes.php?action=get_memes&page=1&limit=12"
```

**Upload Meme:**
```bash
curl -X POST "http://<host>/backend/api/upload.php" \
  -H "Authorization: Bearer <token>" \
  -F "title=My Meme" \
  -F "description=Funny meme" \
  -F "category=funny" \
  -F "meme_image=@/path/to/image.jpg"
```

---

## Notes for Frontend Developers

- Always check the `success` field in responses.
- Use the JWT token for all protected actions.
- For file uploads, use `multipart/form-data`.
- Pagination is supported for memes and comments.
- Categories and reaction types are validated on the backend. 