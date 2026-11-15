const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const gradingConfig = require('../config/gradingConfig');

class AnalyticsService {
  /**
   * Calculate class statistics for a given semester (and optionally branch)
   */
  static async getClassSubjectAverages(semester, branch = null) {
    let studentFilter = {};
    if (branch) {
      const students = await User.find({ branch, role: 'Student' }).select('_id');
      const studentIds = students.map((s) => s._id);
      studentFilter = { student: { $in: studentIds } };
    }

    const records = await AcademicRecord.find({
      semester: Number(semester),
      ...studentFilter
    });

    if (!records || records.length === 0) {
      return {};
    }

    // Accumulate marks per subjectCode
    const subjectStats = {};

    records.forEach((rec) => {
      rec.subjects.forEach((subj) => {
        const code = subj.subjectCode;
        if (!subjectStats[code]) {
          subjectStats[code] = {
            subjectCode: code,
            subjectName: subj.subjectName,
            credits: subj.credits,
            count: 0,
            quizMarksTotal: 0,
            surpriseTestMarksTotal: 0,
            midTermMarksTotal: 0,
            endTermMarksTotal: 0,
            totalMarksSum: 0,
            highestTotal: -Infinity,
            lowestTotal: Infinity,
            allTotals: []
          };
        }

        const stat = subjectStats[code];
        stat.count += 1;
        stat.quizMarksTotal += subj.quizMarks;
        stat.surpriseTestMarksTotal += subj.surpriseTestMarks;
        stat.midTermMarksTotal += subj.midTermMarks;
        stat.endTermMarksTotal += subj.endTermMarks;
        stat.totalMarksSum += subj.totalMarks;
        stat.highestTotal = Math.max(stat.highestTotal, subj.totalMarks);
        stat.lowestTotal = Math.min(stat.lowestTotal, subj.totalMarks);
        stat.allTotals.push(subj.totalMarks);
      });
    });

    // Format averages & standard deviation
    const result = {};
    for (const [code, stat] of Object.entries(subjectStats)) {
      const count = stat.count || 1;
      const averageTotal = Number((stat.totalMarksSum / count).toFixed(2));

      // Calculate variance and standard deviation
      const variance =
        stat.allTotals.reduce((sum, val) => sum + Math.pow(val - averageTotal, 2), 0) / count;
      const stdDev = Number(Math.sqrt(variance).toFixed(2));

      result[code] = {
        subjectCode: stat.subjectCode,
        subjectName: stat.subjectName,
        credits: stat.credits,
        studentCount: count,
        classAverage: {
          quiz: Number((stat.quizMarksTotal / count).toFixed(2)),
          surpriseTest: Number((stat.surpriseTestMarksTotal / count).toFixed(2)),
          midTerm: Number((stat.midTermMarksTotal / count).toFixed(2)),
          endTerm: Number((stat.endTermMarksTotal / count).toFixed(2)),
          total: averageTotal
        },
        highestScore: stat.highestTotal === -Infinity ? 0 : stat.highestTotal,
        lowestScore: stat.lowestTotal === Infinity ? 0 : stat.lowestTotal,
        standardDeviation: stdDev
      };
    }

    return result;
  }

  /**
   * Identify subject toppers in a semester
   */
  static async getSubjectToppers(semester, branch = null) {
    let studentFilter = {};
    if (branch) {
      const students = await User.find({ branch, role: 'Student' }).select('_id');
      const studentIds = students.map((s) => s._id);
      studentFilter = { student: { $in: studentIds } };
    }

    const records = await AcademicRecord.find({
      semester: Number(semester),
      ...studentFilter
    }).populate('student', 'name rollNumber branch gender email');

    const topperMap = {};

    records.forEach((rec) => {
      rec.subjects.forEach((subj) => {
        const code = subj.subjectCode;
        if (!topperMap[code] || subj.totalMarks > topperMap[code].highestMarks) {
          topperMap[code] = {
            subjectCode: code,
            subjectName: subj.subjectName,
            highestMarks: subj.totalMarks,
            grade: subj.grade,
            topper: {
              studentId: rec.student?._id,
              name: rec.student?.name || rec.rollNumber,
              rollNumber: rec.rollNumber,
              branch: rec.student?.branch
            }
          };
        }
      });
    });

    return Object.values(topperMap);
  }

