#!/bin/bash

# Let's Encrypt SSL Setup Script (FREE)
# This is the cheapest way to add HTTPS - completely free!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

print_header "Let's Encrypt SSL Setup (FREE)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Get domain name
echo "Enter your domain name (e.g., api.yourdomain.com):"
read DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required"
    exit 1
fi

print_header "Installing Certbot"

# Update package list
print_status "Updating package list..."
apt-get update

# Install certbot and nginx plugin
print_status "Installing certbot and nginx plugin..."
apt-get install -y certbot python3-certbot-nginx nginx

print_header "Configuring Nginx"

# Create nginx configuration for your Node.js app
print_status "Creating nginx configuration..."
cat > /etc/nginx/sites-available/restaurant-api << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
print_status "Enabling nginx site..."
ln -sf /etc/nginx/sites-available/restaurant-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
print_status "Testing nginx configuration..."
nginx -t

# Start nginx
print_status "Starting nginx..."
systemctl start nginx
systemctl enable nginx

print_header "Getting SSL Certificate"

# Get SSL certificate
print_status "Getting SSL certificate for $DOMAIN_NAME..."
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME

print_header "Setting up Auto-Renewal"

# Test auto-renewal
print_status "Testing certificate auto-renewal..."
certbot renew --dry-run

# Add cron job for auto-renewal (if not already exists)
if ! crontab -l | grep -q "certbot renew"; then
    print_status "Adding auto-renewal cron job..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
fi

print_header "Updating Node.js App for HTTPS"

# Update your Node.js app to work with nginx proxy
print_status "Updating server configuration for nginx proxy..."

# Create a backup of your current server.js
cp server.js server.js.backup

# Update the server to trust proxy headers
cat > server-nginx.js << 'EOF'
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

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy (important for nginx)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 80;

// Serve static files from public directory
app.use(express.static('public'));

// Ensure admin.js is accessible
app.get('/admin.js', (req, res) => {
  res.sendFile(__dirname + '/public/admin.js');
});

// Connect to database
connectDB();

// Security middleware
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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || `https://${process.env.DOMAIN_NAME}`,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
    https: req.secure || req.header('x-forwarded-proto') === 'https',
    domain: req.get('host')
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
  console.log(`HTTPS will be handled by nginx`);
});
EOF

print_status "Created server-nginx.js for nginx proxy setup"

print_header "Setting up Systemd Service"

# Create systemd service
cat > /etc/systemd/system/restaurant-api.service << EOF
[Unit]
Description=Restaurant API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
Environment=DOMAIN_NAME=$DOMAIN_NAME
ExecStart=/usr/bin/node server-nginx.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=restaurant-api

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
systemctl daemon-reload
systemctl enable restaurant-api
systemctl start restaurant-api

print_header "Setup Complete!"

print_status "Your HTTPS setup is now configured:"
echo "  Domain: $DOMAIN_NAME"
echo "  SSL Certificate: Let's Encrypt (FREE)"
echo "  Auto-renewal: Enabled"
echo "  Cost: $0/month"

print_status "Test your API:"
echo "  HTTPS: https://$DOMAIN_NAME/api/health"
echo "  HTTP: http://$DOMAIN_NAME/api/health (redirects to HTTPS)"

print_warning "Next steps:"
echo "1. Update your DNS to point $DOMAIN_NAME to this server"
echo "2. Test the HTTPS endpoint"
echo "3. Update your frontend to use HTTPS URLs"

# Create summary file
cat > letsencrypt-setup-summary.txt << EOF
Let's Encrypt SSL Setup Summary
==============================

Domain: $DOMAIN_NAME
SSL Certificate: Let's Encrypt (FREE)
Auto-renewal: Enabled
Cost: $0/month

Test URLs:
- https://$DOMAIN_NAME/api/health
- http://$DOMAIN_NAME/api/health (redirects to HTTPS)

Files created:
- /etc/nginx/sites-available/restaurant-api
- server-nginx.js (nginx-optimized server)
- /etc/systemd/system/restaurant-api.service

Next steps:
1. Update DNS records
2. Test HTTPS endpoints
3. Update frontend URLs
EOF

print_status "Summary saved to letsencrypt-setup-summary.txt"
print_status "Setup completed successfully! 🎉"
