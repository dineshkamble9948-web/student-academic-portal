# Frontend-Backend API Integration Map
> **Project:** Student Academic Portal (Student Academic Analytics, Senior Mentorship & Smart Study Planner)  
> **Base URL:** `http://localhost:5000/api`  
> **Auth Scheme:** JWT Bearer Token (`Authorization: Bearer <token>`) via Axios interceptor

---

## 1. Page-to-Endpoint Mapping Table

| # | Frontend Page | Route | Backend API Endpoint(s) | HTTP Method | Payload / Params | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Login** | `/login` | `/auth/login` | `POST` | `{ identifier, password }` | ✅ **Fully Integrated** |
| **2** | **Registration** | `/register` | `/auth/register` | `POST` | `{ name, rollNumber, email, password, gender, branch, year, currentSemester, phone, role: 'Student' }` | ✅ **Fully Integrated** |
| **3** | **Student Dashboard** | `/dashboard` | `/student/dashboard`<br>`/auth/me` | `GET`<br>`GET` | Header: `Bearer <token>` | ✅ **Fully Integrated** |
| **4** | **Academic Performance** | `/analytics/performance` | `/student/performance`<br>`/student/subjects?semester=X` | `GET`<br>`GET` | `?semester=1..8` | ✅ **Fully Integrated** |
| **5** | **Subject Analytics** | `/analytics/subjects` | `/student/comparison?semester=X`<br>`/student/subjects?semester=X` | `GET`<br>`GET` | `?semester=1..8` | ✅ **Fully Integrated** |
| **6** | **Topper Comparison** | `/analytics/topper-comparison` | `/student/comparison?semester=X`<br>`/academic/toppers?semester=X&branch=Y` | `GET`<br>`GET` | `?semester=1..8&branch=CSE` | ✅ **Fully Integrated** |
| **7** | **CGPA Improvement** | `/analytics/cgpa-improvement` | `/student/cgpa`<br>`/student/weak-subjects?semester=X` | `GET`<br>`GET` | `?semester=1..8` | ✅ **Fully Integrated** |
| **8** | **Senior Mentorship** | `/mentorship` | `/mentors`<br>`/mentorship/request`<br>`/mentorship/my-requests` | `GET`<br>`POST`<br>`GET` | `?femaleOnly=bool&subjectCode=X`<br>`{ seniorId, subjectId, topic, message, femaleMentorOnly }` | ✅ **Fully Integrated** |
| **9** | **Smart Study Planner** | `/planner` | `/planner?days=7`<br>`/planner/tasks/:id/complete`<br>`/planner/timetable?semester=X&branch=Y` | `GET`<br>`PATCH`<br>`GET` | `?days=7`<br>`:id`<br>`?semester=1..8&branch=CSE` | ✅ **Fully Integrated** |
| **10** | **Assignments & Projects** | `/assignments` | `/tasks`<br>`/tasks`<br>`/tasks/:id`<br>`/tasks/:id` | `GET`<br>`POST`<br>`PUT`<br>`DELETE` | `?status=...&type=...`<br>`{ title, type, subjectCode, description, dueDate, estimatedHours, priority }` | ✅ **Fully Integrated** |
| **11** | **Notifications** | `/notifications` | `/notifications`<br>`/notifications/:id/read`<br>`/notifications/read-all` | `GET`<br>`PATCH`<br>`PATCH` | `?unread=true`<br>`:id` | ✅ **Fully Integrated** |
| **12** | **Student Profile** | `/profile` | `/auth/me`<br>`/auth/profile` | `GET`<br>`GET` | Header: `Bearer <token>` | ✅ **Fully Integrated** |

---

## 2. Integration Details by Module

### A. Authentication & Session Management
- **Services:** `src/services/api.js`, `src/services/authService.js`, `src/utils/tokenStorage.js`
- **Context:** `src/context/AuthContext.jsx`
- **Protected Routes:** `src/components/common/ProtectedRoute.jsx`
- **Behavior:**
  - Login accepts either institutional email address or student roll number.
  - JWT tokens are saved to `localStorage` (persistent) or `sessionStorage`.
  - Request interceptor automatically appends `Authorization: Bearer <token>` to all protected calls.
  - Interceptor listens for `401 Unauthorized` responses and safely resets auth state without infinite redirect loops.

