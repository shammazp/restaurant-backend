const express = require('express');
const router = express.Router();

// Import route modules
const dashboardRoutes = require('./dashboard');
const restaurantRoutes = require('./restaurants');
const linktreeRoutes = require('./linktree');
const exploreRoutes = require('./explore');
const comingSoonRoutes = require('./comingSoon');

// Mount routes
router.use('/', dashboardRoutes);
router.use('/', restaurantRoutes);
router.use('/', linktreeRoutes);
router.use('/', exploreRoutes);
router.use('/', comingSoonRoutes);

// Redirect root admin to dashboard
router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

module.exports = router;
