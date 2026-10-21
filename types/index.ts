export type UserRole = 'student' | 'admin' | 'superadmin' | 'support';
export type MaterialType = 'video' | 'audio' | 'image' | 'file' | 'link';

export interface Faculty {
  id: string;
  name_ar: string;
  name_en: string;
  grading_system_id: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface GradingRule {
  id: string;
  system_id: string;
  min_score: number;
  max_score: number;
  grade_letter: string;
  gpa_points: number;
}

export interface GradingSystem {
  id: string;
  name: string;
  description: string;
  rules: GradingRule[];
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  student_id?: string;
  faculty_id: string;
  year: number;
  role: UserRole;
  avatar_url: string | null;
  faculty?: Faculty;
  created_at: string;
}

export interface Course {
  id: string;
  faculty_id: string;
  year: number;
  semester: 1 | 2;
  name_ar: string;
  name_en: string;
  credit_hours: number;
  doctor_name?: string;
  description?: string;
  features?: string[];
  image_url?: string;
  is_active: boolean;
  is_core?: boolean;
  access_status?: 'basic' | 'transferred' | 'not_added';
  materials_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface MaterialGroup {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Material {
  id: string;
  course_id: string;
  section_id?: string | null;
  group_id?: string | null;
  title: string;
  type: MaterialType;
  url: string;
  description: string | null;
  created_by: string;
  created_at: string;
  course?: Course;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  course_id: string;
  semester: 1 | 2;
  year: number;
  score: number;
  grade_letter: string;
  gpa_points: number;
  credit_hours: number;
  course?: Course;
}

export interface GpaResult {
  semester_gpa: number;
  cumulative_gpa: number;
  total_credit_hours: number;
  total_grade_points: number;
  grades: StudentGrade[];
}

export interface DashboardStats {
  total_students: number;
  total_faculties: number;
  total_courses: number;
  total_materials: number;
}

export interface Announcement {
  id: string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  start_time: string;
  end_time: string | null;
  faculty_id: string | null;
  year: number | null;
  priority: 0 | 1;
  created_by: string | null;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
