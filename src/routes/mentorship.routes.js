const express = require('express');
const router = express.Router();
const {
  getMentors,
  matchWeakSubjectMentors,
  sendMentorshipRequest,
  cancelMentorshipRequest,
  getMyRequests,
  respondToRequest,
  updateMentorProfile,
  getMyMentorProfile
} = require('../controllers/mentorship.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(protect);

// Student/General Mentorship routes
router.get('/mentors', getMentors);
router.get('/mentors/match-weak-subjects', authorize('Student'), matchWeakSubjectMentors);
router.post('/mentorship/request', authorize('Student'), sendMentorshipRequest);
router.patch('/mentorship/requests/:id/cancel', authorize('Student'), cancelMentorshipRequest);
router.get('/mentorship/my-requests', getMyRequests);

// Senior Mentor actions
router.put('/mentorship/requests/:id/respond', authorize('Senior', 'Admin'), respondToRequest);
router.get('/mentorship/profile', authorize('Senior', 'Admin'), getMyMentorProfile);
router.put('/mentorship/profile', authorize('Senior', 'Admin'), updateMentorProfile);

module.exports = router;
