import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Building2, GraduationCap, Star, User, BookOpen, Calendar, Clock, TrendingUp, Calculator, FileText, Copy, X, CreditCard } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/app/profile/page.module.css';
import toastStyles from './ScheduleTab.module.css';
import { STORAGE_KEYS } from '@/constants/config';
import { getStudentGrades } from '@/services/supabase/data';
import { gradingSchemas } from '@/lib/gradingSchemas';
import { getFacultyKey } from '@/components/profile/GPATab';
import { Profile, Faculty } from '@/types';
import { readAccountStorage } from '@/lib/accountStorage';

export default function MainTab({ profile: propProfile, faculty: propFaculty }: { profile?: Profile; faculty?: Faculty | null }) {
  const { profile: authProfile } = useAuth();
  const profile = propProfile || authProfile;
  const faculty = propFaculty;

  const [gpa, setGpa] = useState<number>(0);
  const [completedHours, setCompletedHours] = useState<number>(0);
  const [summerCourses, setSummerCourses] = useState<number>(0);
  const [totalRequiredHours, setTotalRequiredHours] = useState<number>(144);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [statsUserId, setStatsUserId] = useState<string | null>(null);
  const [isStudentCardOpen, setIsStudentCardOpen] = useState(false);
  const [copyToast, setCopyToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  const copyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayLoadingStats = loadingStats || statsUserId !== profile?.user_id;

  function showCopyToast(message: string, type: 'success' | 'error') {
    if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
    const id = Date.now();
    setCopyToast({ message, type, id });
    copyToastTimer.current = setTimeout(() => setCopyToast(null), 2400);
  }

  useEffect(() => () => {
    if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
  }, []);
  useEffect(() => {
    function loadLocalStats() {
      if (!profile?.user_id) return;
      setLoadingStats(true);

      const schemaKey = getFacultyKey(profile?.faculty?.name_ar || faculty?.name_ar);
      const schema = (gradingSchemas as any)[schemaKey];
      setTotalRequiredHours(schema.totalHours || 144);

      let totalPoints = 0;
      let totalHours = 0;
      let passedHours = 0;
      let summerCount = 0;

      const savedGpa = readAccountStorage(STORAGE_KEYS.GPA_DATA, profile.user_id);
      if (savedGpa) {
        try {
          const parsed = JSON.parse(savedGpa);
          if (parsed.semesters) {
            parsed.semesters.forEach((semester: any) => {
              semester.courses.forEach((course: any) => {
                const { scoreInput, courseType, credits } = course;
                if (scoreInput && scoreInput.trim() !== '') {
                  const num = parseFloat(scoreInput);
                  
                  let stats;
                  if (!isNaN(num)) {
                    stats = schema.calculateCourseStats(num, courseType);
                  } else {
                    stats = schema.calculateCourseStats(scoreInput.toUpperCase().trim(), courseType);
                  }

                  totalPoints += (stats.points * credits);
                  totalHours += credits;

                  const isFail = stats.letter === 'F' || stats.letter === 'FW' || stats.letter === 'W' || stats.points === 0;
                  
                  // Fail = Summer Course
                  if (isFail) {
                    summerCount++;
                  } else {
                    passedHours += credits;
                  }
                }
              });
            });
          }
        } catch (e) {

        }
      }

      // Check Attendance Data for Deprivation (Bans)
      const savedAttendance = readAccountStorage('bua_attendance_data', profile.user_id);
      if (savedAttendance) {
        try {
          const attendanceCourses = JSON.parse(savedAttendance);
          attendanceCourses.forEach((course: any) => {
            if (course.absentCount >= course.limit) {
              summerCount++;
            }
          });
        } catch (e) {

        }
      }

      // Add manual summer courses (e.g. transferred from another university)
      const manualSummer = parseInt(readAccountStorage('bua_manual_summer_courses', profile.user_id) || '0');
      if (!isNaN(manualSummer) && manualSummer > 0) {
        summerCount += manualSummer;
      }

      setCompletedHours(passedHours);
      setGpa(totalHours > 0 ? Number((totalPoints / totalHours).toFixed(2)) : 0);
      setSummerCourses(summerCount);
      setStatsUserId(profile.user_id);
      setLoadingStats(false);
    }

    loadLocalStats();
  }, [profile?.user_id, profile?.faculty?.name_ar, faculty?.name_ar]);

  const getGpaBadge = (val: number) => {
    if (val >= 3.4) return { text: 'امتياز', color: '#10b981' };
    if (val >= 2.8) return { text: 'جيد جداً', color: '#0ea5e9' };
    if (val >= 2.4) return { text: 'جيد', color: '#f59e0b' };
    if (val >= 2.0) return { text: 'مقبول', color: '#8b5cf6' };
    return { text: 'ضعيف', color: '#ef4444' };
  };

  const gpaBadge = getGpaBadge(gpa);
  const yearLabel = profile?.year
    ? ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'][profile.year - 1] || profile.year
    : 'غير محددة';

  return (
    <div className={styles.contentArea}>
      {/* Top Header */}
      <div className={styles.sectionHeader}>
        <div className={styles.headerIcon}>
          <User size={20} />
        </div>
        <h2 className={styles.sectionHeaderTitle}>ملف المستخدم</h2>
      </div>

      {/* User Details Layout */}
      <div className={styles.userInfoLayout}>
        {/* Text Details */}
        <div className={styles.userDetails}>
          <h1 className={styles.userName}>{profile?.full_name}</h1>
          <div className={styles.contactInfo}>
            <div className={styles.contactRow}>
              <span>{faculty?.name_ar ?? 'لم يتم تحديد الكلية بعد'}</span>
              <Building2 size={16} className={styles.contactIcon} />
            </div>
            <div className={styles.contactRow}>
              <span>الفرقة الدراسية: {profile?.year}</span>
              <GraduationCap size={16} className={styles.contactIcon} />
            </div>
          </div>
        </div>
        
        {/* Profile Avatar */}
        <div className={styles.idCardIcon}>
          <User size={80} />
        </div>
      </div>

      {/* Action Button */}
      <div className={styles.actionBtnWrapper}>
        <button className={`${styles.actionBtn} ${styles.studentIdOpenButton}`} onClick={() => setIsStudentCardOpen(true)}>
          <CreditCard size={19} />
          <span>عرض بطاقة الطالب</span>
        </button>
      </div>

      {isStudentCardOpen && (
        <div className={styles.studentCardOverlay} onClick={() => setIsStudentCardOpen(false)}>
          <section className={styles.studentCardModal} role="dialog" aria-modal="true" aria-labelledby="student-card-title" onClick={(event) => event.stopPropagation()}>
            <button className={styles.studentCardClose} type="button" aria-label="إغلاق البطاقة" onClick={() => setIsStudentCardOpen(false)}><X size={20} /></button>
            <article className={styles.studentIdCard} dir="rtl">
              <div className={styles.studentCardPattern} aria-hidden="true" />
              <header className={styles.studentCardBrand}>
                <Image src="/bua-logo.png" alt="شعار منصة جمعتهالك" width={94} height={94} className={styles.studentCardLogo} />
                <div><small>بياناتك الأكاديمية ومعرّفك داخل المنصة</small><h2 id="student-card-title">بطاقتك على جمعتهالك</h2></div>
              </header>
              <div className={styles.studentCardBody}>
                <Image src="/images/student-avatar.svg" alt="الصورة الموحدة للطلاب" width={96} height={96} className={styles.studentCardAvatar} />
                <div className={styles.studentCardFields}>
                  <div className={styles.studentCardName}><span>الاسم</span><b>{profile?.full_name || 'الطالب'}</b></div>
                  <div className={styles.studentCardField}><span>الكلية والفرقة</span><b>{faculty?.name_ar || 'غير محددة'} · الفرقة {yearLabel}</b></div>
                  <div className={`${styles.studentCardField} ${styles.studentCardNumber}`}>
                    <span>معرّف الطالب داخل المنصة</span>
                    <div className={styles.studentCardIdRow}>
                      <code dir="ltr">{profile?.student_id || 'بانتظار تفعيل المعرّف'}</code>
                      {profile?.student_id && <button type="button" aria-label="نسخ معرف الطالب" onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(profile.student_id);
                          showCopyToast('تم نسخ معرف الطالب', 'success');
                        } catch {
                          showCopyToast('تعذر النسخ، انسخ المعرّف يدويًا من البطاقة.', 'error');
                        }
                      }}><Copy size={15} /></button>}
                    </div>
                  </div>
                </div>
              </div>
              <footer className={styles.studentCardFooter} aria-hidden="true"><span className={styles.studentCardBarcode} /><span className={styles.studentCardChip} /></footer>
            </article>
          </section>
        </div>
      )}

      {/* Divider */}
      <div className={styles.divider}></div>

      {/* Statistics Section */}
      <div className={styles.statsHeader}>
        <Star size={24} className={styles.starIcon} />
        <h2 className={styles.statsTitle}>ملخص الأداء الأكاديمي</h2>
        <Star size={24} className={styles.starIcon} />
      </div>

      <div className={styles.statsGrid}>
        
        {/* Stat 1: GPA */}
        <div className={styles.statItem}>
          <div className={styles.progressCircle} style={{ '--p-color': gpaBadge.color, '--p-deg': `${(gpa / 4.0) * 360}deg` } as React.CSSProperties}>
            <div className={styles.progressCircleInner}>
              <span className={styles.progressValue}>{displayLoadingStats ? '-' : gpa.toFixed(2)}</span>
              <span className={styles.progressSub}>CGPA</span>
            </div>
          </div>
          <span className={styles.statLabel}>المعدل التراكمي (CGPA)</span>
          <span className={styles.statBadge} style={{ '--p-color': gpaBadge.color } as React.CSSProperties}>{gpaBadge.text}</span>
        </div>

        {/* Stat 2: Summer Courses */}
        <div className={styles.statItem}>
          <div className={styles.progressCircle} style={{ '--p-color': '#f59e0b', '--p-deg': summerCourses > 0 ? '360deg' : '0deg' } as React.CSSProperties}>
            <div className={styles.progressCircleInner}>
              <span className={styles.progressValue}>{displayLoadingStats ? '-' : summerCourses}</span>
              <span className={styles.progressSub}>مادة</span>
            </div>
          </div>
          <span className={styles.statLabel}>مواد السمر</span>
          <span className={styles.statBadge} style={{ '--p-color': '#f59e0b' } as React.CSSProperties}>{displayLoadingStats ? '—' : summerCourses > 0 ? 'يوجد' : 'لا يوجد'}</span>
        </div>

        {/* Stat 3: Completed Hours */}
        <div className={styles.statItem}>
          <div className={styles.progressCircle} style={{ '--p-color': '#10b981', '--p-deg': `${Math.min((completedHours / totalRequiredHours) * 360, 360)}deg` } as React.CSSProperties}>
            <div className={styles.progressCircleInner}>
              <span className={styles.progressValue}>{displayLoadingStats ? '-' : completedHours}</span>
              <span className={styles.progressSub}>من {totalRequiredHours}</span>
            </div>
          </div>
          <span className={styles.statLabel}>الساعات المكتملة</span>
          <span className={styles.statBadge} style={{ '--p-color': '#10b981' } as React.CSSProperties}>إجمالي</span>
        </div>

      </div>
      {copyToast && typeof document !== 'undefined' && createPortal(
        <div className={toastStyles.toastContainer}>
          <div key={copyToast.id} className={`${toastStyles.toastifyToast} ${copyToast.type === 'error' ? toastStyles.toastError : toastStyles.toastSuccess}`} onClick={() => setCopyToast(null)} role="status" aria-live="polite">
            <div className={toastStyles.toastBody}><div>{copyToast.message}</div></div>
            <button className={toastStyles.toastClose} type="button" onClick={(event) => { event.stopPropagation(); setCopyToast(null); }} aria-label="إغلاق الإشعار">
              <svg aria-hidden="true" viewBox="0 0 14 16"><path fillRule="evenodd" d="M7.71 8.23l3.75 3.75-1.48 1.48-3.75-3.75-3.75 3.75L1 11.98l3.75-3.75L1 4.48 2.48 3l3.75 3.75L9.98 3l1.48 1.48z" /></svg>
            </button>
            <div className={toastStyles.toastProgress} style={{ animationDuration: '2400ms' }} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
