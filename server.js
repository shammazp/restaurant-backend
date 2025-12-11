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
            height: auto;
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
          
          .buttons-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 32px;
          }
          
          .link-button {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            background: #ffffff;
            border: 2px solid #e5e5e7;
            border-radius: 12px;
            text-decoration: none;
            color: #1d1d1f;
            transition: all 0.2s ease;
            cursor: pointer;
          }
          
          .link-button:hover {
            border-color: #007aff;
            background: #f5f5f7;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 122, 255, 0.15);
          }
          
          .button-icon {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 8px;
            flex-shrink: 0;
          }
          
          .button-icon-placeholder {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f7;
            border-radius: 8px;
            font-size: 24px;
            flex-shrink: 0;
          }
          
          .button-label {
            font-size: 18px;
            font-weight: 500;
            flex: 1;
            text-align: left;
          }
          
          .footer {
            text-align: center;
            padding: 40px 20px;
            margin-top: 60px;
          }
          
          .footer-link {
            color: #000000;
            text-decoration: none;
            font-size: 14px;
            font-weight: 400;
            transition: opacity 0.2s ease;
          }
          
          .footer-link:hover {
            opacity: 0.7;
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
          
          ${(account.buttons && account.buttons.length > 0) ? (() => {
            const sortedButtons = account.buttons.sort((a, b) => (a.order || 0) - (b.order || 0));
            return sortedButtons.map(button => {
              const iconUrl = button.icon && button.icon.url ? button.icon.url : '';
              const hasIcon = iconUrl && iconUrl.trim() !== '' && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://') || iconUrl.startsWith('data:'));
              const buttonLabel = (button.label || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              const buttonLink = (button.link || '#').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              const safeIconUrl = hasIcon ? iconUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
              
              return hasIcon 
                ? `<a href="${buttonLink}" target="_blank" rel="noopener noreferrer" class="link-button">
                    <img src="${safeIconUrl}" alt="${buttonLabel}" class="button-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="button-icon-placeholder" style="display: none;">🔗</div>
                    <span class="button-label">${buttonLabel}</span>
                  </a>`
                : `<a href="${buttonLink}" target="_blank" rel="noopener noreferrer" class="link-button">
                    <div class="button-icon-placeholder">🔗</div>
                    <span class="button-label">${buttonLabel}</span>
                  </a>`;
            }).join('');
          })() : `
            <div class="empty-state">
              <div class="empty-state-icon">🔗</div>
              <h2>Link Tree</h2>
              <p>No buttons added yet. Add buttons from the admin panel.</p>
            </div>
          `}
        </div>
        
        <div class="footer">
          <a href="/" class="footer-link">powered by kochi.one</a>
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
