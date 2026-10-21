import { Faculty, Course } from '@/types';

export function buildCoursesText(
  faculties: Faculty[] | null,
  allCourses: Course[] | null,
  coursesError: Error | null
): string {
  let text = `\n<COURSES_LIST>\n`;
  text += `<!-- DEBUG_INFO: FAC=${faculties?.length} CRS=${allCourses?.length} ERR=${coursesError?.message || 'none'} -->\n`;
  
  if (allCourses && allCourses.length > 0 && faculties && faculties.length > 0) {
    faculties.forEach((fac: Faculty) => {
      const facCourses = allCourses.filter((c: Course) => c.faculty_id === fac.id);
      if (facCourses.length > 0) {
        text += `- **${fac.name_ar}**:\n`;
        // Find unique years in this faculty's courses
        const years = Array.from(new Set(facCourses.map(c => c.year))).sort((a, b) => a - b);
        
        years.forEach((y) => {
          const yearCourses = facCourses.filter((c: Course) => c.year === y);
          if (yearCourses.length > 0) {
            text += `  - الفرقة ${y}:\n`;
            yearCourses.forEach((c: Course) => {
              text += `    * ${c.name_ar} (ترم ${c.semester} - ${c.credit_hours} ساعات${c.doctor_name ? ' | د. ' + c.doctor_name : ''})\n`;
            });
          }
        });
      }
    });
  } else {
    text += "لا توجد مواد مضافة في المنصة حتى الآن.\n";
  }
  text += `</COURSES_LIST>\n`;

  return text;
}
