# S3 Logo Upload Setup Guide

## Required Environment Variables

Add these variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# CDN Configuration (Optional - for custom CDN)
CDN_URL=https://your-cdn-domain.com
```

## AWS S3 Setup Steps

### 1. Create S3 Bucket
1. Go to AWS S3 Console
2. Create a new bucket with a unique name
3. Choose a region (e.g., us-east-1)
4. Enable versioning (optional but recommended)
5. Configure CORS policy:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 2. Configure Bucket Permissions
1. Go to Bucket Policy
2. Add this policy (replace `your-bucket-name` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### 3. Create IAM User
1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### 4. CDN Setup (Optional but Recommended)

#### CloudFront Setup:
1. Go to AWS CloudFront Console
2. Create a new distribution
3. Set origin to your S3 bucket
4. Configure caching behavior
5. Update `CDN_URL` in your `.env` file

#### Benefits of CDN:
- Faster image delivery
- Reduced S3 costs
- Better performance globally
- Automatic image optimization

## API Endpoints for Logo Upload

### Upload Logo
- **POST** `/api/restaurants/:id/logo` - Upload logo by restaurant ID
- **POST** `/api/restaurants/biz/:biz_id/logo` - Upload logo by business ID

### Delete Logo
- **DELETE** `/api/restaurants/:id/logo` - Delete logo by restaurant ID
- **DELETE** `/api/restaurants/biz/:biz_id/logo` - Delete logo by business ID

## File Upload Requirements

- **Supported formats**: JPEG, PNG, WebP
- **Maximum size**: 5MB
- **Image processing**: Automatically resized to 600x600px
- **Storage**: Amazon S3 with CDN delivery

## Testing the Implementation

1. Start your server: `npm run dev`
2. Go to admin interface: `http://localhost:3000/admin`
3. Create a new restaurant with logo upload
4. Check S3 bucket for uploaded files
5. Verify CDN URLs are working
