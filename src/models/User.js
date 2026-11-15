const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide student / user full name'],
      trim: true
    },
    rollNumber: {
      type: String,
      required: [true, 'Please provide college roll number'],
      unique: true,
      trim: true,
      uppercase: true
    },
    email: {
      type: String,
      required: [true, 'Please provide email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['Student', 'Senior', 'Admin'],
        message: 'Role must be Student, Senior, or Admin'
      },
      default: 'Student'
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Please specify gender for matching and profile identification']
    },
    branch: {
      type: String,
      required: [true, 'Please specify academic department / branch (e.g. CSE, IT, ECE)'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'Please specify academic year (1-4)'],
      min: 1,
      max: 4
    },
    currentSemester: {
      type: Number,
      required: [true, 'Please specify current semester (1-8)'],
      min: 1,
      max: 8
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    studyPreferences: {
      dailyTargetHours: {
        type: Number,
        default: 3,
        min: 1,
        max: 12
      },
      preferredStudyTimes: {
        type: [String],
        enum: ['morning', 'afternoon', 'evening', 'night'],
        default: ['evening', 'night']
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Auth Token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      rollNumber: this.rollNumber,
      role: this.role,
      name: this.name,
      gender: this.gender,
      currentSemester: this.currentSemester
    },
    process.env.JWT_SECRET || 'student_analytics_jwt_secret_dev_key',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

module.exports = mongoose.model('User', userSchema);
