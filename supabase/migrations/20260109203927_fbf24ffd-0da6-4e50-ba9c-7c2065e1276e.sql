-- Create subjects table
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add subject_id to lectures table
ALTER TABLE public.lectures ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Create user_subject_purchases table
CREATE TABLE public.user_subject_purchases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'completed',
    UNIQUE (user_id, subject_id)
);

-- Enable RLS on new tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subject_purchases ENABLE ROW LEVEL SECURITY;

-- Subjects policies - everyone can view active subjects
CREATE POLICY "Anyone can view active subjects"
ON public.subjects
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage subjects"
ON public.subjects
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User purchases policies
CREATE POLICY "Users can view own purchases"
ON public.user_subject_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON public.user_subject_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
ON public.user_subject_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check if user has purchased a subject
CREATE OR REPLACE FUNCTION public.has_purchased_subject(_user_id UUID, _subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_subject_purchases
        WHERE user_id = _user_id
          AND subject_id = _subject_id
          AND payment_status = 'completed'
    )
$$;

-- Create function to check if lecture is accessible (free preview or purchased)
CREATE OR REPLACE FUNCTION public.can_access_lecture(_user_id UUID, _lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _subject_id UUID;
    _is_free_preview BOOLEAN;
BEGIN
    -- Get lecture details
    SELECT subject_id, is_free_preview INTO _subject_id, _is_free_preview
    FROM public.lectures
    WHERE id = _lecture_id;
    
    -- If no subject assigned, allow access (backward compatibility)
    IF _subject_id IS NULL THEN
        RETURN true;
    END IF;
    
    -- If it's a free preview, allow access
    IF _is_free_preview = true THEN
        RETURN true;
    END IF;
    
    -- Check if user has purchased the subject
    RETURN public.has_purchased_subject(_user_id, _subject_id);
END;
$$;

-- Add is_free_preview column to lectures for Chapter 1 free access
ALTER TABLE public.lectures ADD COLUMN is_free_preview BOOLEAN NOT NULL DEFAULT false;

-- Update lectures RLS to include purchase check
DROP POLICY IF EXISTS "Authenticated users can view published lectures" ON public.lectures;

CREATE POLICY "Users can view accessible lectures"
ON public.lectures
FOR SELECT
USING (
    is_published = true 
    AND (
        -- No subject = accessible to all
        subject_id IS NULL
        -- Free preview
        OR is_free_preview = true
        -- User has purchased the subject
        OR public.has_purchased_subject(auth.uid(), subject_id)
        -- Admin can see all
        OR has_role(auth.uid(), 'admin'::app_role)
    )
);

-- Update lecture_slides RLS
DROP POLICY IF EXISTS "Authenticated users can view slides of published lectures" ON public.lecture_slides;

CREATE POLICY "Users can view slides of accessible lectures"
ON public.lecture_slides
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.lectures l
        WHERE l.id = lecture_slides.lecture_id
        AND l.is_published = true
        AND (
            l.subject_id IS NULL
            OR l.is_free_preview = true
            OR public.has_purchased_subject(auth.uid(), l.subject_id)
            OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
);

-- Trigger for updated_at on subjects
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();