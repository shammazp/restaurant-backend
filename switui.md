# SwiftUI Restaurant Explorer Integration Guide

## Overview
This documentation provides everything needed to integrate your SwiftUI iOS app with the Restaurant API backend to display restaurants in a Restaurant Explorer view.

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Get All Restaurants
```
GET /api/restaurants
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "_id": "68e038d3b1fdaa9dbf778712",
        "biz_id": "biz90004",
        "name": "Restaurant Name",
        "description": "Restaurant description",
        "logo": {
          "url": "https://kochione.s3.eu-north-1.amazonaws.com/restaurant-logos/biz90004_1759525340727_5a61lxvnwp.png",
          "key": "restaurant-logos/biz90004_1759525340727_5a61lxvnwp.png",
          "originalName": "logo.png",
          "size": 20502,
          "uploadedAt": "2025-10-03T21:02:22.747Z"
        },
        "coverImages": [
          {
            "url": "https://kochione.s3.eu-north-1.amazonaws.com/restaurant-logos/biz90004_cover1.jpg",
            "key": "restaurant-logos/biz90004_cover1.jpg",
            "originalName": "cover1.jpg",
            "size": 15420,
            "uploadedAt": "2025-10-03T21:02:22.747Z",
            "alt": "Restaurant cover image"
          }
        ],
        "address": {
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zipCode": "10001",
          "country": "USA"
        },
        "contact": {
          "phone": "555-123-4567",
          "email": "info@restaurant.com",
          "website": "https://restaurant.com"
        },
        "cuisine": ["Italian", "Mediterranean"],
        "features": ["Delivery", "Dine-in", "Outdoor Seating"],
        "isActive": true,
        "createdAt": "2025-10-03T21:02:22.747Z",
        "updatedAt": "2025-10-03T21:02:22.747Z"
      }
    ]
  }
}
```

### Get Single Restaurant
```
GET /api/restaurants/biz/{biz_id}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "restaurant": {
      // Same structure as above
    }
  }
}
```

## SwiftUI Data Models

### Restaurant Model
```swift
import Foundation

struct Restaurant: Codable, Identifiable {
    let id: String
    let bizId: String
    let name: String
    let description: String
    let logo: RestaurantImage?
    let coverImages: [RestaurantImage]
    let address: RestaurantAddress
    let contact: RestaurantContact
    let cuisine: [String]
    let features: [String]
    let isActive: Bool
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case bizId = "biz_id"
        case name, description, logo, coverImages, address, contact, cuisine, features, isActive, createdAt, updatedAt
    }
}

struct RestaurantImage: Codable {
    let url: String
    let key: String
    let originalName: String
    let size: Int
    let uploadedAt: String
    let alt: String?
}

struct RestaurantAddress: Codable {
    let street: String
    let city: String
    let state: String
    let zipCode: String
    let country: String
}

struct RestaurantContact: Codable {
    let phone: String
    let email: String
    let website: String?
}

struct RestaurantResponse: Codable {
    let status: String
    let data: RestaurantData
}

struct RestaurantData: Codable {
    let restaurants: [Restaurant]
}

struct SingleRestaurantResponse: Codable {
    let status: String
    let data: SingleRestaurantData
}

struct SingleRestaurantData: Codable {
    let restaurant: Restaurant
}
```

## API Service

### RestaurantService
```swift
import Foundation
import Combine

class RestaurantService: ObservableObject {
    private let baseURL = "http://localhost:3000/api"
    private var cancellables = Set<AnyCancellable>()
    
    @Published var restaurants: [Restaurant] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func fetchRestaurants() {
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "\(baseURL)/restaurants") else {
            errorMessage = "Invalid URL"
            isLoading = false
            return
        }
        
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: RestaurantResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    self?.restaurants = response.data.restaurants
                }
            )
            .store(in: &cancellables)
    }
    
    func fetchRestaurant(by bizId: String) -> AnyPublisher<Restaurant, Error> {
        guard let url = URL(string: "\(baseURL)/restaurants/biz/\(bizId)") else {
            return Fail(error: URLError(.badURL))
                .eraseToAnyPublisher()
        }
        
        return URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: SingleRestaurantResponse.self, decoder: JSONDecoder())
            .map(\.data.restaurant)
            .eraseToAnyPublisher()
    }
}
```

## SwiftUI Views

