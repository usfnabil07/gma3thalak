-- Faculty admins can review announcements belonging to their own faculty,
-- including superadmin announcements, but cannot manage another author's row.
DROP POLICY IF EXISTS announcements_read_scoped ON public.announcements;
CREATE POLICY announcements_read_scoped
  ON public.announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (
            p.role = 'admin'
            AND announcements.faculty_id = p.faculty_id
          )
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

-- Legacy global announcements were created by the superadmin before author tracking.
UPDATE public.announcements
SET priority = 1
WHERE faculty_id IS NULL
   OR EXISTS (
     SELECT 1 FROM public.profiles p
     WHERE p.user_id = announcements.created_by
       AND p.role = 'superadmin'
   );
