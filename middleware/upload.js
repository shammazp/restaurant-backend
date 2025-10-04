const multer = require('multer');
const sharp = require('sharp');
const { s3Config, generateFileName, uploadToS3, getCdnUrl } = require('../config/s3');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  if (s3Config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${s3Config.allowedMimeTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: s3Config.maxFileSize
  }
});

// Single file upload middleware
const uploadSingle = upload.single('logo');

// Multiple files upload middleware for cover images
const uploadMultiple = upload.array('coverImages', 4);

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

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadCombined,
  processAndUploadImage,
  processAndUploadCoverImages,
  handleUploadError
};
