const mongoose = require('mongoose');

const mentorshipRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senior: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    topic: {
      type: String,
      required: [true, 'Please specify the topic or module you need help with'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Please describe your doubt or mentorship requirement'],
      trim: true
    },
    femaleMentorOnly: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending'
    },
    responseNote: {
      type: String,
      default: ''
    },
    scheduledTime: {
      type: Date
    },
    meetingLink: {
      type: String,
      default: ''
    },
    respondedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

mentorshipRequestSchema.index({ student: 1, senior: 1, status: 1 });

module.exports = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
