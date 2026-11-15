const Task = require('../models/Task');
const ExamTimetable = require('../models/ExamTimetable');
const User = require('../models/User');
const AnalyticsService = require('./analytics.service');

class PlannerService {
  /**
   * Calculate transparent rule-based priority score for a study task/exam
   */
  static calculatePriorityScore(item, weakSubjectsMap) {
    const now = new Date();
    const dueDate = new Date(item.dueDate || item.examDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 1. Proximity Urgency (Scale 1 to 20)
    let urgencyScore = 1;
    if (daysUntilDue < 0) {
      urgencyScore = 20; // Overdue
    } else if (daysUntilDue === 0) {
      urgencyScore = 18; // Due today
    } else if (daysUntilDue <= 2) {
      urgencyScore = 15;
    } else if (daysUntilDue <= 5) {
      urgencyScore = 12;
    } else if (daysUntilDue <= 7) {
      urgencyScore = 9;
    } else if (daysUntilDue <= 14) {
      urgencyScore = 6;
    } else {
      urgencyScore = 3;
    }

    // 2. Type Weight (Scale 3 to 10)
    let typeWeight = 5;
    const itemType = (item.type || item.examType || '').toLowerCase();
    switch (itemType) {
      case 'end_term':
        typeWeight = 10;
        break;
      case 'mid_term':
        typeWeight = 8;
        break;
      case 'project':
        typeWeight = 7;
        break;
      case 'presentation':
        typeWeight = 6;
        break;
      case 'assignment':
        typeWeight = 5;
        break;
      case 'quiz':
      case 'surprise_test':
        typeWeight = 5;
        break;
      default:
        typeWeight = 4;
        break;
    }

    // 3. Weakness Factor
    const subjectCode = (item.subjectCode || '').toUpperCase();
    const weaknessInfo = weakSubjectsMap[subjectCode];
    let weaknessMultiplier = 1.0;
    let weaknessSeverity = 'Normal';

    if (weaknessInfo) {
      weaknessSeverity = weaknessInfo.severity;
      if (weaknessSeverity === 'Critical') {
        weaknessMultiplier = 1.8;
      } else if (weaknessSeverity === 'Moderate') {
        weaknessMultiplier = 1.4;
      } else if (weaknessSeverity === 'Mild') {
        weaknessMultiplier = 1.15;
      }
    }

    // Transparent rule-based formula
    const rawPriority = (urgencyScore * 0.6 + typeWeight * 0.4) * weaknessMultiplier;
    const finalScore = Number(rawPriority.toFixed(2));

    let priorityBadge = 'Low';
    if (finalScore >= 16 || daysUntilDue <= 1) {
      priorityBadge = 'Urgent';
    } else if (finalScore >= 11) {
      priorityBadge = 'High';
    } else if (finalScore >= 7) {
      priorityBadge = 'Medium';
    }

    return {
      priorityScore: finalScore,
      priorityBadge,
      daysUntilDue,
      weaknessMultiplier,
      weaknessSeverity,
      urgencyScore,
      typeWeight
    };
  }

  /**
   * Generate transparent rule-based study schedule
   */
  static async generateStudyPlan(studentId, daysAhead = 7) {
    const student = await User.findById(studentId);
    const dailyStudyHours = student?.studyPreferences?.dailyTargetHours || 3;

    // 1. Fetch incomplete tasks (assignments, projects, presentations, self-study)
    const tasks = await Task.find({
      student: studentId,
      status: { $ne: 'completed' }
    }).sort({ dueDate: 1 });

    // 2. Fetch upcoming exams for student's branch and semester
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead + 7);

    const exams = await ExamTimetable.find({
      semester: student.currentSemester,
      branch: student.branch,
      examDate: { $gte: now, $lte: futureDate }
    }).sort({ examDate: 1 });

    // 3. Identify weak subjects for targeted revision
    const weakAnalysis = await AnalyticsService.identifyWeakSubjects(
      studentId,
      student.currentSemester
    );
    const weakSubjectsMap = {};
    weakAnalysis.weakSubjects.forEach((w) => {
      weakSubjectsMap[w.subjectCode.toUpperCase()] = w;
    });

    // 4. Combine and compute rule-based priorities
    const queue = [];

    // Push exams
    exams.forEach((exam) => {
      const priorityDetails = this.calculatePriorityScore(exam, weakSubjectsMap);
      queue.push({
        id: exam._id,
        itemType: 'exam',
        category: `Exam: ${exam.examType.toUpperCase().replace('_', ' ')}`,
        title: `Prepare for ${exam.subjectName} (${exam.subjectCode}) Exam`,
        subjectCode: exam.subjectCode,
        subjectName: exam.subjectName,
        targetDate: exam.examDate,
        estimatedHoursNeeded: 6, // Rule default for exam prep
        hallOrVenue: exam.venue,
        syllabusUnits: exam.syllabusUnits,
        ...priorityDetails
      });
    });

    // Push tasks
    tasks.forEach((task) => {
      const priorityDetails = this.calculatePriorityScore(task, weakSubjectsMap);
      queue.push({
        id: task._id,
        itemType: 'task',
        category: task.type.toUpperCase(),
        title: task.title,
        subjectCode: task.subjectCode || 'GENERAL',
        subjectName: task.title,
        targetDate: task.dueDate,
        estimatedHoursNeeded: task.estimatedHours || 2,
        description: task.description,
        ...priorityDetails
      });
    });

    // Push dedicated revision for Critical weak subjects if no exam or task is already scheduled
    weakAnalysis.weakSubjects
      .filter((w) => w.severity === 'Critical')
      .forEach((weakSub) => {
        const alreadyInQueue = queue.some(
          (q) => q.subjectCode === weakSub.subjectCode && q.itemType === 'exam'
        );
        if (!alreadyInQueue) {
          queue.push({
            id: `revision-${weakSub.subjectCode}`,
            itemType: 'revision',
            category: 'WEAK SUBJECT FOCUS',
            title: `Intensive Revision: ${weakSub.subjectName} (${weakSub.subjectCode})`,
            subjectCode: weakSub.subjectCode,
            subjectName: weakSub.subjectName,
            targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            estimatedHoursNeeded: 3,
            priorityScore: 14.5,
            priorityBadge: 'High',
            daysUntilDue: 3,
            weaknessMultiplier: 1.8,
            weaknessSeverity: 'Critical',
            reasons: weakSub.reasons
          });
        }
      });

    // Sort queue by priority score descending
    queue.sort((a, b) => b.priorityScore - a.priorityScore);

    // 5. Construct day-by-day study slots (using Pomodoro 50m study + 10m break slots)
    const dailySchedules = [];
    let queuePointer = 0;

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
      scheduleDate.setHours(0, 0, 0, 0);

      const dayName = scheduleDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = scheduleDate.toISOString().split('T')[0];

      const studyBlocks = [];
      const slotsPerDay = Math.round(dailyStudyHours); // 1 hour per session block

      for (let slot = 0; slot < slotsPerDay; slot++) {
        if (queue.length === 0) {
          studyBlocks.push({
            blockNumber: slot + 1,
            time: `Slot ${slot + 1} (${18 + slot}:00 - ${19 + slot}:00)`,
            title: 'Free Study / Personal Reading',
            subjectCode: 'FREE',
            category: 'GENERAL',
            priorityBadge: 'Low',
            focusArea: 'Review previous lecture notes or explore extracurricular projects.'
          });
          continue;
        }

        const activeTask = queue[queuePointer % queue.length];
        queuePointer++;

        studyBlocks.push({
          blockNumber: slot + 1,
          time: `Slot ${slot + 1} (${18 + slot}:00 - ${19 + slot}:00)`,
          taskReferenceId: activeTask.id,
          title: activeTask.title,
          category: activeTask.category,
          subjectCode: activeTask.subjectCode,
          priorityBadge: activeTask.priorityBadge,
          weaknessSeverity: activeTask.weaknessSeverity,
          focusGoal:
            activeTask.weaknessSeverity === 'Critical'
              ? 'Focus on fundamental problem sets & previous year exam questions'
              : 'Complete upcoming deliverable milestone'
        });
      }

      dailySchedules.push({
        date: formattedDate,
        day: dayName,
        targetHours: dailyStudyHours,
        totalBlocks: studyBlocks.length,
        blocks: studyBlocks
      });
    }

    return {
      studentSettings: {
        dailyAvailableHours: dailyStudyHours,
        preferredStudyTimes: student?.studyPreferences?.preferredStudyTimes || ['evening', 'night']
      },
      schedulingLogic: {
        engine: 'Rule-Based Multi-Factor Priority Engine',
        factors: [
          'Deadline proximity (Exponential scale)',
          'Task weight (End-Term > Mid-Term > Project > Assignment)',
          'Weak subject multiplier (Critical 1.8x, Moderate 1.4x)',
          'Daily target hour budget distribution'
        ]
      },
      prioritizedQueue: queue,
      weeklySchedule: dailySchedules,
      totalPendingItems: queue.length
    };
  }
}

module.exports = PlannerService;
