const express = require('express');
const { body, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

// Validation middleware
const validateMenuItem = [
  body('name').notEmpty().withMessage('Menu item name is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('price').isNumeric().withMessage('Price must be a number').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('category').isIn(['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Salad', 'Soup', 'Pizza', 'Pasta', 'Sandwich', 'Other']).withMessage('Invalid category'),
  body('cuisine').isIn(['Italian', 'Chinese', 'Mexican', 'Indian', 'Thai', 'Japanese', 'American', 'Mediterranean', 'French', 'Other']).withMessage('Invalid cuisine'),
  body('restaurant').isMongoId().withMessage('Valid restaurant ID is required')
];

// @route   GET /api/menu
// @desc    Get all menu items with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      restaurant, 
      category, 
      cuisine, 
      minPrice, 
      maxPrice, 
      available,
      popular,
      search 
    } = req.query;

    const query = {};
    
    // Add filters
    if (restaurant) query.restaurant = restaurant;
    if (category) query.category = category;
    if (cuisine) query.cuisine = cuisine;
    if (available !== undefined) query.isAvailable = available === 'true';
    if (popular !== undefined) query.isPopular = popular === 'true';
    if (search) {
      query.$text = { $search: search };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const menuItems = await MenuItem.find(query)
      .populate('restaurant', 'name address.city')
      .sort({ category: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MenuItem.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        menuItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch menu items'
    });
  }
});

// @route   GET /api/menu/:id
// @desc    Get menu item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('restaurant', 'name address contact');

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.json({
      status: 'success',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch menu item'
    });
  }
});

// @route   POST /api/menu
// @desc    Create new menu item
// @access  Private (Restaurant Owner)
router.post('/', validateMenuItem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    res.status(201).json({
      status: 'success',
      message: 'Menu item created successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create menu item'
    });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private (Restaurant Owner)
router.put('/:id', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Menu item updated successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update menu item'
    });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private (Restaurant Owner)
router.delete('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete menu item'
    });
  }
});

// @route   PATCH /api/menu/:id/availability
// @desc    Toggle menu item availability
// @access  Private (Restaurant Owner)
router.patch('/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found'
      });
    }

    res.json({
      status: 'success',
      message: `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: { menuItem }
    });
  } catch (error) {
    console.error('Error updating menu item availability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update menu item availability'
    });
  }
});

// @route   GET /api/menu/categories/list
// @desc    Get all available categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category');
    
    res.json({
      status: 'success',
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories'
    });
  }
});

// @route   GET /api/menu/cuisines/list
// @desc    Get all available cuisines
// @access  Public
router.get('/cuisines/list', async (req, res) => {
  try {
    const cuisines = await MenuItem.distinct('cuisine');
    
    res.json({
      status: 'success',
      data: { cuisines }
    });
  } catch (error) {
    console.error('Error fetching cuisines:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cuisines'
    });
  }
});

module.exports = router;
