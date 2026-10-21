import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Mail, Lock, LogOut } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Swal from 'sweetalert2';
import styles from './SettingsTab.module.css';
import authStyles from '@/app/auth/auth.module.css';
import profileStyles from '@/app/profile/page.module.css';

export default function SettingsTab() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, [profile]);

  const persistSettings = async () => {
    if (!profile) return;

    // ── Validation ──────────────────────────────────────────────
    if (!fullName.trim()) {
      Swal.fire({
        title: 'تنبيه',
        text: 'الاسم لا يمكن أن يكون فارغاً، من فضلك اكتب اسمك.',
        icon: 'warning',
        confirmButtonText: 'حسناً',
      });
      return;
    }

    if (password && password.length < 6) {
      Swal.fire({
        title: 'تنبيه',
        text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
        icon: 'warning',
        confirmButtonText: 'حسناً',
      });
      return;
    }
    // ────────────────────────────────────────────────────────────

    setLoading(true);
    try {
      // 1. Update Profile (Name)
      const profileUpdates: any = {};
      if (fullName.trim() !== profile.full_name) profileUpdates.full_name = fullName.trim();

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', profile.id);
        if (error) throw error;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await refreshProfile();
      }

      // 2. Update Auth (Email / Password)
      const authUpdates: { email?: string; password?: string } = {};

      const { data } = await supabase.auth.getUser();
      if (email.trim() && email.trim() !== data.user?.email) {
        authUpdates.email = email.trim();
      }

      if (password) {
        authUpdates.password = password;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          // Supabase returns this error when the new password is identical to the old one
          if (authError.message.toLowerCase().includes('different from the old password') ||
              authError.message.toLowerCase().includes('same password')) {
            Swal.fire({
              title: 'تنبيه',
              text: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.',
              icon: 'warning',
              confirmButtonText: 'حسناً',
            });
            return;
          }
          throw authError;
        }
      }

      Swal.fire({
        title: 'نجاح',
        text: 'تم تحديث البيانات بنجاح!',
        icon: 'success',
        showConfirmButton: false,
        timer: 1500
      });
      setPassword('');
    } catch (err: any) {
      Swal.fire({
        title: 'خطأ',
        text: 'حدث خطأ أثناء حفظ البيانات: ' + err.message,
        icon: 'error',
        showConfirmButton: true,
        confirmButtonText: 'حسناً',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader}>
        <div className={profileStyles.headerIcon}>
          <Settings size={20} />
        </div>
        <h2 className={profileStyles.sectionHeaderTitle}>الإعدادات</h2>
      </div>

      <div className={styles.settingsContainer}>
        
        <section className={styles.settingsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconWrapper}>
              <User size={20} />
            </div>
            <h3 className={styles.sectionTitle}>عدل بياناتك الشخصية</h3>
          </div>
          
          <div style={{ marginTop: '24px', maxWidth: '600px' }}>
            <div className={authStyles.materialInputGroup} style={{ marginBottom: '32px' }}>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={authStyles.materialInput} 
                placeholder="اكتب اسمك بالكامل"
              />
              <User size={18} className={authStyles.materialIcon} />
            </div>

            <div className={authStyles.materialInputGroup} style={{ marginBottom: '32px' }}>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={authStyles.materialInput} 
                placeholder="اكتب إيميلك"
              />
              <Mail size={18} className={authStyles.materialIcon} />
            </div>

            <div className={authStyles.materialInputGroup} style={{ marginBottom: '32px' }}>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={authStyles.materialInput} 
                placeholder="اكتب الباسورد الجديد، أو سيبه فاضي لو مش هتغيّره"
              />
              <Lock size={18} className={authStyles.materialIcon} />
            </div>

          </div>
          
          <div className={styles.saveBtnWrapper} style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '32px' }}>
            <button 
              className={`btn btn-primary ${styles.saveBtn}`}
              style={{ margin: 0 }}
              onClick={persistSettings}
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
