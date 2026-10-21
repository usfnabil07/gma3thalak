import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, Save, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Info, GraduationCap, BookOpen, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import styles from './GPATab.module.css';
import profileStyles from '@/app/profile/page.module.css';
import { gradingSchemas } from '@/lib/gradingSchemas';
import Swal from 'sweetalert2';
import { STORAGE_KEYS } from '@/constants/config';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

interface CourseGrade {
  id: string;
  name: string;
  credits: number;
  scoreInput: string; // can be "95" or "A+"
  courseType?: string;
}

interface SemesterData {
  id: string;
  title: string;
  courses: CourseGrade[];
  isExpanded: boolean;
  year?: number;
  term?: 1 | 2;
}

export const getFacultyKey = (facultyNameAr?: string) => {
  if (!facultyNameAr) return 'BIO';
  const name = facultyNameAr;
  if (name.includes('حيوي') || name.includes('BIO')) return 'BIO';
  if (name.includes('أسنان') || name.includes('اسنان')) return 'DENTISTRY';
  if (name.includes('طبيعي')) return 'PHYSICAL_THERAPY';
  if (name.includes('تمريض')) return 'NURSING';
  if (name.includes('فنون')) return 'APPLIED_ARTS';
  if (name.includes('بيطري')) return 'VETERINARY';
  if (name.includes('صيدلة')) return 'PHARMACY';
  if (name.includes('علوم') && name.includes('تطبيقية')) return 'APPLIED_SCIENCE';
  if (name.includes('أعمال') || name.includes('اعمال') || name.includes('Business')) return 'BUSINESS';
  if (name.includes('حقوق')) return 'LAW';
  if (name.includes('ذكاء')) return 'AI';
  return 'BIO'; // default
};

