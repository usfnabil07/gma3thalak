CREATE TABLE IF NOT EXISTS public.support_ticket_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_ticket_reads_select_accessible ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_select_accessible ON public.support_ticket_reads
  FOR SELECT USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  );

DROP POLICY IF EXISTS support_ticket_reads_insert_accessible ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_insert_accessible ON public.support_ticket_reads
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  );

DROP POLICY IF EXISTS support_ticket_reads_update_accessible ON public.support_ticket_reads;
CREATE POLICY support_ticket_reads_update_accessible ON public.support_ticket_reads
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND (ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support'))
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.support_ticket_reads TO authenticated;
