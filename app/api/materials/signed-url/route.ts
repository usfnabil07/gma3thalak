import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('material_id');
    const download = searchParams.get('download') === 'true';

    if (!materialId) {
      return NextResponse.json({ error: 'Missing material_id' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // 1. Get user session (Verify identity server-side)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch User Profile to get their faculty and year
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('faculty_id, year, role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found', details: profileError }, { status: 404 });
    }

    // 3. Fetch Material & Course info
    const { data: material } = await supabaseAdmin
      .from('materials')
      .select(`
        id, 
        url,
        course_id,
        courses (
          faculty_id,
          year
        )
      `)
      .eq('id', materialId)
      .single();

    if (!material || !material.courses) {
      return NextResponse.json({ error: 'Material or course not found' }, { status: 404 });
    }

    // 4. Verify Access Rights
    const course = material.courses as any; // Cast for TS
    const isSuperAdmin = profile.role === 'superadmin';
    const isFacultyAdmin = profile.role === 'admin' && profile.faculty_id === course.faculty_id;
    let isAuthorizedStudent = profile.role === 'student' &&
                              profile.faculty_id === course.faculty_id &&
                              profile.year === course.year;
    if (profile.role === 'student' && !isAuthorizedStudent) {
      const { data: courseAccess } = await supabaseAdmin
        .from('student_course_access')
        .select('student_id')
        .eq('student_id', user.id)
        .eq('course_id', material.course_id)
        .maybeSingle();
      isAuthorizedStudent = !!courseAccess;
    }

    if (!isSuperAdmin && !isFacultyAdmin && !isAuthorizedStudent) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this material' }, { status: 403 });
    }

    // 5. Extract fileName
    let fileName = material.url;
    
    if (fileName.startsWith('http')) {
      try {
        const urlObj = new URL(fileName);
        // If it's a Supabase storage URL, extract the path after the bucket name
        if (urlObj.pathname.includes('/storage/v1/object/')) {
          const pathParts = urlObj.pathname.split('/');
          const bucketIndex = pathParts.indexOf('materials_files');
          if (bucketIndex !== -1) {
            fileName = pathParts.slice(bucketIndex + 1).join('/');
            fileName = decodeURIComponent(fileName);
          }
        } else {
          // If it's a completely external URL (like Youtube), just return it
          return NextResponse.json({ signedUrl: fileName });
        }
      } catch (e) {
        console.error('Error parsing material URL:', e);
      }
    }

    // Use admin client to bypass RLS and generate signed URL (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from('materials_files')
      .createSignedUrl(fileName, 3600, download ? { download: true } : undefined);

    if (error || !data?.signedUrl) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json({ error: 'Failed to generate signed url' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });

  } catch (error: any) {
    console.error('Signed URL API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