### Restaurant Explorer View
```swift
import SwiftUI

struct RestaurantExplorerView: View {
    @StateObject private var restaurantService = RestaurantService()
    @State private var searchText = ""
    @State private var selectedCuisine = "All"
    
    private let cuisineTypes = ["All", "Italian", "Chinese", "Mexican", "Indian", "Thai", "Japanese", "American", "Mediterranean", "French"]
    
    var filteredRestaurants: [Restaurant] {
        let restaurants = restaurantService.restaurants.filter { restaurant in
            restaurant.isActive
        }
        
        let searchFiltered = searchText.isEmpty ? restaurants : restaurants.filter { restaurant in
            restaurant.name.localizedCaseInsensitiveContains(searchText) ||
            restaurant.description.localizedCaseInsensitiveContains(searchText) ||
            restaurant.cuisine.contains { $0.localizedCaseInsensitiveContains(searchText) }
        }
        
        let cuisineFiltered = selectedCuisine == "All" ? searchFiltered : searchFiltered.filter { restaurant in
            restaurant.cuisine.contains(selectedCuisine)
        }
        
        return cuisineFiltered
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Search and Filter Section
                VStack(spacing: 12) {
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search restaurants...", text: $searchText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                    .padding(.horizontal)
                    
                    // Cuisine Filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(cuisineTypes, id: \.self) { cuisine in
                                Button(action: {
                                    selectedCuisine = cuisine
                                }) {
                                    Text(cuisine)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(selectedCuisine == cuisine ? Color.blue : Color.gray.opacity(0.2))
                                        .foregroundColor(selectedCuisine == cuisine ? .white : .primary)
                                        .cornerRadius(20)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical, 8)
                
                // Restaurant List
                if restaurantService.isLoading {
                    Spacer()
                    ProgressView("Loading restaurants...")
                    Spacer()
                } else if filteredRestaurants.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No restaurants found")
                            .font(.title2)
                            .foregroundColor(.gray)
                        if !searchText.isEmpty || selectedCuisine != "All" {
                            Text("Try adjusting your search or filters")
                                .foregroundColor(.gray)
                        }
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredRestaurants) { restaurant in
                                NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                                    RestaurantCardView(restaurant: restaurant)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Restaurant Explorer")
            .onAppear {
                restaurantService.fetchRestaurants()
            }
            .alert("Error", isPresented: .constant(restaurantService.errorMessage != nil)) {
                Button("OK") {
                    restaurantService.errorMessage = nil
                }
            } message: {
                Text(restaurantService.errorMessage ?? "")
            }
        }
    }
}
```

### Restaurant Card View
```swift
import SwiftUI

struct RestaurantCardView: View {
    let restaurant: Restaurant
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Cover Images
            if !restaurant.coverImages.isEmpty {
                TabView {
                    ForEach(restaurant.coverImages, id: \.url) { coverImage in
                        AsyncImage(url: URL(string: coverImage.url)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .overlay(
                                    ProgressView()
                                )
                        }
                        .frame(height: 200)
                        .clipped()
                    }
                }
                .tabViewStyle(PageTabViewStyle())
                .frame(height: 200)
            } else {
                // Placeholder if no cover images
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 200)
                    .overlay(
                        VStack {
                            Image(systemName: "photo")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("No images available")
                                .foregroundColor(.gray)
                        }
                    )
            }
            
            // Restaurant Info
            HStack(alignment: .top, spacing: 12) {
                // Logo
                if let logo = restaurant.logo {
                    AsyncImage(url: URL(string: logo.url)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle()
                            .fill(Color.gray.opacity(0.3))
                            .overlay(
                                Image(systemName: "building.2")
                                    .foregroundColor(.gray)
                            )
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 60, height: 60)
                        .overlay(
                            Image(systemName: "building.2")
                                .foregroundColor(.gray)
                        )
                }
                
                // Restaurant Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(restaurant.name)
                        .font(.headline)
                        .lineLimit(1)
                    
                    Text(restaurant.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    // Cuisine Tags
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(restaurant.cuisine, id: \.self) { cuisine in
                                Text(cuisine)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(8)
                            }
                        }
                    }
                    
                    // Features
                    HStack {
                        ForEach(restaurant.features.prefix(3), id: \.self) { feature in
                            HStack(spacing: 4) {
                                Image(systemName: featureIcon(for: feature))
                                    .font(.caption)
                                Text(feature)
                                    .font(.caption)
                            }
                            .foregroundColor(.secondary)
                        }
                        if restaurant.features.count > 3 {
                            Text("+\(restaurant.features.count - 3) more")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
    
    private func featureIcon(for feature: String) -> String {
        switch feature.lowercased() {
        case "delivery": return "truck"
        case "takeout": return "bag"
        case "dine-in": return "fork.knife"
        case "outdoor seating": return "leaf"
        case "parking": return "car"
        case "wifi": return "wifi"
        case "bar": return "wineglass"
        case "live music": return "music.note"
        case "private dining": return "person.2"
        default: return "star"
        }
    }
}
```