  /**
   * Transparent Multi-Factor Weak Subject Identification Engine
   */
  static async identifyWeakSubjects(studentId, semester) {
    const studentRecord = await AcademicRecord.findOne({
      student: studentId,
      semester: Number(semester)
    });

    if (!studentRecord || !studentRecord.subjects || studentRecord.subjects.length === 0) {
      return {
        semester: Number(semester),
        totalSubjects: 0,
        weakSubjectCount: 0,
        weakSubjects: [],
        summary: 'No academic record found for this semester.'
      };
    }

    const student = await User.findById(studentId).select('branch');
    const classAverages = await this.getClassSubjectAverages(semester, student?.branch);

    const config = gradingConfig.weakSubjectThresholds;
    const maxMarks = gradingConfig.assessmentMaxMarks;

    const weakSubjects = [];

    studentRecord.subjects.forEach((subj) => {
      const code = subj.subjectCode;
      const classStat = classAverages[code];
      const classAvgTotal = classStat ? classStat.classAverage.total : 65;

      const reasons = [];
      let weaknessPoints = 0;

      // 1. Absolute Performance Check
      const subjectPercentage = subj.percentage;
      if (subjectPercentage < 40) {
        reasons.push('Current total marks are below the minimum passing benchmark (40%)');
        weaknessPoints += 45;
      } else if (subjectPercentage < config.absolutePercentageThreshold) {
        reasons.push(
          `Total score (${subjectPercentage}%) is below college proficiency target (${config.absolutePercentageThreshold}%)`
        );
        weaknessPoints += 30;
      }

      // 2. Class Average Comparison Check
      const deviation = Number((classAvgTotal - subj.totalMarks).toFixed(2));
      if (deviation >= config.classAverageDeviationThreshold) {
        reasons.push(
          `Performance is ${deviation} marks lower than the batch average (${classAvgTotal})`
        );
        weaknessPoints += Math.min(30, Math.round(deviation * 1.5));
      }

      // 3. Exam-Wise Performance Trend Analysis
      const quizPct = (subj.quizMarks / maxMarks.quiz) * 100;
      const surprisePct = (subj.surpriseTestMarks / maxMarks.surpriseTest) * 100;
      const midPct = (subj.midTermMarks / maxMarks.midTerm) * 100;

      if (quizPct > surprisePct && surprisePct > midPct && (quizPct - midPct) >= 15) {
        reasons.push('Declining performance trajectory detected across Quiz -> Surprise Test -> Mid-Term');
        weaknessPoints += 20;
      }

      // 4. Component-specific vulnerability
      if (midPct < 50 && maxMarks.midTerm > 0) {
        reasons.push(`Struggling in Mid-Term exam: scored only ${subj.midTermMarks}/${maxMarks.midTerm}`);
        weaknessPoints += 15;
      }

      // Assign Severity Level
      let severity = 'On Track';
      let requiresIntervention = false;

      if (weaknessPoints >= 50 || subjectPercentage < 40) {
        severity = 'Critical';
        requiresIntervention = true;
      } else if (weaknessPoints >= 30) {
        severity = 'Moderate';
        requiresIntervention = true;
      } else if (weaknessPoints >= 15) {
        severity = 'Mild';
        requiresIntervention = false;
      }

      if (requiresIntervention || severity === 'Mild') {
        const recommendations = [];
        if (severity === 'Critical') {
          recommendations.push('Immediate 1-on-1 Senior Mentorship recommended');
          recommendations.push('Allocate 40% additional daily study planner slots for this subject');
          recommendations.push('Solve previous 3 years mid-term and end-term question papers');
        } else if (severity === 'Moderate') {
          recommendations.push('Request doubt-clearing session from an experienced Senior Mentor');
          recommendations.push('Review fundamental concepts and class notes for Mid-Term topics');
        } else {
          recommendations.push('Maintain regular revision to prevent score dip in upcoming assessments');
        }

        weakSubjects.push({
          subjectCode: subj.subjectCode,
          subjectName: subj.subjectName,
          credits: subj.credits,
          studentMarks: {
            quiz: subj.quizMarks,
            surpriseTest: subj.surpriseTestMarks,
            midTerm: subj.midTermMarks,
            endTerm: subj.endTermMarks,
            total: subj.totalMarks,
            percentage: subj.percentage,
            grade: subj.grade
          },
          classAverageTotal: classAvgTotal,
          marksGap: deviation,
          severity,
          weaknessScore: Math.min(100, weaknessPoints),
          reasons,
          recommendations,
          suggestMentorship: severity === 'Critical' || severity === 'Moderate'
        });
      }
    });

    weakSubjects.sort((a, b) => b.weaknessScore - a.weaknessScore);

    return {
      semester: Number(semester),
      totalSubjects: studentRecord.subjects.length,
      weakSubjectCount: weakSubjects.filter((s) => s.severity !== 'Mild').length,
      weakSubjects,
      summary:
        weakSubjects.length === 0
          ? 'Great job! Performance is steady across all subjects.'
          : `Identified ${weakSubjects.length} subject(s) requiring focused revision and potential mentorship support.`
    };
  }

