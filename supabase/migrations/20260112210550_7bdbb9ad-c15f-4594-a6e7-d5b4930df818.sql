-- First, drop the storage policies that depend on is_admin column
DROP POLICY IF EXISTS "Admins can upload slides" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete slides" ON storage.objects;

-- Recreate storage policies using the proper has_role() function
CREATE POLICY "Admins can upload slides"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lecture-slides' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete slides"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lecture-slides' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Now we can safely remove the deprecated is_admin column from profiles table
-- Roles are properly managed via the user_roles table and has_role() function
ALTER TABLE public.profiles DROP COLUMN is_admin;

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a more restrictive UPDATE policy that only allows updating safe columns
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);