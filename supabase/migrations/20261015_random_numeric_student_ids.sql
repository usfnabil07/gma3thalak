-- Replace sequential GMA-prefixed IDs with unique, random ten-digit identifiers.
CREATE OR REPLACE FUNCTION public.assign_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id !~ '^[0-9]{10}$' THEN
    LOOP
      candidate := floor(random() * 9000000000 + 1000000000)::BIGINT::TEXT;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles profile
        WHERE profile.student_id = candidate
          AND profile.id IS DISTINCT FROM NEW.id
      );
    END LOOP;
    NEW.student_id := candidate;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET student_id = ''
WHERE student_id IS NULL OR student_id !~ '^[0-9]{10}$';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_student_id_numeric_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_student_id_numeric_check
  CHECK (student_id ~ '^[0-9]{10}$');
