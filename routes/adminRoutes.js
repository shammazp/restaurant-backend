const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .restaurant-card { background: #f9f9f9; border: 1px solid #eee; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Restaurant Admin Dashboard</h1>
        <div id="message"></div>
        
        <h2>Create New Restaurant</h2>
        <form id="restaurantForm">
            <div class="form-group">
                <label>Name:</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea name="description" required></textarea>
            </div>
            <div class="form-group">
                <label>Street:</label>
                <input type="text" name="address.street" required>
            </div>
            <div class="form-group">
                <label>City:</label>
                <input type="text" name="address.city" required>
            </div>
            <div class="form-group">
                <label>State:</label>
                <input type="text" name="address.state" required>
            </div>
            <div class="form-group">
                <label>ZIP:</label>
                <input type="text" name="address.zipCode" required>
            </div>
            <div class="form-group">
                <label>Country:</label>
                <input type="text" name="address.country" value="USA" required>
            </div>
            <div class="form-group">
                <label>Phone:</label>
                <input type="tel" name="contact.phone" required>
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" name="contact.email" required>
            </div>
            <div class="form-group">
                <label>Website:</label>
                <input type="text" name="contact.website">
            </div>
            <div class="form-group">
                <label>Cuisine:</label>
                <select name="cuisine" multiple required>
                    <option value="Italian">Italian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Indian">Indian</option>
                    <option value="American">American</option>
                </select>
            </div>
            <div class="form-group">
                <label>Features:</label>
                <select name="features" multiple>
                    <option value="Delivery">Delivery</option>
                    <option value="Takeout">Takeout</option>
                    <option value="Dine-in">Dine-in</option>
                </select>
            </div>
            <button type="submit">Create Restaurant</button>
        </form>

        <h2>Existing Restaurants</h2>
        <div id="restaurants"></div>
    </div>

    <script>
        const form = document.getElementById('restaurantForm');
        const restaurantsDiv = document.getElementById('restaurants');
        const messageDiv = document.getElementById('message');

        function showMessage(type, text) {
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = text;
            setTimeout(() => messageDiv.textContent = '', 5000);
        }

        async function loadRestaurants() {
            try {
                const response = await fetch('/api/restaurants');
                const data = await response.json();
                if (data.status === 'success') {
                    displayRestaurants(data.data.restaurants);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function displayRestaurants(restaurants) {
            restaurantsDiv.innerHTML = '';
            restaurants.forEach(restaurant => {
                const div = document.createElement('div');
                div.className = 'restaurant-card';
                div.innerHTML = '<h3>' + restaurant.name + '</h3>' +
                    '<p><strong>Description:</strong> ' + restaurant.description + '</p>' +
                    '<p><strong>Address:</strong> ' + restaurant.address.street + ', ' + restaurant.address.city + ', ' + restaurant.address.state + '</p>' +
                    '<p><strong>Contact:</strong> ' + restaurant.contact.phone + ' | ' + restaurant.contact.email + '</p>' +
                    '<p><strong>Cuisine:</strong> ' + restaurant.cuisine.join(', ') + '</p>' +
                    '<p><strong>Features:</strong> ' + restaurant.features.join(', ') + '</p>' +
                    '<button onclick="deleteRestaurant(\\'' + restaurant._id + '\\')">Delete</button>';
                restaurantsDiv.appendChild(div);
            });
        }

        async function deleteRestaurant(id) {
            if (confirm('Delete this restaurant?')) {
                try {
                    const response = await fetch('/api/restaurants/' + id, { method: 'DELETE' });
                    const data = await response.json();
                    if (data.status === 'success') {
                        showMessage('success', 'Restaurant deleted!');
                        loadRestaurants();
                    }
                } catch (error) {
                    showMessage('error', 'Delete failed');
                }
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    if (!data[parent]) data[parent] = {};
                    data[parent][child] = value;
                } else if (key === 'cuisine' || key === 'features') {
                    if (!data[key]) data[key] = [];
                    data[key].push(value);
                } else {
                    data[key] = value;
                }
            }

            const cuisineSelect = document.querySelector('select[name="cuisine"]');
            data.cuisine = Array.from(cuisineSelect.selectedOptions).map(o => o.value);

            const featuresSelect = document.querySelector('select[name="features"]');
            data.features = Array.from(featuresSelect.selectedOptions).map(o => o.value);

            data.owner = '507f1f77bcf86cd799439011';

            try {
                const response = await fetch('/api/restaurants', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showMessage('success', 'Restaurant created!');
                    form.reset();
                    loadRestaurants();
                } else {
                    showMessage('error', result.message);
                }
            } catch (error) {
                showMessage('error', 'Creation failed');
            }
        });

        loadRestaurants();
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error rendering admin dashboard:', error);
    res.status(500).send('<h1>Error loading admin dashboard</h1>');
  }
});

module.exports = router;