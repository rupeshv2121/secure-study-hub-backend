-- Add sort_order column to lectures for drag-and-drop ordering within subjects
ALTER TABLE public.lectures 
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Create an index for efficient sorting
CREATE INDEX idx_lectures_subject_sort ON public.lectures (subject_id, sort_order);

-- Initialize sort_order based on created_at for existing lectures
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY created_at) as rn
  FROM public.lectures
)
UPDATE public.lectures l
SET sort_order = n.rn
FROM numbered n
WHERE l.id = n.id;