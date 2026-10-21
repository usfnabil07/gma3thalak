import { GradingRule, StudentGrade } from '@/types';

export function getGradeFromScore(
  score: number,
  rules: GradingRule[]
): GradingRule | null {
  return (
    rules.find((r) => score >= r.min_score && score <= r.max_score) ?? null
  );
}

export function calcSemesterGpa(grades: StudentGrade[]): number {
  const totalPoints = grades.reduce(
    (sum, g) => sum + g.gpa_points * g.credit_hours,
    0
  );
  const totalHours = grades.reduce((sum, g) => sum + g.credit_hours, 0);
  if (totalHours === 0) return 0;
  return parseFloat((totalPoints / totalHours).toFixed(2));
}

export function calcCumulativeGpa(allGrades: StudentGrade[]): number {
  return calcSemesterGpa(allGrades);
}

export function getGpaLabel(gpa: number): string {
  if (gpa >= 3.7) return 'امتياز مع مرتبة الشرف';
  if (gpa >= 3.3) return 'امتياز';
  if (gpa >= 3.0) return 'جيد جداً مرتفع';
  if (gpa >= 2.7) return 'جيد جداً';
  if (gpa >= 2.3) return 'جيد مرتفع';
  if (gpa >= 2.0) return 'جيد';
  if (gpa >= 1.7) return 'مقبول مرتفع';
  if (gpa >= 1.0) return 'مقبول';
  return 'راسب';
}

export function getGpaColor(gpa: number): string {
  if (gpa >= 3.7) return 'var(--color-success)';
  if (gpa >= 3.0) return 'var(--color-primary)';
  if (gpa >= 2.0) return 'var(--color-warning)';
  return 'var(--color-danger)';
}
