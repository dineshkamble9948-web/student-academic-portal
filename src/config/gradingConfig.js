/**
 * Configurable Grading and Analytics Rules
 * 
 * NOTE: As per requirements, do not invent rigid college formulas.
 * This configuration serves as the single source of truth for:
 * 1. Internal/External assessment breakdown
 * 2. Letter grade to Grade Point scale
 * 3. SGPA calculation formula
 * 4. CGPA calculation formula
 * 5. Weak subject threshold benchmarks
 * 
 * All rules can be customized or replaced when the institution's official
 * Academic Ordinance / Regulations are provided.
 */

const gradingConfig = {
  // Maximum marks for each evaluation component (total = 100)
  assessmentMaxMarks: {
    quiz: Number(process.env.GRADING_MAX_QUIZ) || 20,
    surpriseTest: Number(process.env.GRADING_MAX_SURPRISE_TEST) || 10,
    midTerm: Number(process.env.GRADING_MAX_MID_TERM) || 30,
    endTerm: Number(process.env.GRADING_MAX_END_TERM) || 40,
    total: Number(process.env.GRADING_TOTAL_MARKS) || 100
  },

  // Standard UGC / AICTE 10-point grading scale mapping
  // Can be adjusted as per college ordinance (e.g., VTU, AKTU, JNTU, Autonomous, etc.)
  gradeScale: [
    { grade: 'O', minPercent: 90, maxPercent: 100, points: 10, description: 'Outstanding' },
    { grade: 'A+', minPercent: 80, maxPercent: 89.99, points: 9, description: 'Excellent' },
    { grade: 'A', minPercent: 70, maxPercent: 79.99, points: 8, description: 'Very Good' },
    { grade: 'B+', minPercent: 60, maxPercent: 69.99, points: 7, description: 'Good' },
    { grade: 'B', minPercent: 50, maxPercent: 59.99, points: 6, description: 'Above Average' },
    { grade: 'C', minPercent: 45, maxPercent: 49.99, points: 5, description: 'Average' },
    { grade: 'P', minPercent: 40, maxPercent: 44.99, points: 4, description: 'Pass' },
    { grade: 'F', minPercent: 0, maxPercent: 39.99, points: 0, description: 'Fail' }
  ],

  // Weak subject identification thresholds
  weakSubjectThresholds: {
    // Subject total marks percentage below which a subject is flagged weak
    absolutePercentageThreshold: Number(process.env.WEAK_SUBJECT_PERCENTAGE_THRESHOLD) || 55,
    // Marks percentage lower than class average by this difference is flagged weak
    classAverageDeviationThreshold: Number(process.env.WEAK_SUBJECT_DEVIATION_THRESHOLD) || 10,
    // Consecutive declining score trigger across exam components (Quiz -> Surprise -> Mid-Term)
    detectNegativeTrend: true
  },

  /**
   * Calculate letter grade and grade points for a given total percentage
   * @param {number} totalPercentage 
   * @returns {{ grade: string, points: number, description: string }}
   */
  calculateGrade(totalPercentage) {
    const clamped = Math.min(100, Math.max(0, totalPercentage));
    for (const tier of this.gradeScale) {
      if (clamped >= tier.minPercent && clamped <= tier.maxPercent) {
        return {
          grade: tier.grade,
          points: tier.points,
          description: tier.description
        };
      }
    }
    return { grade: 'F', points: 0, description: 'Fail' };
  },

  /**
   * Configurable SGPA formula:
   * SGPA = Sum(Subject Credits * Subject Grade Points) / Sum(Subject Credits)
   * @param {Array<{ credits: number, gradePoints: number }>} subjects 
   * @returns {number} SGPA rounded to 2 decimal places
   */
  calculateSGPA(subjects) {
    if (!subjects || subjects.length === 0) return 0;
    
    let totalCreditPoints = 0;
    let totalCredits = 0;

    for (const item of subjects) {
      const credits = Number(item.credits) || 0;
      const points = Number(item.gradePoints) || 0;
      totalCreditPoints += credits * points;
      totalCredits += credits;
    }

    if (totalCredits === 0) return 0;
    return Number((totalCreditPoints / totalCredits).toFixed(2));
  },

  /**
   * Configurable CGPA formula:
   * CGPA = Sum(Semester Credits * SGPA) / Sum(Semester Credits)
   * (Falls back to simple average of SGPAs if semester credits are not tracked separately)
   * @param {Array<{ sgpa: number, totalCredits?: number }>} semesterRecords 
   * @returns {number} CGPA rounded to 2 decimal places
   */
  calculateCGPA(semesterRecords) {
    if (!semesterRecords || semesterRecords.length === 0) return 0;

    const hasCredits = semesterRecords.every((r) => r.totalCredits && r.totalCredits > 0);

    if (hasCredits) {
      let totalWeightedSGPA = 0;
      let totalSemCredits = 0;
      for (const sem of semesterRecords) {
        totalWeightedSGPA += sem.sgpa * sem.totalCredits;
        totalSemCredits += sem.totalCredits;
      }
      return totalSemCredits > 0 ? Number((totalWeightedSGPA / totalSemCredits).toFixed(2)) : 0;
    }

    // Default arithmetic mean across completed semesters
    const sumSGPA = semesterRecords.reduce((acc, sem) => acc + (Number(sem.sgpa) || 0), 0);
    return Number((sumSGPA / semesterRecords.length).toFixed(2));
  }
};

module.exports = gradingConfig;
