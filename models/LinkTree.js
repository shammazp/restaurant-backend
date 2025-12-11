const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const linkTreeSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bannerImage: {
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
      type: Date
    }
  },
  isBannerHidden: {
    type: Boolean,
    default: false
  },
  LTN: {
    type: Number,
    unique: true,
    sparse: true,
    trim: true,
    min: [1, 'LTN must be at least 1']
  }
}, {
  timestamps: true
});

// Hash password before saving
linkTreeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
linkTreeSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
linkTreeSchema.methods.toJSON = function() {
  const linkTree = this.toObject();
  delete linkTree.password;
  return linkTree;
};

module.exports = mongoose.model('LinkTree', linkTreeSchema);