### B. Academic Performance & Subject Analytics
- **Services:** `src/services/academicService.js`
- **Pages:** `AcademicPerformance.jsx`, `SubjectAnalytics.jsx`, `TopperComparison.jsx`
- **Behavior:**
  - Connects to `/api/student/performance` for cumulative CGPA and multi-semester historical grade trends.
  - Connects to `/api/student/subjects?semester=X` for assessment breakdowns: **Quiz (20)**, **Surprise Test (10)**, **Mid-Term (30)**, and **End-Term (40)**.
  - Connects to `/api/student/comparison?semester=X` and `/api/academic/toppers` to render interactive Recharts visualizations adhering strictly to:
    - **Student (Blue `#2563EB`)**
    - **Class Average (Green `#10B981`)**
    - **Top Scorer (Red `#EF4444`)**

### C. CGPA Improvement & Weak Subjects
- **Services:** `src/services/academicService.js`
- **Page:** `CgpaImprovement.jsx`
- **Behavior:**
  - Displays live calculated SGPA & CGPA from `/api/student/cgpa`.
  - Displays rule-based diagnostic output from `/api/student/weak-subjects`, categorizing subjects into **Critical** and **Moderate** severity.
  - Surfaces underlying reasons (e.g. mid-term dip, score lag behind class average) and actionable suggestions with direct shortcuts to Senior Mentorship.

### D. Senior Mentorship Hub
- **Services:** `src/services/mentorshipService.js`
- **Page:** `SeniorMentorship.jsx`
- **Behavior:**
  - Fetches eligible mentors from `/api/mentors` with support for domain, subject, and the **Female Mentor Preference** filter.
  - Mentorship request modal submits `{ seniorId, subjectId, topic, message, femaleMentorOnly }` to `/api/mentorship/request`.
  - "My Requests" tab tracks status (`pending`, `accepted`, `completed`, `cancelled`), mentor response notes, and Google Meet video links from `/api/mentorship/my-requests`.

### E. Smart Study Planner
- **Services:** `src/services/plannerService.js`
- **Page:** `SmartStudyPlanner.jsx`
- **Behavior:**
  - Fetches 7-day adaptive schedule from `/api/planner?days=7` which automatically gives **1.8x study priority** to weak subjects.
  - Interactive daily target capacity slider (2.0 to 6.0 hours/day).
  - Toggling study blocks calls `/api/planner/tasks/:id/complete` to trigger dynamic schedule rebalancing.
  - Fetches official examination timetable and syllabus units from `/api/planner/timetable`.

### F. Assignments, Projects & Presentations
- **Services:** `src/services/taskService.js`
- **Page:** `AssignmentsProjects.jsx`
- **Behavior:**
  - Fetches deliverables from `/api/tasks` with filters for type (`assignment`, `project`, `presentation`) and status (`todo`, `in_progress`, `completed`, `overdue`).
  - "Add Deliverable" modal submits new coursework items to `POST /api/tasks`.
  - Toggling task completion calls `PUT /api/tasks/:id`.

### G. Notifications & Broadcasts
- **Services:** `src/services/notificationService.js`
- **Page:** `Notifications.jsx`
- **Behavior:**
  - Fetches academic announcements, exam notices, and mentorship alerts from `/api/notifications`.
  - Supports individual mark-as-read (`PATCH /api/notifications/:id/read`) and batch mark-all (`PATCH /api/notifications/read-all`).

---

## 3. Missing or Pending Backend Endpoints

The following features were anticipated by the frontend architecture and have mock/client-side fallbacks in place until backend support is added:

1. **Coursework File Artifact Upload:**
   - *Requirement:* Uploading `.pdf`, `.zip`, or code files when submitting assignments.
   - *Current Implementation:* `POST /api/tasks` accepts text metadata, descriptions, and submission links.
   - *Suggested Endpoint:* `POST /api/tasks/:id/submission-file` (`multipart/form-data`).

2. **Dedicated Student Cancellation Endpoint for Mentorship Requests:**
   - *Requirement:* Explicit endpoint for mentees to cancel pending requests.
   - *Current Implementation:* Handled via client state; backend `respondToRequest` is restricted to the `Senior` role (`accepted` / `rejected`).
   - *Suggested Endpoint:* `PATCH /api/mentorship/requests/:id/cancel` (authorized for student owner).

---

## 4. Remaining Frontend Work

1. **End-to-End System Testing:** Conduct complete functional and UI testing after the backend developer connects MongoDB and runs the database seeder (`npm run seed`).
2. **Global Unread Notification Badge Sync:** Wire the unread badge in `Header.jsx` and `Sidebar.jsx` to live `/api/notifications?unread=true` counts.
3. **Printable / PDF Export:** Optional client utility to export semester grade cards or weekly study plans to printable format.
