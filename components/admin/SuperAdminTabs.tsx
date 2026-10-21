import InlineLoader from '@/components/ui/InlineLoader';
import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, FileText, Plus, Trash2, ShieldAlert, BarChart3, Search, Pencil } from 'lucide-react';
import { getDashboardStats, getFaculties, getAllAnnouncements } from '@/services/supabase/data';
import { supabase } from '@/services/supabase/client';
import { Faculty, DashboardStats, Profile, Announcement } from '@/types';
import { escapeHtml } from '@/lib/escapeHtml';
import Swal from 'sweetalert2';
import styles from './Admin.module.css';
import SupportTickets from '@/components/support/SupportTickets';
import AdminFeedback from './AdminFeedback';

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hasRecordId = (value: unknown): value is string | number =>
  (typeof value === 'string' && value.trim() !== '' && value !== 'undefined' && value !== 'null')
  || (typeof value === 'number' && Number.isFinite(value));

export default function SuperAdminTabs({ activeTab, supportMode = false, canAssignCourses = false, canManageAnnouncements = false, announcementOwnerId, announcementScope }: { activeTab: string; supportMode?: boolean; canAssignCourses?: boolean; canManageAnnouncements?: boolean; announcementOwnerId?: string; announcementScope?: { facultyId: string; year: number } }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementFacultyFilter, setAnnouncementFacultyFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [statsFacultyId, setStatsFacultyId] = useState('');
  const [statsYear, setStatsYear] = useState('');
  const [usersFacultyId, setUsersFacultyId] = useState('');
  const [usersRole, setUsersRole] = useState('');
  const [studentIdDraft, setStudentIdDraft] = useState('');
  const [studentIdSearch, setStudentIdSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'stats') {
        const data = await getFaculties();
        setFaculties(data);
      } else if (activeTab === 'faculties') {
        const data = await getFaculties();
        setFaculties(data);
      } else if (activeTab === 'users') {
        fetchUsers({ facultyId: usersFacultyId, role: usersRole, studentId: studentIdSearch });
      } else if (activeTab === 'announcements') {
        const [data, facultyData] = await Promise.all([getAllAnnouncements(), getFaculties()]);
        setAnnouncements(data);
        setFaculties(facultyData);
      }
    };
    loadData();
  }, [activeTab, usersFacultyId, usersRole, studentIdSearch, supportMode]);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    let isCurrent = true;
    setLoadingStats(true);
    setStatsError('');
    getDashboardStats({
      facultyId: statsFacultyId || undefined,
      year: statsYear ? Number(statsYear) : undefined,
    }).then((data) => {
      if (isCurrent) setStats(data);
    }).catch(() => {
      if (isCurrent) setStatsError('تعذر تحميل الإحصائيات. حاول تحديث الصفحة.');
    }).finally(() => {
      if (isCurrent) setLoadingStats(false);
    });
    return () => { isCurrent = false; };
  }, [activeTab, statsFacultyId, statsYear]);

  async function fetchUsers(filters: { facultyId?: string; role?: string; studentId?: string } = {}) {
    setLoadingUsers(true);
    let profilesQuery = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (filters.facultyId) profilesQuery = profilesQuery.eq('faculty_id', filters.facultyId);
    if (filters.role) profilesQuery = profilesQuery.eq('role', filters.role);
    if (filters.studentId) profilesQuery = profilesQuery.eq('student_id', filters.studentId);
    const [{ data: profilesData, error }, facs] = await Promise.all([
      profilesQuery,
      getFaculties(),
    ]);
      
    if (error) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    
    if (profilesData) {
      setFaculties(facs);
      const facMap = new Map(facs.map(f => [f.id, f]));
      
      const mergedProfiles = profilesData.map(p => ({
        ...p,
        faculty: p.faculty_id ? facMap.get(p.faculty_id) : undefined
      }));
      
      setUsers(mergedProfiles as Profile[]);
    }
    setLoadingUsers(false);
  }

  async function handleAssignCourse(profile: Profile) {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, name_ar, year, semester, faculty_id, is_core')
      .eq('faculty_id', profile.faculty_id)
      .eq('is_active', true)
      .order('year')
      .order('name_ar');
    if (error || !courses?.length) {
      Swal.fire({ icon: 'error', title: 'تعذر تحميل المواد', text: error?.message || 'لا توجد مواد متاحة.' });
      return;
    }

    const { data: existingAccess } = await supabase.from('student_course_access').select('course_id').eq('student_id', profile.user_id);
    const grantedIds = new Set((existingAccess ?? []).map((row) => row.course_id));
    const years = [...new Set(courses.map((course) => course.year))]
      .filter((year) => year !== profile.year)
      .sort((a, b) => a - b);
    if (years.length === 0) {
      Swal.fire({ icon: 'info', title: 'لا توجد مواد متاحة', text: 'مفيش مواد متاحة من فرق تانية في كلية الطالب.' });
      return;
    }
    const yearOptions = years.map((year) => `<option value="${year}">الفرقة ${year}</option>`).join('');
    const { value: courseId } = await Swal.fire({
      title: `إضافة مادة لـ ${profile.full_name}`,
      html: `<label for="swal-course-year" style="display:block;text-align:right;margin:12px 0 6px;font-weight:700">اختر الفرقة</label><select id="swal-course-year" class="swal2-input" style="width:85%;direction:rtl"><option value="">اختر الفرقة</option>${yearOptions}</select><label for="swal-course-access" style="display:block;text-align:right;margin:12px 0 6px;font-weight:700">اختر المادة من كلية الطالب</label><select id="swal-course-access" class="swal2-input" style="width:85%;direction:rtl" disabled><option value="">اختر الفرقة أولًا</option></select>`,
      showCancelButton: true,
      confirmButtonText: 'إضافة المادة',
      cancelButtonText: 'إلغاء',
      didOpen: () => {
        const yearSelect = document.getElementById('swal-course-year') as HTMLSelectElement;
        const courseSelect = document.getElementById('swal-course-access') as HTMLSelectElement;
        yearSelect.addEventListener('change', () => {
          courseSelect.replaceChildren(new Option('اختر المادة', ''));
          const matchingCourses = courses.filter((course) => String(course.year) === yearSelect.value);
          for (const course of matchingCourses) {
            const status = grantedIds.has(course.id) ? 'مادة محولة'
              : course.year === profile.year && course.is_core !== false ? 'مادة أساسية'
              : 'مادة غير مضافة';
            const option = new Option(`${course.name_ar} — ${status} · الترم ${course.semester}`, course.id);
            option.disabled = grantedIds.has(course.id);
            courseSelect.add(option);
          }
          courseSelect.disabled = !yearSelect.value;
          if (matchingCourses.length === 0) courseSelect.replaceChildren(new Option('لا توجد مواد في هذه الفرقة', ''));
        });
      },
      preConfirm: () => {
        const selected = (document.getElementById('swal-course-access') as HTMLSelectElement).value;
        if (!selected) Swal.showValidationMessage('اختر مادة أولاً');
        return selected;
      },
    });
    if (!courseId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('student_course_access').insert({
      student_id: profile.user_id,
      course_id: courseId,
      assigned_by: user?.id,
      reason: 'summer_course',
    });
    if (insertError) {
      Swal.fire({ icon: 'error', title: 'تعذر إضافة المادة', text: insertError.code === '23505' ? 'الطالب لديه صلاحية لهذه المادة بالفعل.' : insertError.message });
      return;
    }
    Swal.fire({ icon: 'success', title: 'تمت إضافة المادة للطالب', timer: 1500, showConfirmButton: false });
  }

  async function handleAddFaculty() {
    const { value: name } = await Swal.fire({
      title: 'اسم الكلية بالعربية',
      input: 'text',
      inputPlaceholder: 'مثال: كلية الطب البشري',
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
    });
    if (!name?.trim()) return;

    const { error } = await supabase.from('faculties').insert({
      name_ar: name.trim(),
      name_en: name.trim(),
      color: '#5b4fdc',
      icon: 'GraduationCap',
    });

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: 'تمت الإضافة بنجاح!', timer: 1500, showConfirmButton: false });
      getFaculties().then(setFaculties);
    }
  }

  async function handleDeleteFaculty(id: string, name: string) {
    const result = await Swal.fire({
      title: 'تأكيد الحذف',
      text: `هل أنت متأكد من حذف ${name}؟ سيتم حذف جميع المواد المتعلقة بها!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('faculties').delete().eq('id', id);
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
      getFaculties().then(setFaculties);
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    }
  }

  async function handleRoleChange(profileId: string, newRole: string) {
    if (supportMode) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);
    
    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: 'تم تحديث الصلاحية', timer: 1200, showConfirmButton: false });
      fetchUsers({ facultyId: usersFacultyId, role: usersRole, studentId: studentIdSearch });
    }
  }

  async function handleAssignYear(profileId: string, currentYear: number) {
    const { value: selectedYear } = await Swal.fire({
      title: 'تعيين الفرقة',
      input: 'select',
      inputOptions: {
        1: 'الفرقة 1',
        2: 'الفرقة 2',
        3: 'الفرقة 3',
        4: 'الفرقة 4',
        5: 'الفرقة 5',
        6: 'الفرقة 6'
      },
      inputValue: currentYear || 1,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء'
    });

    if (selectedYear) {
      const { error } = await supabase
        .from('profiles')
        .update({ year: parseInt(selectedYear) })
        .eq('id', profileId);
      
      if (error) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
      } else {
        Swal.fire({ icon: 'success', title: 'تم التعيين بنجاح', timer: 1200, showConfirmButton: false });
        fetchUsers({ facultyId: usersFacultyId, role: usersRole, studentId: studentIdSearch });
      }
    }
  }

  async function handleResetPassword(userId: string) {
    const { value: newPassword } = await Swal.fire({
      title: 'تغيير كلمة المرور',
      input: 'password',
      inputPlaceholder: 'أدخل كلمة المرور الجديدة',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'تغيير',
      cancelButtonText: 'إلغاء'
    });

    if (newPassword) {
      Swal.fire({ title: 'جاري التغيير...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': session ? `Bearer ${session.access_token}` : ''
          },
          body: JSON.stringify({ userId, newPassword })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'فشل في تغيير كلمة المرور');
        }
        
        Swal.fire({ icon: 'success', title: 'تم التغيير بنجاح', timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: err.message });
      }
    }
  }

  async function handleAssignFaculty(profileId: string) {
    const facs = await getFaculties();
    let optionsHtml = '<option value="">بدون كلية</option>';
    facs.forEach(f => {
      optionsHtml += `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name_ar)}</option>`;
    });

    const { value: selectedFacultyId } = await Swal.fire({
      title: 'تعيين كلية',
      html: `<select id="swal-fac" class="swal2-input">${optionsHtml}</select>`,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        return (document.getElementById('swal-fac') as HTMLSelectElement).value;
      }
    });

    if (selectedFacultyId !== undefined) {
      const { error } = await supabase
        .from('profiles')
        .update({ faculty_id: selectedFacultyId || null })
        .eq('id', profileId);
      
      if (error) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
      } else {
        Swal.fire({ icon: 'success', title: 'تم تحديث الكلية', timer: 1200, showConfirmButton: false });
        fetchUsers({ facultyId: usersFacultyId, role: usersRole, studentId: studentIdSearch });
      }
    }
  }

  async function handleAddAnnouncement(existing?: Announcement) {
    const facultyOptions = faculties.map((faculty) =>
      `<option value="${faculty.id}" ${faculty.id === existing?.faculty_id ? 'selected' : ''}>${escapeHtml(faculty.name_ar)}</option>`
    ).join('');
    const localDateTime = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const toLocalInput = (value?: string | null) => value ? localDateTime(new Date(value)) : '';
    const { value: formValues } = await Swal.fire({
      title: existing ? 'تعديل الإعلام' : announcementScope ? 'إضافة إعلام لفرقتك' : 'إضافة إعلام جديد',
      html: `
        ${announcementScope ? `<p style="direction:rtl;text-align:right;font-weight:700;color:var(--secondary)">سيظهر هذا الإعلام لطلاب كليتك في الفرقة ${announcementScope.year} فقط.</p>` : ''}
        <input id="swal-ann-title" class="swal2-input" placeholder="العنوان" value="${escapeHtml(existing?.title ?? '')}" style="direction:rtl">
        <input id="swal-ann-sub" class="swal2-input" placeholder="محتوى الإعلام" value="${escapeHtml(existing?.subtitle ?? '')}" style="direction:rtl">
        <div style="text-align:right;margin-top:14px">
          <label for="swal-ann-start" style="font-size:.9rem;font-weight:700;color:var(--text-dark)">يبدأ الظهور</label>
          <input id="swal-ann-start" type="datetime-local" class="swal2-input" style="direction:ltr;margin-top:5px" value="${toLocalInput(existing?.start_time) || localDateTime(new Date())}">
          <label for="swal-ann-end" style="font-size:.9rem;font-weight:700;color:var(--text-dark)">ينتهي الظهور (اختياري)</label>
          <input id="swal-ann-end" type="datetime-local" class="swal2-input" style="direction:ltr;margin-top:5px" value="${toLocalInput(existing?.end_time)}">
        </div>
        ${canManageAnnouncements ? `
          <div style="text-align:right;margin-top:14px">
            <label for="swal-ann-audience" style="font-size:.9rem;font-weight:700;color:var(--text-dark)">يظهر لمين؟</label>
            <select id="swal-ann-audience" class="swal2-input" style="direction:rtl;margin-top:5px">
              <option value="all" ${existing && !existing.faculty_id ? 'selected' : ''}>كل الطلاب</option>
              <option value="cohort" ${existing?.faculty_id ? 'selected' : ''}>كلية وفرقة محددتان</option>
            </select>
            <select id="swal-ann-faculty" class="swal2-input" style="direction:rtl;margin-top:5px">
              <option value="">اختر الكلية</option>${facultyOptions}
            </select>
            <select id="swal-ann-year" class="swal2-input" style="direction:rtl;margin-top:5px">
              <option value="">اختر الفرقة</option>
              ${[1, 2, 3, 4, 5, 6].map((year) => `<option value="${year}" ${year === existing?.year ? 'selected' : ''}>الفرقة ${year}</option>`).join('')}
            </select>
          </div>
          <p style="direction:rtl;text-align:right;margin-top:12px;font-size:.9rem;font-weight:700;color:var(--secondary)">الإعلام الأحدث بيظهر الأول، وأدمن الكلية ما يقدرش يعدّل أو يحذف أو يعطّل إعلامات السوبر أدمن.</p>
        ` : ''}
        <div style="text-align: right; margin-top: 15px;">
          <label style="font-size: 0.9rem; font-weight: 700; color: var(--text-dark);">حالة الإعلام</label>
          <select id="swal-ann-active" class="swal2-input" style="direction:rtl; margin-top:5px;">
            <option value="true" ${existing?.is_active !== false ? 'selected' : ''}>مفعل (يظهر للطلاب)</option>
            <option value="false" ${existing?.is_active === false ? 'selected' : ''}>معطل</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: existing ? 'حفظ التعديلات' : 'إضافة',
      cancelButtonText: 'إلغاء',
      didOpen: () => {
        if (!canManageAnnouncements) return;
        const audienceSelect = document.getElementById('swal-ann-audience') as HTMLSelectElement;
        const facultySelect = document.getElementById('swal-ann-faculty') as HTMLSelectElement;
        const yearSelect = document.getElementById('swal-ann-year') as HTMLSelectElement;
        const syncAudienceFields = () => {
          const needsCohort = audienceSelect.value === 'cohort';
          facultySelect.disabled = !needsCohort;
          yearSelect.disabled = !needsCohort;
          facultySelect.classList.toggle('announcement-target-disabled', !needsCohort);
          yearSelect.classList.toggle('announcement-target-disabled', !needsCohort);
        };
        audienceSelect.addEventListener('change', syncAudienceFields);
        syncAudienceFields();
      },
      preConfirm: () => {
        const audience = canManageAnnouncements
          ? (document.getElementById('swal-ann-audience') as HTMLSelectElement).value
          : 'cohort';
        const facultyId = canManageAnnouncements
          ? (document.getElementById('swal-ann-faculty') as HTMLSelectElement).value
          : announcementScope?.facultyId ?? '';
        const yearValue = canManageAnnouncements
          ? (document.getElementById('swal-ann-year') as HTMLSelectElement).value
          : String(announcementScope?.year ?? '');
        const startValue = (document.getElementById('swal-ann-start') as HTMLInputElement).value;
        const endValue = (document.getElementById('swal-ann-end') as HTMLInputElement).value;
        if (audience === 'cohort' && (!isUuid(facultyId) || !yearValue)) {
          Swal.showValidationMessage('اختر الكلية والفرقة المستهدفتين.');
          return;
        }
        if (!isUuid(announcementOwnerId) && !canManageAnnouncements) {
          Swal.showValidationMessage('تعذر التحقق من حساب الأدمن. حدّث الصفحة وحاول مرة أخرى.');
          return;
        }
        if (!startValue || (endValue && new Date(endValue) <= new Date(startValue))) {
          Swal.showValidationMessage('تأكد من موعد بداية ونهاية عرض الإعلام.');
          return;
        }
        return {
          title: (document.getElementById('swal-ann-title') as HTMLInputElement).value,
          subtitle: (document.getElementById('swal-ann-sub') as HTMLInputElement).value,
          is_active: (document.getElementById('swal-ann-active') as HTMLSelectElement).value === 'true',
          faculty_id: audience === 'all' ? null : facultyId,
          year: audience === 'all' ? null : Number(yearValue),
          start_time: new Date(startValue).toISOString(),
          end_time: endValue ? new Date(endValue).toISOString() : null,
          priority: existing?.priority ?? (canManageAnnouncements ? 1 : 0),
        };
      }
    });

    if (!formValues?.title?.trim()) return;
    if (existing && !hasRecordId(existing.id)) {
      Swal.fire({ icon: 'error', title: 'تعذر تعديل الإعلام', text: 'معرّف الإعلام غير صالح. حدّث الصفحة وحاول مرة أخرى.' });
      return;
    }

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const announcementPayload = {
      title: formValues.title.trim(),
      subtitle: formValues.subtitle?.trim() || null,
      is_active: formValues.is_active,
      faculty_id: formValues.faculty_id,
      year: formValues.year,
      priority: formValues.priority,
      start_time: formValues.start_time,
      end_time: formValues.end_time,
    };
    const { error } = existing
      ? await supabase.from('announcements').update(announcementPayload).eq('id', existing.id)
      : await supabase.from('announcements').insert(announcementPayload);

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: existing ? 'تم تعديل الإعلام بنجاح!' : 'تمت الإضافة بنجاح!', timer: 1500, showConfirmButton: false });
      getAllAnnouncements().then(setAnnouncements);
    }
  }

  async function handleToggleAnnouncement(announcement: Announcement) {
    if (!hasRecordId(announcement.id)) {
      Swal.fire({ icon: 'error', title: 'تعذر تحديث الإعلام', text: 'معرّف الإعلام غير صالح. حدّث الصفحة وحاول مرة أخرى.' });
      return;
    }
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !announcement.is_active })
      .eq('id', announcement.id);
    
    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      getAllAnnouncements().then(setAnnouncements);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!hasRecordId(id)) {
      Swal.fire({ icon: 'error', title: 'تعذر حذف الإعلام', text: 'معرّف الإعلام غير صالح. حدّث الصفحة وحاول مرة أخرى.' });
      return;
    }
    const result = await Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل أنت متأكد من حذف هذا الإعلام بشكل نهائي؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
      getAllAnnouncements().then(setAnnouncements);
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    }
  }

  if (activeTab === 'stats') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <BarChart3 size={24} color="var(--secondary)" />
            إحصائيات المنصة
          </h1>
        </div>

        <div className={styles.statsFilters}>
          <label className={styles.filterField}>
            <span>الكلية</span>
            <select className="input" value={statsFacultyId} onChange={(event) => setStatsFacultyId(event.target.value)}>
              <option value="">كل الكليات</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name_ar}</option>
              ))}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>الفرقة</span>
            <select className="input" value={statsYear} onChange={(event) => setStatsYear(event.target.value)}>
              <option value="">كل الفرق</option>
              {[1, 2, 3, 4, 5, 6].map((year) => (
                <option key={year} value={year}>الفرقة {['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'][year - 1]}</option>
              ))}
            </select>
          </label>
          {loadingStats && <span className={styles.filterStatus}>جارٍ تحديث الإحصائيات…</span>}
        </div>

        {statsError && <p className={styles.statsError} role="alert">{statsError}</p>}
        
        <div className={styles.statGrid}>
          {[
            { label: 'الطلاب المسجلين', value: stats?.total_students ?? '—', color: '#5b4fdc', icon: Users },
            { label: 'الكليات المشمولة', value: stats?.total_faculties ?? '—', color: '#8b31e8', icon: GraduationCap },
            { label: 'المواد الدراسية', value: stats?.total_courses ?? '—', color: '#06c4d4', icon: BookOpen },
            { label: 'المحتوى المضاف', value: stats?.total_materials ?? '—', color: '#22c55e', icon: FileText },
          ].map((s) => (
            <div key={s.label} className={styles.statCard} style={{ borderBottom: `4px solid ${s.color}`, opacity: loadingStats ? 0.65 : 1 }}>
              <div style={{ color: s.color }}><s.icon size={28} /></div>
              <p className={styles.statValue}>{s.value}</p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'faculties') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <GraduationCap size={24} color="var(--secondary)" />
            إدارة الكليات
          </h1>
          <button className="btn btn-primary btn-sm" onClick={handleAddFaculty}>
            <Plus size={16} /> إضافة كلية جديدة
          </button>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>اسم الكلية</th>
                <th>تاريخ الإضافة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 700 }}>{f.name_ar}</td>
                  <td>{new Date(f.created_at).toLocaleDateString('ar-EG')}</td>
                  <td>
                    <div className={styles.actionCell}>
                      <button className={styles.iconBtnDanger} onClick={() => handleDeleteFaculty(f.id, f.name_ar)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {faculties.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyState}>لا توجد كليات مضافة حتى الآن.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'users') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <Users size={24} color="var(--secondary)" />
            إدارة المستخدمين
          </h1>
        </div>

        <div className={styles.userFilters}>
          <label className={styles.filterField}>
            <span>الكلية</span>
            <select className="input" value={usersFacultyId} onChange={(event) => setUsersFacultyId(event.target.value)}>
              <option value="">جميع الكليات</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name_ar}</option>
              ))}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>الدور</span>
            <select className="input" value={usersRole} onChange={(event) => setUsersRole(event.target.value)}>
              <option value="">كل الأدوار</option>
              <option value="student">طالب</option>
              <option value="admin">أدمن</option>
              <option value="superadmin">سوبر أدمن</option>
              <option value="support">دعم فني</option>
            </select>
          </label>
          <form className={styles.idSearchForm} onSubmit={(event) => { event.preventDefault(); setStudentIdSearch(studentIdDraft.trim()); }}>
            <label className={styles.filterField}>
              <span>البحث بمعرّف الطالب فقط</span>
              <input className="input" inputMode="numeric" value={studentIdDraft} onChange={(event) => setStudentIdDraft(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="مثال: 5831047296" />
            </label>
            <button className="btn btn-primary btn-sm" type="submit"><Search size={16} /> بحث</button>
            {studentIdSearch && <button className="btn btn-outline btn-sm" type="button" onClick={() => { setStudentIdDraft(''); setStudentIdSearch(''); }}>مسح البحث</button>}
          </form>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>معرّف الطالب</th>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الصلاحية</th>
                <th>الكلية / الفرقة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr><td colSpan={6}><InlineLoader text="جاري تحميل المستخدمين..." /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td><code dir="ltr" className={styles.studentIdValue}>{u.student_id || '—'}</code></td>
                  <td style={{ fontWeight: 700 }}>{u.full_name}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{u.email || '-'}</td>
                  <td>
                    <span className={`badge ${u.role === 'superadmin' ? 'badge-primary' : u.role === 'admin' ? 'badge-success' : u.role === 'support' ? styles.supportBadge : 'badge-info'}`}>
                      {u.role === 'superadmin' ? 'سوبر أدمن' : u.role === 'admin' ? 'أدمن' : u.role === 'support' ? 'دعم فني' : 'طالب'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <button className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }} onClick={() => handleAssignFaculty(u.id)}>
                        {u.faculty?.name_ar || 'تعيين كلية'}
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }} onClick={() => handleAssignYear(u.id, u.year)}>
                        الفرقة {u.year}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionCell} style={{ flexDirection: 'column', gap: '8px' }}>
                      {!supportMode && <select 
                        className="input" 
                        style={{ width: '120px', padding: '4px', fontSize: '0.8rem' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="student">طالب</option>
                        <option value="admin">أدمن</option>
                        <option value="superadmin">سوبر أدمن</option>
                        <option value="support">دعم فني</option>
                      </select>}

                      {canAssignCourses && u.role === 'student' && (
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => handleAssignCourse(u)}>
                          <Plus size={14} /> إضافة لمادة
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-sm" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#e11d48', color: 'white', border: 'none', width: '120px' }} 
                        onClick={() => handleResetPassword(u.user_id)}
                      >
                        تغيير الباسوورد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingUsers && users.length === 0 && (
                <tr><td colSpan={6} className={styles.emptyState}>لا يوجد مستخدمون ضمن هذا الاختيار.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'announcements') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <ShieldAlert size={24} color="var(--secondary)" />
            إدارة الإعلامات (Banners)
          </h1>
          {canManageAnnouncements && (
            <select
              className="input"
              aria-label="تصفية الإعلامات حسب الكلية"
              value={announcementFacultyFilter}
              onChange={(event) => setAnnouncementFacultyFilter(event.target.value)}
              style={{ width: 260, margin: 0 }}
            >
              <option value="all">كل الكليات والإعلامات العامة</option>
              <option value="global">الإعلامات العامة لكل الطلاب</option>
              {faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name_ar}</option>)}
            </select>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => handleAddAnnouncement()}>
            <Plus size={16} /> إضافة إعلام جديد
          </button>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>العنوان</th>
                <th>النص الفرعي</th>
                <th>النطاق</th>
                <th>الناشر</th>
                <th>مواعيد العرض</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {announcements
                .filter((announcement) => announcementScope
                  ? Boolean(announcement.faculty_id)
                  : announcementFacultyFilter === 'all'
                    || !announcement.faculty_id
                    || announcement.faculty_id === announcementFacultyFilter)
                .map((a) => {
                const canManage = canManageAnnouncements
                  || (!!announcementScope
                    && a.faculty_id === announcementScope.facultyId
                    && a.year === announcementScope.year
                    && a.created_by === announcementOwnerId
                    && a.priority === 0);
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>{a.title}</td>
                    <td>{a.subtitle || '-'}</td>
                    <td>{a.faculty_id
                      ? `${faculties.find((faculty) => faculty.id === a.faculty_id)?.name_ar || 'كلية محددة'} · ${a.year ? `الفرقة ${a.year}` : 'كل الفرق'}`
                      : 'كل الطلاب'}</td>
                    <td>{a.priority === 1 ? 'السوبر أدمن' : 'أدمن الكلية'}</td>
                    <td>
                      <div>يبدأ: {new Date(a.start_time).toLocaleString('ar-EG')}</div>
                      <div>ينتهي: {a.end_time ? new Date(a.end_time).toLocaleString('ar-EG') : 'بدون موعد انتهاء'}</div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleAnnouncement(a)}
                        className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: canManage ? 'pointer' : 'default', border: 'none', opacity: canManage ? 1 : 0.65 }}
                        disabled={!canManage}
                        title={canManage ? 'اضغط لتغيير الحالة' : 'إعلام السوبر أدمن؛ لا يمكن تعديله من حسابك'}
                      >
                        {a.is_active ? 'مفعل' : 'معطل'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleAddAnnouncement(a)}
                          disabled={!canManage}
                          title={canManage ? 'تعديل الإعلام' : 'لا تملك صلاحية تعديل هذا الإعلام'}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className={styles.iconBtnDanger}
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          disabled={!canManage}
                          title={canManage ? 'حذف الإعلام' : 'إعلام السوبر أدمن؛ لا يمكن حذفه من حسابك'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {announcements.filter((announcement) => announcementScope
                ? Boolean(announcement.faculty_id)
                : announcementFacultyFilter === 'all'
                  || !announcement.faculty_id
                  || announcement.faculty_id === announcementFacultyFilter).length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>لا توجد إعلامات مضافة حتى الآن.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'tickets') {
    return <SupportTickets staffView />;
  }

  if (activeTab === 'feedback' && canManageAnnouncements) {
    return <AdminFeedback />;
  }

  return null;
}
