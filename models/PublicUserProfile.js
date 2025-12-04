const mongoose = require('mongoose');

const publicUserProfileSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  profileImage: {
    url: {
      type: String,
      trim: true
    },
    key: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    size: {
      type: Number
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
publicUserProfileSchema.index({ deviceId: 1 });
publicUserProfileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PublicUserProfile', publicUserProfileSchema);

