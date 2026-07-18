#!/usr/bin/env node
// scripts/backfill-wiki-blurbs.mjs -- per-file LLM summaries (blurbs) for EVERY wiki note
// (U-SIERRA-WIKI-BLURB-BACKFILL, slot:sierra, 2026-07-01).
//
// Operator: "did you add summaries for what each and every file is?" -- measured answer was NO:
// only ~24% of the 47.6K wiki notes had a summary (403 in-file descriptions + 10,983 cached
// blurbs). Blurb generation was COUPLED to embedding (embed-all-wiki --with-context only blurbs
// files it embeds; the corpus is fully embedded -> "nothing to embed" -> no backfill possible).
// This driver DECOUPLES it: walk every wiki .md, skip existing cache hits (mtime-keyed), generate
// the missing blurbs via local Ollama ($0), append into the SAME blurbs-cache the embed pipeline
// reads -- so future re-embeds automatically pick up the richer salient text.
//
// Pure composition (R8): generateBlurb/loadBlurbCache/saveBlurbCache/readCacheHit/writeCacheHit
// from lib/contextual-blurb.mjs; makeWinPath/flattenBody + the cache path + key convention
// (`${makeWinPath(fp)}:${BLURB_VERSION}`) from embed-wiki-into-tribal-index.mjs -- key-compatible
// with the 10,983 existing entries, so nothing is re-paid.
//
// Kill-safe: saveBlurbCache (atomic tmp+rename) every FLUSH_EVERY files -> a killed/rebooted run
// keeps everything flushed; re-run resumes via cache hits. Fail-soft per file (a null blurb is
// counted, never fabricated); ABORTS LOUD if the first ABORT_PROBE files all fail (model down /
// retired tag) instead of grinding 36K no-ops.
//
// Usage:
//   node scripts/backfill-wiki-blurbs.mjs                # full resumable pass
//   node scripts/backfill-wiki-blurbs.mjs --limit 20     # smoke
//   node scripts/backfill-wiki-blurbs.mjs --json         # machine-readable summary
// Knobs: PRISM_WIKI_ROOT, PRISM_BLURB_FLUSH_EVERY, PRISM_OLLAMA_URL (via lib defaults).

import fs from "node:fs";
import path from "node:path";
import {
  BLURB_VERSION, generateBlurb, loadBlurbCache, saveBlurbCache, readCacheHit, writeCacheHit,
} from "./lib/contextual-blurb.mjs";
import { makeWinPath, flattenBody } from "./embed-wiki-into-tribal-index.mjs";

const ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
const WIKI_ROOT = process.env.PRISM_WIKI_ROOT || `${ROOT}/knowledge/wiki`;
const CACHE_PATH = `${ROOT}/state/shared/tribal-embed-index.blurbs-cache.json`;
const FLUSH_EVERY = Number(process.env.PRISM_BLURB_FLUSH_EVERY) || 50;
// Bulk-job model: the lib default (qwen2.5-coder:32b) measured ~70s/blurb under fleet GPU
// contention (18.5GB weights lose eviction fights vs peer models -> reload thrash) = 140h+ for
// 36K files. A 1-2 sentence doc-type+keyword blurb is a trivial extraction task -> route to the
// small coder per token-economy doctrine. 7b (4.4GB) coexists with peer models without thrash.
const MODEL = process.env.PRISM_BLURB_MODEL || "qwen2.5-coder:7b";
// Overnight batch: per-call latency is irrelevant, completion is everything. The lib default
// 30s timeout expires while queued behind peer 8-way batches -> spurious nulls; 120s rides it out.
const CALL_TIMEOUT_MS = Number(process.env.PRISM_BLURB_TIMEOUT_MS) || 120_000;
const ABORT_PROBE = 25; // if the FIRST 25 attempts ALL fail, the model/lane is down -> abort loud

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ollama is a SHARED fleet resource -- peer batch jobs (e.g. generate-pdf-tribal-tips-hermes
// --concurrency 8) saturate the request queue and :11434 returns 503 "maximum pending requests
// exceeded". generateBlurb nulls on ANY failure, so without retries a saturation episode would
// burn through thousands of files as spurious "failed". Retry each file with backoff; after a
// streak of persistent failures, take a long cool-down (the episode outlives per-file retries).
const RETRY_DELAYS_MS = [5_000, 20_000];
const COOLDOWN_AFTER_CONSEC = 5;
const COOLDOWN_MS = 60_000;

async function blurbWithRetry(flat) {
  let b = await generateBlurb(flat, { model: MODEL, timeoutMs: CALL_TIMEOUT_MS });
  for (const delay of RETRY_DELAYS_MS) {
    if (b) return b;
    await sleep(delay);
    b = await generateBlurb(flat, { model: MODEL, timeoutMs: CALL_TIMEOUT_MS });
  }
  return b;
}

function walk(dir) {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== ".obsidian") out = out.concat(walk(p)); }
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const limIdx = args.indexOf("--limit");
  const LIMIT = limIdx !== -1 ? Number(args[limIdx + 1]) || 0 : 0;
  const wantJson = args.includes("--json");

  const files = walk(WIKI_ROOT).sort();
  const cache = loadBlurbCache(CACHE_PATH);
  const stats = { total: files.length, cached: 0, generated: 0, failed: 0, readFailed: 0, flushes: 0 };

  let attempted = 0;
  let consecFailed = 0;
  for (const fp of files) {
    if (LIMIT > 0 && stats.generated + stats.failed >= LIMIT) break;
    let st, body;
    try { st = fs.statSync(fp); body = fs.readFileSync(fp, "utf8"); }
    catch { stats.readFailed++; console.error(`[blurb-backfill]   read-FAILED: ${fp}`); continue; }
    const key = `${makeWinPath(fp)}:${BLURB_VERSION}`;
    if (readCacheHit(cache, key, st.mtimeMs)) { stats.cached++; continue; }

    const flat = flattenBody(body);
    const blurb = await blurbWithRetry(flat);
    attempted++;
    if (!blurb) {
      stats.failed++;
      consecFailed++;
      if (attempted >= ABORT_PROBE && stats.generated === 0) {
        saveBlurbCache(CACHE_PATH, cache);
        console.error(`[blurb-backfill] ABORT: first ${attempted} blurb files ALL failed (with retries) -- Ollama/model down? Nothing generated; cache flushed; re-run resumes.`);
        process.exit(1);
      }
      if (consecFailed >= COOLDOWN_AFTER_CONSEC) {
        console.error(`[blurb-backfill]   ${consecFailed} consecutive failures -- queue saturated? cooling down ${COOLDOWN_MS / 1000}s`);
        await sleep(COOLDOWN_MS);
        consecFailed = 0;
      }
      continue;
    }
    consecFailed = 0;
    writeCacheHit(cache, key, blurb, st.mtimeMs);
    stats.generated++;
    if (stats.generated % FLUSH_EVERY === 0) {
      saveBlurbCache(CACHE_PATH, cache); // atomic tmp+rename -> kill-safe monotonic progress
      stats.flushes++;
      console.error(`[blurb-backfill]   ${stats.generated} generated (${stats.cached} cached, ${stats.failed} failed) -- flushed`);
    }
  }

  saveBlurbCache(CACHE_PATH, cache);
  const remaining = stats.total - stats.cached - stats.generated - stats.failed - stats.readFailed;
  const summary = { ...stats, remaining: Math.max(0, remaining), cachePath: CACHE_PATH, blurbVersion: BLURB_VERSION, model: MODEL };
  if (wantJson) console.log(JSON.stringify(summary, null, 2));
  else console.error(`[blurb-backfill] DONE -- generated ${stats.generated}, cached ${stats.cached}, failed ${stats.failed}, read-failed ${stats.readFailed} of ${stats.total} wiki files (remaining ~${summary.remaining})`);
}

await main();
