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

### Database Schema (`app_outline/test_db_schema.sql`)

Four tables:

| Table | Purpose |
|---|---|
| `user` | User accounts — `id` (UUID PK), email, password, first_name, optional `local_state`/`local_city`/`local_zip` |
| `article_cache` | Fetched news articles — `article_id` (VARCHAR PK), title, description, URLs, source, category, country, timestamps |
| `saved_article` | Articles bookmarked by users — FK to `user.id`, stores article metadata inline (denormalized from `article_cache`) |
| `saved_search` | Keyword searches saved by users — FK to `user.id`, keywords + optional `date_from`/`date_to` |

`saved_article` stores article metadata directly (not just a FK to `article_cache`) so saved articles persist even if the cache is evicted.

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

### External Integrations (planned)

- **News API**: article fetching into `article_cache`
- **Stripe API**: donation flow
- **Supabase Auth**: email/password auth, email verification, password reset emails
