'use client';

import InlineLoader from '@/components/ui/InlineLoader';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Download, Plus, Trash2, X, FileImage, Copy, Settings2, Undo2, Pencil } from 'lucide-react';
import Swal from 'sweetalert2';
import styles from './ScheduleTab.module.css';
import profileStyles from '@/app/profile/page.module.css';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '@/hooks/useAuth';
import { readAccountStorage, writeAccountStorage } from '@/lib/accountStorage';

interface ScheduleEntry {
  id: string;
  day: number;
  startHour: number;
  endHour: number;
  subject: string;
  doctor: string;
  room: string;
  colorIdx: number;
}

const DAYS_EN = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const DAYS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const PALETTE = [
  { label: 'وردي',       fill: '#f9c6cc', border: '#f08090', text: '#7a2030' },
  { label: 'أخضر',      fill: '#c8edbb', border: '#7fc47a', text: '#1e5c1e' },
  { label: 'أصفر',      fill: '#fff3a0', border: '#d4a800', text: '#5a4000' },
  { label: 'أزرق',      fill: '#b3d9f5', border: '#3a9fd6', text: '#0a3a5c' },
  { label: 'بنفسجي',    fill: '#d9c8f5', border: '#8b6be0', text: '#3a1e80' },
  { label: 'برتقالي',   fill: '#ffd8b0', border: '#f0902a', text: '#6b3200' },
  { label: 'فيروزي',    fill: '#b0f0f0', border: '#00a8a8', text: '#00393b' },
  { label: 'وردي غامق', fill: '#f5b8d8', border: '#e060a0', text: '#6b0038' },
  { label: 'ليموني',    fill: '#e8f5b0', border: '#9ab800', text: '#384500' },
  { label: 'رمادي',     fill: '#e8e0d8', border: '#a09080', text: '#3a2e28' },
];

function fmtHour(h: number) {
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h > 12 ? h - 12 : h;
  return `${display}:00${suffix}`;
}

