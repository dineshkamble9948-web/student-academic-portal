# Academic Analytics, Mentorship & Smart Study Planner - API Documentation

> **Base URL:** `http://localhost:5000/api`  
> **Format:** Standard JSON (`application/json`)  
> **CORS:** Enabled for `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`, and local network origin.  
> **Grading Standard:** Configurable — verified with **IIIT Raichur / IIT Hyderabad 10-point scheme** (`A+`=10, `A`=10, `A-`=9, `B`=8, `B-`=7, `C`=6, `C-`=5, `D`=4, `F`=0, minimum graduation CGPA = 5.0, honors threshold $\ge$ 8.0).

---

## 1. Global Response Schema

All backend endpoints wrap responses in a standardized JSON envelope:

### Success Envelope (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human readable confirmation message",
  "data": { ... },
  "meta": { ... }
}
```

### Error Envelope (`400`, `401`, `403`, `404`, `409`, `500`):
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Detailed error description",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

### Authentication Header:
For all protected routes, attach the JWT token received from `/api/auth/login`:
```http
Authorization: Bearer <jwt_token>
```

---

## 2. Pre-Seeded Test Credentials

| Role | Email | Roll Number | Password | Profile Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Regular)** | `aarav.sharma@college.edu` | `21CS001` | `password123` | Sem 5 CSE. Weak subject in DBMS (`CS501`), moderate in TOC (`CS504`). |
| **Student (Topper)** | `ananya.iyer@college.edu` | `21CS002` | `password123` | Sem 5 CSE. Consistent 9+ CGPA across all subjects. |
| **Student (Average)** | `rohan.verma@college.edu` | `21CS003` | `password123` | Sem 5 CSE. Needs assistance with OS (`CS502`). |
| **Senior (Mentor - Female)** | `priya.patel@college.edu` | `20CS055` | `password123` | Expert in DBMS (`CS501`) & CN (`CS503`), CGPA 9.35. Available. |
| **Senior (Mentor - Male)** | `vikram.rao@college.edu` | `20CS088` | `password123` | Expert in OS (`CS502`), CGPA 8.85. Available. |
| **Senior (At Capacity)** | `sneha.mukherjee@college.edu` | `20CS091` | `password123` | TOC expert (`CS504`), currently at full capacity (2/2 mentees). |
| **Admin / HOD** | `hod.cse@college.edu` | `ADMIN001` | `password123` | Can import marks and publish official exam timetables. |

---

## 3. Detailed Endpoint Reference

### 🔑 Authentication Module

#### `POST /api/auth/register`
- **Method:** `POST`
- **Auth:** None (Public)
- **Request Body:**
```json
{
  "name": "Kavya Menon",
  "rollNumber": "21CS045",
  "email": "kavya.menon@college.edu",
  "password": "password123",
  "role": "Student",
  "gender": "Female",
  "branch": "CSE",
  "year": 3,
  "currentSemester": 5,
  "phone": "+91 9876501234",
  "studyPreferences": {
    "dailyTargetHours": 4,
    "preferredStudyTimes": ["morning", "night"]
  }
}
```
- **Response (`201 Created`):** Returns created user object and JWT bearer token.

#### `POST /api/auth/login`
- **Method:** `POST`
- **Auth:** None (Public)
- **Request Body:**
```json
{
  "identifier": "aarav.sharma@college.edu",
  "password": "password123"
}
```
*(Accepts either student email address OR college roll number in `identifier`)*
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "673703bc9f7a1b001a111101",
      "name": "Aarav Sharma",
      "rollNumber": "21CS001",
      "email": "aarav.sharma@college.edu",
      "role": "Student",
      "gender": "Male",
      "branch": "CSE",
      "currentSemester": 5
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `GET /api/auth/me`
- **Method:** `GET`
- **Auth:** Bearer Token
- Returns currently logged-in user profile without password.

#### `PUT /api/auth/profile`
- **Method:** `PUT`
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "phone": "+91 9876543210",
  "studyPreferences": {
    "dailyTargetHours": 4,
    "preferredStudyTimes": ["evening", "night"]
  }
}
```

---

### 📊 Academic Performance & Analytics Module

