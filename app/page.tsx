'use client';

import SiteLoader from '@/components/ui/SiteLoader';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Calculator, BookOpen, Shield, Users, Sparkles, ArrowLeft, Play, CheckCircle, Library } from 'lucide-react';
import Wave from '@/components/wave/Wave';
import Navbar from '@/components/layout/Navbar';
import styles from './page.module.css';

// SVG Icons for Footer (Avoiding lucide-react brand icon missing issues)
const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
  </svg>
);

const features = [
  {
    imageSrc: '/images/icons/3d-book.webp',
    title: 'مكتبة المواد',
    desc: 'صور وفيديوهات وملفات PDF وروابط مفيدة لكل مادة في كليتك لتبسيط المذاكرة.',
  },
  {
    imageSrc: '/images/icons/3d-calculator.webp',
    title: 'حاسبة GPA ذكية',
    desc: 'احسب تقديرك الفصلي والتراكمي تلقائياً وبدقة حسب لائحة كليتك.',
  },
  {
    imageSrc: '/images/icons/3d-target.webp',
    title: 'خطة دراسية',
    desc: 'نظّم جدولك وموادك، وتابع مهامك وغيابك أولاً بأول.',
  },
  {
    imageSrc: '/images/icons/3d-shield.webp',
    title: 'بروفايل آمن',
    desc: 'بياناتك ودرجاتك خاصة بك وحدك ولا يمكن لمسؤولي المنصة الاطلاع عليها.',
  },
];

const benefits = [
  'حساب GPA فوري ودقيق',
  'لوائح تقدير مخصصة لكل كلية',
  'مكتبة محتوى شاملة',
  'متاح 24/7 من أي جهاز',
];

