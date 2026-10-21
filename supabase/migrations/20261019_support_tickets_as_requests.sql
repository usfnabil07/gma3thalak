-- Store the request description and optional contact number on the ticket.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Existing tickets started with a student-authored message; preserve it as the
-- ticket description before changing student replies to support-only replies.
UPDATE public.support_tickets AS ticket
SET body = COALESCE(
  (
    SELECT message.body
    FROM public.support_ticket_messages AS message
    WHERE message.ticket_id = ticket.id
      AND message.sender_id = ticket.user_id
    ORDER BY message.created_at ASC
    LIMIT 1
  ),
  'لم تُسجل تفاصيل لهذه التذكرة القديمة.'
)
WHERE ticket.body IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN body SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_tickets_body_length_check'
      AND conrelid = 'public.support_tickets'::regclass
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_body_length_check
      CHECK (char_length(btrim(body)) BETWEEN 1 AND 8000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_tickets_phone_length_check'
      AND conrelid = 'public.support_tickets'::regclass
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_phone_length_check
      CHECK (phone IS NULL OR char_length(btrim(phone)) BETWEEN 7 AND 24);
  END IF;
END;
$$;

-- Students submit a request once. Only authorized support staff can add replies.
DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.current_actor_role() IN ('superadmin', 'support')
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.status <> 'resolved'
    )
  );
