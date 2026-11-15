const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['assignment', 'project', 'presentation', 'study'],
      required: [true, 'Task type is required (assignment, project, presentation, study)']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: false
    },
    subjectCode: {
      type: String,
      uppercase: true,
      default: ''
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    estimatedHours: {
      type: Number,
      default: 2,
      min: 0.5,
      max: 40
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo'
    },
    submissionStatus: {
      type: String,
      enum: ['pending', 'submitted', 'late_submitted', 'graded', 'exempted'],
      default: 'pending'
    },
    submissionDate: {
      type: Date
    },
    submissionNotes: {
      type: String,
      default: ''
    },
    projectDeliverables: {
      type: [String],
      default: []
    },
    presentationDate: {
      type: Date
    },
    submissionLink: {
      type: String,
      default: ''
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

taskSchema.index({ student: 1, dueDate: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
