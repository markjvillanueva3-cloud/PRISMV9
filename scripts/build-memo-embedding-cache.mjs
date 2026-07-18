#!/usr/bin/env node
// scripts/build-memo-embedding-cache.mjs
// ----------------------------------------
// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3a, slot:alpha, 2026-06-08)
//
// Offline embedding-cache builder for the auto-memory vault. Reads every memo
// in the memory dir, embeds the SALIENT slice (frontmatter description + title
// + opening paragraph — the same slice the recall hook surfaces) via Ollama
// nomic-embed-text, and writes a JSONL cache the PreToolUse recall hook
// (memory-relevance-inject.mjs) reads DIRECTLY — no MCP daemon dependency, so
// semantic recall keeps working when the MCP server is down (its current state).
//
// This is the SAFE half of F3: a standalone offline script with ZERO hot-path
// blast radius. The hook integration (F3b) loads this cache fail-open.
//
// Incremental: a memo whose salient-slice hash is unchanged keeps its existing
// vector (no re-embed). Pass --full to force a full rebuild.
//
// Usage:
//   node scripts/build-memo-embedding-cache.mjs            # incremental
//   node scripts/build-memo-embedding-cache.mjs --full     # force rebuild
//   node scripts/build-memo-embedding-cache.mjs --limit 20 # smoke (first 20)
//
// Knobs: PRISM_MEMORY_DIR, PRISM_MEMO_EMBED_CACHE, PRISM_EMBED_MODEL,
//        PRISM_OLLAMA_URL, PRISM_EMBED_TIMEOUT_MS.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  MEMORY_DIR,
  EMBED_CACHE,
  EMBED_MODEL,
  EMBED_TIMEOUT_MS,
  salientSlice,
  embedText,
  embedTextBatch,
  loadEmbedCache,
} from "./lib/memo-embed-lib.mjs";

const BATCH_SIZE = Number(process.env.PRISM_MEMO_EMBED_BATCH) || 64;

const args = process.argv.slice(2);
const FULL = args.includes("--full");
const limIdx = args.indexOf("--limit");
const LIMIT = limIdx !== -1 ? Number(args[limIdx + 1]) || 0 : 0;

// U-OBS-GALAXY-BRAIN-RECALL (CONTEXT-EXPANSION + vault-value, 2026-06-09, slot:alpha):
// the 34 per-galaxy MEMORY.md brains live under mcp-server/src/engines/<galaxy>/ —
// OUTSIDE MEMORY_DIR. forward-slash so the path the hot-path hook readFileSync's is
// drive-correct on Windows (MEMORY_DIR is on C:, engines on H:).
const PRISM_ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
const ENGINES_DIR = `${PRISM_ROOT}/mcp-server/src/engines`;

// Flat auto-memory vault → [{name, path}]. (Was [name]; generalized to objects so
// galaxy brains, which live elsewhere, flow through the SAME embed pipeline.)
function listMemos() {
  if (!existsSync(MEMORY_DIR)) return [];
  let files;
  try { files = readdirSync(MEMORY_DIR); } catch { return []; }
  return files
    .filter((f) => /^(feedback|reference|project|user)_.+\.md$/.test(f))
    .sort()
    .map((f) => ({ name: f, path: path.join(MEMORY_DIR, f).replace(/\\/g, "/") }));
}

