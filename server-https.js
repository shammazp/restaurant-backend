const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

// Import routes
const restaurantRoutes = require('./routes/restaurantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// Serve static files from public directory
app.use(express.static('public'));

// Ensure admin.js is accessible
app.get('/admin.js', (req, res) => {
  res.sendFile(__dirname + '/public/admin.js');
});

// Connect to database
connectDB();

// Production security middleware
if (process.env.NODE_ENV === 'production') {
  // Force HTTPS redirect
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });

  // Enhanced security headers
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
    origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
} else {
  // Development middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: true,
    credentials: true
  }));
}

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/admin', adminRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Restaurant API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    https: req.secure || req.header('x-forwarded-proto') === 'https'
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

// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Start HTTPS server if certificates are available
if (process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true') {
  try {
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key'),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt')
    };

    https.createServer(options, app).listen(HTTPS_PORT, () => {
      console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`Health check: https://localhost:${HTTPS_PORT}/api/health`);
    });
  } catch (error) {
    console.warn('HTTPS server not started - SSL certificates not found');
    console.warn('Consider using ALB or CloudFront for HTTPS in production');
  }
}
