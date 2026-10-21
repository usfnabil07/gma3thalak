-- Support staff handles platform-wide tickets and user accounts.
-- Keep the historical faculty_id ticket data for compatibility, but do not use it for access control.

DROP POLICY IF EXISTS profiles_staff_read_all ON public.profiles;
CREATE POLICY profiles_staff_read_all ON public.profiles
  FOR SELECT USING (public.current_actor_role() IN ('superadmin', 'support'));

DROP POLICY IF EXISTS profiles_staff_update_all ON public.profiles;
CREATE POLICY profiles_staff_update_all ON public.profiles
  FOR UPDATE USING (public.current_actor_role() IN ('superadmin', 'support'))
  WITH CHECK (public.current_actor_role() IN ('superadmin', 'support'));

DROP POLICY IF EXISTS support_tickets_read_owner_or_staff ON public.support_tickets;
CREATE POLICY support_tickets_read_owner_or_staff ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR public.current_actor_role() IN ('superadmin', 'support')
  );

DROP POLICY IF EXISTS support_tickets_create_owner ON public.support_tickets;
CREATE POLICY support_tickets_create_owner ON public.support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND assigned_to IS NULL
  );

DROP POLICY IF EXISTS support_tickets_update_staff ON public.support_tickets;
CREATE POLICY support_tickets_update_staff ON public.support_tickets
  FOR UPDATE USING (public.current_actor_role() IN ('superadmin', 'support'))
  WITH CHECK (public.current_actor_role() IN ('superadmin', 'support'));

DROP POLICY IF EXISTS support_messages_read_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_read_owner_or_staff ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  );

DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  );

DROP FUNCTION IF EXISTS public.can_manage_support_faculty(UUID);
DROP FUNCTION IF EXISTS public.current_actor_faculty_id();

-- Realtime lets an open conversation receive messages without waiting for the fallback refresh.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'support_ticket_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
  END IF;
END;
$$;
