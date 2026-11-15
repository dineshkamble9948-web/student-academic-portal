const Task = require('../models/Task');
const Subject = require('../models/Subject');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new academic task (assignment, project, presentation, study)
 * @route   POST /api/tasks
 * @access  Private (Student)
 */
const createTask = asyncHandler(async (req, res, next) => {
  const {
    title,
    type,
    subjectId,
    subjectCode,
    description,
    dueDate,
    estimatedHours,
    priority
  } = req.body;

  if (!title || !type || !dueDate) {
    return next(ApiError.badRequest('Please provide title, type, and dueDate'));
  }

  let resolvedSubjectCode = subjectCode || '';
  if (subjectId && !resolvedSubjectCode) {
    const subj = await Subject.findById(subjectId);
    if (subj) resolvedSubjectCode = subj.subjectCode;
  }

  const task = await Task.create({
    student: req.user._id,
    title,
    type,
    subject: subjectId || null,
    subjectCode: resolvedSubjectCode.toUpperCase(),
    description: description || '',
    dueDate: new Date(dueDate),
    estimatedHours: estimatedHours || 2,
    priority: priority || 'medium',
    status: 'todo'
  });

  return ApiResponse.created(res, 'Task created successfully', task);
});

/**
 * @desc    Get all tasks for current student with filtering
 * @route   GET /api/tasks
 * @access  Private (Student)
 */
const getTasks = asyncHandler(async (req, res, next) => {
  const { type, status, subjectCode, sortBy = 'dueDate' } = req.query;

  const filter = { student: req.user._id };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (subjectCode) filter.subjectCode = subjectCode.toUpperCase();

  const sortOption = {};
  if (sortBy === 'dueDate') {
    sortOption.dueDate = 1;
  } else if (sortBy === 'priority') {
    sortOption.priority = -1;
  } else {
    sortOption.createdAt = -1;
  }

  const tasks = await Task.find(filter).sort(sortOption);

  // Group summary for quick frontend stats
  const summary = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length
  };

  return ApiResponse.success(res, 'Tasks retrieved successfully', {
    summary,
    tasks
  });
});

/**
 * @desc    Update a task (status, dueDate, priority, etc.)
 * @route   PUT /api/tasks/:id
 * @access  Private (Student)
 */
const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const task = await Task.findOne({ _id: id, student: req.user._id });
  if (!task) {
    return next(ApiError.notFound('Task not found'));
  }

  // Handle completion status toggle
  if (updates.status === 'completed' && task.status !== 'completed') {
    task.completedAt = new Date();
  } else if (updates.status && updates.status !== 'completed') {
    task.completedAt = null;
  }

  Object.assign(task, updates);
  await task.save();

  return ApiResponse.success(res, 'Task updated successfully', task);
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Student)
 */
const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const task = await Task.findOneAndDelete({ _id: id, student: req.user._id });
  if (!task) {
    return next(ApiError.notFound('Task not found'));
  }

  return ApiResponse.success(res, 'Task deleted successfully', { deletedTaskId: id });
});

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask
};
