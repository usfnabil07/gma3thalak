'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { signIn } from '@/services/supabase/auth';
import Swal from 'sweetalert2';
import styles from '../auth.module.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SiteLoader from '@/components/ui/SiteLoader';
import { useAuth } from '@/hooks/useAuth';

function getSafeNextUrl() {
  const requestedUrl = new URLSearchParams(window.location.search).get('next');
  if (!requestedUrl || !requestedUrl.startsWith('/') || requestedUrl.startsWith('//')) return '/';
  if (requestedUrl.startsWith('/auth/login') || requestedUrl.startsWith('/auth/register')) return '/';
  return requestedUrl;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace(getSafeNextUrl());
  }, [authLoading, router, user]);

  function validate() {
    if (!email.trim() || !password.trim()) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'من فضلك أدخل الإيميل وكلمة المرور.' });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading || user) {
      if (user) router.replace(getSafeNextUrl());
      return;
    }
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ في تسجيل الدخول', text: 'تأكد من الإيميل وكلمة المرور.' });
      return;
    }

    Swal.fire({ 
      icon: 'success', 
      title: 'أهلاً بك!', 
      text: 'تم تسجيل الدخول بنجاح.', 
      showConfirmButton: true,
      confirmButtonText: 'حسناً',
      customClass: { popup: 'alwaysLightAlert' },
    });
    router.replace(getSafeNextUrl());
  }

  if (authLoading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <SiteLoader size={120} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.splitPage}>
        <div className={styles.splitContainer}>
          
          {/* Form Side (Right in RTL) */}
          <div className={styles.formSide}>
            <div className={styles.splitHeader}>
              <h1 className={styles.splitTitle}>
                تسجيل الدخول
              </h1>
              <p className={styles.splitSub}>
                سجّل دخولك للوصول لمنصة جمّعتهالك
              </p>
              <p className={styles.splitLink}>
                ليس لديك حساب؟ <Link href="/auth/register">أنشئ حساباً الآن !</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.authForm} noValidate style={{ marginTop: '20px' }}>
              
              {/* Email */}
              <div className={styles.materialInputGroup} style={{ marginBottom: '32px' }}>
                <input
                  name="email"
                  type="email"
                  className={styles.materialInput}
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Mail size={18} className={styles.materialIcon} />
              </div>

              {/* Password */}
              <div className={styles.materialInputGroup} style={{ marginBottom: '40px' }}>
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className={styles.materialInput}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className={styles.materialEyeBtn} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <Lock size={18} className={styles.materialIcon} style={{ marginLeft: 5 }} />
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1.1rem', borderRadius: '8px' }}
                  disabled={loading}
                >
                  {loading ? 'جاري الدخول...' : 'تسجيل الدخول !'}
                </button>
              </div>
            </form>
          </div>

          {/* Image Side (Left in RTL) */}
          <div className={styles.imageSide}>
            <img 
              src="/images/login_illustration.png" 
              alt="Student Login Illustration" 
              className={styles.splitImage} 
              draggable={false}
              onError={(e) => {
                // Fallback if image not generated properly
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
