# HTTPS Setup for Production on AWS

This guide covers three approaches to implement HTTPS for your restaurant backend API on AWS.

## Overview

Your current setup:
- Node.js/Express server running on port 80
- MongoDB database
- AWS S3 for file storage
- CORS enabled for all origins (development)

## Option 1: AWS Application Load Balancer (ALB) with SSL Certificate

### Prerequisites
- EC2 instance running your Node.js application
- Domain name (e.g., api.yourdomain.com)

### Steps

1. **Request SSL Certificate from AWS Certificate Manager**
   ```bash
   # In AWS Console:
   # 1. Go to Certificate Manager
   # 2. Request a public certificate
   # 3. Add your domain (e.g., api.yourdomain.com)
   # 4. Validate domain ownership via DNS or email
   ```

2. **Create Application Load Balancer**
   ```bash
  # 1. Go to EC2 > Load Balancers
   # 2. Create Application Load Balancer
   # 3. Configure:
   #    - Scheme: Internet-facing
   #    - IP address type: IPv4
   #    - VPC: Your VPC
   #    - Subnets: At least 2 public subnets
   ```   # In AWS Console:
 

3. **Configure Target Group**
   ```bash
   # Target Group Settings:
   # - Target type: Instances
   # - Protocol: HTTP
   # - Port: 80
   # - Health check path: /api/health
   # - Register your EC2 instance
   ```

4. **Configure HTTPS Listener**
   ```bash
   # Listener Settings:
   # - Protocol: HTTPS
   # - Port: 443
   # - SSL Certificate: Select your ACM certificate
   # - Default action: Forward to target group
   ```

5. **Update Security Groups**
   ```bash
   # ALB Security Group:
   # - Inbound: HTTPS (443) from 0.0.0.0/0
   # - Inbound: HTTP (80) from 0.0.0.0/0
   
   # EC2 Security Group:
   # - Inbound: HTTP (80) from ALB security group
   # - Remove direct internet access to port 80
   ```

## Option 2: CloudFront with SSL

### Steps

1. **Create CloudFront Distribution**
   ```bash
   # CloudFront Settings:
   # - Origin Domain: Your ALB DNS name or EC2 public IP
   # - Origin Protocol Policy: HTTP Only
   # - Viewer Protocol Policy: Redirect HTTP to HTTPS
   # - SSL Certificate: Default CloudFront Certificate
   ```

2. **Configure Behaviors**
   ```bash
   # Path Pattern: Default (*)
   # - Origin: Your ALB/EC2
   # - Viewer Protocol Policy: Redirect HTTP to HTTPS
   # - Cache Policy: CachingDisabled (for API)
   # - Origin Request Policy: CORS-S3Origin
   ```

3. **Custom Domain (Optional)**
   ```bash
   # If using custom domain:
   # 1. Request certificate in us-east-1 region
   # 2. Add alternate domain name in CloudFront
   # 3. Update DNS to point to CloudFront
   ```

## Option 3: AWS Certificate Manager + Direct HTTPS

### Steps

1. **Request Certificate**
   ```bash
   # Same as Option 1, but for your domain
   ```

2. **Configure Node.js for HTTPS**
   ```bash
   # Install additional dependencies
   npm install --save https
   ```

3. **Update server configuration**
   ```bash
   # See server-https.js for implementation
   ```

## Recommended Architecture

For production, I recommend **Option 1 (ALB + ACM)** because:

- ✅ Free SSL certificates
- ✅ Automatic certificate renewal
- ✅ Load balancing and high availability
- ✅ Health checks
- ✅ Easy to scale
- ✅ Better security (EC2 not directly exposed)

## Security Considerations

1. **Update CORS for production**
2. **Implement rate limiting**
3. **Add security headers**
4. **Use environment variables for secrets**
5. **Enable CloudTrail for monitoring**

## Cost Estimation

- **ALB**: ~$16/month + data processing
- **ACM Certificate**: Free
- **CloudFront**: ~$1/month + data transfer
- **Route 53**: ~$0.50/month per hosted zone

## Next Steps

1. Choose your preferred option
2. Update server configuration
3. Set up monitoring and logging
4. Configure CI/CD pipeline
5. Test thoroughly before production deployment

## Environment Variables for Production

```bash
# .env.production
NODE_ENV=production
PORT=80
MONGODB_URI=mongodb://your-production-db
AWS_REGION=us-east-1
JWT_SECRET=your-super-secure-jwt-secret
CORS_ORIGIN=https://yourdomain.com
```

## Monitoring and Logging

Consider implementing:
- CloudWatch for application logs
- X-Ray for request tracing
- CloudWatch alarms for health checks
- SNS for alerting
