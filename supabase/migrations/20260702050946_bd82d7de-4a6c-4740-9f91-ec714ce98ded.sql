
ALTER TABLE public.statements DROP CONSTRAINT IF EXISTS statements_source_type_check;
ALTER TABLE public.statements ADD CONSTRAINT statements_source_type_check
  CHECK (source_type IS NULL OR source_type = ANY (ARRAY['bank','card','credit_card','loan']));

ALTER TABLE public.statements DROP CONSTRAINT IF EXISTS statements_status_check;
ALTER TABLE public.statements ADD CONSTRAINT statements_status_check
  CHECK (status = ANY (ARRAY['pending','processing','review','completed','processed','failed']));

ALTER TABLE public.statements ADD COLUMN IF NOT EXISTS extracted_data jsonb;
