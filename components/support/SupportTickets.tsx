'use client';


import { useEffect, useRef, useState } from 'react';
import { TicketCheck, Plus, Send, RefreshCw, CheckCircle2, Clock3, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import styles from './SupportTickets.module.css';
import SupportAvatar from './SupportAvatar';
import { markSupportTicketRead, SUPPORT_TICKET_READ_EVENT } from './supportReadState';
import FeedbackForm from '@/components/feedback/FeedbackForm';

type TicketStatus = 'open' | 'resolved';
type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  phone: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};
type TicketMessage = { id: string; ticket_id: string; sender_id: string; body: string; created_at: string };
type TicketOwner = { user_id: string; full_name: string; student_id: string | null };

function mergeTicketMessage(current: TicketMessage[], incoming: TicketMessage) {
  const pending = current.find((message) => message.id.startsWith('pending-')
    && message.sender_id === incoming.sender_id
    && message.body === incoming.body);
  const withoutPending = pending ? current.filter((message) => message.id !== pending.id) : current;
  if (withoutPending.some((message) => message.id === incoming.id)) return withoutPending;
  return [...withoutPending, incoming].sort((first, second) => first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id));
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'بانتظار الرد',
  resolved: 'تم الحل',
};

let realtimeChannelSequence = 0;

export default function SupportTickets({ staffView = false, embedded = false }: { staffView?: boolean; embedded?: boolean }) {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unreadTicketIds, setUnreadTicketIds] = useState<Set<string>>(() => new Set());
  const [staffUnreadTicketIds, setStaffUnreadTicketIds] = useState<Set<string>>(() => new Set());
  const [owners, setOwners] = useState<Record<string, TicketOwner>>({});
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesTicketId, setMessagesTicketId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [phone, setPhone] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const latestMessageAt = useRef('');

  async function loadTickets() {
    if (!profile?.user_id) return;
    setLoadingTickets(true);
    setError('');
    let query = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(100);
    if (!staffView) query = query.eq('user_id', profile.user_id);
    else {
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    }
    const { data, error: queryError } = await query;
    if (queryError) {
      setError('تعذر تحميل تذاكر الدعم. تأكد من تطبيق تحديث قاعدة البيانات.');
      setTickets([]);
      setLoadingTickets(false);
      return;
    }
    const ticketRows = (data ?? []) as Ticket[];
    setTickets(ticketRows);
    setSelectedTicketId((current) => ticketRows.some((ticket) => ticket.id === current) ? current : '');
    if (staffView && ticketRows.length) {
      const userIds = [...new Set(ticketRows.map((ticket) => ticket.user_id))];
      const { data: userRows } = await supabase.from('profiles').select('user_id, full_name, student_id').in('user_id', userIds);
      setOwners(Object.fromEntries(((userRows ?? []) as TicketOwner[]).map((owner) => [owner.user_id, owner])));
    } else if (!staffView) {
      setOwners({});
    }
    setLoadingTickets(false);
  }

  useEffect(() => {
    void loadTickets();
    // loadTickets is scoped to the signed-in owner and current inbox filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id, staffView, statusFilter]);

  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) {
      setUnreadTicketIds(new Set());
      setStaffUnreadTicketIds(new Set());
      return;
    }

    let active = true;
    let realtimeReady = false;
    const updateUnreadTickets = async () => {
      const ticketIds = tickets.map((ticket) => ticket.id);
      if (ticketIds.length === 0) {
        setUnreadTicketIds(new Set());
        setStaffUnreadTicketIds(new Set());
        return;
      }
      const [readsResult, messagesResult] = await Promise.all([
        supabase.from('support_ticket_reads').select('ticket_id, last_read_at')
          .eq('user_id', userId).in('ticket_id', ticketIds),
        supabase.from('support_ticket_messages').select('ticket_id, sender_id, created_at')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false }).limit(2000),
      ]);
      if (!active || readsResult.error || messagesResult.error) return;

      const lastReadByTicket = new Map(
        (readsResult.data ?? []).map((read) => [read.ticket_id, read.last_read_at]),
      );
      const unread = new Set<string>();
      if (staffView) {
        const latestMessageByTicket = new Map<string, { sender_id: string; created_at: string }>();
        for (const message of messagesResult.data ?? []) {
          if (!latestMessageByTicket.has(message.ticket_id)) {
            latestMessageByTicket.set(message.ticket_id, message);
          }
        }
        for (const ticket of tickets) {
          const latestMessage = latestMessageByTicket.get(ticket.id);
          const latestCustomerActivity = latestMessage
            ? latestMessage.sender_id === ticket.user_id ? latestMessage.created_at : ''
            : ticket.created_at;
          const lastReadAt = lastReadByTicket.get(ticket.id);
          if (latestCustomerActivity && (!lastReadAt || latestCustomerActivity > lastReadAt)) {
            unread.add(ticket.id);
          }
        }
        setStaffUnreadTicketIds(unread);
      } else {
        for (const message of messagesResult.data ?? []) {
          if (message.sender_id === userId) continue;
          const lastReadAt = lastReadByTicket.get(message.ticket_id);
          if (!lastReadAt || message.created_at > lastReadAt) unread.add(message.ticket_id);
        }
        setUnreadTicketIds(unread);
      }
    };

    const channelTopic = `support-ticket-list-${userId}-${Date.now()}-${++realtimeChannelSequence}`;
    const channel = supabase.channel(channelTopic)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        if (staffView) void loadTickets();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_messages',
      }, (payload) => {
        const incoming = payload.new as { sender_id?: string; ticket_id?: string };
        if (incoming.ticket_id && tickets.some((ticket) => ticket.id === incoming.ticket_id)
          && (staffView || incoming.sender_id !== userId)) {
          void updateUnreadTickets();
        }
      })
      .subscribe((status) => { realtimeReady = status === 'SUBSCRIBED'; });

    const handleTicketRead = () => { void updateUnreadTickets(); };
    window.addEventListener(SUPPORT_TICKET_READ_EVENT, handleTicketRead);
    void updateUnreadTickets();
    const fallbackTimer = window.setInterval(() => {
      if (!realtimeReady) void updateUnreadTickets();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(fallbackTimer);
      window.removeEventListener(SUPPORT_TICKET_READ_EVENT, handleTicketRead);
      void supabase.removeChannel(channel);
    };
  }, [profile?.user_id, staffView, tickets]);

  useEffect(() => {
    let current = true;
    if (!selectedTicketId) {
      setMessages([]);
      setMessagesTicketId('');
      return;
    }
    setLoadingMessages(true);
    setMessages([]);
    setMessagesTicketId('');
    const loadMessages = async () => {
      try {
        const { data, error: queryError } = await supabase.from('support_ticket_messages')
          .select('*').eq('ticket_id', selectedTicketId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(300);
        if (!current) return;
        if (queryError) setError('تعذر تحميل رسائل التذكرة.');
        else {
          const rows = ((data ?? []) as TicketMessage[]).reverse();
          latestMessageAt.current = rows[rows.length - 1]?.created_at || '';
          setMessages(rows);
          setMessagesTicketId(selectedTicketId);
          const latestReadMessage = rows[rows.length - 1];
          if (profile?.user_id && (staffView || latestReadMessage)) {
            void markSupportTicketRead(
              profile.user_id,
              selectedTicketId,
              staffView ? new Date().toISOString() : latestReadMessage!.created_at,
            );
          }
        }
      } catch {
        if (current) setError('تعذر تحميل رسائل التذكرة.');
      } finally {
        if (current) setLoadingMessages(false);
      }
    };
    void loadMessages();
    return () => { current = false; };
  }, [profile?.user_id, selectedTicketId, staffView]);

  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId || !selectedTicketId) return;
    let realtimeReady = false;
    // RealtimeClient.channel() returns an existing channel when its topic matches.
    // Give each effect setup a fresh topic so Strict Mode remounts cannot reuse a
    // channel that has already been subscribed while its async cleanup is pending.
    const channelTopic = `support-ticket-${selectedTicketId}-${Date.now()}-${++realtimeChannelSequence}`;
    const channel = supabase.channel(channelTopic)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_messages',
        filter: `ticket_id=eq.${selectedTicketId}`,
      }, (payload) => {
        const incoming = payload.new as TicketMessage;
        latestMessageAt.current = incoming.created_at > latestMessageAt.current ? incoming.created_at : latestMessageAt.current;
        setMessages((current) => mergeTicketMessage(current, incoming));
        if (!staffView && incoming.sender_id !== userId) {
          void markSupportTicketRead(userId, selectedTicketId, incoming.created_at);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
        filter: `id=eq.${selectedTicketId}`,
      }, (payload) => {
        const incoming = payload.new as Ticket;
        setTickets((current) => current.map((ticket) => ticket.id === incoming.id
          ? { ...ticket, status: incoming.status, updated_at: incoming.updated_at }
          : ticket));
        if (incoming.status === 'resolved') setDraft('');
      })
      .subscribe((status) => { realtimeReady = status === 'SUBSCRIBED'; });

    const refreshConversation = async () => {
      // Keep ticket state fresh even if Realtime is connected but the database
      // publication has not yet been updated to include support_tickets.
      const { data: ticketData } = await supabase.from('support_tickets')
        .select('id, status, updated_at').eq('id', selectedTicketId).maybeSingle();
      if (ticketData) {
        const incoming = ticketData as Pick<Ticket, 'id' | 'status' | 'updated_at'>;
        setTickets((current) => current.map((ticket) => ticket.id === incoming.id
          ? { ...ticket, status: incoming.status, updated_at: incoming.updated_at }
          : ticket));
        if (incoming.status === 'resolved') setDraft('');
      }

      if (!realtimeReady) {
        let query = supabase.from('support_ticket_messages')
          .select('*').eq('ticket_id', selectedTicketId).order('created_at', { ascending: true }).order('id', { ascending: true }).limit(50);
        if (latestMessageAt.current) query = query.gte('created_at', latestMessageAt.current);
        const { data } = await query;
        if (data?.length) {
          const rows = data as TicketMessage[];
          latestMessageAt.current = rows[rows.length - 1]?.created_at || latestMessageAt.current;
          setMessages((current) => rows.reduce(mergeTicketMessage, current));
        }
      }
    };
    const interval = window.setInterval(() => { void refreshConversation(); }, 4500);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
    // Realtime delivers replies immediately; incremental polling is a fallback if the channel is unavailable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id, selectedTicketId, staffView]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId);
  const latestConversationMessage = messages[messages.length - 1];
  const canReply = Boolean(selectedTicket && selectedTicket.status === 'open' && !loadingMessages && messagesTicketId === selectedTicket.id && !sending && (
    staffView
      ? !latestConversationMessage || latestConversationMessage.sender_id === selectedTicket.user_id
      : latestConversationMessage && latestConversationMessage.sender_id !== profile?.user_id
  ));
  const latestSupportReply = selectedTicket && messagesTicketId === selectedTicket.id
    ? [...messages].reverse().find((message) => message.sender_id !== selectedTicket.user_id && !message.id.startsWith('pending-'))
    : undefined;
  const isDetailView = Boolean(selectedTicket || showNewTicket);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!profile?.user_id || subject.trim().length < 3 || !draft.trim()) return;
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone.trim() && phoneDigits.length !== 11) {
      setError('رقم الهاتف لازم يكون 11 رقم بالضبط.');
      return;
    }
    setSending(true);
    setError('');
    const { data: ticket, error: createError } = await supabase.from('support_tickets')
      .insert({
        user_id: profile.user_id,
        subject: subject.trim(),
        phone: phone.trim() || null,
        body: draft.trim(),
      })
      .select('*')
      .single();
    if (createError || !ticket) {
      setError(createError?.message || 'تعذر إنشاء التذكرة.');
      setSending(false);
      return;
    }
    setSubject('');
    setPhone('');
    setDraft('');
    setShowNewTicket(false);
    await loadTickets();
    setSelectedTicketId(ticket.id);
    setSending(false);
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!profile?.user_id || !selectedTicket || !canReply || !draft.trim()) return;
    setSending(true);
    setError('');
    const body = draft.trim();
    const pendingMessage: TicketMessage = {
      id: `pending-${Date.now()}`,
      ticket_id: selectedTicket.id,
      sender_id: profile.user_id,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, pendingMessage]);
    setDraft('');
    const { error: insertError } = await supabase.from('support_ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: profile.user_id,
      body,
    });
    if (insertError) {
      setError(insertError.message);
      setMessages((current) => current.filter((message) => message.id !== pendingMessage.id));
      setDraft(body);
      setSending(false);
      return;
    }
    const updatedAt = new Date().toISOString();
    setTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id
      ? { ...ticket, updated_at: updatedAt }
      : ticket));
    setSending(false);
  }

  async function changeStatus(status: TicketStatus) {
    if (!selectedTicket) return;
    const { error: updateError } = await supabase.from('support_tickets').update({ status }).eq('id', selectedTicket.id);
    if (updateError) setError('تعذر تحديث حالة التذكرة.');
    else await loadTickets();
  }

  return (
    <section className={`${styles.supportPanel} ${staffView ? styles.staffDashboard : ''} ${embedded ? styles.embedded : ''} ${isDetailView ? styles.detailView : ''}`} dir="rtl">
      <header className={styles.supportHeader}>
        {embedded && <div className={styles.embeddedTitle}><b>{showNewTicket ? 'تذكرة جديدة' : selectedTicket ? 'تفاصيل التذكرة' : staffView ? 'صندوق التذاكر' : 'تذاكري'}</b><span>{staffView ? 'راجع تفاصيل الطلب وأرسل رد فريق الدعم' : 'عندك مشكلة؟ ابعتلنا تذكرة وفريق الدعم هيتابع معاك.'}</span></div>}
        <div className={styles.supportHeading}>
          <SupportAvatar size={46} />
          <div><h1>{staffView ? 'صندوق تذاكر الدعم' : 'الدعم الفني'}</h1><p>{staffView ? 'راجع تفاصيل التذاكر وأرسل رد فريق الدعم من مكان واحد.' : 'أرسل تذكرة توضح مشكلتك، وسيتابع فريق الدعم طلبك.'}</p></div>
        </div>
        <div className={styles.supportHeaderActions}>
          {staffView && !isDetailView && <div className={styles.ticketQueueFilters} role="tablist" aria-label="أقسام التذاكر">
            <button type="button" role="tab" aria-selected={statusFilter === 'open'} className={statusFilter === 'open' ? styles.ticketQueueFilterActive : ''} onClick={() => setStatusFilter('open')}>بانتظار الرد</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'resolved'} className={statusFilter === 'resolved' ? styles.ticketQueueFilterActive : ''} onClick={() => setStatusFilter('resolved')}>تم حلها</button>
            <button type="button" role="tab" aria-selected={statusFilter === 'all'} className={statusFilter === 'all' ? styles.ticketQueueFilterActive : ''} onClick={() => setStatusFilter('all')}>كل التذاكر</button>
          </div>}
          {!isDetailView && <button className={styles.refreshButton} type="button" onClick={() => void loadTickets()} aria-label="تحديث التذاكر" title="تحديث"><RefreshCw size={17} /></button>}
        </div>
      </header>

      {error && <p className={styles.supportError} role="alert">{error}</p>}
      <div className={`${styles.supportWorkspace} ${selectedTicket || showNewTicket ? styles.ticketDetail : ''}`}>
        <aside className={styles.ticketList} aria-label="قائمة التذاكر">
          {loadingTickets ? <div className={styles.supportLoading} role="status" aria-live="polite"><span className={embedded ? styles.loadingSpinnerCompact : styles.loadingSpinner} aria-hidden="true" /><span>جارٍ تحميل التذاكر...</span></div> : tickets.length === 0 ? <div className={styles.ticketEmpty}><TicketCheck size={24} /><span>{staffView ? 'لا توجد تذاكر في هذا العرض.' : 'لسه مفيش تذاكر. افتح تذكرة لو محتاج مساعدة.'}</span></div> : tickets.map((ticket) => (
            <button key={ticket.id} type="button" className={`${styles.ticketItem} ${selectedTicketId === ticket.id ? styles.ticketItemActive : ''} ${!staffView && ticket.status === 'resolved' ? styles.ticketItemWithRibbon : ''}`} onClick={() => { setSelectedTicketId(ticket.id); setShowNewTicket(false); }}>
              <span className={styles.ticketItemTop}>
                <b>{ticket.subject}</b>
                {staffView && <span className={`${styles.staffTicketStatus} ${ticket.status === 'resolved' ? styles.staffTicketStatusResolved : ''}`}>{STATUS_LABELS[ticket.status]}</span>}
                {staffView && staffUnreadTicketIds.has(ticket.id) && <span className={styles.unreadReply} role="status"><span className={styles.unreadDot} aria-hidden="true" /> غير مقروءة</span>}
              </span>
              {!staffView && ticket.status === 'resolved' && <span className={`${styles.ticketRibbon} ${styles.ticketRibbon_resolved}`}>منتهية</span>}
              {staffView && <span className={styles.ticketOwner}>{owners[ticket.user_id]?.full_name || 'مستخدم'} {owners[ticket.user_id]?.student_id ? `· ${owners[ticket.user_id].student_id}` : ''}</span>}
              <span className={styles.ticketDate}>
                <Clock3 size={13} /> {new Date(ticket.updated_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                {!staffView && unreadTicketIds.has(ticket.id) && (
                  <span className={styles.unreadReply} role="status"><span className={styles.unreadDot} aria-hidden="true" /> رد جديد</span>
                )}
              </span>
            </button>
          ))}
          {!staffView && !loadingTickets && <button className={`btn btn-primary ${styles.newTicketButton}`} type="button" onClick={() => { setShowNewTicket(true); setSelectedTicketId(''); setDraft(''); setSubject(''); setPhone(''); }}><Plus size={17} /> فتح تذكرة جديدة</button>}
        </aside>

        <div className={styles.ticketConversation}>
          {showNewTicket && !staffView ? (
            <form className={styles.ticketNewForm} onSubmit={createTicket}>
              <button className={styles.conversationBack} type="button" onClick={() => setShowNewTicket(false)}><ArrowRight size={17} /> رجوع للتذاكر</button>
              <h2>إيه اللي محتاج مساعدة فيه؟</h2>
              <label>عنوان المشكلة<input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} minLength={3} required placeholder="مثال: مشكلة في فتح محتوى مادة" /></label>
              <label><span className={styles.fieldLabel}>رقم الهاتف <i className={styles.optionalLabel}>اختياري</i></span><input className="input" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(event) => {
                const normalized = event.target.value
                  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
                  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
                  .replace(/\D/g, '')
                  .slice(0, 11);
                setPhone(normalized);
              }} maxLength={11} pattern="[0-9]{11}" title="أدخل 11 رقمًا بالضبط" placeholder="مثال: 01XXXXXXXXX" /></label>
              <label>التفاصيل<textarea className="input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={8000} required rows={5} placeholder="اكتب تفاصيل تساعدنا نفهم المشكلة…" /></label>
              <button className="btn btn-primary" type="submit" disabled={sending}>{sending ? 'جاري الإرسال…' : 'إرسال لفريق الدعم'}</button>
            </form>
          ) : selectedTicket ? (
            <>
              <div className={styles.conversationHeader}>
                <div className={styles.conversationTitle}>
                  <button className={styles.conversationBack} type="button" onClick={() => { setSelectedTicketId(''); setDraft(''); }}><ArrowRight size={17} /> رجوع للتذاكر</button>
                  <div><h2>{selectedTicket.subject}</h2>{staffView && <span>{`${owners[selectedTicket.user_id]?.full_name || 'مستخدم'} · ${owners[selectedTicket.user_id]?.student_id || 'بدون معرّف'}`}</span>}</div>
                </div>
                {staffView ? <select className="input" value={selectedTicket.status} onChange={(event) => void changeStatus(event.target.value as TicketStatus)} aria-label="حالة التذكرة">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select> : null}
              </div>
              <div className={styles.ticketRecord}>
                <article className={styles.ticketDescription}>
                  <div className={styles.ticketRecordMeta}><b>وصف المشكلة</b><time>{new Date(selectedTicket.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
                  <p>{selectedTicket.body || 'لا توجد تفاصيل مسجلة لهذه التذكرة.'}</p>
                  {selectedTicket.phone && <div className={styles.ticketPhone}><span>رقم الهاتف</span><a href={`tel:${selectedTicket.phone}`}>{selectedTicket.phone}</a></div>}
                </article>
                {staffView && owners[selectedTicket.user_id] && <div className={styles.ticketStudentMeta}>
                  <span>صاحب التذكرة</span>
                  <b>{owners[selectedTicket.user_id].full_name || 'مستخدم'}{owners[selectedTicket.user_id].student_id ? ` · ${owners[selectedTicket.user_id].student_id}` : ''}</b>
                </div>}
                <h3 className={styles.responsesHeading}>الرسائل</h3>
                <div className={styles.responseList}>
                  {loadingMessages ? <div className={styles.supportLoading} role="status" aria-live="polite"><span className={embedded ? styles.loadingSpinnerCompact : styles.loadingSpinner} aria-hidden="true" /><span>جارٍ تحميل المحادثة...</span></div> : messages.map((message) => {
                    const studentMessage = message.sender_id === selectedTicket.user_id;
                    return <article key={message.id} className={`${styles.supportResponse} ${studentMessage ? styles.studentResponse : ''}`}>
                      <div className={styles.ticketRecordMeta}><b>{studentMessage ? 'رد الطالب' : 'فريق الدعم'}</b><time>{message.id.startsWith('pending-') ? 'جاري الإرسال…' : new Date(message.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
                      <p>{message.body}</p>
                    </article>;
                  })}
                  {!loadingMessages && messages.length === 0 && <div className={styles.noResponses}>{staffView ? 'لم يرسل الطالب ردًا بعد.' : 'لم يرد فريق الدعم على هذه التذكرة بعد.'}</div>}
                </div>
                {!staffView && selectedTicket.status === 'resolved' && latestSupportReply && <FeedbackForm key={latestSupportReply.id} ticketId={selectedTicket.id} supportMessageId={latestSupportReply.id} />}
              </div>
              {canReply ? <form className={styles.replyForm} onSubmit={sendReply}>
                <textarea className="input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={8000} rows={2} required placeholder={staffView ? 'اكتب ردك على الطالب…' : 'اكتب ردك على فريق الدعم…'} />
                <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}><Send size={16} /> {sending ? 'جاري الإرسال…' : 'إرسال الرد'}</button>
              </form> : selectedTicket.status === 'resolved' ? <div className={styles.resolvedNote}><CheckCircle2 size={17} /> تم حل هذه التذكرة وإغلاقها.</div> : !loadingMessages && messagesTicketId === selectedTicket.id ? <div className={styles.waitingReplyNote}>{staffView ? 'بانتظار رد الطالب قبل إرسال رسالة أخرى.' : 'فريق الدعم هيرد عليك، وبعدها تقدر تبعت رسالة جديدة.'}</div> : null}
            </>
          ) : <div className={styles.ticketWelcome}><SupportAvatar size={58} /><h2>{staffView ? 'اختر تذكرة للبدء' : 'إحنا هنا لمساعدتك'}</h2><p>{staffView ? 'ستظهر تفاصيل الطلب وردود فريق الدعم هنا.' : 'افتح تذكرة جديدة، وسيتابع فريق الدعم طلبك.'}</p></div>}
        </div>
      </div>
    </section>
  );
}
