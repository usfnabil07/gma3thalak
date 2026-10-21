import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ACCEPTED_MEDIA_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-m4a',
];

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'إعدادات الخادم غير مكتملة.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول بحساب إداري.' }, { status: 401 });

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'جلسة الدخول غير صالحة.' }, { status: 401 });

    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId : '';
    if (!courseId) return NextResponse.json({ error: 'المادة الدراسية غير محددة.' }, { status: 400 });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('faculty_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) return NextResponse.json({ error: 'تعذر التحقق من صلاحيات الحساب.' }, { status: 403 });
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'هذه العملية متاحة للإدارة فقط.' }, { status: 403 });
    }

    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('faculty_id')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) return NextResponse.json({ error: 'المادة الدراسية غير موجودة.' }, { status: 404 });
    if (profile.role === 'admin' && profile.faculty_id !== course.faculty_id) {
      return NextResponse.json({ error: 'ليس لديك صلاحية إدارة محتوى هذه الكلية.' }, { status: 403 });
    }

    const bucketId = 'materials_files';
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(bucketId);
    if (bucketError || !bucket) {
      console.error('Materials bucket lookup failed:', bucketError?.message);
      return NextResponse.json({ error: 'تعذر الوصول إلى مساحة ملفات المواد.' }, { status: 500 });
    }

    // A null allow-list means the bucket accepts all MIME types already.
    const currentAllowedTypes = bucket.allowed_mime_types;
    if (!currentAllowedTypes) return NextResponse.json({ ready: true });

    const mergedAllowedTypes = [...new Set([...currentAllowedTypes, ...ACCEPTED_MEDIA_MIME_TYPES])];
    if (mergedAllowedTypes.length === currentAllowedTypes.length) {
      return NextResponse.json({ ready: true });
    }

    const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketId, {
      public: bucket.public,
      allowedMimeTypes: mergedAllowedTypes,
    });

    if (updateError) {
      console.error('Materials bucket media MIME update failed:', updateError.message);
      return NextResponse.json({
        error: `تعذر تهيئة مساحة التخزين لقبول الملفات: ${updateError.message}`,
        code: updateError.statusCode,
      }, { status: 500 });
    }

    return NextResponse.json({ ready: true });
  } catch (error) {
    console.error('Media upload preparation failed:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تجهيز رفع الملف.' }, { status: 500 });
  }
}
