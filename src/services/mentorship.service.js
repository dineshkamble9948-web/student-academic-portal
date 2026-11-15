const SeniorProfile = require('../models/SeniorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');

class MentorshipService {
  /**
   * Search and filter eligible Senior Mentors
   * Supports:
   * - Subject filter
   * - Female-only mentor preference
   * - Availability filter
   * - Minimum rating or CGPA filter
   */
  static async getAvailableMentors(filters = {}) {
    const {
      subjectCode,
      femaleOnly,
      branch,
      minCgpa,
      onlyAvailable = true
    } = filters;

    // Build SeniorProfile query
    const profileQuery = {};

    if (onlyAvailable) {
      profileQuery.availabilityStatus = true;
      // Ensure mentor has capacity
      profileQuery.$expr = { $lt: ['$activeMenteesCount', '$maxMentees'] };
    }

    if (minCgpa) {
      profileQuery.previousSemCgpa = { $gte: Number(minCgpa) };
    }

    if (subjectCode) {
      profileQuery['subjectExpertise.subjectCode'] = subjectCode.toUpperCase();
    }

    // Populate user and filter by gender/branch if specified
    const profiles = await SeniorProfile.find(profileQuery)
      .populate({
        path: 'user',
        select: 'name email rollNumber gender branch year avatar currentSemester'
      })
      .sort({ rating: -1, previousSemCgpa: -1 });

    // Filter by User properties (branch, gender preference)
    const filtered = profiles.filter((p) => {
      if (!p.user) return false;
      if (branch && p.user.branch.toLowerCase() !== branch.toLowerCase()) return false;
      if (femaleOnly === true || femaleOnly === 'true') {
        if (p.user.gender !== 'Female') return false;
      }
      return true;
    });

    return filtered.map((p) => ({
      mentorId: p.user._id,
      profileId: p._id,
      name: p.user.name,
      rollNumber: p.user.rollNumber,
      email: p.user.email,
      gender: p.user.gender,
      branch: p.user.branch,
      year: p.user.year,
      currentSemester: p.user.currentSemester,
      bio: p.bio,
      previousSemCgpa: p.previousSemCgpa,
      rating: p.rating,
      totalSessionsConducted: p.totalSessionsConducted,
      availabilityStatus: p.availabilityStatus,
      availableDays: p.availableDays,
      availableHoursPerWeek: p.availableHoursPerWeek,
      preferredSlots: p.preferredSlots,
      preferredCommunication: p.preferredCommunication,
      maxMentees: p.maxMentees,
      activeMenteesCount: p.activeMenteesCount,
      remainingSlots: Math.max(0, p.maxMentees - p.activeMenteesCount),
      subjectExpertise: p.subjectExpertise
    }));
  }

  /**
   * Request mentorship from a Senior
   * Validates eligibility, capacity, availability, and female mentor preference.
   */
  static async createMentorshipRequest(studentId, requestData) {
    const { seniorId, subjectId, topic, message, femaleMentorOnly = false } = requestData;

    // 1. Verify student
    const student = await User.findById(studentId);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    // 2. Verify senior user & role
    const seniorUser = await User.findById(seniorId);
    if (!seniorUser || seniorUser.role !== 'Senior') {
      throw ApiError.badRequest('The requested mentor is not registered as a Senior');
    }

    // 3. Female-only mentor validation
    if (femaleMentorOnly && seniorUser.gender !== 'Female') {
      throw ApiError.badRequest(
        'Incompatible request: You selected female-only mentor preference, but this mentor is not female'
      );
    }

    // 4. Verify senior profile, capacity, and active availability
    const seniorProfile = await SeniorProfile.findOne({ user: seniorId });
    if (!seniorProfile) {
      throw ApiError.badRequest('Senior mentor has not configured an active mentorship profile');
    }

    if (!seniorProfile.availabilityStatus) {
      throw ApiError.badRequest(
        `Senior mentor ${seniorUser.name} is currently not accepting new mentorship requests`
      );
    }

    if (seniorProfile.activeMenteesCount >= seniorProfile.maxMentees) {
      throw ApiError.badRequest(
        `Senior mentor ${seniorUser.name} has reached maximum mentee capacity (${seniorProfile.maxMentees}/${seniorProfile.maxMentees})`
      );
    }

    // 5. Check if a pending request already exists
    const existingPending = await MentorshipRequest.findOne({
      student: studentId,
      senior: seniorId,
      status: 'pending'
    });

    if (existingPending) {
      throw ApiError.conflict(
        'You already have a pending mentorship request with this senior mentor. Please wait for their response'
      );
    }

    // 6. Create mentorship request
    const newRequest = await MentorshipRequest.create({
      student: studentId,
      senior: seniorId,
      subject: subjectId,
      topic,
      message,
      femaleMentorOnly: Boolean(femaleMentorOnly),
      status: 'pending'
    });

    // 7. Dispatch in-app notification to the Senior
    await Notification.create({
      recipient: seniorId,
      title: 'New Mentorship Request',
      message: `${student.name} (${student.rollNumber}) has requested mentorship for: "${topic}"`,
      type: 'mentorship',
      metaData: {
        requestId: newRequest._id,
        studentId: student._id
      }
    });

    return newRequest;
  }

  /**
   * Respond to mentorship request (Senior accepts or rejects)
   */
  static async respondToRequest(seniorId, requestId, action, responseNote = '', scheduledTime = null, meetingLink = '') {
    const validActions = ['accepted', 'rejected'];
    if (!validActions.includes(action)) {
      throw ApiError.badRequest(`Invalid action. Must be 'accepted' or 'rejected'`);
    }

    const request = await MentorshipRequest.findById(requestId)
      .populate('student', 'name email rollNumber')
      .populate('senior', 'name email');

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.senior._id.toString() !== seniorId.toString()) {
      throw ApiError.forbidden('You are not authorized to respond to this mentorship request');
    }

    if (request.status !== 'pending') {
      throw ApiError.badRequest(`This request has already been ${request.status}`);
    }

    // If accepting, ensure capacity hasn't been exceeded in the interim
    const seniorProfile = await SeniorProfile.findOne({ user: seniorId });
    if (action === 'accepted') {
      if (seniorProfile.activeMenteesCount >= seniorProfile.maxMentees) {
        throw ApiError.badRequest('Cannot accept: Your mentee capacity limit has been reached');
      }

      seniorProfile.activeMenteesCount += 1;
      await seniorProfile.save();
    }

    request.status = action;
    request.responseNote = responseNote;
    request.respondedAt = new Date();
    if (scheduledTime) request.scheduledTime = new Date(scheduledTime);
    if (meetingLink) request.meetingLink = meetingLink;
    await request.save();

    // Notify Student
    await Notification.create({
      recipient: request.student._id,
      title: `Mentorship Request ${action === 'accepted' ? 'Accepted!' : 'Declined'}`,
      message: `Senior ${request.senior.name} has ${action} your mentorship request for "${request.topic}". ${
        responseNote ? `Note: ${responseNote}` : ''
      }`,
      type: 'mentorship',
      metaData: {
        requestId: request._id,
        seniorId: request.senior._id
      }
    });

    return request;
  }
}

module.exports = MentorshipService;
