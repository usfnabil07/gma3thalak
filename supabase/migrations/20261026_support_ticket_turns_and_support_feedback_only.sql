-- Allow one message per turn in ticket conversations. The ticket row lock keeps
-- simultaneous submissions from both sides from creating consecutive turns.
CREATE OR REPLACE FUNCTION public.validate_support_ticket_message_turn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_owner UUID;
  ticket_status TEXT;
  latest_sender UUID;
  actor_role TEXT;
BEGIN
  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Messages must be sent by the signed-in user.';
  END IF;

  SELECT ticket.user_id, ticket.status::TEXT
  INTO ticket_owner, ticket_status
  FROM public.support_tickets AS ticket
  WHERE ticket.id = NEW.ticket_id
  FOR UPDATE;

  IF ticket_owner IS NULL THEN
    RAISE EXCEPTION 'Ticket not found.';
  END IF;
  IF ticket_status = 'resolved' THEN
    RAISE EXCEPTION 'This ticket is closed.';
  END IF;

  actor_role := public.current_actor_role();
  SELECT message.sender_id
  INTO latest_sender
  FROM public.support_ticket_messages AS message
  WHERE message.ticket_id = NEW.ticket_id
  ORDER BY message.created_at DESC, message.id DESC
  LIMIT 1;

  IF NEW.sender_id = ticket_owner THEN
    IF latest_sender IS NULL OR latest_sender = ticket_owner THEN
      RAISE EXCEPTION 'لا يمكن إرسال رد جديد قبل رد فريق الدعم.';
    END IF;
  ELSE
    IF actor_role NOT IN ('superadmin', 'support') THEN
      RAISE EXCEPTION 'غير مسموح لك بالرد على هذه التذكرة.';
    END IF;
    IF latest_sender IS NOT NULL AND latest_sender <> ticket_owner THEN
      RAISE EXCEPTION 'بانتظار رد الطالب قبل إرسال رسالة أخرى.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_message_turn_guard ON public.support_ticket_messages;
CREATE TRIGGER support_ticket_message_turn_guard
  BEFORE INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_message_turn();
REVOKE ALL ON FUNCTION public.validate_support_ticket_message_turn() FROM PUBLIC;

DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.status <> 'resolved'
        AND (
          ticket.user_id = auth.uid()
          OR public.current_actor_role() IN ('superadmin', 'support')
        )
    )
  );

-- Platform ratings are no longer accepted. Support response ratings are only
-- accepted for the final support reply after its ticket has been resolved.
DROP POLICY IF EXISTS platform_feedback_create_valid_feedback ON public.platform_feedback;
CREATE POLICY platform_feedback_create_valid_feedback ON public.platform_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND feedback_type = 'support_response'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.user_id = auth.uid()
        AND ticket.status = 'resolved'
    )
    AND EXISTS (
      SELECT 1 FROM public.support_ticket_messages AS message
      WHERE message.id = public.platform_feedback.support_message_id
        AND message.ticket_id = public.platform_feedback.ticket_id
        AND message.sender_id <> auth.uid()
        AND message.id = (
          SELECT latest.id
          FROM public.support_ticket_messages AS latest
          WHERE latest.ticket_id = public.platform_feedback.ticket_id
          ORDER BY latest.created_at DESC, latest.id DESC
          LIMIT 1
        )
    )
  );
