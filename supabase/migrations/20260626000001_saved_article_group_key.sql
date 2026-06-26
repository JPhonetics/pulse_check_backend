ALTER TABLE public.saved_article ADD COLUMN IF NOT EXISTS group_key TEXT;
CREATE INDEX IF NOT EXISTS saved_article_group_key_idx ON public.saved_article (group_key);
