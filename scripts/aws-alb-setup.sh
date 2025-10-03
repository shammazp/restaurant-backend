#!/bin/bash

# AWS ALB Setup Script for Restaurant Backend
# This script helps set up Application Load Balancer with SSL

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
    print_error "AWS CLI is not installed. Please install it first:"
    echo "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
    echo "unzip awscliv2.zip"
    echo "sudo ./aws/install"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install it first:"
    echo "sudo apt-get install jq  # Ubuntu/Debian"
    echo "sudo yum install jq      # CentOS/RHEL"
    exit 1
fi

# Get user input
echo "Enter your domain name (e.g., api.yourdomain.com):"
read DOMAIN_NAME

echo "Enter your VPC ID:"
read VPC_ID

echo "Enter your subnet IDs (comma-separated, at least 2):"
read SUBNET_IDS

echo "Enter your EC2 instance ID:"
read INSTANCE_ID

print_header "Setting up AWS Certificate Manager SSL Certificate"

# Request SSL certificate
print_status "Requesting SSL certificate for $DOMAIN_NAME..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)

print_status "Certificate ARN: $CERT_ARN"
print_warning "You need to validate the certificate by adding DNS records"
print_warning "Check AWS Console > Certificate Manager for validation instructions"

print_header "Creating Security Groups"

# Create ALB security group
print_status "Creating ALB security group..."
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name restaurant-alb-sg \
    --description "Security group for Restaurant ALB" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow HTTP and HTTPS traffic to ALB
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

print_status "ALB Security Group ID: $ALB_SG_ID"

# Create EC2 security group (if not exists)
print_status "Creating EC2 security group..."
EC2_SG_ID=$(aws ec2 create-security-group \
    --group-name restaurant-ec2-sg \
    --description "Security group for Restaurant EC2" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow HTTP traffic from ALB to EC2
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 80 \
    --source-group $ALB_SG_ID

# Allow SSH access (optional)
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

print_status "EC2 Security Group ID: $EC2_SG_ID"

print_header "Creating Target Group"

# Create target group
print_status "Creating target group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name restaurant-targets \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

print_status "Target Group ARN: $TARGET_GROUP_ARN"

# Register EC2 instance with target group
print_status "Registering EC2 instance with target group..."
aws elbv2 register-targets \
    --target-group-arn $TARGET_GROUP_ARN \
    --targets Id=$INSTANCE_ID,Port=80

print_header "Creating Application Load Balancer"

# Convert subnet IDs to array
IFS=',' read -ra SUBNET_ARRAY <<< "$SUBNET_IDS"

# Create ALB
print_status "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name restaurant-alb \
    --subnets "${SUBNET_ARRAY[@]}" \
    --security-groups $ALB_SG_ID \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

print_status "ALB ARN: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

print_status "ALB DNS Name: $ALB_DNS"

print_header "Creating Listeners"

# Create HTTP listener (redirect to HTTPS)
print_status "Creating HTTP listener (redirect to HTTPS)..."
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# Create HTTPS listener
print_status "Creating HTTPS listener..."
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

print_header "Updating EC2 Instance Security Group"

# Update EC2 instance security group
print_status "Updating EC2 instance security group..."
aws ec2 modify-instance-attribute \
    --instance-id $INSTANCE_ID \
    --groups $EC2_SG_ID

print_header "Setup Complete!"

print_status "Your ALB is now configured with:"
echo "  ALB DNS Name: $ALB_DNS"
echo "  Target Group: $TARGET_GROUP_ARN"
echo "  Certificate: $CERT_ARN"

print_warning "Next steps:"
echo "1. Validate your SSL certificate in AWS Certificate Manager"
echo "2. Update your DNS to point $DOMAIN_NAME to $ALB_DNS"
echo "3. Test your API: https://$DOMAIN_NAME/api/health"

print_status "Health check URL: https://$ALB_DNS/api/health"
print_status "Your API will be available at: https://$DOMAIN_NAME"

# Create a summary file
cat > alb-setup-summary.txt << EOF
AWS ALB Setup Summary
====================

ALB DNS Name: $ALB_DNS
Domain Name: $DOMAIN_NAME
Certificate ARN: $CERT_ARN
Target Group ARN: $TARGET_GROUP_ARN
ALB Security Group: $ALB_SG_ID
EC2 Security Group: $EC2_SG_ID

Next Steps:
1. Validate SSL certificate in AWS Console
2. Update DNS records
3. Test API endpoints
EOF

print_status "Summary saved to alb-setup-summary.txt"
