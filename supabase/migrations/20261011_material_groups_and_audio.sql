CREATE TABLE IF NOT EXISTS public.material_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.material_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS material_groups_section_order_idx
  ON public.material_groups (section_id, order_index);
CREATE INDEX IF NOT EXISTS materials_group_id_idx
  ON public.materials (group_id);

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_type_check;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_type_check
  CHECK (type IN ('video', 'audio', 'image', 'file', 'link'));

ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_groups_auth_read" ON public.material_groups;
CREATE POLICY "material_groups_auth_read" ON public.material_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "material_groups_admin_write" ON public.material_groups;
CREATE POLICY "material_groups_admin_write" ON public.material_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

NOTIFY pgrst, 'reload schema';
