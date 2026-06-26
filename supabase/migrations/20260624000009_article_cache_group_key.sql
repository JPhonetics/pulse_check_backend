ALTER TABLE public.article_cache
  ADD COLUMN IF NOT EXISTS group_key TEXT;

CREATE INDEX IF NOT EXISTS article_cache_group_key_idx
  ON public.article_cache (group_key);
