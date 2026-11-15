const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('../app');
const http = require('http');

let server;
let baseUrl;

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 Running Comprehensive API & Security Verification');
  console.log('----------------------------------------------------');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ 1. MongoDB Atlas connection verified');

  // Start app on ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`📡 Verification test server running at ${baseUrl}\n`);

  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASSED' });
      console.log(`✅ [PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAILED', error: err.message });
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  let studentToken = '';
  let seniorToken = '';
  let adminToken = '';
  let studentId = '';
  let testTaskId = '';
  let seniorId = '';
  let mentorshipReqId = '';
  let notificationId = '';

  // 1. Student Registration
  await test('Student Registration (POST /api/auth/register)', async () => {
    const roll = `TEST${Date.now().toString().slice(-4)}`;
    const email = `test.${roll.toLowerCase()}@college.edu`;
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test User',
        rollNumber: roll,
        email: email,
        password: 'password123',
        role: 'Student',
        gender: 'Male',
        branch: 'CSE',
        year: 3,
        currentSemester: 5,
        phone: '+91 9999900000'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(`Registration failed: ${json.message}`);
    }
  });

  // 2. Student Login & JWT verification
  await test('Student Login (POST /api/auth/login) & JWT Issue', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'aarav.sharma@college.edu',
        password: 'password123'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(`Login failed: ${json.message}`);
    }
    studentToken = json.data.token;
    studentId = json.data.user.id;
  });

  // 3. Senior Login & JWT verification
  await test('Senior Login (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'priya.patel@college.edu',
        password: 'password123'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(`Senior login failed: ${json.message}`);
    }
    seniorToken = json.data.token;
    seniorId = json.data.user.id;
  });

  // 4. Admin Login & JWT verification
  await test('Admin Login (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'hod.cse@college.edu',
        password: 'password123'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) {
      throw new Error(`Admin login failed: ${json.message}`);
    }
    adminToken = json.data.token;
  });

  // 5. Password Hashing Verification
  await test('Bcrypt Password Hashing Verification in DB', async () => {
    const User = require('../models/User');
    const userDoc = await User.findOne({ email: 'aarav.sharma@college.edu' }).select('+password');
    if (!userDoc || !userDoc.password) {
      throw new Error('User record not found in MongoDB');
    }
    if (userDoc.password.startsWith('password123')) {
      throw new Error('CRITICAL SECURITY FLAW: Password stored in plaintext!');
    }
    if (!userDoc.password.startsWith('$2a$') && !userDoc.password.startsWith('$2b$')) {
      throw new Error('Password hash does not conform to standard bcrypt format');
    }
    const match = await userDoc.comparePassword('password123');
    if (!match) {
      throw new Error('Bcrypt comparison failed for valid password');
    }
  });

  // 6. Auth Middleware Protection
  await test('Auth Middleware Rejects Request Without Token (401)', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized but received ${res.status}`);
    }
  });

  await test('Auth Middleware Accepts Valid Token (200)', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (res.status !== 200 || !json.success) {
      throw new Error(`Auth failed: ${json.message}`);
    }
  });

  // 7. Student Dashboard
  await test('Student Dashboard Overview (GET /api/student/dashboard)', async () => {
    const res = await fetch(`${baseUrl}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !json.data.student || !json.data.weakSubjectsOverview) {
      throw new Error(`Invalid dashboard structure`);
    }
  });

  // 8. Academic Performance
  await test('Academic Performance History (GET /api/student/performance)', async () => {
    const res = await fetch(`${baseUrl}/student/performance`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.academicRecords)) {
      throw new Error(`Performance records missing`);
    }
  });

  // 9. Subject Details
  await test('Subject Details & Marks Breakdown (GET /api/student/subjects?semester=5)', async () => {
    const res = await fetch(`${baseUrl}/student/subjects?semester=5`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.subjects) || json.data.subjects.length === 0) {
      throw new Error(`Subjects not returned`);
    }
    const sub = json.data.subjects[0];
    if (!sub.assessments || sub.assessments.quiz === undefined) {
      throw new Error(`Subject assessment breakdown missing`);
    }
  });

  // 10. Comparison with Class Average
  await test('Comparison with Class Average (GET /api/student/comparison?semester=5)', async () => {
    const res = await fetch(`${baseUrl}/student/comparison?semester=5`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.comparison)) {
      throw new Error(`Comparison data missing`);
    }
    const item = json.data.comparison[0];
    if (!item.classBenchmark || item.marksDifference === undefined) {
      throw new Error(`Class benchmark missing in comparison item`);
    }
  });

  // 11. CGPA & SGPA
  await test('CGPA and SGPA Calculation (GET /api/student/cgpa)', async () => {
    const res = await fetch(`${baseUrl}/student/cgpa`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || json.data.cgpa === undefined || !Array.isArray(json.data.semesterHistory)) {
      throw new Error(`CGPA structure missing`);
    }
  });

  // 12. Weak Subject Identification
  await test('Weak Subject Diagnostic (GET /api/student/weak-subjects?semester=5)', async () => {
    const res = await fetch(`${baseUrl}/student/weak-subjects?semester=5`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.weakSubjects)) {
      throw new Error(`Weak subjects data missing`);
    }
    const dbmsWeak = json.data.weakSubjects.find(s => s.subjectCode === 'CS501');
    if (!dbmsWeak || dbmsWeak.severity !== 'Critical') {
      throw new Error(`Weak subject logic failed to detect CS501 Critical weakness`);
    }
  });

  // 13. Subject Toppers
  await test('Subject Toppers (GET /api/academic/toppers?semester=5&branch=CSE)', async () => {
    const res = await fetch(`${baseUrl}/academic/toppers?semester=5&branch=CSE`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.toppers) || json.data.toppers.length === 0) {
      throw new Error(`Toppers list missing`);
    }
  });

  // 14. Senior Mentors List & Filters
  await test('Senior Mentors Discovery (GET /api/mentors)', async () => {
    const res = await fetch(`${baseUrl}/mentors`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.mentors) || json.data.mentors.length === 0) {
      throw new Error(`Mentors list empty`);
    }
  });

  await test('Female-Only Mentor Filter (GET /api/mentors?femaleOnly=true)', async () => {
    const res = await fetch(`${baseUrl}/mentors?femaleOnly=true`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success) throw new Error('Query failed');
    const allFemale = json.data.mentors.every(m => m.gender === 'Female');
    if (!allFemale) throw new Error('Non-female mentor returned when femaleOnly=true');
  });

  // 15. Mentorship Request System
  await test('Send Mentorship Request (POST /api/mentorship/request)', async () => {
    const Subject = require('../models/Subject');
    const dbms = await Subject.findOne({ subjectCode: 'CS501' });
    const res = await fetch(`${baseUrl}/mentorship/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seniorId: seniorId,
        subjectId: dbms._id,
        topic: 'Verification Test: Normalization Proofs',
        message: 'Requesting doubt clearing session on BCNF decomposition.'
      })
    });
    const json = await res.json();
    // Could succeed or return conflict if already pending
    if (res.status === 201) {
      mentorshipReqId = json.data._id;
    } else if (res.status === 409) {
      // Expected duplicate prevention
    } else {
      throw new Error(`Failed to send mentorship request: ${json.message}`);
    }
  });

  // 16. Ineligibility & Capacity Enforcement
  await test('Reject Ineligible/Full-Capacity Mentor Assignment', async () => {
    const User = require('../models/User');
    const Subject = require('../models/Subject');
    const fullSenior = await User.findOne({ rollNumber: '20CS091' }); // Sneha (at capacity)
    const dbms = await Subject.findOne({ subjectCode: 'CS501' });

    const res = await fetch(`${baseUrl}/mentorship/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seniorId: fullSenior._id,
        subjectId: dbms._id,
        topic: 'Automata Doubts',
        message: 'Need help with Turing machines.'
      })
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 Bad Request for full-capacity mentor, got ${res.status}`);
    }
  });

  // 17. Senior Respond to Mentorship Request
  await test('Senior Respond to Mentorship Request (PUT /api/mentorship/requests/:id/respond)', async () => {
    const MentorshipRequest = require('../models/MentorshipRequest');
    const pendingReq = await MentorshipRequest.findOne({ senior: seniorId, status: 'pending' });
    if (pendingReq) {
      const res = await fetch(`${baseUrl}/mentorship/requests/${pendingReq._id}/respond`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${seniorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'accepted',
          responseNote: 'Accepted! Let us meet tomorrow on Google Meet.',
          meetingLink: 'https://meet.google.com/test-meet-link'
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    }
  });

  // 18. Smart Study Planner
  await test('Smart Study Planner Schedule (GET /api/planner?days=7)', async () => {
    const res = await fetch(`${baseUrl}/planner?days=7`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.weeklySchedule)) {
      throw new Error(`Study planner schedule generation failed`);
    }
    if (!Array.isArray(json.data.prioritizedQueue) || json.data.prioritizedQueue.length === 0) {
      throw new Error(`Prioritized queue empty`);
    }
  });

  // 19. Exam Timetable
  await test('Exam Timetable (GET /api/planner/timetable?semester=5&branch=CSE)', async () => {
    const res = await fetch(`${baseUrl}/planner/timetable?semester=5&branch=CSE`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.timetable)) {
      throw new Error(`Exam timetable missing`);
    }
  });

  // 20. Task Management (CRUD)
  await test('Create Academic Task (POST /api/tasks)', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Integration Test Task: Compiler AST',
        type: 'assignment',
        subjectCode: 'CS504',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 2,
        priority: 'high'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data._id) {
      throw new Error(`Create task failed: ${json.message}`);
    }
    testTaskId = json.data._id;
  });

  await test('Get Tasks (GET /api/tasks)', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.tasks)) {
      throw new Error(`Get tasks failed`);
    }
  });

  await test('Update Task (PUT /api/tasks/:id)', async () => {
    const res = await fetch(`${baseUrl}/tasks/${testTaskId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priority: 'urgent',
        status: 'in_progress'
      })
    });
    const json = await res.json();
    if (!json.success || json.data.priority !== 'urgent') {
      throw new Error(`Task update failed`);
    }
  });

  await test('Complete Task & Rebalance Planner (PATCH /api/planner/tasks/:id/complete)', async () => {
    const res = await fetch(`${baseUrl}/planner/tasks/${testTaskId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !json.data.refreshedPlan) {
      throw new Error(`Planner rebalance failed`);
    }
  });

  await test('Delete Task (DELETE /api/tasks/:id)', async () => {
    const res = await fetch(`${baseUrl}/tasks/${testTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(`Task delete failed`);
    }
  });

  // 21. Notifications
  await test('Get Notifications (GET /api/notifications)', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.notifications)) {
      throw new Error(`Notifications query failed`);
    }
    if (json.data.notifications.length > 0) {
      notificationId = json.data.notifications[0]._id;
    }
  });

  if (notificationId) {
    await test('Mark Notification As Read (PATCH /api/notifications/:id/read)', async () => {
      const res = await fetch(`${baseUrl}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const json = await res.json();
      if (!json.success || !json.data.isRead) {
        throw new Error(`Mark read failed`);
      }
    });
  }

  // 22. CORS Verification
  await test('CORS Header Verification (OPTIONS /api/student/dashboard)', async () => {
    const res = await fetch(`${baseUrl}/student/dashboard`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (!allowOrigin) {
      throw new Error('CORS header Access-Control-Allow-Origin not present in preflight response');
    }
  });

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${results.filter(r => r.status === 'PASSED').length}/${results.length} Tests Passed`);
  console.log('====================================================');

  server.close();
  await mongoose.disconnect();
  process.exit(results.some(r => r.status === 'FAILED') ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
