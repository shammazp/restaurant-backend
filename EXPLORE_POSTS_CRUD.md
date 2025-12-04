# Explore Posts CRUD API Documentation

Complete guide for Create, Read, Update, Delete operations for Explore Posts.

## Base URL
```
http://localhost:3000/api/explore
```

---

## 📖 READ Operations

### 1. Get All Explore Posts

**GET** `/api/explore`

Get a paginated list of all explore posts.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `active` (optional): Filter by active status (`true` or `false`)

#### Example Request
```bash
GET /api/explore?page=1&limit=10&active=true
```

#### Example Response
```json
{
  "status": "success",
  "data": {
    "posts": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "title": "Amazing Restaurant Experience",
        "description": "Check out this amazing place...",
        "postType": 1,
        "listPosition": 1,
        "media": [
          {
            "url": "https://kochione.s3.eu-north-1.amazonaws.com/explore-posts/image1.jpg",
            "key": "explore-posts/image1.jpg",
            "type": "image",
            "position": 1,
            "originalName": "photo.jpg",
            "size": 245678,
            "uploadedAt": "2024-01-15T10:30:00.000Z"
          }
        ],
        "contactInfo": {
          "type": "contact",
          "mobile": "+1234567890",
          "email": "contact@example.com",
          "website": "https://example.com",
          "location": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        },
        "isActive": true,
        "views": 150,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalPosts": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2. Get Single Explore Post by ID

**GET** `/api/explore/:id`

Get a specific explore post by its ID. Automatically increments the view count.

#### Example Request
```bash
GET /api/explore/65a1b2c3d4e5f6g7h8i9j0k1
```

#### Example Response
```json
{
  "status": "success",
  "data": {
    "post": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Amazing Restaurant Experience",
      "description": "Check out this amazing place...",
      "postType": 1,
      "listPosition": 1,
      "media": [...],
      "contactInfo": {...},
      "isActive": true,
      "views": 151,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## ✏️ CREATE Operation

### 3. Create New Explore Post

**POST** `/api/explore`

Create a new explore post with optional media files.

#### Headers
```
Content-Type: multipart/form-data
```

#### Form Data Fields

**Required:**
- `title` (string, max 200 chars): Post title
- `description` (string, max 2000 chars): Post description
- `contactInfo` (JSON string): Contact information object

**Optional:**
- `postType` (integer, min 1): Category type (default: 1)
- `listPosition` (integer, min 1): Position in list (default: 1)
- `mediaFiles` (file array): Images or videos (max 10 files)
  - Images: max 5MB each
  - Videos: max 50MB each

#### Contact Info Structure

**Option 1: Contact Information**
```json
{
  "type": "contact",
  "mobile": "+1234567890",
  "email": "contact@example.com",
  "website": "https://example.com",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```
*Note: At least one contact method (mobile, email, website, or location) is required*

**Option 2: Button**
```json
{
  "type": "button",
  "buttonLabel": "Learn More",
  "buttonIcon": "🔗",
  "buttonUrl": "https://example.com"
}
```
*Note: buttonLabel and buttonUrl are required*

#### Example Request (cURL)
```bash
curl -X POST http://localhost:3000/api/explore \
  -F "title=Amazing Restaurant" \
  -F "description=Check out this amazing place with great food" \
  -F "postType=1" \
  -F "listPosition=1" \
  -F 'contactInfo={"type":"contact","mobile":"+1234567890","email":"contact@example.com"}' \
  -F "mediaFiles=@image1.jpg" \
  -F "mediaFiles=@image2.jpg"
```

#### Example Request (JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('title', 'Amazing Restaurant');
formData.append('description', 'Check out this amazing place');
formData.append('postType', '1');
formData.append('listPosition', '1');
formData.append('contactInfo', JSON.stringify({
  type: 'contact',
  mobile: '+1234567890',
  email: 'contact@example.com',
  website: 'https://example.com'
}));

// Add media files
formData.append('mediaFiles', file1);
formData.append('mediaFiles', file2);

fetch('http://localhost:3000/api/explore', {
  method: 'POST',
  body: formData
});
```

#### Example Response
```json
{
  "status": "success",
  "message": "Explore post created successfully",
  "data": {
    "post": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Amazing Restaurant",
      "description": "Check out this amazing place",
      "postType": 1,
      "listPosition": 1,
      "media": [
        {
          "url": "https://kochione.s3.eu-north-1.amazonaws.com/explore-posts/image1.jpg",
          "key": "explore-posts/image1.jpg",
          "type": "image",
          "position": 1,
          "originalName": "image1.jpg",
          "size": 245678,
          "uploadedAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "contactInfo": {
        "type": "contact",
        "mobile": "+1234567890",
        "email": "contact@example.com",
        "website": "https://example.com"
      },
      "isActive": true,
      "views": 0,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### Error Response
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

---

## 🔄 UPDATE Operation

### 4. Update Explore Post

**PUT** `/api/explore/:id`

Update an existing explore post. All fields are optional - only provided fields will be updated.

#### Headers
```
Content-Type: multipart/form-data
```

#### Form Data Fields (All Optional)
- `title` (string): Updated title
- `description` (string): Updated description
- `postType` (integer): Updated post type
- `listPosition` (integer): Updated list position
- `contactInfo` (JSON string): Updated contact information
- `mediaFiles` (file array): New media files (replaces existing media)

#### Example Request
```bash
curl -X PUT http://localhost:3000/api/explore/65a1b2c3d4e5f6g7h8i9j0k1 \
  -F "title=Updated Title" \
  -F "description=Updated description" \
  -F 'contactInfo={"type":"button","buttonLabel":"Visit Now","buttonUrl":"https://example.com"}'
```

#### Example Response
```json
{
  "status": "success",
  "message": "Explore post updated successfully",
  "data": {
    "post": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Updated Title",
      "description": "Updated description",
      ...
    }
  }
}
```

**Note:** When updating media, old media files are automatically deleted from S3 and replaced with new ones.

---

## 🗑️ DELETE Operation

### 5. Delete Explore Post (Soft Delete)

**DELETE** `/api/explore/:id`

Soft deletes an explore post by setting `isActive` to `false`. Also deletes all associated media files from S3.

#### Example Request
```bash
curl -X DELETE http://localhost:3000/api/explore/65a1b2c3d4e5f6g7h8i9j0k1
```

#### Example Response
```json
{
  "status": "success",
  "message": "Explore post deleted successfully"
}
```

**Note:** This is a soft delete - the post is not permanently removed from the database, just marked as inactive.

---

## 🔀 Additional Operations

### 6. Toggle Post Active Status

**PATCH** `/api/explore/:id/toggle`

Toggle the active status of an explore post (activate/deactivate).

#### Example Request
```bash
curl -X PATCH http://localhost:3000/api/explore/65a1b2c3d4e5f6g7h8i9j0k1/toggle
```

#### Example Response
```json
{
  "status": "success",
  "message": "Explore post activated successfully",
  "data": {
    "post": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "isActive": true,
      ...
    }
  }
}
```

---

## 📋 Data Model

### Explore Post Schema

```javascript
{
  title: String (required, max 200 chars),
  description: String (required, max 2000 chars),
  postType: Number (required, min 1, default: 1),
  listPosition: Number (required, min 1, default: 1),
  media: [{
    url: String (required),
    key: String (required),
    type: String (required, enum: ['image', 'video']),
    position: Number (required, min 1),
    originalName: String,
    size: Number,
    uploadedAt: Date
  }],
  contactInfo: {
    type: String (required, enum: ['contact', 'button']),
    // For type: 'contact'
    mobile: String,
    email: String,
    website: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    // For type: 'button'
    buttonLabel: String,
    buttonIcon: String,
    buttonUrl: String
  },
  isActive: Boolean (default: true),
  views: Number (default: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## 🎯 Use Cases

### Create Post with Contact Info
```javascript
const formData = new FormData();
formData.append('title', 'New Restaurant Opening');
formData.append('description', 'Grand opening this weekend!');
formData.append('postType', '1');
formData.append('listPosition', '1');
formData.append('contactInfo', JSON.stringify({
  type: 'contact',
  mobile: '+1234567890',
  email: 'info@restaurant.com',
  website: 'https://restaurant.com',
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  }
}));
formData.append('mediaFiles', imageFile);
```

### Create Post with Button
```javascript
const formData = new FormData();
formData.append('title', 'Special Offer');
formData.append('description', 'Limited time offer!');
formData.append('contactInfo', JSON.stringify({
  type: 'button',
  buttonLabel: 'Claim Offer',
  buttonIcon: '🎁',
  buttonUrl: 'https://restaurant.com/offer'
}));
formData.append('mediaFiles', imageFile);
```

### Update Only Title
```javascript
const formData = new FormData();
formData.append('title', 'Updated Title');

fetch('/api/explore/POST_ID', {
  method: 'PUT',
  body: formData
});
```

---

## ⚠️ Error Codes

- `400` - Bad Request (validation errors, missing required fields)
- `404` - Not Found (post doesn't exist)
- `500` - Internal Server Error (server/database errors)

---

## 📝 Notes

1. **Media Files:**
   - Maximum 10 files per post
   - Images: max 5MB each
   - Videos: max 50MB each
   - Supported formats: JPEG, PNG, WebP, MP4, QuickTime, WebM

2. **Contact Info:**
   - For `contact` type: At least one method (mobile, email, website, or location) must be provided
   - For `button` type: Both `buttonLabel` and `buttonUrl` are required
   - `buttonUrl` must be a valid HTTP/HTTPS URL

3. **Soft Delete:**
   - Posts are not permanently deleted
   - Media files are deleted from S3
   - Post is marked as `isActive: false`

4. **Views:**
   - Automatically incremented when a post is fetched by ID
   - Not incremented when fetching the list

5. **Media Replacement:**
   - When updating media, all old media files are deleted from S3
   - New media files replace all existing media

