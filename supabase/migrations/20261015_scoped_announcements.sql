-- Scope announcements to a faculty and optionally a year.
-- Null faculty_id keeps existing superadmin announcements global.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS year INT CHECK (year BETWEEN 1 AND 6);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority IN (0, 1));

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Replace older broad policies so they cannot expose scoped announcements.
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'announcements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.announcements', existing_policy.policyname);
  END LOOP;
END $$;

CREATE POLICY announcements_read_scoped
  ON public.announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
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

CREATE POLICY announcements_insert_scoped
  ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (
            p.role = 'admin'
            AND announcements.faculty_id = p.faculty_id
            AND announcements.year = p.year
            AND announcements.priority = 0
            AND announcements.created_by = auth.uid()
          )
        )
    )
  );

CREATE POLICY announcements_update_scoped
  ON public.announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (
            p.role = 'admin'
            AND announcements.faculty_id = p.faculty_id
            AND announcements.year = p.year
            AND announcements.priority = 0
            AND announcements.created_by = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (
            p.role = 'admin'
            AND announcements.faculty_id = p.faculty_id
            AND announcements.year = p.year
            AND announcements.priority = 0
            AND announcements.created_by = auth.uid()
          )
        )
    )
  );

CREATE POLICY announcements_delete_scoped
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'superadmin'
          OR (
            p.role = 'admin'
            AND announcements.faculty_id = p.faculty_id
            AND announcements.year = p.year
            AND announcements.priority = 0
            AND announcements.created_by = auth.uid()
          )
        )
    )
  );
