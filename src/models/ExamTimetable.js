const mongoose = require('mongoose');

const examTimetableSchema = new mongoose.Schema(
  {
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },
    branch: {
      type: String,
      required: true,
      uppercase: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    subjectCode: {
      type: String,
      required: true,
      uppercase: true
    },
    subjectName: {
      type: String,
      required: true
    },
    examType: {
      type: String,
      enum: ['quiz', 'surprise_test', 'mid_term', 'end_term'],
      required: true
    },
    examDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      default: '10:00 AM'
    },
    endTime: {
      type: String,
      default: '01:00 PM'
    },
    venue: {
      type: String,
      default: 'Main Exam Block'
    },
    weightageMarks: {
      type: Number,
      default: 40
    },
    syllabusUnits: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

examTimetableSchema.index({ semester: 1, branch: 1, examDate: 1 });

module.exports = mongoose.model('ExamTimetable', examTimetableSchema);
