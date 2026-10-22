'use client';


import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Menu, X, LogOut, Moon, Sun, User, Home, BookOpen, Settings, Calculator, TrendingUp, Save, Calendar, Shield, ClipboardCheck, UserPlus, LogIn, Target } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/supabase/auth';
import Swal from 'sweetalert2';
import styles from './Navbar.module.css';

import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import Image from 'next/image';
import { getUserNotifications, markNotificationAsRead, markNotificationsAsRead, updateUserNotificationContent } from '@/services/supabase/data';
import { UserNotification } from '@/types';

export default function Navbar() {
  const { profile, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [markAllReadDone, setMarkAllReadDone] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  useEffect(() => {
    let active = true;
    setNotifications([]);
    setMarkAllReadDone(false);
    const fetchNotifications = async () => {
      if (profile?.id) {
        const data = await getUserNotifications(profile.id);
        if (!active) return;

        const welcomeCopy = {
          title: 'أهلاً بيك في جمعتهالك 💙',
          message: 'عارفين إنك بتضيع وقت كتير وإنت بتدور على محاضرات وملخصات وامتحانات سابقة، وإن تنظيم جدولك ومتابعة درجاتك مش دايمًا سهل. عشان كده جمعنالك كل ده في مكان واحد. جمعتهالك 💙',
        };
        const oldWelcome = data.find((notification) =>
          notification.title.trim() === 'أهلاً بك في منصة جمعتهالك!' ||
          notification.title.trim() === 'أهلا بيك يا صديقي !' ||
          notification.title.trim() === 'اهلا بيك يا صديقي' ||
          notification.message.includes('نورت المنصة يا بطل!') ||
          notification.message.startsWith('هنا هتلاقي الماتريالز الخاصة بيك') ||
          (notification.title.trim() === welcomeCopy.title && notification.message !== welcomeCopy.message)
        );

        if (oldWelcome) {
          setNotifications(data.map((notification) =>
            notification.id === oldWelcome.id
              ? { ...notification, ...welcomeCopy }
              : notification
          ));
          void updateUserNotificationContent(profile.id, oldWelcome.id, welcomeCopy.title, welcomeCopy.message);
        } else {
          setNotifications(data);
        }
      }
    };
    fetchNotifications();

    return () => { active = false; };
  }, [profile?.id]);

  const handleMarkAsRead = async () => {
    if (!profile?.id || isMarkingAllRead || !notifications.some(notification => !notification.is_read)) return;

    setIsMarkingAllRead(true);
    const success = await markNotificationsAsRead(profile.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setMarkAllReadDone(true);
    }
    setIsMarkingAllRead(false);
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!profile?.id || notification.is_read) return;

    setNotifications(prev => prev.map(n => (
      n.id === notification.id ? { ...n, is_read: true } : n
    )));

    const success = await markNotificationAsRead(profile.id, notification.id);
    if (!success) {
      setNotifications(prev => prev.map(n => (
        n.id === notification.id ? { ...n, is_read: false } : n
      )));
    }
  };

  // Close profile and notif dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll Progress and State
  const { scrollYProgress } = useScroll();

  // Make the progress bar animation slower and smoother (fluid spring physics)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 250,  /* Higher stiffness makes it significantly faster */
    damping: 30,     /* Increased damping to prevent bouncy overshoot at high speeds */
    restDelta: 0.001
  });

  // High-performance scroll listener bypassing React state to fix the "jump" lag
  useEffect(() => {
    const handleScroll = () => {
      if (!navRef.current) return;

      if (window.scrollY > 10) {
        navRef.current.classList.add(styles.navbarScrolled);
        navRef.current.classList.remove(styles.navbarTop);
        if (progressRef.current) progressRef.current.classList.add(styles.progressVisible);
      } else {
        navRef.current.classList.add(styles.navbarTop);
        navRef.current.classList.remove(styles.navbarScrolled);
        if (progressRef.current) progressRef.current.classList.remove(styles.progressVisible);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hydration fix for next-themes
  useEffect(() => setMounted(true), []);

  async function logoutUser() {
    const result = await Swal.fire({
      title: 'تأكيد تسجيل الخروج',
      text: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، اخرج',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'alwaysLightAlert' }
    });

    if (result.isConfirmed) {
      await signOut();
      // Force a full page reload to clear all cached state, contexts, and memory
      window.location.href = '/';
    }
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <nav ref={navRef} className={`${styles.navbar} ${styles.navbarTop}`}>
        <div className={`container ${styles.navInner}`}>

          {/* Actions (Right) */}
          <div className={styles.authArea}>
            {loading ? (
              <span className={styles.authLoadingPlaceholder} aria-hidden="true" />
            ) : profile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className={styles.profileContainer} ref={profileRef}>
                  <button
                    className={styles.profileBtn}
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40">
                      <circle cx="16" cy="16" r="15" fill="var(--bg-secondary)" opacity="0.5" />
                      <path fill="var(--secondary)" opacity="0.2" d="M2.38,17.5A15,15,0,0,1,27.72,6.67,15,15,0,1,0,5.65,26.83,14.92,14.92,0,0,1,2.38,17.5Z" />
                      <path fill="#00b4d8" d="M16,31a15,15,0,0,0,11-4.83v-.39h0a11,11,0,0,0-21.91-1h0l-.06,1v.39A15,15,0,0,0,16,31Z" />
                      <path fill="#0096c7" d="M6.13,27v-.4l.07-.95h0a11.06,11.06,0,0,1,10.93-9.83,10.79,10.79,0,0,1,5.77,1.68A10.91,10.91,0,0,0,16,15,11.05,11.05,0,0,0,5.08,24.83h0l-.06,1v.39a15.3,15.3,0,0,0,3,2.47A16.22,16.22,0,0,1,6.13,27Z" />
                      <circle cx="16" cy="12" r="7" fill="#ffbfa3" />
                      <path fill="#f0a582" d="M10,12.75A7,7,0,0,1,20.67,6.8,7,7,0,1,0,12.33,18,7,7,0,0,1,10,12.75Z" />
                    </svg>
                  </button>

                  {profileOpen && (
                    <div className={styles.profileDropdown}>
                      <Link href="/" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Home size={15} />
                        </span>
                        <span>الصفحة الرئيسية</span>
                      </Link>

                      <div className={styles.dropdownDividerWrapper}><div className={styles.dropdownDivider} /></div>

                      <Link href="/profile?tab=main" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <User size={15} />
                        </span>
                        <span>أهلاً {profile.full_name}</span>
                      </Link>

                      <Link href="/profile?tab=courses" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <BookOpen size={15} />
                        </span>
                        <span>المواد الدراسية</span>
                      </Link>

                      <Link href="/profile?tab=schedule" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Calendar size={15} />
                        </span>
                        <span>الجدول الأكاديمي</span>
                      </Link>

                      <Link href="/profile?tab=gpa" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Calculator size={15} />
                        </span>
                        <span>النتائج التراكمية</span>
                      </Link>

                      <Link href="/profile?tab=plan" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Target size={15} />
                        </span>
                        <span>توقع المعدل</span>
                      </Link>

                      <Link href="/profile?tab=grades-wallet" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Save size={15} />
                        </span>
                        <span>حافظة الدرجات</span>
                      </Link>

                      <Link href="/profile?tab=attendance" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <ClipboardCheck size={15} />
                        </span>
                        <span>سجل الغياب</span>
                      </Link>

                      <Link href="/profile?tab=settings" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.dropdownIconWrapper}>
                          <Settings size={15} />
                        </span>
                        <span>الإعدادات</span>
                      </Link>

                      {(profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'support') && (
                        <Link href="/admin" target="_blank" rel="noopener noreferrer" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                          <span className={styles.dropdownIconWrapper}>
                            <Shield size={15} />
                          </span>
                          <span>{profile.role === 'support' ? 'لوحة الدعم الفني' : 'لوحة الإدارة'}</span>
                        </Link>
                      )}


                      <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={() => {
                        setProfileOpen(false);
                        logoutUser();
                      }}>
                        <span className={styles.dropdownIconWrapper}>
                          <LogOut size={15} />
                        </span>
                        <span>تسجيل خروج</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.profileContainer} ref={notifRef}>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      fontSize: '28px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                    title="الإشعارات"
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" className="iconify iconify--ph" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256">
                      <g fill="currentColor">
                        <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2"></path>
                        <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z"></path>
                      </g>
                    </svg>
                    {notifications.some(n => !n.is_read) && (
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid var(--bg-card)'
                      }} />
                    )}
                  </button>
                  {notifOpen && (
                    <div className={`${styles.profileDropdown} ${styles.notifDropdown}`} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                          الإشعارات
                        </h4>
                        <button
                          type="button"
                          onClick={handleMarkAsRead}
                          className={`${styles.markAllRead} ${markAllReadDone ? styles.markAllReadDone : ''}`}
                          disabled={isMarkingAllRead || !notifications.some(notification => !notification.is_read)}
                          aria-live="polite"
                        >
                          تحديد الكل كمقروء
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right' }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            لا توجد إشعارات حالياً
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} className={`${styles.dropdownItem} ${styles.notificationItem} ${notif.is_read ? '' : styles.unreadNotification}`}
                              onClick={() => handleNotificationClick(notif)}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)' }}>{notif.title}</h5>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: '1.5' }}>
                                  {notif.message}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  {new Date(notif.created_at).toLocaleDateString('ar-EG')}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.customAuthWrapper}>
                <Link href="/auth/register" className={styles.customRegisterBtn}>
                  <UserPlus size={18} />
                  <span>انشئ حسابك الان !</span>
                </Link>
                <Link href="/auth/login" className={styles.customLoginBtn}>
                  <LogIn size={18} className={styles.loginBtnIcon} />
                  <span>سجل <span className={styles.loginBtnAccent}>دخولك</span></span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle - Only shown when NOT logged in */}
            {!profile && (
              <button
                className={styles.menuToggle}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="القائمة"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>

          {/* Spacer to push Logo to the left */}
          <div className={styles.spacer} />

          {/* Left Side: Theme Toggle & Logo */}
          <div className={styles.leftSide}>
            {/* Dark Mode Sliding Toggle Switch (Premium Match) */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className={`${styles.themeToggleSwitch} ${resolvedTheme === 'dark' ? styles.isDark : styles.isLight}`}
                aria-label={resolvedTheme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                aria-pressed={resolvedTheme === 'dark'}
              >
                <div className={styles.themeThumb}>
                  {resolvedTheme === 'dark' ? (
                    <Moon size={13} className={styles.thumbIcon} />
                  ) : (
                    <Sun size={13} className={styles.thumbIcon} />
                  )}
                </div>
              </button>
            )}

          </div>

          {/* New Calligraphy Logo (Center on mobile, Left on Desktop) */}
          <Link href="/" className={styles.logo}>
            <img src="/bua-logo.png" alt="بدر" className={styles.buaLogoImg} />
          </Link>

        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <div className="container">
              <div className={styles.mobileMenuInner}>
                {loading ? (
                  <span className={styles.mobileAuthLoadingPlaceholder} aria-hidden="true" />
                ) : profile ? (
                  <div className={styles.mobileUserMenu}>
                    <span className={styles.mobileUserName}>مرحباً، {profile.full_name}</span>
                    <button
                      className="btn btn-outline"
                      onClick={() => { setMenuOpen(false); logoutUser(); }}
                    >
                      <LogOut size={16} /> تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className={styles.mobileAuthButtons}>
                    <Link href="/auth/register" className={styles.mobileRegisterBtn} onClick={() => setMenuOpen(false)}>
                      انشئ حسابك
                    </Link>
                    <Link href="/auth/login" className={styles.mobileLoginBtn} onClick={() => setMenuOpen(false)}>
                      تسجيل الدخول
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar Track & Fill (Slide Down Drawer) */}
        <div id="progress-wrapper" className={styles.progressTrackWrapper}>
          <div ref={progressRef} className={styles.progressTrack}>
            <motion.div
              className={styles.progressBar}
              style={{ scaleX: smoothProgress }}
            />
          </div>
        </div>

        {pathname && !pathname.startsWith('/admin') && <AnnouncementBanner />}
      </nav>
    </>
  );
}
