const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead
} = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/notifications')
  .get(getNotifications)
  .post(createNotification);

router.patch('/notifications/read-all', markAllAsRead);
router.patch('/notifications/:id/read', markAsRead);

module.exports = router;
