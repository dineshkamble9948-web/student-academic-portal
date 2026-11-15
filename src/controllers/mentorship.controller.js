const SeniorProfile = require('../models/SeniorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const MentorshipService = require('../services/mentorship.service');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all available Senior Mentors with filters (subject, gender, capacity)
 * @route   GET /api/mentors
 * @access  Private
 */
const getMentors = asyncHandler(async (req, res, next) => {
  const { subjectCode, femaleOnly, branch, minCgpa } = req.query;

  const mentors = await MentorshipService.getAvailableMentors({
    subjectCode,
    femaleOnly,
    branch,
    minCgpa,
    onlyAvailable: true
  });

  return ApiResponse.success(res, 'Available senior mentors fetched successfully', {
    count: mentors.length,
    mentors
  });
});

/**
 * @desc    Submit a mentorship request to a Senior
 * @route   POST /api/mentorship/request
 * @access  Private (Student)
 */
const sendMentorshipRequest = asyncHandler(async (req, res, next) => {
  const { seniorId, subjectId, topic, message, femaleMentorOnly } = req.body;

  if (!seniorId || !topic || !message) {
    return next(ApiError.badRequest('Please provide seniorId, topic, and message'));
  }

  const newRequest = await MentorshipService.createMentorshipRequest(req.user._id, {
    seniorId,
    subjectId,
    topic,
    message,
    femaleMentorOnly
  });

  return ApiResponse.created(res, 'Mentorship request sent successfully', newRequest);
});

/**
 * @desc    Get student's own sent mentorship requests
 * @route   GET /api/mentorship/my-requests
 * @access  Private
 */
const getMyRequests = asyncHandler(async (req, res, next) => {
  let requests;

  if (req.user.role === 'Senior') {
    // Requests received as a mentor
    requests = await MentorshipRequest.find({ senior: req.user._id })
      .populate('student', 'name email rollNumber gender branch currentSemester')
      .populate('subject', 'subjectCode name')
      .sort({ createdAt: -1 });
  } else {
    // Requests sent as a mentee/student
    requests = await MentorshipRequest.find({ student: req.user._id })
      .populate('senior', 'name email rollNumber gender branch')
      .populate('subject', 'subjectCode name')
      .sort({ createdAt: -1 });
  }

  return ApiResponse.success(res, 'Mentorship requests retrieved', {
    role: req.user.role,
    count: requests.length,
    requests
  });
});

/**
 * @desc    Senior accepts or rejects a mentorship request
 * @route   PUT /api/mentorship/requests/:id/respond
 * @access  Private (Senior)
 */
const respondToRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { action, responseNote, scheduledTime, meetingLink } = req.body;

  if (!action || !['accepted', 'rejected'].includes(action)) {
    return next(ApiError.badRequest(`Action must be 'accepted' or 'rejected'`));
  }

  const updatedRequest = await MentorshipService.respondToRequest(
    req.user._id,
    id,
    action,
    responseNote,
    scheduledTime,
    meetingLink
  );

  return ApiResponse.success(
    res,
    `Mentorship request has been ${action} successfully`,
    updatedRequest
  );
});

/**
 * @desc    Create or update Senior's mentor profile
 * @route   PUT /api/mentorship/profile
 * @access  Private (Senior)
 */
const updateMentorProfile = asyncHandler(async (req, res, next) => {
  const {
    subjectExpertise,
    previousSemCgpa,
    bio,
    availabilityStatus,
    availableDays,
    availableHoursPerWeek,
    preferredSlots,
    maxMentees,
    preferredCommunication
  } = req.body;

  let profile = await SeniorProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = new SeniorProfile({
      user: req.user._id,
      previousSemCgpa: previousSemCgpa || 8.0
    });
  }

  if (subjectExpertise) profile.subjectExpertise = subjectExpertise;
  if (previousSemCgpa !== undefined) profile.previousSemCgpa = previousSemCgpa;
  if (bio !== undefined) profile.bio = bio;
  if (availabilityStatus !== undefined) profile.availabilityStatus = availabilityStatus;
  if (availableDays) profile.availableDays = availableDays;
  if (availableHoursPerWeek !== undefined) profile.availableHoursPerWeek = availableHoursPerWeek;
  if (preferredSlots) profile.preferredSlots = preferredSlots;
  if (maxMentees !== undefined) profile.maxMentees = maxMentees;
  if (preferredCommunication) profile.preferredCommunication = preferredCommunication;

  await profile.save();

  return ApiResponse.success(res, 'Mentor profile updated successfully', profile);
});

/**
 * @desc    Get mentor profile of currently logged-in Senior
 * @route   GET /api/mentorship/profile
 * @access  Private (Senior)
 */
const getMyMentorProfile = asyncHandler(async (req, res, next) => {
  const profile = await SeniorProfile.findOne({ user: req.user._id }).populate(
    'user',
    'name email rollNumber gender branch year'
  );

  if (!profile) {
    return next(ApiError.notFound('Senior mentor profile not found. Please create one'));
  }

  return ApiResponse.success(res, 'Senior mentor profile retrieved', profile);
});

module.exports = {
  getMentors,
  sendMentorshipRequest,
  getMyRequests,
  respondToRequest,
  updateMentorProfile,
  getMyMentorProfile
};
