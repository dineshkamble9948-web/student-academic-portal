const AcademicRecord = require('../models/AcademicRecord');
const Subject = require('../models/Subject');
const gradingConfig = require('../config/gradingConfig');
const ApiError = require('../utils/apiError');

/**
 * Service to calculate grades, SGPA, and CGPA
 */
class AcademicService {
  /**
   * Process individual subject marks, compute percentages, grades and grade points
   */
  static processSubjectMarks(rawSubject) {
    const quiz = Math.max(0, Number(rawSubject.quizMarks) || 0);
    const surprise = Math.max(0, Number(rawSubject.surpriseTestMarks) || 0);
    const mid = Math.max(0, Number(rawSubject.midTermMarks) || 0);
    const end = Math.max(0, Number(rawSubject.endTermMarks) || 0);
    
    const total = Number((quiz + surprise + mid + end).toFixed(2));
    const maxTotal = gradingConfig.assessmentMaxMarks.total || 100;
    const percentage = Number(((total / maxTotal) * 100).toFixed(2));

    const gradeInfo = gradingConfig.calculateGrade(percentage);

    return {
      subject: rawSubject.subject,
      subjectCode: rawSubject.subjectCode.toUpperCase(),
      subjectName: rawSubject.subjectName,
      credits: Number(rawSubject.credits) || 3,
      quizMarks: quiz,
      surpriseTestMarks: surprise,
      midTermMarks: mid,
      endTermMarks: end,
      totalMarks: total,
      percentage: percentage,
      grade: gradeInfo.grade,
      gradePoints: gradeInfo.points
    };
  }

  /**
   * Recalculate SGPA for a semester record
   */
  static calculateSemesterSGPA(processedSubjects) {
    return gradingConfig.calculateSGPA(processedSubjects);
  }

  /**
   * Compute cumulative CGPA for a student across all completed semesters
   */
  static async calculateStudentCGPA(studentId) {
    const allSemesters = await AcademicRecord.find({ student: studentId }).sort({ semester: 1 });
    
    if (!allSemesters || allSemesters.length === 0) {
      return {
        cgpa: 0,
        totalCredits: 0,
        completedSemesters: 0,
        semesterHistory: []
      };
    }

    const semesterHistory = allSemesters.map((rec) => ({
      semester: rec.semester,
      academicYear: rec.academicYear,
      sgpa: rec.sgpa,
      totalCredits: rec.totalCredits,
      earnedCredits: rec.earnedCredits,
      subjectCount: rec.subjects.length
    }));

    const cgpa = gradingConfig.calculateCGPA(semesterHistory);
    const totalCredits = semesterHistory.reduce((acc, sem) => acc + (sem.totalCredits || 0), 0);
    const earnedCredits = semesterHistory.reduce((acc, sem) => acc + (sem.earnedCredits || 0), 0);

    return {
      cgpa,
      totalCredits,
      earnedCredits,
      completedSemesters: semesterHistory.length,
      semesterHistory
    };
  }

  /**
   * Bulk process academic records from standardized JSON/CSV parsed rows
   */
  static async bulkUpsertRecords(recordsData) {
    const results = [];
    for (const record of recordsData) {
      const { studentId, rollNumber, semester, academicYear, subjects } = record;

      const processedSubjects = subjects.map((sub) => this.processSubjectMarks(sub));
      const totalCredits = processedSubjects.reduce((acc, s) => acc + s.credits, 0);
      const earnedCredits = processedSubjects
        .filter((s) => s.gradePoints > 0)
        .reduce((acc, s) => acc + s.credits, 0);
      const sgpa = this.calculateSemesterSGPA(processedSubjects);

      const upserted = await AcademicRecord.findOneAndUpdate(
        { student: studentId, semester },
        {
          student: studentId,
          rollNumber: rollNumber.toUpperCase(),
          semester,
          academicYear: academicYear || '2023-2024',
          subjects: processedSubjects,
          totalCredits,
          earnedCredits,
          sgpa
        },
        { upsert: true, new: true, runValidators: true }
      );

      results.push(upserted);
    }
    return results;
  }
}

module.exports = AcademicService;
