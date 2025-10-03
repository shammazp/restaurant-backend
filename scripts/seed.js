const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('../config/database');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

const seedData = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});

    console.log('Cleared existing data...');

    // Create users
    const users = await User.create([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'customer',
        phone: '+1234567890'
      },
      {
        name: 'Jane Smith',
        email: 'jane@restaurant.com',
        password: 'password123',
        role: 'restaurant_owner',
        phone: '+1234567891'
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        phone: '+1234567892'
      }
    ]);

    console.log('Created users...');

    // Create restaurants
    const restaurants = await Restaurant.create([
      {
        name: 'Mario\'s Italian Bistro',
        description: 'Authentic Italian cuisine with fresh ingredients and traditional recipes.',
        address: {
          street: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        contact: {
          phone: '+1234567890',
          email: 'info@mariosbistro.com',
          website: 'https://mariosbistro.com'
        },
        cuisine: ['Italian'],
        priceRange: '$$',
        rating: 4.5,
        operatingHours: {
          monday: { open: '11:00', close: '22:00', closed: false },
          tuesday: { open: '11:00', close: '22:00', closed: false },
          wednesday: { open: '11:00', close: '22:00', closed: false },
          thursday: { open: '11:00', close: '22:00', closed: false },
          friday: { open: '11:00', close: '23:00', closed: false },
          saturday: { open: '11:00', close: '23:00', closed: false },
          sunday: { open: '12:00', close: '21:00', closed: false }
        },
        features: ['Dine-in', 'Takeout', 'Delivery'],
        owner: users[1]._id
      },
      {
        name: 'Golden Dragon Chinese',
        description: 'Traditional Chinese dishes with modern presentation.',
        address: {
          street: '456 Oak Avenue',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
          country: 'USA'
        },
        contact: {
          phone: '+1234567891',
          email: 'info@goldendragon.com',
          website: 'https://goldendragon.com'
        },
        cuisine: ['Chinese'],
        priceRange: '$$',
        rating: 4.2,
        operatingHours: {
          monday: { open: '10:00', close: '23:00', closed: false },
          tuesday: { open: '10:00', close: '23:00', closed: false },
          wednesday: { open: '10:00', close: '23:00', closed: false },
          thursday: { open: '10:00', close: '23:00', closed: false },
          friday: { open: '10:00', close: '24:00', closed: false },
          saturday: { open: '10:00', close: '24:00', closed: false },
          sunday: { open: '10:00', close: '22:00', closed: false }
        },
        features: ['Dine-in', 'Takeout', 'Delivery'],
        owner: users[1]._id
      }
    ]);

    console.log('Created restaurants...');

    // Create menu items
    await MenuItem.create([
      // Mario's Italian Bistro items
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
        price: 16.99,
        category: 'Pizza',
        cuisine: 'Italian',
        ingredients: ['Tomato sauce', 'Mozzarella', 'Fresh basil', 'Olive oil'],
        allergens: ['Dairy', 'Gluten'],
        dietaryInfo: ['Vegetarian'],
        preparationTime: 15,
        isAvailable: true,
        isPopular: true,
        restaurant: restaurants[0]._id
      },
      {
        name: 'Spaghetti Carbonara',
        description: 'Creamy pasta with eggs, cheese, and pancetta',
        price: 18.99,
        category: 'Pasta',
        cuisine: 'Italian',
        ingredients: ['Spaghetti', 'Eggs', 'Parmesan', 'Pancetta', 'Black pepper'],
        allergens: ['Dairy', 'Gluten', 'Eggs'],
        dietaryInfo: [],
        preparationTime: 20,
        isAvailable: true,
        isPopular: true,
        restaurant: restaurants[0]._id
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing and croutons',
        price: 12.99,
        category: 'Salad',
        cuisine: 'Italian',
        ingredients: ['Romaine lettuce', 'Caesar dressing', 'Parmesan', 'Croutons'],
        allergens: ['Dairy', 'Gluten'],
        dietaryInfo: [],
        preparationTime: 10,
        isAvailable: true,
        isPopular: false,
        restaurant: restaurants[0]._id
      },
      // Golden Dragon Chinese items
      {
        name: 'Kung Pao Chicken',
        description: 'Spicy stir-fried chicken with peanuts and vegetables',
        price: 15.99,
        category: 'Main Course',
        cuisine: 'Chinese',
        ingredients: ['Chicken', 'Peanuts', 'Bell peppers', 'Soy sauce', 'Chili peppers'],
        allergens: ['Soy', 'Nuts'],
        dietaryInfo: [],
        preparationTime: 15,
        isAvailable: true,
        isPopular: true,
        restaurant: restaurants[1]._id
      },
      {
        name: 'Sweet and Sour Pork',
        description: 'Crispy pork with sweet and sour sauce',
        price: 14.99,
        category: 'Main Course',
        cuisine: 'Chinese',
        ingredients: ['Pork', 'Pineapple', 'Bell peppers', 'Sweet and sour sauce'],
        allergens: [],
        dietaryInfo: [],
        preparationTime: 18,
        isAvailable: true,
        isPopular: true,
        restaurant: restaurants[1]._id
      },
      {
        name: 'Spring Rolls',
        description: 'Crispy vegetable spring rolls with dipping sauce',
        price: 8.99,
        category: 'Appetizer',
        cuisine: 'Chinese',
        ingredients: ['Vegetables', 'Spring roll wrapper', 'Dipping sauce'],
        allergens: ['Gluten'],
        dietaryInfo: ['Vegetarian'],
        preparationTime: 10,
        isAvailable: true,
        isPopular: false,
        restaurant: restaurants[1]._id
      }
    ]);

    console.log('Created menu items...');
    console.log('Database seeded successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
