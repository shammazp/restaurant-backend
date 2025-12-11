const multer = require('multer');
const sharp = require('sharp');
const { s3, s3Config, generateFileName, uploadToS3, getCdnUrl } = require('../config/s3');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function for images only
const fileFilter = (req, file, cb) => {
  if (s3Config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${s3Config.allowedMimeTypes.join(', ')}`), false);
  }
};

// File filter function for images and videos (for explore posts)
const fileFilterMedia = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer for images only
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: s3Config.maxFileSize
  }
});

// Configure multer for images and videos (explore posts)
const uploadMedia = multer({
  storage: storage,
  fileFilter: fileFilterMedia,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB for videos
  }
});

// Single file upload middleware
const uploadSingle = upload.single('logo');

// Multiple files upload middleware for cover images
const uploadMultiple = upload.array('coverImages', 4);

// Multiple files upload middleware for explore media (images and videos)
const uploadExploreMedia = uploadMedia.array('coverImages', 10);

// Combined middleware for both single and multiple files
const uploadCombined = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImages', maxCount: 4 }
]);

// Process and upload image to S3
const processAndUploadImage = async (req, res, next) => {
  try {
    // Handle both single file (req.file) and combined uploads (req.files.logo)
    const logoFile = req.file || (req.files && req.files.logo && req.files.logo[0]);
    
    if (!logoFile) {
      return next(); // No logo file uploaded, continue to next middleware
    }

    // Get biz_id from either direct body or from data JSON string
    let biz_id = req.body.biz_id;
    if (!biz_id && req.body.data) {
      try {
        const dataObj = JSON.parse(req.body.data);
        biz_id = dataObj.biz_id;
      } catch (error) {
        console.error('Error parsing data JSON:', error);
      }
    }
    
    if (!biz_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Business ID is required for logo upload'
      });
    }

    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('S3 not configured, storing file info without upload');
      // Store basic file info without S3 upload
      req.body.logo = {
        url: null,
        key: null,
        originalName: logoFile.originalname,
        size: logoFile.size,
        uploadedAt: new Date().toISOString(),
        note: 'S3 not configured - file not uploaded to cloud storage'
      };
      return next();
    }

    // Generate unique filename
    const fileName = generateFileName(logoFile.originalname, biz_id);
    
    // Process image with Sharp
    const processedImage = await sharp(logoFile.buffer)
      .resize(s3Config.imageSizes.large.width, s3Config.imageSizes.large.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload to S3
    const uploadResult = await uploadToS3(
      processedImage,
      fileName,
      'image/jpeg'
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload image to S3',
        error: uploadResult.error
      });
    }

    // Generate CDN URL
    const cdnUrl = getCdnUrl(uploadResult.key);
    
    // Add logo information to request body
    req.body.logo = {
      url: cdnUrl,
      key: uploadResult.key,
      originalName: logoFile.originalname,
      size: processedImage.length,
      uploadedAt: new Date().toISOString()
    };

    next();
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process image',
      error: error.message
    });
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: `File too large. Maximum size allowed: ${s3Config.maxFileSize / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      status: 'error',
      message: 'File upload error',
      error: error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
  
  next(error);
};

// Process and upload multiple cover images to S3
const processAndUploadCoverImages = async (req, res, next) => {
  try {
    // Handle both array uploads (req.files) and combined uploads (req.files.coverImages)
    const coverImageFiles = req.files && req.files.coverImages ? req.files.coverImages : req.files;
    
    if (!coverImageFiles || !Array.isArray(coverImageFiles) || coverImageFiles.length === 0) {
      return next(); // No files uploaded, continue to next middleware
    }

    // Get biz_id from either direct body or from data JSON string
    let biz_id = req.body.biz_id;
    if (!biz_id && req.body.data) {
      try {
        const dataObj = JSON.parse(req.body.data);
        biz_id = dataObj.biz_id;
      } catch (error) {
        console.error('Error parsing data JSON:', error);
      }
    }
    
    if (!biz_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Business ID is required for cover image upload'
      });
    }

    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('S3 not configured, storing file info without upload');
      // Store basic file info without S3 upload
      req.body.coverImages = coverImageFiles.map(file => ({
        url: null,
        key: null,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        note: 'S3 not configured - file not uploaded to cloud storage'
      }));
      return next();
    }

    const coverImages = [];
    
    // Process each file
    for (const file of coverImageFiles) {
      if (!file || !file.originalname) {
        console.warn('Skipping invalid file:', file);
        continue;
      }
      
      try {
        // Generate unique filename
        const fileName = generateFileName(file.originalname, biz_id);
        
        // Process image with Sharp
        const processedImage = await sharp(file.buffer)
          .resize(s3Config.imageSizes.large.width, s3Config.imageSizes.large.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        // Upload to S3
        const uploadResult = await uploadToS3(
          processedImage,
          fileName,
          'image/jpeg'
        );

        if (uploadResult.success) {
          // Generate CDN URL
          const cdnUrl = getCdnUrl(uploadResult.key);
          
          coverImages.push({
            url: cdnUrl,
            key: uploadResult.key,
            originalName: file.originalname,
            size: processedImage.length,
            uploadedAt: new Date().toISOString()
          });
        } else {
          console.error('Failed to upload cover image:', uploadResult.error);
        }
      } catch (error) {
        console.error('Error processing cover image:', error);
      }
    }
    
    // Add cover images information to request body
    req.body.coverImages = coverImages;

    next();
  } catch (error) {
    console.error('Cover images processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process cover images',
      error: error.message
    });
  }
};

