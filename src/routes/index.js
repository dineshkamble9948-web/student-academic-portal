const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const academicRoutes = require('./academic.routes');
const mentorshipRoutes = require('./mentorship.routes');
const taskRoutes = require('./task.routes');
const plannerRoutes = require('./planner.routes');
const notificationRoutes = require('./notification.routes');

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount modular sub-routes
router.use('/auth', authRoutes);
router.use('/', academicRoutes);
router.use('/', mentorshipRoutes);
router.use('/', taskRoutes);
router.use('/', plannerRoutes);
router.use('/', notificationRoutes);

module.exports = router;
