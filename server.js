const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const LinkTree = require('./models/LinkTree');

// Import routes
const restaurantRoutes = require('./routes/restaurantRoutes');
const adminRoutes = require('./routes/admin');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const publicUserRoutes = require('./routes/publicUserRoutes');
const exploreRoutes = require('./routes/exploreRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 80;

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
        imgSrc: ["'self'", "data:", "https:", "http:", "*"],
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

// Public Link Tree Route
app.get('/linktree', async (req, res) => {
  try {
    const LTN = req.query.LTN;
    
    if (!LTN) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Tree - Error</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #f5f5f7;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .error-container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            h1 { color: #dc3545; margin-bottom: 16px; }
            p { color: #86868b; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Missing LTN Parameter</h1>
            <p>Please provide an LTN parameter in the URL. Example: /linktree?LTN=1</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const account = await LinkTree.findOne({ LTN: parseInt(LTN), isActive: true });
    
    if (!account) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Tree - Not Found</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #f5f5f7;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .error-container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            h1 { color: #dc3545; margin-bottom: 16px; }
            p { color: #86868b; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Link Tree Not Found</h1>
            <p>No active link tree account found with LTN=${LTN}</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Check if banner should be shown
    const showBanner = account.bannerImage && account.bannerImage.url && !account.isBannerHidden;
    
    // Escape HTML to prevent XSS and ensure proper URL encoding
    const accountName = (account.accountName || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    let bannerUrl = '';
    if (showBanner && account.bannerImage.url) {
      bannerUrl = account.bannerImage.url;
      // Log for debugging
      console.log('Banner URL:', bannerUrl);
      // Ensure URL is properly formatted
      if (!bannerUrl.startsWith('http://') && !bannerUrl.startsWith('https://')) {
        console.warn('Banner URL does not start with http:// or https://:', bannerUrl);
      }
      // Escape for HTML
      bannerUrl = bannerUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="referrer" content="no-referrer-when-downgrade">
        <title>${accountName} - Link Tree</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #1d1d1f;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .banner-container {
            width: 100%;
            ${showBanner ? '' : 'display: none;'}
          }
          
          .banner-image {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            display: block;
          }
          
          .content-container {
            max-width: 600px;
            width: 100%;
            margin: 0 auto;
            padding: 40px 20px;
            text-align: center;
          }
          
          .account-name {
            font-size: 36px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 24px;
          }
          
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #86868b;
          }
          
          .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        ${showBanner ? `
        <div class="banner-container">
          <img src="${bannerUrl}" alt="${accountName} Banner" class="banner-image" onerror="console.error('Failed to load banner image:', this.src); this.style.display='none';">
        </div>
        ` : ''}
        
        <div class="content-container">
          <h1 class="account-name">${accountName}</h1>
          
          <div class="empty-state">
            <div class="empty-state-icon">🔗</div>
            <h2>Link Tree</h2>
            <p>Links and content will appear here</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error loading link tree:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Tree - Error</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f7;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .error-container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          h1 { color: #dc3545; margin-bottom: 16px; }
          p { color: #86868b; margin-bottom: 24px; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Error</h1>
          <p>An error occurred while loading the link tree. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/admin', adminRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public-users', publicUserRoutes);
app.use('/api/explore', exploreRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
