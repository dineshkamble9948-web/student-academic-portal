const mongoose = require('mongoose');

const seniorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    subjectExpertise: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject'
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
        gradeAcquired: {
          type: String,
          default: 'A'
        },
        proficiencyLevel: {
          type: String,
          enum: ['Intermediate', 'Advanced', 'Expert'],
          default: 'Advanced'
        }
      }
    ],
    previousSemCgpa: {
      type: Number,
      required: [true, 'Previous semester CGPA is required for mentor verification'],
      min: 0,
      max: 10
    },
    bio: {
      type: String,
      default: 'Available for academic guidance and exam preparation.'
    },
    availabilityStatus: {
      type: Boolean,
      default: true
    },
    availableDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Wednesday', 'Friday', 'Saturday']
    },
    availableHoursPerWeek: {
      type: Number,
      default: 4,
      min: 1,
      max: 20
    },
    preferredSlots: {
      type: [String],
      default: ['5:00 PM - 7:00 PM', '8:00 PM - 10:00 PM']
    },
    maxMentees: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    activeMenteesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5
    },
    totalSessionsConducted: {
      type: Number,
      default: 0
    },
    preferredCommunication: {
      type: String,
      enum: ['Online', 'In-Person', 'Hybrid'],
      default: 'Hybrid'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SeniorProfile', seniorProfileSchema);
