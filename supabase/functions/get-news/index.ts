import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CATEGORY_MAP: Record<string, string> = {
  Business: "business",
  Crime: "crime",
  Entertainment: "entertainment",
  Health: "health",
  Politics: "politics",
  Sports: "sports",
  Tech: "technology",
};

const PAGE_SIZE = 9;
const CACHE_TTL_MS = 15 * 60 * 1000;

interface ArticleGroup {
  rep: any;
  groupKey: string;
  sources: Array<{ id: string; source: string; url: string; imageUrl: string; publishDate: string; title: string }>;
}

const POOL_LIMIT = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function err500(msg: string): Response {
  return jsonResponse({ error: msg }, 500);
}

// newsdata.io returns "2026-06-25 08:06:00" — space-separated, UTC but no marker.
// new Date(pubDate).toISOString() is wrong: V8 parses space-separated strings as local time.
function normalizePubDate(pubDate: string): string {
  if (!pubDate) return new Date().toISOString();
  if (pubDate.includes("T")) return pubDate;
  return pubDate.replace(" ", "T") + "Z";
}

function normalizeGroupKey(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

// "Austin, TX" → { city: "Austin", state: "TX" }
function parseLocalRegion(str: string): { city: string; state: string } {
  if (!str) return { city: "", state: "" };
  const idx = str.lastIndexOf(",");
  if (idx === -1) return { city: str.trim(), state: "" };
  return { city: str.slice(0, idx).trim(), state: str.slice(idx + 1).trim() };
}

// .eq('col', null) sends col=eq.null (string match), not SQL IS NULL. Must use .is().
function applyNullSafeFilter(q: any, col: string, val: string | null): any {
  return val === null ? q.is(col, null) : q.eq(col, val);
}

function groupRows(rows: any[]): ArticleGroup[] {
  const map = new Map<string, any[]>();
  for (const row of rows) {
    const key = row.group_key ?? row.article_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.values()).map(members => {
    const withImage = members.filter((r: any) => r.image_url);
    const pool = withImage.length ? withImage : members;
    const rep = pool.reduce((a: any, b: any) =>
      new Date(a.published_at) >= new Date(b.published_at) ? a : b
    );
    const sources = members
      .map((r: any) => ({
        id: r.article_id,
        source: r.source,
        url: r.article_url,
        imageUrl: r.image_url || "",
        publishDate: r.published_at,
        title: r.title,
        snippet: r.description || "",
      }))
      .sort((a: any, b: any) => a.source.localeCompare(b.source));
    return { rep, groupKey: (rep.group_key ?? rep.article_id) as string, sources };
  });
}

function paginateGroups(groups: ArticleGroup[], page: number) {
  const total = groups.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  return { pageGroups: groups.slice(start, start + PAGE_SIZE), total, totalPages };
}

function groupToArticle(g: ArticleGroup, region: string, category: string) {
  const { rep, groupKey, sources } = g;
  return {
    id: rep.article_id,
    region,
    category,
    title: rep.title,
    publishDate: rep.published_at,
    source: rep.source,
    snippet: rep.description || "",
    imageUrl: rep.image_url || "",
    url: rep.article_url,
    groupKey,
    sourceCount: sources.length,
    sources,
  };
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function rawToArticle(a: any, region: string, category: string) {
  return {
    id: a.article_id,
    region,
    category,
    title: a.title || "",
    publishDate: normalizePubDate(a.pubDate || ""),
    source: a.source_id || "",
    snippet: a.description || "",
    imageUrl: a.image_url || "",
    url: a.link || "",
  };
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function isCacheFresh(
  sb: ReturnType<typeof createClient>,
  country: string | null,
  cacheCategory: string | null,
): Promise<boolean> {
  let q = sb
    .from("article_cache")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1);
  q = applyNullSafeFilter(q, "country", country);
  q = applyNullSafeFilter(q, "category", cacheCategory);
  const { data, error } = await q;
  if (error || !data?.length) return false;
  return Date.now() - new Date(data[0].fetched_at).getTime() < CACHE_TTL_MS;
}

async function upsertCache(
  sb: ReturnType<typeof createClient>,
  raw: any[],
  country: string | null,
  cacheCategory: string | null,
): Promise<void> {
  if (!raw.length) return;
  const rows = raw.map((a: any) => ({
    article_id: a.article_id,
    title: a.title || "",
    description: a.description || null,
    article_url: a.link || "",
    image_url: a.image_url || null,
    published_at: normalizePubDate(a.pubDate || ""),
    source: a.source_name || a.source_id || "",
    country: country ?? null,
    category: cacheCategory ?? null,
    group_key: normalizeGroupKey(a.title || ""),
  }));
  const { error } = await sb.from("article_cache").upsert(rows, { onConflict: "article_id" });
  if (error) console.error("[get-news] upsertCache error:", error.message);
}

async function fetchCachePool(
  sb: ReturnType<typeof createClient>,
  { country, cacheCategory }: { country: string | null; cacheCategory: string | null },
): Promise<any[]> {
  let q = sb
    .from("article_cache")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(POOL_LIMIT);
  q = applyNullSafeFilter(q, "country", country);
  q = applyNullSafeFilter(q, "category", cacheCategory);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ─── newsdata.io ──────────────────────────────────────────────────────────────

async function fetchNewsdata(
  apiKey: string,
  extra: Record<string, string> = {},
): Promise<any[]> {
  const params = new URLSearchParams({ apikey: apiKey, language: "en", ...extra });
  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`newsdata.io ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.results ?? []).filter((a: any) => a.article_id && a.pubDate);
}

// ─── Mode handlers ────────────────────────────────────────────────────────────

async function handleBrowse(
  sb: ReturnType<typeof createClient>,
  apiKey: string,
  {
    region,
    category,
    page,
    localRegion,
  }: { region: string; category: string; page: number; localRegion: string },
): Promise<Response> {
  if (region === "Local") {
    return handleLocal(sb, apiKey, { category, page, localRegion });
  }

  const country = region === "US" ? "us" : null;
  const cacheCategory =
    category === "All" ? null
    : category === "Weather" ? "weather"
    : (CATEGORY_MAP[category] ?? null);

  const ndExtra: Record<string, string> = {};
  if (country) ndExtra.country = country;
  if (category === "Weather") ndExtra.q = "weather";
  else if (cacheCategory) ndExtra.category = cacheCategory;

  const fresh = await isCacheFresh(sb, country, cacheCategory);
  if (!fresh) {
    try {
      const raw = await fetchNewsdata(apiKey, ndExtra);
      await upsertCache(sb, raw, country, cacheCategory);
    } catch (err: any) {
      console.error("[get-news] cache refresh failed, serving stale:", err.message);
    }
  }

  const rows = await fetchCachePool(sb, { country, cacheCategory });
  const groups = groupRows(rows);
  const { pageGroups, total, totalPages } = paginateGroups(groups, page);
  return jsonResponse({
    articles: pageGroups.map((g) => groupToArticle(g, region, category)),
    totalPages,
    total,
    page,
    localBanner: null,
  });
}

async function handleLocal(
  sb: ReturnType<typeof createClient>,
  apiKey: string,
  {
    category,
    page,
    localRegion,
  }: { category: string; page: number; localRegion: string },
): Promise<Response> {
  const { city, state } = parseLocalRegion(localRegion);
  if (!city) {
    return jsonResponse({ articles: [], totalPages: 1, total: 0, page: 1, localBanner: null });
  }

  const cacheCategory =
    category === "All" ? null
    : category === "Weather" ? "weather"
    : (CATEGORY_MAP[category] ?? null);

  const ndExtra: Record<string, string> = { country: "us" };
  if (cacheCategory && cacheCategory !== "weather") ndExtra.category = cacheCategory;

  let raw: any[] = [];
  let localBanner: { city: string; state: string } | null = null;

  try {
    const qCity = category === "Weather" ? `${city} weather` : city;
    raw = await fetchNewsdata(apiKey, { ...ndExtra, q: qCity });
    await upsertCache(sb, raw, "us", cacheCategory);

    if (raw.length < PAGE_SIZE && state) {
      const qState = category === "Weather" ? `${state} weather` : state;
      const stateRaw = await fetchNewsdata(apiKey, { ...ndExtra, q: qState });
      await upsertCache(sb, stateRaw, "us", cacheCategory);
      raw = stateRaw;
      localBanner = { city, state };
    }
  } catch (err: any) {
    console.error("[get-news] local fetch error:", err.message);
  }

  const cityLc = city.toLowerCase();
  raw.sort((a: any, b: any) => {
    const ah = (a.title || "").toLowerCase().includes(cityLc);
    const bh = (b.title || "").toLowerCase().includes(cityLc);
    return ah === bh ? 0 : ah ? -1 : 1;
  });

  const rawWithKey = raw.map((r: any) => ({
    article_id: r.article_id,
    title: r.title || "",
    description: r.description || null,
    article_url: r.link || "",
    image_url: r.image_url || null,
    published_at: normalizePubDate(r.pubDate || ""),
    source: r.source_name || r.source_id || "",
    group_key: normalizeGroupKey(r.title || ""),
  }));
  const groups = groupRows(rawWithKey);
  const { pageGroups, total, totalPages } = paginateGroups(groups, page);
  return jsonResponse({
    articles: pageGroups.map((g) => groupToArticle(g, "Local", category)),
    totalPages,
    total,
    page,
    localBanner,
  });
}

async function handleSearch(
  sb: ReturnType<typeof createClient>,
  {
    query,
    dateFrom,
    dateTo,
    page,
    sort,
  }: { query: string; dateFrom: string; dateTo: string; page: number; sort: string },
): Promise<Response> {
  const term = query.trim();
  if (!term) {
    return jsonResponse({ articles: [], totalPages: 1, total: 0, page: 1 });
  }

  let q = sb
    .from("article_cache")
    .select("*")
    .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    .order("published_at", { ascending: sort === "asc" })
    .limit(POOL_LIMIT);

  if (dateFrom) q = q.gte("published_at", dateFrom);
  if (dateTo) q = q.lte("published_at", `${dateTo}T23:59:59`);

  const { data, error } = await q;
  if (error) throw error;

  const groups = groupRows(data ?? []);
  const { pageGroups, total, totalPages } = paginateGroups(groups, page);
  return jsonResponse({
    articles: pageGroups.map((g) => groupToArticle(g, "Search", "All")),
    totalPages,
    total,
    page,
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("NEWSDATA_API_KEY");
  if (!apiKey) return err500("NEWSDATA_API_KEY not configured");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return err500("Supabase env vars not configured");

  const sb = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "browse";
  const region = url.searchParams.get("region") ?? "World";
  const category = url.searchParams.get("category") ?? "All";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const localRegion = url.searchParams.get("localRegion") ?? "";
  const query = url.searchParams.get("query") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const sort = url.searchParams.get("sort") ?? "desc";

  try {
    if (mode === "search") {
      return await handleSearch(sb, { query, dateFrom, dateTo, page, sort });
    }
    return await handleBrowse(sb, apiKey, { region, category, page, localRegion });
  } catch (err: any) {
    console.error("[get-news] unhandled error:", err.message);
    return jsonResponse({ error: "Internal server error", detail: err.message }, 500);
  }
});
