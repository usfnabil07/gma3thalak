'use client';

import { useRef, useState, useEffect, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { Volume2, VolumeX, Settings, Maximize, Minimize, Download } from 'lucide-react';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

interface VideoPlayerProps {
  url: string;
  id?: string;
  userId?: string;
  isFetching?: boolean;
  onDownload?: () => void;
}

function getYouTubeId(url: string): string | null {
  // Also accept older saved iframe snippets and links without a protocol.
  const looseMatch = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^\s"'<>]*?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (looseMatch) return looseMatch[1];

  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      const shortId = parsed.pathname.split('/').filter(Boolean)[0];
      return shortId?.match(/^[a-zA-Z0-9_-]{11}$/) ? shortId : null;
    }
    if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const id = parsed.searchParams.get('v')
      || (['embed', 'shorts', 'live', 'v'].includes(pathParts[0]) ? pathParts[1] : null);
    return id?.match(/^[a-zA-Z0-9_-]{11}$/) ? id : null;
  } catch {
    return null;
  }
}

function isLocalVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('supabase');
}

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const CSS = `
  .bvp-root {
    position: relative;
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    user-select: none;
    aspect-ratio: 16 / 9;
    direction: ltr !important;
  }
  
  .bvp-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 60px 20px 20px 20px; transition: opacity 0.3s;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
    display: flex; flex-direction: column; justify-content: flex-end; z-index: 10;
  }
  .bvp-root:hover .bvp-bar { opacity: 1; }

  /* Seekbar track */
  .bvp-seek-wrap { position: relative; height: 16px; display: flex; align-items: center; margin-bottom: 8px; cursor: pointer; }
  .bvp-seek-bg { position: absolute; inset: 0; top: 50%; transform: translateY(-50%); height: 4px; border-radius: 0; background: rgba(255,255,255,0.3); }
  .bvp-seek-buf { position: absolute; top: 50%; transform: translateY(-50%); left: 0; height: 4px; border-radius: 0; background: rgba(255,255,255,0.5); transition: width 0.1s linear; }
  .bvp-seek-prog { position: absolute; top: 50%; transform: translateY(-50%); left: 0; height: 4px; border-radius: 0; background: var(--secondary, #0ea5e9); transition: width 0.1s linear; }
  
  .bvp-seek-inp {
    position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0; padding: 0;
    -webkit-appearance: none; appearance: none;
    direction: ltr;
  }
  /* Thumb (visual only) */
  .bvp-seek-thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 14px; height: 14px; background: #fff; border-radius: 50%;
    pointer-events: none; transition: transform 0.2s ease;
  }

  /* Volume bar - Creative Expandable */
  .bvp-vol-container { display: flex; align-items: center; margin-left: 8px; }
  .bvp-vol-wrap { 
    position: relative; height: 32px; display: flex; align-items: center; cursor: pointer; 
    width: 0; opacity: 0; pointer-events: none;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease;
  }
  .bvp-vol-container:hover .bvp-vol-wrap, .bvp-vol-wrap:focus-within {
    width: 70px; opacity: 1; margin-left: 10px; pointer-events: auto;
  }
  .bvp-vol-bg { position: absolute; top: 50%; transform: translateY(-50%); left: 0; right: 0; height: 4px; border-radius: 0; background: rgba(255,255,255,0.3); }
  .bvp-vol-prog { 
    position: absolute; top: 50%; transform: translateY(-50%); left: 0; height: 4px; border-radius: 0; 
    background: #fff;
  }
  .bvp-vol-thumb {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 12px; height: 12px; background: #fff; border-radius: 50%;
    pointer-events: none; transition: transform 0.2s ease;
  }
  .bvp-vol-inp {
    position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0; padding: 0;
    -webkit-appearance: none; appearance: none;
    direction: ltr;
  }

  /* Buttons */
  .bvp-btn { background: transparent; border: none; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 6px; border-radius: 50%; transition: background 0.15s; }
  .bvp-btn:hover { background: rgba(255,255,255,0.2); }

  /* Speed menu */
  .bvp-smenu {
    position: absolute; bottom: 130%; right: 0;
    background: rgba(28,28,28,0.95); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; overflow: hidden; min-width: 80px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6); z-index: 20;
  }
  .bvp-si { display: block; width: 100%; padding: 8px 16px; text-align: center;
    background: transparent; border: none; color: #eee; cursor: pointer;
    font-size: 0.85rem; transition: background 0.1s; }
  .bvp-si:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .bvp-si.on { color: #fff; font-weight: bold; background: rgba(255,255,255,0.2); }

  /* Skip animations */
  @keyframes bvpSkipBwd { 0% { opacity: 0; transform: translate(-20px, -50%); } 20% { opacity: 1; transform: translate(0, -50%); } 80% { opacity: 1; transform: translate(0, -50%); } 100% { opacity: 0; transform: translate(0, -50%); } }
  @keyframes bvpSkipFwd { 0% { opacity: 0; transform: translate(20px, -50%); } 20% { opacity: 1; transform: translate(0, -50%); } 80% { opacity: 1; transform: translate(0, -50%); } 100% { opacity: 0; transform: translate(0, -50%); } }
  .bvp-skip { 
    position: absolute; top: 50%; transform: translateY(-50%); 
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 30px; padding: 10px 24px;
    color: #fff; pointer-events: none; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; z-index: 10; font-weight: 500; font-size: 1.1rem;
  }
  .bvp-skip.bwd { animation: bvpSkipBwd 0.6s ease; }
  .bvp-skip.fwd { animation: bvpSkipFwd 0.6s ease; }

  /* Loader - Premium Dual Ring */
  @keyframes bvpSpin { 100% { transform: rotate(360deg); } }
  .bvp-loader { 
    width: 60px; height: 60px; border-radius: 50%; 
    border: 3px solid transparent; border-top-color: var(--secondary, #0ea5e9); border-bottom-color: var(--secondary, #0ea5e9);
    animation: bvpSpin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    position: relative; filter: drop-shadow(0 0 10px rgba(14, 165, 233, 0.5));
  }
  .bvp-loader::before {
    content: ""; position: absolute; inset: 8px; border-radius: 50%; 
    border: 3px solid transparent; border-left-color: #fff; border-right-color: #fff;
    animation: bvpSpin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite reverse;
  }

  /* Fullscreen */
  .bvp-root:-webkit-full-screen { border-radius: 0; max-width: none; width: 100%; height: 100%; }
  .bvp-root:fullscreen { border-radius: 0; max-width: none; width: 100%; height: 100%; }
  .bvp-root:-webkit-full-screen video { width: 100%; height: 100%; object-fit: contain; }
  .bvp-root:fullscreen video { width: 100%; height: 100%; object-fit: contain; }

  /* Mobile Enhancements */
  @media (max-width: 768px) {
    .bvp-root { border-radius: 4px; }
    .bvp-bar { padding: 40px 10px 10px 10px; }
    .bvp-vol-container { display: none !important; /* Hide volume slider on mobile, rely on hardware buttons */ }
    .bvp-skip { font-size: 0.9rem; padding: 6px 16px; }
    .bvp-btn svg { width: 24px; height: 24px; }
    .bvp-btn { padding: 4px; }
  }
`;