#### `GET /api/student/dashboard`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Description:** Consolidated payload for Home / Dashboard view (contains student summary, current semester performance, CGPA, weak subject diagnostics, and class benchmarks).
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student dashboard overview loaded",
  "data": {
    "student": {
      "name": "Aarav Sharma",
      "rollNumber": "21CS001",
      "branch": "CSE",
      "currentSemester": 5,
      "cgpa": 7.42,
      "academicStanding": "GOOD_STANDING"
    },
    "currentSemesterRecord": { ... },
    "cgpaOverview": { "cgpa": 7.42, "totalCredits": 26, "completedSemesters": 2 },
    "weakSubjectsOverview": {
      "count": 2,
      "summary": "Identified 2 subject(s) requiring focused revision and potential mentorship support.",
      "subjects": [ ... ]
    },
    "classBenchmarks": { ... }
  }
}
```

#### `GET /api/student/subjects`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:**
  - `semester` (optional, number): Defaults to student's current semester.
  - `subjectCode` (optional, string): e.g. `CS501`
- **Description:** Returns detailed assessment breakdown (Quiz, Surprise Test, Mid-Term, End-Term), credits, and letter grades.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subject-wise performance retrieved",
  "data": {
    "semester": 5,
    "sgpa": 7.15,
    "totalCredits": 18,
    "subjects": [
      {
        "subjectCode": "CS501",
        "subjectName": "Database Management Systems",
        "credits": 4,
        "assessments": {
          "quiz": { "scored": 11, "max": 20 },
          "surpriseTest": { "scored": 4, "max": 10 },
          "midTerm": { "scored": 10, "max": 30 },
          "endTerm": { "scored": 20, "max": 40 }
        },
        "totalMarks": 45,
        "percentage": 45,
        "grade": "C-",
        "gradePoints": 5
      }
    ]
  }
}
```

#### `GET /api/student/exam-marks`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:**
  - `semester` (optional, number): Filter by semester (e.g. `5`)
  - `subjectCode` (optional, string): Filter by subject (e.g. `CS501`)
  - `examType` (optional, string): `Quiz`, `Surprise Test`, `Mid-Term`, or `End-Term`
- **Description:** Retrieves marks filtered specifically by assessment / examination type.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Exam-wise marks retrieved successfully",
  "data": {
    "filters": { "semester": 5, "subjectCode": "CS501", "examType": "Mid-Term" },
    "count": 1,
    "examMarks": [
      {
        "semester": 5,
        "subjectCode": "CS501",
        "subjectName": "Database Management Systems",
        "credits": 4,
        "totalMarks": 45,
        "grade": "C-",
        "gradePoints": 5,
        "exams": [
          { "examType": "Mid-Term", "scored": 10, "maxMarks": 30, "percentage": 33.33 }
        ]
      }
    ]
  }
}
```

#### `GET /api/student/performance`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional), `subjectCode` (optional)
- **Description:** Returns all historical academic records across semesters.

#### `GET /api/student/comparison`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional)
- **Description:** Direct comparison between student scores and batch averages, highest scores, lowest scores, and standard deviation.

#### `GET /api/student/analytics`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional)
- **Description:** **Recharts Frontend Ready.** Directly provides pre-structured arrays for `<BarChart>`, `<LineChart>`, `<RadarChart>` without requiring frontend data munging.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Recharts-ready performance analytics generated successfully",
  "data": {
    "semester": 5,
    "branch": "CSE",
    "recharts": {
      "subjectComparisonChart": [
        { "subjectCode": "CS501", "subjectName": "DBMS", "studentMarks": 45, "classAverage": 70.67, "topperMarks": 98 },
        { "subjectCode": "CS502", "subjectName": "OS", "studentMarks": 83, "classAverage": 79.67, "topperMarks": 94 }
      ],
      "examWiseComparisonChart": [
        { "examType": "Quiz", "studentScore": 14.8, "classAverage": 16.2, "maxMarks": 20 },
        { "examType": "Surprise Test", "studentScore": 6.6, "classAverage": 7.8, "maxMarks": 10 },
        { "examType": "Mid-Term", "studentScore": 19.8, "classAverage": 23.4, "maxMarks": 30 },
        { "examType": "End-Term", "studentScore": 28.2, "classAverage": 32.6, "maxMarks": 40 }
      ],
      "semesterTrendChart": [
        { "semester": "Sem 4", "semesterNumber": 4, "sgpa": 7.75, "cgpa": 7.75 },
        { "semester": "Sem 5", "semesterNumber": 5, "sgpa": 7.15, "cgpa": 7.42 }
      ],
      "marksDistributionRadar": [
        { "subjectCode": "CS501", "quizPct": 55, "surprisePct": 40, "midTermPct": 33.3, "endTermPct": 50, "totalPct": 45 }
      ]
    }
  }
}
```

