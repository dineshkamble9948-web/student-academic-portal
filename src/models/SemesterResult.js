const mongoose = require('mongoose');

const semesterResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rollNumber: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },
    academicYear: {
      type: String,
      default: '2023-2024'
    },
    sgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    cgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    totalCredits: {
      type: Number,
      required: true,
      default: 0
    },
    earnedCredits: {
      type: Number,
      required: true,
      default: 0
    },
    backlogCount: {
      type: Number,
      default: 0
    },
    gradingScheme: {
      type: String,
      default: 'IIIT_RAICHUR_10_POINT'
    },
    academicStanding: {
      type: String,
      enum: ['GOOD_STANDING', 'ACADEMIC_PROBATION', 'HONORS_ELIGIBLE', 'CRITICAL'],
      default: 'GOOD_STANDING'
    },
    weakSubjectCodes: {
      type: [String],
      default: []
    },
    recommendations: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

semesterResultSchema.index({ student: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('SemesterResult', semesterResultSchema);
