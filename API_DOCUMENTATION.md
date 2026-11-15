# Academic Analytics & Mentorship API - Frontend Integration Documentation

> **Base URL:** `http://localhost:5000/api`  
> **Format:** Standard JSON (`application/json`)  
> **CORS:** Enabled for `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`, and local network development.

---

## 1. Global Response Format

All backend responses follow a uniform JSON schema to simplify frontend Axios/Fetch handling and React Query state management.

### Success Response Envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human readable confirmation message",
  "data": { ... },
  "meta": { ... } // (Optional metadata: pagination, totalCount, etc.)
}
```

### Error Response Envelope:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Specific error description",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

---

## 2. Authentication & Authorization

All protected routes require a Bearer token in the HTTP `Authorization` header:
```http
Authorization: Bearer <jwt_token_received_on_login>
```

### Roles:
- `Student`: Regular undergraduate student.
- `Senior`: Senior undergraduate / mentor (has mentor profile & receives mentorship requests).
- `Admin`: Faculty / Head of Department (can import bulk academic marks & schedule official exam timetables).

---

## 3. Pre-Seeded Test Credentials

Use these ready-to-test accounts created by `npm run seed`:

| Role | Email | Roll Number | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Regular)** | `aarav.sharma@college.edu` | `21CS001` | `password123` | Sem 5 CSE. Has weak subject in DBMS (`CS501`) & moderate TOC (`CS504`). |
| **Student (Topper)** | `ananya.iyer@college.edu` | `21CS002` | `password123` | Sem 5 CSE. High scores across all subjects (CGPA > 9.5). |
| **Student (Average)** | `rohan.verma@college.edu` | `21CS003` | `password123` | Sem 5 CSE. Needs guidance in Operating Systems. |
| **Senior (Female Mentor)** | `priya.patel@college.edu` | `20CS055` | `password123` | Expert in DBMS (`CS501`). Available, CGPA 9.35. |
| **Senior (Male Mentor)** | `vikram.rao@college.edu` | `20CS088` | `password123` | Expert in OS (`CS502`). Available, CGPA 8.85. |
| **Senior (At Capacity)** | `sneha.mukherjee@college.edu`| `20CS091` | `password123` | Currently unavailable / full capacity (2/2 mentees). |
| **Admin / HOD** | `hod.cse@college.edu` | `ADMIN001` | `password123` | Can import marks, post exam timetable. |

---

## 4. Endpoint Reference

### 🔑 Authentication Module

#### `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "identifier": "aarav.sharma@college.edu",
  "password": "password123"
}
```
*(Note: `identifier` accepts either student email address OR college roll number)*

- **Sample Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "673703bc9f7a1b001a111111",
      "name": "Aarav Sharma",
      "rollNumber": "21CS001",
      "email": "aarav.sharma@college.edu",
      "role": "Student",
      "gender": "Male",
      "branch": "CSE",
      "year": 3,
      "currentSemester": 5,
      "studyPreferences": {
        "dailyTargetHours": 3,
        "preferredStudyTimes": ["evening", "night"]
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### `POST /api/auth/register`
- **Access:** Public
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

---

#### `GET /api/auth/me`
- **Access:** Private (`Student`, `Senior`, `Admin`)
- **Headers:** `Authorization: Bearer <token>`
- Returns logged-in user profile without password.

---

### 📊 Academic Analytics Module

#### `GET /api/student/dashboard`
- **Access:** Private (`Student`)
- **Description:** Returns an aggregated payload designed for the frontend Home / Dashboard view (contains student summary, current semester performance, CGPA, weak subject diagnosis, and class benchmarks).
- **Sample Response (200 OK):**
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
      "cgpa": 7.42
    },
    "currentSemesterRecord": {
      "semester": 5,
      "academicYear": "2023-2024",
      "totalCredits": 18,
      "earnedCredits": 18,
      "sgpa": 7.15,
      "subjects": [
        {
          "subjectCode": "CS501",
          "subjectName": "Database Management Systems",
          "credits": 4,
          "quizMarks": 11,
          "surpriseTestMarks": 4,
          "midTermMarks": 10,
          "endTermMarks": 20,
          "totalMarks": 45,
          "percentage": 45,
          "grade": "C",
          "gradePoints": 5
        }
      ]
    },
    "cgpaOverview": {
      "cgpa": 7.42,
      "totalCredits": 26,
      "earnedCredits": 26,
      "completedSemesters": 2,
      "semesterHistory": [
        { "semester": 4, "sgpa": 7.75, "totalCredits": 8 },
        { "semester": 5, "sgpa": 7.15, "totalCredits": 18 }
      ]
    },
    "weakSubjectsOverview": {
      "count": 2,
      "summary": "Identified 2 subject(s) requiring focused revision and potential mentorship support.",
      "subjects": [
        {
          "subjectCode": "CS501",
          "subjectName": "Database Management Systems",
          "severity": "Critical",
          "weaknessScore": 75,
          "suggestMentorship": true
        }
      ]
    }
  }
}
```

