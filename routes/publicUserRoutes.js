const express = require('express');
const { body, validationResult } = require('express-validator');
const PublicUserProfile = require('../models/PublicUserProfile');
const { uploadProfileImage, processAndUploadProfileImage, handleUploadError } = require('../middleware/upload');
const { deleteFromS3 } = require('../config/s3');

const router = express.Router();

// Validation middleware
const validateProfile = [
  body('fullName').notEmpty().withMessage('Full name is required').trim().isLength({ min: 1, max: 100 }).withMessage('Full name must be between 1 and 100 characters'),
  body('deviceId').notEmpty().withMessage('Device ID is required').trim()
];

// @route   GET /api/public-users/:deviceId
// @desc    Get user profile by device ID
// @access  Public
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const profile = await PublicUserProfile.findOne({ deviceId, isActive: true });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found'
      });
    }

    res.json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
});

// @route   POST /api/public-users
// @desc    Create new user profile
// @access  Public
router.post('/', uploadProfileImage, processAndUploadProfileImage, handleUploadError, validateProfile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { deviceId, fullName } = req.body;

    // Check if profile already exists
    const existingProfile = await PublicUserProfile.findOne({ deviceId });
    if (existingProfile) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile with this device ID already exists. Use PUT to update.'
      });
    }

    // Create profile data
    const profileData = {
      deviceId,
      fullName
    };

    // Add profile image if uploaded
    if (req.body.profileImage) {
      profileData.profileImage = req.body.profileImage;
    }

    const profile = new PublicUserProfile(profileData);
    await profile.save();

    res.status(201).json({
      status: 'success',
      message: 'User profile created successfully',
      data: { profile }
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile with this device ID already exists'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user profile'
    });
  }
});

// @route   PUT /api/public-users/:deviceId
// @desc    Update user profile by device ID
// @access  Public
router.put('/:deviceId', uploadProfileImage, processAndUploadProfileImage, handleUploadError, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { fullName } = req.body;

    // Validate fullName if provided
    if (fullName !== undefined) {
      if (!fullName || fullName.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Full name cannot be empty'
        });
      }
      if (fullName.length > 100) {
        return res.status(400).json({
          status: 'error',
          message: 'Full name cannot exceed 100 characters'
        });
      }
    }

    // Find existing profile
    const profile = await PublicUserProfile.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found. Use POST to create a new profile.'
      });
    }

    // Update profile data
    const updateData = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName.trim();
    }

    // Handle profile image update
    if (req.body.profileImage) {
      // Delete old profile image from S3 if exists
      if (profile.profileImage && profile.profileImage.key) {
        try {
          await deleteFromS3(profile.profileImage.key);
        } catch (error) {
          console.error('Error deleting old profile image from S3:', error);
          // Continue with update even if deletion fails
        }
      }
      updateData.profileImage = req.body.profileImage;
    }

    // Update the profile
    const updatedProfile = await PublicUserProfile.findByIdAndUpdate(
      profile._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'User profile updated successfully',
      data: { profile: updatedProfile }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user profile'
    });
  }
});

// @route   PATCH /api/public-users/:deviceId
// @desc    Partial update user profile (alternative to PUT)
// @access  Public
router.patch('/:deviceId', uploadProfileImage, processAndUploadProfileImage, handleUploadError, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { fullName } = req.body;

    // Find existing profile
    const profile = await PublicUserProfile.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found'
      });
    }

    // Update only provided fields
    if (fullName !== undefined) {
      if (!fullName || fullName.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Full name cannot be empty'
        });
      }
      if (fullName.length > 100) {
        return res.status(400).json({
          status: 'error',
          message: 'Full name cannot exceed 100 characters'
        });
      }
      profile.fullName = fullName.trim();
    }

    // Handle profile image update
    if (req.body.profileImage) {
      // Delete old profile image from S3 if exists
      if (profile.profileImage && profile.profileImage.key) {
        try {
          await deleteFromS3(profile.profileImage.key);
        } catch (error) {
          console.error('Error deleting old profile image from S3:', error);
        }
      }
      profile.profileImage = req.body.profileImage;
    }

    await profile.save();

    res.json({
      status: 'success',
      message: 'User profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user profile'
    });
  }
});

// @route   DELETE /api/public-users/:deviceId/profile-image
// @desc    Delete user profile image
// @access  Public
router.delete('/:deviceId/profile-image', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const profile = await PublicUserProfile.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found'
      });
    }

    // Delete profile image from S3 if exists
    if (profile.profileImage && profile.profileImage.key) {
      const deleteResult = await deleteFromS3(profile.profileImage.key);
      
      if (!deleteResult.success) {
        console.error('Failed to delete profile image from S3:', deleteResult.error);
      }
    }

    // Remove profile image from database
    profile.profileImage = undefined;
    await profile.save();

    res.json({
      status: 'success',
      message: 'Profile image deleted successfully',
      data: { profile }
    });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete profile image'
    });
  }
});

// @route   DELETE /api/public-users/:deviceId
// @desc    Delete user profile (soft delete)
// @access  Public
router.delete('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const profile = await PublicUserProfile.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found'
      });
    }

    // Delete profile image from S3 if exists
    if (profile.profileImage && profile.profileImage.key) {
      try {
        await deleteFromS3(profile.profileImage.key);
      } catch (error) {
        console.error('Error deleting profile image from S3:', error);
      }
    }

    // Soft delete by setting isActive to false
    profile.isActive = false;
    await profile.save();

    res.json({
      status: 'success',
      message: 'User profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user profile'
    });
  }
});

module.exports = router;