### Restaurant Detail View
```swift
import SwiftUI

struct RestaurantDetailView: View {
    let restaurant: Restaurant
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Cover Images
                if !restaurant.coverImages.isEmpty {
                    TabView {
                        ForEach(restaurant.coverImages, id: \.url) { coverImage in
                            AsyncImage(url: URL(string: coverImage.url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .overlay(
                                        ProgressView()
                                    )
                            }
                        }
                    }
                    .tabViewStyle(PageTabViewStyle())
                    .frame(height: 300)
                    .cornerRadius(12)
                }
                
                // Restaurant Header
                HStack(alignment: .top, spacing: 16) {
                    // Logo
                    if let logo = restaurant.logo {
                        AsyncImage(url: URL(string: logo.url)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Circle()
                                .fill(Color.gray.opacity(0.3))
                                .overlay(
                                    Image(systemName: "building.2")
                                        .foregroundColor(.gray)
                                )
                        }
                        .frame(width: 80, height: 80)
                        .clipShape(Circle())
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text(restaurant.name)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text(restaurant.description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                // Cuisine and Features
                VStack(alignment: .leading, spacing: 12) {
                    Text("Cuisine")
                        .font(.headline)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                        ForEach(restaurant.cuisine, id: \.self) { cuisine in
                            Text(cuisine)
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(8)
                        }
                    }
                }
                
                // Features
                VStack(alignment: .leading, spacing: 12) {
                    Text("Features")
                        .font(.headline)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                        ForEach(restaurant.features, id: \.self) { feature in
                            HStack {
                                Image(systemName: featureIcon(for: feature))
                                    .foregroundColor(.blue)
                                Text(feature)
                                    .font(.subheadline)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.05))
                            .cornerRadius(8)
                        }
                    }
                }
                
                // Contact Information
                VStack(alignment: .leading, spacing: 12) {
                    Text("Contact Information")
                        .font(.headline)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "phone")
                                .foregroundColor(.blue)
                            Text(restaurant.contact.phone)
                                .font(.subheadline)
                        }
                        
                        HStack {
                            Image(systemName: "envelope")
                                .foregroundColor(.blue)
                            Text(restaurant.contact.email)
                                .font(.subheadline)
                        }
                        
                        if let website = restaurant.contact.website {
                            HStack {
                                Image(systemName: "globe")
                                    .foregroundColor(.blue)
                                Link(website, destination: URL(string: website)!)
                                    .font(.subheadline)
                            }
                        }
                        
                        HStack {
                            Image(systemName: "location")
                                .foregroundColor(.blue)
                            Text("\(restaurant.address.street), \(restaurant.address.city), \(restaurant.address.state) \(restaurant.address.zipCode)")
                                .font(.subheadline)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle(restaurant.name)
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func featureIcon(for feature: String) -> String {
        switch feature.lowercased() {
        case "delivery": return "truck"
        case "takeout": return "bag"
        case "dine-in": return "fork.knife"
        case "outdoor seating": return "leaf"
        case "parking": return "car"
        case "wifi": return "wifi"
        case "bar": return "wineglass"
        case "live music": return "music.note"
        case "private dining": return "person.2"
        default: return "star"
        }
    }
}
```

## App Integration

### ContentView (Main App Entry)
```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        RestaurantExplorerView()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
```

## Key Features Implemented

### ✅ Restaurant Explorer
- **Search functionality** - Search by name, description, or cuisine
- **Filter by cuisine** - Horizontal scrollable filter chips
- **Restaurant cards** - Beautiful cards with cover images, logo, and details
- **Loading states** - Progress indicators and error handling
- **Empty states** - User-friendly messages when no results found

### ✅ Restaurant Details
- **Full restaurant information** - Complete details view
- **Image galleries** - Cover images with page indicators
- **Contact information** - Phone, email, website, address
- **Cuisine and features** - Organized display with icons
- **Navigation** - Seamless navigation between list and detail views

### ✅ Data Management
- **Real-time updates** - ObservableObject pattern for reactive UI
- **Error handling** - Comprehensive error states and user feedback
- **Image loading** - AsyncImage for efficient image loading
- **Caching** - Built-in URLSession caching for images

## Usage Instructions

1. **Add the models** to your SwiftUI project
2. **Add the RestaurantService** for API communication
3. **Add the views** (RestaurantExplorerView, RestaurantCardView, RestaurantDetailView)
4. **Update your ContentView** to use RestaurantExplorerView
5. **Ensure your backend is running** on `http://localhost:3000`
6. **Test the integration** by running your iOS app

## API Testing

You can test the API endpoints using curl:

```bash
# Get all restaurants
curl http://localhost:3000/api/restaurants

# Get specific restaurant
curl http://localhost:3000/api/restaurants/biz/biz90004
```

## Notes

- **Image URLs** are S3 URLs that should be publicly accessible
- **Error handling** is comprehensive with user-friendly messages
- **Performance** is optimized with lazy loading and efficient image handling
- **Accessibility** is built-in with proper semantic elements
- **Responsive design** works on all iOS device sizes

This implementation provides a complete restaurant explorer experience with modern SwiftUI patterns and best practices.
