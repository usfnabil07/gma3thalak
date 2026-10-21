import { supabase } from '@/services/supabase/client';

export const SUPPORT_TICKET_READ_EVENT = 'gma:support-ticket-read';

export async function markSupportTicketRead(userId: string, ticketId: string, lastReadAt: string) {
  const { error } = await supabase.from('support_ticket_reads').upsert({
    user_id: userId,
    ticket_id: ticketId,
    last_read_at: lastReadAt,
  }, { onConflict: 'user_id,ticket_id' });

  if (!error && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SUPPORT_TICKET_READ_EVENT));
  }
}
