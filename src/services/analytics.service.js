const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const gradingConfig = require('../config/gradingConfig');

class AnalyticsService {
  /**
   * Calculate class statistics for a given semester (and optionally branch)
   */
  static async getClassSubjectAverages(semester, branch = null) {
    // If branch provided, get roll numbers or student IDs in that branch
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
   * Evaluates:
   * 1. Absolute percentage threshold (e.g. < 55%)
   * 2. Difference relative to class average (e.g. > 10% lower)
   * 3. Exam progression trend (Quiz -> Surprise -> Mid-Term)
   * 4. Vulnerable assessment components
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
      // Calculate normalized percentages for each completed exam component
      const quizPct = (subj.quizMarks / maxMarks.quiz) * 100;
      const surprisePct = (subj.surpriseTestMarks / maxMarks.surpriseTest) * 100;
      const midPct = (subj.midTermMarks / maxMarks.midTerm) * 100;

      // Check for declining trend across continuous assessments
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
        // Formulate actionable recommendations
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
          severity, // 'Critical' | 'Moderate' | 'Mild'
          weaknessScore: Math.min(100, weaknessPoints),
          reasons,
          recommendations,
          suggestMentorship: severity === 'Critical' || severity === 'Moderate'
        });
      }
    });

    // Sort by weakness severity descending
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
}

module.exports = AnalyticsService;
