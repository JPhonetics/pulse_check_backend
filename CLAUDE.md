# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pulse Check** is a news aggregator app. Users browse top headlines by region (World / US / Local) and topic (sub-category), search across articles, and — when registered — save articles and searches. The backend is built on **Supabase** (PostgreSQL + Auth + REST API auto-generated from schema).

## Commands

```bash
# Install Supabase CLI
npm install

# Link to the hosted Supabase project (already linked via supabase/.temp/)
npx supabase link --project-ref rajtswvekbowleeocyfu

# Push schema migrations to hosted project
npx supabase db push

# Pull remote schema changes
npx supabase db pull

# Deploy the get-news Edge Function to production
npx supabase functions deploy get-news

# Serve Edge Functions locally for testing (reads supabase/functions/.env)
npx supabase functions serve

# Open Supabase Studio (local)
npx supabase start
npx supabase studio
```

## Architecture

The backend is **Supabase-native**: all API endpoints, auth, and storage are provided by Supabase — there is no custom Node.js/Express server. The Supabase project ref is `rajtswvekbowleeocyfu`.

### Database Schema

Schema files in `app_outline/`:
- `current_db_schema.sql` — snapshot of the current hosted Supabase schema (updated via `npx supabase db pull`)
- `pre_auth_db_schema.sql` — snapshot before auth migration (reference only)
- `test_db_schema.sql` — original design artifact (ignore for implementation)

Actual migrations live in `supabase/migrations/` (files `20260624000001`–`20260624000009`). When implementing schema changes, create new migration files there and apply with `npx supabase db push`.

Four tables:

| Table | Purpose |
|---|---|
| `user` | User profile — `id` (UUID PK), `first_name`, `email`, optional `local_state`/`local_city` |
| `article_cache` | Fetched news articles — `article_id` (VARCHAR PK), title, description, URLs, source, `category`, `country`, timestamps, `group_key` (normalized title for dedup) |
| `saved_article` | Articles bookmarked by users — FK to `user.id`, stores article metadata inline (denormalized from `article_cache`) |
| `saved_search` | Keyword searches saved by users — FK to `user.id`, `keywords` + optional `date_from`/`date_to` |

**Important schema details:**
- `saved_article` stores article metadata directly (not just a FK to `article_cache`) so saves persist even if the cache is evicted. It has a unique constraint on `(user_id, article_id)` — use upsert/`ON CONFLICT DO NOTHING` when saving.
- `article_cache` has two composite indexes: `(country, category, published_at DESC)` for browse/filter queries and `(country, category, fetched_at DESC)` for freshness checks. `group_key` (migration 9) is a normalized/lowercased title string (punctuation stripped) indexed for dedup lookups.
- `current_db_schema.sql` may lag behind the latest migration — run `npx supabase db pull` to refresh it.

**Supabase Auth vs. `user` table:** Supabase Auth manages credentials in `auth.users`. The custom `user` table stores profile data (`first_name`, `email`, `local_state`, `local_city`). Its `id` is a FK to `auth.users.id` (ON DELETE CASCADE). The `password` column was dropped in migration 6. `email` is kept in sync with `auth.users.email` via a trigger (migration 7 — fires only after re-verification).

**DB triggers (migrations 6 & 7):**
- `on_auth_user_created` — AFTER INSERT on `auth.users`: auto-creates a `public.user` profile row. Reads `first_name` from signup metadata (`options.data.first_name` in the JS client).
- `on_user_profile_updated` — BEFORE UPDATE on `public.user`: auto-sets `modified_date`.
- `on_auth_user_email_updated` — AFTER UPDATE on `auth.users`: syncs `public.user.email` only when the new email is confirmed.

**Column → UI mapping:** `article_cache.category` drives sub-category filtering (Business, Crime, etc.); `article_cache.country` drives region filtering (World/US). Local region is not a DB column — it's resolved via keyword search (see Local region resolution below).

