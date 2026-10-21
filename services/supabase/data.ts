import { supabase } from './client';
import { Faculty, Course, Material, CourseSection, MaterialGroup } from '@/types';

export async function getFaculties(): Promise<Faculty[]> {
  const { data, error } = await supabase
    .from('faculties')
    .select('*')
    .order('name_ar');
    
  if (error) {

    return [];
  }
  
  return (data as Faculty[]) ?? [];
}

export async function getFacultyById(id: string): Promise<Faculty | null> {
  const { data } = await supabase
    .from('faculties')
    .select('*')
    .eq('id', id)
    .single();
  return (data as Faculty) ?? null;
}

export async function getCourses(
  facultyId: string,
  year: number,
  studentUserId?: string
): Promise<Course[]> {
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('faculty_id', facultyId)
    .eq('year', year)
    .eq('is_active', true)
    .order('semester');
  const courses = (data as Course[]) ?? [];
  if (!studentUserId) return courses.map((course) => ({ ...course, access_status: course.is_core === false ? 'not_added' as const : 'basic' as const }));

  const { data: accessRows } = await supabase
    .from('student_course_access')
    .select('course_id')
    .eq('student_id', studentUserId);
  const assignedIds = new Set((accessRows ?? []).map((row) => row.course_id));
  const visibleCourses = courses.map((course) => ({
    ...course,
    access_status: assignedIds.has(course.id) ? 'transferred' as const : course.is_core === false ? 'not_added' as const : 'basic' as const,
  }));
  const assignedCourseIds = [...assignedIds]
    .filter((courseId) => !courses.some((course) => course.id === courseId));
  if (assignedCourseIds.length === 0) return visibleCourses;

  const { data: assignedCourses } = await supabase
    .from('courses')
    .select('*')
    .in('id', assignedCourseIds)
    .eq('is_active', true)
    .order('semester');
  return [...visibleCourses, ...(((assignedCourses ?? []) as Course[]).map((course) => ({ ...course, access_status: 'transferred' as const })))];
}

export async function getMaterials(courseId: string): Promise<Material[]> {
  const { data } = await supabase
    .from('materials')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  return (data as Material[]) ?? [];
}

export async function getCourseSections(courseId: string): Promise<CourseSection[]> {
  const { data } = await supabase
    .from('course_sections')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');
  return (data as CourseSection[]) ?? [];
}

export async function getMaterialGroups(courseId: string): Promise<MaterialGroup[]> {
  const { data } = await supabase
    .from('material_groups')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');
  return (data as MaterialGroup[]) ?? [];
}

export async function addMaterial(
  material: Omit<Material, 'id' | 'created_at' | 'course'>
): Promise<boolean> {
  const { error } = await supabase.from('materials').insert(material);
  return !error;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  return !error;
}

export async function getGradingSystem(systemId: string) {
  const { data } = await supabase
    .from('grading_systems')
    .select('*, rules:grading_rules(*)')
    .eq('id', systemId)
    .single();
  return data;
}

export async function getStudentGrades(studentId: string) {
  const { data } = await supabase
    .from('student_grades')
    .select('*, course:courses(*)')
    .eq('student_id', studentId);
  return data ?? [];
}

export async function upsertStudentGrade(grade: {
  student_id: string;
  course_id: string;
  semester: number;
  year: number;
  score: number;
  grade_letter: string;
  gpa_points: number;
  credit_hours: number;
}) {
  const { error } = await supabase
    .from('student_grades')
    .upsert(grade, { onConflict: 'student_id,course_id' });
  return !error;
}

export async function getDashboardStats(filters: { facultyId?: string; year?: number } = {}) {
  let studentsQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student');
  let coursesQuery = supabase
    .from('courses')
    .select('id', { count: 'exact', head: true });

  if (filters.facultyId) {
    studentsQuery = studentsQuery.eq('faculty_id', filters.facultyId);
    coursesQuery = coursesQuery.eq('faculty_id', filters.facultyId);
  }
  if (filters.year) {
    studentsQuery = studentsQuery.eq('year', filters.year);
    coursesQuery = coursesQuery.eq('year', filters.year);
  }

  const [students, courses, faculties] = await Promise.all([
    studentsQuery,
    coursesQuery,
    filters.facultyId
      ? Promise.resolve({ count: 1 })
      : supabase.from('faculties').select('id', { count: 'exact', head: true }),
  ]);
  if (students.error) throw students.error;
  if (courses.error) throw courses.error;
  if ('error' in faculties && faculties.error) throw faculties.error;

  let materialsCount = 0;
  if (!filters.facultyId && !filters.year) {
    const { count, error } = await supabase
      .from('materials')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    materialsCount = count ?? 0;
  } else {
    const courseIds: string[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      let courseIdsQuery = supabase.from('courses').select('id').range(offset, offset + pageSize - 1);
      if (filters.facultyId) courseIdsQuery = courseIdsQuery.eq('faculty_id', filters.facultyId);
      if (filters.year) courseIdsQuery = courseIdsQuery.eq('year', filters.year);
      const { data: courseRows, error } = await courseIdsQuery;
      if (error) throw error;
      courseIds.push(...(courseRows ?? []).map((course) => course.id));
      if (!courseRows || courseRows.length < pageSize) break;
    }
    if (courseIds.length > 0) {
      const courseIdChunks = Array.from({ length: Math.ceil(courseIds.length / 100) }, (_, index) =>
        courseIds.slice(index * 100, (index + 1) * 100)
      );
      const materialCounts = await Promise.all(courseIdChunks.map((courseIdChunk) =>
        supabase
          .from('materials')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIdChunk)
      ));
      for (const result of materialCounts) {
        if (result.error) throw result.error;
        materialsCount += result.count ?? 0;
      }
    }
  }

  return {
    total_students: students.count ?? 0,
    total_faculties: faculties.count ?? 0,
    total_courses: courses.count ?? 0,
    total_materials: materialsCount,
  };
}

// Announcements
import { Announcement } from '@/types';

export async function getPublicAnnouncements(facultyId?: string | null, year?: number | null): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const isUuid = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  let query = supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .lte('start_time', now)
    .or(`end_time.is.null,end_time.gt.${now}`)
    .order('created_at', { ascending: false });
  if (isUuid(facultyId) && typeof year === 'number' && Number.isInteger(year) && year >= 1 && year <= 6) {
    query = query.or(`faculty_id.is.null,and(faculty_id.eq.${facultyId},year.eq.${year})`);
  } else {
    query = query.is('faculty_id', null);
  }
  const { data } = await query;
  return data as Announcement[] ?? [];
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  return data as Announcement[] ?? [];
}

export async function getUserNotifications(userId: string) {
  const { data } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return data || [];
}

export async function updateUserNotificationContent(
  userId: string,
  notificationId: string,
  title: string,
  message: string
) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ title, message })
    .eq('user_id', userId)
    .eq('id', notificationId);

  return !error;
}

export async function markNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
    
  return !error;
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('id', notificationId);

  return !error;
}
