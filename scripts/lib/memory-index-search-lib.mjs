#!/usr/bin/env node
// Pure-core search over the Obsidian memory vault for free-floating memories
// not pre-joined to system-graph.json nodes.
//
// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
// memories that some system-graph node has linked via knowledge.memoryEntries[].
// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,reference,
// project,user,patterns,mistakes,inbox}/ that AREN'T pre-joined (i.e. just
// written, or never linked) are invisible to that path. This lib enumerates
// the memory vault directly + BM25-lite scores frontmatter description + body
// first-paragraph against query tokens.
//
// Pure functions; the caller injects fs readers + a root path. Tokenizer +
// stopwords + scoring weights match master-index-search-lib.mjs so the two
// surfaces blend predictably. Failures return empty hit lists, never throw.

import { readFileSync, statSync, readdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
// U-OBF-RECALL-NS (2026-05-29 slot:alpha): added scrutiny/uncategorized/weekly-synthesis/galaxies
// — they hold ~70 active memories the recall hook silently dropped (verified on disk: scrutiny=58,
// uncategorized=10, weekly-synthesis=1, galaxies=1). `_legacy-root` (265) is intentionally excluded
// (archival by name — would pollute recall with stale entries). See research
// [[reference_alpha_obsidian_brain_improvement_research_2026_05_29]] A1.
export const DEFAULT_NAMESPACES = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox", "scrutiny", "uncategorized", "weekly-synthesis", "galaxies"];
const DEFAULT_TOP_K = 3;
const DEFAULT_MAX_BODY_BYTES = 4096;
// U-OBF-RECALL-CAP (2026-05-29 slot:alpha): 8MB→64MB. Caps the LIVE-SCAN fallback only (the
// sidecar fast-path is uncapped); 8MB over a 53MB vault left ~85% unreachable on sidecar corruption.
const DEFAULT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MIN_TOKEN_LEN = 3;
const MAX_QUERY_TOKENS = 12;

// U-MEMORY-INDEX-SIDECAR (H7-followup): pre-built sidecar to skip the
// ~8.7 s cold-parse of ~492 memory files (exceeded the 5 s UserPromptSubmit
// timeout, so the parent hook was shipped but NOT WIRED). Mirrors the
// master-index-search-lib sidecar pattern (build-graph-index → tryLoadSidecar).
//
// Build with: node scripts/build-memory-index-sidecar.mjs
//
// On schema/staleness/parse/shape failure → null, lib falls back to live scan
// (and stderr-warns once per process — sidecar present-but-stale is a real
// degradation the operator should fix; absent is silent).
export const SIDECAR_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_SIDECAR_PATH = "H:/prism/state/shared/memory-index-sidecar.json";

const W_NAME = 3.0;
const W_DESC = 2.5;
const W_BODY = 1.0;
const W_TYPE = 0.5;
// PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES (2026-05-23): aliases are
// synonyms for the slug — a query token hitting an alias should weight as
// strongly as hitting the slug name itself. Mirrors W_NAME, not W_DESC,
// to honor the alias-as-name semantics from the cyrilXBT pattern + iter-3
// `aliases:[...]` frontmatter convention (commit f6b5f0dce8).
const W_ALIAS = 3.0;

// Match master-index-search-lib.mjs STOPWORDS verbatim (do NOT diverge — keeps
// hit ordering predictable across the two surfaces).
export const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "the",
  "to", "was", "were", "with", "this", "that", "these", "those",
  "you", "your", "what", "where", "when", "how", "why", "which",
  "engine", "engines", "feature", "features", "system", "systems",
  "node", "label", "info", "wiki", "memory", "prism",
  "please", "would", "could", "should", "tell", "show", "find",
]);

export function tokenize(text, opts = {}) {
  if (typeof text !== "string" || text.length === 0) return [];
  const maxTokens = opts.maxTokens ?? MAX_QUERY_TOKENS;
  const minLen = opts.minLen ?? MIN_TOKEN_LEN;
  const seen = new Set();
  const out = [];
  const matches = text.toLowerCase().match(/[a-z0-9_-]+/g) || [];
  for (const m of matches) {
    if (m.length < minLen) continue;
    if (STOPWORDS.has(m)) continue;
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
    if (out.length >= maxTokens) break;
  }
  return out;
}

function parseFrontmatter(body) {
  if (typeof body !== "string" || !body.startsWith("---")) return { description: "", aliases: [], rest: body || "" };
  const end = body.indexOf("\n---", 3);
  if (end < 0) return { description: "", aliases: [], rest: body };
  const fm = body.slice(3, end);
  const rest = body.slice(end + 4).replace(/^\n+/, "");
  let description = "";
  const m = fm.match(/^\s*description:\s*(.+?)\s*$/m);
  if (m) {
    description = m[1].trim();
    if ((description.startsWith('"') && description.endsWith('"')) ||
        (description.startsWith("'") && description.endsWith("'"))) {
      description = description.slice(1, -1);
    }
  }
  const aliases = parseAliases(fm);
  return { description, aliases, rest };
}

// PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES (2026-05-23): parse the
// `aliases:` frontmatter field shipped in iter-3 (commit f6b5f0dce8).
// Supports the cyrilXBT-pattern shapes:
//   inline array  : aliases: [a, b, c]            (moc-generator's emit shape)
//   inline JSON   : aliases: ["a", "b", "c"]      (operator hand-written)
//   YAML block    : aliases:
//                     - a
//                     - b
//                     - c
// Returns a string[] of trimmed unique non-empty alias values; never throws,
// never returns null. Quote-wrap (single or double) on individual items is
// stripped. Order is preserved (first occurrence wins on dupe).
export function parseAliases(fm) {
  if (typeof fm !== "string" || fm.length === 0) return [];
  const inline = fm.match(/^\s*aliases:\s*\[(.*?)\]\s*$/m);
  const raw = [];
  if (inline) {
    for (const part of inline[1].split(",")) {
      raw.push(part);
    }
  } else {
    const blockHead = fm.match(/^\s*aliases:\s*$/m);
    if (blockHead) {
      const lines = fm.slice(blockHead.index + blockHead[0].length).split("\n");
      for (const ln of lines) {
        if (ln.length === 0) continue;
        const item = ln.match(/^\s+-\s+(.+?)\s*$/);
        if (item) { raw.push(item[1]); continue; }
        // First non-indented or non-list-item line ends the block.
        if (/^\s*-\s+/.test(ln) === false && /^\S/.test(ln)) break;
      }
    }
  }
  const seen = new Set();
  const out = [];
  for (let v of raw) {
    if (typeof v !== "string") continue;
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).trim();
    }
    if (v.length === 0) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function firstParagraph(rest, maxBytes) {
  if (typeof rest !== "string" || rest.length === 0) return "";
  const paras = rest.split(/\n{2,}/);
  for (const p of paras) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    return trimmed.slice(0, maxBytes);
  }
  return "";
}

export function buildMemoryRecord({ namespace, fileName, body, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }) {
  if (typeof fileName !== "string" || fileName.length === 0) return null;
  if (typeof body !== "string") return null;
  const { description, aliases, rest } = parseFrontmatter(body);
  const opening = firstParagraph(rest, maxBodyBytes);
  const slug = fileName.replace(/\.md$/i, "");
  return {
    name: slug,
    fileName,
    namespace: namespace || "uncategorized",
    description: description || "",
    // PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES: surface alias synonyms so
    // scoreMemoryRecord can hit them. Empty array when the note has no aliases.
    aliases: Array.isArray(aliases) ? aliases : [],
    opening,
  };
}