export default function LandingPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) router.replace('/courses');
  }, [loading, profile, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scrollPos = sessionStorage.getItem('landing_scroll_pos');
      if (scrollPos) {
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'manual';
        }

        window.scrollTo(0, 0);

        setTimeout(() => {
          window.scrollTo({
            top: parseInt(scrollPos, 10),
            behavior: 'smooth'
          });
          sessionStorage.removeItem('landing_scroll_pos');
        }, 500);
      }

      const handleBeforeUnload = () => {
        sessionStorage.setItem('landing_scroll_pos', window.scrollY.toString());
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SiteLoader />
      </div>
    );
  }

  if (profile) return null;

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ================= HERO SECTION (Split Blob Layout) ================= */}
      <section className={styles.heroSection}>
        <div className={`container ${styles.heroContainer}`}>

          {/* Text Side (Right in RTL) */}
          <div className={`fade-up ${styles.heroText}`}>
            <h1 className={styles.heroTitle}>
              منصة <span className={styles.heroAccent}>جمعتهالك</span>
            </h1>
            <p className={styles.heroSubtitle}>
              منصة بها كل ما يحتاجه طلاب جامعة بدر أسيوط ليتفوقوا
            </p>


          </div>

          {/* Visual Side (Left in RTL) */}
          <div className={`fade-in ${styles.heroVisual}`}>
            <img
              src="/student-success-illustration.webp"
              alt="طالب متفوق"
              className={styles.heroImage3D}
            />

          </div>
        </div>


      </section>


      {/* ===== FEATURES ===== */}
      <section className={`section ${styles.featuresSection}`} id="features">
        <div className="container">
          <div className={styles.sectionHead}>
            <div className={styles.distinctTitleWrapper}>
              <h2 className={styles.distinctTitle}>
                <span className={styles.word1}>أهم</span>
                <span className={styles.word2}>مميزاتنا</span>
              </h2>
              <svg className={styles.curvedLine} viewBox="0 0 400 40" preserveAspectRatio="none">
                <path d="M 0 35 Q 200 0 400 35" fill="none" stroke="var(--secondary)" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className={styles.mainTitle}>
              كل ما تحتاجه في مكان واحد
            </h3>
            <p className={styles.mainDesc}>
              صممنا المنصة لتكون رفيقك الأكاديمي المثالي طوال مسيرتك في جامعة بدر
            </p>
          </div>

          <div className="grid-2">
            {features.map((feat) => (
              <div key={feat.title} className={styles.featureCard}>
                <img src={feat.imageSrc} alt={feat.title} className={styles.featIconImage} />
                <h3 className={styles.featTitle}>{feat.title}</h3>
                <p className={styles.featDesc}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STUDY ANYWHERE ===== */}
      <section className={styles.journeySection} aria-label="محتار وبتدور على الماتريالز">
        <div className="container">
          <div className={styles.studyBanner}>
            {/* Elegant Background Waves */}
            <div className={styles.studyDeco}>
              <svg viewBox="0 0 1440 600" preserveAspectRatio="none">
                <path fill="rgba(255,255,255,0.02)" d="M0,400 C200,600 500,100 1440,300 L1440,600 L0,600 Z"></path>
                <path fill="rgba(255,255,255,0.04)" d="M0,250 C400,50 800,550 1440,250 L1440,600 L0,600 Z"></path>
                <path fill="rgba(255,255,255,0.03)" d="M0,500 C300,300 700,700 1440,400 L1440,600 L0,600 Z"></path>
              </svg>
            </div>

            <div className={styles.studyContent}>
              <h2 className={styles.studyTitle}>
                <span>لسه محتار وبتدور على</span>
                <strong>الماتريالز؟</strong>
              </h2>
              <p className={styles.studyDesc}>
                <span>
                  تايه وسط جروبات الدفعة بتدور على المحاضرات، الشيتات، والامتحانات؟ أو محتار إزاي تحسب الـ GPA وتتابع غيابك وجدولك الأكاديمي؟
                </span>
                <span>
                  بدل ما تضيع وقتك وتتشتت في أكتر من مكان، إحنا وفرنا عليك اللفة دي كلها، وعشان كده...
                </span>
              </p>
              <Link href="/courses" className={styles.studyButton}>جمعتهالك</Link>
            </div>
            <div className={styles.studyVisual}>
              <img src="/bua-campus-overview.webp" alt="" className={styles.studyImage} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== JOIN TEAM SECTION (Bassthalk Style) ===== */}
      <section className={styles.joinTeamSection}>
        <div className="container">
          <div className={styles.joinTeamCard}>

            {/* Right side (Text Content) */}
            <div className={styles.joinTeamContent}>
              <h2 className={styles.joinTeamTitle}>عايز تنضم لينا في فريق<br />جمعتهالك ؟</h2>
              <p className={styles.joinTeamDesc}>
                يمكنك الآن الانضمام لفريق جمعتهالك، والمشاركة في إضافة المواد التعليمية للصفوف، ومساعدة زمايلك، والمساهمة في تطوير المنصة بأفضل طريقة ممكنة!
              </p>
              <a href="https://www.facebook.com/youssefnabil761/" target="_blank" rel="noopener noreferrer" className={styles.joinTeamBtn}>
                تواصل معنا للإنضمام
              </a>
            </div>

            {/* Left side (Visual with slanted background) */}
            <div className={styles.joinTeamVisual}>
              <img src="/joinus.webp" alt="Join Team" className={styles.joinTeamImage} />
            </div>

          </div>
        </div>
      </section>



      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>

            {/* Logo area */}
            <div className={styles.footerBrand}>
              <div className={styles.footerLogoLarge}>
                <img src="/bua-logo.png" alt="بوابة طلاب BUA" className={styles.footerLogoImage} draggable={false} />
              </div>
            </div>

            {/* Social Icons */}
            <div className={styles.socialIcons}>
              <a href="https://www.instagram.com/gm3thalak/" target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.instagram}`} aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61591121983916" target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.facebook}`} aria-label="Facebook">
                <FacebookIcon />
              </a>
            </div>

            {/* Love Message & Developer Credit */}
            <div className={styles.footerBottomArea}>
              <p className={styles.loveMessage}>
                صُنع بكل حب ليكون رفيق طلاب جامعة بدر أسيوط في رحلتهم الأكاديمية
              </p>
              <p className={styles.developerCredit} dir="ltr">
                Developed by <a href="https://www.facebook.com/youssefnabil761/" target="_blank" rel="noopener noreferrer" dir="ltr" style={{ display: 'inline-block' }}>&lt;Youssef Nabil&gt;</a>
              </p>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