// The per-galaxy domain brains: mcp-server/src/engines/<galaxy>/MEMORY.md. Named
// MEMORY.md (so the flat-memo filter NEVER matched them → they were absent from
// semantic recall). Keyed `galaxy/<dir>` with an explicit `path` so loadEmbedCache
// → semanticTopK → the recall hook resolve them OUTSIDE MEMORY_DIR.
function listGalaxyBrains() {
  if (!existsSync(ENGINES_DIR)) return [];
  let dirs;
  try { dirs = readdirSync(ENGINES_DIR, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const p = `${ENGINES_DIR}/${d.name}/MEMORY.md`;
    if (existsSync(p)) out.push({ name: `galaxy/${d.name}`, path: p });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// U-OBS-VAULT-MEMO-RECALL (CONTEXT-EXPANSION + vault-value, 2026-06-09, slot:alpha):
// substantive reference memos that live ONLY in the H: vault
// (knowledge/memories/reference) and are absent from the C: source dir (MEMORY_DIR)
// — H:-only content the flat-memo scan (listMemos, C: source) never sees, so they
// were 0% semantically recallable (verified: 304 such memos, all >=300 bytes).
// Keyed `vault/<stem>` with an explicit `path`, reusing the galaxy-brain path-plumb.
// Dedup is by filename against the FULL C: dir listing (not just the prefix-matched
// subset) so a memo already embedded from C: is never double-embedded. Excludes the
// node-pointer stubs (node_*) and the MEMORY.md index file.
const MEMORIES_REF_DIR = `${PRISM_ROOT}/knowledge/memories/reference`;
function listVaultOnlyReferenceMemos() {
  if (!existsSync(MEMORIES_REF_DIR)) return [];
  let cNames = new Set();
  try { cNames = new Set(readdirSync(MEMORY_DIR).map((f) => f.toLowerCase())); }
  catch { /* C: source absent → every H: ref memo is vault-only */ }
  let files;
  try { files = readdirSync(MEMORIES_REF_DIR); } catch { return []; }
  const out = [];
  for (const f of files) {
    if (!/\.md$/i.test(f) || f === "MEMORY.md" || /^node[-_]/i.test(f)) continue;
    if (cNames.has(f.toLowerCase())) continue; // already embedded from C: source
    out.push({ name: `vault/${f.replace(/\.md$/i, "")}`, path: `${MEMORIES_REF_DIR}/${f}` });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Single-source the emitted cache-entry shape so the emit sites (reuse +
// fresh-embed) can never drift: NAMESPACED entries (any key with a `/` —
// `galaxy/*`, `vault/*`) carry their explicit `path` (they live OUTSIDE
// MEMORY_DIR); flat memos (bare filename, no `/`) omit it (the consumer falls
// back to MEMORY_DIR/name). Flat-memo filenames never contain `/`, so the
// discriminator is exact.
function mkEntry(name, vec, hash, srcPath) {
  const e = { name, vec, hash };
  if (name.includes("/")) e.path = srcPath;
  return e;
}

function salientHash(text) {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

async function main() {
  // Flat C: auto-memory + 34 per-galaxy domain brains + H:-only vault reference memos.
  const memos = [...listMemos(), ...listGalaxyBrains(), ...listVaultOnlyReferenceMemos()];
  if (memos.length === 0) {
    console.error(`[memo-embed] no memos found in ${MEMORY_DIR}`);
    process.exit(1);
  }
  const work = LIMIT > 0 ? memos.slice(0, LIMIT) : memos;
  console.error(`[memo-embed] ${work.length} memo(s) · model=${EMBED_MODEL} · cache=${EMBED_CACHE}${FULL ? " · FULL" : " · incremental"}`);

  // Existing cache keyed by name → {vec, hash} for incremental reuse.
  const prior = FULL ? new Map() : (loadEmbedCache(EMBED_CACHE) || new Map());

  const out = [];
  let embedded = 0, reused = 0, failed = 0, skippedEmpty = 0;

  // Phase 1 (pure): reuse-scan — keep unchanged vectors from the prior cache,
  // collect only the changed/new memos that actually need an embed.
  const toEmbed = []; // { name, salient, hash }
  for (let i = 0; i < work.length; i++) {
    const { name, path: srcPath } = work[i];
    let body;
    try { body = readFileSync(srcPath, "utf8"); } catch { failed++; console.error(`[memo-embed]   read-FAILED: ${name}`); continue; }
    const salient = salientSlice(body);
    // Empty salient slice = a stub/near-empty memo (no frontmatter-desc, title, or opening
    // paragraph) with NOTHING to embed. That is correct exclusion, NOT an embed failure -- count
    // it separately so a health check never false-alarms on "failed" (R12 honest metric).
    if (!salient) { skippedEmpty++; console.error(`[memo-embed]   skipped-EMPTY (nothing to embed): ${name}`); continue; }
    const h = salientHash(salient);
    const priorEntry = prior.get(name);
    if (priorEntry && priorEntry.hash === h && Array.isArray(priorEntry.vec) && priorEntry.vec.length) {
      out.push(mkEntry(name, priorEntry.vec, h, srcPath));
      reused++;
      continue;
    }
    // Carry the prior entry (stale-hash vector) so an embed FAILURE below can
    // keep the old still-meaningful vector instead of dropping the memo from
    // semantic recall entirely (scrutiny arm-B P1: under embed starvation the
    // atomic rewrite was silently SHRINKING the cache).
    toEmbed.push({ name, salient, hash: h, path: srcPath, prior: priorEntry });
  }

  // Phase 2 (#7 batched): embed the changed/new memos via /api/embed in chunks
  // (N× fewer round-trips on the resident Blackwell). Fail-soft PER BATCH: if the
  // batch call returns null (timeout/non-200/count-mismatch), fall back to the
  // proven per-item embedText for that chunk so one bad batch never loses the run.
  for (let start = 0; start < toEmbed.length; start += BATCH_SIZE) {
    const chunk = toEmbed.slice(start, start + BATCH_SIZE);
    // U-INDIA-EMBED-LANE: no url pin -- embedTextBatch/embedText lane-resolve
    // by default (dedicated :11435 CPU lane when up, MAIN fallback otherwise).
    // The old explicit `url: EMBED_URL` bypassed the lane and kept this bulk
    // builder on the starvation-prone shared instance (scrutiny arm-B P1).
    const batchOpts = { model: EMBED_MODEL };
    let vecs = await embedTextBatch(chunk.map((c) => c.salient), batchOpts);
    if (vecs === null) {
      // batch failed — degrade to per-item (preserves the prior single-call path)
      vecs = [];
      for (const c of chunk) vecs.push(await embedText(c.salient, { ...batchOpts, timeoutMs: EMBED_TIMEOUT_MS }));
    }
    for (let k = 0; k < chunk.length; k++) {
      const vec = vecs[k];
      if (!vec) {
        failed++;
        const p = chunk[k].prior;
        if (p && Array.isArray(p.vec) && p.vec.length) {
          // Keep the prior vector under its OLD hash: recall stays warm on the
          // slightly-stale vector, and the stale hash forces a re-embed retry
          // on the next run (writing the NEW hash would freeze it forever).
          out.push(mkEntry(chunk[k].name, p.vec, p.hash, chunk[k].path));
          console.error(`[memo-embed]   embed-FAILED (kept prior vector): ${chunk[k].name}`);
        } else {
          console.error(`[memo-embed]   embed-FAILED: ${chunk[k].name}`);
        }
        continue;
      }
      out.push(mkEntry(chunk[k].name, vec, chunk[k].hash, chunk[k].path));
      embedded++;
    }
    if ((embedded + reused) % 100 < BATCH_SIZE) {
      console.error(`[memo-embed]   ${embedded + reused}/${work.length} (embedded ${embedded}, reused ${reused})`);
    }
  }

  if (out.length === 0) {
    console.error(`[memo-embed] FAIL — embedded 0 vectors (Ollama down? model missing?). Cache NOT overwritten.`);
    process.exit(1);
  }

  // Atomic write (tmp + rename) so a partial run never corrupts the cache the
  // hot-path hook reads.
  mkdirSync(path.dirname(EMBED_CACHE), { recursive: true });
  const tmp = `${EMBED_CACHE}.tmp-${process.pid}`;
  const jsonl = out.map((o) => JSON.stringify(o)).join("\n") + "\n";
  writeFileSync(tmp, jsonl, "utf8");
  renameSync(tmp, EMBED_CACHE);
  console.error(`[memo-embed] DONE -- ${out.length} vectors (embedded ${embedded}, reused ${reused}, skipped-empty ${skippedEmpty}, failed ${failed}) · dim ${out[0].vec.length} -> ${EMBED_CACHE}`);
}

main().catch((e) => { console.error(`[memo-embed] ERROR: ${e?.message || e}`); process.exit(1); });
