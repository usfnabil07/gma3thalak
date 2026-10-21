import styles from '@/app/page.module.css';

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

export default function Footer() {
  return (
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
  );
}
