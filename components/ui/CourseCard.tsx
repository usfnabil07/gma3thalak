import { Calendar, Clock, UserRound } from 'lucide-react';
import Image from 'next/image';
import styles from './CourseCard.module.css';
import { Course } from '@/types';
import { FALLBACKS } from '@/constants/config';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'غير محدد';
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

export default function CourseCard({ course, onClick }: CourseCardProps) {
  return (
    <div className={styles.group}>
      <div className={styles.imageWrapper}>
        <Image 
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={course.image_url || FALLBACKS.COURSE_IMAGE}
          alt={course.name_ar} 
          className={styles.courseImage} 
          onError={(e) => {
             (e.currentTarget as HTMLImageElement).srcset = '';
             (e.currentTarget as HTMLImageElement).src = FALLBACKS.COURSE_IMAGE;
          }}
        />
        {course.access_status === 'transferred' ? (
          <div className={styles.ribbonTransferred}>مادة محولة</div>
        ) : course.access_status === 'basic' || (course.access_status === undefined && course.is_core !== false) ? (
          <div className={styles.ribbon}>مادة أساسية</div>
        ) : (
          <div className={styles.ribbonNonCore}>مادة غير مضافة</div>
        )}
      </div>
      
      <div className={styles.infoWrapper}>
        <div className={styles.infoBox}>
          <div className={styles.infoTop}>
            <div className={styles.infoRight}>
              <h3 className={styles.courseTitle}>{course.name_ar}</h3>
              <div className={styles.titleDivider}></div>
              <div className={styles.courseDesc}>
                {course.description
                  ? course.description.split('\n').map((p, idx) => (
                      <span key={idx}>{p}<br/></span>
                    ))
                  : <span style={{ opacity: 0.5, fontStyle: 'italic' }}>لم يتم إضافة وصف لهذه المادة</span>
                }
              </div>
            </div>
            
            <div className={styles.infoLeft}>
              <button className={styles.enterBtn} onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}>
                الدخول للمادة
              </button>
              <div className={styles.freeBtn}>
                {course.credit_hours ? `${course.credit_hours} ساعات معتمدة` : 'مادة دراسية'}
              </div>
            </div>
          </div>

          <div className={styles.bottomSection}>
            <div className={styles.dividerWrapper}>
              <div className={styles.divider} />
            </div>

            <div className={styles.bottomFlex}>
              <div className={styles.bottomBadge}>
                <div className={styles.gradientBadge}>الفصل الدراسي: {course.semester}</div>
                {course.doctor_name && (
                  <div className={styles.doctorBadge}>
                    <UserRound size={13} />
                    {course.doctor_name}
                  </div>
                )}
              </div>

              <div className={styles.datesArea}>
                <div className={styles.dateRow}>
                  <Calendar size={14} className={styles.dateIcon} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>إضافة: <span style={{ direction: 'ltr', display: 'inline-block' }}>{formatDate(course.created_at)}</span></span>
                </div>
                <div className={styles.dateRow}>
                  <Clock size={14} className={styles.dateIcon} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>تعديل: <span style={{ direction: 'ltr', display: 'inline-block' }}>{formatDate(course.updated_at || course.created_at)}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
