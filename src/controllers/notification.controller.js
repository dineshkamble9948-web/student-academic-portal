const NotificationService = require('../services/notification.service');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get logged in user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res, next) => {
  const unreadOnly = req.query.unread === 'true';
  const notifications = await NotificationService.getUserNotifications(req.user._id, unreadOnly);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return ApiResponse.success(res, 'Notifications fetched successfully', {
    unreadCount,
    notifications
  });
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
  markAsRead,
  markAllAsRead
};
