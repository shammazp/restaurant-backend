# SwiftUI Explore Posts API - Update Guide

## 🔄 Recent Changes

The `contactInfo` field in Explore Posts is now **optional**. You can create posts without contact information.

---

## 📦 Updated Data Models

### ContactInfo (Now Optional)

```swift
// ContactInfo is now optional in ExplorePost
struct ExplorePost: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let postType: Int
    let listPosition: Int
    let media: [MediaItem]
    let contactInfo: ContactInfo?  // ✅ Now optional
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

### ContactInfo Structure (Unchanged)

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

## 🔧 Required Code Updates

### 1. Update Your ExplorePost Model

Change `contactInfo` from required to optional:

```swift
// Before
let contactInfo: ContactInfo

// After
let contactInfo: ContactInfo?  // ✅ Add the ?
```

### 2. Update UI Code to Handle Optional ContactInfo

**Before:**
```swift
// This will crash if contactInfo is nil
ContactInfoView(contactInfo: post.contactInfo)
```

**After:**
```swift
// Safely handle optional contactInfo
if let contactInfo = post.contactInfo {
    ContactInfoView(contactInfo: contactInfo)
} else {
    // Show nothing or a placeholder
    Text("No contact information")
        .font(.caption)
        .foregroundColor(.secondary)
}
```

### 3. Update ContactInfoView Usage

```swift
struct ExplorePostCard: View {
    let post: ExplorePost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // ... other content ...
            
            // Contact Info (optional)
            if let contactInfo = post.contactInfo {
                ContactInfoView(contactInfo: contactInfo)
            }
            
            // ... rest of content ...
        }
    }
}
```

---

## 📝 Complete Updated Example

### Updated ExplorePost Model

```swift
import Foundation

struct ExplorePost: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let postType: Int
    let listPosition: Int
    let media: [MediaItem]
    let contactInfo: ContactInfo?  // ✅ Optional
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

struct MediaItem: Codable, Identifiable {
    let id = UUID()
    let url: String
    let key: String
    let type: String
    let position: Int
    let originalName: String?
    let size: Int?
    let uploadedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case url, key, type, position, originalName, size, uploadedAt
    }
}

struct ContactInfo: Codable {
    let type: String
    let mobile: String?
    let email: String?
    let website: String?
    let location: Location?
    let buttonLabel: String?
    let buttonIcon: String?
    let buttonUrl: String?
}

struct Location: Codable {
    let latitude: Double
    let longitude: Double
}
```

### Updated View Example

```swift
import SwiftUI

struct ExplorePostCard: View {
    let post: ExplorePost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Media Gallery
            if !post.media.isEmpty {
                // ... media display code ...
            }
            
            // Title
            Text(post.title)
                .font(.headline)
            
            // Description
            Text(post.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            // Contact Info (Optional)
            if let contactInfo = post.contactInfo {
                ContactInfoView(contactInfo: contactInfo)
            } else {
                // Optional: Show placeholder or nothing
                EmptyView()
            }
            
            // Footer
            HStack {
                Label("\(post.views) views", systemImage: "eye")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(post.createdAt.prefix(10))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

---

## ✅ Migration Checklist

- [ ] Update `ExplorePost` model: Change `contactInfo: ContactInfo` to `contactInfo: ContactInfo?`
- [ ] Update all views that use `post.contactInfo` to handle optional with `if let`
- [ ] Test creating posts without contact info
- [ ] Test displaying posts without contact info
- [ ] Update any API calls that assume contactInfo exists

---

## 🎯 Key Points

1. **contactInfo is now optional** - Posts can exist without contact information
2. **Always check for nil** - Use `if let` or `guard let` when accessing contactInfo
3. **Backward compatible** - Existing posts with contactInfo will still work
4. **API unchanged** - The API endpoints remain the same, just contactInfo is optional in the response

---

## 📱 Example: Handling Optional ContactInfo

```swift
// Safe unwrapping
if let contact = post.contactInfo {
    switch contact.type {
    case "contact":
        if let mobile = contact.mobile {
            Text(mobile)
        }
        if let email = contact.email {
            Text(email)
        }
    case "button":
        if let label = contact.buttonLabel,
           let url = contact.buttonUrl {
            Link(label, destination: URL(string: url)!)
        }
    default:
        EmptyView()
    }
}
```

---

## 🔄 API Response Examples

### Post WITH Contact Info
```json
{
  "id": "123",
  "title": "Amazing Restaurant",
  "description": "Great food!",
  "contactInfo": {
    "type": "contact",
    "mobile": "+1234567890",
    "email": "info@restaurant.com"
  }
}
```

### Post WITHOUT Contact Info (New)
```json
{
  "id": "124",
  "title": "New Post",
  "description": "No contact info",
  "contactInfo": null
}
```

---

That's it! Just make `contactInfo` optional in your Swift models and handle it safely in your UI. 🎉

