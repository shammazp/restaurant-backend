const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  biz_id: {
    type: String,
    required: [true, 'Business ID is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Business ID cannot exceed 50 characters']
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Restaurant description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'USA'
    }
  },
  location: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    }
  },
  cuisine: {
    type: [String],
    required: [true, 'At least one cuisine type is required'],
    enum: ['Italian', 'Chinese', 'Mexican', 'Indian', 'Thai', 'Japanese', 'American', 'Mediterranean', 'French', 'Other']
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  logo: {
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
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Restaurant image'
    }
  }],
  coverImages: [{
    url: {
      type: String,
      required: true
    },
    key: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    alt: {
      type: String,
      default: 'Restaurant cover image'
    }
  }],
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  features: [{
    type: String,
    enum: ['Delivery', 'Takeout', 'Dine-in', 'Outdoor Seating', 'Parking', 'WiFi', 'Bar', 'Live Music', 'Private Dining']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better search performance
restaurantSchema.index({ name: 'text', description: 'text', 'address.city': 'text' });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ priceRange: 1 });
restaurantSchema.index({ rating: -1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
