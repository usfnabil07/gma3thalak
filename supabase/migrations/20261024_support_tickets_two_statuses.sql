UPDATE public.support_tickets
SET status = 'open'
WHERE status IN ('in_progress', 'waiting_user');

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'resolved'));
