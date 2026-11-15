const AcademicRecord = require('../models/AcademicRecord');
const SemesterResult = require('../models/SemesterResult');
const Subject = require('../models/Subject');
const User = require('../models/User');
const AcademicService = require('../services/academic.service');
const AnalyticsService = require('../services/analytics.service');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get complete student performance (all semesters or specific semester)
 * @route   GET /api/student/performance
 * @access  Private (Student/Admin/Senior)
 */
const getStudentPerformance = asyncHandler(async (req, res, next) => {
  const targetStudentId = req.query.studentId || req.user._id;
  const semester = req.query.semester;
  const subjectCode = req.query.subjectCode;

  const query = { student: targetStudentId };
  if (semester) {
    query.semester = Number(semester);
  }

  let records = await AcademicRecord.find(query).sort({ semester: 1 });

  // Optional subject filter
  if (subjectCode) {
    records = records.map((rec) => {
      const filtered = rec.subjects.filter(
        (s) => s.subjectCode === subjectCode.toUpperCase()
      );
      const copy = rec.toObject();
      copy.subjects = filtered;
      return copy;
    });
  }

  const cgpaData = await AcademicService.calculateStudentCGPA(targetStudentId);

  return ApiResponse.success(res, 'Student performance retrieved successfully', {
    studentId: targetStudentId,
    overallCgpa: cgpaData.cgpa,
    totalCreditsEarned: cgpaData.earnedCredits,
    totalSemestersCompleted: cgpaData.completedSemesters,
    academicStanding: cgpaData.academicStanding,
    academicRecords: records,
    semesterSummary: cgpaData.semesterHistory
  });
});

/**
 * @desc    Get aggregated student dashboard metrics
 * @route   GET /api/student/dashboard
 * @access  Private
 */
const getStudentDashboard = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const currentSemester = req.user.currentSemester;

  const currentRecord = await AcademicRecord.findOne({
    student: studentId,
    semester: currentSemester
  });

  const cgpaData = await AcademicService.calculateStudentCGPA(studentId);
  const weakSubjects = await AnalyticsService.identifyWeakSubjects(studentId, currentSemester);
  const classAverages = await AnalyticsService.getClassSubjectAverages(
    currentSemester,
    req.user.branch
  );

  return ApiResponse.success(res, 'Student dashboard overview loaded', {
    student: {
      name: req.user.name,
      rollNumber: req.user.rollNumber,
      branch: req.user.branch,
      currentSemester: req.user.currentSemester,
      cgpa: cgpaData.cgpa,
      academicStanding: cgpaData.academicStanding
    },
    currentSemesterRecord: currentRecord,
    cgpaOverview: cgpaData,
    weakSubjectsOverview: {
      count: weakSubjects.weakSubjectCount,
      summary: weakSubjects.summary,
      subjects: weakSubjects.weakSubjects
    },
    classBenchmarks: classAverages
  });
});

/**
 * @desc    Get subject-wise performance for student's current or requested semester
 * @route   GET /api/student/subjects
 * @access  Private
 */
const getStudentSubjects = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const semester = Number(req.query.semester) || req.user.currentSemester;
  const subjectCode = req.query.subjectCode;

  const record = await AcademicRecord.findOne({
    student: studentId,
    semester
  });

  if (!record) {
    return ApiResponse.success(res, `No academic record found for semester ${semester}`, {
      semester,
      subjects: []
    });
  }

  let subjects = record.subjects;
  if (subjectCode) {
    subjects = subjects.filter((s) => s.subjectCode === subjectCode.toUpperCase());
  }

  const subjectsWithInsights = subjects.map((subj) => ({
    subjectCode: subj.subjectCode,
    subjectName: subj.subjectName,
    credits: subj.credits,
    assessments: {
      quiz: { scored: subj.quizMarks, max: 20 },
      surpriseTest: { scored: subj.surpriseTestMarks, max: 10 },
      midTerm: { scored: subj.midTermMarks, max: 30 },
      endTerm: { scored: subj.endTermMarks, max: 40 }
    },
    totalMarks: subj.totalMarks,
    percentage: subj.percentage,
    grade: subj.grade,
    gradePoints: subj.gradePoints
  }));

  return ApiResponse.success(res, 'Subject-wise performance retrieved', {
    semester,
    sgpa: record.sgpa,
    totalCredits: record.totalCredits,
    subjects: subjectsWithInsights
  });
});

/**
 * @desc    Get exam-wise marks broken down by assessment type with filters
 * @route   GET /api/student/exam-marks
 * @access  Private
 */
const getExamWiseMarks = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const { semester, subjectCode, examType } = req.query;

  const examMarks = await AnalyticsService.getExamWiseMarks(studentId, {
    semester,
    subjectCode,
    examType
  });

  return ApiResponse.success(res, 'Exam-wise marks retrieved successfully', {
    filters: {
      semester: semester || 'all',
      subjectCode: subjectCode || 'all',
      examType: examType || 'all'
    },
    count: examMarks.length,
    examMarks
  });
});

/**
 * @desc    Get performance analytics structured specifically for Recharts components
 * @route   GET /api/student/analytics
 * @access  Private
 */
const getPerformanceAnalytics = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const semester = req.query.semester || req.user.currentSemester;

  const analytics = await AnalyticsService.getRechartsAnalyticsData(studentId, semester);

  return ApiResponse.success(
    res,
    'Recharts-ready performance analytics generated successfully',
    analytics
  );
});

