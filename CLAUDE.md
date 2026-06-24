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

# Open Supabase Studio (local)
npx supabase start
npx supabase studio
```

## Architecture

The backend is **Supabase-native**: all API endpoints, auth, and storage are provided by Supabase — there is no custom Node.js/Express server. The Supabase project ref is `rajtswvekbowleeocyfu`.

### Database Schema

Two schema files exist in `app_outline/`:
- `test_db_schema.sql` — original design artifact (ignore for implementation)
- `current_db_schema.sql` — snapshot of the current hosted Supabase schema (updated via `npx supabase db pull`)

Actual migrations live in `supabase/migrations/` (files `20260624000001`–`20260624000004`). When implementing schema changes, create new migration files there and apply with `npx supabase db push`.

Four tables:

| Table | Purpose |
|---|---|
| `user` | User profile — `id` (UUID PK), `first_name`, `email`, optional `local_state`/`local_city` |
| `article_cache` | Fetched news articles — `article_id` (VARCHAR PK), title, description, URLs, source, `category`, `country`, timestamps |
| `saved_article` | Articles bookmarked by users — FK to `user.id`, stores article metadata inline (denormalized from `article_cache`) |
| `saved_search` | Keyword searches saved by users — FK to `user.id`, `keywords` + optional `date_from`/`date_to` |

**Important schema details:**
- `saved_article` stores article metadata directly (not just a FK to `article_cache`) so saves persist even if the cache is evicted. It has a unique constraint on `(user_id, article_id)` — use upsert/`ON CONFLICT DO NOTHING` when saving.
- `article_cache` has two composite indexes: `(country, category, published_at DESC)` for browse/filter queries and `(country, category, fetched_at DESC)` for freshness checks.

**Supabase Auth vs. `user` table:** Supabase Auth manages credentials (email + password) in `auth.users`. The custom `user` table stores profile data only (`first_name`, `local_state`, `local_city`). Its `id` should reference `auth.users.id`. The `email` and `password` columns in the migration are a holdover from the design artifact — reconcile with Supabase Auth before applying to production.

**Column → UI mapping:** `article_cache.category` drives sub-category filtering (Business, Crime, etc.); `article_cache.country` drives region filtering (World/US). Local region is not a DB column — it's resolved via keyword search (see Local region resolution below).

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

### External Integrations (planned)

- **News API**: article fetching into `article_cache`
- **Stripe API**: donation flow
- **Supabase Auth**: email/password auth, email verification, password reset emails
