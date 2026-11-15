const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicRecord = require('../models/AcademicRecord');
const SeniorProfile = require('../models/SeniorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const Task = require('../models/Task');
const ExamTimetable = require('../models/ExamTimetable');
const Notification = require('../models/Notification');
const SemesterResult = require('../models/SemesterResult');
const StudySession = require('../models/StudySession');
const AcademicService = require('../services/academic.service');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/student_analytics_db';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Subject.deleteMany({}),
      AcademicRecord.deleteMany({}),
      SemesterResult.deleteMany({}),
      SeniorProfile.deleteMany({}),
      MentorshipRequest.deleteMany({}),
      Task.deleteMany({}),
      StudySession.deleteMany({}),
      ExamTimetable.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('🌱 Seeding Subjects...');
    const subjects = await Subject.insertMany([
      {
        subjectCode: 'CS501',
        name: 'Database Management Systems',
        semester: 5,
        branch: 'CSE',
        credits: 4,
        maxMarks: { quiz: 20, surpriseTest: 10, midTerm: 30, endTerm: 40, total: 100 },
        syllabusModules: [
          { moduleNumber: 1, title: 'ER Modeling and Relational Algebra', topics: ['ER Diagrams', 'Relational Calculus'] },
          { moduleNumber: 2, title: 'SQL & Query Processing', topics: ['Joins', 'Aggregations', 'Cost Estimation'] },
          { moduleNumber: 3, title: 'Normalization', topics: ['1NF', '2NF', '3NF', 'BCNF'] },
          { moduleNumber: 4, title: 'Transaction & Concurrency', topics: ['ACID', '2PL', 'Deadlocks'] }
        ]
      },
      {
        subjectCode: 'CS502',
        name: 'Operating Systems',
        semester: 5,
        branch: 'CSE',
        credits: 4,
        maxMarks: { quiz: 20, surpriseTest: 10, midTerm: 30, endTerm: 40, total: 100 },
        syllabusModules: [
          { moduleNumber: 1, title: 'Processes and Threads', topics: ['PCB', 'Fork', 'Context Switch'] },
          { moduleNumber: 2, title: 'CPU Scheduling & Synchronization', topics: ['Round Robin', 'Semaphores'] },
          { moduleNumber: 3, title: 'Memory Management', topics: ['Paging', 'TLB', 'Virtual Memory'] }
        ]
      },
      {
        subjectCode: 'CS503',
        name: 'Computer Networks',
        semester: 5,
        branch: 'CSE',
        credits: 4,
        maxMarks: { quiz: 20, surpriseTest: 10, midTerm: 30, endTerm: 40, total: 100 }
      },
      {
        subjectCode: 'CS504',
        name: 'Theory of Computation',
        semester: 5,
        branch: 'CSE',
        credits: 3,
        maxMarks: { quiz: 20, surpriseTest: 10, midTerm: 30, endTerm: 40, total: 100 }
      },
      {
        subjectCode: 'CS505',
        name: 'Software Engineering & Agile Methodologies',
        semester: 5,
        branch: 'CSE',
        credits: 3,
        maxMarks: { quiz: 20, surpriseTest: 10, midTerm: 30, endTerm: 40, total: 100 }
      }
    ]);

    const subjectMap = {};
    subjects.forEach((s) => {
      subjectMap[s.subjectCode] = s;
    });

    console.log('🌱 Seeding Users (Students, Seniors, Admin)...');
    // Note: User.create triggers the bcrypt password hashing pre-save hook
    const student1 = await User.create({
      name: 'Aarav Sharma',
      rollNumber: '21CS001',
      email: 'aarav.sharma@college.edu',
      password: 'password123',
      role: 'Student',
      gender: 'Male',
      branch: 'CSE',
      year: 3,
      currentSemester: 5,
      phone: '+91 9876543210',
      studyPreferences: { dailyTargetHours: 3, preferredStudyTimes: ['evening', 'night'] }
    });

    const student2 = await User.create({
      name: 'Ananya Iyer',
      rollNumber: '21CS002',
      email: 'ananya.iyer@college.edu',
      password: 'password123',
      role: 'Student',
      gender: 'Female',
      branch: 'CSE',
      year: 3,
      currentSemester: 5,
      phone: '+91 9876543211',
      studyPreferences: { dailyTargetHours: 4, preferredStudyTimes: ['morning', 'evening'] }
    });

    const student3 = await User.create({
      name: 'Rohan Verma',
      rollNumber: '21CS003',
      email: 'rohan.verma@college.edu',
      password: 'password123',
      role: 'Student',
      gender: 'Male',
      branch: 'CSE',
      year: 3,
      currentSemester: 5,
      phone: '+91 9876543212',
      studyPreferences: { dailyTargetHours: 2, preferredStudyTimes: ['night'] }
    });

    // Seniors
    const seniorPriya = await User.create({
      name: 'Priya Patel',
      rollNumber: '20CS055',
      email: 'priya.patel@college.edu',
      password: 'password123',
      role: 'Senior',
      gender: 'Female',
      branch: 'CSE',
      year: 4,
      currentSemester: 7,
      phone: '+91 9876543220'
    });

    const seniorVikram = await User.create({
      name: 'Vikramaditya Rao',
      rollNumber: '20CS088',
      email: 'vikram.rao@college.edu',
      password: 'password123',
      role: 'Senior',
      gender: 'Male',
      branch: 'CSE',
      year: 4,
      currentSemester: 7,
      phone: '+91 9876543221'
    });

    const seniorSneha = await User.create({
      name: 'Sneha Mukherjee',
      rollNumber: '20CS091',
      email: 'sneha.mukherjee@college.edu',
      password: 'password123',
      role: 'Senior',
      gender: 'Female',
      branch: 'CSE',
      year: 4,
      currentSemester: 7,
      phone: '+91 9876543222'
    });

    // Admin
    const adminUser = await User.create({
      name: 'Dr. Rajesh Kulkarni (HOD CSE)',
      rollNumber: 'ADMIN001',
      email: 'hod.cse@college.edu',
      password: 'password123',
      role: 'Admin',
      gender: 'Male',
      branch: 'CSE',
      year: 4,
      currentSemester: 8,
      phone: '+91 9876543299'
    });

    console.log('🌱 Seeding Senior Mentor Profiles...');
    await SeniorProfile.create([
      {
        user: seniorPriya._id,
        previousSemCgpa: 9.35,
        bio: 'ACM Student Chapter Lead. Secured Grade O in DBMS and Computer Networks. Passionate about teaching system design and SQL normalization.',
        availabilityStatus: true,
        availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        availableHoursPerWeek: 6,
        preferredSlots: ['5:00 PM - 7:00 PM', '8:00 PM - 9:30 PM'],
        maxMentees: 4,
        activeMenteesCount: 1,
        rating: 4.95,
        totalSessionsConducted: 14,
        preferredCommunication: 'Hybrid',
        subjectExpertise: [
          {
            subject: subjectMap['CS501']._id,
            subjectCode: 'CS501',
            subjectName: 'Database Management Systems',
            gradeAcquired: 'O',
            proficiencyLevel: 'Expert'
          },
          {
            subject: subjectMap['CS503']._id,
            subjectCode: 'CS503',
            subjectName: 'Computer Networks',
            gradeAcquired: 'A+',
            proficiencyLevel: 'Advanced'
          }
        ]
      },
      {
        user: seniorVikram._id,
        previousSemCgpa: 8.85,
        bio: 'Kernel programming enthusiast. Open source contributor to Linux core utilities. Mentoring juniors in Operating Systems and Concurrency.',
        availabilityStatus: true,
        availableDays: ['Tuesday', 'Thursday', 'Sunday'],
        availableHoursPerWeek: 4,
        preferredSlots: ['6:00 PM - 8:00 PM'],
        maxMentees: 3,
        activeMenteesCount: 1,
        rating: 4.8,
        totalSessionsConducted: 9,
        preferredCommunication: 'Online',
        subjectExpertise: [
          {
            subject: subjectMap['CS502']._id,
            subjectCode: 'CS502',
            subjectName: 'Operating Systems',
            gradeAcquired: 'O',
            proficiencyLevel: 'Expert'
          }
        ]
      },
      {
        user: seniorSneha._id,
        previousSemCgpa: 9.6,
        bio: 'Department Gold Medalist. Specialized in Automata and Formal Languages. Currently at capacity with full mentee batch.',
        availabilityStatus: false, // unavailable to test validation rule!
        availableDays: ['Saturday', 'Sunday'],
        availableHoursPerWeek: 2,
        maxMentees: 2,
        activeMenteesCount: 2, // at capacity
        rating: 5.0,
        totalSessionsConducted: 20,
        preferredCommunication: 'In-Person',
        subjectExpertise: [
          {
            subject: subjectMap['CS504']._id,
            subjectCode: 'CS504',
            subjectName: 'Theory of Computation',
            gradeAcquired: 'O',
            proficiencyLevel: 'Expert'
          }
        ]
      }
    ]);

    console.log('🌱 Seeding Academic Records...');
    // Aarav Sharma Semester 4 (Past semester for CGPA calculation)
    const aaravSem4Subjects = [
      { subject: subjectMap['CS501']._id, subjectCode: 'CS401', subjectName: 'Discrete Mathematics', credits: 4, quizMarks: 16, surpriseTestMarks: 8, midTermMarks: 24, endTermMarks: 32 },
      { subject: subjectMap['CS502']._id, subjectCode: 'CS402', subjectName: 'Computer Organization & Architecture', credits: 4, quizMarks: 15, surpriseTestMarks: 7, midTermMarks: 22, endTermMarks: 30 }
    ];
    await AcademicService.bulkUpsertRecords([
      { studentId: aaravSem4Subjects[0].studentId || student1._id, rollNumber: student1.rollNumber, semester: 4, academicYear: '2022-2023', subjects: aaravSem4Subjects }
    ]);

    // Aarav Sharma Semester 5 (Current semester with 1 weak subject in DBMS)
    const aaravSem5Subjects = [
      {
        subject: subjectMap['CS501']._id,
        subjectCode: 'CS501',
        subjectName: 'Database Management Systems',
        credits: 4,
        quizMarks: 11, // Declining: Quiz 55% -> Surprise 40% -> Mid-Term 33%
        surpriseTestMarks: 4,
        midTermMarks: 10,
        endTermMarks: 20 // Total = 45% (Critical Weak Subject!)
      },
      {
        subject: subjectMap['CS502']._id,
        subjectCode: 'CS502',
        subjectName: 'Operating Systems',
        credits: 4,
        quizMarks: 17,
        surpriseTestMarks: 8,
        midTermMarks: 25,
        endTermMarks: 33 // Total = 83% (Good)
      },
      {
        subject: subjectMap['CS503']._id,
        subjectCode: 'CS503',
        subjectName: 'Computer Networks',
        credits: 4,
        quizMarks: 16,
        surpriseTestMarks: 7,
        midTermMarks: 23,
        endTermMarks: 31 // Total = 77% (Above Average)
      },
      {
        subject: subjectMap['CS504']._id,
        subjectCode: 'CS504',
        subjectName: 'Theory of Computation',
        credits: 3,
        quizMarks: 12,
        surpriseTestMarks: 5,
        midTermMarks: 15,
        endTermMarks: 24 // Total = 56% (Moderate Weak Subject)
      },
      {
        subject: subjectMap['CS505']._id,
        subjectCode: 'CS505',
        subjectName: 'Software Engineering',
        credits: 3,
        quizMarks: 18,
        surpriseTestMarks: 9,
        midTermMarks: 27,
        endTermMarks: 35 // Total = 89% (Very Good)
      }
    ];

    // Ananya Iyer Semester 5 (Topper marks)
    const ananyaSem5Subjects = [
      { subject: subjectMap['CS501']._id, subjectCode: 'CS501', subjectName: 'Database Management Systems', credits: 4, quizMarks: 20, surpriseTestMarks: 10, midTermMarks: 29, endTermMarks: 39 }, // 98%
      { subject: subjectMap['CS502']._id, subjectCode: 'CS502', subjectName: 'Operating Systems', credits: 4, quizMarks: 19, surpriseTestMarks: 9, midTermMarks: 28, endTermMarks: 38 }, // 94%
      { subject: subjectMap['CS503']._id, subjectCode: 'CS503', subjectName: 'Computer Networks', credits: 4, quizMarks: 19, surpriseTestMarks: 10, midTermMarks: 29, endTermMarks: 38 }, // 96%
      { subject: subjectMap['CS504']._id, subjectCode: 'CS504', subjectName: 'Theory of Computation', credits: 3, quizMarks: 18, surpriseTestMarks: 9, midTermMarks: 27, endTermMarks: 36 }, // 90%
      { subject: subjectMap['CS505']._id, subjectCode: 'CS505', subjectName: 'Software Engineering', credits: 3, quizMarks: 20, surpriseTestMarks: 10, midTermMarks: 30, endTermMarks: 40 } // 100%
    ];

    // Rohan Verma Semester 5 (Average student)
    const rohanSem5Subjects = [
      { subject: subjectMap['CS501']._id, subjectCode: 'CS501', subjectName: 'Database Management Systems', credits: 4, quizMarks: 14, surpriseTestMarks: 7, midTermMarks: 20, endTermMarks: 28 }, // 69%
      { subject: subjectMap['CS502']._id, subjectCode: 'CS502', subjectName: 'Operating Systems', credits: 4, quizMarks: 13, surpriseTestMarks: 6, midTermMarks: 18, endTermMarks: 25 }, // 62%
      { subject: subjectMap['CS503']._id, subjectCode: 'CS503', subjectName: 'Computer Networks', credits: 4, quizMarks: 15, surpriseTestMarks: 8, midTermMarks: 22, endTermMarks: 29 }, // 74%
      { subject: subjectMap['CS504']._id, subjectCode: 'CS504', subjectName: 'Theory of Computation', credits: 3, quizMarks: 11, surpriseTestMarks: 5, midTermMarks: 14, endTermMarks: 21 }, // 51%
      { subject: subjectMap['CS505']._id, subjectCode: 'CS505', subjectName: 'Software Engineering', credits: 3, quizMarks: 15, surpriseTestMarks: 8, midTermMarks: 24, endTermMarks: 31 } // 78%
    ];

    await AcademicService.bulkUpsertRecords([
      { studentId: student1._id, rollNumber: student1.rollNumber, semester: 5, academicYear: '2023-2024', subjects: aaravSem5Subjects },
      { studentId: student2._id, rollNumber: student2.rollNumber, semester: 5, academicYear: '2023-2024', subjects: ananyaSem5Subjects },
      { studentId: student3._id, rollNumber: student3.rollNumber, semester: 5, academicYear: '2023-2024', subjects: rohanSem5Subjects }
    ]);

    console.log('🌱 Seeding Exam Timetable...');
    const today = new Date();
    await ExamTimetable.insertMany([
      {
        semester: 5,
        branch: 'CSE',
        subject: subjectMap['CS501']._id,
        subjectCode: 'CS501',
        subjectName: 'Database Management Systems',
        examType: 'end_term',
        examDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000), // in 4 days
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        venue: 'Hall A-101',
        syllabusUnits: ['Relational Model', 'SQL Joins', 'BCNF Normalization', 'Transactions']
      },
      {
        semester: 5,
        branch: 'CSE',
        subject: subjectMap['CS502']._id,
        subjectCode: 'CS502',
        subjectName: 'Operating Systems',
        examType: 'end_term',
        examDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // in 7 days
        startTime: '10:00 AM',
        endTime: '01:00 PM',
        venue: 'Hall A-102',
        syllabusUnits: ['Process Synchronization', 'Memory Paging', 'File Systems']
      },
      {
        semester: 5,
        branch: 'CSE',
        subject: subjectMap['CS504']._id,
        subjectCode: 'CS504',
        subjectName: 'Theory of Computation',
        examType: 'end_term',
        examDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // in 10 days
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        venue: 'Hall B-204',
        syllabusUnits: ['Context-Free Grammars', 'Pushdown Automata', 'Turing Machines']
      }
    ]);

    console.log('🌱 Seeding Tasks & Assignments...');
    await Task.insertMany([
      {
        student: student1._id,
        title: 'DBMS Lab Assignment 4: Complex SQL Joins & Views',
        type: 'assignment',
        subject: subjectMap['CS501']._id,
        subjectCode: 'CS501',
        description: 'Implement outer joins, sub-queries, and materialized views on university database schema.',
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        estimatedHours: 3,
        priority: 'high',
        status: 'todo'
      },
      {
        student: student1._id,
        title: 'OS Mini Project: Linux Process Monitor in C',
        type: 'project',
        subject: subjectMap['CS502']._id,
        subjectCode: 'CS502',
        description: 'Read /proc filesystem to display CPU utilization, memory map, and task list.',
        dueDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000), // in 6 days
        estimatedHours: 8,
        priority: 'high',
        status: 'in_progress'
      },
      {
        student: student1._id,
        title: 'Software Engineering Sprint 2 Presentation',
        type: 'presentation',
        subject: subjectMap['CS505']._id,
        subjectCode: 'CS505',
        description: 'Present user story mapping and Scrum burndown charts for team project.',
        dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // in 5 days
        estimatedHours: 2,
        priority: 'medium',
        status: 'todo'
      }
    ]);

    console.log('🌱 Seeding Study Sessions...');
    await StudySession.insertMany([
      {
        student: student1._id,
        title: 'DBMS Normalization & BCNF Decomposition Revision',
        subject: subjectMap['CS501']._id,
        subjectCode: 'CS501',
        scheduledDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        startTime: '18:00',
        endTime: '19:30',
        durationMinutes: 90,
        topic: 'Lossless join & Dependency preservation proofs',
        goals: ['Solve 5 textbook numericals on BCNF', 'Review Priya mentor session notes'],
        isWeakSubjectFocus: true,
        priority: 'urgent',
        status: 'scheduled'
      },
      {
        student: student1._id,
        title: 'Operating Systems Virtual Memory & Paging',
        subject: subjectMap['CS502']._id,
        subjectCode: 'CS502',
        scheduledDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: '20:00',
        endTime: '21:00',
        durationMinutes: 60,
        topic: 'TLB miss rates & page fault handling',
        goals: ['Calculate effective access time with TLB'],
        isWeakSubjectFocus: false,
        priority: 'medium',
        status: 'scheduled'
      }
    ]);

    console.log('🌱 Seeding Mentorship Request & Notifications...');
    const req1 = await MentorshipRequest.create({
      student: student1._id,
      senior: seniorPriya._id,
      subject: subjectMap['CS501']._id,
      topic: 'SQL Normalization (BCNF vs 3NF)',
      message: 'Hi Priya, I scored low in Mid-Terms for normalization proofs. Could you help me review sample problems this week?',
      femaleMentorOnly: false,
      status: 'accepted',
      responseNote: 'Sure Aarav! Let us connect on Wednesday at 6 PM on Google Meet.',
      scheduledTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      meetingLink: 'https://meet.google.com/abc-defg-hij'
    });

    await Notification.create([
      {
        recipient: student1._id,
        title: 'Mentorship Request Accepted!',
        message: 'Senior Priya Patel has accepted your mentorship request for "SQL Normalization (BCNF vs 3NF)".',
        type: 'mentorship',
        metaData: { requestId: req1._id, seniorId: seniorPriya._id }
      },
      {
        recipient: student1._id,
        title: 'Upcoming Deadline Alert',
        message: 'Your assignment "DBMS Lab Assignment 4: Complex SQL Joins & Views" is due in 48 hours.',
        type: 'deadline',
        metaData: { subjectCode: 'CS501' }
      }
    ]);

    console.log('====================================================');
    console.log('✅ Realistic Mock Data Seeded Successfully!');
    console.log('====================================================');
    console.log('Test Credentials:');
    console.log('  Student 1: aarav.sharma@college.edu (Roll: 21CS001) / password123');
    console.log('  Student 2: ananya.iyer@college.edu  (Roll: 21CS002) / password123');
    console.log('  Senior 1:  priya.patel@college.edu  (Roll: 20CS055) / password123');
    console.log('  Senior 2:  vikram.rao@college.edu   (Roll: 20CS088) / password123');
    console.log('  Admin:     hod.cse@college.edu      (Roll: ADMIN001) / password123');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
