'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, Lock, User, IdCard, Eye, EyeOff, Building, Calendar, ArrowRight, Shield } from 'lucide-react';
import { signUp } from '@/services/supabase/auth';
import { getFaculties } from '@/services/supabase/data';
import { Faculty } from '@/types';
import Swal from 'sweetalert2';
import styles from '../auth.module.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SiteLoader from '@/components/ui/SiteLoader';
import { useAuth } from '@/hooks/useAuth';

const YEARS = [
  { value: 1, label: 'الفرقة الأولى' },
  { value: 2, label: 'الفرقة الثانية' },
  { value: 3, label: 'الفرقة الثالثة' },
  { value: 4, label: 'الفرقة الرابعة' },
  { value: 5, label: 'الفرقة الخامسة' },
  { value: 6, label: 'الفرقة السادسة' },
];

function getSafeNextUrl() {
  if (typeof window === 'undefined') return '/';
  const requestedUrl = new URLSearchParams(window.location.search).get('next');
  if (!requestedUrl || !requestedUrl.startsWith('/') || requestedUrl.startsWith('//')) return '/';
  if (requestedUrl.startsWith('/auth/login') || requestedUrl.startsWith('/auth/register')) return '/';
  return requestedUrl;
}

export default function RegisterPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    faculty_id: '',
    year: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [hasRegistered, setHasRegistered] = useState(false);
  const refreshedUserId = useRef<string | null>(null);
  const nextUrl = getSafeNextUrl();

  useEffect(() => {
    if (!user) refreshedUserId.current = null;
    if (!loading && !authLoading && user && !profile && refreshedUserId.current !== user.id) {
      refreshedUserId.current = user.id;
      void refreshProfile();
    }
  }, [loading, authLoading, user, profile, refreshProfile]);

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (!authLoading && !loading && profile && !hasRegistered) router.replace('/');
  }, [authLoading, loading, profile, hasRegistered, router]);

  useEffect(() => {
    getFaculties().then(setFaculties);
  }, []);

  if (!loading && (authLoading || (user && !profile) || (profile && !hasRegistered))) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <SiteLoader size={120} />
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function validate() {
    const { firstName, lastName, email, password, faculty_id, year } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !faculty_id || !year) {
      Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'من فضلك أكمل جميع الحقول.' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Swal.fire({ icon: 'warning', title: 'الإيميل مش مظبوط', text: 'اكتب إيميل صحيح وجرب تاني.' });
      return false;
    }
    if (password.length < 8) {
      Swal.fire({ icon: 'warning', title: 'كلمة مرور ضعيفة', text: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const full_name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    const { data, error } = await signUp(formData.email.trim(), formData.password, {
      full_name,
      student_id: '', // Student ID is no longer collected in registration
      faculty_id: formData.faculty_id,
      year: parseInt(formData.year),
    });
    if (error) {
      setLoading(false);
      const isInvalidEmail = /unable to validate email address|invalid format/i.test(error.message);
      Swal.fire({
        icon: 'error',
        title: isInvalidEmail ? 'الإيميل مش مظبوط' : 'خطأ',
        text: isInvalidEmail ? 'صيغة الإيميل مش صحيحة، راجعه وحاول تاني.' : error.message,
      });
      return;
    }

    // Sign-up emits an auth event before the new profile row is guaranteed to
    // be visible. Reload it after signUp has finished creating that row.
    if (data.session) {
      setHasRegistered(true);
      await refreshProfile();
    }
    setLoading(false);

    Swal.fire({
      icon: 'success',
      title: 'تم إنشاء حسابك بنجاح',
      text: 'اضغط حسنًا للاستمرار.',
      showConfirmButton: true,
      confirmButtonText: 'حسناً',
      customClass: { popup: 'alwaysLightAlert' },
    });
    router.replace(data.session ? nextUrl : '/auth/login');
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
                إنشاء حساب جديد
              </h1>
              <p className={styles.splitSub}>
                أهلاً بك! يرجى تعبئة البيانات التالية لإنشاء حسابك والانضمام إلينا.
              </p>
              <p className={styles.splitLink}>
                يوجد لديك حساب بالفعل؟ <Link href="/auth/login">ادخل إلى حسابك الآن !</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
              
              <div className="grid-2" style={{ gap: 32 }}>
              {/* First Name */}
              <div className={styles.materialInputGroup}>
                <input
                  name="firstName"
                  type="text"
                  className={styles.materialInput}
                  placeholder="الاسم"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <User size={18} className={styles.materialIcon} />
              </div>

              {/* Last Name */}
              <div className={styles.materialInputGroup}>
                <input
                  name="lastName"
                  type="text"
                  className={styles.materialInput}
                  placeholder="اللقب"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                <User size={18} className={styles.materialIcon} />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 32, marginTop: 16 }}>
              {/* Email */}
              <div className={styles.materialInputGroup}>
                <input
                  name="email"
                  type="email"
                  className={styles.materialInput}
                  placeholder="البريد الإلكتروني"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Mail size={18} className={styles.materialIcon} />
              </div>

                {/* Password */}
                <div className={styles.materialInputGroup}>
                  <input
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    className={styles.materialInput}
                    placeholder="كلمة المرور"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button type="button" className={styles.materialEyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <Lock size={18} className={styles.materialIcon} style={{ marginLeft: 5 }} />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 32, marginTop: 16 }}>
                {/* Faculty */}
                <div className={styles.materialInputGroup}>
                  <select
                    name="faculty_id"
                    className={styles.materialSelect}
                    value={formData.faculty_id}
                    onChange={handleChange}
                  >
                    <option value="" disabled hidden>الكلية</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>{f.name_ar}</option>
                    ))}
                  </select>
                  <Building size={18} className={styles.materialIcon} />
                </div>

                {/* Year */}
                <div className={styles.materialInputGroup}>
                  <select
                    name="year"
                    className={styles.materialSelect}
                    value={formData.year}
                    onChange={handleChange}
                  >
                    <option value="" disabled hidden>الفرقة الدراسية</option>
                    {YEARS.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                  <Calendar size={18} className={styles.materialIcon} />
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1.1rem', borderRadius: '8px' }}
                  disabled={loading}
                >
                  {loading ? 'جاري إنشاء الحساب...' : 'عمل حساب جديد !'}
                </button>
              </div>


            </form>
          </div>

          {/* Image Side (Left in RTL) */}
          <div className={styles.imageSide}>
            <img 
              src="/images/register_illustration.png" 
              alt="Student Illustration" 
              className={styles.splitImage} 
              draggable={false}
              onError={(e) => {
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
