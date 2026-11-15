const express = require('express');
const router = express.Router();
const {
  getStudyPlanner,
  getRecommendations,
  createStudySession,
  getStudySessions,
  updateStudySession,
  deleteStudySession,
  getExamTimetable,
  addExamToTimetable,
  completeTaskAndRebalance
} = require('../controllers/planner.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(protect);

// Dynamic Weekly Schedule & Study Recommendations
router.get('/planner', getStudyPlanner);
router.get('/planner/recommendations', getRecommendations);

// Study Sessions CRUD
router.route('/planner/sessions')
  .get(getStudySessions)
  .post(createStudySession);

router.route('/planner/sessions/:id')
  .put(updateStudySession)
  .delete(deleteStudySession);

// Examination Timetable
router.get('/planner/timetable', getExamTimetable);
router.post('/planner/timetable', authorize('Admin'), addExamToTimetable);

// Task completion with instant schedule rebalancing
router.patch('/planner/tasks/:id/complete', completeTaskAndRebalance);

module.exports = router;
