# Student Academic Analytics, Senior Mentorship & Smart Study Planner - Backend API

Production-ready backend REST API built with Node.js, Express.js, and MongoDB for student academic analytics, transparent weak subject identification, senior mentorship allocation, and rule-based priority study planning.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs (password hashing), CORS, centralized error handling
- **Architecture:** Layered MVC with dedicated Service & Analytics engines

---

## 📁 Project Structure

```
build_together/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies & npm scripts
├── README.md                 # Project setup and architecture guide
├── API_DOCUMENTATION.md      # Full API contract & integration specs for frontend teammate
├── postman_collection.json   # Ready-to-import Postman collection with test scripts
└── src/
    ├── app.js                # Express app configuration & middleware pipeline
    ├── server.js             # HTTP server bootstrap & MongoDB connection
    ├── config/
    │   ├── db.js             # MongoDB Mongoose connection
    │   └── gradingConfig.js  # Configurable SGPA/CGPA formulas & weakness thresholds
    ├── middlewares/
    │   ├── auth.middleware.js     # JWT Bearer verification
    │   ├── role.middleware.js     # Role-based authorization (Student, Senior, Admin)
    │   └── error.middleware.js    # 404 & Centralized Global Error Handler
    ├── models/
    │   ├── User.js                # Student/Senior/Admin profiles & study preferences
    │   ├── Subject.js             # Subjects, modules, credits & max marks
    │   ├── AcademicRecord.js      # Quiz, surprise test, mid-term, end-term marks, SGPA
    │   ├── SeniorProfile.js       # Expertise, previous CGPA, availability, mentee capacity
    │   ├── MentorshipRequest.js   # Mentorship request lifecycle & feedback
    │   ├── Task.js                # Assignments, projects, presentations, study tasks
    │   ├── ExamTimetable.js       # Semester exam schedules, venues & syllabus units
    │   └── Notification.js        # Alerts for deadlines and mentorship responses
    ├── services/
    │   ├── academic.service.js    # SGPA/CGPA calculation and bulk records processing
    │   ├── analytics.service.js   # Class averages, toppers & weak subject identification
    │   ├── mentorship.service.js  # Senior mentor search, eligibility & capacity validation
    │   ├── planner.service.js     # Rule-based priority scheduling engine & rebalancer
    │   └── notification.service.js# In-app notifications dispatcher
    ├── controllers/
    │   ├── auth.controller.js         # Register, login, profile management
    │   ├── academic.controller.js     # Academic performance, class averages, toppers, batch import
    │   ├── weakSubject.controller.js  # Diagnostic weak subject evaluation
    │   ├── mentorship.controller.js   # Mentor search, requests, accept/reject, profile
    │   ├── task.controller.js         # Tasks & assignments CRUD
    │   ├── planner.controller.js      # Smart study planner & exam timetables
    │   └── notification.controller.js # Notifications list & mark-as-read
    ├── routes/
    │   ├── auth.routes.js
    │   ├── academic.routes.js
    │   ├── mentorship.routes.js
    │   ├── task.routes.js
    │   ├── planner.routes.js
    │   ├── notification.routes.js
    │   └── index.js
    └── seed/
        └── seedData.js       # Realistic mock database seeder with students, seniors & marks
```

---

## ⚡ Quick Start (Windows PowerShell)

### Step 1: Open Windows PowerShell and navigate to the project directory
```powershell
cd "c:\Users\Yaswanth Kumar\Downloads\build_together"
```

### Step 2: Create your `.env` configuration
```powershell
Copy-Item .env.example .env
```
*(Optionally edit `.env` to specify your MongoDB connection string if using MongoDB Atlas)*

### Step 3: Install Dependencies
```powershell
npm install
```

### Step 4: Seed Realistic Test Data
```powershell
npm run seed
```
*(Populates subjects, students, seniors, academic marks, exam timetables, and tasks)*

### Step 5: Start the Backend Server
```powershell
# For normal start:
npm start

# For hot-reload development:
npm run dev
```

The server will start at:
```
http://localhost:5000/api
```

---

## 🧪 Postman Testing

1. Open **Postman**.
2. Click **Import** (top left).
3. Select the file: `c:\Users\Yaswanth Kumar\Downloads\build_together\postman_collection.json`.
4. Run the **"1. Authentication -> Student Login"** request.
   - The test script will **automatically extract and store the JWT token** in the collection variable `{{token}}`.
5. Now you can run any request in the collection (Dashboard, Subjects, Mentorship, Study Planner, Tasks) with 1 click!

---

## 👥 Seeded Test Credentials

| Role | Email / Identifier | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student (Regular)** | `aarav.sharma@college.edu` | `password123` | Roll: `21CS001`. Has weak subject in DBMS (`CS501`) |
| **Student (Topper)** | `ananya.iyer@college.edu` | `password123` | Roll: `21CS002`. High performer in all subjects |
| **Senior (Mentor - Female)** | `priya.patel@college.edu` | `password123` | Roll: `20CS055`. Expert in DBMS, CGPA 9.35 |
| **Senior (Mentor - Male)** | `vikram.rao@college.edu` | `password123` | Roll: `20CS088`. Expert in OS, CGPA 8.85 |
| **Senior (At Capacity)** | `sneha.mukherjee@college.edu` | `password123` | Roll: `20CS091`. Unavailable / 2 of 2 mentees |
| **Admin / HOD** | `hod.cse@college.edu` | `password123` | Roll: `ADMIN001`. Can import marks & schedule exams |

---

## 🎯 Key Core Modules & Business Logic

### 1. Configurable SGPA & CGPA Calculation
- Standard formula: $\text{SGPA} = \frac{\sum (\text{Credits} \times \text{GradePoints})}{\sum \text{Credits}}$
- Governed centrally by `src/config/gradingConfig.js`. Can be adjusted at runtime without breaking data structures.

### 2. Multi-Factor Weak Subject Identification
- Evaluates raw score vs minimum benchmark (40% / 55%).
- Compares student score with class average ($\Delta \ge 10$ marks flagged).
- Analyzes exam progression trend (Quiz $\to$ Surprise Test $\to$ Mid-Term).
- Computes `weaknessScore` (0-100) and severity (`Critical`, `Moderate`, `Mild`).

### 3. Senior Mentorship System
- Validates senior availability status and capacity (`activeMenteesCount < maxMentees`).
- Prevents assigning unavailable or over-capacity seniors.
- Supports **female-only mentor preference** (matching female students with female seniors).

### 4. Transparent Rule-Based Smart Study Planner
- Calculates priority scores using:
  - Urgency ($D = 14 - \text{daysUntilDue}$)
  - Task type base weight (End-Term = 10, Mid-Term = 8, Project = 7, Assignment = 5)
  - Weakness multiplier ($1.4\times$ to $1.8\times$ for weak subjects)
- Allocates daily focused study blocks based on student's `dailyTargetHours`.
- Dynamic rebalancing: Marking a task completed automatically frees slots and recalculates remaining schedule priorities.
