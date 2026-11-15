/**
 * Configurable Grading and Analytics Rules
 * 
 * Includes the official IIIT Raichur / IIT Hyderabad mentorship grading scheme:
 * - 10-point relative/absolute scale
 * - Grades: A+ (10), A (10), A- (9), B (8), B- (7), C (6), C- (5), D (4), F (0)
 * - Academic standing thresholds:
 *     - CGPA >= 8.0: Honors Eligible
 *     - CGPA >= 5.0: Good Academic Standing
 *     - CGPA < 5.0: Academic Probation (IIIT Raichur B.Tech Ordinance rule)
 */

const gradingConfig = {
  // Active scheme selector (defaults to verified IIIT_RAICHUR scheme)
  activeScheme: process.env.GRADING_SCHEME || 'IIIT_RAICHUR',

  // Maximum marks for each evaluation component (total = 100)
  assessmentMaxMarks: {
    quiz: Number(process.env.GRADING_MAX_QUIZ) || 20,
    surpriseTest: Number(process.env.GRADING_MAX_SURPRISE_TEST) || 10,
    midTerm: Number(process.env.GRADING_MAX_MID_TERM) || 30,
    endTerm: Number(process.env.GRADING_MAX_END_TERM) || 40,
    total: Number(process.env.GRADING_TOTAL_MARKS) || 100
  },

  // Available institutional grading schemes
  schemes: {
    // Official IIIT Raichur (IITH mentored) 10-point scheme
    IIIT_RAICHUR: [
      { grade: 'A+', minPercent: 90, maxPercent: 100, points: 10, description: 'Outstanding' },
      { grade: 'A',  minPercent: 80, maxPercent: 89.99, points: 10, description: 'Excellent' },
      { grade: 'A-', minPercent: 70, maxPercent: 79.99, points: 9,  description: 'Very Good' },
      { grade: 'B',  minPercent: 60, maxPercent: 69.99, points: 8,  description: 'Good' },
      { grade: 'B-', minPercent: 55, maxPercent: 59.99, points: 7,  description: 'Satisfactory' },
      { grade: 'C',  minPercent: 50, maxPercent: 54.99, points: 6,  description: 'Average' },
      { grade: 'C-', minPercent: 45, maxPercent: 49.99, points: 5,  description: 'Marginal Pass' },
      { grade: 'D',  minPercent: 40, maxPercent: 44.99, points: 4,  description: 'Pass' },
      { grade: 'F',  minPercent: 0,  maxPercent: 39.99, points: 0,  description: 'Fail' }
    ],

    // Standard UGC / AICTE fallback scheme
    UGC_STANDARD: [
      { grade: 'O',  minPercent: 90, maxPercent: 100, points: 10, description: 'Outstanding' },
      { grade: 'A+', minPercent: 80, maxPercent: 89.99, points: 9,  description: 'Excellent' },
      { grade: 'A',  minPercent: 70, maxPercent: 79.99, points: 8,  description: 'Very Good' },
      { grade: 'B+', minPercent: 60, maxPercent: 69.99, points: 7,  description: 'Good' },
      { grade: 'B',  minPercent: 50, maxPercent: 59.99, points: 6,  description: 'Above Average' },
      { grade: 'C',  minPercent: 45, maxPercent: 49.99, points: 5,  description: 'Average' },
      { grade: 'P',  minPercent: 40, maxPercent: 44.99, points: 4,  description: 'Pass' },
      { grade: 'F',  minPercent: 0,  maxPercent: 39.99, points: 0,  description: 'Fail' }
    ]
  },

  // Weak subject identification thresholds
  weakSubjectThresholds: {
    absolutePercentageThreshold: Number(process.env.WEAK_SUBJECT_PERCENTAGE_THRESHOLD) || 55,
    classAverageDeviationThreshold: Number(process.env.WEAK_SUBJECT_DEVIATION_THRESHOLD) || 10,
    detectNegativeTrend: true
  },

  // Academic standing criteria (IIIT Raichur standards)
  academicStandingCriteria: {
    honorsMinCgpa: 8.0,
    goodStandingMinCgpa: 5.0,
    probationMaxCgpa: 4.99
  },

  /**
   * Get active grade scale
   */
  getActiveGradeScale() {
    return this.schemes[this.activeScheme] || this.schemes.IIIT_RAICHUR;
  },

  /**
   * Calculate letter grade and grade points for a given total percentage
   * @param {number} totalPercentage 
   * @returns {{ grade: string, points: number, description: string }}
   */
  calculateGrade(totalPercentage) {
    const scale = this.getActiveGradeScale();
    const clamped = Math.min(100, Math.max(0, totalPercentage));
    for (const tier of scale) {
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
   * Determine Academic Standing as per IIIT Raichur ordinance
   * @param {number} cgpa 
   * @param {number} backlogCount 
   * @returns {'HONORS_ELIGIBLE' | 'GOOD_STANDING' | 'ACADEMIC_PROBATION' | 'CRITICAL'}
   */
  determineAcademicStanding(cgpa, backlogCount = 0) {
    if (cgpa >= 8.0 && backlogCount === 0) return 'HONORS_ELIGIBLE';
    if (cgpa >= 5.0) return 'GOOD_STANDING';
    if (cgpa >= 4.0) return 'ACADEMIC_PROBATION';
    return 'CRITICAL';
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

    const sumSGPA = semesterRecords.reduce((acc, sem) => acc + (Number(sem.sgpa) || 0), 0);
    return Number((sumSGPA / semesterRecords.length).toFixed(2));
  }
};

module.exports = gradingConfig;
