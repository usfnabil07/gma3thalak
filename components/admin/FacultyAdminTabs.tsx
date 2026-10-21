import { useState, useEffect } from 'react';
import { BookOpen, FileText, Plus, Trash2, Layers, Pencil, FolderOpen, FolderPlus, Headphones } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { Course, Material, CourseSection, MaterialGroup, MaterialType } from '@/types';
import { getCourseSections, getMaterialGroups } from '@/services/supabase/data';
import { escapeHtml } from '@/lib/escapeHtml';
import Swal from 'sweetalert2';
import styles from './Admin.module.css';

function validateFile(file: File, type: 'audio' | 'image' | 'video' | 'file'): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (type === 'image') {
    const validImageExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!validImageExts.includes(ext || '')) return 'امتداد الصورة غير مدعوم. المسموح: jpg, jpeg, png, webp';
    if (file.size > 5 * 1024 * 1024) return 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت';
  } else if (type === 'video') {
    const validVideoExts = ['mp4', 'webm', 'ogg'];
    if (!validVideoExts.includes(ext || '')) return 'امتداد الفيديو غير مدعوم. المسموح: mp4, webm';
    if (file.size > 100 * 1024 * 1024) return 'حجم الفيديو يجب ألا يتجاوز 100 ميجابايت';
  } else if (type === 'audio') {
    const validAudioExts = ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'aac'];
    if (!validAudioExts.includes(ext || '')) return 'امتداد الصوت غير مدعوم. المسموح: mp3, m4a, wav, ogg, webm, aac';
    if (file.size > 50 * 1024 * 1024) return 'حجم الملف الصوتي يجب ألا يتجاوز 50 ميجابايت';
  } else if (type === 'file') {
    const validFileExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'rar'];
    if (!validFileExts.includes(ext || '')) return 'امتداد الملف غير مدعوم. (HTML أو البرامج التنفيذية غير مسموحة)';
    if (file.size > 50 * 1024 * 1024) return 'حجم الملف يجب ألا يتجاوز 50 ميجابايت';
  }
  
  // Extra strict check
  const maliciousExts = ['html', 'htm', 'svg', 'js', 'exe', 'sh', 'php', 'bat', 'cmd'];
  if (maliciousExts.includes(ext || '')) return 'هذا النوع من الملفات محظور لأسباب أمنية';
  
  return null; // Valid
}