**Row Level Security (migrations 8 & 10):**
- `user`, `saved_article`, `saved_search`: RLS enabled; all policies restrict to `auth.uid()` — users can only see/edit their own rows. No client INSERT policy on `user` — inserts are handled exclusively by the `handle_new_user` trigger (SECURITY DEFINER bypasses RLS).
- `article_cache`: RLS enabled with **no client-facing policies** (migration 10 dropped the former anon SELECT/INSERT/UPDATE policies). Anon and authenticated roles are default-denied. Only the service role — used by the `get-news` Edge Function — can read or write the table. No DELETE policy — retention sweeps use the service role, which bypasses RLS.

### User Types

- **Guest**: can browse and set local region (stored in browser); cannot save articles or searches.
- **Registered**: full feature access; local region stored on profile and synced across devices.

### Key Product Spec (`app_outline/user_journey_optimized.md`)

All UX decisions, screen flows, and edge cases are documented here. Notable decisions:
- Region tabs: **World / US / Local**; sub-categories: All, Business, Crime, Entertainment, Health, Politics, Sports, Tech, Weather
- Browse and search are **mutually exclusive**: entering a search clears region/sub-category; clicking a region/sub-category exits search
- Pagination: **9 articles per page (3×3)**, numbered pages, ordered by publish date descending
- Donate button: **Stripe-powered** donation flow (Stripe Checkout or embedded — TBD)
- Article links open the **source site in a new tab**
- Password reset links expire after **30 minutes**
- On login, if device has a local region but profile does not, prompt once to merge

### Local Region Resolution

The News API has no city/state field, so Local results are synthesized via keyword search with a two-tier fallback:
1. Query the city name (e.g. `"Hacienda Heights"`).
2. If results are fewer than one page, widen to the state (e.g. `"California"`).

When widened, show a banner: *"Limited results for {City} — showing {State} news."* Favor articles whose **title** contains the location term over body-only mentions.

### Test Data

`app_outline/sql_test_data/` contains CSV fixtures for all four tables (`user_rows.csv`, `article_cache_rows.csv`, `saved_article_rows.csv`, `saved_search_rows.csv`) for manual seeding or local testing.

### Edge Function: `get-news`

`supabase/functions/get-news/index.ts` is a Deno function that proxies **newsdata.io** (`/api/1/latest`) and returns a normalized article list. It runs with the **service role key** (bypasses RLS) to write to `article_cache`.

**Query params:**

| Param | Values | Notes |
|---|---|---|
| `mode` | `browse` (default) \| `search` | Selects handler |
| `region` | `World` \| `US` \| `Local` | Browse mode only |
| `category` | `All`, `Business`, `Crime`, `Entertainment`, `Health`, `Politics`, `Sports`, `Tech`, `Weather` | Browse mode |
| `page` | integer ≥ 1 | Pagination (9 articles/page) |
| `localRegion` | `"City, ST"` string | Local mode — parsed into city + state |
| `query` | keyword string | Search mode |
| `dateFrom` / `dateTo` | ISO date strings | Search mode date filter |
| `sort` | `desc` (default) \| `asc` | Sort by `published_at` |

**Browse flow:** Checks cache freshness (15-minute TTL). On miss, fetches from newsdata.io and upserts into `article_cache`, then pages from cache. Local region uses a two-tier query (city → state fallback if < 1 page). Weather is a keyword search (`q=weather`) since newsdata.io has no weather category. All other categories map through `CATEGORY_MAP`.

**Search flow:** Full-text `ilike` filter on `title` and `description` against `article_cache` — does **not** hit newsdata.io.

**`applyNullSafeFilter` pattern:** `.eq('col', null)` sends `col=eq.null` (string match), not SQL `IS NULL`. Use `.is(col, null)` for null values — the helper `applyNullSafeFilter` handles this throughout the function.

**Secrets:** `supabase/functions/.env` holds `NEWSDATA_API_KEY` for local `functions serve`. For production, set the secret via the Supabase dashboard or `npx supabase secrets set NEWSDATA_API_KEY=...`.

### External Integrations

- **newsdata.io**: article fetching (Edge Function `get-news` is live)
- **Stripe API**: donation flow (planned)
- **Supabase Auth**: email/password auth, email verification, password reset emails
