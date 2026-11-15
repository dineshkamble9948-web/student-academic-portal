const mongoose = require('mongoose');

const subjectMarkSchema = new mongoose.Schema(
  {
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
    credits: {
      type: Number,
      required: true,
      min: 1
    },
    quizMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    surpriseTestMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    midTermMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    endTermMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    grade: {
      type: String,
      default: 'P'
    },
    gradePoints: {
      type: Number,
      default: 4
    }
  },
  { _id: false }
);

const academicRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    rollNumber: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8
    },
    academicYear: {
      type: String,
      default: '2023-2024'
    },
    subjects: [subjectMarkSchema],
    totalCredits: {
      type: Number,
      default: 0
    },
    earnedCredits: {
      type: Number,
      default: 0
    },
    sgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    isVerified: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate semester records for a student
academicRecordSchema.index({ student: 1, semester: 1 }, { unique: true });
academicRecordSchema.index({ semester: 1, 'subjects.subjectCode': 1 });

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
