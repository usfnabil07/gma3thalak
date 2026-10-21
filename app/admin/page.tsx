'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Users, BarChart3, Database, Bell, FileText, Ticket, MessageSquareText } from 'lucide-react';
import { getFaculties } from '@/services/supabase/data';
import { Faculty } from '@/types';
import styles from '@/components/admin/Admin.module.css';
import SuperAdminTabs from '@/components/admin/SuperAdminTabs';
import FacultyAdminTabs from '@/components/admin/FacultyAdminTabs';

export type AdminTabType = 'stats' | 'users' | 'faculties' | 'courses' | 'materials' | 'announcements' | 'tickets' | 'feedback';

export default function AdminDashboardPage() {
  const { profile, isSuperAdmin, isSupport } = useAuth();
  
  // Default tab based on role
  const [activeTab, setActiveTab] = useState<AdminTabType | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [superAdminSelectedFacultyId, setSuperAdminSelectedFacultyId] = useState<string>('');

  useEffect(() => {
    if (profile && activeTab === null) {
      setActiveTab(isSuperAdmin ? 'stats' : isSupport ? 'users' : 'courses');
    }
  }, [profile, isSuperAdmin, isSupport, activeTab]);

  useEffect(() => {
    if (isSuperAdmin && (activeTab === 'courses' || activeTab === 'materials')) {
      getFaculties().then(data => {
        setFaculties(data);
        if (data.length > 0 && !superAdminSelectedFacultyId) {
          setSuperAdminSelectedFacultyId(data[0].id);
        }
      });
    }
  }, [isSuperAdmin, activeTab]);

  if (!profile) return null;

  const targetFacultyId = isSuperAdmin ? superAdminSelectedFacultyId : profile.faculty_id;

  return (
    <div className={styles.adminContainer}>
      
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>
          {isSuperAdmin ? 'لوحة تحكم السوبر أدمن' : isSupport ? 'لوحة الدعم الفني' : 'إدارة الكلية'}
        </div>
        
        {isSuperAdmin && (
          <>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={18} /> الإحصائيات
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'users' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} /> إدارة المستخدمين
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'faculties' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('faculties')}
            >
              <Database size={18} /> إدارة الكليات
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'announcements' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Bell size={18} /> الإعلامات
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'feedback' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquareText size={18} /> التقييمات والآراء
            </button>
          </>
        )}

        {isSupport && (
          <>
            <button className={`${styles.tabBtn} ${activeTab === 'users' ? styles.activeTab : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={18} /> المستخدمون
            </button>
            <button className={`${styles.tabBtn} ${activeTab === 'tickets' ? styles.activeTab : ''}`} onClick={() => setActiveTab('tickets')}>
              <Ticket size={18} /> التذاكر
            </button>
          </>
        )}

        {!isSupport && !isSuperAdmin && profile.role === 'admin' && profile.faculty_id && (
          <button
            className={`${styles.tabBtn} ${activeTab === 'announcements' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <Bell size={18} /> الإعلامات
          </button>
        )}

        {/* Regular Admin (and SuperAdmin can see these too) */}
        {!isSupport && (isSuperAdmin || profile.faculty_id) && (
          <>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'courses' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('courses')}
            >
              <BookOpen size={18} /> المواد الدراسية
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'materials' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <FileText size={18} /> المحتوى العلمي
            </button>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        {(isSuperAdmin || isSupport || (profile.role === 'admin' && activeTab === 'announcements')) && (
          <SuperAdminTabs
            activeTab={activeTab ?? ''}
            supportMode={isSupport}
            canAssignCourses={isSuperAdmin || isSupport}
            canManageAnnouncements={isSuperAdmin}
            announcementOwnerId={profile.user_id}
            announcementScope={!isSuperAdmin && profile.role === 'admin' && profile.faculty_id
              ? { facultyId: profile.faculty_id, year: profile.year }
              : undefined}
          />
        )}
        
        {!isSupport && (activeTab === 'courses' || activeTab === 'materials') && targetFacultyId && (
          <div className="fade-up">
            {isSuperAdmin && (
              <div className={styles.sectionCard} style={{ marginBottom: 24, padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <p style={{ fontWeight: 800, color: 'var(--text-dark)' }}>أنت تتحكم الآن في كلية:</p>
                  <select 
                    className="input" 
                    style={{ width: 250, margin: 0 }}
                    value={superAdminSelectedFacultyId}
                    onChange={(e) => setSuperAdminSelectedFacultyId(e.target.value)}
                  >
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name_ar}</option>)}
                  </select>
                </div>
              </div>
            )}
            <FacultyAdminTabs activeTab={activeTab} facultyId={targetFacultyId} adminYear={isSuperAdmin ? undefined : profile.year} />
          </div>
        )}
      </main>

    </div>
  );
}
