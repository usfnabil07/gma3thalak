'use client';

import { useEffect, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SiteLoader from '@/components/ui/SiteLoader';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push('/auth/login');
      } else if (profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'support') {
        setIsAuthorized(true);
      }
    }
  }, [profile, loading, router]);

  if (!loading && profile && profile.role !== 'admin' && profile.role !== 'superadmin' && profile.role !== 'support') {
    notFound();
  }

  if (loading || !isAuthorized) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SiteLoader size={200} />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)', 
        paddingTop: '140px', 
        paddingBottom: '80px',
        position: 'relative',
      }}>
        {children}
      </div>
      <Footer />
    </>
  );
}