// MEMORY-RECALL-SUPERSEDE (2026-06-01 slot:golf): exclude formally-superseded
// memories from recall so a galaxy's hot-path never surfaces stale doctrine as
// current (e.g. feedback_alpha_owns_reaper redirecting to feedback_golf_owns_reaper).
// The marker is PROSE — the vault uses NO `status:`/`superseded_by:` frontmatter
// key (verified 0 of 11,493 files) — so we key on the canonical redirect-
// declaration SYNTAX, which is itself precise:
//   • description form:  `[SUPERSEDED <date> → [[target]]]`
//   • body blockquote:   `> **SUPERSEDED <date> — see [[target]].**`
// Case-SENSITIVE past-tense token is load-bearing — it must NOT match:
//   • `SUPERSEDES` (present tense) — the SUPERSEDING (current) memory; KEEP it.
//   • lowercase `superseded` — a topical mention or a status-enum value
//     (e.g. a DONE_STATUSES allowlist); KEEP it.
// Verified against the live vault: matches exactly the genuinely-superseded
// redirects, 0 false positives over 11,493 files, 3/3 negative controls clear
// (feedback_golf_owns_reaper the superseder, reference_unblock_detect the enum,
// feedback_never_delete_only_disable the concept). A loose `/superseded/i` would
// have wrongly dropped ~79 valuable memories that merely discuss the concept.
export const SUPERSEDED_DECL_RE = /\[SUPERSEDED\b|(?:^|\n)\s*>\s*\*\*SUPERSEDED\b/;

export function isSupersededMemory(body) {
  if (typeof body !== "string" || body.length === 0) return false;
  return SUPERSEDED_DECL_RE.test(body);
}

// Default-ON exclusion; PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 retains superseded
// memories in the recall corpus (reversible escape hatch — never deletes a file,
// just stops the recall skip). Per [[feedback_never_delete_only_disable]].
export function supersededExclusionEnabled() {
  return process.env.PRISM_MEMORY_INDEX_KEEP_SUPERSEDED !== "1";
}

// MEMORY-RECALL-NODE-POINTER-EXCLUDE (2026-06-09 slot:alpha): the `reference`
// namespace is 72% auto-generated `node_*`/`node-*` POINTER STUBS (9,571 of
// 13,229 corpus files) — thin "Node-indexed pointer — X → wiki <path>" records,
// NOT substantive memos. They dilute BM25 precision (real memos rank lower), and
// in the live-scan fallback they cost 9,571 needless stat+read calls (the very
// timeout the graceful-degradation path guards against). Node lookups have their
// own cheap surface (node_card / CHEAP-NODE-ACCESS-MS0); they do not belong in
// substantive memo recall. Default-ON exclusion; PRISM_RECALL_INCLUDE_NODE_POINTERS=1
// restores them (reversible escape hatch — never deletes, just stops the recall skip).
export const NODE_POINTER_RE = /^node[-_]/i;

export function isNodePointerStub(fileName) {
  return typeof fileName === "string" && NODE_POINTER_RE.test(fileName);
}

export function nodePointerExclusionEnabled() {
  return process.env.PRISM_RECALL_INCLUDE_NODE_POINTERS !== "1";
}

// MEMORY-RECALL-DOMAIN-BOOST (2026-06-01 slot:golf): keep each galaxy's PRIMARY
// domain context in recall. When a slot works its own galaxy, that galaxy's BRAIN
// record (namespace 'galaxies', name === the galaxy slug from slot-galaxy-map) gets
// a small ADDITIVE bump so it ranks inside the relevant set. Three safety
// invariants make this non-degrading to the fragile recall hot-path:
//   1. ADDITIVE only — never subtracts from other records, so a cross-domain hit's
//      absolute score is untouched (the boost can only re-order at the topK margin,
//      and W_DESC-sized weight won't displace a strongly-matched cross-domain hit).
//   2. RELEVANCE-GATED — applied only to records that ALREADY scored > 0 on the
//      query, so an off-topic brain is NEVER injected just because its slot is active.
//   3. OPT-IN — boostDomain null (the default) => byte-identical legacy behavior.
// Default weight ≈ one extra description-match (W_DESC=2.5).
export const DEFAULT_DOMAIN_BOOST = 2.5;

export function domainBoost(rec, boostDomain, boostWeight = DEFAULT_DOMAIN_BOOST) {
  if (!boostDomain || !rec) return 0;
  return (rec.namespace === "galaxies" && rec.name === boostDomain) ? boostWeight : 0;
}

export function scoreMemoryRecord(rec, queryTokens) {
  if (!rec || !Array.isArray(queryTokens) || queryTokens.length === 0) return 0;
  const nameBlob = (rec.name + " " + (rec.fileName || "")).toLowerCase();
  const descBlob = (rec.description || "").toLowerCase();
  const bodyBlob = (rec.opening || "").toLowerCase();
  const typeBlob = (rec.namespace || "").toLowerCase();
  // PSN-ENHANCE-MS0/U-PSN-MASTER-INDEX-ALIASES: aliases are slug synonyms.
  // Defensive: missing/non-array (legacy sidecar records pre-aliases) → "".
  const aliasBlob = Array.isArray(rec.aliases) ? rec.aliases.join(" ").toLowerCase() : "";
  let score = 0;
  for (const tok of queryTokens) {
    if (nameBlob.indexOf(tok) !== -1) score += W_NAME;
    if (descBlob.indexOf(tok) !== -1) score += W_DESC;
    if (bodyBlob.indexOf(tok) !== -1) score += W_BODY;
    if (typeBlob.indexOf(tok) !== -1) score += W_TYPE;
    if (aliasBlob.length > 0 && aliasBlob.indexOf(tok) !== -1) score += W_ALIAS;
  }
  return score;
}

// HMEMV02 explainable retrieval: which of the query tokens actually appear in this
// record's searchable fields (name/fileName/description/opening/namespace/aliases).
// Pure; used to show the operator WHY a memo surfaced. Mirrors scoreMemoryRecord's blobs.
export function matchedTokens(rec, queryTokens) {
  if (!rec || !Array.isArray(queryTokens) || queryTokens.length === 0) return [];
  const blob = [
    rec.name, rec.fileName, rec.description, rec.opening, rec.namespace,
    Array.isArray(rec.aliases) ? rec.aliases.join(" ") : "",
  ].filter((s) => typeof s === "string").join(" ").toLowerCase();
  const out = [];
  for (const tok of queryTokens) {
    if (blob.indexOf(tok) !== -1) out.push(tok);
  }
  return out;
}

export function enumerateMemoryFiles({
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  readdirImpl = readdirSync,
  existsImpl = existsSync,
} = {}) {
  const out = [];
  for (const ns of namespaces) {
    const dir = join(vaultRoot, ns);
    if (!existsImpl(dir)) continue;
    let names;
    try { names = readdirImpl(dir); } catch { continue; }
    for (const f of names) {
      if (!/\.md$/i.test(f)) continue;
      if (f === "MEMORY.md" || f === "MEMORY-ARCHIVE.md") continue;
      out.push({ namespace: ns, fileName: f, fullPath: join(dir, f) });
    }
  }
  return out;
}

export function tryLoadMemorySidecar({
  sidecarPath = DEFAULT_SIDECAR_PATH,
  vaultRoot = DEFAULT_VAULT_ROOT,
  namespaces = DEFAULT_NAMESPACES,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
} = {}) {
  if (process.env.PRISM_MEMORY_INDEX_SIDECAR_DISABLE === "1") return null;
  if (!existsImpl(sidecarPath)) return null;

  const rejected = (reason) => {
    try {
      process.stderr.write(
        `[memory-index-search-lib] sidecar present but ${reason} — using live scan; `
        + "rerun build-memory-index-sidecar.mjs\n",
      );
    } catch { /* stderr unavailable — non-fatal */ }
    return null;
  };

  let sc;
  try { sc = JSON.parse(readFileImpl(sidecarPath, "utf8")); }
  catch { return rejected("unparseable"); }
  if (!sc || sc.schemaVersion !== SIDECAR_SCHEMA_VERSION) return rejected("schema mismatch");
  if (!Array.isArray(sc.records)) return rejected("malformed");
  if (!Number.isFinite(Number(sc.sourceMtimeMs))) return rejected("missing sourceMtimeMs");

  let youngestMtime = 0;
  for (const ns of namespaces) {
    const dir = join(vaultRoot, ns);
    if (!existsImpl(dir)) continue;
    try {
      const st = statImpl(dir);
      if (st.mtimeMs > youngestMtime) youngestMtime = st.mtimeMs;
    } catch { /* per-namespace fail-soft */ }
  }
  if (youngestMtime > 0 && Number(sc.sourceMtimeMs) < youngestMtime) {
    // GRACEFUL DEGRADATION (U-OBF, 2026-05-29 slot:alpha): a STALE sidecar is
    // missing only the handful of memories added since the last regen — vastly
    // better than discarding it to a live-scan over the 11k+-file / 20.9MB vault
    // that exceeds the UserPromptSubmit hook timeout. That discard was the
    // production no-fire bug (memory-index-precheck fired 0x vs siblings 50-154x;
    // see [[reference_alpha_memory_index_nofire_2026_05_29]]). USE the stale
    // index; the Stop-triggered regen refreshes it. Live-scan stays reserved for
    // genuine corruption (the rejected() branches above: unparseable / schema /
    // malformed / missing sourceMtimeMs).
    try {
      process.stderr.write(
        "[memory-index-search-lib] sidecar stale — using anyway (regen refreshes; "
        + "live-scan reserved for corruption)\n",
      );
    } catch { /* stderr unavailable — non-fatal */ }
  }

  return sc.records;
}

// ============================================================================
// A6 — Hybrid BM25 + dense (nomic-embed-text) retrieval with Reciprocal Rank
// Fusion. The Obsidian brain "captures but does not compound"; closing the
// recall gap is the highest-ROI lever (Anthropic Contextual Retrieval reports
// ~35-49% fewer failed retrievals from hybrid + RRF). Design constraints that
// shaped every choice below:
//   1. runMemoryIndexSearch is called SYNCHRONOUSLY by memory-index-precheck-
//      inject.mjs, a hook in .claude/hooks/ that is cross-worktree-write-locked
//      (fleet safety) — its call site CANNOT change. So hybrid must live inside
//      this function, stay synchronous, and return the identical {tokens,hits}
//      shape. The query embedding is therefore fetched via a synchronous curl
//      subprocess (the pattern CLAUDE.md mandates for ollama under contention),
//      NOT async fetch.
//   2. STRICTLY ADDITIVE + FAIL-SAFE. Absent embeddings sidecar, unreachable
//      ollama, query-embed timeout, or corrupt data → every path degrades to
//      the pre-existing BM25-only result byte-identically.
//   3. SELF-ACTIVATING. Hybrid turns on the instant build-memory-embeddings-
//      sidecar.mjs lands the sidecar (mirrors the BM25-sidecar presence gate).
//   4. 5 s HOOK BUDGET. The query-embed has a hard ~2.5 s curl cap; a file
//      circuit-breaker skips the network entirely for 2 min after any failure,
//      so a persistently-dead ollama adds ZERO latency to fleet prompts.
// See [[reference_alpha_obsidian_brain_improvement_research_2026_05_29]] A6.
// ============================================================================
export const EMBEDDINGS_SIDECAR_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_EMBEDDINGS_SIDECAR_PATH = "H:/prism/state/shared/memory-embeddings-sidecar.json";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";
// nomic-embed-text output dim == the prism_memories Qdrant collection dim. Used to
// dim-guard the Qdrant ANN arm symmetrically with the scan arm's emb.dim guard, so a
// model swap degrades to BM25 instead of POSTing a wrong-dim vector to Qdrant. Must
// move in lockstep with any collection reseed at a different dimension.
const EMBED_DIM = 768;
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
// Pin nomic-embed-text resident for 30m on every recall embed so this hot-path keeps
// its OWN model warm (and recently-used, so it is not the LRU evict victim when the
// fleet crowds OLLAMA_MAX_LOADED_MODELS with big models). 30m matches the established
// fleet policy (commit cebde4fd9 -- never "-1", which pins large models forever and
// trips the host-commit memory-pressure gate). Complements scripts/ollama-embed-keepalive.mjs
// (the proactive 4-min cold-recovery keeper the latency-capped recall path can't do itself).
const RECALL_EMBED_KEEP_ALIVE = "30m";
// 2.5 s curl cap: covers a COLD nomic-embed-text load (~1-2 s) — the real-data
// E2E proved a 1.5 s cap missed cold starts → BM25 fallback every model-idle
// gap. 2.5 s + 0.5 s exec backstop + ~0.3 s BM25 stays well inside the 5 s hook.
const DEFAULT_EMBED_TIMEOUT_MS = 2500;
const DEFAULT_DENSE_CANDIDATES = 50;       // dense top-N fed into RRF
const DEFAULT_RRF_K = 60;                  // standard RRF constant (Cormack et al. 2009)
const EMBED_CIRCUIT_PATH = "H:/prism/state/shared/.memory-embed-circuit.json";
const EMBED_CIRCUIT_COOLDOWN_MS = 120_000; // skip dense for 2 min after a failure

// Stable identity for a memory record across the BM25 and embeddings sidecars.
export function recordKey(rec) {
  if (!rec || typeof rec !== "object") return "";
  return `${rec.namespace || "uncategorized"}/${rec.name || rec.fileName || ""}`;
}

// nomic-embed-text task prefixes ("search_document:" / "search_query:") are a
// documented requirement of the model — omitting them measurably degrades
// retrieval. The document text mirrors the fields BM25 scores (name/desc/body).
export function buildEmbedDocText(rec) {
  if (!rec || typeof rec !== "object") return "search_document: ";
  const parts = [rec.name, rec.description, rec.opening].filter((s) => typeof s === "string" && s.length);
  return "search_document: " + parts.join(". ");
}
export function buildEmbedQueryText(query) {
  return "search_query: " + (typeof query === "string" ? query : "");
}

// int8 quantization is direction-preserving; cosine similarity is scale-
// invariant, so the per-vector quant scale cancels and we persist ONLY the
// int8 bytes (base64) + the int8 vector's L2 norm. ~8 MB for 10.9k×768-d
// vectors vs ~67 MB float32-as-JSON — a 5 s-budget-relevant difference.
export function packInt8(vec) {
  if (!Array.isArray(vec) && !ArrayBuffer.isView(vec)) return null;
  if (vec.length === 0) return null;
  let maxAbs = 0;
  for (let i = 0; i < vec.length; i++) { const a = Math.abs(vec[i]); if (a > maxAbs) maxAbs = a; }
  const scale = maxAbs > 0 ? 127 / maxAbs : 0;
  const q = new Int8Array(vec.length);
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    let v = Math.round(vec[i] * scale);
    if (v > 127) v = 127; else if (v < -127) v = -127;
    q[i] = v;
    sumSq += v * v;
  }
  const b64 = Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString("base64");
  return { b64, norm: Math.sqrt(sumSq), dim: vec.length };
}
export function unpackInt8(b64) {
  if (typeof b64 !== "string" || b64.length === 0) return null;
  let buf;
  try { buf = Buffer.from(b64, "base64"); } catch { return null; }
  if (buf.byteLength === 0) return null;
  // MUST pass byteOffset+byteLength: node Buffers are views into a SHARED pool,
  // so `new Int8Array(buf.buffer)` alone would alias neighbouring allocations.
  return new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
export function l2norm(vec) {
  if (!vec) return 0;
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  return Math.sqrt(s);
}
// cosine(queryFloat, docInt8). Pass precomputed norms to avoid recomputation.
export function cosineSimInt8(queryVec, int8arr, int8norm, queryNorm) {
  if (!queryVec || !int8arr || !(int8norm > 0) || !(queryNorm > 0)) return 0;
  const n = Math.min(queryVec.length, int8arr.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += queryVec[i] * int8arr[i];
  return dot / (queryNorm * int8norm);
}

// Reciprocal Rank Fusion (Cormack et al. 2009). Each input is an ordered key
// array (index 0 = best). score(key) = Σ 1/(k + rank + 1) over the lists it
// appears in. A key absent from a list contributes nothing from that list,
// which is exactly how a dense-only (BM25-miss) hit still surfaces. Pure.
export function reciprocalRankFusion(rankings, { k = DEFAULT_RRF_K } = {}) {
  const scores = new Map();
  if (!Array.isArray(rankings)) return [];
  for (const ranking of rankings) {
    if (!Array.isArray(ranking)) continue;
    for (let rank = 0; rank < ranking.length; rank++) {
      const key = ranking[rank];
      if (typeof key !== "string" || key.length === 0) continue;
      scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1));
    }
  }
  return [...scores.entries()]
    .map(([key, rrf]) => ({ key, rrf }))
    .sort((a, b) => b.rrf - a.rrf || a.key.localeCompare(b.key));
}