---

#### `GET /api/student/subjects?semester=5`
- **Access:** Private
- **Query Params:** `semester` (optional, defaults to student's current semester)
- **Description:** Returns detailed assessment breakdown (Quiz, Surprise Test, Mid-Term, End-Term) and credits for every subject in that semester.

---

#### `GET /api/student/performance`
- **Access:** Private
- **Description:** Returns all historical semester academic records, SGPAs, earned credits, and overall CGPA.

---

#### `GET /api/student/comparison?semester=5`
- **Access:** Private
- **Description:** Directly compares student's subject marks with the batch average, highest score, lowest score, and deviation. Perfect for Recharts BarChart and RadarChart visualization!
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Performance comparison with class generated",
  "data": {
    "semester": 5,
    "branch": "CSE",
    "comparison": [
      {
        "subjectCode": "CS501",
        "subjectName": "Database Management Systems",
        "studentMarks": {
          "quiz": 11,
          "surpriseTest": 4,
          "midTerm": 10,
          "endTerm": 20,
          "total": 45,
          "percentage": 45,
          "grade": "C"
        },
        "classBenchmark": {
          "quiz": 15.0,
          "surpriseTest": 7.0,
          "midTerm": 19.67,
          "endTerm": 29.0,
          "total": 70.67
        },
        "highestClassScore": 98,
        "lowestClassScore": 45,
        "marksDifference": -25.67,
        "status": "Below Average"
      }
    ]
  }
}
```

---

#### `GET /api/student/cgpa`
- **Access:** Private
- **Description:** Returns semester-wise SGPA trajectory and cumulative CGPA. Configurable calculation based on UGC/AICTE credit weightage.

---

#### `GET /api/student/weak-subjects?semester=5`
- **Access:** Private
- **Description:** Rule-based academic diagnostics engine. Identifies weak areas by analyzing:
  1. Scores below absolute threshold (e.g. < 55%)
  2. Scores lagging > 10 marks behind class average
  3. Negative trends (Quiz % > Surprise Test % > Mid-Term %)
  4. Specific vulnerable components (e.g. failing Mid-Terms)
- **Sample Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Weak subjects analysis completed",
  "data": {
    "semester": 5,
    "totalSubjects": 5,
    "weakSubjectCount": 2,
    "weakSubjects": [
      {
        "subjectCode": "CS501",
        "subjectName": "Database Management Systems",
        "credits": 4,
        "studentMarks": { "total": 45, "percentage": 45, "grade": "C" },
        "classAverageTotal": 70.67,
        "marksGap": 25.67,
        "severity": "Critical",
        "weaknessScore": 75,
        "reasons": [
          "Total score (45%) is below college proficiency target (55%)",
          "Performance is 25.67 marks lower than the batch average (70.67)",
          "Declining performance trajectory detected across Quiz -> Surprise Test -> Mid-Term",
          "Struggling in Mid-Term exam: scored only 10/30"
        ],
        "recommendations": [
          "Immediate 1-on-1 Senior Mentorship recommended",
          "Allocate 40% additional daily study planner slots for this subject",
          "Solve previous 3 years mid-term and end-term question papers"
        ],
        "suggestMentorship": true
      }
    ]
  }
}
```

---

#### `GET /api/academic/toppers?semester=5&branch=CSE`
- **Access:** Private
- **Description:** Retrieves the highest scoring students for each subject in that semester.

---

### 🤝 Senior Mentorship Module

#### `GET /api/mentors`
- **Access:** Private
- **Query Params:**
  - `subjectCode`: (e.g. `CS501`)
  - `femaleOnly`: (`true` or `false`) Optional female-only mentor preference
  - `branch`: (e.g. `CSE`)
  - `minCgpa`: (e.g. `8.5`)
