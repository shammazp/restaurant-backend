const express = require('express');
const { body, validationResult } = require('express-validator');
const ExplorePost = require('../models/ExplorePost');
const { uploadExploreMedia, processAndUploadExploreMedia, handleUploadError } = require('../middleware/upload');
const { deleteFromS3 } = require('../config/s3');

const router = express.Router();

// Validation middleware - custom validation to handle JSON string contactInfo
const validateExplorePost = [
  body('title').notEmpty().withMessage('Title is required').trim().isLength({ min: 1, max: 200 }),
  body('description').notEmpty().withMessage('Description is required').trim().isLength({ min: 1, max: 2000 }),
  body('postType').optional().isInt({ min: 1 }).withMessage('Post type must be a positive integer'),
  body('listPosition').optional().isInt({ min: 1 }).withMessage('List position must be a positive integer'),
  body('contactInfo').custom((value, { req }) => {
    // Contact info is now optional - if not provided, skip validation
    if (!value && !req.body.contactType) {
      return true; // Allow empty contact info
    }
    
    // If contactInfo is not provided, check if contactType is in the body
    if (!value && req.body.contactType) {
      // Allow validation to pass, we'll handle it in the route handler
      return true;
    }
    
    try {
      let contactInfoData;
      if (typeof value === 'string') {
        if (value.trim() === '') {
          throw new Error('Contact info cannot be empty');
        }
        contactInfoData = JSON.parse(value);
      } else {
        contactInfoData = value;
      }
      
      if (!contactInfoData || !contactInfoData.type) {
        throw new Error('Contact info type is required');
      }
      
      if (!['contact', 'button'].includes(contactInfoData.type)) {
        throw new Error('Contact type must be either "contact" or "button"');
      }
      
      return true;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid contact info JSON format');
      }
      throw new Error(error.message || 'Invalid contact info format');
    }
  }).optional()
];

// @route   GET /api/explore
// @desc    Get all explore posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const query = {};
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const posts = await ExplorePost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ExplorePost.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPosts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching explore posts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch explore posts'
    });
  }
});

// @route   GET /api/explore/:id
// @desc    Get explore post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await ExplorePost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Explore post not found'
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    console.error('Error fetching explore post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch explore post'
    });
  }
});

// @route   POST /api/explore
// @desc    Create new explore post
// @access  Private (Admin)
router.post('/', uploadExploreMedia, processAndUploadExploreMedia, handleUploadError, validateExplorePost, async (req, res) => {
  try {
    console.log('=== POST /api/explore START ===');
    console.log('req.body after middleware:', {
      title: req.body.title,
      description: req.body.description,
      coverImages: req.body.coverImages ? `Array with ${req.body.coverImages.length} items` : 'undefined'
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, postType, listPosition, contactInfo, contactType } = req.body;

    // Parse contactInfo if it's a string, or build from contactType
    let contactInfoData;
    if (contactInfo) {
      if (typeof contactInfo === 'string') {
        try {
          contactInfoData = JSON.parse(contactInfo);
        } catch (parseError) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid contact info JSON format',
            error: parseError.message
          });
        }
      } else {
        contactInfoData = contactInfo;
      }
    } else if (contactType) {
      // Build contactInfo from individual fields if contactInfo wasn't sent
      contactInfoData = { type: contactType };
      if (contactType === 'contact') {
        if (req.body.mobile) contactInfoData.mobile = req.body.mobile;
        if (req.body.email) contactInfoData.email = req.body.email;
        if (req.body.website) contactInfoData.website = req.body.website;
        if (req.body.latitude || req.body.longitude) {
          contactInfoData.location = {
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined
          };
        }
      } else if (contactType === 'button') {
        contactInfoData.buttonLabel = req.body.buttonLabel;
        contactInfoData.buttonIcon = req.body.buttonIcon || '';
        contactInfoData.buttonUrl = req.body.buttonUrl;
      }
    } else {
      // Contact info is optional - set to null if not provided
      contactInfoData = null;
    }

    // Validate contact info based on type (only if provided)
    if (contactInfoData) {
      if (contactInfoData.type === 'contact') {
        if (!contactInfoData.mobile && !contactInfoData.email && !contactInfoData.website && !contactInfoData.location) {
          return res.status(400).json({
            status: 'error',
            message: 'At least one contact method (mobile, email, website, or location) is required for contact type'
          });
        }
      } else if (contactInfoData.type === 'button') {
        if (!contactInfoData.buttonLabel || !contactInfoData.buttonUrl) {
          return res.status(400).json({
            status: 'error',
            message: 'Button label and URL are required for button type'
          });
        }
      }
    }

    // Process uploaded media files (optional)
    const media = [];
    console.log('Processing media from req.body.coverImages:', req.body.coverImages);
    if (req.body.coverImages && Array.isArray(req.body.coverImages) && req.body.coverImages.length > 0) {
      req.body.coverImages.forEach((img, index) => {
        if (img && img.url) {
          media.push({
            url: img.url,
            key: img.key,
            type: img.type || 'image', // Default to image if not specified
            position: index + 1,
            originalName: img.originalName,
            size: img.size,
            uploadedAt: img.uploadedAt instanceof Date ? img.uploadedAt : (img.uploadedAt ? new Date(img.uploadedAt) : new Date())
          });
        } else {
          console.warn('Skipping invalid media item:', img);
        }
      });
    } else {
      console.log('No coverImages found or empty array');
    }
    console.log('Processed media array:', media);

    const postData = {
      title: title.trim(),
      description: description.trim(),
      postType: postType ? parseInt(postType) : 1,
      listPosition: listPosition ? parseInt(listPosition) : 1,
      media
    };
    
    // Only add contactInfo if it was provided
    if (contactInfoData) {
      postData.contactInfo = contactInfoData;
    }

    console.log('Post data before save:', {
      title: postData.title,
      mediaCount: postData.media.length,
      media: postData.media.map(m => ({ url: m.url, type: m.type }))
    });
    
    const post = new ExplorePost(postData);
    await post.save();

    // Reload the post to ensure all fields are populated correctly
    const savedPost = await ExplorePost.findById(post._id);
    
    console.log('Saved post from DB:', {
      id: savedPost._id,
      title: savedPost.title,
      mediaCount: savedPost.media?.length || 0,
      media: savedPost.media?.map(m => ({ url: m.url, type: m.type })) || []
    });
    console.log('=== POST /api/explore END ===');

    res.status(201).json({
      status: 'success',
      message: 'Explore post created successfully',
      data: { post: savedPost }
    });
  } catch (error) {
    console.error('Error creating explore post:', error);
    console.error('Request body:', req.body);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create explore post',
      error: error.message
    });
  }
});

