-- 1) Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Security definer role-check helper (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4) user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Fix recursive admin checks by removing policies that query profiles inside RLS
-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- LECTURES
DROP POLICY IF EXISTS "Admins can view all lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins can insert lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins can update lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins can delete lectures" ON public.lectures;

CREATE POLICY "Admins can view all lectures"
ON public.lectures
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lectures"
ON public.lectures
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lectures"
ON public.lectures
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lectures"
ON public.lectures
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- LECTURE_SLIDES
DROP POLICY IF EXISTS "Admins can view all slides" ON public.lecture_slides;
DROP POLICY IF EXISTS "Admins can insert slides" ON public.lecture_slides;
DROP POLICY IF EXISTS "Admins can delete slides" ON public.lecture_slides;

CREATE POLICY "Admins can view all slides"
ON public.lecture_slides
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert slides"
ON public.lecture_slides
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete slides"
ON public.lecture_slides
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- VIEW_LOGS
DROP POLICY IF EXISTS "Admins can view all logs" ON public.view_logs;
CREATE POLICY "Admins can view all logs"
ON public.view_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));