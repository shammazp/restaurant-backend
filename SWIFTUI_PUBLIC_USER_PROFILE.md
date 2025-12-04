# SwiftUI Public User Profile Implementation Guide

Complete implementation guide for managing public user profiles in SwiftUI with device ID authentication.

## Table of Contents
1. [Data Models](#data-models)
2. [Network Service](#network-service)
3. [View Models](#view-models)
4. [SwiftUI Views](#swiftui-views)
5. [Image Upload Handling](#image-upload-handling)
6. [Complete Example](#complete-example)

---

## Data Models

### UserProfile Model

```swift
import Foundation

struct UserProfile: Codable, Identifiable {
    let id: String
    let deviceId: String
    var fullName: String
    var profileImage: ProfileImage?
    let isActive: Bool
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case deviceId
        case fullName
        case profileImage
        case isActive
        case createdAt
        case updatedAt
    }
}

struct ProfileImage: Codable {
    let url: String?
    let key: String?
    let originalName: String?
    let size: Int?
    let uploadedAt: String?
}

struct UserProfileResponse: Codable {
    let status: String
    let message: String?
    let data: UserProfileData
}

struct UserProfileData: Codable {
    let profile: UserProfile
}

struct APIError: Codable, Error {
    let status: String
    let message: String
    let errors: [ValidationError]?
}

struct ValidationError: Codable {
    let field: String?
    let message: String
    let value: String?
}
```

---

## Network Service

### APIService

```swift
import Foundation
import UIKit

class PublicUserProfileService: ObservableObject {
    static let shared = PublicUserProfileService()
    
    private let baseURL = "https://your-api-domain.com/api/public-users"
    
    private init() {}
    
    // MARK: - Get Profile
    func getProfile(deviceId: String) async throws -> UserProfile {
        guard let url = URL(string: "\(baseURL)/\(deviceId)") else {
            throw URLError(.badURL)
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard httpResponse.statusCode == 200 else {
            if let error = try? JSONDecoder().decode(APIError.self, from: data) {
                throw error
            }
            throw URLError(.badServerResponse)
        }
        
        let profileResponse = try JSONDecoder().decode(UserProfileResponse.self, from: data)
        return profileResponse.data.profile
    }
    
    // MARK: - Create Profile
    func createProfile(deviceId: String, fullName: String, profileImage: UIImage?) async throws -> UserProfile {
        guard let url = URL(string: baseURL) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add deviceId
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"deviceId\"\r\n\r\n".data(using: .utf8)!)
        body.append(deviceId.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add fullName
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"fullName\"\r\n\r\n".data(using: .utf8)!)
        body.append(fullName.data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add profile image if provided
        if let image = profileImage,
           let imageData = image.jpegData(compressionQuality: 0.8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"profileImage\"; filename=\"profile.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard httpResponse.statusCode == 201 else {
            if let error = try? JSONDecoder().decode(APIError.self, from: data) {
                throw error
            }
            throw URLError(.badServerResponse)
        }
        
        let profileResponse = try JSONDecoder().decode(UserProfileResponse.self, from: data)
        return profileResponse.data.profile
    }
    
    // MARK: - Update Profile
    func updateProfile(deviceId: String, fullName: String?, profileImage: UIImage?) async throws -> UserProfile {
        guard let url = URL(string: "\(baseURL)/\(deviceId)") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        
        // If no image, use JSON
        if profileImage == nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            var body: [String: Any] = [:]
            if let fullName = fullName {
                body["fullName"] = fullName
            }
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } else {
            // Use multipart/form-data for image upload
            let boundary = UUID().uuidString
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            
            var body = Data()
            
            // Add fullName if provided
            if let fullName = fullName {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"fullName\"\r\n\r\n".data(using: .utf8)!)
                body.append(fullName.data(using: .utf8)!)
                body.append("\r\n".data(using: .utf8)!)
            }
            
            // Add profile image
            if let image = profileImage,
               let imageData = image.jpegData(compressionQuality: 0.8) {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"profileImage\"; filename=\"profile.jpg\"\r\n".data(using: .utf8)!)
                body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
                body.append(imageData)
                body.append("\r\n".data(using: .utf8)!)
            }
            
            body.append("--\(boundary)--\r\n".data(using: .utf8)!)
            request.httpBody = body
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard httpResponse.statusCode == 200 else {
            if let error = try? JSONDecoder().decode(APIError.self, from: data) {
                throw error
            }
            throw URLError(.badServerResponse)
        }
        
        let profileResponse = try JSONDecoder().decode(UserProfileResponse.self, from: data)
        return profileResponse.data.profile
    }
    
    // MARK: - Delete Profile Image
    func deleteProfileImage(deviceId: String) async throws -> UserProfile {
        guard let url = URL(string: "\(baseURL)/\(deviceId)/profile-image") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard httpResponse.statusCode == 200 else {
            if let error = try? JSONDecoder().decode(APIError.self, from: data) {
                throw error
            }
            throw URLError(.badServerResponse)
        }
        
        let profileResponse = try JSONDecoder().decode(UserProfileResponse.self, from: data)
        return profileResponse.data.profile
    }
    
    // MARK: - Delete Profile
    func deleteProfile(deviceId: String) async throws {
        guard let url = URL(string: "\(baseURL)/\(deviceId)") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }
    
    // MARK: - Load Image from URL
    func loadImage(from urlString: String?) async -> UIImage? {
        guard let urlString = urlString,
              let url = URL(string: urlString) else {
            return nil
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return UIImage(data: data)
        } catch {
            print("Error loading image: \(error)")
            return nil
        }
    }
}
```

---

## View Models

### ProfileViewModel

```swift
import Foundation
import SwiftUI
import UIKit

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var profile: UserProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedImage: UIImage?
    @Published var profileImage: UIImage?
    
    private let deviceId: String
    private let apiService = PublicUserProfileService.shared
    
    init(deviceId: String) {
        self.deviceId = deviceId
    }
    
    // MARK: - Load Profile
    func loadProfile() async {
        isLoading = true
        errorMessage = nil
        
        do {
            profile = try await apiService.getProfile(deviceId: deviceId)
            
            // Load profile image if exists
            if let imageUrl = profile?.profileImage?.url {
                profileImage = await apiService.loadImage(from: imageUrl)
            }
        } catch {
            errorMessage = handleError(error)
        }
        
        isLoading = false
    }
    
    // MARK: - Create Profile
    func createProfile(fullName: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            profile = try await apiService.createProfile(
                deviceId: deviceId,
                fullName: fullName,
                profileImage: selectedImage
            )
            
            // Load profile image if exists
            if let imageUrl = profile?.profileImage?.url {
                profileImage = await apiService.loadImage(from: imageUrl)
            }
            
            selectedImage = nil
            isLoading = false
            return true
        } catch {
            errorMessage = handleError(error)
            isLoading = false
            return false
        }
    }
    
    // MARK: - Update Profile
    func updateProfile(fullName: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            profile = try await apiService.updateProfile(
                deviceId: deviceId,
                fullName: fullName,
                profileImage: selectedImage
            )
            
            // Load updated profile image if exists
            if let imageUrl = profile?.profileImage?.url {
                profileImage = await apiService.loadImage(from: imageUrl)
            }
            
            selectedImage = nil
            isLoading = false
            return true
        } catch {
            errorMessage = handleError(error)
            isLoading = false
            return false
        }
    }
    
    // MARK: - Delete Profile Image
    func deleteProfileImage() async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            profile = try await apiService.deleteProfileImage(deviceId: deviceId)
            profileImage = nil
            isLoading = false
            return true
        } catch {
            errorMessage = handleError(error)
            isLoading = false
            return false
        }
    }
    
    // MARK: - Delete Profile
    func deleteProfile() async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            try await apiService.deleteProfile(deviceId: deviceId)
            profile = nil
            profileImage = nil
            isLoading = false
            return true
        } catch {
            errorMessage = handleError(error)
            isLoading = false
            return false
        }
    }
    
    // MARK: - Error Handling
    private func handleError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.message
        } else if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection"
            case .timedOut:
                return "Request timed out"
            default:
                return "Network error occurred"
            }
        } else {
            return error.localizedDescription
        }
    }
}
```

---

## SwiftUI Views

### Device ID Manager

```swift
import Foundation

class DeviceIDManager {
    static let shared = DeviceIDManager()
    
    private let deviceIdKey = "user_device_id"
    
    var deviceId: String {
        if let savedId = UserDefaults.standard.string(forKey: deviceIdKey) {
            return savedId
        } else {
            let newId = UUID().uuidString
            UserDefaults.standard.set(newId, forKey: deviceIdKey)
            return newId
        }
    }
}
```

### Profile View (Read/Display)

```swift
import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    
    init(deviceId: String) {
        _viewModel = StateObject(wrappedValue: ProfileViewModel(deviceId: deviceId))
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.profile == nil {
                    ProgressView("Loading profile...")
                } else if let profile = viewModel.profile {
                    profileContent(profile: profile)
                } else {
                    emptyStateView
                }
            }
            .navigationTitle("Profile")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.profile != nil {
                        Button("Edit") {
                            showingEditSheet = true
                        }
                    }
                }
            }
            .sheet(isPresented: $showingEditSheet) {
                if let profile = viewModel.profile {
                    EditProfileView(
                        deviceId: viewModel.deviceId,
                        currentProfile: profile,
                        onSave: {
                            Task {
                                await viewModel.loadProfile()
                            }
                        }
                    )
                }
            }
            .alert("Delete Profile", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    Task {
                        let success = await viewModel.deleteProfile()
                        if success {
                            // Handle successful deletion
                        }
                    }
                }
            } message: {
                Text("Are you sure you want to delete your profile? This action cannot be undone.")
            }
            .task {
                await viewModel.loadProfile()
            }
        }
    }
    
    private func profileContent(profile: UserProfile) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Profile Image
                if let image = viewModel.profileImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 120, height: 120)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.gray.opacity(0.3), lineWidth: 2))
                } else {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .foregroundColor(.gray)
                }
                
                // Full Name
                Text(profile.fullName)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                // Delete Button
                Button(action: {
                    showingDeleteAlert = true
                }) {
                    Text("Delete Profile")
                        .foregroundColor(.red)
                        .padding()
                }
            }
            .padding()
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.circle")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .foregroundColor(.gray)
            
            Text("No Profile Found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create your profile to get started")
                .foregroundColor(.secondary)
            
            NavigationLink("Create Profile") {
                CreateProfileView(deviceId: viewModel.deviceId)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

### Create Profile View

```swift
import SwiftUI
import PhotosUI

struct CreateProfileView: View {
    let deviceId: String
    @StateObject private var viewModel = CreateProfileViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var fullName = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    
    var body: some View {
        NavigationView {
            Form {
                Section("Profile Information") {
                    TextField("Full Name", text: $fullName)
                        .textInputAutocapitalization(.words)
                }
                
                Section("Profile Image") {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        HStack {
                            if let image = selectedImage {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 60, height: 60)
                                    .clipShape(Circle())
                            } else {
                                Image(systemName: "photo.circle")
                                    .font(.system(size: 60))
                                    .foregroundColor(.gray)
                            }
                            
                            Text(selectedImage == nil ? "Select Photo" : "Change Photo")
                                .foregroundColor(.blue)
                        }
                    }
                    
                    if selectedImage != nil {
                        Button("Remove Photo", role: .destructive) {
                            selectedImage = nil
                            selectedPhoto = nil
                        }
                    }
                }
                
                if let errorMessage = viewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Create Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            let success = await viewModel.createProfile(
                                deviceId: deviceId,
                                fullName: fullName,
                                profileImage: selectedImage
                            )
                            if success {
                                dismiss()
                            }
                        }
                    }
                    .disabled(fullName.isEmpty || viewModel.isLoading)
                }
            }
            .onChange(of: selectedPhoto) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        selectedImage = image
                    }
                }
            }
        }
    }
}

