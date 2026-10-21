-- A resolved ticket may end immediately after the student's final message.
-- The rating still refers to the latest support reply in that conversation.
DROP POLICY IF EXISTS platform_feedback_create_valid_feedback ON public.platform_feedback;
CREATE POLICY platform_feedback_create_valid_feedback ON public.platform_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND feedback_type = 'support_response'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = public.platform_feedback.ticket_id
        AND ticket.user_id = auth.uid()
        AND ticket.status = 'resolved'
    )
    AND EXISTS (
      SELECT 1 FROM public.support_ticket_messages AS message
      WHERE message.id = public.platform_feedback.support_message_id
        AND message.ticket_id = public.platform_feedback.ticket_id
        AND message.sender_id <> auth.uid()
    )
  );
