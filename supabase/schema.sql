-- =============================================
-- BUA Portal — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Grading Systems (لوائح التقدير)
CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grading Rules (جدول التقديرات لكل لائحة)
CREATE TABLE IF NOT EXISTS grading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  grade_letter TEXT NOT NULL,
  gpa_points NUMERIC NOT NULL
);

-- 3. Faculties (الكليات)
CREATE TABLE IF NOT EXISTS faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  grading_system_id UUID REFERENCES grading_systems(id),
  color TEXT DEFAULT '#5b4fdc',
  icon TEXT DEFAULT 'GraduationCap',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Profiles (الطلاب - موسّع على Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL DEFAULT '',
  faculty_id UUID REFERENCES faculties(id),
  year INT NOT NULL DEFAULT 1 CHECK (year BETWEEN 1 AND 6),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin', 'support')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- A student may not promote themselves to another academic year.
CREATE OR REPLACE FUNCTION public.prevent_student_self_year_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.year IS DISTINCT FROM NEW.year
    AND OLD.role = 'student'
    AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'Students cannot change their own academic year';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_student_self_year_change ON public.profiles;
CREATE TRIGGER prevent_student_self_year_change
  BEFORE UPDATE OF year ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_self_year_change();

-- Only a superadmin can change account roles, including through staff profile access.
CREATE OR REPLACE FUNCTION public.prevent_non_superadmin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO actor_role FROM public.profiles WHERE user_id = auth.uid();
    IF actor_role IS DISTINCT FROM 'superadmin' THEN
      RAISE EXCEPTION 'Only a superadmin can change account roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_non_superadmin_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_non_superadmin_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_non_superadmin_role_change();

-- 5. Courses (المواد الدراسية)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year BETWEEN 1 AND 6),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  credit_hours INT NOT NULL DEFAULT 3,
  description TEXT,
  features TEXT[] DEFAULT ARRAY['محتوى المادة كاملاً ومراجعته بشكل وافي', 'فيديوهات، ملفات، وروابط هامة للنجاح', 'حل أسئلة ونماذج امتحانات سابقة']::TEXT[],
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.1 Announcements (إعلامات عامة أو موجهة لكلية/فرقة)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE,
  year INT CHECK (year BETWEEN 1 AND 6),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.5 Course Sections (أقسام/محاضرات المادة)
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.6 Optional content groups within a lecture/week
CREATE TABLE IF NOT EXISTS material_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Materials (المحتوى التعليمي)
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES course_sections(id) ON DELETE CASCADE,
  group_id UUID REFERENCES material_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'audio', 'image', 'file', 'link')),
  url TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Student Grades (درجات الطلاب)
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  year INT NOT NULL,
  score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade_letter TEXT NOT NULL,
  gpa_points NUMERIC NOT NULL,
  credit_hours INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Profiles: students see only their own, admins see all
CREATE POLICY "profiles_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Faculties: everyone can read
CREATE POLICY "faculties_read" ON faculties
  FOR SELECT USING (true);

CREATE POLICY "faculties_admin_write" ON faculties
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Grading systems & rules: public read
CREATE POLICY "grading_systems_read" ON grading_systems
  FOR SELECT USING (true);

CREATE POLICY "grading_rules_read" ON grading_rules
  FOR SELECT USING (true);

-- Grading admin write
CREATE POLICY "grading_systems_admin" ON grading_systems
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "grading_rules_admin" ON grading_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Courses: public read, admin write
CREATE POLICY "courses_read" ON courses
  FOR SELECT USING (true);

CREATE POLICY "courses_admin_write" ON courses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);
CREATE POLICY "course_sections_admin_write" ON course_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);
CREATE POLICY "material_groups_auth_read" ON material_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "material_groups_admin_write" ON material_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Materials: authenticated read, admin write
CREATE POLICY "materials_auth_read" ON materials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "materials_admin_write" ON materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Student grades: own only
CREATE POLICY "grades_own" ON student_grades
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "grades_insert" ON student_grades
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "grades_update" ON student_grades
  FOR UPDATE USING (auth.uid() = student_id);

-- Announcements: users see global announcements and those matching their cohort.
CREATE POLICY "announcements_read_scoped" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (p.role = 'admin' AND announcements.faculty_id = p.faculty_id)
          OR (
            announcements.faculty_id IS NOT NULL
            AND p.faculty_id = announcements.faculty_id
            AND (announcements.year IS NULL OR p.year = announcements.year)
          )
          OR (
            announcements.is_active = true
            AND announcements.start_time <= now()
            AND (announcements.end_time IS NULL OR announcements.end_time > now())
            AND (
              announcements.faculty_id IS NULL
              OR (
                p.faculty_id = announcements.faculty_id
                AND (announcements.year IS NULL OR p.year = announcements.year)
              )
            )
          )
        )
    )
  );

CREATE POLICY "announcements_insert_scoped" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (p.role = 'admin' AND announcements.faculty_id = p.faculty_id AND announcements.year = p.year AND announcements.priority = 0 AND announcements.created_by = auth.uid())
        )
    )
  );

CREATE POLICY "announcements_update_scoped" ON announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (p.role = 'admin' AND announcements.faculty_id = p.faculty_id AND announcements.year = p.year AND announcements.priority = 0 AND announcements.created_by = auth.uid())
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (p.role = 'admin' AND announcements.faculty_id = p.faculty_id AND announcements.year = p.year AND announcements.priority = 0 AND announcements.created_by = auth.uid())
        )
    )
  );

CREATE POLICY "announcements_delete_scoped" ON announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (p.role = 'admin' AND announcements.faculty_id = p.faculty_id AND announcements.year = p.year AND announcements.priority = 0 AND announcements.created_by = auth.uid())
        )
    )
  );

-- =============================================
-- Seed Data: Default Grading System (نظام عام)
-- =============================================

INSERT INTO grading_systems (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'النظام العام', 'نظام التقدير العام لمعظم كليات جامعة بدر')
ON CONFLICT DO NOTHING;

INSERT INTO grading_rules (system_id, min_score, max_score, grade_letter, gpa_points) VALUES
  ('00000000-0000-0000-0000-000000000001', 97, 100, 'A+', 4.0),
  ('00000000-0000-0000-0000-000000000001', 93, 96.99, 'A', 4.0),
  ('00000000-0000-0000-0000-000000000001', 90, 92.99, 'A-', 3.7),
  ('00000000-0000-0000-0000-000000000001', 87, 89.99, 'B+', 3.3),
  ('00000000-0000-0000-0000-000000000001', 83, 86.99, 'B', 3.0),
  ('00000000-0000-0000-0000-000000000001', 80, 82.99, 'B-', 2.7),
  ('00000000-0000-0000-0000-000000000001', 77, 79.99, 'C+', 2.3),
  ('00000000-0000-0000-0000-000000000001', 73, 76.99, 'C', 2.0),
  ('00000000-0000-0000-0000-000000000001', 70, 72.99, 'C-', 1.7),
  ('00000000-0000-0000-0000-000000000001', 67, 69.99, 'D+', 1.3),
  ('00000000-0000-0000-0000-000000000001', 60, 66.99, 'D', 1.0),
  ('00000000-0000-0000-0000-000000000001', 0,  59.99, 'F', 0.0)
ON CONFLICT DO NOTHING;
