const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

const router = express.Router();

// Validation middleware for creating orders
const validateOrder = [
  body('customer.name').notEmpty().withMessage('Customer name is required').trim(),
  body('customer.email').isEmail().withMessage('Valid customer email is required'),
  body('customer.phone').notEmpty().withMessage('Customer phone is required').trim(),
  body('restaurant').isMongoId().withMessage('Valid restaurant ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderType').isIn(['dine-in', 'takeout', 'delivery']).withMessage('Invalid order type'),
  body('paymentMethod').isIn(['cash', 'card', 'digital_wallet', 'other']).withMessage('Invalid payment method')
];

// @route   GET /api/orders
// @desc    Get all orders with filters
// @access  Private (Restaurant Owner/Admin)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      restaurant, 
      status, 
      orderType,
      startDate,
      endDate,
      customerEmail 
    } = req.query;

    const query = {};
    
    // Add filters
    if (restaurant) query.restaurant = restaurant;
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    if (customerEmail) query['customer.email'] = new RegExp(customerEmail, 'i');
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('restaurant', 'name address.city')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address contact')
      .populate('items.menuItem', 'name description price category images');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order'
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Public
router.post('/', validateOrder, async (req, res) => {
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

    // Calculate prices for each item
    const itemsWithPrices = [];
    let subtotal = 0;

    for (const item of req.body.items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({
          status: 'error',
          message: `Menu item with ID ${item.menuItem} not found`
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          status: 'error',
          message: `Menu item "${menuItem.name}" is not available`
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      itemsWithPrices.push({
        menuItem: item.menuItem,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Calculate tax (assuming 8.5% tax rate)
    const taxRate = 0.085;
    const tax = subtotal * taxRate;

    // Calculate delivery fee (if applicable)
    const deliveryFee = req.body.orderType === 'delivery' ? 5.99 : 0;

    // Calculate total
    const total = subtotal + tax + deliveryFee + (req.body.tip || 0);

    const orderData = {
      ...req.body,
      items: itemsWithPrices,
      subtotal,
      tax,
      deliveryFee,
      total
    };

    const order = new Order(orderData);
    await order.save();

    // Populate the created order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('restaurant', 'name address contact')
      .populate('items.menuItem', 'name description price category');

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create order'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Restaurant Owner/Admin)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'delivered' && { actualDeliveryTime: new Date() })
      },
      { new: true }
    ).populate('restaurant', 'name')
     .populate('items.menuItem', 'name price');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update order status'
    });
  }
});

// @route   PUT /api/orders/:id/payment
// @desc    Update payment status
// @access  Private (Restaurant Owner/Admin)
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment status. Must be one of: ' + validPaymentStatuses.join(', ')
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Payment status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update payment status'
    });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel order'
    });
  }
});

// @route   GET /api/orders/customer/:email
// @desc    Get orders by customer email
// @access  Public
router.get('/customer/:email', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const orders = await Order.find({ 'customer.email': req.params.email })
      .populate('restaurant', 'name address.city')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments({ 'customer.email': req.params.email });

    res.json({
      status: 'success',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer orders'
    });
  }
});

// @route   GET /api/orders/stats/summary
// @desc    Get order statistics
// @access  Private (Restaurant Owner/Admin)
router.get('/stats/summary', async (req, res) => {
  try {
    const { restaurant, startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (restaurant) matchQuery.restaurant = restaurant;
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: { stats: stats[0] || {} }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order statistics'
    });
  }
});

module.exports = router;
