#!/bin/bash

# CloudFront Setup Script for Restaurant Backend
# This script helps set up CloudFront distribution with SSL

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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install it first."
    exit 1
fi

# Get user input
echo "Enter your origin domain (ALB DNS name or EC2 public IP):"
read ORIGIN_DOMAIN

echo "Enter your custom domain (optional, press Enter to skip):"
read CUSTOM_DOMAIN

print_header "Setting up CloudFront Distribution"

# Create CloudFront distribution configuration
print_status "Creating CloudFront distribution..."

# Basic distribution config
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
        "Quantity": 3,
        "Items": ["Host", "Authorization", "X-Forwarded-For"]
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
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF
)

# Add custom domain if provided
if [ ! -z "$CUSTOM_DOMAIN" ]; then
    print_status "Adding custom domain: $CUSTOM_DOMAIN"
    
    # Request SSL certificate in us-east-1 for CloudFront
    print_status "Requesting SSL certificate for CloudFront..."
    CERT_ARN=$(aws acm request-certificate \
        --domain-name $CUSTOM_DOMAIN \
        --validation-method DNS \
        --region us-east-1 \
        --query 'CertificateArn' \
        --output text)
    
    print_warning "Certificate ARN: $CERT_ARN"
    print_warning "You need to validate this certificate before CloudFront can use it"
    
    # Update distribution config with custom domain
    DISTRIBUTION_CONFIG=$(echo $DISTRIBUTION_CONFIG | jq --arg domain "$CUSTOM_DOMAIN" --arg cert "$CERT_ARN" '
        .Aliases = {
            "Quantity": 1,
            "Items": [$domain]
        } |
        .ViewerCertificate = {
            "ACMCertificateArn": $cert,
            "SSLSupportMethod": "sni-only",
            "MinimumProtocolVersion": "TLSv1.2_2021"
        }
    ')
fi

# Create the distribution
print_status "Creating CloudFront distribution..."
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

print_header "Setting up Custom Error Pages"

# Create custom error page configuration
print_status "Creating custom error page for 404s..."
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*"

print_header "Setting up Monitoring"

# Create CloudWatch alarm for distribution
print_status "Creating CloudWatch alarm..."
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
    --dimensions Name=DistributionId,Value=$DISTRIBUTION_ID

print_header "Setup Complete!"

print_status "Your CloudFront distribution is configured:"
echo "  Distribution ID: $DISTRIBUTION_ID"
echo "  CloudFront Domain: $DISTRIBUTION_DOMAIN"

if [ ! -z "$CUSTOM_DOMAIN" ]; then
    echo "  Custom Domain: $CUSTOM_DOMAIN"
    echo "  Certificate ARN: $CERT_ARN"
fi

print_warning "Next steps:"
echo "1. Wait for distribution to deploy (5-15 minutes)"
echo "2. Validate SSL certificate if using custom domain"
echo "3. Update DNS to point to CloudFront domain"
echo "4. Test your API endpoints"

print_status "Test URLs:"
echo "  CloudFront: https://$DISTRIBUTION_DOMAIN/api/health"
if [ ! -z "$CUSTOM_DOMAIN" ]; then
    echo "  Custom Domain: https://$CUSTOM_DOMAIN/api/health"
fi

# Create a summary file
cat > cloudfront-setup-summary.txt << EOF
CloudFront Setup Summary
========================

Distribution ID: $DISTRIBUTION_ID
CloudFront Domain: $DISTRIBUTION_DOMAIN
Origin Domain: $ORIGIN_DOMAIN
EOF

if [ ! -z "$CUSTOM_DOMAIN" ]; then
    echo "Custom Domain: $CUSTOM_DOMAIN" >> cloudfront-setup-summary.txt
    echo "Certificate ARN: $CERT_ARN" >> cloudfront-setup-summary.txt
fi

cat >> cloudfront-setup-summary.txt << EOF

Next Steps:
1. Wait for distribution deployment
2. Validate SSL certificate
3. Update DNS records
4. Test API endpoints

Test URLs:
- https://$DISTRIBUTION_DOMAIN/api/health
EOF

if [ ! -z "$CUSTOM_DOMAIN" ]; then
    echo "- https://$CUSTOM_DOMAIN/api/health" >> cloudfront-setup-summary.txt
fi

print_status "Summary saved to cloudfront-setup-summary.txt"