- **Sample Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available senior mentors fetched successfully",
  "data": {
    "count": 2,
    "mentors": [
      {
        "mentorId": "673703bc9f7a1b001a111120",
        "name": "Priya Patel",
        "rollNumber": "20CS055",
        "email": "priya.patel@college.edu",
        "gender": "Female",
        "branch": "CSE",
        "year": 4,
        "previousSemCgpa": 9.35,
        "rating": 4.95,
        "availabilityStatus": true,
        "availableDays": ["Monday", "Wednesday", "Friday", "Saturday"],
        "maxMentees": 4,
        "activeMenteesCount": 1,
        "remainingSlots": 3,
        "subjectExpertise": [
          {
            "subjectCode": "CS501",
            "subjectName": "Database Management Systems",
            "gradeAcquired": "O",
            "proficiencyLevel": "Expert"
          }
        ]
      }
    ]
  }
}
```

---

#### `POST /api/mentorship/request`
- **Access:** Private (`Student` role only)
- **Validation Rules:**
  - Mentor must be registered with role `Senior`.
  - Mentor must have an active profile with `availabilityStatus: true`.
  - Mentor must not exceed capacity (`activeMenteesCount < maxMentees`).
  - If `femaleMentorOnly: true` is chosen, mentor must be `Female`.
  - Cannot submit duplicate pending requests to the same senior.
- **Request Body:**
```json
{
  "seniorId": "673703bc9f7a1b001a111120",
  "subjectId": "673703bc9f7a1b001a111101",
  "topic": "Normalization BCNF Proofs & Functional Dependencies",
  "message": "I lost marks in Mid-Term on 3NF vs BCNF decomposition. Could we schedule a 45 min doubt session?",
  "femaleMentorOnly": true
}
```

---

#### `GET /api/mentorship/my-requests`
- **Access:** Private (`Student` and `Senior`)
- **Description:**
  - When called by a Student: returns requests submitted by this student.
  - When called by a Senior: returns requests received by this mentor.

---

#### `PUT /api/mentorship/requests/:id/respond`
- **Access:** Private (`Senior` role only)
- **Request Body:**
```json
{
  "action": "accepted",
  "responseNote": "Hi Aarav, happy to help. Let's connect on Google Meet.",
  "scheduledTime": "2026-11-18T18:00:00.000Z",
  "meetingLink": "https://meet.google.com/abc-defg-hij"
}
```
*(Or `"action": "rejected"` with `responseNote` explaining reason)*

---

### 📅 Smart Study Planner Module

#### `GET /api/planner?days=7`
- **Access:** Private (`Student`)
- **Description:** Generates a transparent, rule-based daily study schedule for the upcoming week based on:
  - Upcoming exam timetable dates
  - Incomplete assignments / projects / presentations
  - Student's weak subjects (automatically receives 1.4x to 1.8x study priority multiplier)
  - Student's daily available study hours (`dailyTargetHours`, default 3-4 hours)
- **Sample Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Smart study plan generated successfully",
  "data": {
    "studentSettings": {
      "dailyAvailableHours": 3,
      "preferredStudyTimes": ["evening", "night"]
    },
    "schedulingLogic": {
      "engine": "Rule-Based Multi-Factor Priority Engine",
      "factors": [
        "Deadline proximity (Exponential scale)",
        "Task weight (End-Term > Mid-Term > Project > Assignment)",
        "Weak subject multiplier (Critical 1.8x, Moderate 1.4x)",
        "Daily target hour budget distribution"
      ]
    },
    "prioritizedQueue": [
      {
        "itemType": "task",
        "category": "ASSIGNMENT",
        "title": "DBMS Lab Assignment 4: Complex SQL Joins & Views",
        "subjectCode": "CS501",
        "priorityScore": 18.2,
        "priorityBadge": "Urgent",
        "daysUntilDue": 2,
        "weaknessMultiplier": 1.8,
        "weaknessSeverity": "Critical"
      },
      {
        "itemType": "exam",
        "category": "Exam: END TERM",
        "title": "Prepare for Database Management Systems (CS501) Exam",
        "subjectCode": "CS501",
        "priorityScore": 17.5,
        "priorityBadge": "Urgent",
        "daysUntilDue": 4
      }
    ],
    "weeklySchedule": [
      {
        "date": "2026-11-15",
        "day": "Sunday",
        "targetHours": 3,
        "totalBlocks": 3,
        "blocks": [
          {
            "blockNumber": 1,
            "time": "Slot 1 (18:00 - 19:00)",
            "title": "DBMS Lab Assignment 4: Complex SQL Joins & Views",
            "category": "ASSIGNMENT",
            "subjectCode": "CS501",
            "priorityBadge": "Urgent",
            "weaknessSeverity": "Critical",
            "focusGoal": "Focus on fundamental problem sets & previous year exam questions"
          }
        ]
      }
    ]
  }
}
```

