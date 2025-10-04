const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// Dashboard route
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch basic stats
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ isActive: true });
    
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Admin</title>
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
        
        .no-restaurants {
            text-align: center;
            padding: 60px 20px;
            color: #86868b;
            font-size: 16px;
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
            <h1>Restaurant Admin</h1>
        </div>
        <nav class="sidebar-nav">
            <a href="/admin/dashboard" class="nav-item active">🏠 Dashboard</a>
            <a href="/admin/restaurants" class="nav-item">📋 View Restaurants</a>
            <a href="/admin/add-restaurant" class="nav-item">➕ Add Restaurant</a>
        </nav>
    </div>
    
    <div class="main-content">
        <!-- Home Page -->
        <div id="home" class="page active">
            <div class="welcome-section">
                    <h1>Welcome to Restaurant Admin</h1>
                    <p>Manage your restaurants with ease</p>
            </div>
            
            <div class="stats-grid">
                        <div class="stat-card">
                    <h3>${totalRestaurants}</h3>
                            <p>Total Restaurants</p>
                        </div>
                        <div class="stat-card">
                    <h3>${activeRestaurants}</h3>
                            <p>Active Restaurants</p>
                </div>
                </div>
            </div>
            
            <!-- View Restaurants Page -->
            <div id="restaurants" class="page">
            <div class="welcome-section">
                <h1>Restaurants</h1>
                <p>View and manage your restaurant listings</p>
            </div>
                <div id="restaurantsList">
                <div class="no-restaurants">Loading restaurants...</div>
            </div>
            </div>
            
            <!-- Add Restaurant Page -->
            <div id="add-restaurant" class="page">
                <h1>Add Restaurant</h1>
                <div id="message"></div>
                <form id="restaurantForm">
                    <p><label>Business ID: <input type="text" name="biz_id" required></label></p>
                    <p><label>Restaurant Name: <input type="text" name="name" required></label></p>
                    <p><label>Description: <textarea name="description" required></textarea></label></p>
                    <p><label>Street: <input type="text" name="street" required></label></p>
                    <p><label>City: <input type="text" name="city" required></label></p>
                    <p><label>State: <input type="text" name="state" required></label></p>
                    <p><label>ZIP Code: <input type="text" name="zipCode" required></label></p>
                    <p><label>Latitude: <input type="number" name="latitude" step="any" required placeholder="e.g., 40.7128"></label></p>
                    <p><label>Longitude: <input type="number" name="longitude" step="any" required placeholder="e.g., -74.0060"></label></p>
                    <p><label>Phone: <input type="tel" name="phone" required></label></p>
                    <p><label>Email: <input type="email" name="email" required></label></p>
                    <p><label>Website: <input type="url" name="website"></label></p>
                    <p><label>Rating (0-5): <input type="number" name="rating" min="0" max="5" step="0.1" placeholder="e.g., 4.5"></label></p>
                    <p><label>Ranking (1-100): <input type="number" name="ranking" min="1" max="100" placeholder="e.g., 25"></label></p>
                    <p><label>Restaurant Type: <select name="restaurantType" required>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Cafe">Cafe</option>
                    </select></label></p>
                    <p><label>Cuisine: <select name="cuisine" multiple>
                        <option value="Italian">Italian</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Mexican">Mexican</option>
                        <option value="Indian">Indian</option>
                        <option value="Thai">Thai</option>
                        <option value="Japanese">Japanese</option>
                        <option value="American">American</option>
                        <option value="Mediterranean">Mediterranean</option>
                        <option value="French">French</option>
                        <option value="Other">Other</option>
                    </select></label></p>
                    <p><label>Features: <select name="features" multiple>
                        <option value="Delivery">Delivery</option>
                        <option value="Takeout">Takeout</option>
                        <option value="Dine-in">Dine-in</option>
                        <option value="Outdoor Seating">Outdoor Seating</option>
                        <option value="Parking">Parking</option>
                        <option value="WiFi">WiFi</option>
                        <option value="Bar">Bar</option>
                        <option value="Live Music">Live Music</option>
                        <option value="Private Dining">Private Dining</option>
                    </select></label></p>
                    <p><label>Logo: <input type="file" name="logo" accept="image/*"></label></p>
                    <button type="submit">Create Restaurant</button>
                </form>
            </div>
    </div>

        <script>
        // Debug: Check if everything is loaded
        console.log('Script loaded');
        console.log('Document ready state:', document.readyState);
        
        // Navigation
        function showPage(pageId) {
            console.log('showPage called with:', pageId);
            
            // Hide all pages
            const allPages = document.querySelectorAll('.page');
            console.log('Found', allPages.length, 'pages');
            allPages.forEach(page => {
                page.classList.remove('active');
                console.log('Removed active from page:', page.id);
            });
            
            // Remove active class from all buttons
            const allButtons = document.querySelectorAll('.nav-item');
            console.log('Found', allButtons.length, 'nav buttons');
            allButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected page
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                console.log('Page activated:', pageId);
            } else {
                console.error('Page not found:', pageId);
                console.log('Available pages:', Array.from(allPages).map(p => p.id));
            }
            
            // Add active class to clicked button
            const targetButton = document.querySelector('[data-page="' + pageId + '"]');
            if (targetButton) {
                targetButton.classList.add('active');
                console.log('Button activated:', pageId);
            } else {
                console.error('Button not found for page:', pageId);
            }
            
            // Load data for specific pages
            if (pageId === 'restaurants') {
                console.log('Loading restaurants...');
                loadRestaurants();
            }
        }

        // Load restaurants
        async function loadRestaurants() {
            const container = document.getElementById('restaurantsList');
            container.innerHTML = '<div class="no-restaurants">Loading restaurants...</div>';
            
            try {
                const apiUrl = window.location.protocol + '//' + window.location.host + '/api/restaurants';
                console.log('Fetching restaurants from:', apiUrl);
                
                const response = await fetch(apiUrl);
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.status === 'success') {
                    console.log('Restaurants found:', data.data.restaurants.length);
                    displayRestaurants(data.data.restaurants);
                } else {
                    console.error('API returned error status:', data);
                    container.innerHTML = '<div class="no-restaurants">API Error: ' + (data.message || 'Unknown error') + '</div>';
                }
            } catch (error) {
                console.error('Error loading restaurants:', error);
                container.innerHTML = '<div class="no-restaurants">Error loading restaurants: ' + error.message + '</div>';
            }
        }

        // Display restaurants - Simple table format
        function displayRestaurants(restaurants) {
            console.log('Displaying restaurants:', restaurants);
            const container = document.getElementById('restaurantsList');
            
            if (!restaurants || restaurants.length === 0) {
                container.innerHTML = '<p>No restaurants found</p>';
                return;
            }
            
            let html = '<table border="1" style="width: 100%; border-collapse: collapse;">';
            html += '<tr><th>Name</th><th>Business ID</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr>';
            
            restaurants.forEach(restaurant => {
                html += '<tr>';
                html += '<td>' + (restaurant.name || 'N/A') + '</td>';
                html += '<td>' + (restaurant.biz_id || 'N/A') + '</td>';
                html += '<td>' + (restaurant.contact ? restaurant.contact.phone : 'N/A') + '</td>';
                html += '<td>' + (restaurant.contact ? restaurant.contact.email : 'N/A') + '</td>';
                html += '<td>' + (restaurant.isActive ? 'Active' : 'Inactive') + '</td>';
                html += '<td>';
                html += '<button onclick="editRestaurant(\'' + restaurant._id + '\')" style="margin-right: 8px;">Edit</button>';
                html += '<button onclick="deleteRestaurant(\'' + restaurant._id + '\', \'' + (restaurant.name || 'Unknown') + '\')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Delete</button>';
                html += '</td>';
                html += '</tr>';
            });
            
            html += '</table>';
            container.innerHTML = html;
        }

        // Delete restaurant function
        async function deleteRestaurant(restaurantId, restaurantName) {
            if (confirm('Are you sure you want to delete "' + restaurantName + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch('/api/restaurants/' + restaurantId, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        alert('Restaurant deleted successfully!');
                        loadRestaurants(); // Reload the restaurant list
                    } else {
                        const result = await response.json();
                        alert('Error deleting restaurant: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error deleting restaurant: ' + error.message);
                }
            }
        }

        // Show message
        function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = text;
            messageDiv.style.padding = '12px 16px';
            messageDiv.style.borderRadius = '8px';
            messageDiv.style.marginBottom = '20px';
            messageDiv.style.fontSize = '14px';
            messageDiv.style.fontWeight = '500';
            
            if (type === 'success') {
                messageDiv.style.background = '#d1f2eb';
                messageDiv.style.color = '#00a86b';
                messageDiv.style.border = '1px solid #a8e6cf';
            } else {
                messageDiv.style.background = '#f8d7da';
                messageDiv.style.color = '#dc3545';
                messageDiv.style.border = '1px solid #f5c6cb';
            }
            
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
                messageDiv.style.cssText = '';
            }, 5000);
        }

        // Handle form submission
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, setting up navigation...');
            
            // Add click listeners to navigation buttons
            const navButtons = document.querySelectorAll('.nav-item');
            console.log('Found', navButtons.length, 'navigation buttons');
            
            navButtons.forEach((btn, index) => {
                console.log('Setting up button', index, ':', btn.textContent.trim());
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Navigation button clicked:', this.textContent.trim());
                    const pageId = this.getAttribute('data-page');
                    console.log('Page ID:', pageId);
                    if (pageId) {
                        showPage(pageId);
                    } else {
                        console.error('No data-page attribute found on button');
                    }
                });
            });
            console.log('Navigation setup complete');
            
            // Form submission
            const form = document.getElementById('restaurantForm');
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const formData = new FormData(this);
                    
                    // Create restaurant first
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
                            website: formData.get('website')
                        },
                        rating: parseFloat(formData.get('rating')) || 0,
                        ranking: parseInt(formData.get('ranking')) || 50,
                        restaurantType: formData.get('restaurantType'),
                        cuisine: Array.from(document.getElementById('cuisine').selectedOptions).map(option => option.value),
                        features: Array.from(document.getElementById('features').selectedOptions).map(option => option.value),
                        owner: '507f1f77bcf86cd799439011'
                    };
                    
                    try {
                        // Create restaurant first
                        const apiUrl = window.location.protocol + '//' + window.location.host + '/api/restaurants';
                        console.log('Creating restaurant...');
                        
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(restaurantData)
                        });
                        
                        if (!response.ok) {
                            const result = await response.json();
                            throw new Error('Restaurant creation failed: ' + (result.message || 'Unknown error'));
                        }
                        
                        const result = await response.json();
                        console.log('Restaurant created:', result);
                        
                        // Now upload logo if provided
                        const logoFile = formData.get('logo');
                        if (logoFile && logoFile.size > 0) {
                            console.log('Uploading logo...');
                            const logoFormData = new FormData();
                            logoFormData.append('logo', logoFile);
                            logoFormData.append('biz_id', formData.get('biz_id'));
                            
                            const logoResponse = await fetch('/api/restaurants/biz/' + formData.get('biz_id') + '/logo', {
                                method: 'POST',
                                body: logoFormData
                            });
                            
                            if (!logoResponse.ok) {
                                const logoError = await logoResponse.json();
                                console.warn('Logo upload failed:', logoError.message);
                                // Don't throw error - restaurant was created successfully
                            } else {
                                console.log('Logo uploaded successfully');
                            }
                        }
                        
                        showMessage('Restaurant created successfully!', 'success');
                        this.reset();
                        
                    } catch (error) {
                        console.error('Error:', error);
                        showMessage('Error: ' + error.message, 'error');
                    }
                });
            }
        });
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

