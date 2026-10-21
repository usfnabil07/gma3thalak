'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Send, Star } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import styles from './FeedbackForm.module.css';

export default function FeedbackForm({
  ticketId,
  supportMessageId,
}: {
  ticketId: string;
  supportMessageId: string;
}) {
  const { profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile?.user_id || !supportMessageId) {
      setLoading(false);
      return;
    }

    let current = true;
    const loadExistingFeedback = async () => {
      try {
        const { data, error: queryError } = await supabase.from('platform_feedback').select('rating, comment')
          .eq('user_id', profile.user_id)
          .eq('support_message_id', supportMessageId)
          .maybeSingle();
        if (!current) return;
        if (queryError) setError('تعذر تحميل تقييم الرد. حاول تحديث الصفحة.');
        if (data) {
          setRating(data.rating);
          setComment(data.comment || '');
          setSubmitted(true);
        }
      } catch {
        if (current) setError('تعذر تحميل تقييم الرد. حاول تحديث الصفحة.');
      } finally {
        if (current) setLoading(false);
      }
    };
    void loadExistingFeedback();

    return () => { current = false; };
  }, [profile?.user_id, supportMessageId]);

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    if (!profile?.user_id || rating < 1 || saving || submitted) return;
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('platform_feedback').insert({
      user_id: profile.user_id,
      feedback_type: 'support_response',
      rating,
      comment: comment.trim() || null,
      ticket_id: ticketId,
      support_message_id: supportMessageId,
    });
    if (insertError) {
      setError('ماقدرناش نبعت تقييمك دلوقتي. جرّب تاني.');
      setSaving(false);
      return;
    }
    setSubmitted(true);
    setSaving(false);
  }

  if (loading) return <div className={styles.loading}>بنجهّز التقييم…</div>;

  return (
    <form className={styles.feedbackForm} onSubmit={submitFeedback} dir="rtl">
      <div className={styles.feedbackHeading}>
        <span className={styles.headingIcon}><Star size={18} /></span>
        <div>
          <h3>قيّم محادثة الدعم الفني</h3>
          <p>شاركنا رأيك في تجربتك مع فريق الدعم بعد انتهاء التذكرة.</p>
        </div>
      </div>

      {!profile?.user_id ? (
        <div className={styles.authNotice}>سجّل دخولك عشان تقدر تبعت تقييمك. <Link href="/auth/login">تسجيل الدخول</Link></div>
      ) : submitted ? (
        <div className={styles.submitted}><CheckCircle2 size={18} /> وصلنا تقييمك، شكرًا لمشاركتنا رأيك.</div>
      ) : (
        <>
          <div className={styles.ratingRow} role="group" aria-label="التقييم من نجمة إلى خمس نجوم">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" className={value <= rating ? styles.starActive : styles.starButton}
                onClick={() => setRating(value)} aria-label={`${value} من 5`} aria-pressed={rating === value}>
                <Star size={23} fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            <span>{rating ? `${rating} من 5` : 'اختار تقييمك'}</span>
          </div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} rows={3}
            placeholder="تحب تضيف ملاحظة عن الرد؟ (اختياري)" />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submitButton} type="submit" disabled={rating < 1 || saving}>
            <Send size={15} /> {saving ? 'جاري الإرسال…' : 'إرسال التقييم'}
          </button>
        </>
      )}
    </form>
  );
}
