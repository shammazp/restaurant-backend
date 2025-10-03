const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// Main dashboard with sidebar
router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }
        
        .sidebar h2 {
            margin-bottom: 30px;
            text-align: center;
            font-size: 1.5rem;
        }
        
        .sidebar-menu {
            list-style: none;
        }
        
        .sidebar-menu li {
            margin-bottom: 10px;
        }
        
        .sidebar-menu button {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            font-size: 16px;
        }
        
        .sidebar-menu button:hover {
            background: rgba(255,255,255,0.2);
            transform: translateX(5px);
        }
        
        .sidebar-menu button.active {
            background: rgba(255,255,255,0.3);
            font-weight: bold;
        }
        
        .main-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .content-area {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            min-height: 600px;
        }
        
        .page {
            display: none;
        }
        
        .page.active {
            display: block;
        }
        
        .welcome-page {
            text-align: center;
            padding: 50px 0;
        }
        
        .welcome-page h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5rem;
        }
        
        .welcome-page p {
            color: #666;
            font-size: 1.2rem;
            margin-bottom: 30px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-card h3 {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        }
        
        .restaurant-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .restaurant-card h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        
        .restaurant-card p {
            color: #666;
            margin-bottom: 8px;
        }
        
        .restaurant-actions {
            margin-top: 15px;
        }
        
        .restaurant-actions button {
            margin-right: 10px;
            padding: 8px 16px;
            font-size: 14px;
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 1.2rem;
        }
        
        @media (max-width: 768px) {
            body {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                padding: 15px;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>🍽️ Admin Panel</h2>
        <ul class="sidebar-menu">
            <li><button onclick="showPage('welcome')" class="active">🏠 Dashboard</button></li>
            <li><button onclick="showPage('restaurants')">📋 View Restaurants</button></li>
            <li><button onclick="showPage('add-restaurant')">➕ Add Restaurant</button></li>
        </ul>
    </div>
    
    <div class="main-content">
        <div class="content-area">
            <!-- Welcome Page -->
            <div id="welcome" class="page active">
                <div class="welcome-page">
                    <h1>Welcome to Restaurant Admin</h1>
                    <p>Manage your restaurants with ease</p>
                    <div class="stats">
                        <div class="stat-card">
                            <h3 id="totalRestaurants">-</h3>
                            <p>Total Restaurants</p>
                        </div>
                        <div class="stat-card">
                            <h3 id="activeRestaurants">-</h3>
                            <p>Active Restaurants</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- View Restaurants Page -->
            <div id="restaurants" class="page">
                <h1>📋 Restaurant List</h1>
                <div id="restaurantsList">
                    <div class="loading">Loading restaurants...</div>
                </div>
            </div>
            
            <!-- Add Restaurant Page -->
            <div id="add-restaurant" class="page">
                <h1>➕ Add New Restaurant</h1>
                <div id="message"></div>
                <form id="restaurantForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="name">Restaurant Name *</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="cuisine">Cuisine Type *</label>
                            <select id="cuisine" name="cuisine" multiple required>
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
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description *</label>
                        <textarea id="description" name="description" rows="3" required></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="street">Street Address *</label>
                            <input type="text" id="street" name="street" required>
                        </div>
                        <div class="form-group">
                            <label for="city">City *</label>
                            <input type="text" id="city" name="city" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="state">State *</label>
                            <input type="text" id="state" name="state" required>
                        </div>
                        <div class="form-group">
                            <label for="zipCode">ZIP Code *</label>
                            <input type="text" id="zipCode" name="zipCode" required>
                        </div>
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
                    
                    <div class="form-group">
                        <label for="website">Website</label>
                        <input type="url" id="website" name="website" placeholder="https://example.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="features">Features</label>
                        <select id="features" name="features" multiple>
                            <option value="Delivery">Delivery</option>
                            <option value="Takeout">Takeout</option>
                            <option value="Dine-in">Dine-in</option>
                            <option value="Outdoor Seating">Outdoor Seating</option>
                            <option value="Parking">Parking</option>
                            <option value="WiFi">WiFi</option>
                            <option value="Bar">Bar</option>
                            <option value="Live Music">Live Music</option>
                            <option value="Private Dining">Private Dining</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn">Create Restaurant</button>
                </form>
            </div>
        </div>
    </div>

    <script>
        // Navigation
        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.sidebar-menu button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected page
            document.getElementById(pageId).classList.add('active');
            
            // Add active class to clicked button
            event.target.classList.add('active');
            
            // Load data for specific pages
            if (pageId === 'restaurants') {
                loadRestaurants();
            } else if (pageId === 'welcome') {
                loadStats();
            }
        }
        
        // Load dashboard stats
        async function loadStats() {
            try {
                const response = await fetch('/api/restaurants');
                const data = await response.json();
                if (data.status === 'success') {
                    const restaurants = data.data.restaurants;
                    document.getElementById('totalRestaurants').textContent = restaurants.length;
                    document.getElementById('activeRestaurants').textContent = 
                        restaurants.filter(r => r.isActive).length;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        // Load restaurants
        async function loadRestaurants() {
            const container = document.getElementById('restaurantsList');
            container.innerHTML = '<div class="loading">Loading restaurants...</div>';
            
            try {
                const response = await fetch('/api/restaurants');
                const data = await response.json();
                
                if (data.status === 'success') {
                    displayRestaurants(data.data.restaurants);
                } else {
                    container.innerHTML = '<div class="message error">Error loading restaurants</div>';
                }
            } catch (error) {
                container.innerHTML = '<div class="message error">Error loading restaurants</div>';
            }
        }
        
        // Display restaurants
        function displayRestaurants(restaurants) {
            const container = document.getElementById('restaurantsList');
            
            if (restaurants.length === 0) {
                container.innerHTML = '<div class="message">No restaurants found</div>';
                return;
            }
            
            container.innerHTML = restaurants.map(restaurant => \`
                <div class="restaurant-card">
                    <h3>\${restaurant.name}</h3>
                    <p><strong>Description:</strong> \${restaurant.description}</p>
                    <p><strong>Address:</strong> \${restaurant.address.street}, \${restaurant.address.city}, \${restaurant.address.state} \${restaurant.address.zipCode}</p>
                    <p><strong>Phone:</strong> \${restaurant.contact.phone}</p>
                    <p><strong>Email:</strong> \${restaurant.contact.email}</p>
                    <p><strong>Cuisine:</strong> \${restaurant.cuisine.join(', ')}</p>
                    <p><strong>Features:</strong> \${restaurant.features ? restaurant.features.join(', ') : 'None'}</p>
                    <p><strong>Rating:</strong> \${restaurant.rating}/5</p>
                    <p><strong>Status:</strong> \${restaurant.isActive ? 'Active' : 'Inactive'}</p>
                    <div class="restaurant-actions">
                        <button class="btn btn-danger" onclick="deleteRestaurant('\${restaurant._id}')">Delete</button>
                    </div>
                </div>
            \`).join('');
        }
        
        // Delete restaurant
        async function deleteRestaurant(id) {
            if (confirm('Are you sure you want to delete this restaurant?')) {
                try {
                    const response = await fetch('/api/restaurants/' + id, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        showMessage('Restaurant deleted successfully!', 'success');
                        loadRestaurants();
                        loadStats(); // Update stats
                    } else {
                        showMessage('Error deleting restaurant', 'error');
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, 'error');
                }
            }
        }
        
        // Show message
        function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = text;
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
            }, 5000);
        }
        
        // Handle form submission
        document.getElementById('restaurantForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const restaurantData = {
                name: formData.get('name'),
                description: formData.get('description'),
                address: {
                    street: formData.get('street'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    zipCode: formData.get('zipCode'),
                    country: 'USA'
                },
                contact: {
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    website: formData.get('website')
                },
                cuisine: Array.from(document.getElementById('cuisine').selectedOptions).map(option => option.value),
                features: Array.from(document.getElementById('features').selectedOptions).map(option => option.value),
                owner: '507f1f77bcf86cd799439011'
            };
            
            try {
                const response = await fetch('/api/restaurants', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(restaurantData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage('Restaurant created successfully!', 'success');
                    this.reset();
                    loadStats(); // Update stats
                } else {
                    showMessage('Error: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('Error: ' + error.message, 'error');
            }
        });
        
        // Load initial stats
        loadStats();
    </script>
</body>
</html>
  `);
});

module.exports = router;