#### `GET /api/student/cgpa`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Description:** Returns semester SGPA trajectory, cumulative CGPA, earned credits, and academic standing.

#### `GET /api/student/semester-results`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional)
- **Description:** Retrieves stored semester results based on the IIIT Raichur ordinance (including backlog count, academic standing: `HONORS_ELIGIBLE`, `GOOD_STANDING`, or `ACADEMIC_PROBATION`, and improvement recommendations).

#### `GET /api/student/weak-subjects`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional)
- **Description:** Multi-factor weak subject identification (percentage cutoff, class average deviation, negative continuous assessment trend, mid-term failure).

#### `GET /api/academic/toppers`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester` (optional), `branch` (optional)

#### `POST /api/academic/import`
- **Method:** `POST`
- **Auth:** Bearer Token (`Admin` only)
- **Request Body:** Array of student semester records `{ records: [...] }`.

---

### 🤝 Senior Mentorship Module

#### `GET /api/mentors`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:**
  - `subjectCode` (optional): e.g. `CS501`
  - `femaleOnly` (optional, boolean): `true` to show only female mentors
  - `branch` (optional): e.g. `CSE`
  - `minCgpa` (optional, number): e.g. `8.5`

#### `GET /api/mentors/match-weak-subjects`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Query Parameters:** `femaleOnly` (optional, boolean)
- **Description:** **Smart Mentor Matcher.** Automatically takes the student's identified weak subjects and matches them against senior mentors with verified grade `A+`/`A`/`O` expertise in those subjects.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mentors matched successfully against your weak subjects",
  "data": {
    "studentWeakSubjects": [
      { "subjectCode": "CS501", "subjectName": "Database Management Systems", "severity": "Critical", "marksGap": 25.67 }
    ],
    "femalePreferenceApplied": false,
    "count": 1,
    "matchedMentors": [
      {
        "mentorId": "673703bc9f7a1b001a111120",
        "name": "Priya Patel",
        "gender": "Female",
        "previousSemCgpa": 9.35,
        "rating": 4.95,
        "remainingSlots": 3,
        "matchedWeakSubjects": [
          { "subjectCode": "CS501", "subjectName": "DBMS", "mentorGrade": "O", "proficiencyLevel": "Expert" }
        ],
        "matchScore": 98.2
      }
    ]
  }
}
```

#### `POST /api/mentorship/request`
- **Method:** `POST`
- **Auth:** Bearer Token (`Student`)
- **Request Body:**
```json
{
  "seniorId": "673703bc9f7a1b001a111120",
  "subjectId": "673703bc9f7a1b001a111101",
  "topic": "Normalization BCNF Proofs & Functional Dependencies",
  "message": "Scored low in Mid-Term. Need guidance solving decomposition problems.",
  "femaleMentorOnly": false
}
```

#### `PATCH /api/mentorship/requests/:id/cancel`
- **Method:** `PATCH`
- **Auth:** Bearer Token (`Student`)
- **Description:** Allows a student to cancel a pending mentorship request.

#### `GET /api/mentorship/my-requests`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student` or `Senior`)
- Returns requests sent (if Student) or received (if Senior).

#### `PUT /api/mentorship/requests/:id/respond`
- **Method:** `PUT`
- **Auth:** Bearer Token (`Senior` only)
- **Request Body:**
```json
{
  "action": "accepted",
  "responseNote": "Confirmed! Let us connect on Google Meet on Wednesday at 6 PM.",
  "scheduledTime": "2026-11-18T18:00:00.000Z",
  "meetingLink": "https://meet.google.com/abc-defg-hij"
}
```

---

### 📅 Smart Study Planner Module

#### `GET /api/planner`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Query Parameters:** `days` (optional, default: 7)
- **Description:** Generates dynamic weekly schedule combining exam timetables, pending assignments, and weak subject weights (1.4x-1.8x study priority boost).

