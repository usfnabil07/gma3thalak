-- Support staff may manage tickets and user account details, but only superadmins
-- may change any account's role.
CREATE OR REPLACE FUNCTION public.prevent_non_superadmin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO actor_role FROM public.profiles WHERE user_id = auth.uid();
    IF actor_role IS DISTINCT FROM 'superadmin' THEN
      RAISE EXCEPTION 'Only a superadmin can change account roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_non_superadmin_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_non_superadmin_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_non_superadmin_role_change();