// Restaurants list route
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('owner', 'name email');
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurants - Restaurant Admin</title>
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
        
        .btn {
            background: #007aff;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #0056b3;
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
            <a href="/admin/restaurants" class="nav-item active">📋 View Restaurants</a>
            <a href="/admin/add-restaurant" class="nav-item">➕ Add Restaurant</a>
        </nav>
    </div>
    
    <div class="main-content">
        <div class="welcome-section">
            <h1>Restaurants</h1>
            <p>View and manage your restaurant listings</p>
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
                ${restaurants.map(restaurant => `
                    <tr>
                        <td>${restaurant.name || 'N/A'}</td>
                        <td>${restaurant.biz_id || 'N/A'}</td>
                        <td>${restaurant.contact ? restaurant.contact.phone : 'N/A'}</td>
                        <td>${restaurant.contact ? restaurant.contact.email : 'N/A'}</td>
                        <td>
                            ${restaurant.coverImages && restaurant.coverImages.length > 0 
                                ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                    ${restaurant.coverImages.slice(0, 3).map(img => `
                                        <img src="${img.url}" alt="${img.alt}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e5e7;">
                                    `).join('')}
                                    ${restaurant.coverImages.length > 3 ? `<span style="font-size: 12px; color: #86868b;">+${restaurant.coverImages.length - 3} more</span>` : ''}
                                </div>`
                                : '<span style="color: #86868b; font-size: 12px;">No images</span>'
                            }
                        </td>
                        <td><span class="status ${restaurant.isActive ? 'active' : 'inactive'}">${restaurant.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <a href="/admin/restaurants/${restaurant._id}/edit" class="btn">Edit</a>
                            <button onclick="deleteRestaurant('${restaurant._id}', '${restaurant.name}')" class="btn" style="background: #dc3545; margin-left: 8px;">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        // Delete restaurant function
        async function deleteRestaurant(restaurantId, restaurantName) {
            if (confirm('Are you sure you want to delete "' + restaurantName + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch('/api/restaurants/' + restaurantId, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        alert('Restaurant deleted successfully!');
                        location.reload(); // Refresh the page to show updated list
                    } else {
                        const result = await response.json();
                        alert('Error deleting restaurant: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error deleting restaurant: ' + error.message);
                }
            }
        }
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).send('Error loading restaurants');
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
                <a href="/admin/restaurants" class="nav-item">📋 View Restaurants</a>
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
                        <a href="/admin/restaurants" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('editRestaurantForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const messageDiv = document.getElementById('message');
            
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
                features: Array.from(document.getElementById('features').selectedOptions).map(option => option.value)
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
                    messageDiv.innerHTML = '<div class="message success">Restaurant updated successfully! <a href="/admin/restaurants">View Restaurants</a></div>';
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
            <a href="/admin/restaurants" class="nav-item">📋 View Restaurants</a>
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
                    messageDiv.innerHTML = '<div class="message success">Restaurant created successfully! <a href="/admin/restaurants">View Restaurants</a></div>';
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