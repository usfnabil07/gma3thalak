import { useState, useEffect } from 'react';
import { CalendarX, AlertTriangle, CheckCircle, XCircle, Plus, BookText, RotateCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCourses } from '@/services/supabase/data';
import { Course } from '@/types';
import styles from './AttendanceTab.module.css';
import profileStyles from '@/app/profile/page.module.css';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

interface CourseAttendance {
  id: string;
  courseId?: string;
  name: string;
  creditHours?: number;
  semester?: 1 | 2;
  absentCount: number;
  limit: number;
}

export default function AttendanceTab() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<CourseAttendance[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.user_id || !profile.faculty_id || !profile.year) return;

    let cancelled = false;
    const loadAttendance = async () => {
      let savedCourses: CourseAttendance[] = [];
      const saved = readAccountStorage('bua_attendance_data', profile.user_id);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) savedCourses = parsed;
        } catch {
          savedCourses = [];
        }
      }

      const officialCourses = await getCourses(profile.faculty_id, profile.year);
      if (cancelled) return;

      const syncedCourses = officialCourses.map((course: Course): CourseAttendance => {
        const existing = savedCourses.find(item =>
          item.courseId === course.id ||
          (!item.courseId && item.name.trim() === course.name_ar.trim())
        );

        return {
          id: existing?.id ?? course.id,
          courseId: course.id,
          name: course.name_ar,
          creditHours: course.credit_hours,
          semester: course.semester,
          absentCount: existing?.absentCount ?? 0,
          limit: existing?.limit ?? 3
        };
      });

      setCourses(syncedCourses);
      setIsLoaded(true);
      setLoadedForUserId(profile.user_id);
    };

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, profile?.faculty_id, profile?.year]);

  useEffect(() => {
    if (isLoaded && loadedForUserId && loadedForUserId === profile?.user_id) {
      writeAccountStorage('bua_attendance_data', profile?.user_id, JSON.stringify(courses));
    }
  }, [courses, isLoaded, loadedForUserId, profile?.user_id]);

  const incrementAbsence = (id: string) => {
    setCourses(courses.map(c => c.id === id ? { ...c, absentCount: c.absentCount + 1 } : c));
  };

  const updateLimit = (id: string, value: number) => {
    if (!Number.isFinite(value) || value < 1) return;
    setCourses(current => current.map(course => course.id === id ? { ...course, limit: value } : course));
  };

  const decrementAbsence = (id: string) => {
    setCourses(courses.map(c => c.id === id && c.absentCount > 0 ? { ...c, absentCount: c.absentCount - 1 } : c));
  };

  if (!isLoaded || loadedForUserId !== profile?.user_id) return null;

  // Global stats
  const totalAbsences = courses.reduce((acc, c) => acc + c.absentCount, 0);
  const coursesInDanger = courses.filter(c => c.absentCount >= c.limit).length;
  const coursesWithWarning = courses.filter(c => c.absentCount / c.limit >= 0.6 && c.absentCount < c.limit).length;

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader}>
        <div className={profileStyles.headerIcon}>
          <CalendarX size={20} />
        </div>
        <h2 className={profileStyles.sectionHeaderTitle}>سجل الغياب</h2>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewIntro}>
          <span className={styles.overviewIcon}><CalendarX size={21} /></span>
          <div>
            <h3>تابع غيابك</h3>
            <p>تقدر تتابع غيابك من هنا عشان تتفادى الحرمان.</p>
          </div>
        </div>
        <div className={styles.overviewMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricIcon}><CalendarX size={19} /></span>
            <div className={styles.metricCopy}>
              <strong>{totalAbsences}</strong>
              <span>مرة غياب مسجلة</span>
            </div>
          </div>
          <div className={`${styles.metric} ${styles.metricWarning}`}>
            <span className={styles.metricIcon}><AlertTriangle size={19} /></span>
            <div className={styles.metricCopy}>
              <strong>{coursesWithWarning}</strong>
              <span>إنذار متوقع</span>
            </div>
          </div>
          <div className={`${styles.metric} ${styles.metricDanger}`}>
            <span className={styles.metricIcon}><ShieldAlert size={19} /></span>
            <div className={styles.metricCopy}>
              <strong>{coursesInDanger}</strong>
              <span>حرمان متوقع</span>
            </div>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><BookText size={24} /></span>
          <h3>لا توجد مواد دراسية</h3>
          <p>ستظهر موادك هنا عند إضافتها إلى حسابك.</p>
        </div>
      ) : <div className={styles.grid}>
        {courses.map(course => {
          const ratio = course.absentCount / course.limit;
          let statusTone = 'safe';
          let statusText = 'لسه في الأمان';
          let statusIcon = <CheckCircle size={14} />;

          if (ratio >= 1) {
            statusTone = 'danger';
            statusText = 'حرمان متوقع';
            statusIcon = <XCircle size={14} />;
          } else if (ratio >= 0.6) {
            statusTone = 'warning';
            statusText = 'إنذار متوقع';
            statusIcon = <AlertTriangle size={14} />;
          }

          const statusClass = statusTone === 'danger'
            ? styles.toneDanger
            : statusTone === 'warning' ? styles.toneWarning : styles.toneSafe;
          const fillPercentage = Math.min((course.absentCount / course.limit) * 100, 100);

          return (
            <div key={course.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.courseHeading}>
                  <div className={styles.courseBadge}><BookText size={18} /></div>
                  <div>
                    <h3 className={styles.courseName}>{course.name}</h3>
                    <span className={styles.courseMeta}>
                      {course.creditHours ? `${course.creditHours} ساعات معتمدة` : 'مادة دراسية'}
                      {course.semester ? ` · الترم ${course.semester}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressInfo}>
                  <span className={styles.progressText}>أنا غيبت كام مرة؟</span>
                  <strong className={styles.progressRatio}>{course.absentCount} <span>/ {course.limit}</span></strong>
                </div>
                <div className={styles.progressBar} role="progressbar" aria-valuenow={course.absentCount} aria-valuemin={0} aria-valuemax={course.limit} aria-label={`مرات الغياب في ${course.name}`}>
                  <div 
                    className={`${styles.progressFill} ${statusClass}`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
                <div className={`${styles.statusBadge} ${statusClass}`}>
                  {statusIcon}
                  <span>{statusText}</span>
                  <label className={styles.limitControl}>
                    <span>حد الغياب</span>
                    <input type="number" min="1" value={course.limit} aria-label={`حد الغياب لمادة ${course.name}`} onChange={event => updateLimit(course.id, Number(event.target.value))} />
                  </label>
                </div>
              </div>

              <div className={styles.actions}>
                <button type="button" className={`btn btn-primary ${styles.actionBtn}`} onClick={() => incrementAbsence(course.id)}>
                  <Plus size={17} />
                  <span>تسجيل غياب</span>
                </button>
                {course.absentCount > 0 && (
                  <button 
                    type="button"
                    className={styles.undoAbsenceBtn}
                    onClick={() => decrementAbsence(course.id)}
                  >
                    <RotateCcw size={14} /> تراجع عن آخر غياب
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>}

    </div>
  );
}