/**
 * @desc    Get stored semester results & official standing (IIIT Raichur scale)
 * @route   GET /api/student/semester-results
 * @access  Private
 */
const getSemesterResults = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const semester = req.query.semester;

  const filter = { student: studentId };
  if (semester) filter.semester = Number(semester);

  const results = await SemesterResult.find(filter).sort({ semester: 1 });

  return ApiResponse.success(res, 'Semester results retrieved successfully', {
    count: results.length,
    results
  });
});

/**
 * @desc    Get student performance comparison with class average
 * @route   GET /api/student/comparison
 * @access  Private
 */
const getStudentComparison = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const semester = Number(req.query.semester) || req.user.currentSemester;

  const studentRecord = await AcademicRecord.findOne({ student: studentId, semester });
  if (!studentRecord) {
    return next(ApiError.notFound(`No academic record found for semester ${semester}`));
  }

  const classStats = await AnalyticsService.getClassSubjectAverages(semester, req.user.branch);

  const comparison = studentRecord.subjects.map((subj) => {
    const classData = classStats[subj.subjectCode];
    const classAvgTotal = classData ? classData.classAverage.total : 0;
    const diff = Number((subj.totalMarks - classAvgTotal).toFixed(2));

    return {
      subjectCode: subj.subjectCode,
      subjectName: subj.subjectName,
      studentMarks: {
        quiz: subj.quizMarks,
        surpriseTest: subj.surpriseTestMarks,
        midTerm: subj.midTermMarks,
        endTerm: subj.endTermMarks,
        total: subj.totalMarks,
        percentage: subj.percentage,
        grade: subj.grade
      },
      classBenchmark: classData
        ? classData.classAverage
        : { quiz: 0, surpriseTest: 0, midTerm: 0, endTerm: 0, total: 0 },
      highestClassScore: classData?.highestScore || 0,
      lowestClassScore: classData?.lowestScore || 0,
      marksDifference: diff,
      status: diff > 0 ? 'Above Average' : diff === 0 ? 'At Average' : 'Below Average'
    };
  });

  return ApiResponse.success(res, 'Performance comparison with class generated', {
    semester,
    branch: req.user.branch,
    comparison
  });
});

/**
 * @desc    Get student semester-wise SGPA and cumulative CGPA
 * @route   GET /api/student/cgpa
 * @access  Private
 */
const getStudentCgpa = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;
  const cgpaDetails = await AcademicService.calculateStudentCGPA(studentId);

  return ApiResponse.success(res, 'Semester-wise SGPA and CGPA calculated', cgpaDetails);
});

/**
 * @desc    Get subject toppers for a semester
 * @route   GET /api/academic/toppers
 * @access  Private
 */
const getToppers = asyncHandler(async (req, res, next) => {
  const semester = Number(req.query.semester) || req.user.currentSemester;
  const branch = req.query.branch || req.user.branch;

  const toppers = await AnalyticsService.getSubjectToppers(semester, branch);
  return ApiResponse.success(res, 'Subject toppers retrieved successfully', {
    semester,
    branch,
    toppers
  });
});

/**
 * @desc    Batch import academic records
 * @route   POST /api/academic/import
 * @access  Private (Admin)
 */
const importAcademicRecords = asyncHandler(async (req, res, next) => {
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return next(ApiError.badRequest('Please provide a non-empty array of academic records'));
  }

  const enrichedRecords = [];
  for (const item of records) {
    let studentId = item.studentId;
    if (!studentId && item.rollNumber) {
      const student = await User.findOne({ rollNumber: item.rollNumber.toUpperCase() });
      if (!student) {
        return next(
          ApiError.badRequest(`Student with roll number ${item.rollNumber} does not exist`)
        );
      }
      studentId = student._id;
    }

    enrichedRecords.push({
      ...item,
      studentId
    });
  }

  const results = await AcademicService.bulkUpsertRecords(enrichedRecords);

  return ApiResponse.success(
    res,
    `Successfully imported/updated ${results.length} academic semester record(s)`,
    { importedCount: results.length, records: results }
  );
});

/**
 * @desc    Add or update a single student's academic record
 * @route   POST /api/academic/record
 * @access  Private (Admin)
 */
const saveAcademicRecord = asyncHandler(async (req, res, next) => {
  const { studentId, rollNumber, semester, academicYear, subjects } = req.body;

  let targetStudentId = studentId;
  let targetRollNumber = rollNumber;

  if (!targetStudentId && targetRollNumber) {
    const student = await User.findOne({ rollNumber: targetRollNumber.toUpperCase() });
    if (!student) {
      return next(ApiError.notFound(`Student with roll number ${targetRollNumber} not found`));
    }
    targetStudentId = student._id;
  } else if (targetStudentId && !targetRollNumber) {
    const student = await User.findById(targetStudentId);
    if (!student) {
      return next(ApiError.notFound('Student not found'));
    }
    targetRollNumber = student.rollNumber;
  }

  const processed = await AcademicService.bulkUpsertRecords([
    {
      studentId: targetStudentId,
      rollNumber: targetRollNumber,
      semester: Number(semester),
      academicYear: academicYear || '2023-2024',
      subjects
    }
  ]);

  return ApiResponse.success(res, 'Academic record saved successfully', processed[0]);
});

module.exports = {
  getStudentPerformance,
  getStudentDashboard,
  getStudentSubjects,
  getExamWiseMarks,
  getPerformanceAnalytics,
  getSemesterResults,
  getStudentComparison,
  getStudentCgpa,
  getToppers,
  importAcademicRecords,
  saveAcademicRecord
};
