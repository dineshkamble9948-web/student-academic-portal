const express = require('express');
const router = express.Router();
const {
  getStudentPerformance,
  getStudentDashboard,
  getStudentSubjects,
  getStudentComparison,
  getStudentCgpa,
  getToppers,
  importAcademicRecords,
  saveAcademicRecord
} = require('../controllers/academic.controller');
const { getWeakSubjects } = require('../controllers/weakSubject.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

// All academic routes require authentication
router.use(protect);

// Student Academic Analytics routes
router.get('/student/dashboard', getStudentDashboard);
router.get('/student/subjects', getStudentSubjects);
router.get('/student/performance', getStudentPerformance);
router.get('/student/comparison', getStudentComparison);
router.get('/student/cgpa', getStudentCgpa);
router.get('/student/weak-subjects', getWeakSubjects);

// Batch & Academic Administration routes
router.get('/academic/toppers', getToppers);
router.post('/academic/import', authorize('Admin'), importAcademicRecords);
router.post('/academic/record', authorize('Admin'), saveAcademicRecord);

module.exports = router;
