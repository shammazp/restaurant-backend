#!/bin/bash

# Simple CloudFront Setup Script for Restaurant Backend
# Cost: ~$1/month with free SSL certificates

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

print_header "CloudFront Setup for Restaurant API (Cost: ~$1/month)"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI is not configured. Please run:"
    echo "aws configure"
    echo ""
    echo "You'll need:"
    echo "1. AWS Access Key ID"
    echo "2. AWS Secret Access Key"
    echo "3. Default region (e.g., us-east-1)"
    echo "4. Default output format (json)"
    echo ""
    echo "Get these from: AWS Console > IAM > Users > Your User > Security Credentials"
    exit 1
fi

print_status "AWS CLI is configured ✓"

# Get user input
echo ""
echo "Enter your domain name (e.g., api.yourdomain.com):"
read DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
echo "Enter your server's public IP or domain (where your Node.js app is running):"
read ORIGIN_DOMAIN

if [ -z "$ORIGIN_DOMAIN" ]; then
    print_error "Origin domain is required"
    exit 1
fi

print_header "Step 1: Requesting SSL Certificate"

print_status "Requesting SSL certificate for $DOMAIN_NAME..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)

print_status "Certificate ARN: $CERT_ARN"
print_warning "You need to validate this certificate:"
echo "1. Go to AWS Console > Certificate Manager"
echo "2. Find your certificate and click 'Create record in Route 53' or add DNS record manually"
echo "3. Wait for validation (usually 5-10 minutes)"

print_header "Step 2: Creating CloudFront Distribution"

print_status "Creating CloudFront distribution..."

# Create distribution configuration
DISTRIBUTION_CONFIG=$(cat << EOF
{
  "CallerReference": "restaurant-api-$(date +%s)",
  "Comment": "Restaurant API CloudFront Distribution",
  "DefaultCacheBehavior": {
    "TargetOriginId": "restaurant-api-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Host", "Authorization", "X-Forwarded-For", "X-Real-IP"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "Compress": true
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "restaurant-api-origin",
        "DomainName": "$ORIGIN_DOMAIN",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["$DOMAIN_NAME"]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF
)

# Create the distribution
print_status "Creating CloudFront distribution (this may take a few minutes)..."
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config "$DISTRIBUTION_CONFIG" \
    --query 'Distribution.Id' \
    --output text)

print_status "Distribution ID: $DISTRIBUTION_ID"

# Get distribution details
print_status "Getting distribution details..."
DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' \
    --output text)

print_status "CloudFront Domain: $DISTRIBUTION_DOMAIN"

print_header "Step 3: Setting up Monitoring"

# Create CloudWatch alarm for distribution
print_status "Creating CloudWatch alarm for monitoring..."
aws cloudwatch put-metric-alarm \
    --alarm-name "Restaurant-API-CloudFront-4xx-Errors" \
    --alarm-description "Alert when 4xx errors exceed threshold" \
    --metric-name "4xxErrorRate" \
    --namespace "AWS/CloudFront" \
    --statistic "Average" \
    --period 300 \
    --threshold 5.0 \
    --comparison-operator "GreaterThanThreshold" \
    --evaluation-periods 2 \
    --dimensions Name=DistributionId,Value=$DISTRIBUTION_ID \
    --region us-east-1

print_header "Setup Complete! 🎉"

print_status "Your CloudFront distribution is configured:"
echo "  Distribution ID: $DISTRIBUTION_ID"
echo "  CloudFront Domain: $DISTRIBUTION_DOMAIN"
echo "  Custom Domain: $DOMAIN_NAME"
echo "  Certificate ARN: $CERT_ARN"

print_warning "Next steps:"
echo "1. ✅ Validate your SSL certificate in AWS Certificate Manager"
echo "2. ✅ Update your DNS to point $DOMAIN_NAME to $DISTRIBUTION_DOMAIN"
echo "3. ✅ Wait for CloudFront deployment (5-15 minutes)"
echo "4. ✅ Test your API endpoints"

print_status "Test URLs:"
echo "  CloudFront: https://$DISTRIBUTION_DOMAIN/api/health"
echo "  Custom Domain: https://$DOMAIN_NAME/api/health (after DNS update)"

print_status "Cost breakdown:"
echo "  CloudFront: ~$1/month"
echo "  SSL Certificate: FREE"
echo "  Total: ~$1/month"

# Create a summary file
cat > cloudfront-setup-summary.txt << EOF
CloudFront Setup Summary
========================

Distribution ID: $DISTRIBUTION_ID
CloudFront Domain: $DISTRIBUTION_DOMAIN
Custom Domain: $DOMAIN_NAME
Certificate ARN: $CERT_ARN
Origin Domain: $ORIGIN_DOMAIN

Cost: ~$1/month
SSL Certificate: FREE

Next Steps:
1. Validate SSL certificate in AWS Console
2. Update DNS records
3. Wait for CloudFront deployment
4. Test API endpoints

Test URLs:
- https://$DISTRIBUTION_DOMAIN/api/health
- https://$DOMAIN_NAME/api/health (after DNS update)

DNS Configuration:
Point $DOMAIN_NAME to $DISTRIBUTION_DOMAIN
EOF

print_status "Summary saved to cloudfront-setup-summary.txt"
print_status "Setup completed successfully! 🚀"
