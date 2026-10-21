export interface GradingSchema {
  id: string;
  name: string;
  totalHours?: number; // Added to calculate progress circle
  courseTypes?: { id: string; name: string }[];
  calculateCourseStats: (scoreOrGrade: number | string, courseType?: string) => { points: number; letter: string };
  getAllLetters: () => string[];
}

export const gradingSchemas: Record<string, GradingSchema> = {
  BIO: {
    id: 'BIO',
    name: 'كلية التكنولوجيا الحيوية (BIO)',
    totalHours: 132,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - 60) * 0.04 + 2.4;
        let letter = 'F';
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = 'D';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D': 2.5, 'F': 0.0
        };
        return { points: mapping[scoreOrGrade] || 0, letter: scoreOrGrade };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  DENTISTRY: {
    id: 'DENTISTRY',
    name: 'كلية طب الفم والأسنان',
    totalHours: 198,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - 60) * 0.04 + 2.4;
        let letter = 'F';
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = 'D';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D': 2.5, 'F': 0.0
        };
        return { points: mapping[scoreOrGrade] || 0, letter: scoreOrGrade };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  PHYSICAL_THERAPY: {
    id: 'PHYSICAL_THERAPY',
    name: 'كلية العلاج الطبيعي',
    totalHours: 208,
    courseTypes: [
      { id: 'faculty', name: 'متطلبات كلية (نجاح 60%)' }
    ],
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - 60) * 0.04 + 2.4;
        let letter = 'F';
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = 'D';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D': 2.5, 'F': 0.0
        };
        return { points: mapping[scoreOrGrade] || 0, letter: scoreOrGrade };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  NURSING: {
    id: 'NURSING',
    name: 'كلية التمريض',
    totalHours: 140,
    courseTypes: [
      { id: 'main', name: 'مواد تمريضية (نجاح 60%)' },
      { id: 'support', name: 'مواد مساندة (نجاح 50%)' }
    ],
    calculateCourseStats: (scoreOrGrade: number | string, courseType?: string) => {
      const isSupport = courseType === 'support';
      const passMark = isSupport ? 50 : 60;
      const basePoints = isSupport ? 2.0 : 2.4;

      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < passMark) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - passMark) * 0.04 + basePoints;
        let letter = 'F';
        
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = isSupport ? 'D+' : 'D';
        else if (score >= 55 && isSupport) letter = 'D';
        else if (score >= 50 && isSupport) letter = 'D-';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D+': 2.5, 'D': isSupport ? 2.3 : 2.5, 'D-': 2.1, 'F': 0.0
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'D-', 'F']
  },
  APPLIED_ARTS: {
    id: 'APPLIED_ARTS',
    name: 'كلية الفنون التطبيقية',
    totalHours: 165,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score >= 95) return { points: 4.00, letter: 'A' };
        if (score >= 90) return { points: 3.67, letter: 'A-' };
        if (score >= 87) return { points: 3.33, letter: 'B+' };
        if (score >= 80) return { points: 3.00, letter: 'B' };
        if (score >= 76) return { points: 2.67, letter: 'B-' };
        if (score >= 73) return { points: 2.33, letter: 'C+' };
        if (score >= 70) return { points: 2.00, letter: 'C' };
        if (score >= 67) return { points: 1.67, letter: 'C-' };
        if (score >= 64) return { points: 1.33, letter: 'D+' };
        return { points: 1.00, letter: 'D' };
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A': 4.00, 'A-': 3.67, 
          'B+': 3.33, 'B': 3.00, 'B-': 2.67,
          'C+': 2.33, 'C': 2.00, 'C-': 1.67,
          'D+': 1.33, 'D': 1.00, 'F': 0.00
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']
  },
  VETERINARY: {
    id: 'VETERINARY',
    name: 'كلية الطب البيطري',
    totalHours: 190,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - 60) * 0.04 + 2.4;
        let letter = 'F';
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = 'D';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D': 2.5, 'F': 0.0
        };
        return { points: mapping[scoreOrGrade] || 0, letter: scoreOrGrade };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  PHARMACY: {
    id: 'PHARMACY',
    name: 'كلية الصيدلة',
    totalHours: 175,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score >= 95) return { points: 4.0, letter: 'A+' };
        if (score >= 90) return { points: 3.8, letter: 'A' };
        if (score >= 85) return { points: 3.6, letter: 'A-' };
        if (score >= 80) return { points: 3.3, letter: 'B+' };
        if (score >= 75) return { points: 3.0, letter: 'B' };
        if (score >= 70) return { points: 2.7, letter: 'B-' };
        if (score >= 65) return { points: 2.3, letter: 'C+' };
        return { points: 2.0, letter: 'C' }; // >= 60
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.8, 'A-': 3.6, 
          'B+': 3.3, 'B': 3.0, 'B-': 2.7,
          'C+': 2.3, 'C': 2.0, 'F': 0.0
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F']
  },
  APPLIED_SCIENCE: {
    id: 'APPLIED_SCIENCE',
    name: 'كلية العلوم التطبيقية',
    totalHours: 144,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 60) return { points: 0, letter: 'F' };
        if (score >= 95) return { points: 4.0, letter: 'A+' };
        if (score >= 90) return { points: 3.8, letter: 'A' };
        if (score >= 85) return { points: 3.6, letter: 'A-' };
        if (score >= 80) return { points: 3.3, letter: 'B+' };
        if (score >= 75) return { points: 3.0, letter: 'B' };
        if (score >= 70) return { points: 2.7, letter: 'B-' };
        if (score >= 65) return { points: 2.3, letter: 'C+' };
        return { points: 2.0, letter: 'C' }; // >= 60
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.8, 'A-': 3.6, 
          'B+': 3.3, 'B': 3.0, 'B-': 2.7,
          'C+': 2.3, 'C': 2.0, 'F': 0.0
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'F']
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'كلية الأعمال (Business)',
    totalHours: 132,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 50) return { points: 0, letter: 'F' };
        if (score > 100) return { points: 4.0, letter: 'A+' };
        
        const points = (score - 50) * 0.04 + 2.0;
        let letter = 'F';
        
        if (score >= 95) letter = 'A+';
        else if (score >= 90) letter = 'A';
        else if (score >= 85) letter = 'A-';
        else if (score >= 80) letter = 'B+';
        else if (score >= 75) letter = 'B';
        else if (score >= 70) letter = 'C+';
        else if (score >= 65) letter = 'C';
        else if (score >= 60) letter = 'D+';
        else if (score >= 55) letter = 'D';
        else if (score >= 50) letter = 'D-';

        return { points: Number(points.toFixed(2)), letter };
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A+': 4.0, 'A': 3.7, 'A-': 3.5, 
          'B+': 3.3, 'B': 3.1, 
          'C+': 2.9, 'C': 2.7, 
          'D+': 2.5, 'D': 2.3, 'D-': 2.1, 'F': 0.0
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'D-', 'F']
  },
  LAW: {
    id: 'LAW',
    name: 'كلية الحقوق',
    totalHours: 132,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      // Re-use Business logic as they are identical
      return gradingSchemas.BUSINESS.calculateCourseStats(scoreOrGrade);
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'D-', 'F']
  },
  AI: {
    id: 'AI',
    name: 'كلية الذكاء الاصطناعي',
    totalHours: 128,
    calculateCourseStats: (scoreOrGrade: number | string) => {
      if (typeof scoreOrGrade === 'number') {
        const score = scoreOrGrade;
        if (score < 50) return { points: 0.00, letter: 'F' };
        if (score >= 96) return { points: 4.00, letter: 'A+' };
        if (score >= 92) return { points: 3.70, letter: 'A' };
        if (score >= 88) return { points: 3.40, letter: 'A-' };
        if (score >= 84) return { points: 3.20, letter: 'B+' };
        if (score >= 80) return { points: 3.00, letter: 'B' };
        if (score >= 76) return { points: 2.80, letter: 'B-' };
        if (score >= 72) return { points: 2.60, letter: 'C+' };
        if (score >= 68) return { points: 2.40, letter: 'C' };
        if (score >= 64) return { points: 2.20, letter: 'C-' };
        if (score >= 60) return { points: 2.00, letter: 'D+' };
        if (score >= 55) return { points: 1.50, letter: 'D' };
        return { points: 1.00, letter: 'D-' }; // >= 50
      } else {
        const str = scoreOrGrade.toUpperCase().trim();
        const mapping: Record<string, number> = {
          'A+': 4.00, 'A': 3.70, 'A-': 3.40, 
          'B+': 3.20, 'B': 3.00, 'B-': 2.80,
          'C+': 2.60, 'C': 2.40, 'C-': 2.20,
          'D+': 2.00, 'D': 1.50, 'D-': 1.00,
          'F': 0.00, 'ABS': 0.00
        };
        return { points: mapping[str] || 0, letter: str };
      }
    },
    getAllLetters: () => ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'Abs']
  }
};