export default function GPATab({ faculty }: { faculty?: { name_ar: string } }) {
  const { profile } = useAuth();
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [manualSummerCourses, setManualSummerCourses] = useState('0');

  // Safely get the grading schema key using the provided faculty prop or profile fallback
  const facultyId = getFacultyKey(faculty?.name_ar || profile?.faculty?.name_ar);

  // Load from local storage
  useEffect(() => {
    if (!profile?.user_id) return;
    setIsClient(false);
    setSemesters([{
      id: Date.now().toString(),
      title: 'الترم الأول',
      courses: [],
      isExpanded: true,
      year: 1,
      term: 1,
    }]);
    const saved = readAccountStorage(STORAGE_KEYS.GPA_DATA, profile.user_id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.semesters) {
          setSemesters(parsed.semesters.map((semester: SemesterData, index: number) => ({
            ...semester,
            year: semester.year || Math.floor(index / 2) + 1,
            term: semester.term || (index % 2 === 0 ? 1 : 2),
          })));
        }
      } catch (e) {

      }
    } else {
      // Default empty state with one semester
      setSemesters([{
        id: Date.now().toString(),
        title: 'الترم الأول',
        courses: [],
        isExpanded: true,
        year: 1,
        term: 1
      }]);
    }
    // Load manual summer courses
    const storedSummer = readAccountStorage('bua_manual_summer_courses', profile.user_id);
    if (storedSummer) setManualSummerCourses(storedSummer);
    else setManualSummerCourses('0');
    setIsClient(true);
    setLoadedForUserId(profile.user_id);
  }, [profile?.user_id]);

  // Save to local storage
  useEffect(() => {
    if (isClient && loadedForUserId && loadedForUserId === profile?.user_id) {
      writeAccountStorage(STORAGE_KEYS.GPA_DATA, profile?.user_id, JSON.stringify({ semesters }));
    }
  }, [semesters, isClient, loadedForUserId, profile?.user_id]);

  const addSemester = () => {
    const nextIndex = semesters.length;
    setSemesters([...semesters, {
      id: Date.now().toString(),
      title: `السنة ${Math.floor(nextIndex / 2) + 1} - الترم ${nextIndex % 2 === 0 ? 1 : 2}`,
      courses: [],
      isExpanded: true,
      year: Math.floor(nextIndex / 2) + 1,
      term: nextIndex % 2 === 0 ? 1 : 2
    }]);
  };

  const removeSemester = (id: string) => {
    Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل أنت متأكد من حذف هذا الترم بكل مواده؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        setSemesters(semesters => semesters.filter(s => s.id !== id));
      }
    });
  };

  const toggleSemester = (id: string) => {
    setSemesters(semesters.map(s => 
      s.id === id ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const updateSemesterTitle = (id: string, title: string) => {
    setSemesters(semesters.map(s => 
      s.id === id ? { ...s, title } : s
    ));
  };

  const addCourse = (semesterId: string) => {
    const schema = gradingSchemas[facultyId];
    const defaultCourseType = schema.courseTypes ? schema.courseTypes[0].id : undefined;

    setSemesters(semesters.map(s => {
      if (s.id === semesterId) {
        return {
          ...s,
          courses: [...s.courses, {
            id: Date.now().toString(),
            name: '',
            credits: 3,
            scoreInput: '',
            courseType: defaultCourseType
          }]
        };
      }
      return s;
    }));
  };

  const updateCourse = (semesterId: string, courseId: string, field: keyof CourseGrade, value: any) => {
    setSemesters(semesters.map(s => {
      if (s.id === semesterId) {
        return {
          ...s,
          courses: s.courses.map(c => c.id === courseId ? { ...c, [field]: value } : c)
        };
      }
      return s;
    }));
  };

  const removeCourse = (semesterId: string, courseId: string) => {
    setSemesters(semesters.map(s => {
      if (s.id === semesterId) {
        return {
          ...s,
          courses: s.courses.filter(c => c.id !== courseId)
        };
      }
      return s;
    }));
  };

  // Helper to parse the input score
  const getCourseStats = (course: CourseGrade) => {
    const { scoreInput, courseType } = course;
    if (!scoreInput.trim()) return { points: 0, letter: '-' };
    
    // Check if it's a number
    const num = parseFloat(scoreInput);
    const schemaKey = getFacultyKey(profile?.faculty?.name_ar);
    const schema = (gradingSchemas as any)[schemaKey];
    
    if (!isNaN(num)) {
      return schema.calculateCourseStats(num, courseType);
    } else {
      return schema.calculateCourseStats(scoreInput.toUpperCase().trim(), courseType);
    }
  };

  const calculateSemesterGPA = (courses: CourseGrade[]) => {
    let totalPoints = 0;
    let totalCredits = 0;
    let passedCredits = 0;
    
    courses.forEach(c => {
      if (c.scoreInput) {
        const stats = getCourseStats(c);
        totalPoints += stats.points * c.credits;
        totalCredits += c.credits;
        
        const isFail = stats.letter === 'F' || stats.letter === 'FW' || stats.letter === 'W' || stats.points === 0;
        if (!isFail) {
          passedCredits += c.credits;
        }
      }
    });

    return {
       gpa: totalCredits === 0 ? 0 : totalPoints / totalCredits,
       totalCredits,
       passedCredits
    };
  };

  const calculateCGPA = useCallback(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    let passedCredits = 0;

    semesters.forEach(s => {
      s.courses.forEach(c => {
        if (c.scoreInput) {
          const stats = getCourseStats(c);
          totalPoints += stats.points * c.credits;
          totalCredits += c.credits;
          
          const isFail = stats.letter === 'F' || stats.letter === 'FW' || stats.letter === 'W' || stats.points === 0;
          if (!isFail) {
            passedCredits += c.credits;
          }
        }
      });
    });

    return {
      cgpa: totalCredits === 0 ? 0 : totalPoints / totalCredits,
      totalCredits,
      passedCredits
    };
  }, [semesters]);

  const { cgpa, totalCredits, passedCredits } = useMemo(() => calculateCGPA(), [calculateCGPA]);
  const gpaProgress = Math.min(Math.max(cgpa / 4, 0), 1) * 100;
  const gpaStatus = cgpa >= 3.4
    ? 'امتياز'
    : cgpa >= 2.8
      ? 'جيد جداً'
      : cgpa >= 2.4
        ? 'جيد'
        : cgpa >= 2
          ? 'مقبول'
          : 'لم يُحتسب بعد';

  if (!isClient || loadedForUserId !== profile?.user_id) return null;

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={profileStyles.headerIcon}>
            <Calculator size={20} />
          </div>
          <h2 className={profileStyles.sectionHeaderTitle}>النتائج التراكمية (CGPA)</h2>
        </div>
      </div>

      <div className={styles.gpaHero}>
        <div className={styles.gpaLead}>
          <div className={styles.gpaLeadCopy}>
            <h3>معدلك التراكمي</h3>
            <p>يتم تحديث النتيجة تلقائياً مع كل مادة تضيفها إلى سجلك الدراسي.</p>
            <div className={styles.gradeSummary}>
              <span className={styles.gradeLabel}>تقديرك الحالي</span>
              <strong className={styles.gradeValue}>{gpaStatus}</strong>
            </div>
          </div>
          <div className={styles.gpaScore}>
            <div className={styles.gpaCircleContainer}>
              <svg viewBox="0 0 36 36" className={styles.circularChart} role="img" aria-label={`المعدل التراكمي ${cgpa.toFixed(2)} من 4`}>
                <path className={styles.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={styles.circle} strokeDasharray={`${gpaProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className={styles.gpaInfo}>
                <span className={styles.gpaValue}>{cgpa.toFixed(2)}</span>
                <span className={styles.gpaLabel}>من 4.00</span>
              </div>
            </div>
          </div>
          <div className={styles.gpaScale}>
            <div className={styles.scaleTrack}>
              <span style={{ width: `${gpaProgress}%` }} />
            </div>
            <div className={styles.scaleLabels}>
              <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span>
            </div>
          </div>
        </div>

        <div className={styles.gpaStats}>
          <div className={`${styles.statBox} ${styles.statBoxPrimary}`}>
            <div className={styles.statIcon}><GraduationCap size={20} /></div>
            <div className={styles.statTexts}>
              <span className={styles.statName}>الساعات المكتملة</span>
              <span className={styles.statVal}>{passedCredits}</span>
            </div>
            <span className={styles.statUnit}>ساعة</span>
          </div>
          <div className={`${styles.statBox} ${styles.summerBox}`}>
            <div className={styles.statIcon}><BookOpen size={20} /></div>
            <div className={styles.statTexts}>
              <span className={styles.statName}>مواد السمر الإضافية</span>
              <span className={styles.statHelper}>محولة من جامعة أخرى</span>
            </div>
            <div className={styles.counter}>
              <button
                className={styles.counterButton}
                onClick={() => {
                  const newVal = Math.max(0, parseInt(manualSummerCourses || '0') - 1).toString();
                  setManualSummerCourses(newVal);
                  writeAccountStorage('bua_manual_summer_courses', profile?.user_id, newVal);
                }}
              >−</button>
              <span className={styles.counterValue}>{manualSummerCourses || '0'}</span>
              <button
                className={styles.counterButton}
                onClick={() => {
                  const newVal = (parseInt(manualSummerCourses || '0') + 1).toString();
                  setManualSummerCourses(newVal);
                  writeAccountStorage('bua_manual_summer_courses', profile?.user_id, newVal);
                }}
              >+</button>
            </div>
          </div>
          <div className={styles.gradingNote}>
            <span className={styles.gradingIcon}><Award size={16} /></span>
            <span className={styles.gradingText}>
              <small>اللائحة المتبعة</small>
              <strong>{gradingSchemas[facultyId].name}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.semestersContainer}>
        {semesters.map((semester) => {
          const semesterStats = calculateSemesterGPA(semester.courses);
          const semesterCredits = semesterStats.totalCredits;
          const currentSchema = gradingSchemas[facultyId];
          const semesterIndex = semesters.indexOf(semester);
          const semesterYear = semester.year || Math.floor(semesterIndex / 2) + 1;
          const semesterTerm = semester.term || (semesterIndex % 2 === 0 ? 1 : 2);

          return (
            <Fragment key={semester.id}>
              {semesterIndex % 2 === 0 && (
                <div className={styles.yearDivider}>
                  <span>السنة {semesterYear}</span>
                  <i />
                </div>
              )}
            <div className={styles.semesterCard}>
              <div className={styles.semesterHeader} onClick={() => toggleSemester(semester.id)}>
                <div className={styles.semesterTitleGroup} onClick={e => e.stopPropagation()}>
                  <div className={styles.semesterNumber}>
                    <span>السنة {semesterYear}</span>
                    <strong>الترم {semesterTerm === 1 ? 'الأول' : 'الثاني'}</strong>
                  </div>
                  <span className={styles.semesterGpaBadge}>
                    GPA: {semesterStats.gpa.toFixed(2)} | {semesterCredits} ساعات
                  </span>
                </div>
                <div className={styles.semesterActions}>
                  <button className={styles.iconBtnDanger} onClick={(e) => { e.stopPropagation(); removeSemester(semester.id); }}>
                    <Trash2 size={16} />
                  </button>
                  {semester.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {semester.isExpanded && (
                <div className={styles.semesterBody}>
                  {semester.courses.length > 0 ? (
                    <table className={styles.coursesTable}>
                      <thead>
                        <tr>
                          <th>اسم المادة</th>
                          <th style={{ width: '80px' }}>الساعات</th>
                          <th style={{ width: '140px' }}>النتيجة (٪ أو رمز)</th>
                          <th style={{ width: '120px' }}>النقاط (الرمز)</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {semester.courses.map(course => {
                          const stats = getCourseStats(course);
                          return (
                          <tr key={course.id}>
                            <td data-label="اسم المادة">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input 
                                  type="text" 
                                  placeholder="اسم المادة..." 
                                  value={course.name}
                                  onChange={(e) => updateCourse(semester.id, course.id, 'name', e.target.value)}
                                  className={styles.tableInput}
                                />
                                {currentSchema.courseTypes && (
                                  <select 
                                    className={styles.tableSelect} 
                                    style={{ fontSize: '0.8rem', padding: '6px' }}
                                    value={course.courseType || currentSchema.courseTypes[0].id}
                                    onChange={(e) => updateCourse(semester.id, course.id, 'courseType', e.target.value)}
                                  >
                                    {currentSchema.courseTypes.map(ct => (
                                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                            <td data-label="الساعات">
                              <input 
                                type="number" 
                                min="1" max="6"
                                value={course.credits}
                                onChange={(e) => updateCourse(semester.id, course.id, 'credits', Number(e.target.value))}
                                className={styles.tableInput}
                                style={{ textAlign: 'center' }}
                              />
                            </td>
                            <td data-label="النتيجة">
                              <input 
                                type="text" 
                                placeholder="مثال: 95 أو A" 
                                value={course.scoreInput}
                                onChange={(e) => updateCourse(semester.id, course.id, 'scoreInput', e.target.value)}
                                className={styles.tableInput}
                                style={{ textAlign: 'center' }}
                              />
                            </td>
                            <td data-label="النقاط">
                              <div className={styles.pointsDisplay}>
                                {course.scoreInput ? (
                                  <>
                                    <span className={styles.pointsNum}>{stats.points.toFixed(2)}</span>
                                    <span className={styles.pointsLetter}>{stats.letter}</span>
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                                )}
                              </div>
                            </td>
                            <td data-label="حذف">
                              <button 
                                className={styles.iconBtnDangerGhost} 
                                onClick={() => removeCourse(semester.id, course.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  ) : (
                    <p className={styles.emptyCourses}>لا توجد مواد مضافة في هذا الترم.</p>
                  )}
                  
                  <button className={styles.addCourseBtn} onClick={() => addCourse(semester.id)}>
                    <Plus size={16} /> إضافة مادة
                  </button>
                </div>
              )}
            </div>
            </Fragment>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={addSemester}>
        <Plus size={18} /> إضافة السنة {Math.floor(semesters.length / 2) + 1} - الترم {semesters.length % 2 === 0 ? 'الأول' : 'الثاني'}
      </button>
    </div>
  );
}
