-- Student IDs, cross-year course access, and in-platform support tickets.

-- Expand profile roles to include super admins and support staff.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'superadmin', 'support'));

-- Assign a stable student-facing ID to every existing and new profile.
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq;

DO $$
DECLARE
  current_max BIGINT;
BEGIN
  SELECT COALESCE(MAX((regexp_match(student_id, '^GMA-([0-9]+)$'))[1]::BIGINT), 0)
  INTO current_max
  FROM public.profiles;

  IF current_max = 0 THEN
    PERFORM setval('public.student_id_seq', 1, false);
  ELSE
    PERFORM setval('public.student_id_seq', current_max, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_id BIGINT;
BEGIN
  IF NEW.student_id IS NULL OR btrim(NEW.student_id) = '' THEN
    next_id := nextval('public.student_id_seq');
    NEW.student_id := 'GMA-' || lpad(next_id::TEXT, GREATEST(6, length(next_id::TEXT)), '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_student_id ON public.profiles;
CREATE TRIGGER profiles_assign_student_id
  BEFORE INSERT OR UPDATE OF student_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_student_id();

UPDATE public.profiles SET student_id = '' WHERE student_id IS NULL OR btrim(student_id) = '';
WITH duplicate_ids AS (
  SELECT id, row_number() OVER (PARTITION BY student_id ORDER BY created_at, id) AS duplicate_number
  FROM public.profiles
  WHERE btrim(student_id) <> ''
)
UPDATE public.profiles profile
SET student_id = ''
FROM duplicate_ids duplicate
WHERE profile.id = duplicate.id AND duplicate.duplicate_number > 1;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_unique
  ON public.profiles (student_id);

-- Explicit access lets a student view a course outside their profile year.
CREATE TABLE IF NOT EXISTS public.student_course_access (
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'summer_course',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);

ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_course_access_read_own ON public.student_course_access;
CREATE POLICY student_course_access_read_own ON public.student_course_access
  FOR SELECT USING (
    auth.uid() = student_id OR EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  );
DROP POLICY IF EXISTS student_course_access_staff_manage ON public.student_course_access;
CREATE POLICY student_course_access_staff_manage ON public.student_course_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role = 'superadmin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role = 'superadmin'
    )
  );

-- Support tickets and messages are plain text; no file storage or background workers are needed.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 140),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_updated_idx
  ON public.support_tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_updated_idx
  ON public.support_tickets (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_created_idx
  ON public.support_ticket_messages (ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_read_owner_or_staff ON public.support_tickets;
CREATE POLICY support_tickets_read_owner_or_staff ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  );
DROP POLICY IF EXISTS support_tickets_create_owner ON public.support_tickets;
CREATE POLICY support_tickets_create_owner ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'open' AND assigned_to IS NULL);
DROP POLICY IF EXISTS support_tickets_update_staff ON public.support_tickets;
CREATE POLICY support_tickets_update_staff ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  );

DROP POLICY IF EXISTS support_messages_read_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_read_owner_or_staff ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = ticket_id AND (
        ticket.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles actor
          WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
        )
      )
    )
  );
DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = ticket_id AND (
        ticket.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles actor
          WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
        )
      )
    )
  );

-- Staff need to find accounts and update user settings from the administration UI.
DROP POLICY IF EXISTS profiles_staff_read_all ON public.profiles;
CREATE POLICY profiles_staff_read_all ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  );
DROP POLICY IF EXISTS profiles_staff_update_all ON public.profiles;
CREATE POLICY profiles_staff_update_all ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.user_id = auth.uid() AND actor.role IN ('superadmin', 'support')
    )
  );

-- Keep the ticket's updated timestamp current after replies arrive.
CREATE OR REPLACE FUNCTION public.bump_support_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_message_bump_updated_at ON public.support_ticket_messages;
CREATE TRIGGER support_ticket_message_bump_updated_at
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_support_ticket_updated_at();

-- Use a security-definer helper in policies so profiles RLS never queries itself recursively.
CREATE OR REPLACE FUNCTION public.current_actor_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_actor_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_actor_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_support_superadmin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'superadmin' AND OLD.role <> 'superadmin'
     AND COALESCE(public.current_actor_role(), '') <> 'superadmin' THEN
    RAISE EXCEPTION 'Only a superadmin can promote an account to superadmin';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_prevent_support_superadmin_promotion ON public.profiles;
CREATE TRIGGER profiles_prevent_support_superadmin_promotion
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_support_superadmin_promotion();

DROP POLICY IF EXISTS student_course_access_read_own ON public.student_course_access;
CREATE POLICY student_course_access_read_own ON public.student_course_access
  FOR SELECT USING (
    auth.uid() = student_id OR public.current_actor_role() IN ('superadmin', 'support')
  );
DROP POLICY IF EXISTS student_course_access_staff_manage ON public.student_course_access;
CREATE POLICY student_course_access_staff_manage ON public.student_course_access
  FOR ALL USING (public.current_actor_role() = 'superadmin')
  WITH CHECK (public.current_actor_role() = 'superadmin');

DROP POLICY IF EXISTS support_tickets_read_owner_or_staff ON public.support_tickets;
CREATE POLICY support_tickets_read_owner_or_staff ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR public.current_actor_role() IN ('superadmin', 'support')
  );
DROP POLICY IF EXISTS support_tickets_update_staff ON public.support_tickets;
CREATE POLICY support_tickets_update_staff ON public.support_tickets
  FOR UPDATE USING (public.current_actor_role() IN ('superadmin', 'support'))
  WITH CHECK (public.current_actor_role() IN ('superadmin', 'support'));

DROP POLICY IF EXISTS support_messages_read_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_read_owner_or_staff ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = ticket_id AND (
        ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support')
      )
    )
  );
DROP POLICY IF EXISTS support_messages_create_owner_or_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_create_owner_or_staff ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = ticket_id AND (
        ticket.user_id = auth.uid() OR public.current_actor_role() IN ('superadmin', 'support')
      )
    )
  );

DROP POLICY IF EXISTS profiles_staff_read_all ON public.profiles;
CREATE POLICY profiles_staff_read_all ON public.profiles
  FOR SELECT USING (public.current_actor_role() IN ('superadmin', 'support'));
DROP POLICY IF EXISTS profiles_staff_update_all ON public.profiles;
CREATE POLICY profiles_staff_update_all ON public.profiles
  FOR UPDATE USING (public.current_actor_role() IN ('superadmin', 'support'))
  WITH CHECK (public.current_actor_role() IN ('superadmin', 'support'));
