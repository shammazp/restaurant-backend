const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');

// Import routes
const restaurantRoutes = require('./routes/restaurantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const publicUserRoutes = require('./routes/publicUserRoutes');
const exploreRoutes = require('./routes/exploreRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 80;

// Trust proxy - needed when behind load balancer/proxy (AWS ALB, CloudFront, etc.)
// This allows Express to correctly identify the client IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// Serve static files from public directory
app.use(express.static('public'));

// Ensure admin.js is accessible
app.get('/admin.js', (req, res) => {
  res.sendFile(__dirname + '/public/admin.js');
});

// Connect to database
connectDB();

// Middleware
if (process.env.NODE_ENV === 'production') {
  // Production security middleware
  app.use((req, res, next) => {
    // Force HTTPS redirect in production
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });

  // Enhanced security headers for production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Production CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://codecastle.store',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
} else {
  // Development middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true
  }));
}
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
// API routes - publicly accessible (not restricted by localhostOnly middleware)
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public-users', publicUserRoutes);
app.use('/api/explore', exploreRoutes);

// Admin routes - HTML dashboard pages only (restricted to localhost in production)
// These routes have localhostOnly middleware applied in adminRoutes.js
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Restaurant API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    https: req.secure || req.header('x-forwarded-proto') === 'https',
    // Security: Only show admin status in development
    adminAccessible: process.env.NODE_ENV !== 'production' ? 'Yes (development mode)' : 'No (production - localhost only)'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
