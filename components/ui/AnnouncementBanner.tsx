'use client';

import { useState, useEffect } from 'react';
import { getPublicAnnouncements } from '@/services/supabase/data';
import { Announcement } from '@/types';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import styles from './AnnouncementBanner.module.css';

// Keep dismissals across client-side navigation; reset them on a hard refresh.
const dismissedAnnouncementIds = new Set<string>();

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const { profile, loading: authLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || !profile || (pathname && pathname.startsWith('/auth/'))) return;

    let cancelled = false;
    const fetchAnnouncements = async () => {
      const activeAnnouncements = await getPublicAnnouncements(profile.faculty_id, profile.year);
      if (cancelled) return;
      const highestPriority = [...activeAnnouncements].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        || b.priority - a.priority
        || Number(Boolean(b.faculty_id)) - Number(Boolean(a.faculty_id))
      )[0] ?? null;
      setAnnouncement(highestPriority);
      setVisible(Boolean(highestPriority && !dismissedAnnouncementIds.has(highestPriority.id)));
    };
    void fetchAnnouncements();
    const refreshInterval = window.setInterval(() => void fetchAnnouncements(), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchAnnouncements();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [profile, authLoading, pathname]);

  if (!visible || !announcement || !profile || (pathname && pathname.startsWith('/auth/'))) return null;

  const handleDismiss = () => {
    dismissedAnnouncementIds.add(announcement.id);
    setVisible(false);
  };

  return (
    <div className={styles.bannerWrapper}>
      <div className={styles.banner}>
        <button className={styles.closeBtn} onClick={handleDismiss} title="إخفاء">
          <X size={18} />
        </button>
        <div className={styles.content}>
          <h3 className={styles.title}>{announcement.title}</h3>
          {announcement.subtitle && (
            <p className={styles.subtitle}>{announcement.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
