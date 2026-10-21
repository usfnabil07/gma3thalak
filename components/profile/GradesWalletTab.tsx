import { useState, useEffect } from 'react';
import { BookText, Plus, CheckSquare, Square, ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { gradingSchemas } from '@/lib/gradingSchemas';
import { getFacultyKey } from '@/components/profile/GPATab';
import { getCourses } from '@/services/supabase/data';
import { Course } from '@/types';
import Swal from 'sweetalert2';
import styles from './GradesWalletTab.module.css';
import profileStyles from '@/app/profile/page.module.css';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

export interface AssessmentItem {
  id: string;
  name: string;
  type: 'Quiz' | 'Midterm' | 'Final' | 'Project' | 'Assignment' | 'Other';
  maxScore: number;
  achievedScore: number;
  deadline?: string;
  isCompleted?: boolean;
}

export interface WalletCourse {
  id: string;
  courseId?: string;
  name: string;
  maxScore: number;
  creditHours?: number;
  semester?: 1 | 2;
  assessments: AssessmentItem[];
}

export default function GradesWalletTab() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<WalletCourse[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.user_id || !profile.faculty_id || !profile.year) return;

    let cancelled = false;
    const loadWallet = async () => {
      let savedCourses: WalletCourse[] = [];
      const saved = readAccountStorage('bua_grades_wallet_data', profile.user_id);

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

      const syncedCourses = officialCourses.map((course: Course): WalletCourse => {
        const existing = savedCourses.find(item =>
          item.courseId === course.id ||
          (!item.courseId && item.name.trim() === course.name_ar.trim())
        );

        return {
          id: existing?.id ?? course.id,
          courseId: course.id,
          name: course.name_ar,
          maxScore: existing?.maxScore ?? 100,
          creditHours: course.credit_hours,
          semester: course.semester,
          assessments: existing?.assessments ?? []
        };
      });

      const legacyCourses = savedCourses.filter(course =>
        !course.courseId && !officialCourses.some(item => item.name_ar.trim() === course.name.trim())
      );

      setCourses([...syncedCourses, ...legacyCourses]);
      setIsLoaded(true);
      setLoadedForUserId(profile.user_id);
    };

    loadWallet();
    return () => {
      cancelled = true;
    };
  }, [profile?.user_id, profile?.faculty_id, profile?.year]);

  useEffect(() => {
    if (isLoaded && loadedForUserId && loadedForUserId === profile?.user_id) {
      writeAccountStorage('bua_grades_wallet_data', profile?.user_id, JSON.stringify(courses));
    }
  }, [courses, isLoaded, loadedForUserId, profile?.user_id]);

  const openAssessmentModal = async (courseId: string) => {
    const { value } = await Swal.fire({
      title: 'إضافة تقييم',
      html: `
        <div class="gradesAssessmentFields" dir="rtl">
          <label for="grades-assessment-name">اسم التقييم</label>
          <input id="grades-assessment-name" class="swal2-input" maxlength="100" placeholder="مثال: كويز 1 أو مشروع المادة">
          <label for="grades-assessment-type">نوع التقييم</label>
          <select id="grades-assessment-type" class="swal2-select">
            <option value="Quiz">كويز</option>
            <option value="Midterm">ميدتيرم</option>
            <option value="Final">فاينال</option>
            <option value="Project">مشروع</option>
            <option value="Assignment">تكليف</option>
            <option value="Other">أخرى</option>
          </select>
          <div class="gradesAssessmentScoreGrid">
            <div><label for="grades-assessment-max">الدرجة العظمى</label><input id="grades-assessment-max" class="swal2-input" type="number" min="1" step="any" value="10"></div>
            <div><label for="grades-assessment-score">درجتك أو الدرجة المتوقعة</label><input id="grades-assessment-score" class="swal2-input" type="number" min="0" step="any" value="0"></div>
          </div>
          <p>تقدر تعدّل الدرجة أو تؤكدها بعد ظهور النتيجة.</p>
        </div>
      `,
      customClass: { popup: 'gradesAssessmentPopup' },
      showCancelButton: true,
      confirmButtonText: 'إضافة التقييم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0ea5e9',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('grades-assessment-name') as HTMLInputElement).value.trim();
        const type = (document.getElementById('grades-assessment-type') as HTMLSelectElement).value as AssessmentItem['type'];
        const maxInput = (document.getElementById('grades-assessment-max') as HTMLInputElement).value;
        const scoreInput = (document.getElementById('grades-assessment-score') as HTMLInputElement).value;
        const maxScore = Number(maxInput);
        const achievedScore = Number(scoreInput);

        if (!name) {
          Swal.showValidationMessage('اكتب اسم التقييم أولًا.');
          return false;
        }
        if (!maxInput || !Number.isFinite(maxScore) || maxScore <= 0) {
          Swal.showValidationMessage('أدخل درجة عظمى أكبر من صفر.');
          return false;
        }
        if (!scoreInput || !Number.isFinite(achievedScore) || achievedScore < 0 || achievedScore > maxScore) {
          Swal.showValidationMessage('يجب أن تكون الدرجة بين صفر والدرجة العظمى.');
          return false;
        }

        return { name, type, maxScore, achievedScore };
      },
    });

    if (!value) return;
    const newItem: AssessmentItem = {
      id: Date.now().toString(),
      name: value.name,
      type: value.type,
      maxScore: value.maxScore,
      achievedScore: value.achievedScore,
      isCompleted: false,
    };
    setCourses(current => current.map(course => course.id === courseId
      ? { ...course, assessments: [...course.assessments, newItem] }
      : course));
  };

  const updateCourseMaxScore = async (courseId: string, currentMax: number) => {
    const course = courses.find(item => item.id === courseId);
    if (!course) return;
    const minimumMax = course.assessments.reduce((total, item) => total + item.maxScore, 0);
    const { value: newMax } = await Swal.fire({
      title: 'تعديل الدرجة النهائية للمادة',
      input: 'number',
      inputLabel: 'الدرجة النهائية',
      inputValue: currentMax,
      inputAttributes: { min: String(Math.max(1, minimumMax)), step: 'any' },
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0ea5e9',
      customClass: { popup: 'alwaysLightAlert' },
      inputValidator: (value) => {
        const score = Number(value);
        if (value === '' || !Number.isFinite(score) || score <= 0) return 'أدخل درجة نهائية أكبر من صفر.';
        if (score < minimumMax) return `لا يمكن أن تقل الدرجة النهائية عن مجموع درجات التقييمات (${minimumMax}).`;
      },
    });

    if (newMax !== undefined && newMax !== null && newMax !== '') {
      setCourses(current => current.map(item => item.id === courseId ? { ...item, maxScore: Number(newMax) } : item));
    }
  };

  const deleteAssessment = async (courseId: string, assId: string) => {
    const { isConfirmed } = await Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل أنت متأكد من حذف هذا التقييم؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444',
    });

    if (isConfirmed) {
      setCourses(current => current.map(course => course.id === courseId
        ? { ...course, assessments: course.assessments.filter(item => item.id !== assId) }
        : course));
    }
  };

  const updateAssessmentScore = (courseId: string, assessmentId: string, score: number) => {
    setCourses(current => current.map(course => course.id === courseId
      ? { ...course, assessments: course.assessments.map(item => item.id === assessmentId ? { ...item, achievedScore: score } : item) }
      : course));
  };

  const updateAssessmentScorePrompt = async (courseId: string, ass: AssessmentItem) => {
    if (ass.isCompleted) return;
    const { value: newScore } = await Swal.fire({
      title: `تعديل درجة ${ass.name}`,
      input: 'number',
      inputLabel: `الدرجة من ${ass.maxScore}`,
      inputValue: ass.achievedScore,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0ea5e9',
      inputValidator: (value) => {
        if (value === '' || Number(value) < 0 || Number(value) > ass.maxScore) {
          return `يجب إدخال درجة بين 0 و ${ass.maxScore}`;
        }
      }
    });

    if (newScore !== undefined && newScore !== null && newScore !== "") {
      updateAssessmentScore(courseId, ass.id, Number(newScore));
    }
  };

  const toggleAssessmentCompletion = (courseId: string, assId: string) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          assessments: c.assessments.map(a => 
            a.id === assId ? { ...a, isCompleted: !a.isCompleted } : a
          )
        };
      }
      return c;
    }));
  };

  // Helper to predict grade letter
  const getPredictedGrade = (totalPredictedScore: number, courseMax: number) => {
    if (!profile?.faculty?.name_ar) return '?';
    const schemaKey = getFacultyKey(profile.faculty.name_ar);
    const schema = (gradingSchemas as any)[schemaKey];
    if (!schema) return '?';

    // Normalize score to 100% for the schema calculation
    const percentage = (totalPredictedScore / courseMax) * 100;
    const stats = schema.calculateCourseStats(percentage);
    return stats.letter;
  };

  // Global Stats
  if (!isLoaded || loadedForUserId !== profile?.user_id) return null;

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader}>
        <div className={profileStyles.headerIcon}>
          <BookText size={20} />
        </div>
        <h2 className={profileStyles.sectionHeaderTitle}>حافظة الدرجات</h2>
      </div>

      <div className={styles.walletOverview}>
        <div className={styles.overviewIntro}>
          <div className={styles.overviewIcon}><ClipboardList size={22} /></div>
          <div>
            <h3>تابع درجاتك اول باول</h3>
            <p>أضف تقييمات كل مادة واعرف مستواك الحالي وما يمكنك تحقيقه.</p>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><BookText size={28} /></div>
          <h3>ابدأ بحفظة درجاتك</h3>
          <p>أضف أول مادة، ثم سجل الكويزات والميدتيرم والفاينال لمتابعة نتيجتك.</p>
        </div>
      ) : (
      <div className={styles.grid}>
        {courses.map(course => {
          let gained = 0;
          let assessedMax = 0;
          
          course.assessments.forEach(a => {
            gained += a.achievedScore;
            assessedMax += a.maxScore;
          });
          
          const lost = assessedMax - gained;
          const remainingToAssess = course.maxScore - assessedMax;
          const optimisticTotal = gained + remainingToAssess; // Assuming full marks on remaining
          const predictedLetter = getPredictedGrade(optimisticTotal, course.maxScore);

          const gainedPercent = course.maxScore > 0 ? (gained / course.maxScore) * 100 : 0;
          const lostPercent = course.maxScore > 0 ? (lost / course.maxScore) * 100 : 0;

          return (
            <div key={course.id} className={styles.card}>
              <div className={styles.courseCover}>
                <div className={styles.coverPattern} />
                <div className={styles.cardHeader}>
                  <div className={styles.courseHeading}>
                    <div className={styles.courseBadge}><BookText size={18} strokeWidth={1.8} /></div>
                    <div className={styles.courseNameWrap}>
                      <div className={styles.courseInput}>{course.name}</div>
                      <span>{course.assessments.length} تقييمات مسجلة</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.courseMeta}>
                <div className={styles.limitContainer}>
                  <span className={styles.limitLabel}>الدرجة النهائية للمادة</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <strong className={styles.courseDetails}>
                      {course.maxScore} درجة
                    </strong>
                    <button className={styles.iconBtn} onClick={() => updateCourseMaxScore(course.id, course.maxScore)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }} title="تعديل الدرجة النهائية">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.courseOutcome}>
                  <span>التقدير المتوقع</span>
                  <strong>{predictedLetter}</strong>
                </div>
                </div>

                <div className={styles.progressSection}>
                <div className={styles.progressInfo}>
                  <div>
                    <span className={styles.progressTitle}>تقدم المادة</span>
                    <span className={styles.progressSubtitle}>{assessedMax.toFixed(1)} من {course.maxScore} درجة مسجلة</span>
                  </div>
                  <strong>{gainedPercent.toFixed(0)}%</strong>
                </div>
                <div className={styles.progressBarWrapper}>
                  <div className={styles.progressGained} style={{ width: `${gainedPercent}%` }} title={`مكتسب: ${gainedPercent.toFixed(1)}%`} />
                  <div className={styles.progressLost} style={{ width: `${lostPercent}%` }} title={`مفقود: ${lostPercent.toFixed(1)}%`} />
                </div>
                <div className={styles.progressLegend}>
                  <span className={styles.legendItem}><i className={styles.legendGained} /> مكتسب {gained.toFixed(1)}</span>
                  <span className={`${styles.legendItem} ${styles.legendItemLost}`}><i className={styles.legendLost} /> مفقود {lost.toFixed(1)}</span>
                  <span className={`${styles.legendItem} ${styles.legendItemPending}`}><i className={styles.legendRemaining} /> غير مؤكد {remainingToAssess.toFixed(1)}</span>
                </div>
                </div>

                <div className={styles.assessmentsHeading}>
                <div>
                  <h4>التقييمات</h4>
                  <span>سجل درجاتك وتابع ما تم إنجازه</span>
                </div>
                <span>{course.assessments.length} عناصر</span>
                </div>

                <div className={styles.assessmentsList}>
                {course.assessments.length === 0 ? (
                  <div className={styles.emptyAssessments}>
                    <ClipboardList size={18} />
                    <span>لا توجد تقييمات مضافة لهذه المادة</span>
                  </div>
                ) : (
                  course.assessments.map(ass => {
                    const isCompleted = ass.isCompleted;

                    return (
                      <div key={ass.id} className={`${styles.assessmentItem} ${isCompleted ? styles.completed : ''}`}>
                        <div className={styles.assessmentInfo}>
                          <button 
                            className={`${styles.checkboxBtn} ${isCompleted ? styles.completed : ''}`}
                            onClick={() => toggleAssessmentCompletion(course.id, ass.id)}
                            title={isCompleted ? "إلغاء تأكيد الدرجة لتعديلها" : "تأكيد أن الدرجة أصبحت فعلية"}
                          >
                            {isCompleted ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          <div className={styles.assessmentDetails}>
                            <div className={styles.assessmentNameRow}>
                              <p className={styles.assessmentName}>{ass.name}</p>
                              <span className={`${styles.statusBadge} ${isCompleted ? styles.statusConfirmed : styles.statusExpected}`}>
                                {isCompleted ? 'مؤكد' : 'متوقع'}
                              </span>
                            </div>
                            <p className={styles.assessmentType}>{ass.type}</p>
                          </div>
                        </div>
                        <div className={styles.assessmentScoreWrapper}>
                          <div className={styles.assessmentScore} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                              <span style={{ color: isCompleted ? 'var(--text-dark)' : 'var(--secondary)' }}>{ass.achievedScore}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>/ {ass.maxScore}</span>
                            </div>
                            {!isCompleted && (
                              <button 
                                className={styles.iconBtn} 
                                onClick={() => updateAssessmentScorePrompt(course.id, ass)} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }} 
                                title="تعديل الدرجة"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                          <button 
                            className={styles.iconBtn} 
                            onClick={() => deleteAssessment(course.id, ass.id)} 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }} 
                            title="حذف التقييم"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>

                <button className={`btn btn-primary ${styles.addBtnSmall}`} onClick={() => openAssessmentModal(course.id)}>
                  <Plus size={16} /> إضافة تقييم
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

    </div>
  );
}
