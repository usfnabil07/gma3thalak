'use client';

import { useEffect, useState } from 'react';
import { MessageSquareText, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import styles from './Admin.module.css';

type FeedbackType = 'support_response';
type FeedbackRow = {
  id: string;
  user_id: string;
  feedback_type: FeedbackType;
  rating: number;
  comment: string | null;
  ticket_id: string | null;
  support_message_id: string | null;
  created_at: string;
};

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [owners, setOwners] = useState<Record<string, { full_name: string; student_id: string | null }>>({});
  const [ticketSubjects, setTicketSubjects] = useState<Record<string, string>>({});
  const [responseBodies, setResponseBodies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let current = true;
    const loadFeedback = async () => {
      setLoading(true);
      setError('');
      const pageSize = 500;
      const rows: FeedbackRow[] = [];
      let offset = 0;
      while (true) {
        const { data, error: queryError } = await supabase.from('platform_feedback').select('*')
          .eq('feedback_type', 'support_response').order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (!current) return;
        if (queryError) {
          setError('تعذر تحميل التقييمات. تأكد من تطبيق تحديث قاعدة البيانات.');
          setItems([]);
          setLoading(false);
          return;
        }
        const page = (data ?? []) as FeedbackRow[];
        rows.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
      }

      if (!current) return;
      setItems(rows);
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const ticketIds = [...new Set(rows.flatMap((row) => row.ticket_id ? [row.ticket_id] : []))];
      const messageIds = [...new Set(rows.flatMap((row) => row.support_message_id ? [row.support_message_id] : []))];
      const [profilesResult, ticketsResult, messagesResult] = await Promise.all([
        userIds.length ? supabase.from('profiles').select('user_id, full_name, student_id').in('user_id', userIds) : Promise.resolve({ data: [] }),
        ticketIds.length ? supabase.from('support_tickets').select('id, subject').in('id', ticketIds) : Promise.resolve({ data: [] }),
        messageIds.length ? supabase.from('support_ticket_messages').select('id, body').in('id', messageIds) : Promise.resolve({ data: [] }),
      ]);
      if (!current) return;
      setOwners(Object.fromEntries(((profilesResult.data ?? []) as Array<{ user_id: string; full_name: string; student_id: string | null }>).map((row) => [row.user_id, row])));
      setTicketSubjects(Object.fromEntries(((ticketsResult.data ?? []) as Array<{ id: string; subject: string }>).map((row) => [row.id, row.subject])));
      setResponseBodies(Object.fromEntries(((messagesResult.data ?? []) as Array<{ id: string; body: string }>).map((row) => [row.id, row.body])));
      setLoading(false);
    };
    void loadFeedback();
    return () => { current = false; };
  }, [refreshKey]);

  return (
    <section className={styles.feedbackAdmin} dir="rtl">
      <header className={styles.feedbackAdminHeader}>
        <div><h1><MessageSquareText size={22} /> تقييمات محادثات الدعم الفني</h1><p>آراء الطلاب بعد انتهاء تذاكر الدعم.</p></div>
        <button type="button" className={styles.feedbackRefresh} onClick={() => setRefreshKey((value) => value + 1)} aria-label="تحديث التقييمات"><RefreshCw size={17} /></button>
      </header>
      {error && <p className={styles.feedbackAdminError} role="alert">{error}</p>}
      {!loading && !error && <div className={styles.feedbackSummary}>
        <div className={styles.feedbackSummaryCard}><span>عدد التقييمات</span><strong>{items.length.toLocaleString('ar-EG')}</strong></div>
        <div className={styles.feedbackSummaryCard}><span>متوسط التقييم</span><strong className={styles.feedbackAverage}><Star size={19} fill="currentColor" />{items.length ? (items.reduce((sum, item) => sum + item.rating, 0) / items.length).toLocaleString('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}<small>/ 5</small></strong></div>
      </div>}
      {loading ? <div className={styles.feedbackAdminEmpty}>جارٍ تحميل التقييمات…</div> : items.length === 0 ? <div className={styles.feedbackAdminEmpty}>مفيش تقييمات في القسم ده لسه.</div> : (
        <div className={styles.feedbackCards}>
          {items.map((item) => {
            const owner = owners[item.user_id];
            return <article className={styles.feedbackCard} key={item.id}>
              <div className={styles.feedbackCardTop}>
                <span className={styles.feedbackTypeBadge}>تقييم محادثة دعم فني</span>
                <time>{new Date(item.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
              <div className={styles.feedbackRating} aria-label={`التقييم ${item.rating} من 5`}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? 'currentColor' : 'none'} />)}
                <b>{item.rating}/5</b>
              </div>
              <p className={styles.feedbackOwner}>{owner?.full_name || 'مستخدم'}{owner?.student_id ? ` · ${owner.student_id}` : ''}</p>
              {item.feedback_type === 'support_response' && item.ticket_id && <p className={styles.feedbackRelated}>التذكرة: {ticketSubjects[item.ticket_id] || 'تذكرة دعم'}</p>}
              {item.feedback_type === 'support_response' && item.support_message_id && responseBodies[item.support_message_id] && <blockquote className={styles.feedbackResponseQuote}>{responseBodies[item.support_message_id]}</blockquote>}
              <p className={styles.feedbackComment}>{item.comment || 'لم يضف المستخدم تعليقًا.'}</p>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
