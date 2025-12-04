const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  position: {
    type: Number,
    required: true,
    min: 1
  },
  originalName: {
    type: String
  },
  size: {
    type: Number
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const contactInfoSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['contact', 'button'],
    required: true
  },
  // For type: 'contact'
  mobile: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  location: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  // For type: 'button'
  buttonLabel: {
    type: String,
    trim: true
  },
  buttonIcon: {
    type: String,
    trim: true
  },
  buttonUrl: {
    type: String,
    trim: true
  }
}, { _id: false });

const explorePostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  postType: {
    type: Number,
    required: [true, 'Post type is required'],
    min: [1, 'Post type must be at least 1'],
    default: 1
  },
  listPosition: {
    type: Number,
    required: [true, 'List position is required'],
    min: [1, 'List position must be at least 1'],
    default: 1
  },
  media: [mediaItemSchema],
  contactInfo: {
    type: contactInfoSchema,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
explorePostSchema.index({ isActive: 1, createdAt: -1 });
explorePostSchema.index({ 'contactInfo.type': 1 });
explorePostSchema.index({ postType: 1, listPosition: 1 });
explorePostSchema.index({ listPosition: 1 });

module.exports = mongoose.model('ExplorePost', explorePostSchema);