export default function FacultyAdminTabs({ activeTab, facultyId, adminYear }: { activeTab: string, facultyId: string, adminYear?: number }) {
  const [selectedYear, setSelectedYear] = useState(adminYear || 1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);

  useEffect(() => {
    setSelectedCourse(null);
    setSections([]);
    setMaterials([]);
    setMaterialGroups([]);
    fetchCourses();
  }, [selectedYear, facultyId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchSectionsAndMaterials();
    } else {
      setSections([]);
      setMaterials([]);
      setMaterialGroups([]);
    }
  }, [selectedCourse]);

  async function fetchCourses() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('faculty_id', facultyId)
      .eq('year', selectedYear)
      .order('semester');
    if (data) setCourses(data as Course[]);
  }

  async function fetchSectionsAndMaterials() {
    if (!selectedCourse) return;
    const [secs, groups, { data }] = await Promise.all([
      getCourseSections(selectedCourse.id),
      getMaterialGroups(selectedCourse.id),
      supabase.from('materials').select('*').eq('course_id', selectedCourse.id).order('created_at', { ascending: false }),
    ]);
    setSections(secs);
    setMaterialGroups(groups);
    if (data) setMaterials(data as Material[]);
  }

  async function handleAddCourse() {
    const { value: formValues } = await Swal.fire({
      title: 'إضافة مادة جديدة',
      html: `
        <input id="swal-c-name-ar" class="swal2-input" placeholder="اسم المادة بالعربي" style="direction:rtl">
        <input id="swal-c-name-en" class="swal2-input" placeholder="اسم المادة بالإنجليزي" dir="ltr">
        <input id="swal-c-doctor" class="swal2-input" placeholder="اسم الدكتور / الدكتورة" style="direction:rtl">
        <select id="swal-c-semester" class="swal2-input" style="direction:rtl">
          <option value="1">الترم الأول</option>
          <option value="2">الترم الثاني</option>
        </select>
        <select id="swal-c-is-core" class="swal2-input" style="direction:rtl">
          <option value="true">مادة أساسية (مضافة للمجموع)</option>
          <option value="false">مادة غير مضافة للمجموع</option>
        </select>
        <input id="swal-c-credits" type="number" class="swal2-input" placeholder="عدد الساعات المعتمدة" value="3">
        <div style="text-align: right; margin-top: 15px;">
          <label style="font-size: 0.9rem; font-weight: 700; color: var(--text-dark);">صورة المادة (اختر صورة من جهازك)</label>
          <input id="swal-c-image-file" type="file" accept="image/*" class="swal2-file" style="margin-top: 5px; width: 80%;">
        </div>
        <input id="swal-c-image" class="swal2-input" placeholder="أو ضع رابط صورة خارجي (اختياري)" dir="ltr">
        <textarea id="swal-c-desc" class="swal2-textarea" placeholder="وصف المادة" style="direction:rtl"></textarea>
        <textarea id="swal-c-features" class="swal2-textarea" placeholder="تفاصيل ومميزات المادة (اكتب كل ميزة في سطر منفصل)" style="direction:rtl; margin-top:10px;"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => ({
        name_ar: (document.getElementById('swal-c-name-ar') as HTMLInputElement).value,
        name_en: (document.getElementById('swal-c-name-en') as HTMLInputElement).value,
        doctor_name: (document.getElementById('swal-c-doctor') as HTMLInputElement).value,
        semester: parseInt((document.getElementById('swal-c-semester') as HTMLSelectElement).value),
        is_core: (document.getElementById('swal-c-is-core') as HTMLSelectElement).value === 'true',
        credits: parseInt((document.getElementById('swal-c-credits') as HTMLInputElement).value) || 3,
        image_url: (document.getElementById('swal-c-image') as HTMLInputElement).value,
        description: (document.getElementById('swal-c-desc') as HTMLTextAreaElement).value,
        features: (document.getElementById('swal-c-features') as HTMLTextAreaElement).value,
        file: (document.getElementById('swal-c-image-file') as HTMLInputElement)?.files?.[0] || null,
      }),
    });

    if (!formValues?.name_ar?.trim()) return;

    let imageUrl = formValues.image_url?.trim() || null;
    const file = formValues.file;

    if (file) {
      const errorMsg = validateFile(file, 'image');
      if (errorMsg) {
        Swal.fire({ icon: 'error', title: 'ملف غير صالح', text: errorMsg });
        return;
      }
      
      Swal.fire({
        title: 'جاري رفع الصورة...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course_images')
        .upload(fileName, file);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('course_images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } else {
        Swal.fire({ icon: 'error', title: 'خطأ في رفع الصورة', text: uploadError.message });
        return;
      }
    }

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const { error } = await supabase.from('courses').insert({
      faculty_id: facultyId,
      year: selectedYear,
      semester: formValues.semester,
      name_ar: formValues.name_ar.trim(),
      name_en: formValues.name_en.trim() || formValues.name_ar.trim(),
      credit_hours: formValues.credits,
      doctor_name: formValues.doctor_name?.trim() || null,
      image_url: imageUrl,
      description: formValues.description?.trim() || null,
      features: formValues.features?.trim() ? formValues.features.split('\n').map((f: string) => f.trim()).filter((f: string) => f) : null,
      is_active: true,
      is_core: formValues.is_core
    });

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: 'تمت إضافة المادة!', timer: 1500, showConfirmButton: false });
      fetchCourses();
    }
  }

  async function handleEditCourse(course: Course) {
    const { value: formValues } = await Swal.fire({
      title: 'تعديل بيانات المادة',
      html: `
        <input id="swal-ce-name-ar" class="swal2-input" placeholder="اسم المادة بالعربي" style="direction:rtl" value="${escapeHtml(course.name_ar)}">
        <input id="swal-ce-name-en" class="swal2-input" placeholder="اسم المادة بالإنجليزي" dir="ltr" value="${escapeHtml(course.name_en || '')}">
        <input id="swal-ce-doctor" class="swal2-input" placeholder="اسم الدكتور / الدكتورة" style="direction:rtl" value="${escapeHtml(course.doctor_name || '')}">
        <select id="swal-ce-semester" class="swal2-input" style="direction:rtl">
          <option value="1" ${course.semester === 1 ? 'selected' : ''}>الترم الأول</option>
          <option value="2" ${course.semester === 2 ? 'selected' : ''}>الترم الثاني</option>
        </select>
        <select id="swal-ce-is-core" class="swal2-input" style="direction:rtl">
          <option value="true" ${course.is_core !== false ? 'selected' : ''}>مادة أساسية (مضافة للمجموع)</option>
          <option value="false" ${course.is_core === false ? 'selected' : ''}>مادة غير مضافة للمجموع</option>
        </select>
        <input id="swal-ce-credits" type="number" class="swal2-input" placeholder="عدد الساعات المعتمدة" value="${course.credit_hours}">
        <div style="text-align: right; margin-top: 15px;">
          <label style="font-size: 0.9rem; font-weight: 700; color: var(--text-dark);">تغيير صورة المادة (اختر صورة جديدة)</label>
          <input id="swal-ce-image-file" type="file" accept="image/*" class="swal2-file" style="margin-top: 5px; width: 80%;">
        </div>
        <input id="swal-ce-image" class="swal2-input" placeholder="أو رابط صورة خارجية" dir="ltr" value="${escapeHtml(course.image_url || '')}">
        <textarea id="swal-ce-desc" class="swal2-textarea" placeholder="وصف المادة" style="direction:rtl">${escapeHtml(course.description || '')}</textarea>
        <textarea id="swal-ce-features" class="swal2-textarea" placeholder="تفاصيل ومميزات المادة (اكتب كل ميزة في سطر منفصل)" style="direction:rtl; margin-top:10px;">${escapeHtml(course.features ? course.features.join('\n') : '')}</textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => ({
        name_ar: (document.getElementById('swal-ce-name-ar') as HTMLInputElement).value,
        name_en: (document.getElementById('swal-ce-name-en') as HTMLInputElement).value,
        doctor_name: (document.getElementById('swal-ce-doctor') as HTMLInputElement).value,
        semester: parseInt((document.getElementById('swal-ce-semester') as HTMLSelectElement).value),
        is_core: (document.getElementById('swal-ce-is-core') as HTMLSelectElement).value === 'true',
        credits: parseInt((document.getElementById('swal-ce-credits') as HTMLInputElement).value) || 3,
        image_url: (document.getElementById('swal-ce-image') as HTMLInputElement).value,
        description: (document.getElementById('swal-ce-desc') as HTMLTextAreaElement).value,
        features: (document.getElementById('swal-ce-features') as HTMLTextAreaElement).value,
        file: (document.getElementById('swal-ce-image-file') as HTMLInputElement)?.files?.[0] || null,
      }),
    });

    if (!formValues?.name_ar?.trim()) return;

    let imageUrl = formValues.image_url?.trim() || null;
    const file = formValues.file;

    if (file) {
      const errorMsg = validateFile(file, 'image');
      if (errorMsg) {
        Swal.fire({ icon: 'error', title: 'ملف غير صالح', text: errorMsg });
        return;
      }
      
      Swal.fire({
        title: 'جاري رفع الصورة الجديدة...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course_images')
        .upload(fileName, file);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('course_images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } else {
        Swal.fire({ icon: 'error', title: 'خطأ في رفع الصورة', text: uploadError.message });
        return;
      }
    }

    Swal.fire({ title: 'جاري حفظ التعديلات...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const { error } = await supabase.from('courses').update({
      semester: formValues.semester,
      name_ar: formValues.name_ar.trim(),
      name_en: formValues.name_en.trim() || formValues.name_ar.trim(),
      credit_hours: formValues.credits,
      doctor_name: formValues.doctor_name?.trim() || null,
      image_url: imageUrl,
      description: formValues.description?.trim() || null,
      features: formValues.features?.trim() ? formValues.features.split('\n').map((f: string) => f.trim()).filter((f: string) => f) : null,
      is_core: formValues.is_core
    }).eq('id', course.id);

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: 'تم تحديث المادة!', timer: 1500, showConfirmButton: false });
      fetchCourses();
    }
  }

  async function handleDeleteCourse(id: string, name: string) {
    const result = await Swal.fire({
      title: 'حذف مادة',
      text: `هل أنت متأكد من حذف ${name}؟ سيتم حذف جميع المحتويات بداخلها!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
      if (selectedCourse?.id === id) setSelectedCourse(null);
      fetchCourses();
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    }
  }

  async function handleAddSection() {
    if (!selectedCourse) return;
    
    const { value: title } = await Swal.fire({
      title: 'إضافة أسبوع أو محاضرة',
      input: 'text',
      inputPlaceholder: 'مثال: المحاضرة الأولى / الأسبوع الأول',
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
    });

    if (!title?.trim()) return;

    const { error } = await supabase.from('course_sections').insert({
      course_id: selectedCourse.id,
      title: title.trim(),
      order_index: sections.length
    });

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      fetchSectionsAndMaterials();
    }
  }

  async function handleDeleteSection(sectionId: string) {
    const result = await Swal.fire({
      title: 'حذف السكشن',
      text: `هل أنت متأكد من حذف هذا السكشن ومحتوياته؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('course_sections').delete().eq('id', sectionId);
    if (!error) {
      fetchSectionsAndMaterials();
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    }
  }

  async function handleAddMaterialGroup(sectionId: string) {
    if (!selectedCourse) return;

    const { value: title } = await Swal.fire({
      title: 'إضافة مجموعة محتوى',
      input: 'text',
      inputPlaceholder: 'مثال: الأسايمنتات',
      showCancelButton: true,
      confirmButtonText: 'إضافة المجموعة',
      cancelButtonText: 'إلغاء',
    });
    if (!title?.trim()) return;

    const orderIndex = materialGroups.filter(group => group.section_id === sectionId).length;
    const { error } = await supabase.from('material_groups').insert({
      course_id: selectedCourse.id,
      section_id: sectionId,
      title: title.trim(),
      order_index: orderIndex,
    });

    if (error) {
      Swal.fire({ icon: 'error', title: 'تعذر إضافة المجموعة', text: error.message });
    } else {
      await fetchSectionsAndMaterials();
    }
  }

  async function handleDeleteMaterialGroup(group: MaterialGroup) {
    const result = await Swal.fire({
      title: 'حذف المجموعة',
      text: `سيتم فك تجميع محتويات «${group.title}» وستظل موجودة داخل المحاضرة. هل تريد المتابعة؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'حذف المجموعة',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('material_groups').delete().eq('id', group.id);
    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      await fetchSectionsAndMaterials();
    }
  }

  async function handleAddMaterial(sectionId: string, groupId?: string, groupTitle?: string) {
    if (!selectedCourse) return;

    const { value: formValues } = await Swal.fire({
      title: groupTitle ? `إضافة عنصر إلى «${groupTitle}»` : 'إضافة محتوى للمحاضرة',
      html: `
        <input id="swal-mat-title" class="swal2-input" placeholder="عنوان المحتوى (مطلوب)" maxlength="140" required style="direction:rtl">
        <select id="swal-mat-type" class="swal2-input" style="direction:rtl" onchange="
          const t = this.value;
          document.getElementById('url-container').style.display = (t === 'video' || t === 'link') ? 'block' : 'none';
          document.getElementById('file-container').style.display = (t === 'file') ? 'block' : 'none';
          document.getElementById('video-file-container').style.display = (t === 'video') ? 'block' : 'none';
          document.getElementById('image-file-container').style.display = (t === 'image') ? 'block' : 'none';
          document.getElementById('audio-file-container').style.display = (t === 'audio') ? 'block' : 'none';
          document.getElementById('url-label').textContent = t === 'video' ? 'أو ارفع ملف فيديو:' : '';
        ">
          <option value="video">فيديو (رابط أو رفع ملف)</option>
          <option value="audio">فويس / تسجيل صوتي</option>
          <option value="image">صورة</option>
          <option value="file">ملف (PDF, PPT...)</option>
          <option value="link">رابط خارجي</option>
        </select>
        <div id="url-container" style="display:block;">
          <input id="swal-mat-url" class="swal2-input" placeholder="رابط الفيديو (YouTube, Drive...) أو اتركه فارغاً لرفع ملف" dir="ltr">
        </div>
        <div id="video-file-container" style="display:block;">
          <p id="url-label" style="font-size:0.85rem;color:#666;margin:4px 0;text-align:right">أو ارفع ملف فيديو:</p>
          <input id="swal-mat-video-file" type="file" accept="video/*" class="swal2-file" style="margin-top:4px;width:80%;">
        </div>
        <div id="image-file-container" style="display:none;">
          <p style="font-size:0.85rem;color:#666;margin:4px 0;text-align:right">ارفع صورة للمحتوى (JPG, PNG, WEBP):</p>
          <input id="swal-mat-image-file" type="file" accept="image/jpeg,image/png,image/webp" class="swal2-file" style="margin-top:4px;width:80%;">
        </div>
        <div id="audio-file-container" style="display:none;">
          <p style="font-size:0.85rem;color:#666;margin:4px 0;text-align:right">ارفع تسجيلاً صوتياً (MP3, M4A, WAV, OGG, WEBM, AAC):</p>
          <input id="swal-mat-audio-file" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/aac,audio/x-m4a" class="swal2-file" style="margin-top:4px;width:80%;">
        </div>
        <div id="file-container" style="display:none;">
          <input id="swal-mat-file" type="file" class="swal2-file" style="margin-top:10px;width:80%;">
        </div>
        <textarea id="swal-mat-desc" class="swal2-textarea" placeholder="وصف تفصيلي للمحتوى (اختياري)" style="direction:rtl"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const title = (document.getElementById('swal-mat-title') as HTMLInputElement).value.trim();
        if (!title) {
          Swal.showValidationMessage('عنوان المحتوى مطلوب قبل النشر.');
          return false;
        }
        return {
          title,
          type: (document.getElementById('swal-mat-type') as HTMLSelectElement).value,
          url: (document.getElementById('swal-mat-url') as HTMLInputElement)?.value || '',
          description: (document.getElementById('swal-mat-desc') as HTMLTextAreaElement).value,
          file: (document.getElementById('swal-mat-file') as HTMLInputElement)?.files?.[0] || null,
          videoFile: (document.getElementById('swal-mat-video-file') as HTMLInputElement)?.files?.[0] || null,
          imageFile: (document.getElementById('swal-mat-image-file') as HTMLInputElement)?.files?.[0] || null,
          audioFile: (document.getElementById('swal-mat-audio-file') as HTMLInputElement)?.files?.[0] || null,
        };
      },
    });

    if (!formValues) return;
    if (!formValues.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'العنوان مطلوب', text: 'أدخل عنوانًا للمحتوى قبل النشر.' });
      return;
    }

    let finalUrl = '';
    
    if (formValues.type === 'video') {
      if (formValues.videoFile) {
        Swal.fire({
          title: 'جاري رفع الفيديو...',
          html: 'قد يستغرق الأمر وقتاً حسب حجم الفيديو، يرجى الانتظار.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        
        const file = formValues.videoFile;
        const errorMsg = validateFile(file, 'video');
        if (errorMsg) {
          Swal.fire({ icon: 'error', title: 'فيديو غير صالح', text: errorMsg });
          return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `video_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('materials_files')
          .upload(fileName, file, { contentType: file.type });
          
        if (uploadError) {
          Swal.fire({ icon: 'error', title: 'خطأ في رفع الفيديو', text: uploadError.message });
          return;
        }
        
        finalUrl = fileName; // Save internal path instead of public URL
      } else if (formValues.url?.trim()) {
        finalUrl = formValues.url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
      } else {
        Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى إدخال رابط الفيديو أو رفع ملف فيديو.' });
        return;
      }
    }
    else if (formValues.type === 'audio') {
      const file = formValues.audioFile;
      if (!file) {
        Swal.fire({ icon: 'warning', title: 'الصوت مطلوب', text: 'يرجى اختيار ملف صوتي لرفعه.' });
        return;
      }

      const errorMsg = validateFile(file, 'audio');
      if (errorMsg) {
        Swal.fire({ icon: 'error', title: 'ملف صوتي غير صالح', text: errorMsg });
        return;
      }

      Swal.fire({
        title: 'جاري تجهيز ورفع التسجيل...',
        html: 'يرجى الانتظار حتى يكتمل رفع التسجيل الصوتي.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        Swal.fire({ icon: 'error', title: 'يلزم تسجيل الدخول', text: 'سجّل الدخول بحساب إداري ثم حاول مرة أخرى.' });
        return;
      }

      let prepareResponse: Response;
      try {
        prepareResponse = await fetch('/api/materials/prepare-media-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ courseId: selectedCourse.id }),
        });
      } catch {
        Swal.fire({ icon: 'error', title: 'تعذر تجهيز مساحة التخزين', text: 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.' });
        return;
      }

      const prepareResult = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        Swal.fire({ icon: 'error', title: 'تعذر تجهيز مساحة التخزين', text: prepareResult.error || 'حاول مرة أخرى بعد قليل.' });
        return;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const audioMimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm', aac: 'audio/aac',
      };
      const fileName = `audio_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('materials_files')
        .upload(fileName, file, { contentType: audioMimeTypes[fileExt] });

      if (uploadError) {
        Swal.fire({ icon: 'error', title: 'خطأ في رفع التسجيل', text: uploadError.message });
        return;
      }

      finalUrl = fileName;
    }
    else if (formValues.type === 'image') {
      const file = formValues.imageFile;

      if (!file) {
        Swal.fire({ icon: 'warning', title: 'الصورة مطلوبة', text: 'يرجى اختيار صورة لرفعها.' });
        return;
      }

      const errorMsg = validateFile(file, 'image');
      if (errorMsg) {
        Swal.fire({ icon: 'error', title: 'صورة غير صالحة', text: errorMsg });
        return;
      }

      Swal.fire({
        title: 'جاري تجهيز ورفع الصورة...',
        html: 'يرجى الانتظار حتى يكتمل رفع الصورة.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        Swal.fire({ icon: 'error', title: 'يلزم تسجيل الدخول', text: 'سجّل الدخول بحساب إداري ثم حاول مرة أخرى.' });
        return;
      }

      let prepareResponse: Response;
      try {
        prepareResponse = await fetch('/api/materials/prepare-media-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ courseId: selectedCourse.id }),
        });
      } catch {
        Swal.fire({ icon: 'error', title: 'تعذر تجهيز مساحة التخزين', text: 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.' });
        return;
      }

      const prepareResult = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        Swal.fire({ icon: 'error', title: 'تعذر تجهيز مساحة التخزين', text: prepareResult.error || 'حاول مرة أخرى بعد قليل.' });
        return;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `image_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('materials_files')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        Swal.fire({ icon: 'error', title: 'خطأ في رفع الصورة', text: uploadError.message });
        return;
      }

      finalUrl = fileName;
    }
    else if (formValues.type === 'file') {
      const file = formValues.file;
      
      if (!file) {
        Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى اختيار ملف لرفعه.' });
        return;
      }
      
      const errorMsg = validateFile(file, 'file');
      if (errorMsg) {
        Swal.fire({ icon: 'error', title: 'ملف غير صالح', text: errorMsg });
        return;
      }
      
      Swal.fire({
        title: 'جاري رفع الملف...',
        html: 'يرجى الانتظار، قد يستغرق الأمر بعض الوقت حسب حجم الملف.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('materials_files')
        .upload(fileName, file);
        
      if (uploadError) {
        Swal.fire({ icon: 'error', title: 'خطأ في رفع الملف', text: uploadError.message });
        return;
      }
      
      finalUrl = fileName; // Save internal path instead of public URL
    } else if (formValues.type === 'link') {
      // Link type
      if (!formValues?.url?.trim()) {
        Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'الرابط مطلوب.' });
        return;
      }
      finalUrl = formValues.url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    }
    
    if (!finalUrl) return;

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from('materials').insert({
      course_id: selectedCourse.id,
      section_id: sectionId,
      group_id: groupId || null,
      title: formValues.title.trim(),
      type: formValues.type as MaterialType,
      url: finalUrl,
      description: formValues.description?.trim() || null,
      created_by: userData.user?.id,
    });

    if (error) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    } else {
      Swal.fire({ icon: 'success', title: 'تمت الإضافة!', timer: 1500, showConfirmButton: false });
      fetchSectionsAndMaterials();
    }
  }

  async function handleDeleteMaterial(mat: Material) {
    const result = await Swal.fire({
      title: 'حذف المحتوى',
      text: `هل أنت متأكد من حذف ${mat.title}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('materials').delete().eq('id', mat.id);
    if (!error) {
      Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
      fetchSectionsAndMaterials();
    } else {
      Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
    }
  }

  function renderMaterialsTable(items: Material[]) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.adminTable}>
          <thead>
            <tr>
              <th>عنوان المحتوى</th>
              <th>النوع</th>
              <th>الوصف</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((material) => (
              <tr key={material.id}>
                <td style={{ fontWeight: 700 }}>{material.title}</td>
                <td><span className="badge badge-info">
                  {material.type === 'video' ? 'فيديو' : material.type === 'audio' ? 'فويس' : material.type === 'image' ? 'صورة' : material.type === 'file' ? 'ملف' : 'رابط'}
                </span></td>
                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {material.description || '-'}
                </td>
                <td>
                  <div className={styles.actionCell}>
                    <button className={styles.iconBtnDanger} onClick={() => handleDeleteMaterial(material)} title="حذف المحتوى">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className={styles.emptyState}>لا يوجد محتوى مضاف هنا بعد.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeTab === 'courses') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <BookOpen size={24} color="var(--secondary)" />
            المواد الدراسية
          </h1>
          <button className="btn btn-primary btn-sm" onClick={handleAddCourse}>
            <Plus size={16} /> إضافة مادة
          </button>
        </div>

        <div className={styles.formRow} style={{ marginBottom: 24, maxWidth: 300 }}>
          <div className={styles.formGroup}>
            <label>اختر الفرقة {adminYear ? '(الفرقة المخصصة لك)' : ''}</label>
            <select
              className="input"
              value={selectedYear}
              tabIndex={adminYear ? -1 : 0}
              style={adminYear ? { pointerEvents: 'none', opacity: 0.65, cursor: 'not-allowed' } : {}}
              onChange={adminYear ? undefined : (e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>الفرقة {y}</option>)}
            </select>
          </div>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>اسم المادة</th>
                <th>الترم</th>
                <th>الساعات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name_ar}</td>
                  <td>{c.semester === 1 ? 'الأول' : 'الثاني'}</td>
                  <td>{c.credit_hours}</td>
                  <td>
                    <div className={styles.actionCell}>
                      <button className={styles.iconBtnPrimary} onClick={() => handleEditCourse(c)} title="تعديل">
                        <Pencil size={18} />
                      </button>
                      <button className={styles.iconBtnDanger} onClick={() => handleDeleteCourse(c.id, c.name_ar)} title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyState}>لا توجد مواد مضافة في هذه الفرقة.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'materials') {
    return (
      <div className={`fade-up ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            <FileText size={24} color="var(--secondary)" />
            إدارة المحتوى العلمي
          </h1>
        </div>

        <div className={styles.formRow} style={{ marginBottom: 24 }}>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label>الفرقة الدراسية {adminYear ? '(الفرقة المخصصة لك)' : ''}</label>
            {adminYear ? (
              <select
                className="input"
                value={selectedYear}
                tabIndex={-1}
                style={{ pointerEvents: 'none', opacity: 0.65, cursor: 'not-allowed' }}
              >
                {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>الفرقة {y}</option>)}
              </select>
            ) : (
              <select className="input" value={selectedYear} onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setSelectedCourse(null);
              }}>
                {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>الفرقة {y}</option>)}
              </select>
            )}
          </div>
          <div className={styles.formGroup} style={{ flex: 2 }}>
            <label>المادة</label>
            <select 
              className="input" 
              value={selectedCourse?.id || ''} 
              onChange={(e) => {
                const c = courses.find(x => x.id === e.target.value);
                setSelectedCourse(c || null);
              }}
            >
              <option value="">-- اختر المادة --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
        </div>

        {selectedCourse ? (
          <div>
            <div className={styles.sectionHeader} style={{ marginTop: 32, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-body)' }}>
                أقسام المادة: <span style={{ color: 'var(--secondary)', fontWeight: 800 }}>{selectedCourse.name_ar}</span>
              </h2>
              <button className={`${styles.contentActionButton} btn btn-sm`} onClick={handleAddSection}>
                <Layers size={16} /> إضافة أسبوع أو محاضرة
              </button>
            </div>

            {sections.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: 40 }}>
                لا توجد محاضرات في هذه المادة.<br/>
                <button className={`${styles.contentActionButton} btn`} onClick={handleAddSection} style={{ marginTop: 16 }}>
                  إضافة المحاضرة الأولى
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: 24 }}>
                {sections.map(sec => {
                  const secMaterials = materials.filter(m => m.section_id === sec.id);
                  const standaloneMaterials = secMaterials.filter(material => !material.group_id);
                  const secGroups = materialGroups.filter(group => group.section_id === sec.id);
                  
                  return (
                    <div key={sec.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '1.1rem', fontWeight: 800 }}>{sec.title}</h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleAddMaterial(sec.id)} style={{ padding: '6px 12px' }}>
                            <Plus size={14} /> إضافة محتوى
                          </button>
                          <button className={`${styles.contentActionButton} btn btn-sm`} onClick={() => handleAddMaterialGroup(sec.id)} style={{ padding: '6px 12px' }}>
                            <FolderPlus size={14} /> إضافة مجموعة
                          </button>
                          <button className={styles.iconBtnDanger} onClick={() => handleDeleteSection(sec.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {standaloneMaterials.length > 0 && renderMaterialsTable(standaloneMaterials)}

                      {secGroups.map((group) => {
                        const groupMaterials = secMaterials.filter(material => material.group_id === group.id);
                        return (
                          <div key={group.id} style={{ marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-section, var(--bg))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: groupMaterials.length ? 12 : 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dark)', fontWeight: 800 }}>
                                <FolderOpen size={18} color="var(--secondary)" />
                                <span>{group.title}</span>
                                <span className="badge badge-info">{groupMaterials.length} عناصر</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleAddMaterial(sec.id, group.id, group.title)} style={{ padding: '6px 12px' }}>
                                  <Plus size={14} /> إضافة عنصر
                                </button>
                                <button className={styles.iconBtnDanger} onClick={() => handleDeleteMaterialGroup(group)} title="حذف المجموعة والإبقاء على محتوياتها">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            {groupMaterials.length > 0 ? renderMaterialsTable(groupMaterials) : (
                              <div className={styles.emptyState} style={{ padding: '14px 0', fontSize: '0.9rem' }}>المجموعة فارغة حالياً</div>
                            )}
                          </div>
                        );
                      })}

                      {standaloneMaterials.length === 0 && secGroups.length === 0 && (
                        <div className={styles.emptyState} style={{ padding: '20px 0', fontSize: '0.9rem' }}>
                          لا يوجد محتوى في هذا السكشن. أضف محتوى منفرداً أو أنشئ مجموعة.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            يرجى اختيار المادة لعرض وإضافة المحتوى
          </div>
        )}
      </div>
    );
  }

  return null;
}
