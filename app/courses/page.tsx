'use client';

import SiteLoader from '@/components/ui/SiteLoader';
import InlineLoader from '@/components/ui/InlineLoader';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Video, FileText, Link as LinkIcon, ChevronDown, CheckCircle, Calendar, Layers, FolderOpen, Play, Pause, PlayCircle, Info, Wrench, Image as ImageIcon, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download, Headphones } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import { getCourses, getMaterials, getCourseSections, getMaterialGroups } from '@/services/supabase/data';
import { Course, Material, CourseSection, MaterialGroup, MaterialType } from '@/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { FALLBACKS } from '@/constants/config';
import VideoPlayer from '@/components/ui/VideoPlayer';
import styles from './page.module.css';

const TYPE_ICONS = {
  video: Video,
  audio: Headphones,
  image: ImageIcon,
  file: FileText,
  link: LinkIcon,
};

const YEAR_ORDINALS = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getVideoEmbedType(url: string): 'youtube' | 'local' | 'other' {
  if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(url)) return 'youtube';
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('supabase')) return 'local';
  return 'other';
}

import { Suspense } from 'react';

function MaterialImageFrame({
  url,
  title,
  isFetching,
}: {
  url: string;
  title: string;
  isFetching?: boolean;
}) {
  const frameRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
    } catch {
      // Fullscreen is optional; the image remains available in the inline frame.
    }
  };

  const downloadImage = async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Image download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const safeTitle = title.trim().replace(/[\\/:*?"<>|]/g, '-') || 'material-image';
      link.href = objectUrl;
      link.download = `${safeTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section ref={frameRef} className={styles.imageViewer} aria-label={`عارض الصورة: ${title}`}>
      <div className={styles.imageViewerStage}>
        {isFetching ? (
          <div className={styles.imageViewerLoading}><span className={styles.imageViewerSpinner} />جاري تحميل الصورة...</div>
        ) : imageError ? (
          <div className={styles.imageViewerLoading}>تعذر تحميل الصورة. حاول فتحها مرة أخرى.</div>
        ) : url ? (
          <Image
            src={url}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 1000px"
            className={styles.imageViewerImage}
            style={{ transform: `scale(${zoom})` }}
            onError={() => setImageError(true)}
          />
        ) : null}
      </div>
      <div className={styles.imageViewerToolbar} dir="rtl">
        <strong className={styles.imageViewerTitle} title={title}>{title}</strong>
        <div className={styles.imageViewerActions}>
          <button type="button" className={styles.imageViewerButton} onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="ملاءمة الصورة" title="ملاءمة الصورة">
            <RotateCcw size={17} />
          </button>
          <button type="button" className={styles.imageViewerButton} onClick={() => setZoom(value => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))} disabled={zoom <= 0.5} aria-label="تصغير الصورة" title="تصغير الصورة">
            <ZoomOut size={18} />
          </button>
          <span className={styles.imageZoomValue}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={styles.imageViewerButton} onClick={() => setZoom(value => Math.min(3, Math.round((value + 0.25) * 100) / 100))} disabled={zoom >= 3} aria-label="تكبير الصورة" title="تكبير الصورة">
            <ZoomIn size={18} />
          </button>
          <button type="button" className={styles.imageViewerButton} onClick={downloadImage} disabled={!url || isFetching} aria-label="تنزيل الصورة" title="تنزيل الصورة">
            <Download size={17} />
          </button>
          <a className={styles.imageViewerButton} href={url || undefined} target="_blank" rel="noopener noreferrer" aria-label="فتح الصورة الأصلية" title="فتح الصورة الأصلية" aria-disabled={!url || isFetching}>
            <ExternalLink size={17} />
          </a>
          <button type="button" className={styles.imageViewerButton} onClick={toggleFullscreen} aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'} title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
    </section>
  );
}

function MaterialAudioFrame({ url, title, isFetching }: { url: string; title: string; isFetching?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <section className={styles.audioViewer} dir="rtl" aria-label={`مشغل التسجيل الصوتي: ${title}`}>
      <strong className={styles.audioTitle} title={title}>{title}</strong>
      {isFetching ? (
        <div className={styles.audioLoading}><span className={styles.imageViewerSpinner} />جاري تجهيز التسجيل الصوتي...</div>
      ) : (
        <>
          <audio
            ref={audioRef}
            className={styles.audioElement}
            src={url}
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            متصفحك لا يدعم تشغيل الملفات الصوتية.
          </audio>
          <div className={styles.audioControls} dir="ltr">
            <button
              type="button"
              className={styles.audioPlayButton}
              onClick={togglePlayback}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'إيقاف التسجيل مؤقتاً' : 'تشغيل التسجيل'}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <div className={styles.audioTimeline}>
              <input
                className={styles.audioSeek}
                type="range"
                min={0}
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seekTo(Number(event.target.value))}
                disabled={!duration}
                aria-label="موضع التشغيل"
              />
              <div className={styles.audioTime}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MaterialsPageContent() {
  const { profile, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [materialsLoadedForCourse, setMaterialsLoadedForCourse] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string; id: string; isFetching?: boolean } | null>(null);
  const [activeImage, setActiveImage] = useState<{ url: string; title: string; id: string; isFetching?: boolean } | null>(null);
  const [activeAudio, setActiveAudio] = useState<{ url: string; title: string; id: string; isFetching?: boolean } | null>(null);
  const mediaViewerRef = useRef<HTMLDivElement>(null);
  
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});
  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({});
  const [expandedMaterialGroups, setExpandedMaterialGroups] = useState<Record<string, boolean>>({});
  const [viewedMaterials, setViewedMaterials] = useState<Set<string>>(new Set());
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [readyToPersistViewKey, setReadyToPersistViewKey] = useState<string | null>(null);
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const viewedStorageKey = profile?.user_id ? `bua_viewed_materials_${profile.user_id}` : null;
  const courseViewKey = profile?.user_id && courseIdParam
    ? `bua_course_view_${profile.user_id}_${courseIdParam}`
    : null;
  const restoredViewKeyRef = useRef<string | null>(null);
  const previousCourseViewKeyRef = useRef<string | null>(null);
  const activeMaterialId = activeVideo?.id || activeImage?.id || activeAudio?.id || null;

  useEffect(() => {
    if (!viewedStorageKey) {
      setViewedMaterials(new Set());
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(viewedStorageKey) || '[]');
      setViewedMaterials(new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []));
    } catch {
      setViewedMaterials(new Set());
    }
  }, [viewedStorageKey]);

  useEffect(() => {
    if (!viewedStorageKey) return;

    const syncViewedMaterials = (event: StorageEvent) => {
      if (event.key !== viewedStorageKey) return;
      try {
        const saved = JSON.parse(event.newValue || '[]');
        setViewedMaterials(new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []));
      } catch {
        setViewedMaterials(new Set());
      }
    };

    window.addEventListener('storage', syncViewedMaterials);
    return () => window.removeEventListener('storage', syncViewedMaterials);
  }, [viewedStorageKey]);

  const toggleModule = (moduleId: string) => {
    const isClosing = !!expandedModules[moduleId];
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));

    if (isClosing) {
      const sectionMaterialIds = new Set(materials
        .filter(material => material.section_id === moduleId)
        .map(material => material.id));
      const sectionGroupIds = new Set(materialGroups
        .filter(group => group.section_id === moduleId)
        .map(group => group.id));

      setExpandedMaterials(prev => Object.fromEntries(
        Object.entries(prev).filter(([materialId]) => !sectionMaterialIds.has(materialId))
      ));
      setExpandedMaterialGroups(prev => Object.fromEntries(
        Object.entries(prev).filter(([groupId]) => !sectionGroupIds.has(groupId))
      ));
    }
  };

  const toggleMaterial = (matId: string) => {
    setExpandedMaterials((prev) => ({
      ...prev,
      [matId]: !prev[matId]
    }));
  };

  const toggleMaterialGroup = (groupId: string) => {
    setExpandedMaterialGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleMaterialAction = async (e: React.MouseEvent | null, matId: string, url: string, type: MaterialType, title: string) => {
    e?.stopPropagation();
    if (type !== 'audio') setActiveAudio(null);
    
    setViewedMaterials((prev) => {
      const newSet = new Set(prev);
      newSet.add(matId);
      return newSet;
    });

    if (viewedStorageKey) {
      try {
        const saved = JSON.parse(localStorage.getItem(viewedStorageKey) || '[]');
        const next = new Set<string>(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
        next.add(matId);
        localStorage.setItem(viewedStorageKey, JSON.stringify([...next]));
      } catch {
        try {
          localStorage.setItem(viewedStorageKey, JSON.stringify([matId]));
        } catch {
          // Keep the in-memory viewed state if browser storage is unavailable.
        }
      }
    }

    if (type === 'video') {
      // Immediately set the active video state with a loading flag and scroll to it
      setActiveImage(null);
      setActiveAudio(null);
      setActiveVideo({ url: '', title, id: matId, isFetching: true });
      setTimeout(() => {
        mediaViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    if (type === 'image') {
      setActiveVideo(null);
      setActiveAudio(null);
      setActiveImage({ url: '', title, id: matId, isFetching: true });
      setTimeout(() => {
        mediaViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    if (type === 'audio') {
      setActiveVideo(null);
      setActiveImage(null);
      setActiveAudio({ url: '', title, id: matId, isFetching: true });
      setTimeout(() => {
        mediaViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    let finalUrl = url;
    const isYouTubeVideo = type === 'video' && getVideoEmbedType(url) === 'youtube';
    
    // If it's an internal file name (not starting with http) or an old supabase public URL, fetch signed URL
    if (!isYouTubeVideo && (!url.startsWith('http') || url.includes('supabase.co/storage/v1/object/public/materials_files/'))) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch(`/api/materials/signed-url?material_id=${matId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const data = await res.json();
        if (data.error) {
          alert('خطأ في جلب الملف: ' + data.error);
          if (type === 'video') setActiveVideo(null);
          if (type === 'image') setActiveImage(null);
          if (type === 'audio') setActiveAudio(null);
          return;
        }
        finalUrl = data.signedUrl;
      } catch (err) {
        alert('حدث خطأ أثناء الاتصال بالخادم');
        if (type === 'video') setActiveVideo(null);
        if (type === 'image') setActiveImage(null);
        if (type === 'audio') setActiveAudio(null);
        return;
      }
    }

    if (type === 'video') {
      const embedType = getVideoEmbedType(finalUrl);
      if (embedType === 'youtube' || embedType === 'local') {
        setActiveVideo({ url: finalUrl, title, id: matId, isFetching: false });
        return;
      }
    }

    if (type === 'image') {
      setActiveImage({ url: finalUrl, title, id: matId, isFetching: false });
      return;
    }

    if (type === 'audio') {
      setActiveAudio({ url: finalUrl, title, id: matId, isFetching: false });
      return;
    }

    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadMaterialVideo = async (materialId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`/api/materials/signed-url?material_id=${materialId}&download=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (!response.ok || !data.signedUrl) throw new Error(data.error || 'تعذر تجهيز رابط التحميل.');

      const anchor = document.createElement('a');
      anchor.href = data.signedUrl;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      alert('تعذر تحميل الفيديو. حاول مرة أخرى.');
    }
  };

  useEffect(() => {
    if (!loading && !profile) router.push('/auth/login');
  }, [loading, profile, router]);

  // Clear inline media when navigating to another course.
  useEffect(() => {
    setActiveVideo(null);
    setActiveImage(null);
    setActiveAudio(null);
    setReadyToPersistViewKey(null);
  }, [courseIdParam]);

  // Keep view state for a hard refresh while the course remains open, but discard it
  // when the user leaves the course so opening it again starts with a clean view.
  useEffect(() => {
    if (courseViewKey) {
      const previousKey = previousCourseViewKeyRef.current;
      if (previousKey && previousKey !== courseViewKey) {
        try { sessionStorage.removeItem(previousKey); } catch { /* Storage is optional. */ }
      }
      previousCourseViewKeyRef.current = courseViewKey;
      return;
    }

    if (courseIdParam) return;

    const previousKey = previousCourseViewKeyRef.current;
    if (!previousKey) return;
    try { sessionStorage.removeItem(previousKey); } catch { /* Storage is optional. */ }
    previousCourseViewKeyRef.current = null;
    restoredViewKeyRef.current = null;
    setExpandedModules({});
    setExpandedMaterials({});
    setExpandedMaterialGroups({});
  }, [courseViewKey, courseIdParam]);

  useEffect(() => {
    if (!profile) {
      setCoursesLoaded(false);
      return;
    }
    let cancelled = false;
    setCoursesLoaded(false);
    getCourses(profile.faculty_id, profile.year, profile.user_id).then((data) => {
      if (cancelled) return;
      setCourses(data);
      setCoursesLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setCourses([]);
      setCoursesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [profile]);

  useEffect(() => {
    if (courses.length > 0) {
      if (courseIdParam) {
        if (!selectedCourse || selectedCourse.id !== courseIdParam) {
          const courseToSelect = courses.find(c => c.id === courseIdParam);
          if (courseToSelect) {
            loadMaterialsForCourse(courseToSelect);
          }
        }
      } else {
        setSelectedCourse(null);
      }
    }
  }, [courseIdParam, courses]);

  async function loadMaterialsForCourse(course: Course) {
    setSelectedCourse(course);
    setLoadingMaterials(true);
    setMaterialsLoadedForCourse(null);
    setReadyToPersistViewKey(null);
    const [fetchedMaterials, fetchedSections, fetchedGroups] = await Promise.all([
      getMaterials(course.id),
      getCourseSections(course.id),
      getMaterialGroups(course.id),
    ]);
    setMaterials(fetchedMaterials);
    setSections(fetchedSections);
    setMaterialGroups(fetchedGroups);
    setMaterialsLoadedForCourse(course.id);
    setLoadingMaterials(false);
  }

  // Restore the course view only after its data is ready, avoiding any client-storage
  // reads during render (and therefore keeping server/client markup in sync).
  useEffect(() => {
    if (!courseViewKey || !courseIdParam || loadingMaterials || materialsLoadedForCourse !== courseIdParam) return;
    if (restoredViewKeyRef.current === courseViewKey) return;

    restoredViewKeyRef.current = courseViewKey;
    let saved: {
      expandedSections?: unknown;
      expandedMaterials?: unknown;
      expandedGroups?: unknown;
      activeMaterialId?: unknown;
    } = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(courseViewKey) || '{}');
    } catch {
      // Start with the default collapsed view if the saved state is unavailable.
    }

    const asExpandedMap = (value: unknown): Record<string, boolean> =>
      Array.isArray(value)
        ? Object.fromEntries(value.filter((id): id is string => typeof id === 'string').map(id => [id, true]))
        : {};

    const restoredSections = asExpandedMap(saved.expandedSections);
    const restoredMaterials = asExpandedMap(saved.expandedMaterials);
    const restoredGroups = asExpandedMap(saved.expandedGroups);
    const restoredMaterial = typeof saved.activeMaterialId === 'string'
      ? materials.find(material => material.id === saved.activeMaterialId)
      : undefined;

    if (restoredMaterial) {
      if (restoredMaterial.section_id) restoredSections[restoredMaterial.section_id] = true;
      if (restoredMaterial.group_id) restoredGroups[restoredMaterial.group_id] = true;
    }

    setExpandedModules(restoredSections);
    setExpandedMaterials(restoredMaterials);
    setExpandedMaterialGroups(restoredGroups);

    const canRestoreVideo = restoredMaterial?.type === 'video'
      && ['youtube', 'local'].includes(getVideoEmbedType(restoredMaterial.url));
    if (restoredMaterial && (canRestoreVideo || ['image', 'audio'].includes(restoredMaterial.type))) {
      void handleMaterialAction(null, restoredMaterial.id, restoredMaterial.url, restoredMaterial.type, restoredMaterial.title);
    }
    setReadyToPersistViewKey(courseViewKey);
  }, [courseViewKey, courseIdParam, loadingMaterials, materialsLoadedForCourse, materials]);

  useEffect(() => {
    if (!courseViewKey || readyToPersistViewKey !== courseViewKey) return;
    try {
      sessionStorage.setItem(courseViewKey, JSON.stringify({
        expandedSections: Object.keys(expandedModules).filter(id => expandedModules[id]),
        expandedMaterials: Object.keys(expandedMaterials).filter(id => expandedMaterials[id]),
        expandedGroups: Object.keys(expandedMaterialGroups).filter(id => expandedMaterialGroups[id]),
        activeMaterialId,
      }));
    } catch {
      // The page remains usable if session storage is unavailable.
    }
  }, [courseViewKey, readyToPersistViewKey, expandedModules, expandedMaterials, expandedMaterialGroups, activeMaterialId]);

  async function selectCourse(course: Course) {
    if (profile?.user_id) {
      try {
        sessionStorage.removeItem(`bua_course_view_${profile.user_id}_${course.id}`);
      } catch {
        // A course opened from the list should still start clean if storage is unavailable.
      }
    }
    restoredViewKeyRef.current = null;
    router.push(`/courses?courseId=${course.id}`, { scroll: true });
  }

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderMaterialItem = (mat: Material) => {
    const Icon = TYPE_ICONS[mat.type];
    const btnText = mat.type === 'video' ? 'مشاهدة الفيديو'
      : mat.type === 'audio' ? 'تشغيل الفويس'
      : mat.type === 'image' ? 'عرض الصورة'
      : mat.type === 'file' ? 'فتح الملف'
      : 'فتح الرابط';
    const isMatOpen = expandedMaterials[mat.id];
    const isViewed = viewedMaterials.has(mat.id);

    return (
      <div key={mat.id} className={`${styles.materialItemWrapper} ${isViewed ? styles.viewed : ''}`}>
        <div className={styles.materialItemHeader} onClick={() => toggleMaterial(mat.id)}>
          <div className={styles.materialItemLeft}>
            <div className={styles.materialItemIconWrapper}>
              <Icon size={22} className={styles.materialItemIcon} />
            </div>
            <div className={styles.materialItemTitle}>
              {isViewed && (
                <span className={`${styles.materialStatus} ${styles.viewedStatus}`} aria-label="تم الاطلاع">
                  <CheckCircle size={16} />
                </span>
              )}
              {mat.title}
            </div>
          </div>
          <div className={styles.materialItemRight}>
            <button
              className={styles.materialActionBtn}
              onClick={(event) => handleMaterialAction(event, mat.id, mat.url, mat.type, mat.title)}
            >
              {btnText}
            </button>
            <ChevronDown size={20} className={`${styles.materialChevron} ${isMatOpen ? styles.open : ''}`} />
          </div>
        </div>
        <div className={`${styles.materialBody} ${isMatOpen ? styles.open : ''}`}>
          <div className={styles.materialGridInner}>
            <div className={styles.materialPaddingWrapper}>
              {mat.description ? (
                <div className={styles.materialDescription} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Info size={16} className={styles.materialDescriptionIcon} />
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>الوصف: </span>
                    {mat.description}
                  </div>
                </div>
              ) : (
                <div className={styles.materialDescription} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
                  <Info size={16} className={styles.materialDescriptionIcon} />
                  <span style={{ fontStyle: 'italic' }}>لم يتم إضافة وصف</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sem1Courses = courses.filter(c => c.semester === 1);
  const sem2Courses = courses.filter(c => c.semester === 2);

  const renderSemesterGrid = (semCourses: Course[], semId: number) => {
    if (semCourses.length === 0) return (
      <>
        <div className={styles.emptyCoursesState}>
          <span className={styles.emptyCoursesIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32">
              <circle cx="11" cy="8" r="1" fill="currentColor"></circle>
              <circle cx="11" cy="16" r="1" fill="currentColor"></circle>
              <circle cx="11" cy="24" r="1" fill="currentColor"></circle>
              <path fill="currentColor" d="M24 3H8a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h10v-2H8v-6h18V5a2 2 0 0 0-2-2m0 16H8v-6h16Zm0-8H8V5h16Z"></path>
              <path fill="currentColor" d="M29 24.415L27.586 23L25 25.587L22.414 23L21 24.415L23.586 27L21 29.586L22.414 31L25 28.414L27.586 31L29 29.586L26.414 27z"></path>
            </svg>
          </span>
          <span>لسه مفيش مواد اتضافت</span>
        </div>
      </>
    );
    const isExpanded = expandedSemesters[semId];
    const displayedCourses = isExpanded ? semCourses : semCourses.slice(0, 6);

    return (
      <div className={styles.semesterSection}>

        <div className={styles.courseGrid}>
          {displayedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => selectCourse(course)}
            />
          ))}
        </div>

        {semCourses.length > 6 && (
          <div className={styles.showMoreContainer}>
            <button 
              className={styles.showMoreBtn}
              onClick={() => setExpandedSemesters(prev => ({ ...prev, [semId]: !isExpanded }))}
            >
              <span>{isExpanded ? 'عرض مواد أقل' : 'عرض باقي المواد'}</span>
              <ChevronDown 
                size={18} 
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} 
              />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><SiteLoader /></div>;
  }

  // When a course ID is in the URL, never show the course catalog while the
  // list is loading or while the matching course is being selected.
  if (courseIdParam && (!coursesLoaded || !selectedCourse || selectedCourse.id !== courseIdParam)) {
    const courseExists = courses.some((course) => course.id === courseIdParam);
    if (coursesLoaded && !courseExists) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--color-bg)' }}>
          <div style={{ textAlign: 'center' }}>
            <h1>الكورس غير متاح</h1>
            <p>الرابط قد يكون غير صحيح أو لم يعد لديك صلاحية الوصول لهذا الكورس.</p>
            <Link href="/courses">العودة إلى الكورسات</Link>
          </div>
        </div>
      );
    }
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}><InlineLoader text="جاري فتح الكورس..." /></div>;
  }

  return (
    <div className={styles.matPage}>
      <Navbar />
      <main className="container" style={{ minHeight: '100vh', paddingTop: 160, paddingBottom: 80 }}>
        {!selectedCourse && (
          <>
            <div className={styles.sectionHead}>
              <div className={styles.distinctTitleWrapper}>
                <h1 className={styles.distinctTitle}>
                  <span className={styles.word1}>أهلاً يا</span>
                  <span className={styles.word2}>{profile.full_name?.trim().split(/\s+/)[0] || 'بطل'}</span>
                </h1>
                <svg className={styles.curvedLine} viewBox="0 0 400 40" preserveAspectRatio="none">
                  <path d="M 0 35 Q 200 0 400 35" pathLength="1" fill="none" stroke="var(--secondary)" strokeWidth="7" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className={styles.mainTitle}>
                هنا هتلاقي موادك الدراسية لكلية {profile.faculty?.name_ar?.replace(/^كلية\s+/, '') || 'كليتك'} · الفرقة {YEAR_ORDINALS[profile.year] || profile.year}
              </h3>
              <p className={styles.mainDesc}>
                وكمان هتلاقي بعض الأدوات اللي هتساعدك تتابع دراستك وتنظمها.
              </p>
            </div>

            <section className={styles.studentHomeSummary} aria-label="أدواتك الدراسية">
              <div className={styles.studentSummaryIntro}>
                <h2 className={styles.studentSummaryLabel}>بعض أدواتك الدراسية</h2>
              </div>
              <nav className={styles.studentToolsGrid} aria-label="اختصارات الأدوات الدراسية">
                <Link href="/profile?tab=schedule" className={styles.studentTool}>
                  عرض الجدول
                </Link>

                <Link href="/profile?tab=gpa" className={styles.studentTool}>
                  حاسبة الـ GPA
                </Link>

                <Link href="/profile?tab=grades-wallet" className={styles.studentTool}>
                  حافظة الدرجات
                </Link>
              </nav>
            </section>
          </>
        )}

        {!selectedCourse ? (
          /* GRID VIEW: Always show term selector */
          <div>
            <div className={styles.termFilterCard} id="course-selector">
              <span className={styles.termFilterLabel}>اختار الترم الدراسي</span>
              <div className={styles.termChips}>
                <div
                  className={`${styles.termChip} ${activeSemester === 1 ? styles.termChipActive : ''}`}
                  onClick={() => setActiveSemester(1)}
                >
                  الترم الأول
                </div>
                <div
                  className={`${styles.termChip} ${activeSemester === 2 ? styles.termChipActive : ''}`}
                  onClick={() => setActiveSemester(2)}
                >
                  الترم الثاني
                </div>
              </div>
            </div>

            {!coursesLoaded ? (
              <InlineLoader text="جاري تحميل موادك الدراسية..." />
            ) : activeSemester === 1 ? (
              renderSemesterGrid(sem1Courses, 1)
            ) : (
              renderSemesterGrid(sem2Courses, 2)
            )}
          </div>
        ) : (
          <div className={styles.materialsArea}>
            {/* HERO SECTION */}
            <div className={styles.heroContainer}>
              <div className={styles.heroBgShape1}></div>
              <div className={styles.heroBgShape2}></div>

              <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>
                  <span>الترم {selectedCourse.semester}</span>
                  {selectedCourse.name_ar}
                </h1>
                {selectedCourse.features && selectedCourse.features.length > 0 ? (
                  <ul className={styles.heroDescList}>
                    {selectedCourse.features.map((feature, idx) => (
                      <li key={idx}>
                        <CheckCircle size={20} color="var(--secondary)" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ opacity: 0.5, fontStyle: 'italic', margin: '8px 0' }}>لم يتم إضافة مميزات لهذا الكورس</p>
                )}

                <div className={styles.heroBadges}>
                  <div className={styles.heroBadge}>
                    <Calendar size={16} />
                    تاريخ إنشاء الكورس: {selectedCourse.created_at ? new Date(selectedCourse.created_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد'}
                  </div>
                  <div className={`${styles.heroBadge} ${styles.accent}`}>
                    <Calendar size={16} />
                    آخر تحديث للكورس: {selectedCourse.updated_at ? new Date(selectedCourse.updated_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : (selectedCourse.created_at ? new Date(selectedCourse.created_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد')}
                  </div>
                </div>
              </div>

              {/* COURSE VISUAL / CARD */}
              <div className={styles.heroVisual}>
                <div className={styles.coverContainer}>
                  <div className={styles.innerCoverWrapper}>
                    <Image 
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      src={selectedCourse.image_url || FALLBACKS.COURSE_IMAGE} 
                      alt="Course Cover" 
                      className={styles.coverImage}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).srcset = '';
                        (e.currentTarget as HTMLImageElement).src = FALLBACKS.COURSE_IMAGE;
                      }}
                    />
                  </div>
                  <div className={styles.courseActions}>
                    <button className={styles.startCourseBtn}>
                      <PlayCircle size={20} />
                      ابدأ المذاكرة الآن
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* INLINE MATERIAL MEDIA VIEWER */}
            <div ref={mediaViewerRef} style={{ scrollMarginTop: '100px', marginBottom: '40px' }}>
              {activeVideo && (
                <VideoPlayer
                  url={activeVideo.url}
                  id={activeVideo.id}
                  userId={profile?.user_id}
                  isFetching={activeVideo.isFetching}
                  onDownload={activeVideo.url.includes('/storage/v1/object/sign/materials_files/')
                    ? () => void downloadMaterialVideo(activeVideo.id)
                    : undefined}
                />
              )}
              {activeImage && (
                <MaterialImageFrame
                  key={activeImage.id}
                  url={activeImage.url}
                  title={activeImage.title}
                  isFetching={activeImage.isFetching}
                />
              )}
              {activeAudio && (
                <MaterialAudioFrame
                  key={activeAudio.id}
                  url={activeAudio.url}
                  title={activeAudio.title}
                  isFetching={activeAudio.isFetching}
                />
              )}
            </div>

            {/* CURRICULUM SECTION */}
            <div className={styles.curriculumWrapper}>
              <div className={styles.curriculumTitleWrapper}>
                <h2 className={styles.curriculumTitle} style={{ marginBottom: 0 }}>
                  محتويات <span className={styles.highlight}>المادة</span>
                </h2>
                <span className={styles.titleLine1}></span>
                <span className={styles.titleLine2}></span>
                <span className={styles.titleLine3}></span>
              </div>

              <div className={styles.accordionList}>
                {sections.length === 0 ? (
                  <div className={styles.emptyCoursesState}>
                    <span className={styles.emptyCoursesIcon}>
                      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32">
                        <circle cx="11" cy="8" r="1" fill="currentColor"></circle>
                        <circle cx="11" cy="16" r="1" fill="currentColor"></circle>
                        <circle cx="11" cy="24" r="1" fill="currentColor"></circle>
                        <path fill="currentColor" d="M24 3H8a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h10v-2H8v-6h18V5a2 2 0 0 0-2-2m0 16H8v-6h16Zm0-8H8V5h16Z"></path>
                        <path fill="currentColor" d="M29 24.415L27.586 23L25 25.587L22.414 23L21 24.415L23.586 27L21 29.586L22.414 31L25 28.414L27.586 31L29 29.586L26.414 27z"></path>
                      </svg>
                    </span>
                    <span>هيتم إضافة المحتوى قريب</span>
                  </div>
                ) : (
                  sections.map((section, idx) => {
                    const isOpen = expandedModules[section.id] || false;
                    const sectionAllMaterials = materials.filter(m => m.section_id === section.id);
                    const sectionMaterials = filteredMaterials.filter(m => m.section_id === section.id);
                    const searchTerm = search.trim().toLocaleLowerCase();
                    const standaloneMaterials = sectionMaterials.filter(material => !material.group_id);
                    const sectionGroups = materialGroups
                      .filter(group => group.section_id === section.id)
                      .map(group => {
                        const groupItems = sectionAllMaterials
                          .filter(material => material.group_id === group.id)
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        const groupTitleMatches = searchTerm.length > 0 && group.title.toLocaleLowerCase().includes(searchTerm);
                        const visibleItems = !searchTerm || groupTitleMatches
                          ? groupItems
                          : groupItems.filter(material => material.title.toLocaleLowerCase().includes(searchTerm));
                        return { group, items: visibleItems, groupTitleMatches };
                      })
                      .filter(({ items, groupTitleMatches }) => !searchTerm || items.length > 0 || groupTitleMatches);
                    const orderedEntries = [
                      ...standaloneMaterials.map(material => ({
                        kind: 'material' as const,
                        createdAt: material.created_at,
                        material,
                      })),
                      ...sectionGroups.map(entry => ({
                        kind: 'group' as const,
                        createdAt: entry.group.created_at,
                        ...entry,
                      })),
                    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    const sectionContentCount = standaloneMaterials.length + sectionGroups.reduce((count, entry) => count + entry.items.length, 0);
                    
                    return (
                      <div key={section.id} className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}>
                        <button 
                          className={styles.accordionHeader} 
                          onClick={() => toggleModule(section.id)}
                          aria-expanded={isOpen}
                        >
                          <div className={styles.accordionTitleBlock}>
                            <div className={styles.accordionIcon}>
                              <Layers size={24} />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className={styles.accordionTitle}>{section.title}</div>
                              <div className={styles.accordionSubtitle}>{sectionContentCount} عناصر للتعلم</div>
                            </div>
                          </div>
                          <ChevronDown 
                            size={20} 
                            className={`${styles.accordionChevron} ${isOpen ? styles.open : ''}`} 
                          />
                        </button>

                      <div className={`${styles.accordionBody} ${isOpen ? styles.open : ''}`}>
                        <div className={styles.accordionGridInner}>
                          <div className={styles.accordionPaddingWrapper}>
                            {standaloneMaterials.length === 0 && sectionGroups.length === 0 ? (
                              <div className={styles.emptyAccordionWrapper}>لسه مفيش محتوى هنا.</div>
                            ) : (
                              <div className={styles.accordionContentWrapper}>
                                <div className={styles.accordionContentInner}>
                                  {orderedEntries.map(entry => {
                                    if (entry.kind === 'material') return renderMaterialItem(entry.material);

                                    const { group, items } = entry;
                                    const groupOpen = searchTerm ? true : !!expandedMaterialGroups[group.id];
                                    return (
                                      <div key={group.id} className={styles.materialGroup}>
                                        <button
                                          type="button"
                                          className={styles.materialGroupHeader}
                                          onClick={() => toggleMaterialGroup(group.id)}
                                          aria-expanded={groupOpen}
                                        >
                                          <span className={styles.materialGroupTitle}>
                                            <FolderOpen size={19} />
                                            <strong>{group.title}</strong>
                                            <span className={styles.materialGroupCount}>{items.length}</span>
                                          </span>
                                          <ChevronDown size={19} className={`${styles.materialChevron} ${groupOpen ? styles.open : ''}`} />
                                        </button>
                                        <div className={`${styles.materialGroupBody} ${groupOpen ? styles.open : ''}`}>
                                          <div className={styles.materialGroupItems}>
                                            {items.length > 0 ? items.map(renderMaterialItem) : (
                                              <div className={styles.emptyMaterialGroup}>سيتم إضافة المحتوى إلى هذه المجموعة قريباً.</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><InlineLoader text="جاري فتح موادك الدراسية..." /></div>}>
      <MaterialsPageContent />
    </Suspense>
  );
}

