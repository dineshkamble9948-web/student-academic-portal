const User = require('../models/User');
const SeniorProfile = require('../models/SeniorProfile');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Register a new user (Student, Senior, Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    rollNumber,
    email,
    password,
    role = 'Student',
    gender,
    branch,
    year,
    currentSemester,
    phone,
    studyPreferences,
    // Optional senior profile fields if registering as Senior
    previousSemCgpa,
    subjectExpertise,
    bio
  } = req.body;

  // Validation
  if (!name || !rollNumber || !email || !password || !gender || !branch || !year || !currentSemester) {
    return next(
      ApiError.badRequest(
        'Please provide all required fields: name, rollNumber, email, password, gender, branch, year, currentSemester'
      )
    );
  }

  // Check existing user
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    return next(ApiError.conflict('An account with this email address already exists'));
  }

  const existingRoll = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
  if (existingRoll) {
    return next(ApiError.conflict('An account with this roll number already exists'));
  }

  // Create user
  const user = await User.create({
    name,
    rollNumber: rollNumber.toUpperCase(),
    email: email.toLowerCase(),
    password,
    role,
    gender,
    branch: branch.toUpperCase(),
    year,
    currentSemester,
    phone: phone || '',
    studyPreferences: studyPreferences || { dailyTargetHours: 3, preferredStudyTimes: ['evening', 'night'] }
  });

  // If registering as Senior, automatically create their initial SeniorProfile
  if (role === 'Senior') {
    await SeniorProfile.create({
      user: user._id,
      previousSemCgpa: previousSemCgpa || 8.0,
      bio: bio || 'Senior mentor ready to support peers in academic coursework.',
      subjectExpertise: subjectExpertise || []
    });
  }

  const token = user.generateAuthToken();

  const userResponse = {
    id: user._id,
    name: user.name,
    rollNumber: user.rollNumber,
    email: user.email,
    role: user.role,
    gender: user.gender,
    branch: user.branch,
    year: user.year,
    currentSemester: user.currentSemester,
    studyPreferences: user.studyPreferences
  };

  return ApiResponse.created(
    res,
    'User registered successfully',
    { user: userResponse, token }
  );
});

/**
 * @desc    Login user (via email or rollNumber)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { identifier, email, rollNumber, password } = req.body;

  const loginId = identifier || email || rollNumber;
  if (!loginId || !password) {
    return next(ApiError.badRequest('Please provide email/rollNumber and password'));
  }

  // Search by email or rollNumber
  const user = await User.findOne({
    $or: [{ email: loginId.toLowerCase() }, { rollNumber: loginId.toUpperCase() }]
  }).select('+password');

  if (!user) {
    return next(ApiError.unauthorized('Invalid credentials. User not found'));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(ApiError.unauthorized('Invalid credentials. Password incorrect'));
  }

  if (!user.isActive) {
    return next(ApiError.forbidden('Your account has been deactivated. Please contact college admin'));
  }

  const token = user.generateAuthToken();

  const userResponse = {
    id: user._id,
    name: user.name,
    rollNumber: user.rollNumber,
    email: user.email,
    role: user.role,
    gender: user.gender,
    branch: user.branch,
    year: user.year,
    currentSemester: user.currentSemester,
    studyPreferences: user.studyPreferences
  };

  return ApiResponse.success(res, 'Login successful', { user: userResponse, token });
});

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res, next) => {
  return ApiResponse.success(res, 'User profile fetched successfully', { user: req.user });
});

/**
 * @desc    Update study preferences or profile details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const { phone, avatar, studyPreferences } = req.body;

  const user = await User.findById(req.user._id);
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  if (studyPreferences) {
    if (studyPreferences.dailyTargetHours) {
      user.studyPreferences.dailyTargetHours = studyPreferences.dailyTargetHours;
    }
    if (studyPreferences.preferredStudyTimes) {
      user.studyPreferences.preferredStudyTimes = studyPreferences.preferredStudyTimes;
    }
  }

  await user.save();
  return ApiResponse.success(res, 'Profile updated successfully', { user });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
