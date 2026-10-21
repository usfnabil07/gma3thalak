-- Support staff may grant a student access to a course from user management.
-- Keep other access changes (including update and delete) restricted to superadmins.
DROP POLICY IF EXISTS student_course_access_support_insert ON public.student_course_access;
CREATE POLICY student_course_access_support_insert ON public.student_course_access
  FOR INSERT WITH CHECK (
    public.current_actor_role() = 'support'
  );