  /**
   * Retrieve exam-wise marks broken down by assessment type (Quiz, Surprise Test, Mid-Term, End-Term)
   */
  static async getExamWiseMarks(studentId, filters = {}) {
    const { semester, subjectCode, examType } = filters;
    const query = { student: studentId };
    if (semester) query.semester = Number(semester);

    const records = await AcademicRecord.find(query).sort({ semester: 1 });
    const maxMarks = gradingConfig.assessmentMaxMarks;

    const examBreakdown = [];

    records.forEach((rec) => {
      rec.subjects.forEach((subj) => {
        if (subjectCode && subj.subjectCode !== subjectCode.toUpperCase()) {
          return;
        }

        const exams = [
          {
            examType: 'Quiz',
            scored: subj.quizMarks,
            maxMarks: maxMarks.quiz,
            percentage: Number(((subj.quizMarks / maxMarks.quiz) * 100).toFixed(2))
          },
          {
            examType: 'Surprise Test',
            scored: subj.surpriseTestMarks,
            maxMarks: maxMarks.surpriseTest,
            percentage: Number(((subj.surpriseTestMarks / maxMarks.surpriseTest) * 100).toFixed(2))
          },
          {
            examType: 'Mid-Term',
            scored: subj.midTermMarks,
            maxMarks: maxMarks.midTerm,
            percentage: Number(((subj.midTermMarks / maxMarks.midTerm) * 100).toFixed(2))
          },
          {
            examType: 'End-Term',
            scored: subj.endTermMarks,
            maxMarks: maxMarks.endTerm,
            percentage: Number(((subj.endTermMarks / maxMarks.endTerm) * 100).toFixed(2))
          }
        ];

        // Filter by examType if requested (case-insensitive)
        const filteredExams = examType
          ? exams.filter((e) => e.examType.toLowerCase().replace(/[\s-]/g, '') === examType.toLowerCase().replace(/[\s-]/g, ''))
          : exams;

        examBreakdown.push({
          semester: rec.semester,
          subjectCode: subj.subjectCode,
          subjectName: subj.subjectName,
          credits: subj.credits,
          totalMarks: subj.totalMarks,
          grade: subj.grade,
          gradePoints: subj.gradePoints,
          exams: filteredExams
        });
      });
    });

    return examBreakdown;
  }

