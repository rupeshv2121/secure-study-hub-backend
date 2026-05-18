-- SECURITY FIX: Remove direct INSERT permission from user_subject_purchases
-- Purchases should only happen through a secure server-side function

-- Drop the insecure INSERT policy
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.user_subject_purchases;

-- Create a SECURITY DEFINER function to process purchases
-- This will only be called from a trusted backend (edge function) after payment verification
CREATE OR REPLACE FUNCTION public.process_verified_purchase(
  _user_id UUID,
  _subject_id UUID,
  _amount_paid NUMERIC,
  _payment_reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _purchase_id UUID;
  _subject_price NUMERIC;
BEGIN
  -- Verify the subject exists and get its price
  SELECT price INTO _subject_price
  FROM public.subjects
  WHERE id = _subject_id AND is_active = true;
  
  IF _subject_price IS NULL THEN
    RAISE EXCEPTION 'Subject not found or inactive';
  END IF;
  
  -- Verify the amount paid matches the subject price
  IF _amount_paid < _subject_price THEN
    RAISE EXCEPTION 'Payment amount does not match subject price';
  END IF;
  
  -- Check if already purchased
  IF EXISTS (
    SELECT 1 FROM public.user_subject_purchases
    WHERE user_id = _user_id 
    AND subject_id = _subject_id 
    AND payment_status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Subject already purchased';
  END IF;
  
  -- Insert the verified purchase
  INSERT INTO public.user_subject_purchases (
    user_id,
    subject_id,
    amount_paid,
    payment_status
  ) VALUES (
    _user_id,
    _subject_id,
    _amount_paid,
    'completed'
  )
  RETURNING id INTO _purchase_id;
  
  RETURN _purchase_id;
END;
$$;

-- SECURITY FIX: Add explicit denial for anonymous access to profiles
-- First, ensure the existing policies are properly restrictive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate with explicit authenticated requirement
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));