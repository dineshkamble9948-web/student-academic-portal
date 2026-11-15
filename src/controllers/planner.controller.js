const ExamTimetable = require('../models/ExamTimetable');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const StudySession = require('../models/StudySession');
const PlannerService = require('../services/planner.service');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get dynamic rule-based priority study planner schedule
 * @route   GET /api/planner
 * @access  Private (Student)
 */
const getStudyPlanner = asyncHandler(async (req, res, next) => {
  const days = Number(req.query.days) || 7;
  const schedule = await PlannerService.generateStudyPlan(req.user._id, days);

  return ApiResponse.success(res, 'Smart study plan generated successfully', schedule);
});

/**
 * @desc    Get personalized study recommendations
 * @route   GET /api/planner/recommendations
 * @access  Private (Student)
 */
const getRecommendations = asyncHandler(async (req, res, next) => {
  const recommendations = await PlannerService.getPersonalizedRecommendations(req.user._id);
  return ApiResponse.success(
    res,
    'Personalized study recommendations retrieved',
    recommendations
  );
});

/**
 * @desc    Create a dedicated study session
 * @route   POST /api/planner/sessions
 * @access  Private (Student)
 */
const createStudySession = asyncHandler(async (req, res, next) => {
  const {
    title,
    subjectId,
    subjectCode,
    scheduledDate,
    startTime,
    endTime,
    durationMinutes,
    topic,
    goals,
    relatedTaskId,
    isWeakSubjectFocus,
    priority,
    notes
  } = req.body;

  if (!title || !scheduledDate) {
    return next(ApiError.badRequest('Please provide title and scheduledDate'));
  }

  const session = await StudySession.create({
    student: req.user._id,
    title,
    subject: subjectId || null,
    subjectCode: (subjectCode || 'GENERAL').toUpperCase(),
    scheduledDate: new Date(scheduledDate),
    startTime: startTime || '18:00',
    endTime: endTime || '19:00',
    durationMinutes: durationMinutes || 60,
    topic: topic || '',
    goals: goals || [],
    relatedTask: relatedTaskId || null,
    isWeakSubjectFocus: Boolean(isWeakSubjectFocus),
    priority: priority || 'medium',
    status: 'scheduled',
    notes: notes || ''
  });

  return ApiResponse.created(res, 'Study session scheduled successfully', session);
});

/**
 * @desc    Get student's study sessions with date/status filter
 * @route   GET /api/planner/sessions
 * @access  Private (Student)
 */
const getStudySessions = asyncHandler(async (req, res, next) => {
  const { date, status, subjectCode } = req.query;

  const filter = { student: req.user._id };
  if (status) filter.status = status;
  if (subjectCode) filter.subjectCode = subjectCode.toUpperCase();
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    filter.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const sessions = await StudySession.find(filter)
    .populate('subject', 'subjectCode name credits')
    .populate('relatedTask', 'title type dueDate priority')
    .sort({ scheduledDate: 1, startTime: 1 });

  return ApiResponse.success(res, 'Study sessions retrieved successfully', {
    count: sessions.length,
    sessions
  });
});

/**
 * @desc    Update study session details or status
 * @route   PUT /api/planner/sessions/:id
 * @access  Private (Student)
 */
const updateStudySession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const session = await StudySession.findOne({ _id: id, student: req.user._id });
  if (!session) {
    return next(ApiError.notFound('Study session not found'));
  }

  if (updates.status === 'completed' && session.status !== 'completed') {
    session.completedAt = new Date();
  }

  Object.assign(session, updates);
  await session.save();

  return ApiResponse.success(res, 'Study session updated successfully', session);
});

/**
 * @desc    Delete study session
 * @route   DELETE /api/planner/sessions/:id
 * @access  Private (Student)
 */
const deleteStudySession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const session = await StudySession.findOneAndDelete({ _id: id, student: req.user._id });
  if (!session) {
    return next(ApiError.notFound('Study session not found'));
  }

  return ApiResponse.success(res, 'Study session deleted successfully', {
    deletedSessionId: id
  });
});

/**
 * @desc    Get exam timetable for student's semester & branch
 * @route   GET /api/planner/timetable
 * @access  Private
 */
const getExamTimetable = asyncHandler(async (req, res, next) => {
  const semester = Number(req.query.semester) || req.user.currentSemester;
  const branch = req.query.branch || req.user.branch;

  const exams = await ExamTimetable.find({
    semester,
    branch: branch.toUpperCase()
  }).sort({ examDate: 1 });

  return ApiResponse.success(res, 'Exam timetable fetched successfully', {
    semester,
    branch,
    count: exams.length,
    timetable: exams
  });
});

/**
 * @desc    Add exam to timetable (Admin)
 * @route   POST /api/planner/timetable
 * @access  Private (Admin)
 */
const addExamToTimetable = asyncHandler(async (req, res, next) => {
  const {
    semester,
    branch,
    subjectId,
    subjectCode,
    subjectName,
    examType,
    examDate,
    startTime,
    endTime,
    venue,
    syllabusUnits
  } = req.body;

  let resolvedCode = subjectCode;
  let resolvedName = subjectName;

  if (subjectId && (!resolvedCode || !resolvedName)) {
    const subj = await Subject.findById(subjectId);
    if (subj) {
      resolvedCode = resolvedCode || subj.subjectCode;
      resolvedName = resolvedName || subj.name;
    }
  }

  const exam = await ExamTimetable.create({
    semester: Number(semester),
    branch: branch.toUpperCase(),
    subject: subjectId,
    subjectCode: resolvedCode.toUpperCase(),
    subjectName: resolvedName,
    examType,
    examDate: new Date(examDate),
    startTime: startTime || '10:00 AM',
    endTime: endTime || '01:00 PM',
    venue: venue || 'Main Examination Block',
    syllabusUnits: syllabusUnits || []
  });

  return ApiResponse.created(res, 'Exam timetable entry created', exam);
});

/**
 * @desc    Quick complete task from planner and return refreshed schedule
 * @route   PATCH /api/planner/tasks/:id/complete
 * @access  Private (Student)
 */
const completeTaskAndRebalance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const task = await Task.findOne({ _id: id, student: req.user._id });
  if (!task) {
    return next(ApiError.notFound('Task not found'));
  }

  task.status = 'completed';
  task.submissionStatus = 'submitted';
  task.completedAt = new Date();
  await task.save();

  const refreshedPlan = await PlannerService.generateStudyPlan(req.user._id, 7);

  return ApiResponse.success(res, 'Task marked as completed and study schedule rebalanced', {
    completedTask: task,
    refreshedPlan
  });
});

module.exports = {
  getStudyPlanner,
  getRecommendations,
  createStudySession,
  getStudySessions,
  updateStudySession,
  deleteStudySession,
  getExamTimetable,
  addExamToTimetable,
  completeTaskAndRebalance
};
