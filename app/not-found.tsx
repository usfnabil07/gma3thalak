import Link from 'next/link';
import { Rocket } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import authStyles from '@/app/auth/auth.module.css';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className={authStyles.splitPage} style={{ paddingTop: '120px' }}>
        <div className={authStyles.splitContainer}>
          
          {/* Content Side (Right in RTL) */}
          <div className={authStyles.formSide} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', fontWeight: 900, color: 'var(--text-dark)', lineHeight: 1 }}>4</span>
                <Rocket size={64} color="#8a2be2" style={{ transform: 'translateY(-5px) rotate(-10deg)' }} />
                <span style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', fontWeight: 900, color: 'var(--text-dark)', lineHeight: 1 }}>4</span>
              </div>
              <span style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 600, color: 'var(--text-dark)', letterSpacing: '2px' }}>
                NOT FOUND
              </span>
            </div>
            
            <div style={{ width: '70%', height: '2px', background: 'var(--border)', margin: '0 auto 32px' }} />
            
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
              عذراً و لكن هذه الصفحة غير موجودة علي الموقع !
            </p>
            
            <Link href="/" style={{ color: 'var(--secondary)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '6px', fontSize: '1.1rem' }}>
              العودة للصفحة الرئيسية!
            </Link>
            
          </div>

          {/* Image Side (Left in RTL) */}
          <div className={authStyles.imageSide}>
            <img 
              src="/images/login_illustration.png" 
              alt="404 Not Found" 
              className={authStyles.splitImage} 
              draggable={false}
            />
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
