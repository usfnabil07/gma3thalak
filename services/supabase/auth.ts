import { supabase } from './client';
import { Profile } from '@/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {

    return null;
  }

  // Fetch faculty separately to avoid foreign key join issues
  if (profile.faculty_id) {
    const { data: faculty } = await supabase
      .from('faculties')
      .select('*')
      .eq('id', profile.faculty_id)
      .single();
      
    if (faculty) {
      profile.faculty = faculty;
    }
  }

  return profile as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);
  return !error;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(
  email: string,
  password: string,
  profileData: {
    full_name: string;
    student_id: string;
    faculty_id: string;
    year: number;
  }
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { data, error };

  const { error: profileError } = await supabase.from('profiles').insert({
    user_id: data.user.id,
    email: email.trim(),
    ...profileData,
    role: 'student',
  });

  if (profileError) {

    return { data, error: profileError };
  }

  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}
