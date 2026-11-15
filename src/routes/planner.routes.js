const express = require('express');
const router = express.Router();
const {
  getStudyPlanner,
  getExamTimetable,
  addExamToTimetable,
  completeTaskAndRebalance
} = require('../controllers/planner.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(protect);

router.get('/planner', getStudyPlanner);
router.get('/planner/timetable', getExamTimetable);
router.post('/planner/timetable', authorize('Admin'), addExamToTimetable);
router.patch('/planner/tasks/:id/complete', completeTaskAndRebalance);

module.exports = router;
