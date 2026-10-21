import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { gradingSchemas } from '@/lib/gradingSchemas';
import { STORAGE_KEYS } from '@/constants/config';
import { getFacultyKey } from './GPATab';
import { readAccountStorage } from '@/lib/accountStorage';
import styles from './PlanTab.module.css';
import profileStyles from '@/app/profile/page.module.css';

interface CourseGrade {
  credits: number;
  scoreInput: string;
  courseType?: string;
}

interface SemesterData {
  courses: CourseGrade[];
}

export default function PlanTab({ faculty }: { faculty?: { name_ar: string } }) {
  const { profile } = useAuth();
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [forecastGpa, setForecastGpa] = useState('');
  const [forecastCompletedHours, setForecastCompletedHours] = useState('');

  const facultyId = getFacultyKey(faculty?.name_ar || profile?.faculty?.name_ar);

  useEffect(() => {
    if (!profile?.user_id) return;
    setIsClient(false);
    setSemesters([]);
    const saved = readAccountStorage(STORAGE_KEYS.GPA_DATA, profile.user_id);
    if (!saved) {
      setLoadedForUserId(profile.user_id);
      setIsClient(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed.semesters) setSemesters(parsed.semesters);
    } catch (error) {
      console.error('Failed to load GPA data for plan:', error);
    } finally {
      setLoadedForUserId(profile.user_id);
      setIsClient(true);
    }
  }, [profile?.user_id]);

  const { cgpa, totalCredits } = useMemo(() => {
    const schema = gradingSchemas[facultyId];
    let totalPoints = 0;
    let credits = 0;

    semesters.forEach(semester => {
      semester.courses.forEach(course => {
        if (!course.scoreInput?.trim()) return;

        const numericScore = parseFloat(course.scoreInput);
        const input = Number.isNaN(numericScore)
          ? course.scoreInput.toUpperCase().trim()
          : numericScore;
        const stats = schema.calculateCourseStats(input, course.courseType);
        totalPoints += stats.points * course.credits;
        credits += course.credits;
      });
    });

    return {
      cgpa: credits === 0 ? 0 : totalPoints / credits,
      totalCredits: credits,
    };
  }, [facultyId, semesters]);

  const totalRequiredHours = gradingSchemas[facultyId].totalHours || 144;
  const currentForecastGpa = forecastGpa === ''
    ? cgpa
    : Math.min(Math.max(Number(forecastGpa) || 0, 0), 4);
  const currentForecastHours = forecastCompletedHours === ''
    ? totalCredits
    : Math.min(Math.max(Number(forecastCompletedHours) || 0, 0), totalRequiredHours);
  const forecastRemainingHours = Math.max(totalRequiredHours - currentForecastHours, 0);
  const forecastMaxGpa = currentForecastHours >= totalRequiredHours
    ? currentForecastGpa
    : Math.min(
      4,
      ((currentForecastGpa * currentForecastHours) + (forecastRemainingHours * 4)) / totalRequiredHours
    );

  if (!isClient || loadedForUserId !== profile?.user_id) return null;

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader}>
        <div className={profileStyles.headerIcon}><TrendingUp size={20} /></div>
        <h2 className={profileStyles.sectionHeaderTitle}>توقع المعدل</h2>
      </div>

      <section className={styles.forecastPanel}>
        <header className={styles.forecastHeading}>
          <span className={styles.headingIcon}><TrendingUp size={21} /></span>
          <div className={styles.headingCopy}>
            <h3>أقصى معدل نهائي ممكن</h3>
            <p>أدخل معدلك الحالي والساعات المنجزة لمعرفة أقصى معدل نهائي ممكن.</p>
          </div>
        </header>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>معدلك الحالي <small className={styles.fieldHint}>من 4.00</small></span>
            <input type="number" min="0" max="4" step="0.01" placeholder="مثال: 3.25" value={forecastGpa} onChange={event => setForecastGpa(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>الساعات المنجزة <small className={styles.fieldHint}>من {totalRequiredHours}</small></span>
            <input type="number" min="0" max={totalRequiredHours} placeholder="مثال: 48" value={forecastCompletedHours} onChange={event => setForecastCompletedHours(event.target.value)} />
          </label>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>إجمالي ساعات الكلية</span>
            <div className={styles.totalHours}><strong>{totalRequiredHours}</strong><span>ساعة معتمدة</span></div>
          </div>
        </div>

        <div className={styles.results}>
          <div className={styles.result}>
            <span className={styles.resultLabel}>الساعات المتبقية</span>
            <strong className={styles.resultValue}>{forecastRemainingHours}</strong>
            <small className={styles.resultUnit}>ساعة</small>
          </div>
          <div className={styles.result}>
            <span className={styles.resultLabel}>معدلك الحالي</span>
            <strong className={styles.resultValue}>{currentForecastGpa.toFixed(2)}</strong>
            <small className={styles.resultUnit}>من 4.00</small>
          </div>
          <div className={`${styles.result} ${styles.resultPrimary}`}>
            <span className={styles.resultLabel}>أقصى معدل نهائي</span>
            <strong className={styles.resultValue}>{forecastMaxGpa.toFixed(2)}</strong>
            <small className={styles.resultUnit}>من 4.00</small>
          </div>
        </div>

        <p className={styles.note}>التوقع يفترض حصولك على 4.00 في جميع الساعات المتبقية.</p>
      </section>
    </div>
  );
}
