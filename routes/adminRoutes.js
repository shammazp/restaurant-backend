const express = require('express');
const Restaurant = require('../models/Restaurant');
const router = express.Router();

// Serve admin dashboard
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .form-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .form-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5rem;
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
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .form-row-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 30px;
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
        
        .btn-secondary {
            background: linear-gradient(135deg, #6c757d, #495057);
        }
        
        .restaurants-section {
            margin-top: 40px;
        }
        
        .restaurant-card {
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .restaurant-card h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .restaurant-card p {
            color: #666;
            margin-bottom: 5px;
        }
        
        .restaurant-actions {
            margin-top: 15px;
        }
        
        .btn-small {
            padding: 8px 16px;
            font-size: 14px;
            margin-right: 10px;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        @media (max-width: 768px) {
            .form-row,
            .form-row-3 {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ Restaurant Admin Dashboard</h1>
            <p>Manage your restaurants with ease</p>
        </div>
        
        <div class="content">
            <!-- Add Restaurant Form -->
            <div class="form-section">
                <h2>➕ Add New Restaurant</h2>
                <form id="restaurantForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="name">Restaurant Name *</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="cuisine">Cuisine Type *</label>
                            <select id="cuisine" name="cuisine" required multiple>
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
                    
                    <div class="form-row-3">
                        <div class="form-group">
                            <label for="street">Street Address *</label>
                            <input type="text" id="street" name="street" required>
                        </div>
                        <div class="form-group">
                            <label for="city">City *</label>
                            <input type="text" id="city" name="city" required>
                        </div>
                        <div class="form-group">
                            <label for="state">State *</label>
                            <input type="text" id="state" name="state" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="zipCode">ZIP Code *</label>
                            <input type="text" id="zipCode" name="zipCode" required>
                        </div>
                        <div class="form-group">
                            <label for="country">Country</label>
                            <input type="text" id="country" name="country" value="USA">
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
            
            <!-- Restaurants List -->
            <div class="restaurants-section">
                <h2>📋 All Restaurants</h2>
                <div id="restaurantsList">
                    <div class="loading">Loading restaurants...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Load restaurants on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadRestaurants();
        });

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
                    country: formData.get('country') || 'USA'
                },
                contact: {
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    website: formData.get('website')
                },
                cuisine: Array.from(document.getElementById('cuisine').selectedOptions).map(option => option.value),
                features: Array.from(document.getElementById('features').selectedOptions).map(option => option.value),
                owner: '507f1f77bcf86cd799439011' // Placeholder owner ID
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
                    showAlert('Restaurant created successfully!', 'success');
                    this.reset();
                    loadRestaurants();
                } else {
                    showAlert('Error: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        });

        // Load restaurants
        async function loadRestaurants() {
            try {
                const response = await fetch('/api/restaurants');
                const result = await response.json();

                if (response.ok) {
                    displayRestaurants(result.data.restaurants);
                } else {
                    document.getElementById('restaurantsList').innerHTML = 
                        '<div class="alert alert-error">Error loading restaurants</div>';
                }
            } catch (error) {
                document.getElementById('restaurantsList').innerHTML = 
                    '<div class="alert alert-error">Error loading restaurants</div>';
            }
        }

        // Display restaurants
        function displayRestaurants(restaurants) {
            const container = document.getElementById('restaurantsList');
            
            if (restaurants.length === 0) {
                container.innerHTML = '<div class="alert">No restaurants found</div>';
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
                        <button class="btn btn-small btn-secondary" onclick="editRestaurant('\${restaurant._id}')">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="deleteRestaurant('\${restaurant._id}')">Delete</button>
                    </div>
                </div>
            \`).join('');
        }

        // Show alert
        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert alert-\${type}\`;
            alertDiv.textContent = message;
            
            document.querySelector('.content').insertBefore(alertDiv, document.querySelector('.form-section'));
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }

        // Edit restaurant
        function editRestaurant(id) {
            showAlert('Edit functionality coming soon!', 'error');
        }

        // Delete restaurant
        async function deleteRestaurant(id) {
            if (confirm('Are you sure you want to delete this restaurant?')) {
                try {
                    const response = await fetch(\`/api/restaurants/\${id}\`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showAlert('Restaurant deleted successfully!', 'success');
                        loadRestaurants();
                    } else {
                        showAlert('Error deleting restaurant', 'error');
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'error');
                }
            }
        }
    </script>
</body>
</html>
  `);
});

module.exports = router;