---

#### `PATCH /api/planner/tasks/:id/complete`
- **Access:** Private (`Student`)
- **Description:** Marks a task completed, frees up its allocated study blocks, and immediately rebalances and returns the updated weekly study plan.

---

#### `GET /api/planner/timetable?semester=5&branch=CSE`
- **Access:** Private
- **Description:** Retrieves official exam dates, venues, time slots, and syllabus units.

---

### 📝 Tasks & Assignments Module

#### `GET /api/tasks`
- **Access:** Private
- **Query Params:**
  - `status`: `todo`, `in_progress`, `completed`
  - `type`: `assignment`, `project`, `presentation`, `study`
  - `subjectCode`: (e.g. `CS501`)

---

#### `POST /api/tasks`
- **Access:** Private (`Student`)
- **Request Body:**
```json
{
  "title": "Computer Networks Socket Programming Project",
  "type": "project",
  "subjectCode": "CS503",
  "description": "Build multi-client chat server using TCP sockets in Python or C.",
  "dueDate": "2026-11-25T23:59:59.000Z",
  "estimatedHours": 6,
  "priority": "high"
}
```

---

#### `PUT /api/tasks/:id`
- **Access:** Private (`Student`)
- **Description:** Update task title, description, due date, status (`todo`, `in_progress`, `completed`), or priority.

---

#### `DELETE /api/tasks/:id`
- **Access:** Private (`Student`)
- **Description:** Deletes task.

---

### 🔔 Notifications Module

#### `GET /api/notifications`
- **Access:** Private
- **Query Params:** `unread=true` (optional)
- **Description:** Retrieves user notifications for approaching deadlines, exam notices, and mentorship requests.

---

#### `PATCH /api/notifications/:id/read`
- **Access:** Private
- **Description:** Marks a single notification as read.

---

#### `PATCH /api/notifications/read-all`
- **Access:** Private
- **Description:** Marks all notifications as read.

---

### 📥 Academic Data Import (Admin / Portal Integration)

#### `POST /api/academic/import`
- **Access:** Private (`Admin` role only)
- **Description:** Batch ingest academic semester records from authorized CSV/Excel parser or university database.
- **Request Body:**
```json
{
  "records": [
    {
      "rollNumber": "21CS001",
      "semester": 5,
      "academicYear": "2023-2024",
      "subjects": [
        {
          "subjectCode": "CS501",
          "subjectName": "Database Management Systems",
          "credits": 4,
          "quizMarks": 18,
          "surpriseTestMarks": 9,
          "midTermMarks": 26,
          "endTermMarks": 36
        }
      ]
    }
  ]
}
```

---

## 5. Frontend Integration Tips for React / Vite / Recharts

1. **State Management & Data Fetching:**
   - Use Axios with an interceptor that automatically attaches `Authorization: Bearer <token>` from `localStorage` or `sessionStorage`.
   - Setup React Query (`@tanstack/react-query`) for query caching and invalidation on task updates / schedule rebalancing.

2. **Recharts Component Mappings:**
   - **Student vs Class Average:** Map `/api/student/comparison` directly into a Recharts `<BarChart>` with grouped bars:
     ```jsx
     <Bar dataKey="studentMarks.total" fill="#3B82F6" name="My Marks" />
     <Bar dataKey="classBenchmark.total" fill="#9CA3AF" name="Class Average" />
     ```
   - **Semester SGPA Trajectory:** Map `/api/student/cgpa` `semesterHistory` into a `<LineChart>`:
     ```jsx
     <Line type="monotone" dataKey="sgpa" stroke="#10B981" name="SGPA" />
     ```
   - **Exam-wise Marks Radar:** Map `/api/student/subjects` assessments into a `<RadarChart>` comparing Quiz vs Surprise vs Mid-Term vs End-Term.

3. **Weak Subject Alerts:**
   - Highlight subjects having `severity === "Critical"` with red badges and provide a direct 1-click **"Request Senior Mentorship"** button pre-filling the mentor request modal with that `subjectCode`!
