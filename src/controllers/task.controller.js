const Task = require('../models/Task');
const Subject = require('../models/Subject');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new academic task / assignment / project / presentation
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
    priority,
    projectDeliverables,
    presentationDate
  } = req.body;

  if (!title || !type || !dueDate) {
    return next(ApiError.badRequest('Please provide title, type (assignment/project/presentation/study), and dueDate'));
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
    status: 'todo',
    submissionStatus: 'pending',
    projectDeliverables: projectDeliverables || [],
    presentationDate: presentationDate ? new Date(presentationDate) : null
  });

  return ApiResponse.created(res, `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`, task);
});

/**
 * @desc    Get all tasks for current student with filtering & submission tracking
 * @route   GET /api/tasks
 * @access  Private (Student)
 */
const getTasks = asyncHandler(async (req, res, next) => {
  const { type, status, submissionStatus, subjectCode, sortBy = 'dueDate' } = req.query;

  const filter = { student: req.user._id };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (submissionStatus) filter.submissionStatus = submissionStatus;
  if (subjectCode) filter.subjectCode = subjectCode.toUpperCase();

  const sortOption = {};
  if (sortBy === 'dueDate') {
    sortOption.dueDate = 1;
  } else if (sortBy === 'priority') {
    sortOption.priority = -1;
  } else {
    sortOption.createdAt = -1;
  }

  const tasks = await Task.find(filter).populate('subject', 'subjectCode name credits').sort(sortOption);

  const now = new Date();
  const summary = {
    total: tasks.length,
    byType: {
      assignments: tasks.filter((t) => t.type === 'assignment').length,
      projects: tasks.filter((t) => t.type === 'project').length,
      presentations: tasks.filter((t) => t.type === 'presentation').length,
      study: tasks.filter((t) => t.type === 'study').length
    },
    byStatus: {
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => t.status !== 'completed' && new Date(t.dueDate) < now).length
    },
    bySubmission: {
      pending: tasks.filter((t) => t.submissionStatus === 'pending').length,
      submitted: tasks.filter((t) => t.submissionStatus === 'submitted').length
    }
  };

  return ApiResponse.success(res, 'Academic deliverables retrieved successfully', {
    summary,
    tasks
  });
});

/**
 * @desc    Submit an assignment or project
 * @route   POST /api/tasks/:id/submit
 * @access  Private (Student)
 */
const submitTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { submissionLink, submissionNotes } = req.body;

  const task = await Task.findOne({ _id: id, student: req.user._id });
  if (!task) {
    return next(ApiError.notFound('Task not found'));
  }

  const now = new Date();
  const isLate = now > new Date(task.dueDate);

  task.submissionStatus = isLate ? 'late_submitted' : 'submitted';
  task.submissionDate = now;
  task.submissionLink = submissionLink || task.submissionLink;
  task.submissionNotes = submissionNotes || task.submissionNotes;
  task.status = 'completed';
  task.completedAt = now;

  await task.save();

  return ApiResponse.success(res, 'Assignment / project submitted successfully', task);
});

/**
 * @desc    Update a task (status, dueDate, priority, submissionStatus, etc.)
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

  if (updates.status === 'completed' && task.status !== 'completed') {
    task.completedAt = new Date();
    task.submissionStatus = 'submitted';
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
  submitTask,
  updateTask,
  deleteTask
};