  /**
   * Return structured JSON explicitly formatted for Recharts components
   */
  static async getRechartsAnalyticsData(studentId, semester) {
    const student = await User.findById(studentId);
    const sem = Number(semester) || student.currentSemester;

    // 1. Student record and class statistics
    const studentRecord = await AcademicRecord.findOne({ student: studentId, semester: sem });
    const classStats = await this.getClassSubjectAverages(sem, student.branch);
    const toppers = await this.getSubjectToppers(sem, student.branch);
    const allRecords = await AcademicRecord.find({ student: studentId }).sort({ semester: 1 });

    const topperMap = {};
    toppers.forEach((t) => {
      topperMap[t.subjectCode] = t.highestMarks;
    });

    // 2. BarChart data: Student vs Class Average vs Top Scorer
    const subjectComparisonChart = (studentRecord?.subjects || []).map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      studentMarks: s.totalMarks,
      classAverage: classStats[s.subjectCode]?.classAverage?.total || 0,
      topperMarks: topperMap[s.subjectCode] || s.totalMarks
    }));

    // 3. Exam-Wise Performance Breakdown for RadarChart or Grouped BarChart
    let totalQuiz = 0, totalSurprise = 0, totalMid = 0, totalEnd = 0, subjectCount = studentRecord?.subjects?.length || 1;
    let classQuiz = 0, classSurprise = 0, classMid = 0, classEnd = 0;

    (studentRecord?.subjects || []).forEach((s) => {
      totalQuiz += s.quizMarks;
      totalSurprise += s.surpriseTestMarks;
      totalMid += s.midTermMarks;
      totalEnd += s.endTermMarks;

      const cs = classStats[s.subjectCode]?.classAverage;
      if (cs) {
        classQuiz += cs.quiz;
        classSurprise += cs.surpriseTest;
        classMid += cs.midTerm;
        classEnd += cs.endTerm;
      }
    });

    const examWiseComparisonChart = [
      {
        examType: 'Quiz',
        studentScore: Number((totalQuiz / subjectCount).toFixed(2)),
        classAverage: Number((classQuiz / subjectCount).toFixed(2)),
        maxMarks: gradingConfig.assessmentMaxMarks.quiz
      },
      {
        examType: 'Surprise Test',
        studentScore: Number((totalSurprise / subjectCount).toFixed(2)),
        classAverage: Number((classSurprise / subjectCount).toFixed(2)),
        maxMarks: gradingConfig.assessmentMaxMarks.surpriseTest
      },
      {
        examType: 'Mid-Term',
        studentScore: Number((totalMid / subjectCount).toFixed(2)),
        classAverage: Number((classMid / subjectCount).toFixed(2)),
        maxMarks: gradingConfig.assessmentMaxMarks.midTerm
      },
      {
        examType: 'End-Term',
        studentScore: Number((totalEnd / subjectCount).toFixed(2)),
        classAverage: Number((classEnd / subjectCount).toFixed(2)),
        maxMarks: gradingConfig.assessmentMaxMarks.endTerm
      }
    ];

    // 4. Semester-Wise Trend Chart (LineChart)
    let cumulativeCredits = 0;
    let cumulativePoints = 0;
    const semesterTrendChart = allRecords.map((r) => {
      cumulativeCredits += r.totalCredits || 0;
      cumulativePoints += (r.sgpa || 0) * (r.totalCredits || 0);
      const runningCgpa = cumulativeCredits > 0 ? Number((cumulativePoints / cumulativeCredits).toFixed(2)) : r.sgpa;

      return {
        semester: `Sem ${r.semester}`,
        semesterNumber: r.semester,
        academicYear: r.academicYear,
        sgpa: r.sgpa,
        cgpa: runningCgpa,
        credits: r.totalCredits
      };
    });

    // 5. Radar distribution per subject across all assessments
    const marksDistributionRadar = (studentRecord?.subjects || []).map((s) => ({
      subjectCode: s.subjectCode,
      quizPct: Number(((s.quizMarks / gradingConfig.assessmentMaxMarks.quiz) * 100).toFixed(1)),
      surprisePct: Number(((s.surpriseTestMarks / gradingConfig.assessmentMaxMarks.surpriseTest) * 100).toFixed(1)),
      midTermPct: Number(((s.midTermMarks / gradingConfig.assessmentMaxMarks.midTerm) * 100).toFixed(1)),
      endTermPct: Number(((s.endTermMarks / gradingConfig.assessmentMaxMarks.endTerm) * 100).toFixed(1)),
      totalPct: s.percentage
    }));

    return {
      semester: sem,
      branch: student.branch,
      recharts: {
        subjectComparisonChart,
        examWiseComparisonChart,
        semesterTrendChart,
        marksDistributionRadar
      }
    };
  }
}

module.exports = AnalyticsService;
