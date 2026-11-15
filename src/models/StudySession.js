const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null
    },
    subjectCode: {
      type: String,
      uppercase: true,
      default: 'GENERAL'
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required']
    },
    startTime: {
      type: String,
      default: '18:00'
    },
    endTime: {
      type: String,
      default: '19:00'
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 360
    },
    topic: {
      type: String,
      default: '',
      trim: true
    },
    goals: {
      type: [String],
      default: []
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    isWeakSubjectFocus: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'],
      default: 'scheduled'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

studySessionSchema.index({ student: 1, scheduledDate: 1, status: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
