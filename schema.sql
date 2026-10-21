-- Enable UUID extension (Required for Supabase UUID generation)
create extension if not exists "uuid-ossp";

-- 1. Create Faculties Table
create table if not exists public.faculties (
  id uuid primary key default uuid_generate_v4(),
  name_ar text not null,
  name_en text not null,
  grading_system_id text,
  color text default '#0ea5e9',
  icon text default 'Building',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Profiles Table (Linked to Auth)
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text not null,
  student_id text default '',
  faculty_id text,
  year integer not null,
  role text default 'student' check (role in ('student', 'admin')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- 3. Set up Row Level Security (RLS) policies
alter table public.faculties enable row level security;
alter table public.profiles enable row level security;

-- Faculties: Anyone can view
create policy "Faculties are viewable by everyone" on public.faculties for select using (true);

-- Profiles: Users can view, update, and insert their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Optional: Insert the BUA Faculties if you want them in the database instead of hardcoded
-- (If you run this, we can later change the code to read from DB)
insert into public.faculties (id, name_ar, name_en, icon) values
  ('11111111-1111-1111-1111-111111111111', 'كلية الذكاء الاصطناعي وعلوم البيانات', 'AI & Data Science', 'Bot'),
  ('22222222-2222-2222-2222-222222222222', 'كلية طب الفم والأسنان', 'Dentistry', 'Tooth'),
  ('33333333-3333-3333-3333-333333333333', 'كلية الصيدلة', 'Pharmacy', 'Pill'),
  ('44444444-4444-4444-4444-444444444444', 'كلية الطب البيطري', 'Veterinary Medicine', 'Dog'),
  ('55555555-5555-5555-5555-555555555555', 'كلية العلاج الطبيعي', 'Physical Therapy', 'Activity'),
  ('66666666-6666-6666-6666-666666666666', 'كلية التمريض', 'Nursing', 'HeartPulse'),
  ('77777777-7777-7777-7777-777777777777', 'كلية الحقوق', 'Law', 'Scale'),
  ('88888888-8888-8888-8888-888888888888', 'كلية اللغات والترجمة', 'Languages & Translation', 'Languages'),
  ('99999999-9999-9999-9999-999999999999', 'كلية التكنولوجيا الحيوية', 'Biotechnology', 'Dna'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'كلية الفنون التطبيقية', 'Applied Arts', 'Palette'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'كلية تكنولوجيا العلوم الصحية', 'Health Sciences Technology', 'Stethoscope'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'كلية بيزنس', 'Business', 'Briefcase');
