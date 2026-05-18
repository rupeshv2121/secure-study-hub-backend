
-- 1. Atomic view count increment
CREATE OR REPLACE FUNCTION public.increment_view_count(lecture_uuid UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.lectures
  SET view_count = view_count + 1
  WHERE id = lecture_uuid;
$$;

-- 2. Storage policies for lecture-slides bucket
-- Drop legacy/broad policies
DROP POLICY IF EXISTS "Authenticated users can view slides" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload slides" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete slides" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update slides" ON storage.objects;
DROP POLICY IF EXISTS "Users can view purchased slides" ON storage.objects;

-- Admin management via has_role
CREATE POLICY "Admins can upload slides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lecture-slides'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update slides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lecture-slides'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete slides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lecture-slides'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Restrict SELECT to purchasers / free previews / admins
CREATE POLICY "Users can view purchased slides"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lecture-slides'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.lecture_slides ls
        JOIN public.lectures l ON l.id = ls.lecture_id
        WHERE ls.storage_path = storage.objects.name
          AND l.is_published = true
          AND (
            l.subject_id IS NULL
            OR l.is_free_preview = true
            OR public.has_purchased_subject(auth.uid(), l.subject_id)
          )
      )
    )
  );
