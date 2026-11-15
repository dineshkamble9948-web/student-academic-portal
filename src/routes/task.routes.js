const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  submitTask,
  updateTask,
  deleteTask
} = require('../controllers/task.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/tasks')
  .get(getTasks)
  .post(createTask);

router.post('/tasks/:id/submit', submitTask);

router.route('/tasks/:id')
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;
