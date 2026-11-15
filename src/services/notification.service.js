const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Send notification to user
   */
  static async sendNotification({ recipientId, title, message, type = 'system', metaData = {} }) {
    try {
      return await Notification.create({
        recipient: recipientId,
        title,
        message,
        type,
        metaData
      });
    } catch (error) {
      console.error(`[Notification Error] Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Retrieve student notifications
   */
  static async getUserNotifications(userId, unreadOnly = false) {
    const filter = { recipient: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }
    return await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId) {
    return await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  }
}

module.exports = NotificationService;