// Single file upload middleware for profile images
const uploadProfileImage = upload.single('profileImage');

// Process and upload user profile image to S3
const processAndUploadProfileImage = async (req, res, next) => {
  try {
    const profileImageFile = req.file;
    
    if (!profileImageFile) {
      return next(); // No profile image file uploaded, continue to next middleware
    }

    // Get deviceId from either direct body or from data JSON string
    let deviceId = req.body.deviceId;
    if (!deviceId && req.body.data) {
      try {
        const dataObj = JSON.parse(req.body.data);
        deviceId = dataObj.deviceId;
      } catch (error) {
        console.error('Error parsing data JSON:', error);
      }
    }
    
    if (!deviceId) {
      return res.status(400).json({
        status: 'error',
        message: 'Device ID is required for profile image upload'
      });
    }

    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('S3 not configured, storing file info without upload');
      // Store basic file info without S3 upload
      req.body.profileImage = {
        url: null,
        key: null,
        originalName: profileImageFile.originalname,
        size: profileImageFile.size,
        uploadedAt: new Date().toISOString(),
        note: 'S3 not configured - file not uploaded to cloud storage'
      };
      return next();
    }

    // Generate unique filename using deviceId
    const fileName = generateFileName(profileImageFile.originalname, deviceId);
    
    // Process image with Sharp (circular crop for profile images)
    const processedImage = await sharp(profileImageFile.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload to S3 (use a different path for user profiles)
    const uploadPath = 'user-profiles/';
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: `${uploadPath}${fileName}`,
      Body: processedImage,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000',
      Metadata: {
        'uploaded-by': 'public-user-api',
        'upload-date': new Date().toISOString()
      }
    };

    const result = await s3.upload(uploadParams).promise();

    // Generate CDN URL
    const cdnUrl = getCdnUrl(result.Key);
    
    // Add profile image information to request body
    req.body.profileImage = {
      url: cdnUrl,
      key: result.Key,
      originalName: profileImageFile.originalname,
      size: processedImage.length,
      uploadedAt: new Date().toISOString()
    };

    next();
  } catch (error) {
    console.error('Profile image processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process profile image',
      error: error.message
    });
  }
};

