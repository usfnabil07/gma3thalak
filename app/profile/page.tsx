'use client';

import SiteLoader from '@/components/ui/SiteLoader';
import InlineLoader from '@/components/ui/InlineLoader';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getFaculties } from '@/services/supabase/data';
import { Faculty } from '@/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MainTab from '@/components/profile/MainTab';
import CoursesTab from '@/components/profile/CoursesTab';
import ScheduleTab from '@/components/profile/ScheduleTab';
import GPATab from '@/components/profile/GPATab';
import PlanTab from '@/components/profile/PlanTab';
import GradesWalletTab from '@/components/profile/GradesWalletTab';
import AttendanceTab from '@/components/profile/AttendanceTab';
import SettingsTab from '@/components/profile/SettingsTab';
import styles from './page.module.css';
import { STORAGE_KEYS } from '@/constants/config';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

type TabType = 'main' | 'courses' | 'schedule' | 'gpa' | 'plan' | 'grades-wallet' | 'attendance' | 'settings' | 'chat';
const TAB_VALUES: TabType[] = ['main', 'courses', 'schedule', 'gpa', 'plan', 'grades-wallet', 'attendance', 'settings', 'chat'];

function isTabType(value: string | null): value is TabType {
  return value !== null && TAB_VALUES.includes(value as TabType);
}

function ProfileContent() {
  const { profile, loading } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<TabType>('main');
  const urlTab = searchParams.get('tab');
  const activeTab = isTabType(urlTab) ? urlTab : selectedTab;

  useEffect(() => {
    if (!profile?.user_id) return;
    const savedTab = readAccountStorage(STORAGE_KEYS.PROFILE_TAB, profile.user_id);
    const tab = isTabType(urlTab) ? urlTab : isTabType(savedTab) ? savedTab : 'main';
    setSelectedTab(tab);
    writeAccountStorage(STORAGE_KEYS.PROFILE_TAB, profile.user_id, tab);

    if (!isTabType(urlTab)) {
      router.replace(`/profile?tab=${tab}`, { scroll: false });
    }
  }, [profile?.user_id, router, urlTab]);

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
    writeAccountStorage(STORAGE_KEYS.PROFILE_TAB, profile?.user_id, tab);
    router.replace(`/profile?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (!loading && !profile) router.push('/auth/login');
  }, [loading, profile, router]);

  useEffect(() => {
    getFaculties().then(setFaculties);
  }, []);

  if (loading || !profile || faculties.length === 0) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><SiteLoader /></div>;
  }

  const faculty = faculties.find((f) => f.id === profile.faculty_id);

  // Helper to get active class
  const getTabClass = (tab: TabType) => {
    return `${styles.menuItem} ${activeTab === tab ? styles.menuItemActive : ''}`;
  };

  return (
    <div className={styles.profilePage}>
      <Navbar />

      <main className={`container ${styles.mainContainer}`}>

        {/* Light Blue Banner */}
        <div className={styles.topBanner}></div>

        <div className={styles.mainCard} dir="rtl">

          {/* Right Sidebar Menu */}
          <div className={styles.sidebar}>
            <button className={getTabClass('main')} onClick={() => handleTabChange('main')}>
              البيانات الشخصية
            </button>
            <button className={getTabClass('courses')} onClick={() => handleTabChange('courses')}>
              المواد الدراسية
            </button>
            <button className={getTabClass('schedule')} onClick={() => handleTabChange('schedule')}>
              الجدول الأكاديمي
            </button>
            <button className={getTabClass('gpa')} onClick={() => handleTabChange('gpa')}>
              النتائج التراكمية
            </button>
            <button className={getTabClass('plan')} onClick={() => handleTabChange('plan')}>
              توقع المعدل
            </button>
            <button className={getTabClass('grades-wallet')} onClick={() => handleTabChange('grades-wallet')}>
              حافظة الدرجات
            </button>
            <button className={getTabClass('attendance')} onClick={() => handleTabChange('attendance')}>
              سجل الغياب
            </button>
            <button className={getTabClass('settings')} onClick={() => handleTabChange('settings')}>
              الإعدادات
            </button>
          </div>

          {/* Left Content Area (Dynamic based on selected tab) */}
          {activeTab === 'main' && <MainTab profile={profile} faculty={faculty} />}
          {activeTab === 'courses' && <CoursesTab profile={profile} />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'gpa' && <GPATab faculty={faculty} />}
          {activeTab === 'plan' && <PlanTab faculty={faculty} />}
          {activeTab === 'grades-wallet' && <GradesWalletTab />}
          {activeTab === 'attendance' && <AttendanceTab />}
          {activeTab === 'settings' && <SettingsTab />}

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><InlineLoader text="جاري فتح البروفايل..." /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