/* ═══════════════ MAIN EXPORT ═══════════════ */
export default function VideoPlayer({ url, id, userId, isFetching, onDownload }: VideoPlayerProps) {
  const ytId  = getYouTubeId(url);
  const local = !ytId && isLocalVideo(url);

  return (
    <>
      <style>{CSS}</style>
      {isFetching ? (
        <div className="bvp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bvp-loader" />
        </div>
      ) : ytId ? (
        <YouTubeFrame ytId={ytId} url={url} />
      ) : local ? (
        <LocalPlayer url={url} id={id} onDownload={onDownload} />
      ) : (
        <YouTubeFrame ytId="" url={url} />
      )}
    </>
  );
}

/* ─── YouTube wrapper ─── */
function YouTubeFrame({ ytId, url }: { ytId: string; url?: string }) {
  // Keep the existing YouTube embed settings, with inline playback enabled for phones.
  const src = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&showinfo=0`
    : url;
  return (
    <div className="bvp-root">
      <iframe
        src={src}
        title={ytId ? 'فيديو يوتيوب للمادة' : 'فيديو المادة'}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/* ─── Local HTML5 Player ─── */
function LocalPlayer({ url, id, onDownload }: { url: string; id?: string; onDownload?: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const vidRef   = useRef<HTMLVideoElement>(null);
  const hideRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dblRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying]   = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume]     = useState(1);
  const [muted, setMuted]       = useState(false);
  const [isFs, setIsFs]         = useState(false);
  const [rate, setRate]         = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [skipDir, setSkipDir]   = useState<null | 'fwd' | 'bwd'>(null);
  const [showCtrl, setShowCtrl] = useState(true);

  useEffect(() => {
    const fn = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  // Restore progress on mount
  useEffect(() => {
    if (!id || !userId || !vidRef.current) return;
    const saved = readAccountStorage(`bua_vid_prog_${id}`, userId);
    if (saved) {
      const t = parseFloat(saved);
      if (!isNaN(t) && t > 0) {
        vidRef.current.currentTime = t;
        // eslint-disable-next-line
        setCurrent(t);
      }
    } else {
      vidRef.current.currentTime = 0;
      setCurrent(0);
    }
  }, [id, url, userId]);

  const nudge = useCallback(() => {
    setShowCtrl(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      if (vidRef.current && !vidRef.current.paused) setShowCtrl(false);
    }, 2500);
  }, []);

  const doSkip = useCallback((sec: number) => {
    const v = vidRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
    setSkipDir(sec > 0 ? 'fwd' : 'bwd');
    setTimeout(() => setSkipDir(null), 600);
    nudge();
  }, [nudge]);

  const doPlay = useCallback(() => {
    const v = vidRef.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
    nudge();
  }, [nudge]);

  const togglePlaybackOnClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    if (dblRef.current) {
      clearTimeout(dblRef.current);
      dblRef.current = null;
      if (x > rect.width / 2) {
        doSkip(10);
      } else {
        doSkip(-10);
      }
      return;
    }
    
    dblRef.current = setTimeout(() => {
      dblRef.current = null;
      doPlay();
    }, 250);
  }, [doPlay, doSkip]);

  const [bufferedPct, setBufferedPct] = useState(0);

  const handleProgress = useCallback(() => {
    const v = vidRef.current;
    if (v && v.buffered.length > 0) {
      setBufferedPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
  }, []);

  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const updateProgress = useCallback(() => {
    const v = vidRef.current; if (!v) return;
    setCurrent(v.currentTime);
    if (id && userId && v.currentTime > 0) {
      writeAccountStorage(`bua_vid_prog_${id}`, userId, v.currentTime.toString());
    }
  }, [id, userId]);

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = vidRef.current; if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrent(v.currentTime);
    nudge();
  };

  const updateVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val); setMuted(val === 0);
    if (vidRef.current) vidRef.current.volume = val;
  };

  const setSpeed = (r: number) => {
    setRate(r); setRateOpen(false);
    if (vidRef.current) vidRef.current.playbackRate = r;
  };

  const toggleMute = () => {
    if (!vidRef.current) return;
    const m = !muted; setMuted(m); vidRef.current.muted = m;
  };

  const toggleFs = () => {
    if (!rootRef.current) return;
    if (!document.fullscreenElement) rootRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  const prog = duration > 0 ? (current / duration) * 100 : 0;
  const volPct = muted ? 0 : volume * 100;

  return (
    <div
      ref={rootRef}
      className="bvp-root"
      onMouseMove={nudge}
      style={{ cursor: playing && !showCtrl ? 'none' : 'default' }}
    >
      <video
        ref={vidRef}
        src={url}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={() => setDuration(vidRef.current?.duration || 0)}
        onWaiting={() => setIsWaiting(true)}
        onCanPlay={() => setIsWaiting(false)}
        onPlaying={() => setIsWaiting(false)}
        onPlay={() => { setPlaying(true); nudge(); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onProgress={handleProgress}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* Invisible clickable overlay for video so double-click works smoothly */}
      <div 
        onClick={togglePlaybackOnClick} 
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />

      {/* Loading state */}
      {isWaiting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="bvp-loader" />
        </div>
      )}

      {/* Big center play/pause */}
      {!playing && !isWaiting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            paddingLeft: '6px',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
          }}>
            <svg viewBox="0 0 24 24" fill="#fff" width="60" height="60">
              <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Skip animations */}
      {skipDir === 'bwd' && (
        <div className="bvp-skip bwd" style={{ left: '15%', zIndex: 2 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font), sans-serif', paddingBottom: '2px' }}>10 ثوان</span>
        </div>
      )}
      {skipDir === 'fwd' && (
        <div className="bvp-skip fwd" style={{ right: '15%', zIndex: 2 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font), sans-serif', paddingBottom: '2px' }}>10 ثوان</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </div>
      )}

      {/* ─── CONTROLS BAR ─── */}
      <div className="bvp-bar" style={{ opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? 'auto' : 'none' }} onClick={e => e.stopPropagation()}>
        
        {/* Seek bar */}
        <div 
          className="bvp-seek-wrap"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            let p = (e.clientX - rect.left) / rect.width;
            p = Math.max(0, Math.min(1, p));
            setHoverPct(p);
          }}
          onMouseLeave={() => setHoverPct(null)}
        >
          <div className="bvp-seek-bg" />
          <div className="bvp-seek-buf" style={{ width: `${bufferedPct}%` }} />
          <div className="bvp-seek-prog" style={{ width: `${prog}%` }} />
          <div className="bvp-seek-thumb" style={{ left: `${prog}%` }} />
          
          {hoverPct !== null && duration > 0 && (
            <div 
              style={{
                position: 'absolute',
                bottom: '40px',
                left: `${hoverPct * 100}%`,
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                pointerEvents: 'none',
                fontFamily: 'var(--font), sans-serif',
                whiteSpace: 'nowrap',
                zIndex: 20
              }}
            >
              {fmt(hoverPct * duration)}
            </div>
          )}

          <input
            type="range" min={0} max={duration || 0} step={0.1} value={current}
            onChange={seekTo}
            className="bvp-seek-inp"
            dir="ltr"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="bvp-btn" onClick={() => doSkip(-10)} title="10 ثوان للخلف">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
            
            <button className="bvp-btn" onClick={doPlay} style={{ padding: 0 }} title={playing ? "إيقاف" : "تشغيل"}>
              {playing
                ? <svg viewBox="0 0 24 24" fill="#fff" width="32" height="32">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                : <svg viewBox="0 0 24 24" fill="#fff" width="32" height="32">
                    <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>
                  </svg>
              }
            </button>
            
            <button className="bvp-btn" onClick={() => doSkip(10)} title="10 ثوان للأمام">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </button>

            <span style={{ color: '#ddd', fontSize: '0.85rem', fontFamily: 'var(--font), sans-serif', letterSpacing: '0.5px', direction: 'ltr' }}>
              {fmt(current)} <span style={{ color: '#888', margin: '0 4px' }}>/</span> {fmt(duration)}
            </span>

            <div className="bvp-vol-container">
              <button className="bvp-btn" onClick={toggleMute} title={muted || volume === 0 ? "تشغيل الصوت" : "كتم الصوت"}>
                {muted || volume === 0
                  ? <VolumeX color="#fff" size={22} strokeWidth={2} />
                  : <Volume2 color="#fff" size={22} strokeWidth={2} />
                }
              </button>
              <div className="bvp-vol-wrap">
                <div className="bvp-vol-bg" />
                <div className="bvp-vol-prog" style={{ width: `${volPct}%` }} />
                <div className="bvp-vol-thumb" style={{ left: `${volPct}%` }} />
                <input
                  type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                  onChange={updateVolume}
                  className="bvp-vol-inp"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            {onDownload && <button className="bvp-btn" type="button" onClick={onDownload} title="تحميل الفيديو" aria-label="تحميل الفيديو"><Download color="#fff" size={22} strokeWidth={2} /></button>}
            <div style={{ position: 'relative' }}>
              <button className="bvp-btn" onClick={() => setRateOpen(o => !o)} title="الإعدادات">
                <Settings color="#fff" size={22} strokeWidth={2} style={{ transition: 'transform 0.3s', transform: rateOpen ? 'rotate(90deg)' : 'none' }} />
              </button>
              {rateOpen && (
                <div className="bvp-smenu">
                  <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#aaa', fontSize: '0.75rem', textAlign: 'center' }}>سرعة التشغيل</div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                    <button key={r} className={`bvp-si${rate === r ? ' on' : ''}`} onClick={() => setSpeed(r)}>{r}×</button>
                  ))}
                </div>
              )}
            </div>
            <button className="bvp-btn" onClick={toggleFs} title="ملء الشاشة">
              {isFs
                ? <Minimize color="#fff" size={22} strokeWidth={2} />
                : <Maximize color="#fff" size={22} strokeWidth={2} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
