const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required (e.g. CS501)'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required (1-8)'],
      min: 1,
      max: 8
    },
    branch: {
      type: String,
      required: [true, 'Branch is required (e.g. CSE, IT, ECE)'],
      trim: true,
      uppercase: true
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 10,
      default: 3
    },
    isElective: {
      type: Boolean,
      default: false
    },
    maxMarks: {
      quiz: { type: Number, default: 20 },
      surpriseTest: { type: Number, default: 10 },
      midTerm: { type: Number, default: 30 },
      endTerm: { type: Number, default: 40 },
      total: { type: Number, default: 100 }
    },
    syllabusModules: [
      {
        moduleNumber: Number,
        title: String,
        topics: [String]
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Subject', subjectSchema);