@MainActor
class CreateProfileViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = PublicUserProfileService.shared
    
    func createProfile(deviceId: String, fullName: String, profileImage: UIImage?) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await apiService.createProfile(
                deviceId: deviceId,
                fullName: fullName,
                profileImage: profileImage
            )
            isLoading = false
            return true
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.message
            } else {
                errorMessage = error.localizedDescription
            }
            isLoading = false
            return false
        }
    }
}
```

### Edit Profile View

```swift
import SwiftUI
import PhotosUI

struct EditProfileView: View {
    let deviceId: String
    let currentProfile: UserProfile
    let onSave: () -> Void
    
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = EditProfileViewModel()
    @State private var fullName: String
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var currentImage: UIImage?
    @State private var showingDeleteImageAlert = false
    
    init(deviceId: String, currentProfile: UserProfile, onSave: @escaping () -> Void) {
        self.deviceId = deviceId
        self.currentProfile = currentProfile
        self.onSave = onSave
        _fullName = State(initialValue: currentProfile.fullName)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Profile Information") {
                    TextField("Full Name", text: $fullName)
                        .textInputAutocapitalization(.words)
                }
                
                Section("Profile Image") {
                    // Display current or selected image
                    if let image = selectedImage ?? currentImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 100, height: 100)
                            .clipShape(Circle())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical)
                    } else if let imageUrl = currentProfile.profileImage?.url {
                        AsyncImage(url: URL(string: imageUrl)) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical)
                    } else {
                        Image(systemName: "photo.circle")
                            .font(.system(size: 100))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical)
                    }
                    
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Text("Change Photo")
                            .foregroundColor(.blue)
                    }
                    
                    if currentProfile.profileImage != nil {
                        Button("Remove Photo", role: .destructive) {
                            showingDeleteImageAlert = true
                        }
                    }
                }
                
                if let errorMessage = viewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        Task {
                            let success = await viewModel.updateProfile(
                                deviceId: deviceId,
                                fullName: fullName,
                                profileImage: selectedImage
                            )
                            if success {
                                onSave()
                                dismiss()
                            }
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
            .onChange(of: selectedPhoto) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        selectedImage = image
                    }
                }
            }
            .task {
                // Load current profile image
                if let imageUrl = currentProfile.profileImage?.url {
                    currentImage = await PublicUserProfileService.shared.loadImage(from: imageUrl)
                }
            }
            .alert("Remove Photo", isPresented: $showingDeleteImageAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Remove", role: .destructive) {
                    Task {
                        let success = await viewModel.deleteProfileImage(deviceId: deviceId)
                        if success {
                            currentImage = nil
                            selectedImage = nil
                        }
                    }
                }
            } message: {
                Text("Are you sure you want to remove your profile photo?")
            }
        }
    }
}

