-- ── user ──────────────────────────────────────────────────────────────────
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: own row select"
  ON public.user FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: own row update"
  ON public.user FOR UPDATE
  USING (id = auth.uid());

-- No INSERT policy — inserts happen only via the handle_new_user trigger.
-- SECURITY DEFINER bypasses RLS, so no client insert policy is needed.


-- ── saved_article ──────────────────────────────────────────────────────────
ALTER TABLE public.saved_article ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_article: own rows select"
  ON public.saved_article FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_article: own rows insert"
  ON public.saved_article FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_article: own rows update"
  ON public.saved_article FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "saved_article: own rows delete"
  ON public.saved_article FOR DELETE
  USING (user_id = auth.uid());


-- ── saved_search ───────────────────────────────────────────────────────────
ALTER TABLE public.saved_search ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_search: own rows select"
  ON public.saved_search FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_search: own rows insert"
  ON public.saved_search FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_search: own rows update"
  ON public.saved_search FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "saved_search: own rows delete"
  ON public.saved_search FOR DELETE
  USING (user_id = auth.uid());


-- ── article_cache ──────────────────────────────────────────────────────────
ALTER TABLE public.article_cache ENABLE ROW LEVEL SECURITY;

-- SELECT: public (anon + authenticated) — headlines are public
CREATE POLICY "article_cache: public select"
  ON public.article_cache FOR SELECT
  USING (true);

-- INSERT/UPDATE: open for now — cache-through upsert on miss runs client-side
-- TECH DEBT: revoke anon INSERT/UPDATE once cache fetch moves to an Edge Function
CREATE POLICY "article_cache: open insert"
  ON public.article_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "article_cache: open update"
  ON public.article_cache FOR UPDATE
  USING (true);

-- No DELETE policy — retention sweep is server-side only (service role bypasses RLS)
