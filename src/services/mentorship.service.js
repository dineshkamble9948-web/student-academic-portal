const SeniorProfile = require('../models/SeniorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AnalyticsService = require('./analytics.service');
const ApiError = require('../utils/apiError');

class MentorshipService {
  /**
   * Search and filter eligible Senior Mentors
   */
  static async getAvailableMentors(filters = {}) {
    const {
      subjectCode,
      femaleOnly,
      branch,
      minCgpa,
      onlyAvailable = true
    } = filters;

    const profileQuery = {};

    if (onlyAvailable) {
      profileQuery.availabilityStatus = true;
      profileQuery.$expr = { $lt: ['$activeMenteesCount', '$maxMentees'] };
    }

    if (minCgpa) {
      profileQuery.previousSemCgpa = { $gte: Number(minCgpa) };
    }

    if (subjectCode) {
      profileQuery['subjectExpertise.subjectCode'] = subjectCode.toUpperCase();
    }

    const profiles = await SeniorProfile.find(profileQuery)
      .populate({
        path: 'user',
        select: 'name email rollNumber gender branch year avatar currentSemester'
      })
      .sort({ rating: -1, previousSemCgpa: -1 });

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
   * Match available mentors specifically to student's identified weak subjects
   */
  static async matchMentorsForWeakSubjects(studentId, options = {}) {
    const student = await User.findById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    const femaleOnly = options.femaleOnly === true || options.femaleOnly === 'true';

    // 1. Identify student's weak subjects in current semester
    const weakAnalysis = await AnalyticsService.identifyWeakSubjects(
      studentId,
      student.currentSemester
    );

    const weakCodes = weakAnalysis.weakSubjects.map((w) => w.subjectCode.toUpperCase());

    if (weakCodes.length === 0) {
      return {
        studentWeakSubjects: [],
        message: 'No critical weak subjects identified. You may browse all mentors directly.',
        matchedMentors: []
      };
    }

    // 2. Fetch all active mentors with available capacity
    const availableMentors = await this.getAvailableMentors({
      branch: student.branch,
      femaleOnly,
      onlyAvailable: true
    });

    // 3. Match mentors who have expertise in these weak subjects
    const matchedMentors = [];

    availableMentors.forEach((mentor) => {
      const matchingExpertise = mentor.subjectExpertise.filter((exp) =>
        weakCodes.includes(exp.subjectCode.toUpperCase())
      );

      if (matchingExpertise.length > 0) {
        // Calculate match score: expertise grade weight + rating + CGPA
        let matchScore = matchingExpertise.length * 30 + mentor.rating * 10 + mentor.previousSemCgpa * 2;
        
        matchedMentors.push({
          ...mentor,
          matchedWeakSubjects: matchingExpertise.map((exp) => ({
            subjectCode: exp.subjectCode,
            subjectName: exp.subjectName,
            mentorGrade: exp.gradeAcquired,
            proficiencyLevel: exp.proficiencyLevel
          })),
          matchScore: Number(matchScore.toFixed(1))
        });
      }
    });

    // Sort by match score descending
    matchedMentors.sort((a, b) => b.matchScore - a.matchScore);

    return {
      studentWeakSubjects: weakAnalysis.weakSubjects.map((w) => ({
        subjectCode: w.subjectCode,
        subjectName: w.subjectName,
        severity: w.severity,
        marksGap: w.marksGap
      })),
      femalePreferenceApplied: femaleOnly,
      count: matchedMentors.length,
      matchedMentors
    };
  }

  /**
   * Request mentorship from a Senior
   */
  static async createMentorshipRequest(studentId, requestData) {
    const { seniorId, subjectId, topic, message, femaleMentorOnly = false } = requestData;

    const student = await User.findById(studentId);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const seniorUser = await User.findById(seniorId);
    if (!seniorUser || seniorUser.role !== 'Senior') {
      throw ApiError.badRequest('The requested mentor is not registered as a Senior');
    }

    if (femaleMentorOnly && seniorUser.gender !== 'Female') {
      throw ApiError.badRequest(
        'Incompatible request: You selected female-only mentor preference, but this mentor is not female'
      );
    }

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

    const newRequest = await MentorshipRequest.create({
      student: studentId,
      senior: seniorId,
      subject: subjectId,
      topic,
      message,
      femaleMentorOnly: Boolean(femaleMentorOnly),
      status: 'pending'
    });

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
   * Cancel a pending mentorship request (by Student)
   */
  static async cancelMentorshipRequest(studentId, requestId) {
    const request = await MentorshipRequest.findOne({
      _id: requestId,
      student: studentId
    });

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.status !== 'pending') {
      throw ApiError.badRequest(
        `Cannot cancel request: status is already '${request.status}'`
      );
    }

    request.status = 'cancelled';
    await request.save();

    await Notification.create({
      recipient: request.senior,
      title: 'Mentorship Request Cancelled',
      message: `A pending mentorship request for "${request.topic}" has been cancelled by the student.`,
      type: 'mentorship',
      metaData: { requestId: request._id }
    });

    return request;
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
