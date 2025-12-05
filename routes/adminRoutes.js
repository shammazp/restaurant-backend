const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const ExplorePost = require('../models/ExplorePost');

// Dashboard route access
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch basic stats
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ isActive: true });
    const restaurants = await Restaurant.find({ isActive: true }).limit(50).sort({ createdAt: -1 });
    const explorePosts = await ExplorePost.find({ isActive: true }).limit(20).sort({ createdAt: -1 }).lean();
    
    // Debug: Log explore posts media
    console.log('=== DASHBOARD: Explore posts loaded ===');
    console.log('Total posts:', explorePosts.length);
    explorePosts.forEach((p, index) => {
      console.log(`Post ${index + 1}:`, {
        id: p._id,
        title: p.title,
        mediaCount: p.media?.length || 0,
        media: p.media?.map(m => ({ url: m.url, type: m.type, key: m.key })) || []
      });
    });
    
    // Format explore posts for display
    const explorePostsHTML = explorePosts.map(post => `
      <tr>
        <td><strong>${(post.title || 'N/A').replace(/'/g, "&#39;")}</strong></td>
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(post.description || 'N/A').substring(0, 100)}${post.description && post.description.length > 100 ? '...' : ''}</td>
        <td>
          ${post.media && Array.isArray(post.media) && post.media.length > 0 
            ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${post.media.slice(0, 3).map(media => {
                  if (!media || !media.url) {
                    console.warn('Invalid media item:', media);
                    return '';
                  }
                  if (media.type === 'video') {
                    return `<span style="font-size: 12px; color: #86868b;">🎥 Video</span>`;
                  } else {
                    const safeUrl = (media.url || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    return `<img src="${safeUrl}" alt="${(media.originalName || 'Media').replace(/"/g, '&quot;')}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e5e7;" onerror="console.error('Failed to load image:', this.src); this.style.display='none';" />`;
                  }
                }).filter(html => html !== '').join('')}
                ${post.media.length > 3 ? `<span style="font-size: 12px; color: #86868b;">+${post.media.length - 3} more</span>` : ''}
              </div>`
            : '<span style="color: #86868b; font-size: 12px;">No media</span>'
          }
        </td>
        <td>
          <span style="font-size: 12px; padding: 4px 8px; background: #f5f5f7; border-radius: 4px;">
            ${post.postType || 1}
          </span>
        </td>
        <td>
          <span style="font-size: 12px; padding: 4px 8px; background: #f5f5f7; border-radius: 4px;">
            ${post.listPosition || 1}
          </span>
        </td>
        <td>
          <span style="font-size: 12px; padding: 4px 8px; background: #f5f5f7; border-radius: 4px;">
            ${post.contactInfo && post.contactInfo.type === 'button' ? 'Button' : 'Contact'}
          </span>
        </td>
        <td><span class="status ${post.isActive ? 'active' : 'inactive'}">${post.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>${post.views || 0}</td>
        <td>
          <button onclick="editExplorePost('${post._id}')" class="btn" style="background: #007aff; margin-right: 8px;">Edit</button>
          <button onclick="deleteExplorePost('${post._id}', '${(post.title || 'Unknown').replace(/'/g, "\\'")}')" class="btn" style="background: #dc3545;">Delete</button>
        </td>
      </tr>
    `).join('');
    
    // Format restaurants for display
    const restaurantsHTML = restaurants.map(restaurant => `
      <tr>
        <td>${restaurant.name || 'N/A'}</td>
        <td>${restaurant.biz_id || 'N/A'}</td>
        <td>${restaurant.contact ? restaurant.contact.phone : 'N/A'}</td>
        <td>${restaurant.contact ? restaurant.contact.email : 'N/A'}</td>
        <td>
          ${restaurant.coverImages && restaurant.coverImages.length > 0 
            ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${restaurant.coverImages.slice(0, 3).map(img => `
                  <img src="${img.url}" alt="${img.alt || 'Cover'}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e5e7;">
                `).join('')}
                ${restaurant.coverImages.length > 3 ? `<span style="font-size: 12px; color: #86868b;">+${restaurant.coverImages.length - 3} more</span>` : ''}
              </div>`
            : '<span style="color: #86868b; font-size: 12px;">No images</span>'
          }
        </td>
        <td><span class="status ${restaurant.isActive ? 'active' : 'inactive'}">${restaurant.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <a href="/admin/restaurants/${restaurant._id}/edit" class="btn" style="background: #007aff; margin-right: 8px;">Edit</a>
          <button onclick="deleteRestaurant('${restaurant._id}', '${(restaurant.name || 'Unknown').replace(/'/g, "\\'")}')" class="btn" style="background: #dc3545;">Delete</button>
        </td>
      </tr>
    `).join('');
    
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #1d1d1f;
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 280px;
            background: #f5f5f7;
            border-right: 1px solid #e5e5e7;
            padding: 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid #e5e5e7;
        }
        
        .sidebar-header h1 {
            font-size: 20px;
            font-weight: 600;
            color: #1d1d1f;
        }
        
        .sidebar-nav {
            padding: 20px 0;
        }
        
        .nav-item {
            display: block;
            padding: 12px 20px;
            color: #1d1d1f;
            text-decoration: none;
            font-size: 16px;
            font-weight: 400;
            transition: background-color 0.2s;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
        }
        
        .nav-item:hover {
            background: #e8e8ed;
        }
        
        .nav-item.active {
            background: #007aff;
            color: white;
        }
        
        .main-content {
            flex: 1;
            margin-left: 280px;
            padding: 40px;
            max-width: 1200px;
        }
        
        .welcome-section {
            margin-bottom: 40px;
        }
        
        .welcome-section h1 {
            font-size: 32px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .welcome-section p {
            font-size: 18px;
            color: #86868b;
            font-weight: 400;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        
        .stat-card h3 {
            font-size: 32px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .stat-card p {
            font-size: 16px;
            color: #86868b;
            font-weight: 400;
        }
        
        .page {
            display: none;
        }
        
        .page.active {
            display: block;
        }
        
        .restaurants-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        
        .restaurant-card {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 24px;
            transition: box-shadow 0.2s;
        }
        
        .restaurant-card:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .restaurant-card h3 {
            font-size: 20px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 12px;
        }
        
        .restaurant-card p {
            color: #86868b;
            margin-bottom: 8px;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .restaurant-card .label {
            font-weight: 500;
            color: #1d1d1f;
        }
        
        .cuisine-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 12px 0;
        }
        
        .cuisine-tag {
            background: #f5f5f7;
            color: #1d1d1f;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .features-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 12px 0;
        }
        
        .feature-tag {
            background: #007aff;
            color: white;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status.active {
            background: #d1f2eb;
            color: #00a86b;
        }
        
        .status.inactive {
            background: #f8d7da;
            color: #dc3545;
        }
        
        .form-section {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #1d1d1f;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            font-size: 16px;
            background: #ffffff;
            color: #1d1d1f;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #007aff;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        .btn {
            background: #007aff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .btn-secondary {
            background: #f5f5f7;
            color: #1d1d1f;
        }
        
        .btn-secondary:hover {
            background: #e8e8ed;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #86868b;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        th, td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #e5e5e7;
        }
        
        th {
            background: #f5f5f7;
            font-weight: 600;
            color: #1d1d1f;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }
            
            .main-content {
                margin-left: 0;
                padding: 20px;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .restaurants-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h1>Admin Dashboard</h1>
        </div>
        <nav class="sidebar-nav">
            <button class="nav-item" data-tab="explore">🔍 Explore</button>
            <button class="nav-item active" data-tab="eats">🍽️ Eats</button>
            <button class="nav-item" data-tab="play">🎮 Play</button>
            <button class="nav-item" data-tab="fitness">💪 Fitness</button>
            <button class="nav-item" data-tab="transit">🚌 Transit</button>
            <button class="nav-item" data-tab="notification">🔔 Notification</button>
            <button class="nav-item" data-tab="updates">📢 Updates</button>
            <button class="nav-item" data-tab="enquiries">📧 Enquiries</button>
        </nav>
    </div>
    
    <div class="main-content">
        <!-- Explore Tab -->
        <div id="explore" class="page">
            <div class="welcome-section">
                <h1>Explore Posts</h1>
                <p>Create and manage exploration update posts</p>
            </div>
            
            <div class="action-buttons">
                <button class="btn" onclick="showCreateForm()">➕ Create New Post</button>
                        </div>
            
            <!-- Create/Edit Form (hidden by default) -->
            <div id="exploreFormContainer" style="display: none; margin-bottom: 40px;">
                <div class="form-section">
                    <h2 id="formTitle">Create Explore Post</h2>
                    <div id="formMessage"></div>
                    <form id="explorePostForm" enctype="multipart/form-data">
                        <input type="hidden" id="postId" name="postId">
                        
                        <div class="form-group">
                            <label for="title">Title *</label>
                            <input type="text" id="title" name="title" required maxlength="200">
                </div>
                        
                        <div class="form-group">
                            <label for="description">Description *</label>
                            <textarea id="description" name="description" rows="4" required maxlength="2000"></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="postType">Post Type *</label>
                                <input type="number" id="postType" name="postType" min="1" required value="1" placeholder="1, 2, 3...">
                                <small style="color: #86868b; display: block; margin-top: 4px;">Category type (integer)</small>
                            </div>
                            <div class="form-group">
                                <label for="listPosition">List Position *</label>
                                <input type="number" id="listPosition" name="listPosition" min="1" required value="1" placeholder="1, 2, 3...">
                                <small style="color: #86868b; display: block; margin-top: 4px;">Position in list (integer)</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="mediaFiles">Media Files (Images/Video) *</label>
                            <input type="file" id="mediaFiles" name="coverImages" multiple accept="image/*,video/*">
                            <small style="color: #86868b; display: block; margin-top: 4px;">You can upload multiple images or videos. They will be ordered by position (1, 2, 3...)</small>
                            <div id="mediaPreview" style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;"></div>
            </div>
            
                        <div class="form-group">
                            <label for="contactType">Contact Method Type (Optional)</label>
                            <select id="contactType" name="contactType" onchange="toggleContactFields()">
                                <option value="">None (No contact info)</option>
                                <option value="contact">Contact Information (Mobile, Email, Website, Location)</option>
                                <option value="button">Button (Label, Icon, URL)</option>
                            </select>
            </div>
                        
                        <!-- Contact Information Fields -->
                        <div id="contactFields" style="display: none;">
                            <div class="form-group">
                                <label for="mobile">Mobile Number</label>
                                <input type="tel" id="mobile" name="mobile" placeholder="+1234567890">
            </div>
                            
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" placeholder="contact@example.com">
            </div>
            
                            <div class="form-group">
                                <label for="website">Website URL</label>
                                <input type="url" id="website" name="website" placeholder="https://example.com">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="latitude">Latitude</label>
                                    <input type="number" id="latitude" name="latitude" step="any" placeholder="40.7128">
                                </div>
                                <div class="form-group">
                                    <label for="longitude">Longitude</label>
                                    <input type="number" id="longitude" name="longitude" step="any" placeholder="-74.0060">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Button Fields -->
                        <div id="buttonFields" style="display: none;">
                            <div class="form-group">
                                <label for="buttonLabel">Button Label *</label>
                                <input type="text" id="buttonLabel" name="buttonLabel" placeholder="Learn More">
                            </div>
                            
                            <div class="form-group">
                                <label for="buttonIcon">Button Icon</label>
                                <input type="text" id="buttonIcon" name="buttonIcon" placeholder="🔗 or icon name">
                                <small style="color: #86868b; display: block; margin-top: 4px;">Enter an emoji or icon identifier</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="buttonUrl">Button URL *</label>
                                <input type="url" id="buttonUrl" name="buttonUrl" placeholder="https://example.com">
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 24px;">
                            <button type="submit" class="btn" id="submitBtn">Create Post</button>
                            <button type="button" class="btn btn-secondary" onclick="hideCreateForm()">Cancel</button>
                        </div>
                </form>
            </div>
    </div>

            <!-- Posts List -->
            <div id="explorePostsList">
                ${explorePosts.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Media</th>
                            <th>Post Type</th>
                            <th>List Position</th>
                            <th>Contact Type</th>
                            <th>Status</th>
                            <th>Views</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${explorePostsHTML}
                    </tbody>
                </table>
                ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No explore posts yet</h3>
                    <p>Create your first explore post to get started</p>
                    <button onclick="showCreateForm()" class="btn" style="margin-top: 16px;">Create Post</button>
                </div>
                `}
            </div>
        </div>
        
        <!-- Eats Tab (Restaurants) -->
        <div id="eats" class="page active">
            <div class="welcome-section">
                <h1>Eats - Restaurants</h1>
                <p>Manage your restaurant listings</p>
            </div>
            
            <div class="action-buttons">
                <a href="/admin/add-restaurant" class="btn">➕ Add Restaurant</a>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Business ID</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Cover Images</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${restaurants.length > 0 ? restaurantsHTML : `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px;">
                            <div class="empty-state">
                                <div class="empty-state-icon">🍽️</div>
                                <h3>No restaurants found</h3>
                                <p>Get started by adding your first restaurant</p>
                                <a href="/admin/add-restaurant" class="btn" style="margin-top: 16px;">Add Restaurant</a>
                            </div>
                        </td>
                    </tr>
                    `}
                </tbody>
            </table>
        </div>
        
        <!-- Play Tab -->
        <div id="play" class="page">
            <div class="welcome-section">
                <h1>Play</h1>
                <p>Manage entertainment and gaming features</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">🎮</div>
                <h2>Play Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
        
        <!-- Fitness Tab -->
        <div id="fitness" class="page">
            <div class="welcome-section">
                <h1>Fitness</h1>
                <p>Manage fitness and wellness features</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">💪</div>
                <h2>Fitness Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
        
        <!-- Transit Tab -->
        <div id="transit" class="page">
            <div class="welcome-section">
                <h1>Transit</h1>
                <p>Manage transportation and transit features</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">🚌</div>
                <h2>Transit Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
        
        <!-- Notification Tab -->
        <div id="notification" class="page">
            <div class="welcome-section">
                <h1>Notifications</h1>
                <p>Manage system notifications</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">🔔</div>
                <h2>Notification Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
        
        <!-- Updates Tab -->
        <div id="updates" class="page">
            <div class="welcome-section">
                <h1>Updates</h1>
                <p>Manage system updates and announcements</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">📢</div>
                <h2>Updates Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
        
        <!-- Enquiries Tab -->
        <div id="enquiries" class="page">
            <div class="welcome-section">
                <h1>Enquiries</h1>
                <p>Manage customer enquiries and support requests</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">📧</div>
                <h2>Enquiries Section</h2>
                <p>This section is coming soon</p>
            </div>
        </div>
    </div>

    <script>
        // Tab navigation
        function showTab(tabId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Show selected page
            const targetPage = document.getElementById(tabId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // Add active class to clicked nav item
            const targetNav = document.querySelector('[data-tab="' + tabId + '"]');
            if (targetNav) {
                targetNav.classList.add('active');
            }
        }
        
        // Set up tab navigation
        document.addEventListener('DOMContentLoaded', function() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    if (tabId) {
                        showTab(tabId);
                    }
                });
            });
        });

        // Delete restaurant function
        async function deleteRestaurant(restaurantId, restaurantName) {
            if (confirm('Are you sure you want to delete "' + restaurantName + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch('/api/restaurants/' + restaurantId, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        alert('Restaurant deleted successfully!');
                        location.reload(); // Reload the page to show updated list
                    } else {
                        const result = await response.json();
                        alert('Error deleting restaurant: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error deleting restaurant: ' + error.message);
                }
            }
        }

        // Explore Posts Functions
        function showCreateForm() {
            document.getElementById('exploreFormContainer').style.display = 'block';
            document.getElementById('formTitle').textContent = 'Create Explore Post';
            document.getElementById('explorePostForm').reset();
            document.getElementById('postId').value = '';
            document.getElementById('mediaPreview').innerHTML = '';
            toggleContactFields();
            document.getElementById('exploreFormContainer').scrollIntoView({ behavior: 'smooth' });
        }
        
        function hideCreateForm() {
            document.getElementById('exploreFormContainer').style.display = 'none';
            document.getElementById('explorePostForm').reset();
            document.getElementById('postId').value = '';
            document.getElementById('mediaPreview').innerHTML = '';
        }
        
        function toggleContactFields() {
            const contactType = document.getElementById('contactType').value;
            const contactFields = document.getElementById('contactFields');
            const buttonFields = document.getElementById('buttonFields');
            
            if (contactType === 'contact') {
                contactFields.style.display = 'block';
                buttonFields.style.display = 'none';
                // Make contact fields optional
                document.getElementById('mobile').removeAttribute('required');
                document.getElementById('email').removeAttribute('required');
                document.getElementById('website').removeAttribute('required');
                document.getElementById('buttonLabel').removeAttribute('required');
                document.getElementById('buttonUrl').removeAttribute('required');
            } else if (contactType === 'button') {
                contactFields.style.display = 'none';
                buttonFields.style.display = 'block';
                document.getElementById('buttonLabel').setAttribute('required', 'required');
                document.getElementById('buttonUrl').setAttribute('required', 'required');
                document.getElementById('mobile').removeAttribute('required');
                document.getElementById('email').removeAttribute('required');
                document.getElementById('website').removeAttribute('required');
                    } else {
                contactFields.style.display = 'none';
                buttonFields.style.display = 'none';
            }
        }
        
        // Preview media files
        document.getElementById('mediaFiles')?.addEventListener('change', function(e) {
            const preview = document.getElementById('mediaPreview');
            preview.innerHTML = '';
            
            if (this.files && this.files.length > 0) {
                Array.from(this.files).forEach((file, index) => {
                    const div = document.createElement('div');
                    div.style.position = 'relative';
                    
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.style.width = '100%';
                        img.style.height = '100px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '8px';
                        div.appendChild(img);
                    } else if (file.type.startsWith('video/')) {
                        const video = document.createElement('video');
                        video.src = URL.createObjectURL(file);
                        video.style.width = '100%';
                        video.style.height = '100px';
                        video.style.objectFit = 'cover';
                        video.style.borderRadius = '8px';
                        video.controls = true;
                        div.appendChild(video);
                    }
                    
                    const label = document.createElement('div');
                    label.textContent = \`Position: \${index + 1}\`;
                    label.style.fontSize = '10px';
                    label.style.color = '#86868b';
                    label.style.marginTop = '4px';
                    div.appendChild(label);
                    
                    preview.appendChild(div);
                });
            }
        });
        
        // Handle form submission
        document.getElementById('explorePostForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const postId = document.getElementById('postId').value;
            const messageDiv = document.getElementById('formMessage');
            const submitBtn = document.getElementById('submitBtn');
            
            // Build contact info object (optional)
            const contactType = formData.get('contactType');
            let contactInfo = null;
            
            if (contactType && contactType !== '') {
                contactInfo = { type: contactType };
                
                if (contactType === 'contact') {
                    if (formData.get('mobile')) contactInfo.mobile = formData.get('mobile');
                    if (formData.get('email')) contactInfo.email = formData.get('email');
                    if (formData.get('website')) contactInfo.website = formData.get('website');
                    if (formData.get('latitude') || formData.get('longitude')) {
                        contactInfo.location = {
                            latitude: formData.get('latitude') ? parseFloat(formData.get('latitude')) : undefined,
                            longitude: formData.get('longitude') ? parseFloat(formData.get('longitude')) : undefined
                        };
                    }
                } else if (contactType === 'button') {
                    contactInfo.buttonLabel = formData.get('buttonLabel');
                    contactInfo.buttonIcon = formData.get('buttonIcon') || '';
                    contactInfo.buttonUrl = formData.get('buttonUrl');
                }
            }
            
            // Create new FormData for API
            const apiFormData = new FormData();
            apiFormData.append('title', formData.get('title'));
            apiFormData.append('description', formData.get('description'));
            apiFormData.append('postType', formData.get('postType') || '1');
            apiFormData.append('listPosition', formData.get('listPosition') || '1');
            
            // Only append contactInfo if it was provided
            if (contactInfo) {
                apiFormData.append('contactInfo', JSON.stringify(contactInfo));
            }
            
            // Add media files
            const mediaFiles = document.getElementById('mediaFiles').files;
            if (mediaFiles && mediaFiles.length > 0) {
                Array.from(mediaFiles).forEach(file => {
                    apiFormData.append('coverImages', file);
                });
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            try {
                const url = postId ? \`/api/explore/\${postId}\` : '/api/explore';
                const method = postId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    body: apiFormData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div style="padding: 12px; background: #d1f2eb; color: #00a86b; border-radius: 8px; margin-bottom: 16px;">Post ' + (postId ? 'updated' : 'created') + ' successfully!</div>';
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    let errorMessage = result.message || 'Unknown error';
                    if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
                        errorMessage = result.errors.map(err => err.msg || err.message || err).join(', ');
                    }
                    messageDiv.innerHTML = '<div style="padding: 12px; background: #f8d7da; color: #dc3545; border-radius: 8px; margin-bottom: 16px;"><strong>Error:</strong> ' + errorMessage + '</div>';
                    submitBtn.disabled = false;
                    submitBtn.textContent = postId ? 'Update Post' : 'Create Post';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div style="padding: 12px; background: #f8d7da; color: #dc3545; border-radius: 8px; margin-bottom: 16px;">Error: ' + error.message + '</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = postId ? 'Update Post' : 'Create Post';
            }
        });
        
        // Edit explore post
        async function editExplorePost(postId) {
            try {
                const response = await fetch(\`/api/explore/\${postId}\`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    const post = result.data.post;
                    
                    document.getElementById('postId').value = post._id;
                    document.getElementById('title').value = post.title;
                    document.getElementById('description').value = post.description;
                    document.getElementById('postType').value = post.postType || 1;
                    document.getElementById('listPosition').value = post.listPosition || 1;
                    document.getElementById('contactType').value = post.contactInfo.type;
                    
                    if (post.contactInfo.type === 'contact') {
                        document.getElementById('mobile').value = post.contactInfo.mobile || '';
                        document.getElementById('email').value = post.contactInfo.email || '';
                        document.getElementById('website').value = post.contactInfo.website || '';
                        document.getElementById('latitude').value = post.contactInfo.location?.latitude || '';
                        document.getElementById('longitude').value = post.contactInfo.location?.longitude || '';
                    } else if (post.contactInfo.type === 'button') {
                        document.getElementById('buttonLabel').value = post.contactInfo.buttonLabel || '';
                        document.getElementById('buttonIcon').value = post.contactInfo.buttonIcon || '';
                        document.getElementById('buttonUrl').value = post.contactInfo.buttonUrl || '';
                    }
                    
                    // Show media preview
                    const preview = document.getElementById('mediaPreview');
                    preview.innerHTML = '';
                    if (post.media && post.media.length > 0) {
                        post.media.forEach((media, index) => {
                            const div = document.createElement('div');
                            if (media.type === 'image') {
                                const img = document.createElement('img');
                                img.src = media.url;
                                img.style.width = '100%';
                                img.style.height = '100px';
                                img.style.objectFit = 'cover';
                                img.style.borderRadius = '8px';
                                div.appendChild(img);
                            } else {
                                const video = document.createElement('video');
                                video.src = media.url;
                                video.style.width = '100%';
                                video.style.height = '100px';
                                video.style.objectFit = 'cover';
                                video.style.borderRadius = '8px';
                                video.controls = true;
                                div.appendChild(video);
                            }
                            const label = document.createElement('div');
                            label.textContent = \`Position: \${media.position}\`;
                            label.style.fontSize = '10px';
                            label.style.color = '#86868b';
                            label.style.marginTop = '4px';
                            div.appendChild(label);
                            preview.appendChild(div);
                        });
                    }
                    
                    toggleContactFields();
                    document.getElementById('formTitle').textContent = 'Edit Explore Post';
                    document.getElementById('submitBtn').textContent = 'Update Post';
                    document.getElementById('exploreFormContainer').style.display = 'block';
                    document.getElementById('exploreFormContainer').scrollIntoView({ behavior: 'smooth' });
                }
            } catch (error) {
                alert('Error loading post: ' + error.message);
            }
        }
        
        // Delete explore post
        async function deleteExplorePost(postId, postTitle) {
            if (confirm('Are you sure you want to delete "' + postTitle + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch(\`/api/explore/\${postId}\`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        alert('Post deleted successfully!');
                        location.reload();
                    } else {
                        const result = await response.json();
                        alert('Error deleting post: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error deleting post: ' + error.message);
                }
            }
        }
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error loading admin page:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Restaurant Admin</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 50px; text-align: center; }
          .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error Loading Admin Page</h1>
          <p>There was an error loading the admin page. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Edit restaurant route
router.get('/restaurants/:id/edit', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).send('Restaurant not found');
    }

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Restaurant - Restaurant Admin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
        }
        
        .container {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: #ffffff;
            border-right: 1px solid #e5e5e7;
            padding: 24px;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #1d1d1f;
        }
        
        .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            text-decoration: none;
            color: #86868b;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .nav-item:hover {
            background: #f5f5f7;
            color: #1d1d1f;
        }
        
        .nav-item.active {
            background: #007aff;
            color: white;
        }
        
        .main-content {
            flex: 1;
            margin-left: 250px;
            padding: 32px;
        }
        
        .welcome-section {
            margin-bottom: 32px;
        }
        
        .welcome-section h1 {
            font-size: 32px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .welcome-section p {
            font-size: 18px;
            color: #86868b;
            font-weight: 400;
        }
        
        .form-section {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 32px;
            max-width: 800px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #1d1d1f;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            font-size: 16px;
            background: #ffffff;
            color: #1d1d1f;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #007aff;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        .btn {
            background: #007aff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .btn-secondary {
            background: #86868b;
            margin-right: 12px;
        }
        
        .btn-secondary:hover {
            background: #6d6d70;
        }
        
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .message.success {
            background: #d1f2eb;
            color: #00a86b;
            border: 1px solid #a8e6cf;
        }
        
        .message.error {
            background: #f8d7da;
            color: #dc3545;
            border: 1px solid #f5c6cb;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>Restaurant Admin</h1>
            </div>
            <nav class="sidebar-nav">
                <a href="/admin/dashboard" class="nav-item">🏠 Dashboard</a>
                <a href="/admin/dashboard" class="nav-item">🏠 Dashboard</a>
                <a href="/admin/add-restaurant" class="nav-item">➕ Add Restaurant</a>
            </nav>
        </div>
        
        <div class="main-content">
            <div class="welcome-section">
                <h1>Edit Restaurant</h1>
                <p>Update restaurant details and information</p>
            </div>
            
            <div class="form-section">
                <div id="message"></div>
                <form id="editRestaurantForm" action="/api/restaurants/${restaurant._id}" method="PUT" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="biz_id">Business ID *</label>
                        <input type="text" id="biz_id" name="biz_id" value="${restaurant.biz_id || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="name">Restaurant Name *</label>
                        <input type="text" id="name" name="name" value="${restaurant.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description *</label>
                        <textarea id="description" name="description" rows="3" required>${restaurant.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="street">Street Address *</label>
                            <input type="text" id="street" name="street" value="${restaurant.address ? restaurant.address.street : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="city">City *</label>
                            <input type="text" id="city" name="city" value="${restaurant.address ? restaurant.address.city : ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="state">State *</label>
                            <input type="text" id="state" name="state" value="${restaurant.address ? restaurant.address.state : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="zipCode">ZIP Code *</label>
                            <input type="text" id="zipCode" name="zipCode" value="${restaurant.address ? restaurant.address.zipCode : ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="latitude">Latitude *</label>
                            <input type="number" id="latitude" name="latitude" step="any" value="${restaurant.location ? restaurant.location.latitude : ''}" required placeholder="e.g., 40.7128">
                        </div>
                        <div class="form-group">
                            <label for="longitude">Longitude *</label>
                            <input type="number" id="longitude" name="longitude" step="any" value="${restaurant.location ? restaurant.location.longitude : ''}" required placeholder="e.g., -74.0060">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="phone">Phone Number *</label>
                            <input type="tel" id="phone" name="phone" value="${restaurant.contact ? restaurant.contact.phone : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" value="${restaurant.contact ? restaurant.contact.email : ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="website">Website</label>
                        <input type="url" id="website" name="website" value="${restaurant.contact ? restaurant.contact.website || '' : ''}" placeholder="https://example.com">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="rating">Rating (0-5)</label>
                            <input type="number" id="rating" name="rating" min="0" max="5" step="0.1" value="${restaurant.rating || 0}" placeholder="e.g., 4.5">
                        </div>
                        <div class="form-group">
                            <label for="ranking">Ranking (1-100)</label>
                            <input type="number" id="ranking" name="ranking" min="1" max="100" value="${restaurant.ranking || 50}" placeholder="e.g., 25">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="restaurantType">Restaurant Type *</label>
                        <select id="restaurantType" name="restaurantType" required>
                            <option value="Restaurant" ${restaurant.restaurantType === 'Restaurant' ? 'selected' : ''}>Restaurant</option>
                            <option value="Cafe" ${restaurant.restaurantType === 'Cafe' ? 'selected' : ''}>Cafe</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="cuisine">Cuisine Type *</label>
                        <select id="cuisine" name="cuisine" multiple required>
                            <option value="Italian" ${restaurant.cuisine && restaurant.cuisine.includes('Italian') ? 'selected' : ''}>Italian</option>
                            <option value="Chinese" ${restaurant.cuisine && restaurant.cuisine.includes('Chinese') ? 'selected' : ''}>Chinese</option>
                            <option value="Mexican" ${restaurant.cuisine && restaurant.cuisine.includes('Mexican') ? 'selected' : ''}>Mexican</option>
                            <option value="Indian" ${restaurant.cuisine && restaurant.cuisine.includes('Indian') ? 'selected' : ''}>Indian</option>
                            <option value="Thai" ${restaurant.cuisine && restaurant.cuisine.includes('Thai') ? 'selected' : ''}>Thai</option>
                            <option value="Japanese" ${restaurant.cuisine && restaurant.cuisine.includes('Japanese') ? 'selected' : ''}>Japanese</option>
                            <option value="American" ${restaurant.cuisine && restaurant.cuisine.includes('American') ? 'selected' : ''}>American</option>
                            <option value="Mediterranean" ${restaurant.cuisine && restaurant.cuisine.includes('Mediterranean') ? 'selected' : ''}>Mediterranean</option>
                            <option value="French" ${restaurant.cuisine && restaurant.cuisine.includes('French') ? 'selected' : ''}>French</option>
                            <option value="Other" ${restaurant.cuisine && restaurant.cuisine.includes('Other') ? 'selected' : ''}>Other</option>
                        </select>
                        <small>Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="features">Features</label>
                        <select id="features" name="features" multiple>
                            <option value="Delivery" ${restaurant.features && restaurant.features.includes('Delivery') ? 'selected' : ''}>Delivery</option>
                            <option value="Takeout" ${restaurant.features && restaurant.features.includes('Takeout') ? 'selected' : ''}>Takeout</option>
                            <option value="Dine-in" ${restaurant.features && restaurant.features.includes('Dine-in') ? 'selected' : ''}>Dine-in</option>
                            <option value="Outdoor Seating" ${restaurant.features && restaurant.features.includes('Outdoor Seating') ? 'selected' : ''}>Outdoor Seating</option>
                            <option value="Parking" ${restaurant.features && restaurant.features.includes('Parking') ? 'selected' : ''}>Parking</option>
                            <option value="WiFi" ${restaurant.features && restaurant.features.includes('WiFi') ? 'selected' : ''}>WiFi</option>
                            <option value="Bar" ${restaurant.features && restaurant.features.includes('Bar') ? 'selected' : ''}>Bar</option>
                            <option value="Live Music" ${restaurant.features && restaurant.features.includes('Live Music') ? 'selected' : ''}>Live Music</option>
                            <option value="Private Dining" ${restaurant.features && restaurant.features.includes('Private Dining') ? 'selected' : ''}>Private Dining</option>
                        </select>
                        <small>Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    
                    <div class="form-group">
                        <label style="margin-bottom: 16px; font-size: 16px; font-weight: 600;">Operating Hours</label>
                        <div style="display: grid; gap: 16px;">
                            ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                                const dayData = restaurant.operatingHours && restaurant.operatingHours[day] ? restaurant.operatingHours[day] : { open: '', close: '', closed: false };
                                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                                return `
                                    <div style="border: 1px solid #e5e5e7; border-radius: 8px; padding: 16px; background: #f8f9fa;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                            <label style="font-weight: 600; color: #1d1d1f; margin: 0; font-size: 14px;">${dayName}</label>
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                                                <input type="checkbox" id="closed_${day}" name="closed_${day}" ${dayData.closed ? 'checked' : ''} style="width: auto; cursor: pointer;">
                                                <span style="font-size: 14px; color: #86868b;">Closed</span>
                                            </label>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" class="hours-row-${day}">
                                            <div>
                                                <label for="open_${day}" style="font-size: 12px; color: #86868b; margin-bottom: 4px; display: block;">Opening Time</label>
                                                <input type="time" id="open_${day}" name="open_${day}" value="${dayData.open || ''}" style="width: 100%; padding: 8px 12px; border: 1px solid #e5e5e7; border-radius: 6px; font-size: 14px;" ${dayData.closed ? 'disabled' : ''}>
                                            </div>
                                            <div>
                                                <label for="close_${day}" style="font-size: 12px; color: #86868b; margin-bottom: 4px; display: block;">Closing Time</label>
                                                <input type="time" id="close_${day}" name="close_${day}" value="${dayData.close || ''}" style="width: 100%; padding: 8px 12px; border: 1px solid #e5e5e7; border-radius: 6px; font-size: 14px;" ${dayData.closed ? 'disabled' : ''}>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <small style="color: #86868b; font-size: 12px; margin-top: 8px; display: block;">
                            Set the opening and closing times for each day. Check "Closed" if the restaurant is closed on that day.
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label for="logo">Restaurant Logo</label>
                        <input type="file" id="logo" name="logo" accept="image/jpeg,image/jpg,image/png,image/webp">
                        <small style="color: #86868b; font-size: 12px; margin-top: 4px; display: block;">
                            Supported formats: JPEG, PNG, WebP. Max size: 5MB
                        </small>
                        ${restaurant.logo && restaurant.logo.url ? `<p style="margin-top: 8px; color: #00a86b;">Current logo: <a href="${restaurant.logo.url}" target="_blank">View Logo</a></p>` : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="coverImages">Cover Images (up to 4)</label>
                        <input type="file" id="coverImages" name="coverImages" accept="image/jpeg,image/jpg,image/png,image/webp" multiple>
                        <small style="color: #86868b; font-size: 12px; margin-top: 4px; display: block;">
                            Supported formats: JPEG, PNG, WebP. Max size: 5MB each. You can select up to 4 images.
                        </small>
                        ${restaurant.coverImages && restaurant.coverImages.length > 0 ? `
                            <div style="margin-top: 12px;">
                                <p style="color: #00a86b; margin-bottom: 8px;">Current cover images:</p>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                                    ${restaurant.coverImages.map(img => `
                                        <div style="border: 1px solid #e5e5e7; border-radius: 8px; padding: 8px; text-align: center;">
                                            <img src="${img.url}" alt="${img.alt}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
                                            <p style="font-size: 12px; color: #86868b; margin: 0;">${img.originalName}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button type="submit" class="btn">Update Restaurant</button>
                        <a href="/admin/dashboard" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // Handle closed checkbox toggling for operating hours
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const closedCheckbox = document.getElementById('closed_' + day);
            const openInput = document.getElementById('open_' + day);
            const closeInput = document.getElementById('close_' + day);
            
            if (closedCheckbox) {
                closedCheckbox.addEventListener('change', function() {
                    if (this.checked) {
                        openInput.disabled = true;
                        closeInput.disabled = true;
                        openInput.value = '';
                        closeInput.value = '';
                    } else {
                        openInput.disabled = false;
                        closeInput.disabled = false;
                    }
                });
            }
        });
        
        document.getElementById('editRestaurantForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const messageDiv = document.getElementById('message');
            
            // Build operating hours object
            const operatingHours = {};
            days.forEach(day => {
                const closed = formData.get('closed_' + day) === 'on';
                operatingHours[day] = {
                    open: closed ? '' : (formData.get('open_' + day) || ''),
                    close: closed ? '' : (formData.get('close_' + day) || ''),
                    closed: closed
                };
            });
            
            // Convert form data to the format expected by the API
            const restaurantData = {
                biz_id: formData.get('biz_id'),
                name: formData.get('name'),
                description: formData.get('description'),
                address: {
                    street: formData.get('street'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    zipCode: formData.get('zipCode'),
                    country: 'USA'
                },
                location: {
                    latitude: parseFloat(formData.get('latitude')),
                    longitude: parseFloat(formData.get('longitude'))
                },
                contact: {
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    website: formData.get('website') || undefined
                },
                rating: parseFloat(formData.get('rating')) || 0,
                ranking: parseInt(formData.get('ranking')) || 50,
                restaurantType: formData.get('restaurantType'),
                cuisine: Array.from(document.getElementById('cuisine').selectedOptions).map(option => option.value),
                features: Array.from(document.getElementById('features').selectedOptions).map(option => option.value),
                operatingHours: operatingHours
            };
            
            try {
                console.log('Sending restaurant data:', restaurantData);
                
                // Create FormData for file upload
                const uploadFormData = new FormData();
                
                // Add all restaurant data as JSON string
                uploadFormData.append('data', JSON.stringify(restaurantData));
                
                // Add logo file if present
                const logoFile = document.getElementById('logo').files[0];
                if (logoFile) {
                    uploadFormData.append('logo', logoFile);
                }
                
                // Add cover images if present
                const coverImageFiles = document.getElementById('coverImages').files;
                for (let i = 0; i < coverImageFiles.length; i++) {
                    uploadFormData.append('coverImages', coverImageFiles[i]);
                }
                
                const response = await fetch('/api/restaurants/${restaurant._id}', {
                    method: 'PUT',
                    body: uploadFormData
                });
                
                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response data:', result);
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="message success">Restaurant updated successfully! <a href="/admin/dashboard">View Dashboard</a></div>';
                } else {
                    console.error('API Error:', result);
                    let errorMessage = 'Failed to update restaurant';
                    if (result.errors && result.errors.length > 0) {
                        errorMessage = result.errors.map(err => err.msg).join(', ');
                    } else if (result.message) {
                        errorMessage = result.message;
                    }
                    messageDiv.innerHTML = '<div class="message error">Error: ' + errorMessage + '</div>';
                }
            } catch (error) {
                console.error('Network Error:', error);
                messageDiv.innerHTML = '<div class="message error">Error: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).send('Error loading restaurant');
  }
});

// Add restaurant route
router.get('/add-restaurant', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Restaurant - Restaurant Admin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #1d1d1f;
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 280px;
            background: #f5f5f7;
            border-right: 1px solid #e5e5e7;
            padding: 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid #e5e5e7;
        }
        
        .sidebar-header h1 {
            font-size: 20px;
            font-weight: 600;
            color: #1d1d1f;
        }
        
        .sidebar-nav {
            padding: 20px 0;
        }
        
        .nav-item {
            display: block;
            padding: 12px 20px;
            color: #1d1d1f;
            text-decoration: none;
            font-size: 16px;
            font-weight: 400;
            transition: background-color 0.2s;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
        }
        
        .nav-item:hover {
            background: #e8e8ed;
        }
        
        .nav-item.active {
            background: #007aff;
            color: white;
        }
        
        .main-content {
            flex: 1;
            margin-left: 280px;
            padding: 40px;
            max-width: 1200px;
        }
        
        .welcome-section {
            margin-bottom: 40px;
        }
        
        .welcome-section h1 {
            font-size: 32px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .welcome-section p {
            font-size: 18px;
            color: #86868b;
            font-weight: 400;
        }
        
        .form-section {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #1d1d1f;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            font-size: 16px;
            background: #ffffff;
            color: #1d1d1f;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #007aff;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        .btn {
            background: #007aff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .message.success {
            background: #d1f2eb;
            color: #00a86b;
            border: 1px solid #a8e6cf;
        }
        
        .message.error {
            background: #f8d7da;
            color: #dc3545;
            border: 1px solid #f5c6cb;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }
            
            .main-content {
                margin-left: 0;
                padding: 20px;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h1>Restaurant Admin</h1>
        </div>
        <nav class="sidebar-nav">
            <a href="/admin/dashboard" class="nav-item">🏠 Dashboard</a>
            <a href="/admin/dashboard" class="nav-item">🏠 Dashboard</a>
            <a href="/admin/add-restaurant" class="nav-item active">➕ Add Restaurant</a>
        </nav>
    </div>
    
    <div class="main-content">
        <div class="welcome-section">
            <h1>Add Restaurant</h1>
            <p>Create a new restaurant listing</p>
        </div>
        
        <div class="form-section">
            <div id="message"></div>
            <form id="restaurantForm" action="/api/restaurants" method="POST">
                <div class="form-group">
                    <label for="biz_id">Business ID *</label>
                    <input type="text" id="biz_id" name="biz_id" required placeholder="Enter unique business ID">
                </div>
                
                <div class="form-group">
                    <label for="name">Restaurant Name *</label>
                    <input type="text" id="name" name="name" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="phone">Phone Number *</label>
                        <input type="tel" id="phone" name="phone" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="latitude">Latitude *</label>
                        <input type="number" id="latitude" name="latitude" step="any" required placeholder="e.g., 40.7128">
                    </div>
                    <div class="form-group">
                        <label for="longitude">Longitude *</label>
                        <input type="number" id="longitude" name="longitude" step="any" required placeholder="e.g., -74.0060">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="rating">Rating (0-5)</label>
                        <input type="number" id="rating" name="rating" min="0" max="5" step="0.1" placeholder="e.g., 4.5">
                    </div>
                    <div class="form-group">
                        <label for="ranking">Ranking (1-100)</label>
                        <input type="number" id="ranking" name="ranking" min="1" max="100" placeholder="e.g., 25">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="restaurantType">Restaurant Type *</label>
                    <select id="restaurantType" name="restaurantType" required>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Cafe">Cafe</option>
                    </select>
                </div>
                
                <button type="submit" class="btn">Create Restaurant</button>
            </form>
        </div>
    </div>

    <script>
        document.getElementById('restaurantForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const messageDiv = document.getElementById('message');
            
            // Convert form data to the format expected by the API
            const restaurantData = {
                biz_id: formData.get('biz_id'),
                name: formData.get('name'),
                location: {
                    latitude: parseFloat(formData.get('latitude')),
                    longitude: parseFloat(formData.get('longitude'))
                },
                contact: {
                    phone: formData.get('phone'),
                    email: formData.get('email')
                },
                rating: parseFloat(formData.get('rating')) || 0,
                ranking: parseInt(formData.get('ranking')) || 50,
                restaurantType: formData.get('restaurantType'),
                owner: '507f1f77bcf86cd799439011' // Placeholder owner ID
            };
            
            try {
                console.log('Sending restaurant data:', restaurantData);
                
                const response = await fetch('/api/restaurants', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(restaurantData)
                });
                
                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response data:', result);
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="message success">Restaurant created successfully! <a href="/admin/dashboard">View Dashboard</a></div>';
                    this.reset();
                } else {
                    console.error('API Error:', result);
                    let errorMessage = 'Failed to create restaurant';
                    if (result.errors && result.errors.length > 0) {
                        errorMessage = result.errors.map(err => err.msg).join(', ');
                    } else if (result.message) {
                        errorMessage = result.message;
                    }
                    messageDiv.innerHTML = '<div class="message error">Error: ' + errorMessage + '</div>';
                }
            } catch (error) {
                console.error('Network Error:', error);
                messageDiv.innerHTML = '<div class="message error">Error: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
  `);
});

// Redirect root admin to dashboard
router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

module.exports = router;