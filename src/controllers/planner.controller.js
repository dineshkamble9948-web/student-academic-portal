const ExamTimetable = require('../models/ExamTimetable');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
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
  task.completedAt = new Date();
  await task.save();

  // Generate updated plan immediately after task completion
  const refreshedPlan = await PlannerService.generateStudyPlan(req.user._id, 7);

  return ApiResponse.success(res, 'Task marked as completed and study schedule rebalanced', {
    completedTask: task,
    refreshedPlan
  });
});

module.exports = {
  getStudyPlanner,
  getExamTimetable,
  addExamToTimetable,
  completeTaskAndRebalance
};