// Process and upload media files for explore posts
const processAndUploadExploreMedia = async (req, res, next) => {
  try {
    console.log('=== processAndUploadExploreMedia START ===');
    console.log('req.files:', req.files ? (Array.isArray(req.files) ? `Array with ${req.files.length} items` : Object.keys(req.files)) : 'undefined');
    
    // When using upload.array(), files are stored directly in req.files as an array
    // When using upload.fields(), files are stored in req.files.fieldName
    const mediaFiles = req.files && Array.isArray(req.files) ? req.files : 
                      (req.files && req.files.coverImages ? req.files.coverImages : []);
    
    console.log('mediaFiles:', mediaFiles ? (Array.isArray(mediaFiles) ? `Array with ${mediaFiles.length} items` : 'Not an array') : 'undefined');
    
    if (!mediaFiles || !Array.isArray(mediaFiles) || mediaFiles.length === 0) {
      console.log('No media files found, setting empty array');
      req.body.coverImages = []; // Set empty array if no files
      return next(); // No files uploaded, continue to next middleware
    }

    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('S3 not configured, storing file info without upload');
      req.body.coverImages = mediaFiles.map(file => ({
        url: null,
        key: null,
        type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date(),
        note: 'S3 not configured - file not uploaded to cloud storage'
      }));
      return next();
    }

    const uploadedMedia = [];
    const uploadPath = 'explore-posts/';
    
    // Process each file
    for (const file of mediaFiles) {
      if (!file || !file.originalname) {
        console.warn('Skipping invalid file:', file);
        continue;
      }
      
      try {
        const isVideo = file.mimetype.startsWith('video/');
        const fileName = generateFileName(file.originalname, `explore_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
        
        let processedFile;
        let contentType;
        
        if (isVideo) {
          // For videos, upload as-is
          processedFile = file.buffer;
          contentType = file.mimetype;
        } else {
          // For images, process with Sharp
          processedFile = await sharp(file.buffer)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 90 })
            .toBuffer();
          contentType = 'image/jpeg';
        }

        // Upload to S3
        const uploadParams = {
          Bucket: s3Config.bucketName,
          Key: `${uploadPath}${fileName}`,
          Body: processedFile,
          ContentType: contentType,
          CacheControl: 'max-age=31536000',
          // ACL removed - rely on bucket policy like restaurant images
          Metadata: {
            'uploaded-by': 'explore-posts-api',
            'upload-date': new Date().toISOString()
          }
        };

        const result = await s3.upload(uploadParams).promise();
        
        // Use the Location from S3 response, or construct CDN URL if CDN_URL is set
        const imageUrl = process.env.CDN_URL ? getCdnUrl(result.Key) : result.Location;
        
        console.log('Uploaded media file:', {
          key: result.Key,
          url: imageUrl,
          location: result.Location,
          type: isVideo ? 'video' : 'image'
        });
        
        uploadedMedia.push({
          url: imageUrl,
          key: result.Key,
          type: isVideo ? 'video' : 'image',
          originalName: file.originalname,
          size: processedFile.length,
          uploadedAt: new Date()
        });
      } catch (error) {
        console.error('Error processing media file:', error);
      }
    }
    
    // Add media information to request body
    req.body.coverImages = uploadedMedia;
    console.log('=== processAndUploadExploreMedia END ===');
    console.log('Uploaded media count:', uploadedMedia.length);
    console.log('Media URLs:', uploadedMedia.map(m => m.url));

    next();
  } catch (error) {
    console.error('Explore media processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process media files',
      error: error.message
    });
  }
};

// Process and upload banner image for LinkTree
const processAndUploadBannerImage = async (req, res, next) => {
  try {
    const bannerFile = req.file;
    
    if (!bannerFile) {
      return next(); // No banner file uploaded, continue to next middleware
    }

    // Get account ID from params (should be available in PUT route)
    const accountId = req.params.id;
    
    if (!accountId) {
      // For create route, we might not have an ID yet, so skip banner upload
      return next();
    }

    // Check if S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      console.warn('S3 not configured, storing file info without upload');
      req.body.bannerImage = {
        url: null,
        key: null,
        originalName: bannerFile.originalname,
        size: bannerFile.size,
        uploadedAt: new Date(),
        note: 'S3 not configured - file not uploaded to cloud storage'
      };
      return next();
    }

    try {
      // Generate unique filename
      const fileName = generateFileName(bannerFile.originalname, `linktree_${accountId}_${Date.now()}`);
      
      // Process image with Sharp - resize to banner dimensions (1200x400 recommended for banners)
      const processedImage = await sharp(bannerFile.buffer)
        .resize(1200, 400, {
          fit: 'cover',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Upload to S3
      const uploadPath = 'linktree-banners/';
      const uploadParams = {
        Bucket: s3Config.bucketName,
        Key: `${uploadPath}${fileName}`,
        Body: processedImage,
        ContentType: 'image/jpeg',
        CacheControl: 'max-age=31536000',
        Metadata: {
          'uploaded-by': 'linktree-api',
          'upload-date': new Date().toISOString()
        }
      };

      const result = await s3.upload(uploadParams).promise();
      
      // Use the Location from S3 response, or construct CDN URL if CDN_URL is set
      const imageUrl = process.env.CDN_URL ? getCdnUrl(result.Key) : result.Location;
      
      console.log('Uploaded banner image:', {
        key: result.Key,
        url: imageUrl,
        location: result.Location
      });
      
      // Store banner image info in req.body for the route handler
      req.body.bannerImage = {
        url: imageUrl,
        key: result.Key,
        originalName: bannerFile.originalname,
        size: processedImage.length,
        uploadedAt: new Date()
      };
      
      // Store old banner key for deletion
      if (req.body.oldBannerKey) {
        req.body.oldBannerKey = req.body.oldBannerKey;
      }

      next();
    } catch (error) {
      console.error('Banner image processing error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process banner image',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Banner image upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload banner image',
      error: error.message
    });
  }
};

// Single file upload middleware for banner images
const uploadBannerImage = upload.single('bannerImage');

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadExploreMedia,
  uploadCombined,
  uploadProfileImage,
  uploadBannerImage,
  processAndUploadImage,
  processAndUploadCoverImages,
  processAndUploadProfileImage,
  processAndUploadExploreMedia,
  processAndUploadBannerImage,
  handleUploadError
};