// @route   PUT /api/explore/:id
// @desc    Update explore post
// @access  Private (Admin)
router.put('/:id', uploadExploreMedia, processAndUploadExploreMedia, handleUploadError, async (req, res) => {
  try {
    const { title, description, postType, listPosition, contactInfo } = req.body;

    const post = await ExplorePost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Explore post not found'
      });
    }

    // Update basic fields
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Title cannot be empty'
        });
      }
      post.title = title.trim();
    }

    if (description !== undefined) {
      if (!description || description.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Description cannot be empty'
        });
      }
      post.description = description.trim();
    }

    if (postType !== undefined) {
      const postTypeNum = parseInt(postType);
      if (isNaN(postTypeNum) || postTypeNum < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Post type must be a positive integer'
        });
      }
      post.postType = postTypeNum;
    }

    if (listPosition !== undefined) {
      const listPositionNum = parseInt(listPosition);
      if (isNaN(listPositionNum) || listPositionNum < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'List position must be a positive integer'
        });
      }
      post.listPosition = listPositionNum;
    }

    // Update contact info (optional - can be set to null to remove)
    if (contactInfo !== undefined) {
      if (contactInfo === null || contactInfo === 'null' || contactInfo === '') {
        // Remove contact info
        post.contactInfo = undefined;
      } else {
        let contactInfoData;
        if (typeof contactInfo === 'string') {
          contactInfoData = JSON.parse(contactInfo);
        } else {
          contactInfoData = contactInfo;
        }

        // Validate contact info
        if (contactInfoData && contactInfoData.type) {
          if (contactInfoData.type === 'contact') {
            if (!contactInfoData.mobile && !contactInfoData.email && !contactInfoData.website && !contactInfoData.location) {
              return res.status(400).json({
                status: 'error',
                message: 'At least one contact method is required for contact type'
              });
            }
          } else if (contactInfoData.type === 'button') {
            if (!contactInfoData.buttonLabel || !contactInfoData.buttonUrl) {
              return res.status(400).json({
                status: 'error',
                message: 'Button label and URL are required for button type'
              });
            }
          }
        }

        post.contactInfo = contactInfoData;
      }
    }

    // Update media if new files uploaded
    if (req.body.coverImages && Array.isArray(req.body.coverImages) && req.body.coverImages.length > 0) {
      // Delete old media from S3
      if (post.media && post.media.length > 0) {
        for (const mediaItem of post.media) {
          if (mediaItem.key) {
            try {
              await deleteFromS3(mediaItem.key);
            } catch (error) {
              console.error('Error deleting old media from S3:', error);
            }
          }
        }
      }

      // Add new media
      const newMedia = req.body.coverImages.map((img, index) => ({
        url: img.url,
        key: img.key,
        type: img.type || 'image',
        position: index + 1,
        originalName: img.originalName,
        size: img.size,
        uploadedAt: img.uploadedAt
      }));

      post.media = newMedia;
    }

    await post.save();

    res.json({
      status: 'success',
      message: 'Explore post updated successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Error updating explore post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update explore post'
    });
  }
});

// @route   DELETE /api/explore/:id
// @desc    Delete explore post
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const post = await ExplorePost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Explore post not found'
      });
    }

    // Delete media from S3
    if (post.media && post.media.length > 0) {
      for (const mediaItem of post.media) {
        if (mediaItem.key) {
          try {
            await deleteFromS3(mediaItem.key);
          } catch (error) {
            console.error('Error deleting media from S3:', error);
          }
        }
      }
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    res.json({
      status: 'success',
      message: 'Explore post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting explore post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete explore post'
    });
  }
});

// @route   PATCH /api/explore/:id/toggle
// @desc    Toggle explore post active status
// @access  Private (Admin)
router.patch('/:id/toggle', async (req, res) => {
  try {
    const post = await ExplorePost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Explore post not found'
      });
    }

    post.isActive = !post.isActive;
    await post.save();

    res.json({
      status: 'success',
      message: `Explore post ${post.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { post }
    });
  } catch (error) {
    console.error('Error toggling explore post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle explore post status'
    });
  }
});

module.exports = router;

