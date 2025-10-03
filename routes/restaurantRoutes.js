const express = require('express');
const { body, validationResult } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const router = express.Router();

// Validation middleware
const validateRestaurant = [
  body('name').notEmpty().withMessage('Restaurant name is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.zipCode').notEmpty().withMessage('ZIP code is required'),
  body('contact.phone').notEmpty().withMessage('Phone number is required'),
  body('contact.email').isEmail().withMessage('Valid email is required'),
  body('cuisine').isArray({ min: 1 }).withMessage('At least one cuisine type is required'),
];

// @route   GET /api/restaurants
// @desc    Get all restaurants
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, cuisine, city, search } = req.query;
    const query = { isActive: true };

    // Add filters
    if (cuisine) query.cuisine = { $in: cuisine.split(',') };
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (search) {
      query.$text = { $search: search };
    }

    const restaurants = await Restaurant.find(query)
      .populate('owner', 'name email')
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Restaurant.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        restaurants,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRestaurants: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurants'
    });
  }
});

// @route   GET /api/restaurants/:id
// @desc    Get restaurant by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'name email phone');

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      data: { restaurant }
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurant'
    });
  }
});

// @route   POST /api/restaurants
// @desc    Create new restaurant
// @access  Private (Restaurant Owner)
router.post('/', validateRestaurant, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // For now, we'll use a placeholder owner ID
    // In a real app, this would come from authentication middleware
    const restaurantData = {
      ...req.body,
      owner: req.body.owner || '507f1f77bcf86cd799439011' // Placeholder ObjectId
    };

    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    res.status(201).json({
      status: 'success',
      message: 'Restaurant created successfully',
      data: { restaurant }
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Restaurant with this information already exists'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create restaurant'
    });
  }
});

// @route   PUT /api/restaurants/:id
// @desc    Update restaurant
// @access  Private (Restaurant Owner)
router.put('/:id', validateRestaurant, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Restaurant updated successfully',
      data: { restaurant }
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update restaurant'
    });
  }
});

// @route   DELETE /api/restaurants/:id
// @desc    Delete restaurant (soft delete)
// @access  Private (Restaurant Owner)
router.delete('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete restaurant'
    });
  }
});

// @route   GET /api/restaurants/:id/menu
// @desc    Get restaurant menu
// @access  Public
router.get('/:id/menu', async (req, res) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const { category, available } = req.query;
    
    const query = { restaurant: req.params.id };
    if (category) query.category = category;
    if (available !== undefined) query.isAvailable = available === 'true';

    const menuItems = await MenuItem.find(query)
      .sort({ category: 1, name: 1 });

    res.json({
      status: 'success',
      data: { menuItems }
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch menu'
    });
  }
});

module.exports = router;