#### `GET /api/planner/recommendations`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Description:** Generates actionable study recommendations based on imminent exams, weak subjects, and approaching assignment deadlines.

#### `POST /api/planner/sessions`
- **Method:** `POST`
- **Auth:** Bearer Token (`Student`)
- **Description:** Creates a personalized study session block.
- **Request Body:**
```json
{
  "title": "DBMS BCNF Normalization Practice",
  "subjectCode": "CS501",
  "scheduledDate": "2026-11-17T00:00:00.000Z",
  "startTime": "18:00",
  "endTime": "19:30",
  "durationMinutes": 90,
  "topic": "3NF vs BCNF dependency preservation numericals",
  "goals": ["Solve 5 problems from Korth book", "Summarize 2PL rules"],
  "isWeakSubjectFocus": true,
  "priority": "high",
  "notes": "Bring doubts to Senior Priya session"
}
```

#### `GET /api/planner/sessions`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Query Parameters:** `date` (YYYY-MM-DD), `status` (`scheduled`, `completed`), `subjectCode`

#### `PUT /api/planner/sessions/:id`
- **Method:** `PUT`
- **Auth:** Bearer Token (`Student`)
- Update session time, duration, status, or completion.

#### `DELETE /api/planner/sessions/:id`
- **Method:** `DELETE`
- **Auth:** Bearer Token (`Student`)

#### `PATCH /api/planner/tasks/:id/complete`
- **Method:** `PATCH`
- **Auth:** Bearer Token (`Student`)
- Marks task completed and immediately returns the refreshed, rebalanced weekly schedule.

#### `GET /api/planner/timetable`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `semester`, `branch`

---

### 📝 Tasks, Assignments & Projects Module

#### `GET /api/tasks`
- **Method:** `GET`
- **Auth:** Bearer Token (`Student`)
- **Query Parameters:**
  - `type`: `assignment`, `project`, `presentation`, `study`
  - `status`: `todo`, `in_progress`, `completed`
  - `submissionStatus`: `pending`, `submitted`, `late_submitted`
  - `subjectCode`: e.g. `CS501`
  - `sortBy`: `dueDate`, `priority`, or `createdAt`

#### `POST /api/tasks`
- **Method:** `POST`
- **Auth:** Bearer Token (`Student`)
- **Request Body:**
```json
{
  "title": "OS Semaphore Barrier Implementation",
  "type": "assignment",
  "subjectCode": "CS502",
  "description": "Write a C program to implement a thread barrier using POSIX semaphores.",
  "dueDate": "2026-11-20T23:59:59.000Z",
  "estimatedHours": 3,
  "priority": "high"
}
```

#### `POST /api/tasks/:id/submit`
- **Method:** `POST`
- **Auth:** Bearer Token (`Student`)
- **Description:** Submit deliverable URL / notes. Automatically calculates if submission was on time or `late_submitted` based on `dueDate`.
- **Request Body:**
```json
{
  "submissionLink": "https://github.com/student/os-barrier-assignment",
  "submissionNotes": "Compiled with gcc -pthread. All unit test cases passed."
}
```

#### `PUT /api/tasks/:id`
- **Method:** `PUT`
- **Auth:** Bearer Token (`Student`)
- Update title, description, due date, status, or priority.

#### `DELETE /api/tasks/:id`
- **Method:** `DELETE`
- **Auth:** Bearer Token (`Student`)

---

### 🔔 Notifications Module

#### `GET /api/notifications`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Parameters:** `unread=true`, `type` (`academic`, `deadline`, `mentorship`, `system`)

#### `POST /api/notifications`
- **Method:** `POST`
- **Auth:** Bearer Token
- Create a self-reminder or academic alert.
- **Request Body:**
```json
{
  "title": "Exam Revision Reminder",
  "message": "Only 3 days left before DBMS End-Term examination.",
  "type": "academic"
}
```

#### `PATCH /api/notifications/:id/read`
- **Method:** `PATCH`
- **Auth:** Bearer Token
- Marks single notification as read.

#### `PATCH /api/notifications/read-all`
- **Method:** `PATCH`
- **Auth:** Bearer Token
- Marks all user notifications as read.