// Rank all embedding records by cosine to the query vector; return top-N
// {key, sim}. Records must carry a decoded `_int8` Int8Array + precomputed
// `norm`. Pure.
export function denseRankAll(embRecords, queryVec, { topN = DEFAULT_DENSE_CANDIDATES } = {}) {
  if (!Array.isArray(embRecords) || !queryVec || queryVec.length === 0) return [];
  const qNorm = l2norm(queryVec);
  if (!(qNorm > 0)) return [];
  const scored = [];
  for (const er of embRecords) {
    if (!er || typeof er !== "object" || !er._int8) continue;
    const sim = cosineSimInt8(queryVec, er._int8, er.norm, qNorm);
    if (sim <= 0) continue;
    scored.push({ key: er.key, sim });
  }
  scored.sort((a, b) => b.sim - a.sim || String(a.key).localeCompare(String(b.key)));
  return scored.slice(0, topN);
}

// == Qdrant ANN dense arm (HMEMV09) ==========================================
// denseRankAll re-loads + re-decodes the 21.9 MB embeddings sidecar (17,032 x
// 768-d int8) on EVERY prompt -- and this lib fires from memory-index-precheck-
// inject across all 26 fleet slots. Qdrant holds the SAME vectors in an HNSW
// index (collection prism_memories, dim 768, Cosine; seeded by
// scripts/populate-qdrant-memories.mjs). denseRankViaQdrant asks Qdrant for the
// top-N nearest neighbours of the query vector -- O(log N) ANN, no sidecar load
// -- and returns the SAME {key, sim} shape denseRankAll returns, so the RRF fuse
// + byKey hydrate downstream is arm-agnostic. The producer stored
// payload.node_id = recordKey() (namespace/name), so the keys line up with the
// BM25 byKey map with zero remapping.
//
// FAIL-SOFT CONTRACT: returns null on ANY failure (Qdrant down / curl error /
// non-200 / Qdrant error body / empty result / parse error / bad input). null
// tells tryHybridFuse to fall back to the in-process linear scan, so recall NEVER
// breaks when Qdrant is unavailable. Curl is injectable (execImpl) for hermetic
// tests; uses curl (not fetch) for the same parallel-localhost-contention reason
// embedQueryViaOllamaSync does.
export const DEFAULT_QDRANT_URL = "http://127.0.0.1:6333";
export const DEFAULT_QDRANT_COLLECTION = "prism_memories";
const DEFAULT_QDRANT_TIMEOUT_MS = 1500;

