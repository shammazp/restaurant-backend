# Explore Posts API - SwiftUI Integration

Simple API documentation for integrating Explore Posts in your SwiftUI app.

## Base URL
```
http://localhost:3000/api/explore
```

---

## 📡 API Endpoints

### 1. Get All Posts
```
GET /api/explore?page=1&limit=20&active=true
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `active` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "status": "success",
  "data": {
    "posts": [...],
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

### 2. Get Single Post
```
GET /api/explore/:id
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "post": {...}
  }
}
```

---

## 📦 Data Models

### ExplorePost
```swift
struct ExplorePost: Codable, Identifiable {
    let id: String              // "_id" from API
    let title: String
    let description: String
    let postType: Int
    let listPosition: Int
    let media: [MediaItem]
    let contactInfo: ContactInfo?  // Optional - can be nil
    let isActive: Bool
    let views: Int
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case title, description, postType, listPosition
        case media, contactInfo, isActive, views
        case createdAt, updatedAt
    }
}
```

### MediaItem
```swift
struct MediaItem: Codable {
    let url: String
    let key: String
    let type: String           // "image" or "video"
    let position: Int
    let originalName: String?
    let size: Int?
    let uploadedAt: String?
}
```

### ContactInfo
```swift
struct ContactInfo: Codable {
    let type: String           // "contact" or "button"
    
    // For type: "contact"
    let mobile: String?
    let email: String?
    let website: String?
    let location: Location?
    
    // For type: "button"
    let buttonLabel: String?
    let buttonIcon: String?
    let buttonUrl: String?
}

struct Location: Codable {
    let latitude: Double
    let longitude: Double
}
```

---

## 🔌 Quick Network Call

```swift
// Get all posts
func fetchPosts() async throws -> [ExplorePost] {
    let url = URL(string: "http://localhost:3000/api/explore?active=true")!
    let (data, _) = try await URLSession.shared.data(from: url)
    let response = try JSONDecoder().decode(ExplorePostsResponse.self, from: data)
    return response.data.posts
}

// Response wrapper
struct ExplorePostsResponse: Codable {
    let status: String
    let data: ExplorePostsData
}

struct ExplorePostsData: Codable {
    let posts: [ExplorePost]
}
```

---

## 📝 Notes

- Replace `localhost:3000` with your server URL
- Media URLs are direct S3 links
- Views increment automatically when fetching single post
- Use `AsyncImage` for displaying images from URLs
- **contactInfo is optional** - Always check for nil before using: `if let contactInfo = post.contactInfo { ... }`

