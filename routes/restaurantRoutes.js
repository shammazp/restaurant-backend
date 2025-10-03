const express = require('express');
const { body, validationResult } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { uploadSingle, uploadCombined, processAndUploadImage, processAndUploadCoverImages, handleUploadError } = require('../middleware/upload');
const { deleteFromS3 } = require('../config/s3');

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

// Simplified validation for basic restaurant creation
const validateBasicRestaurant = [
  body('name').notEmpty().withMessage('Restaurant name is required').trim(),
  body('contact.phone').notEmpty().withMessage('Phone number is required'),
  body('contact.email').isEmail().withMessage('Valid email is required'),
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

// @route   GET /api/restaurants/biz/:biz_id
// @desc    Get restaurant by business ID
// @access  Public
router.get('/biz/:biz_id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ biz_id: req.params.biz_id })
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
    console.error('Error fetching restaurant by business ID:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch restaurant'
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
router.post('/', validateBasicRestaurant, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Parse restaurant data from FormData
    let restaurantData;
    if (req.body.data) {
      // Data sent as FormData with JSON string
      restaurantData = JSON.parse(req.body.data);
    } else {
      // Data sent as JSON
      restaurantData = req.body;
    }
    
    // Add logo data if present
    if (req.body.logo) {
      restaurantData.logo = req.body.logo;
    }
    
    // Set default values for required fields
    restaurantData.description = restaurantData.description || 'Restaurant description will be added later';
    restaurantData.address = restaurantData.address || {
      street: 'Address to be added',
      city: 'City to be added',
      state: 'State to be added',
      zipCode: '00000',
      country: 'USA'
    };
    restaurantData.cuisine = restaurantData.cuisine || ['Other'];
    restaurantData.features = restaurantData.features || ['Dine-in'];
    restaurantData.owner = restaurantData.owner || '507f1f77bcf86cd799439011';

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
router.put('/:id', uploadCombined, processAndUploadImage, processAndUploadCoverImages, handleUploadError, async (req, res) => {
  try {

    // Parse restaurant data from FormData
    let restaurantData;
    if (req.body.data) {
      // Data sent as FormData with JSON string
      restaurantData = JSON.parse(req.body.data);
    } else {
      // Data sent as JSON
      restaurantData = req.body;
    }
    
    // Add logo data if present
    if (req.body.logo) {
      restaurantData.logo = req.body.logo;
    }
    
    // Add cover images data if present
    if (req.body.coverImages) {
      restaurantData.coverImages = req.body.coverImages;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      restaurantData,
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

// @route   POST /api/restaurants/:id/logo
// @desc    Upload restaurant logo
// @access  Private (Restaurant Owner)
router.post('/:id/logo', uploadSingle, processAndUploadImage, handleUploadError, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Delete old logo from S3 if exists
    if (restaurant.logo && restaurant.logo.key) {
      await deleteFromS3(restaurant.logo.key);
    }

    // Update restaurant with new logo
    restaurant.logo = req.body.logo;
    await restaurant.save();

    res.json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo: restaurant.logo }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload logo'
    });
  }
});

// @route   POST /api/restaurants/biz/:biz_id/logo
// @desc    Upload restaurant logo by business ID
// @access  Private (Restaurant Owner)
router.post('/biz/:biz_id/logo', uploadSingle, processAndUploadImage, handleUploadError, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ biz_id: req.params.biz_id });
    
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Delete old logo from S3 if exists
    if (restaurant.logo && restaurant.logo.key) {
      await deleteFromS3(restaurant.logo.key);
    }

    // Update restaurant with new logo
    restaurant.logo = req.body.logo;
    await restaurant.save();

    res.json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo: restaurant.logo }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload logo'
    });
  }
});

// @route   DELETE /api/restaurants/:id/logo
// @desc    Delete restaurant logo
// @access  Private (Restaurant Owner)
router.delete('/:id/logo', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Delete logo from S3 if exists
    if (restaurant.logo && restaurant.logo.key) {
      await deleteFromS3(restaurant.logo.key);
    }

    // Remove logo from restaurant
    restaurant.logo = undefined;
    await restaurant.save();

    res.json({
      status: 'success',
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete logo'
    });
  }
});

// @route   DELETE /api/restaurants/biz/:biz_id/logo
// @desc    Delete restaurant logo by business ID
// @access  Private (Restaurant Owner)
router.delete('/biz/:biz_id/logo', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ biz_id: req.params.biz_id });
    
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    // Delete logo from S3 if exists
    if (restaurant.logo && restaurant.logo.key) {
      await deleteFromS3(restaurant.logo.key);
    }

    // Remove logo from restaurant
    restaurant.logo = undefined;
    await restaurant.save();

    res.json({
      status: 'success',
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete logo'
    });
  }
});

// @route   DELETE /api/restaurants/biz/:biz_id/cover-images/:imageKey
// @desc    Delete specific cover image by business ID and image key
// @access  Private (Restaurant Owner)
router.delete('/biz/:biz_id/cover-images/:imageKey', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ biz_id: req.params.biz_id });
    
    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurant not found'
      });
    }

    const imageKey = req.params.imageKey;
    const coverImage = restaurant.coverImages.find(img => img.key === imageKey);
    
    if (!coverImage) {
      return res.status(404).json({
        status: 'error',
        message: 'Cover image not found'
      });
    }

    // Delete from S3
    const deleteResult = await deleteFromS3(imageKey);
    
    if (deleteResult.success) {
      // Remove cover image from database
      restaurant.coverImages = restaurant.coverImages.filter(img => img.key !== imageKey);
      await restaurant.save();
      
      res.json({
        status: 'success',
        message: 'Cover image deleted successfully'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete cover image from S3'
      });
    }
  } catch (error) {
    console.error('Error deleting cover image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete cover image'
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
