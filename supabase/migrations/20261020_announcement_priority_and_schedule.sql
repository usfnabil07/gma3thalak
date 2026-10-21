-- Let superadmins choose announcement priority. Faculty admins remain at priority 0.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.announcements'::regclass
      AND conname = 'announcements_priority_check'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_priority_check CHECK (priority IN (0, 1));
  END IF;
END $$;

DROP POLICY IF EXISTS announcements_insert_scoped ON public.announcements;
CREATE POLICY announcements_insert_scoped
  ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
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

DROP POLICY IF EXISTS announcements_update_scoped ON public.announcements;
CREATE POLICY announcements_update_scoped
  ON public.announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
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
      SELECT 1 FROM public.profiles p
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

DROP POLICY IF EXISTS announcements_delete_scoped ON public.announcements;
CREATE POLICY announcements_delete_scoped
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
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
