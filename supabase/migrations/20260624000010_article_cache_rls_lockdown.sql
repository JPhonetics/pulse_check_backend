-- Remove all client-facing policies on article_cache.
-- RLS stays ENABLED; with no policies for anon/authenticated,
-- PostgreSQL default-denies those roles. Service role bypasses RLS entirely.

DROP POLICY IF EXISTS "article_cache: public select" ON public.article_cache;
DROP POLICY IF EXISTS "article_cache: open insert"  ON public.article_cache;
DROP POLICY IF EXISTS "article_cache: open update"  ON public.article_cache;