export default function ScheduleTab() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [history, setHistory] = useState<ScheduleEntry[][]>([]);
  const [future, setFuture] = useState<ScheduleEntry[][]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('جدولي الدراسي');
  const [editingTitle, setEditingTitle] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Sidebar states
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [clipboard, setClipboard] = useState<Omit<ScheduleEntry, 'id' | 'day' | 'startHour' | 'endHour'> & { duration: number } | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error', id: number} | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hiddenDays, setHiddenDays] = useState<number[]>([]);
  
  const stateRef = useRef({ entries, history, future, hiddenDays });
  useEffect(() => { stateRef.current = { entries, history, future, hiddenDays }; }, [entries, history, future, hiddenDays]);
  
  const showToast = useCallback((message: string, type: 'success'|'error' = 'success') => {
    // Clear any pending hide-timer before showing new toast
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 8000);
  }, []);
  
  const [form, setForm] = useState({ day: 0, startHour: 9, endHour: 10, subject: '', doctor: '', room: '', colorIdx: 0 });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.user_id) return;
    setIsClient(false);
    setEntries([]);
    setHistory([]);
    setFuture([]);
    setScheduleTitle('جدولي الدراسي');
    setHiddenDays([]);
    setSelectedEntry(null);
    try {
      const s = readAccountStorage('gma3_schedule_v5', profile.user_id);
      if (s) setEntries(JSON.parse(s));
      const t = readAccountStorage('gma3_schedule_title', profile.user_id);
      if (t) setScheduleTitle(t);
      const hd = readAccountStorage('gma3_hidden_days', profile.user_id);
      if (hd) setHiddenDays(JSON.parse(hd));
    } catch {}
    setLoadedForUserId(profile.user_id);
    setIsClient(true);
  }, [profile?.user_id]);

  useEffect(() => { if (isClient && loadedForUserId === profile?.user_id) writeAccountStorage('gma3_schedule_v5', profile?.user_id, JSON.stringify(entries)); }, [entries, isClient, loadedForUserId, profile?.user_id]);
  useEffect(() => { if (isClient && loadedForUserId === profile?.user_id) writeAccountStorage('gma3_schedule_title', profile?.user_id, scheduleTitle); }, [scheduleTitle, isClient, loadedForUserId, profile?.user_id]);
  useEffect(() => { if (isClient && loadedForUserId === profile?.user_id) writeAccountStorage('gma3_hidden_days', profile?.user_id, JSON.stringify(hiddenDays)); }, [hiddenDays, isClient, loadedForUserId, profile?.user_id]);

  type Snapshot = { e: ScheduleEntry[]; h: number[] };

  const saveSnapshot = useCallback(() => {
    const { entries: curr, hiddenDays: hd, history: hist } = stateRef.current;
    setHistory([...hist, { e: curr, h: hd }] as unknown as ScheduleEntry[][]);
    setFuture([] as unknown as ScheduleEntry[][]);
  }, []);

  const updateEntries = useCallback((newEntriesOrFn: ScheduleEntry[] | ((p: ScheduleEntry[]) => ScheduleEntry[])) => {
    const { entries: current, hiddenDays: hd, history: hist } = stateRef.current;
    const resolved = typeof newEntriesOrFn === 'function' ? newEntriesOrFn(current) : newEntriesOrFn;
    if (JSON.stringify(current) === JSON.stringify(resolved)) return;
    setHistory([...hist, { e: current, h: hd }] as unknown as ScheduleEntry[][]);
    setFuture([] as unknown as ScheduleEntry[][]);
    setEntries(resolved);
  }, []);

  const updateHiddenDays = useCallback((newHidden: number[]) => {
    const { entries: curr, hiddenDays: hd, history: hist } = stateRef.current;
    setHistory([...hist, { e: curr, h: hd }] as unknown as ScheduleEntry[][]);
    setFuture([] as unknown as ScheduleEntry[][]);
    setHiddenDays(newHidden);
  }, []);

  const handleUndo = useCallback(() => {
    const { entries: curr, hiddenDays: hd, history: h, future: f } = stateRef.current;
    if (h.length === 0) return;
    const snap = h[h.length - 1] as unknown as { e: ScheduleEntry[]; h: number[] };
    setFuture([{ e: curr, h: hd }, ...f] as unknown as ScheduleEntry[][]);
    setHistory(h.slice(0, -1));
    if (snap && typeof snap === 'object' && 'e' in snap) {
      setEntries(snap.e);
      setHiddenDays(snap.h);
    } else {
      setEntries(h[h.length - 1] as unknown as ScheduleEntry[]);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const { entries: curr, hiddenDays: hd, history: h, future: f } = stateRef.current;
    if (f.length === 0) return;
    const snap = f[0] as unknown as { e: ScheduleEntry[]; h: number[] };
    setHistory([...h, { e: curr, h: hd }] as unknown as ScheduleEntry[][]);
    setFuture(f.slice(1));
    if (snap && typeof snap === 'object' && 'e' in snap) {
      setEntries(snap.e);
      setHiddenDays(snap.h);
    } else {
      setEntries(f[0] as unknown as ScheduleEntry[]);
    }
  }, []);


  // Undo/Redo listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const handleEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setClipboard(null);
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isEditMode]);


  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    if (form.endHour <= form.startHour) {
      Swal.fire({ icon: 'warning', title: 'خطأ', text: 'وقت الانتهاء يجب أن يكون بعد وقت البدء' });
      return;
    }
    
    updateEntries(p => {
      const hasCollision = p.some(e => e.day === form.day && form.startHour < e.endHour && form.endHour > e.startHour);
      if (hasCollision) {
        showToast('تعارض', 'error');
        return p;
      }
      return [...p, {
        id: Date.now().toString(), day: form.day,
        startHour: form.startHour, endHour: form.endHour,
        subject: form.subject.trim(), doctor: form.doctor.trim(),
        room: form.room.trim(), colorIdx: form.colorIdx
      }];
    });
    
    setShowForm(false);
    setForm(f => ({ ...f, subject: '', doctor: '', room: '' }));
  };

  // --- Sidebar Actions ---
  const saveSidebarChanges = () => {
    if (!selectedEntry) return;
    if (!selectedEntry.subject.trim()) {
      showToast('كمّل بيانات المحاضرة واكتب اسم المادة قبل الحفظ', 'error');
      return;
    }
    if (selectedEntry.endHour <= selectedEntry.startHour) {
      Swal.fire({ icon: 'warning', title: 'خطأ', text: 'وقت الانتهاء غير صالح' });
      return;
    }
    
    updateEntries(p => {
      // Check collision excluding self
      const hasCollision = p.some(e => e.id !== selectedEntry.id && e.day === selectedEntry.day && selectedEntry.startHour < e.endHour && selectedEntry.endHour > e.startHour);
      if (hasCollision) {
        showToast('تعارض', 'error');
        return p;
      }
      return p.map(e => e.id === selectedEntry.id ? selectedEntry : e);
    });
    setSelectedEntry(null);
  };

  const handleSidebarRemove = () => {
    if (!selectedEntry) return;
    Swal.fire({ title: 'حذف المحاضرة؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' })
      .then(r => { 
        if (r.isConfirmed) {
          updateEntries(p => p.filter(e => e.id !== selectedEntry.id));
          setSelectedEntry(null);
        }
      });
  };

  const handleSidebarCopy = () => {
    if (!selectedEntry) return;
    setClipboard({
      subject: selectedEntry.subject,
      doctor: selectedEntry.doctor,
      room: selectedEntry.room,
      colorIdx: selectedEntry.colorIdx,
      duration: selectedEntry.endHour - selectedEntry.startHour
    });
    setSelectedEntry(null);
    showToast('تم النسخ! انقر على أي خلية فارغة للصق', 'success');
  };

  

  // --- Exports ---
  const handlePaste = (day: number, startHour: number) => {
    if (!clipboard) return;
    const endHour = startHour + clipboard.duration;
    
    if (endHour > 17) {
      showToast('الوقت لا يكفي للصق المحاضرة!', 'error');
      return;
    }
    
    updateEntries(p => {
      const hasCollision = p.some(e => e.day === day && startHour < e.endHour && endHour > e.startHour);
      if (hasCollision) {
        showToast('المكان ممتلئ أو يتعارض مع محاضرة أخرى!', 'error');
        return p;
      }
      return [...p, {
        id: Date.now().toString(),
        day, startHour, endHour,
        subject: clipboard.subject, doctor: clipboard.doctor,
        room: clipboard.room, colorIdx: clipboard.colorIdx
      }];
    });
  };

  const exportPNG = useCallback(async () => {
    if (!printRef.current) return;
    const originalWidth = printRef.current.style.width;
    const originalMaxWidth = printRef.current.style.maxWidth;
    const originalOverflow = printRef.current.style.overflow;
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 50)); // let react render watermark
      printRef.current.style.width = '1000px';
      printRef.current.style.maxWidth = 'none';
      printRef.current.style.overflow = 'visible';
      
      await new Promise(r => setTimeout(r, 150));
      
      const dataUrl = await htmlToImage.toPng(printRef.current, { backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1f2e' : '#ffffff', pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `${scheduleTitle}.png`;
      a.href = dataUrl;
      a.click();
    } catch { 
      showToast('خطأ', 'error'); 
    } finally {
      setIsExporting(false);
      if (printRef.current) {
        printRef.current.style.width = originalWidth;
        printRef.current.style.maxWidth = originalMaxWidth;
        printRef.current.style.overflow = originalOverflow;
        printRef.current.removeAttribute('data-exporting');
      }
    }
  }, [scheduleTitle]);

  const exportPDF = useCallback(async () => {
    if (!printRef.current) return;
    const originalWidth = printRef.current.style.width;
    const originalMaxWidth = printRef.current.style.maxWidth;
    const originalOverflow = printRef.current.style.overflow;
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 50)); // let react render watermark
      printRef.current.style.width = '1000px';
      printRef.current.style.maxWidth = 'none';
      printRef.current.style.overflow = 'visible';
      
      await new Promise(r => setTimeout(r, 150));

      const { default: jsPDF } = await import('jspdf');
      const imgData = await htmlToImage.toPng(printRef.current, { backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1f2e' : '#ffffff', pixelRatio: 2 });
      const w = 1000 / 2;
      const h = printRef.current.offsetHeight / 2;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [w, h] });
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${scheduleTitle}.pdf`);
    } catch { 
      showToast('خطأ', 'error'); 
    } finally {
      setIsExporting(false);
      if (printRef.current) {
        printRef.current.style.width = originalWidth;
        printRef.current.style.maxWidth = originalMaxWidth;
        printRef.current.style.overflow = originalOverflow;
        printRef.current.removeAttribute('data-exporting');
      }
    }
  }, [scheduleTitle]);

  const rowSlots = HOURS.slice(0, -1);

  if (!isClient || loadedForUserId !== profile?.user_id) return <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><InlineLoader text="جاري تجهيز جدولك الأكاديمي..." /></div>;

  return (
    <div className={profileStyles.contentArea}>
      <div className={profileStyles.sectionHeader} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={profileStyles.headerIcon}><Calendar size={20} /></div>
          <h2 className={profileStyles.sectionHeaderTitle}>الجدول الأكاديمي</h2>
        </div>
        <div className={styles.headerActions}>

          <div className={styles.editToggleWrapper}>
            <label className={styles.switch}>
              <input type="checkbox" checked={isEditMode} onChange={e => setIsEditMode(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>تعديل الجدول</span>
          </div>
          {isEditMode && (
            <button className="btn btn-outline" onClick={() => setShowForm(s => !s)}>
              {showForm ? <X size={18} /> : <Plus size={18} />}
              {showForm ? 'إلغاء' : 'إضافة محاضرة'}
            </button>
          )}
          <button className="btn btn-outline" onClick={exportPNG}><FileImage size={18} /> PNG</button>
          <button className="btn btn-primary" onClick={exportPDF}><Download size={18} /> PDF</button>
        </div>
      </div>

      {showForm && isEditMode && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>اسم المادة *</label>
              <input required placeholder="Computer Networks" value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>اسم الدكتور</label>
              <input placeholder="د. أحمد" value={form.doctor}
                onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>رقم القاعة</label>
              <input placeholder="A1202" value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>اليوم</label>
              <select value={form.day} onChange={e => setForm(f => ({ ...f, day: +e.target.value }))}>
                {DAYS_AR.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>وقت البدء</label>
              <select value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour: +e.target.value }))}>
                {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>وقت الانتهاء</label>
              <select value={form.endHour} onChange={e => setForm(f => ({ ...f, endHour: +e.target.value }))}>
                {HOURS.slice(1).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>اللون</label>
              <div className={styles.colorPicker}>
                {PALETTE.map((p, i) => (
                  <button type="button" key={i}
                    className={`${styles.colorDot} ${form.colorIdx === i ? styles.colorDotActive : ''}`}
                    style={{ background: p.fill, outline: `3px solid ${form.colorIdx === i ? p.border : 'transparent'}`, outlineOffset: '2px' }}
                    onClick={() => setForm(f => ({ ...f, colorIdx: i }))}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 8 }}>
            حفظ وإضافة للجدول
          </button>
        </form>
      )}


      <div className={styles.printWrapper} ref={printRef}>
        <div className={styles.tableTitle}>
          {editingTitle
            ? <input autoFocus className={styles.titleInput} value={scheduleTitle}
                onChange={e => setScheduleTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)} />
            : <div className={styles.titleHeading}>
                <h2 onClick={() => setEditingTitle(true)}>{scheduleTitle}</h2>
                {!isExporting && <button type="button" className={styles.titleEditButton} aria-label="تعديل اسم الجدول" title="تعديل اسم الجدول" onClick={() => setEditingTitle(true)}><Pencil size={14} /></button>}
              </div>
          }
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.scheduleTable} data-edit={isEditMode}>
            <thead>
              <tr>
                <th className={styles.thTime}>DAY / TIME</th>
                {DAYS_EN.map((d, i) => {
                  if (hiddenDays.includes(i) && (!isEditMode || isExporting)) return null;
                  if (hiddenDays.includes(i) && isEditMode) return (
                    <th key={i} className={styles.thDayHidden}>
                      <button
                        className={styles.addDayBtn}
                        title={`إظهار يوم ${DAYS_AR[i]}`}
                        onClick={() => updateHiddenDays(hiddenDays.filter(x => x !== i))}
                      >＋ {DAYS_AR[i]}</button>
                    </th>
                  );
                  return (
                    <th key={i} className={styles.thDay}>
                      <span>{d}</span>
                      {isEditMode && !isExporting && (
                        <button
                          className={styles.deleteDayBtn}
                          title={`حذف عمود ${DAYS_AR[i]}`}
                          onClick={() => updateHiddenDays([...hiddenDays, i])}
                        >
                          ✕
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const used = new Set<string>();
                return rowSlots.map(hour => (
                  <tr key={hour}>
                    <td className={styles.tdTime}>{fmtHour(hour)}-{fmtHour(hour + 1)}</td>
                    {Array.from({ length: 6 }, (_, dayIdx) => {
                      if (hiddenDays.includes(dayIdx) && (!isEditMode || isExporting)) return null;
                      if (hiddenDays.includes(dayIdx) && isEditMode) return <td key={dayIdx} className={styles.tdHidden} />;
                      const key = `${dayIdx}-${hour}`;
                      if (used.has(key)) return null;
                      const entry = entries.find(e => e.day === dayIdx && e.startHour === hour);
                      if (entry) {
                        const span = entry.endHour - entry.startHour;
                        for (let r = 0; r < span; r++) used.add(`${dayIdx}-${hour + r}`);
                        const pal = PALETTE[entry.colorIdx % PALETTE.length];
                        return (
                          <td key={dayIdx} rowSpan={span} className={styles.tdEntry}
                            style={{ background: pal.fill, borderColor: pal.border, color: pal.text }}
                            onClick={() => isEditMode && setSelectedEntry(entry)}>
                            
                            {isEditMode && !isExporting && (
                              <div className={styles.cellEditIcon}>
                                <Settings2 size={14} />
                              </div>
                            )}

                            <div className={styles.cellContent}>
                              <span className={styles.cellSubject}>{entry.subject}</span>
                              {entry.doctor && <span className={styles.cellDoctor}>{entry.doctor}</span>}
                              {entry.room && <span className={styles.cellRoom}>({entry.room})</span>}
                            </div>
                          </td>
                        );
                      }
                      return <td key={dayIdx} className={styles.tdEmpty} 
       onClick={() => isEditMode && clipboard ? handlePaste(dayIdx, hour) : null}
       style={{ cursor: isEditMode && clipboard ? 'crosshair' : 'default' }}
       title={isEditMode && clipboard ? 'انقر هنا للصق المحاضرة' : ''}
  >
    {isEditMode && clipboard && !isExporting && <div className={styles.pasteHint}><span>📋 لصق هنا</span></div>}
  </td>;
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Watermark - only visible during export */}
        {isExporting && (
          <div className={styles.watermark}>
            <span>تم تصميم هذا الجدول بواسطة </span>
            <strong>gama3thalak.online</strong>
          </div>
        )}

        {clipboard && isEditMode && !isExporting && (
        <div className={styles.clipboardBanner}>
          <span>وضع اللصق مفعل: <strong>{clipboard.subject}</strong></span>
          <button type="button" className={`btn btn-outline ${styles.exitBtn}`} onClick={() => setClipboard(null)}>
            خروج <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(Esc)</span>
          </button>
        </div>
      )}
      
      {entries.length === 0 && (
          <div className={styles.emptyHint}>
            <Calendar size={48} style={{ opacity: 0.3 }} />
            <p>الجدول فارغ — اضغط إضافة محاضرة لبدء بناء جدولك</p>
          </div>
        )}
      </div>
      
      {/* --- Sidebar Modal for Editing Entry --- */}
      {selectedEntry && (
        <>
          <div className={styles.sidebarOverlay} onClick={() => setSelectedEntry(null)} />
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h3>تعديل المحاضرة</h3>
              <button onClick={() => setSelectedEntry(null)} className={styles.closeBtn}><X size={20} /></button>
            </div>
            
            <div className={styles.sidebarBody}>
              <div className={styles.formGroup}>
                <label>اسم المادة</label>
                <input value={selectedEntry.subject} onChange={e => setSelectedEntry({...selectedEntry, subject: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>اسم الدكتور</label>
                <input value={selectedEntry.doctor} onChange={e => setSelectedEntry({...selectedEntry, doctor: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>رقم القاعة</label>
                <input value={selectedEntry.room} onChange={e => setSelectedEntry({...selectedEntry, room: e.target.value})} />
              </div>
              
              <div className={styles.sidebarRow}>
                <div className={styles.formGroup}>
                  <label>اليوم</label>
                  <select value={selectedEntry.day} onChange={e => setSelectedEntry({...selectedEntry, day: +e.target.value})}>
                    {DAYS_AR.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              
              <div className={styles.sidebarRow}>
                <div className={styles.formGroup}>
                  <label>من</label>
                  <select value={selectedEntry.startHour} onChange={e => setSelectedEntry({...selectedEntry, startHour: +e.target.value})}>
                    {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>إلى</label>
                  <select value={selectedEntry.endHour} onChange={e => setSelectedEntry({...selectedEntry, endHour: +e.target.value})}>
                    {HOURS.slice(1).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>لون المحاضرة</label>
                <div className={styles.colorPicker}>
                  {PALETTE.map((p, i) => (
                    <button type="button" key={i}
                      className={`${styles.colorDot} ${selectedEntry.colorIdx === i ? styles.colorDotActive : ''}`}
                      style={{ background: p.fill, outline: `3px solid ${selectedEntry.colorIdx === i ? p.border : 'transparent'}`, outlineOffset: '2px' }}
                      onClick={() => setSelectedEntry({...selectedEntry, colorIdx: i})}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.sidebarFooter}>
              <div className={styles.sidebarActions}>
                <button className="btn btn-outline" onClick={handleSidebarCopy} title="نسخ للصق في مكان آخر"><Copy size={16} /> نسخ</button>
                <button className={`btn btn-outline ${styles.deleteBtn}`} onClick={handleSidebarRemove}><Trash2 size={16} /> حذف</button>
              </div>
              <button className="btn btn-primary" style={{width: '100%', marginTop: '12px'}} onClick={saveSidebarChanges}>
                حفظ التعديلات
              </button>
            </div>
          </div>
        </>
      )}

      {toast && typeof document !== 'undefined' && createPortal(
        <div className={styles.toastContainer}>
          <div key={toast.id} className={`${styles.toastifyToast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`} onClick={() => setToast(null)}>
            <div className={styles.toastBody}>
              <div>{toast.message}</div>
            </div>
            <button className={styles.toastClose} type="button" aria-label="close" onClick={(e) => { e.stopPropagation(); setToast(null); }}>
              <svg aria-hidden="true" viewBox="0 0 14 16"><path fillRule="evenodd" d="M7.71 8.23l3.75 3.75-1.48 1.48-3.75-3.75-3.75 3.75L1 11.98l3.75-3.75L1 4.48 2.48 3l3.75 3.75L9.98 3l1.48 1.48-3.75 3.75z"></path></svg>
            </button>
            <div className={styles.toastProgress} style={{ animationDuration: '8000ms' }}></div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
