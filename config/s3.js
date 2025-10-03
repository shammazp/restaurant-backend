const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

// S3 Configuration
const s3Config = {
  bucketName: process.env.S3_BUCKET_NAME,
  region: process.env.AWS_REGION || 'us-east-1',
  cdnUrl: process.env.CDN_URL || `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
  uploadPath: 'restaurant-logos/',
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  imageSizes: {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 }
  }
};

// Generate unique filename
const generateFileName = (originalName, bizId) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${bizId}_${timestamp}_${randomString}.${extension}`;
};

// Upload file to S3
const uploadToS3 = async (file, fileName, contentType) => {
  const uploadParams = {
    Bucket: s3Config.bucketName,
    Key: `${s3Config.uploadPath}${fileName}`,
    Body: file,
    ContentType: contentType,
    // ACL removed - modern S3 buckets don't support ACLs
    CacheControl: 'max-age=31536000', // 1 year cache
    Metadata: {
      'uploaded-by': 'restaurant-api',
      'upload-date': new Date().toISOString()
    }
  };

  try {
    const result = await s3.upload(uploadParams).promise();
    return {
      success: true,
      location: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  const deleteParams = {
    Bucket: s3Config.bucketName,
    Key: key
  };

  try {
    await s3.deleteObject(deleteParams).promise();
    return { success: true };
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return { success: false, error: error.message };
  }
};

// Generate CDN URL
const getCdnUrl = (key) => {
  return `${s3Config.cdnUrl}/${key}`;
};

module.exports = {
  s3,
  s3Config,
  generateFileName,
  uploadToS3,
  deleteFromS3,
  getCdnUrl
};
