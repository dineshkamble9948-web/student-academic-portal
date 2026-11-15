const NotificationService = require('../services/notification.service');
const Notification = require('../models/Notification');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get logged in user notifications with optional type and unread filters
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res, next) => {
  const { unread, type } = req.query;

  const filter = { recipient: req.user._id };
  if (unread === 'true') filter.isRead = false;
  if (type) filter.type = type;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false
  });

  return ApiResponse.success(res, 'Notifications fetched successfully', {
    unreadCount,
    count: notifications.length,
    notifications
  });
});

/**
 * @desc    Create a custom academic reminder or notification
 * @route   POST /api/notifications
 * @access  Private
 */
const createNotification = asyncHandler(async (req, res, next) => {
  const { recipientId, title, message, type = 'academic', metaData } = req.body;

  if (!title || !message) {
    return next(ApiError.badRequest('Please provide title and message'));
  }

  // If no recipientId passed, defaults to the requesting user (self-reminder)
  const targetRecipient = recipientId || req.user._id;

  const notification = await Notification.create({
    recipient: targetRecipient,
    title,
    message,
    type,
    metaData: metaData || {}
  });

  return ApiResponse.created(res, 'Notification created successfully', notification);
});

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updated = await NotificationService.markAsRead(id, req.user._id);

  if (!updated) {
    return next(ApiError.notFound('Notification not found'));
  }

  return ApiResponse.success(res, 'Notification marked as read', updated);
});

/**
 * @desc    Mark all user notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res, next) => {
  await NotificationService.markAllAsRead(req.user._id);
  return ApiResponse.success(res, 'All notifications marked as read');
});

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead
};
