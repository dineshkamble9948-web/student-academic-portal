const AnalyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get detailed weak subject analysis and diagnostics
 * @route   GET /api/student/weak-subjects
 * @access  Private
 */
const getWeakSubjects = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const semester = Number(req.query.semester) || req.user.currentSemester;

  const analysis = await AnalyticsService.identifyWeakSubjects(studentId, semester);

  return ApiResponse.success(res, 'Weak subjects analysis completed', analysis);
});

module.exports = {
  getWeakSubjects
};
