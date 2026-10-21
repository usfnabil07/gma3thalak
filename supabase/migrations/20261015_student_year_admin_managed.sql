-- Students can no longer change their own academic year through direct API calls.
-- Staff updates continue to work because the actor is not the profile owner.
CREATE OR REPLACE FUNCTION public.prevent_student_self_year_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.year IS DISTINCT FROM NEW.year
    AND OLD.role = 'student'
    AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'Students cannot change their own academic year';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_student_self_year_change ON public.profiles;
CREATE TRIGGER prevent_student_self_year_change
  BEFORE UPDATE OF year ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_self_year_change();
