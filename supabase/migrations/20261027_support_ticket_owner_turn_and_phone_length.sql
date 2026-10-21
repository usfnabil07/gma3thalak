-- Identify the customer from ticket ownership before considering account role.
-- This prevents a customer's role value from being mistaken for support staff.
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
    RAISE EXCEPTION 'يجب أن تكون الرسالة من الحساب المسجل دخوله.';
  END IF;

  SELECT ticket.user_id, ticket.status::TEXT
  INTO ticket_owner, ticket_status
  FROM public.support_tickets AS ticket
  WHERE ticket.id = NEW.ticket_id
  FOR UPDATE;

  IF ticket_owner IS NULL THEN
    RAISE EXCEPTION 'التذكرة غير موجودة.';
  END IF;
  IF ticket_status = 'resolved' THEN
    RAISE EXCEPTION 'هذه التذكرة منتهية.';
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

-- Phone is optional, but any supplied number must contain exactly 11 digits.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_tickets_phone_exact_11_digits'
      AND conrelid = 'public.support_tickets'::regclass
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_phone_exact_11_digits
      CHECK (phone IS NULL OR phone ~ '^[0-9]{11}$') NOT VALID;
  END IF;
END;
$$;
