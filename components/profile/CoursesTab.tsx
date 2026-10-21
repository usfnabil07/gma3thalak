import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import styles from '@/app/profile/page.module.css';
import materialStyles from '@/app/courses/page.module.css';
import CourseCard from '@/components/ui/CourseCard';
import InlineLoader from '@/components/ui/InlineLoader';
import { Course, Profile } from '@/types';
import { getCourses } from '@/services/supabase/data';

interface CoursesTabProps {
  profile: Profile;
}

export default function CoursesTab({ profile }: CoursesTabProps) {
  const [showGrid, setShowGrid] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showGrid) return;
    if (!profile.faculty_id || !profile.year || !profile.user_id) {
      setCourses([]);
      setHasLoaded(true);
      return;
    }

    let isCurrentRequest = true;
    setLoading(true);
    getCourses(profile.faculty_id, profile.year, profile.user_id)
      .then((data) => {
        if (isCurrentRequest) setCourses(data);
      })
      .catch(() => {
        if (isCurrentRequest) setCourses([]);
      })
      .finally(() => {
        if (isCurrentRequest) {
          setLoading(false);
          setHasLoaded(true);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [showGrid, profile.faculty_id, profile.year, profile.user_id]);

  return (
    <div className={styles.contentArea}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerIcon}>
          <BookOpen size={20} />
        </div>
        <h2 className={styles.sectionHeaderTitle}>المواد الدراسية</h2>
      </div>
      
      {!showGrid ? (
        <div className={styles.transparentBoxWrapper}>
          <button className={styles.transparentBox} type="button" onClick={() => setShowGrid(true)} aria-label="عرض المواد الدراسية">
            ...
          </button>
        </div>
      ) : loading || !hasLoaded ? (
        <InlineLoader text="جاري تجهيز موادك الدراسية..." />
      ) : courses.length === 0 ? (
        <div className={materialStyles.emptyCoursesState} style={{ marginTop: '32px' }}>
          <span className={materialStyles.emptyCoursesIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32">
              <circle cx="11" cy="8" r="1" fill="currentColor"></circle>
              <circle cx="11" cy="16" r="1" fill="currentColor"></circle>
              <circle cx="11" cy="24" r="1" fill="currentColor"></circle>
              <path fill="currentColor" d="M24 3H8a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h10v-2H8v-6h18V5a2 2 0 0 0-2-2m0 16H8v-6h16Zm0-8H8V5h16Z"></path>
              <path fill="currentColor" d="M29 24.415L27.586 23L25 25.587L22.414 23L21 24.415L23.586 27L21 29.586L22.414 31L25 28.414L27.586 31L29 29.586L26.414 27z"></path>
            </svg>
          </span>
          <span>سيتم إضافة موادك قريباً</span>
        </div>
      ) : (
        <div className={materialStyles.courseGrid} style={{ marginTop: '32px' }}>
          {courses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onClick={() => {
                // Navigate to materials page with the specific courseId
                window.location.href = `/courses?courseId=${course.id}`;
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