export function denseRankViaQdrant(queryVec, {
  url = DEFAULT_QDRANT_URL,
  collection = DEFAULT_QDRANT_COLLECTION,
  topN = DEFAULT_DENSE_CANDIDATES,
  timeoutMs = DEFAULT_QDRANT_TIMEOUT_MS,
  execImpl = execFileSync,
} = {}) {
  if (!Array.isArray(queryVec) || queryVec.length === 0) return null;
  const body = JSON.stringify({ vector: queryVec, limit: topN, with_payload: true });
  // curl --max-time is integer seconds; the exec timeout is strictly larger so it
  // genuinely backstops a wedged curl (mirrors embedQueryViaOllamaSync's margin).
  const curlMaxSec = Math.max(1, Math.ceil(timeoutMs / 1000));
  let out;
  try {
    out = execImpl("curl", [
      "-s", "--max-time", String(curlMaxSec),
      "-X", "POST",
      `${url}/collections/${collection}/points/search`,
      "-H", "Content-Type: application/json",
      "-d", body,
    ], { timeout: curlMaxSec * 1000 + 500, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  } catch { return null; }
  if (!out) return null;
  let j;
  try { j = JSON.parse(out); } catch { return null; }
  // Qdrant success shape: {result:[{id,score,payload:{node_id}}], status:"ok"}.
  // An error returns {status:{error:...}} with NO result array -> null -> fallback.
  const result = j && Array.isArray(j.result) ? j.result : null;
  if (!result) return null;
  const scored = [];
  const seen = new Set();   // one key per record, matching denseRankAll's invariant
  for (const p of result) {
    if (!p || typeof p !== "object") continue;
    const key = p.payload && typeof p.payload.node_id === "string" ? p.payload.node_id : null;
    if (!key || seen.has(key)) continue;                 // unseeded/garbage OR dup point -> skip
    seen.add(key);
    const sim = typeof p.score === "number" ? p.score : 0;
    scored.push({ key, sim });
  }
  // Qdrant already returns descending-score order; preserve it (no re-sort).
  return scored.length ? scored : null;
}

// Load + decode the embeddings sidecar. Graceful staleness like the BM25 sidecar (a stale
// embeddings file just misses recently-added memories — far better than discarding it). Returns
// {dim, model, records:[{key,name,fileName,namespace,_int8,norm}]} or null on absent/corrupt/empty.
export function tryLoadEmbeddingsSidecar({
  sidecarPath = DEFAULT_EMBEDDINGS_SIDECAR_PATH,
  bm25SidecarPath = DEFAULT_SIDECAR_PATH,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
} = {}) {
  if (process.env.PRISM_MEMORY_HYBRID_DISABLE === "1") return null;
  if (!existsImpl(sidecarPath)) return null;
  let sc;
  try { sc = JSON.parse(readFileImpl(sidecarPath, "utf8")); } catch { return null; }
  if (!sc || sc.schemaVersion !== EMBEDDINGS_SIDECAR_SCHEMA_VERSION) return null;
  if (!Array.isArray(sc.records)) return null;
  // rank-21 staleness gate (corrected 2026-05-30 after a real-data false positive): the meaningful
  // drift is "the DENSE arm lags the BM25 arm" — the BM25 index rebuilt from a newer corpus than the
  // embeddings, so recently-INDEXED memories are BM25-reachable but dense-unreachable. Detected by
  // FILE mtime: embeddings sidecar older than the BM25 index sidecar. (The first cut compared
  // sc.sourceMtimeMs vs the vault's youngest namespace-DIR mtime — hypersensitive: ANY vault touch by
  // the busy fleet bumps the dir mtime, so it fired 47 s after a fully in-sync rebuild → cry-wolf.
  // File-mtime is cheap [2 stats], precise [tracks BM25-vs-dense build order], and never false-fires
  // on unrelated vault writes.) Graceful: advise, USE the sidecar anyway. Absent BM25 sidecar or any
  // stat failure → skip (no false alarm).
  try {
    if (existsImpl(bm25SidecarPath)) {
      const embMtime = statImpl(sidecarPath)?.mtimeMs;
      const bm25Mtime = statImpl(bm25SidecarPath)?.mtimeMs;
      if (Number.isFinite(embMtime) && Number.isFinite(bm25Mtime) && embMtime < bm25Mtime) {
        try {
          process.stderr.write(
            "[memory-index-search-lib] embeddings sidecar older than the BM25 index — dense recall arm "
            + "may miss recently-indexed memories until re-embed (build-memory-embeddings-sidecar.mjs "
            + "--resume). Using anyway.\n",
          );
        } catch { /* stderr unavailable — non-fatal */ }
      }
    }
  } catch { /* stat failure → no staleness signal, fail-safe */ }
  const records = [];
  for (const r of sc.records) {
    if (!r || typeof r !== "object") continue;
    const int8 = unpackInt8(r.vec);
    if (!int8) continue;
    records.push({
      // P1 (scrutiny): derive the fallback key via recordKey() — NOT a local
      // `${ns}/${name}` literal — so it is byte-identical to the BM25-side key
      // (recordKey falls back to name||fileName). A divergent fallback would
      // silently orphan dense records under record-shape drift.
      key: r.key || recordKey(r),
      name: r.name, fileName: r.fileName, namespace: r.namespace,
      _int8: int8, norm: Number(r.norm) || 0,
    });
  }
  if (records.length === 0) return null;
  return { dim: sc.dim, model: sc.model, records };
}

// The ONE impure primitive: embed the query through ollama, SYNCHRONOUSLY, via
// a curl subprocess (node fetch is unreliable under parallel-localhost
// contention per CLAUDE.md; sync keeps runMemoryIndexSearch sync for the hook).
// Returns a Float32-ish number[] or null on any failure. Injectable for tests.
export function embedQueryViaOllamaSync(query, {
  url = DEFAULT_OLLAMA_URL,
  model = DEFAULT_EMBED_MODEL,
  timeoutMs = DEFAULT_EMBED_TIMEOUT_MS,
  execImpl = execFileSync,
} = {}) {
  const payload = JSON.stringify({ model, prompt: buildEmbedQueryText(query), keep_alive: RECALL_EMBED_KEEP_ALIVE });
  // curl --max-time is integer seconds; the execImpl timeout must be STRICTLY
  // larger so it genuinely backstops a wedged curl (SIGKILL) rather than firing
  // simultaneously (P1-2 scrutiny: a 500 ms margin over curl's own cap).
  const curlMaxSec = Math.max(1, Math.ceil(timeoutMs / 1000));
  try {
    const out = execImpl("curl", [
      "-s", "--max-time", String(curlMaxSec),
      `${url}/api/embeddings`,
      "-H", "Content-Type: application/json",
      "-d", payload,
    ], { timeout: curlMaxSec * 1000 + 500, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (!out) return null;
    const j = JSON.parse(out);
    const emb = j && Array.isArray(j.embedding) ? j.embedding : null;
    return emb && emb.length ? emb : null;
  } catch { return null; }
}

function embedCircuitTripped(readFileImpl, existsImpl, now) {
  try {
    if (!existsImpl(EMBED_CIRCUIT_PATH)) return false;
    const j = JSON.parse(readFileImpl(EMBED_CIRCUIT_PATH, "utf8"));
    const last = Number(j && j.lastFailureMs);
    if (!Number.isFinite(last)) return false;
    return (now - last) < EMBED_CIRCUIT_COOLDOWN_MS;
  } catch { return false; }
}
function tripEmbedCircuit(writeFileImpl, now) {
  try { writeFileImpl(EMBED_CIRCUIT_PATH, JSON.stringify({ lastFailureMs: now }), "utf8"); } catch { /* fail-soft */ }
}
function clearEmbedCircuit(existsImpl, unlinkImpl) {
  try { if (existsImpl(EMBED_CIRCUIT_PATH)) unlinkImpl(EMBED_CIRCUIT_PATH); } catch { /* fail-soft */ }
}

// Attempt the dense rerank + RRF fuse. Returns a fused ranked record list
// (each {...rec, score:rrf}) or null to signal "stay BM25-only". Every guard
// below is a fail-safe degradation point, in cost order (cheapest gate first).
export function tryHybridFuse({ query, bm25Ranked, byKey, opts = {} }) {
  if (opts.hybrid === false) return null;
  if (process.env.PRISM_MEMORY_HYBRID_DISABLE === "1") return null;

  const existsImpl = opts.existsImpl ?? existsSync;
  const readFileImpl = opts.readFileImpl ?? readFileSync;
  const writeFileImpl = opts.writeFileImpl ?? writeFileSync;
  const unlinkImpl = opts.unlinkImpl ?? unlinkSync;
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();

  // HMEMV09: dense candidates come from the Qdrant HNSW index (prism_memories)
  // when available -- O(log N) ANN, no 21.9 MB sidecar load per prompt -- and fall
  // back to the in-process linear scan over the sidecar when Qdrant is down. Both
  // arms return the SAME {key,sim} shape, so the RRF fuse + hydrate below is
  // arm-agnostic. Revert instantly with PRISM_MEMORY_QDRANT_DISABLE=1.
  const embSidecarPath = opts.embeddingsSidecarPath ?? DEFAULT_EMBEDDINGS_SIDECAR_PATH;
  const qdrantEnabled = opts.qdrant !== false && process.env.PRISM_MEMORY_QDRANT_DISABLE !== "1";
  const sidecarPresent = existsImpl(embSidecarPath);
  // No dense source at all -> today's BM25-only behavior (no embed cost).
  if (!qdrantEnabled && !sidecarPresent) return null;

  if (embedCircuitTripped(readFileImpl, existsImpl, now)) return null; // ollama recently dead -> skip network

  const embedImpl = opts.embedQueryImpl ?? embedQueryViaOllamaSync;
  const qvec = embedImpl(query, {
    url: opts.ollamaUrl, model: opts.embedModel,
    timeoutMs: opts.embedTimeoutMs ?? DEFAULT_EMBED_TIMEOUT_MS,
  });
  if (!qvec || qvec.length === 0) { tripEmbedCircuit(writeFileImpl, now); return null; }
  clearEmbedCircuit(existsImpl, unlinkImpl);                       // success -> close the breaker

  // Dense arm 1 -- Qdrant ANN (no sidecar load). null on ANY failure -> scan fallback.
  // Dim-guard symmetrically with the scan arm: a wrong-dim query (model swap) skips
  // Qdrant entirely and falls to the scan arm, which guards on emb.dim -- so we never
  // POST a garbage-dim vector to the 768-d collection. embedDim is injectable for tests.
  const embedDim = Number.isFinite(opts.embedDim) ? opts.embedDim : EMBED_DIM;
  let dense = null;
  let denseArm = null;   // HMEMV02: which arm produced the dense candidates ("qdrant"|"scan")
  if (qdrantEnabled && qvec.length === embedDim) {
    const qdrantImpl = opts.denseRankViaQdrantImpl ?? denseRankViaQdrant;
    dense = qdrantImpl(qvec, {
      url: opts.qdrantUrl, collection: opts.qdrantCollection,
      topN: opts.denseCandidates ?? DEFAULT_DENSE_CANDIDATES,
      timeoutMs: opts.qdrantTimeoutMs, execImpl: opts.qdrantSearchImpl,
    });
    if (dense) denseArm = "qdrant";
  }

  // Dense arm 2 (fallback) -- lazy-load the sidecar + linear cosine scan, ONLY when
  // Qdrant gave nothing. This is the pre-HMEMV09 behavior, preserved byte-for-byte.
  if (!dense && sidecarPresent) {
    const emb = tryLoadEmbeddingsSidecar({
      sidecarPath: embSidecarPath,
      // The staleness gate compares this dense sidecar's file mtime vs the BM25 index sidecar's --
      // thread the caller's BM25 sidecar path + statImpl so it honors a non-default vault / test harness.
      bm25SidecarPath: opts.sidecarPath ?? DEFAULT_SIDECAR_PATH,
      statImpl: opts.statImpl ?? statSync,
      readFileImpl, existsImpl,
    });
    if (emb) {
      // P1 (scrutiny): model-mismatch guard. A query embedded by a different-dim
      // model than the sidecar would make cosineSimInt8 compute a truncated dot
      // over min(len) -- a plausible-but-WRONG similarity. Degrade to BM25 rather
      // than rank on garbage.
      if (!(emb.dim && qvec.length !== emb.dim)) {
        dense = denseRankAll(emb.records, qvec, { topN: opts.denseCandidates ?? DEFAULT_DENSE_CANDIDATES });
        if (dense) denseArm = "scan";
      }
    }
  }
  if (!dense || dense.length === 0) return null;

  const bm25Arr = Array.isArray(bm25Ranked) ? bm25Ranked : [];
  const bm25Keys = bm25Arr.map(recordKey);
  const denseKeys = dense.map((d) => d.key);
  const fusedRanked = reciprocalRankFusion([bm25Keys, denseKeys], { k: opts.rrfK ?? DEFAULT_RRF_K });

  // HMEMV02 explainable retrieval: per-key BM25 score+rank and dense sim+rank, so each
  // hydrated hit can report WHY it surfaced (which arm, what cosine, what BM25 component).
  const bm25ByKey = new Map();
  bm25Arr.forEach((r, i) => bm25ByKey.set(recordKey(r), { score: r.score, rank: i }));
  const denseByKey = new Map();
  dense.forEach((d, i) => denseByKey.set(d.key, { sim: d.sim, rank: i }));

  // Hydrate fused keys back to full records via the BM25 sidecar map (which
  // covers ALL records, so a dense-only/BM25-miss hit still hydrates).
  const out = [];
  for (const { key, rrf } of fusedRanked) {
    const rec = byKey.get(key);
    if (!rec) continue;
    const d = denseByKey.get(key);
    const b = bm25ByKey.get(key);
    out.push({
      ...rec,
      score: rrf,
      _explain: {
        rrf,
        denseArm: d ? denseArm : null,
        denseSim: d ? d.sim : null,
        denseRank: d ? d.rank : null,
        bm25Score: b ? b.score : null,
        bm25Rank: b ? b.rank : null,
      },
    });
  }
  return out.length ? out : null;
}

export function runMemoryIndexSearch(query, opts = {}) {
  const tokens = tokenize(query, opts);
  if (tokens.length < 1) return { tokens, hits: [] };

  const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
  const namespaces = opts.namespaces ?? DEFAULT_NAMESPACES;
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const maxTotalBytes = opts.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const sidecarPath = opts.sidecarPath ?? DEFAULT_SIDECAR_PATH;
  const readdirImpl = opts.readdirImpl ?? readdirSync;
  const readFileImpl = opts.readFileImpl ?? readFileSync;
  const statImpl = opts.statImpl ?? statSync;
  const existsImpl = opts.existsImpl ?? existsSync;
  // MEMORY-RECALL-SUPERSEDE: keep the live-scan fallback consistent with the
  // sidecar build (which already drops superseded memories). The sidecar path
  // needs no filter — a rebuilt sidecar simply won't contain them.
  const excludeSuperseded = opts.excludeSuperseded ?? supersededExclusionEnabled();
  // MEMORY-RECALL-NODE-POINTER-EXCLUDE: drop auto-generated node_* pointer stubs
  // (72% of the corpus) from recall. Applied to BOTH the sidecar and live paths so
  // exclusion is independent of when the sidecar was last rebuilt. excludeNodePointers
  // false → byte-identical legacy behavior (knob PRISM_RECALL_INCLUDE_NODE_POINTERS=1).
  const excludeNodePointers = opts.excludeNodePointers ?? nodePointerExclusionEnabled();
  // MEMORY-RECALL-DOMAIN-BOOST: opt-in additive boost for the working slot's own
  // galaxy brain. null (default) → no boost → byte-identical legacy behavior.
  const boostDomain = opts.boostDomain ?? null;
  const boostWeight = Number.isFinite(opts.boostWeight) ? opts.boostWeight : DEFAULT_DOMAIN_BOOST;

  const sidecarRecords = tryLoadMemorySidecar({
    sidecarPath, vaultRoot, namespaces, readFileImpl, statImpl, existsImpl,
  });
  const toHit = (s) => {
    const ex = s._explain || null;
    return {
      name: s.name,
      fileName: s.fileName,
      namespace: s.namespace,
      score: s.score,
      description: s.description || "",
      opening: (s.opening || "").slice(0, 200),
      // HMEMV02 explainable retrieval: WHY this surfaced. For the BM25-only paths
      // (sidecar/live) there is no _explain and s.score IS the BM25 score.
      explanation: {
        matchedTokens: matchedTokens(s, tokens),
        corpus: s.namespace,
        denseArm: ex ? ex.denseArm : null,
        denseSim: ex ? ex.denseSim : null,
        bm25Score: ex ? ex.bm25Score : s.score,
        rrf: ex ? ex.rrf : null,
      },
    };
  };

  if (Array.isArray(sidecarRecords)) {
    const scoredSc = [];
    const byKey = new Map();
    for (const rec of sidecarRecords) {
      if (!rec || typeof rec !== "object") continue;
      if (excludeNodePointers && isNodePointerStub(rec.fileName)) continue; // node_* pointer stub — not a memo
      byKey.set(recordKey(rec), rec);          // ALL records (hybrid hydrates BM25-miss hits)
      const base = scoreMemoryRecord(rec, tokens);
      if (base <= 0) continue;                 // relevance-gate BEFORE the domain boost
      scoredSc.push({ ...rec, score: base + domainBoost(rec, boostDomain, boostWeight) });
    }
    scoredSc.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    // A6 -- fuse dense cosine via RRF when the Qdrant index / embeddings sidecar +
    // ollama are available; null -> byte-identical BM25-only fallback below. Wrapped
    // defensively (HMEMV09 hardening, per-file scrutiny P1): the fuse is fail-soft by
    // contract, so ANY unexpected throw from the dense arms must degrade to BM25-only
    // rather than propagate to the synchronous UserPromptSubmit hook.
    let fused = null;
    try { fused = tryHybridFuse({ query, bm25Ranked: scoredSc, byKey, opts }); }
    catch { fused = null; }
    if (fused) {
      return { tokens, hits: fused.slice(0, topK).map(toHit), source: "hybrid" };
    }

    return { tokens, hits: scoredSc.slice(0, topK).map(toHit), source: "sidecar" };
  }

  const files = enumerateMemoryFiles({ vaultRoot, namespaces, readdirImpl, existsImpl });
  if (files.length === 0) return { tokens, hits: [], source: "live" };

  const scored = [];
  let bytesRead = 0;

  for (const f of files) {
    if (bytesRead > maxTotalBytes) break;
    if (excludeNodePointers && isNodePointerStub(f.fileName)) continue; // skip BEFORE stat+read (9.5k stubs → I/O win)
    let size = 0;
    try { size = statImpl(f.fullPath).size; } catch { continue; }
    if (size <= 0) continue;
    let body;
    try { body = readFileImpl(f.fullPath, "utf8"); } catch { continue; }
    bytesRead += Math.min(body.length, maxBodyBytes + 512);
    if (excludeSuperseded && isSupersededMemory(body)) continue;
    const rec = buildMemoryRecord({ namespace: f.namespace, fileName: f.fileName, body, maxBodyBytes });
    if (!rec) continue;
    const base = scoreMemoryRecord(rec, tokens);
    if (base <= 0) continue;                   // relevance-gate BEFORE the domain boost
    scored.push({ ...rec, score: base + domainBoost(rec, boostDomain, boostWeight) });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  // Route the live-scan path through the same toHit so it carries the HMEMV02
  // explanation (BM25-only: denseArm null, bm25Score = the score) like the sidecar path.
  const hits = scored.slice(0, topK).map(toHit);

  return { tokens, hits, source: "live" };
}

export const __test_constants = {
  DEFAULT_TOP_K,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_TOTAL_BYTES,
  MIN_TOKEN_LEN,
  MAX_QUERY_TOKENS,
  W_NAME,
  W_DESC,
  W_BODY,
  W_TYPE,
  W_ALIAS,
  SIDECAR_SCHEMA_VERSION,
  DEFAULT_SIDECAR_PATH,
};
