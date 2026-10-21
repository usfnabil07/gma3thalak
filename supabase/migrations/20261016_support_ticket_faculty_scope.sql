-- Route support tickets to the student's faculty, independent of study year.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL;

UPDATE public.support_tickets AS ticket
SET faculty_id = profile.faculty_id
FROM public.profiles AS profile
WHERE profile.user_id = ticket.user_id
  AND ticket.faculty_id IS NULL
  AND profile.faculty_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_faculty_status_updated_idx
  ON public.support_tickets (faculty_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.current_actor_faculty_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT faculty_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_support_faculty(target_faculty_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT actor.role = 'superadmin'
      OR (actor.role = 'support'
        AND actor.faculty_id IS NOT NULL
        AND actor.faculty_id = target_faculty_id)
    FROM public.profiles AS actor
    WHERE actor.user_id = auth.uid()
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION public.current_actor_faculty_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_support_faculty(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_actor_faculty_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_support_faculty(UUID) TO authenticated;

DROP POLICY IF EXISTS profiles_staff_read_all ON public.profiles;
CREATE POLICY profiles_staff_read_all ON public.profiles
  FOR SELECT USING (
    public.current_actor_role() = 'superadmin'
    OR (
      public.current_actor_role() = 'support'
      AND public.current_actor_faculty_id() IS NOT NULL
      AND faculty_id = public.current_actor_faculty_id()
    )
  );

DROP POLICY IF EXISTS profiles_staff_update_all ON public.profiles;
CREATE POLICY profiles_staff_update_all ON public.profiles
  FOR UPDATE USING (
    public.current_actor_role() = 'superadmin'
    OR (
      public.current_actor_role() = 'support'
      AND public.current_actor_faculty_id() IS NOT NULL
      AND faculty_id = public.current_actor_faculty_id()
    )
  ) WITH CHECK (
    public.current_actor_role() = 'superadmin'
    OR (
      public.current_actor_role() = 'support'
      AND public.current_actor_faculty_id() IS NOT NULL
      AND faculty_id = public.current_actor_faculty_id()
    )
  );

DROP POLICY IF EXISTS support_tickets_read_owner_or_staff ON public.support_tickets;
CREATE POLICY support_tickets_read_owner_or_staff ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.can_manage_support_faculty(faculty_id)
  );

DROP POLICY IF EXISTS support_tickets_create_owner ON public.support_tickets;
CREATE POLICY support_tickets_create_owner ON public.support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND assigned_to IS NULL
    AND faculty_id IS NOT DISTINCT FROM public.current_actor_faculty_id()
  );

DROP POLICY IF EXISTS support_tickets_update_staff ON public.support_tickets;
CREATE POLICY support_tickets_update_staff ON public.support_tickets
  FOR UPDATE USING (public.can_manage_support_faculty(faculty_id))
  WITH CHECK (public.can_manage_support_faculty(faculty_id));

DROP POLICY IF EXISTS support_messages_read_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_read_owner_or_staff ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.can_manage_support_faculty(ticket.faculty_id))
    )
  );

DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.can_manage_support_faculty(ticket.faculty_id))
    )
  );
