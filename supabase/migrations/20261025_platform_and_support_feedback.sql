CREATE TABLE IF NOT EXISTS public.platform_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('platform', 'support_response')),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1200),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  support_message_id UUID REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_feedback_target_check CHECK (
    (feedback_type = 'platform' AND ticket_id IS NULL AND support_message_id IS NULL)
    OR (feedback_type = 'support_response' AND ticket_id IS NOT NULL AND support_message_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS platform_feedback_created_idx
  ON public.platform_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_feedback_type_created_idx
  ON public.platform_feedback (feedback_type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS platform_feedback_one_rating_per_response
  ON public.platform_feedback (user_id, support_message_id)
  WHERE feedback_type = 'support_response';

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_feedback_read_owner_or_superadmin ON public.platform_feedback;
CREATE POLICY platform_feedback_read_owner_or_superadmin ON public.platform_feedback
  FOR SELECT USING (
    user_id = auth.uid() OR public.current_actor_role() = 'superadmin'
  );

DROP POLICY IF EXISTS platform_feedback_create_valid_feedback ON public.platform_feedback;
CREATE POLICY platform_feedback_create_valid_feedback ON public.platform_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      feedback_type = 'platform'
      OR (
        feedback_type = 'support_response'
        AND EXISTS (
          SELECT 1 FROM public.support_tickets AS ticket
          WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM public.support_ticket_messages AS message
          WHERE message.id = support_message_id
            AND message.ticket_id = ticket_id
            AND message.sender_id <> auth.uid()
        )
      )
    )
  );

GRANT SELECT, INSERT ON public.platform_feedback TO authenticated;
