#!/bin/bash

# Production Deployment Script for Restaurant Backend
# This script sets up the production environment with HTTPS support

set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (not recommended for production)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended for production"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --production

# Create production environment file if it doesn't exist
if [ ! -f .env.production ]; then
    print_status "Creating production environment file..."
    cp env.production.example .env.production
    print_warning "Please update .env.production with your actual values"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p /var/log/restaurant-api
mkdir -p /etc/ssl/private
mkdir -p /etc/ssl/certs

# Set up log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/restaurant-api << EOF
/var/log/restaurant-api/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload restaurant-api || true
    endscript
}
EOF

# Create systemd service file
print_status "Creating systemd service..."
cat > /etc/systemd/system/restaurant-api.service << EOF
[Unit]
Description=Restaurant API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
EnvironmentFile=$(pwd)/.env.production
ExecStart=/usr/bin/node server-https.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=restaurant-api

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
print_status "Enabling and starting service..."
systemctl daemon-reload
systemctl enable restaurant-api

# Set up firewall rules
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

# Set up SSL certificates (if using direct HTTPS)
if [ "$USE_HTTPS" = "true" ]; then
    print_status "Setting up SSL certificates..."
    print_warning "Make sure to place your SSL certificates in:"
    print_warning "  Private key: /etc/ssl/private/server.key"
    print_warning "  Certificate: /etc/ssl/certs/server.crt"
fi

# Set proper permissions
print_status "Setting permissions..."
chown -R www-data:www-data .
chmod 755 .
chmod 644 .env.production

# Create health check script
print_status "Creating health check script..."
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for load balancer

HEALTH_URL="http://localhost:80/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "OK"
    exit 0
else
    echo "FAIL"
    exit 1
fi
EOF

chmod +x scripts/health-check.sh

print_status "Deployment completed successfully!"
print_status "Next steps:"
echo "1. Update .env.production with your actual values"
echo "2. Start the service: systemctl start restaurant-api"
echo "3. Check status: systemctl status restaurant-api"
echo "4. View logs: journalctl -u restaurant-api -f"

if [ "$USE_HTTPS" = "true" ]; then
    echo "5. Place SSL certificates in /etc/ssl/private/ and /etc/ssl/certs/"
fi

echo ""
print_status "For AWS ALB setup, see HTTPS_SETUP.md"
print_status "For CloudFront setup, see HTTPS_SETUP.md"