@MainActor
class EditProfileViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = PublicUserProfileService.shared
    
    func updateProfile(deviceId: String, fullName: String?, profileImage: UIImage?) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await apiService.updateProfile(
                deviceId: deviceId,
                fullName: fullName,
                profileImage: profileImage
            )
            isLoading = false
            return true
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.message
            } else {
                errorMessage = error.localizedDescription
            }
            isLoading = false
            return false
        }
    }
    
    func deleteProfileImage(deviceId: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await apiService.deleteProfileImage(deviceId: deviceId)
            isLoading = false
            return true
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.message
            } else {
                errorMessage = error.localizedDescription
            }
            isLoading = false
            return false
        }
    }
}
```

---

## Image Upload Handling

### Image Picker Helper

```swift
import SwiftUI
import PhotosUI

struct ImagePickerView: View {
    @Binding var selectedImage: UIImage?
    @State private var selectedPhoto: PhotosPickerItem?
    
    var body: some View {
        PhotosPicker(selection: $selectedPhoto, matching: .images) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
            } else {
                Image(systemName: "photo.circle.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.gray)
            }
        }
        .onChange(of: selectedPhoto) { newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    selectedImage = image
                }
            }
        }
    }
}
```

---

## Complete Example

### App Entry Point

```swift
import SwiftUI

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        ProfileView(deviceId: DeviceIDManager.shared.deviceId)
    }
}
```

---

## Usage Summary

### 1. Get Device ID
```swift
let deviceId = DeviceIDManager.shared.deviceId
```

### 2. Load Profile
```swift
let viewModel = ProfileViewModel(deviceId: deviceId)
await viewModel.loadProfile()
```

### 3. Create Profile
```swift
let success = await viewModel.createProfile(fullName: "John Doe")
```

### 4. Update Profile
```swift
let success = await viewModel.updateProfile(fullName: "Jane Doe")
```

### 5. Delete Profile Image
```swift
let success = await viewModel.deleteProfileImage()
```

### 6. Delete Profile
```swift
let success = await viewModel.deleteProfile()
```

---

## Error Handling

All network operations return errors that can be handled:

```swift
do {
    let profile = try await apiService.getProfile(deviceId: deviceId)
} catch let error as APIError {
    print("API Error: \(error.message)")
} catch {
    print("Network Error: \(error.localizedDescription)")
}
```

---

## Notes

1. **Device ID**: Automatically generated and stored in UserDefaults on first launch
2. **Image Upload**: Uses multipart/form-data for image uploads
3. **Image Loading**: Uses AsyncImage for loading profile images from URLs
4. **Error Handling**: Comprehensive error handling for network and API errors
5. **Loading States**: All views show loading indicators during network operations
6. **Validation**: Full name is validated (1-100 characters) on the server

---

## API Endpoints Reference

- `GET /api/public-users/:deviceId` - Get profile
- `POST /api/public-users` - Create profile
- `PUT /api/public-users/:deviceId` - Update profile
- `DELETE /api/public-users/:deviceId/profile-image` - Delete image
- `DELETE /api/public-users/:deviceId` - Delete profile

---

## Testing

To test the implementation:

1. **Create Profile**: Use CreateProfileView
2. **View Profile**: Use ProfileView
3. **Edit Profile**: Use EditProfileView
4. **Delete Image**: Use delete button in EditProfileView
5. **Delete Profile**: Use delete button in ProfileView

All operations are async and handle loading/error states appropriately.

