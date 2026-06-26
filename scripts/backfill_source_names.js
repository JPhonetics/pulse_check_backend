#!/usr/bin/env node
/**
 * backfill_source_names.js
 *
 * One-time script: updates saved_article.source from source_id slugs
 * (e.g. "nbcsports") to proper display names (e.g. "NBC Sports") using
 * the newsdata.io /sources endpoint.
 *
 * Reads from backend/.env and/or backend/supabase/functions/.env:
 *   SUPABASE_URL           — e.g. https://rajtswvekbowleeocyfu.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 *   NEWSDATA_API_KEY       — newsdata.io API key
 *
 * Run from repo root:
 *   node backend/scripts/backfill_source_names.js
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load env files ───────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, "utf8").split("\n");
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

const backendDir = resolve(__dirname, "..");
const env1 = parseEnvFile(resolve(backendDir, ".env"));
const env2 = parseEnvFile(resolve(backendDir, "supabase", "functions", ".env"));
const env3 = parseEnvFile(resolve(backendDir, "supabase", ".env"));
const env = { ...env1, ...env2, ...env3, ...process.env };

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const NEWSDATA_API_KEY = env.NEWSDATA_API_KEY;

if (!SUPABASE_URL) {
  console.error("ERROR: SUPABASE_URL not found in env files.");
  console.error("Add SUPABASE_URL=https://rajtswvekbowleeocyfu.supabase.co to backend/.env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in env files.");
  console.error("Add SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> to backend/.env");
  console.error("Find it in: Supabase Dashboard → Project Settings → API → service_role key");
  process.exit(1);
}
if (!NEWSDATA_API_KEY) {
  console.error("ERROR: NEWSDATA_API_KEY not found in env files.");
  process.exit(1);
}

console.log(`Using Supabase URL: ${SUPABASE_URL}`);
console.log(`NEWSDATA_API_KEY: ${NEWSDATA_API_KEY.slice(0, 10)}...`);

// ─── Fetch all newsdata.io sources (paginated) ────────────────────────────────

async function fetchAllSources(apiKey) {
  const slugToName = new Map();
  let page = null;
  let pageCount = 0;

  do {
    const params = new URLSearchParams({ apikey: apiKey, language: "en" });
    if (page) params.set("page", page);

    const url = `https://newsdata.io/api/1/sources?${params}`;
    console.log(`Fetching sources page ${pageCount + 1}${page ? ` (token: ${page})` : ""}...`);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`newsdata.io sources API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const results = data.results ?? [];
    console.log(`  → received ${results.length} sources`);

    for (const src of results) {
      if (src.id && src.name) {
        slugToName.set(src.id, src.name);
      }
    }

    page = data.nextPage ?? null;
    pageCount++;
  } while (page);

  console.log(`Total sources fetched: ${slugToName.size}`);
  return slugToName;
}

// ─── Fetch all saved_article rows ─────────────────────────────────────────────

async function fetchAllSavedArticles(supabaseUrl, serviceKey) {
  const url = `${supabaseUrl}/rest/v1/saved_article?select=id,source`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch saved_article error ${res.status}: ${text}`);
  }
  const rows = await res.json();
  console.log(`Fetched ${rows.length} saved_article rows.`);
  return rows;
}

// ─── Update a single row ──────────────────────────────────────────────────────

async function updateRow(supabaseUrl, serviceKey, id, newSource) {
  const url = `${supabaseUrl}/rest/v1/saved_article?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ source: newSource }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH error for id ${id}: ${res.status}: ${text}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch source name map from newsdata.io
  const slugToName = await fetchAllSources(NEWSDATA_API_KEY);

  // 2. Fetch all saved_article rows
  const rows = await fetchAllSavedArticles(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 3. Identify rows that need updating:
  //    - source exists as a key in slugToName (it's a slug)
  //    - AND current source doesn't already match the display name
  const toUpdate = rows.filter((row) => {
    const currentSource = row.source;
    if (!currentSource) return false;
    const mappedName = slugToName.get(currentSource);
    // Only update if slug is in our map AND current value differs from the proper name
    return mappedName !== undefined && currentSource !== mappedName;
  });

  console.log(`\nRows to update: ${toUpdate.length} of ${rows.length}`);

  if (toUpdate.length === 0) {
    console.log("Nothing to update — all sources are already using display names (or no matches found).");
    return;
  }

  // 4. Update each row
  let successCount = 0;
  let errorCount = 0;

  for (const row of toUpdate) {
    const newSource = slugToName.get(row.source);
    try {
      await updateRow(SUPABASE_URL, SERVICE_ROLE_KEY, row.id, newSource);
      console.log(`  Updated id=${row.id}: "${row.source}" → "${newSource}"`);
      successCount++;
    } catch (err) {
      console.error(`  ERROR updating id=${row.id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nBackfill complete: ${successCount} rows updated, ${errorCount} errors.`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
