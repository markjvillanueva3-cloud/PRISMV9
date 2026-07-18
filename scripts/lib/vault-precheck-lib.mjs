// scripts/lib/vault-precheck-lib.mjs
// SUBSTRATE-UTIL Gap 8 slice-a (2026-06-29, slot:sierra) -- shared single-source for the
// obsidian-vault-precheck hook AND its body-excerpt sidecar generator.
//
// WHY: obsidian-vault-precheck-inject.mjs scored FILENAMES only -> a prompt whose terms live in
// a file BODY but not its name missed (e.g. "Okuma OSP threading" misses gsd/DEV_PROTOCOL.md).
// Reading every file body per-prompt is too slow, so we mirror the proven memory-index-sidecar
// pattern: a generator pre-extracts {basename, first-250-char excerpt} per file into a sidecar;
// the hook scores basename (strong) + excerpt (weak, body recall) from it, and falls back to a
// live basename-only walk when the sidecar is absent (fail-soft -- never worse than today).
//
// SINGLE-SOURCE: SCAN_DIRS + tokenizer + listFiles live HERE so the hook and the generator can
// never drift (the hook used to carry them inline; slice-b just fixed 3 dead dirs -- a duplicate
// copy in the generator would silently re-introduce drift, R8).
// Pure + fail-soft throughout (R12): a missing/unreadable file or sidecar yields "" / [] / null.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

export const ROOT = "H:/prism/knowledge";
export const REPO_ROOT = "H:/prism";
export const SIDECAR_PATH = "H:/prism/state/shared/vault-precheck-sidecar.json";
export const BUILDER_SCRIPT = "H:/prism/scripts/build-vault-precheck-sidecar.mjs";
export const REGEN_STAMP_PATH = "H:/prism/state/shared/.vault-precheck-regen-stamp";
export const REGEN_THROTTLE_MS = 60 * 60 * 1000; // >=1 regen/hour, mirrors memory-index-sidecar-regen
export const SCHEMA_VERSION = 1;
export const MAX_FILES_PER_DIR = 1000; // raised for state/shared/specs (925 files); per-dir cap. Cost is bounded by the PRE-BUILT sidecar (per-prompt = score N entries, no live walk), not this cap.
export const MAX_TOKEN_LEN = 64;
export const MIN_TOKEN_LEN = 3;
export const EXCERPT_CHARS = 250;
export const MIN_SCORE = 2;
export const TOPK = 3;
export const BODY_SCORE_CAP = 3; // cap an excerpt's total contribution so a long body cannot dominate

// Existing, content-bearing dirs under knowledge/ NOT covered by master-index/tribal.
// Verified present 2026-06-29 (slice-b). KEEP IN SYNC here only -- the hook imports this.
export const SCAN_DIRS = [
  "claude-md", "code-index", "data-index", "decisions",
  "errors", "gsd", "lint-reports", "Materials",
  "sessions", "roadmap", "observations", "jm-corpus", "h-drive-atlas", "hermes-brain",
];

// Multi-root scan targets (SUBSTRATE-UTIL Gap 8 cross-root, 2026-06-29 slot:sierra): the
// knowledge/ dirs PLUS state/shared/specs (925 design/audit/roadmap specs that NO other precheck
// covers -- master-index covers wiki+memories+graph, not specs). Entry relPaths are REPO-relative
// (relative to REPO_ROOT) so a single link field resolves across BOTH roots.
export const SPECS_ROOT = "H:/prism/state/shared";
export const SCAN_TARGETS = [
  { root: ROOT, buckets: SCAN_DIRS },
  { root: SPECS_ROOT, buckets: ["specs"] },
];

// Ultra-common English/dev stopwords that match everything (moved verbatim from the hook).
const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "you", "what", "when", "how", "does",
  "into", "over", "via", "but", "not", "are", "was", "were", "has", "have", "been", "will",
  "can", "may", "its", "using", "use", "get", "set", "new", "need", "want", "add", "fix",
  "work", "make", "run", "just",
]);

/** Tokenize a string the same way the hook always did (lowercase, alnum/_-split, 3..64, stopword-dropped). */
export function tokenize(str) {
  if (!str) return [];
  return String(str).toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && t.length <= MAX_TOKEN_LEN)
    .filter((t) => !STOPWORDS.has(t));
}

/** List the .md/.json/.txt files in a dir (capped). Fail-soft: missing/unreadable dir -> []. */
export function listFiles(dir, { existsImpl = existsSync, readdirImpl } = {}) {
  if (!existsImpl(dir)) return [];
  const rd = readdirImpl || ((p) => readdirSync(p, { withFileTypes: true }));
  try {
    return rd(dir)
      .filter((e) => e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".json") || e.name.endsWith(".txt")))
      .slice(0, MAX_FILES_PER_DIR)
      .map((e) => path.join(dir, e.name));
  } catch { return []; }
}

/** Strip a leading YAML frontmatter block, collapse whitespace, return the first `cap` chars. */
export function extractExcerpt(text, cap = EXCERPT_CHARS) {
  const n = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : EXCERPT_CHARS;
  return String(text == null ? "" : text)
    .replace(/^﻿?---[\s\S]*?\n---\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

/**
 * Walk SCAN_DIRS, extract {relPath, bucket, basename, excerpt} per file, and track the youngest
 * file mtime (the sidecar freshness stamp, mirroring memory-index-sidecar.sourceMtimeMs).
 * Injectable fs impls keep it unit-testable.
 */
export function buildEntries({
  targets = SCAN_TARGETS,
  repoRoot = REPO_ROOT,
  readFileImpl = (p) => readFileSync(p, "utf8"),
  statImpl = (p) => statSync(p),
  listImpl = listFiles,
  existsImpl = existsSync,
  readdirImpl,
} = {}) {
  const entries = [];
  let youngestMtimeMs = 0;
  for (const t of targets) {
    for (const bucket of t.buckets) {
      const dir = path.join(t.root, bucket);
      for (const file of listImpl(dir, { existsImpl, readdirImpl })) {
        let excerpt = "";
        try { excerpt = extractExcerpt(readFileImpl(file)); } catch { /* fail-soft per file */ }
        try { const m = statImpl(file).mtimeMs; if (m > youngestMtimeMs) youngestMtimeMs = m; } catch { /* ignore */ }
        entries.push({
          // REPO-relative so one link field resolves across knowledge/ AND state/shared/specs.
          relPath: path.relative(repoRoot, file).split(/[\\/]+/).join("/"),
          bucket,
          basename: path.basename(file, path.extname(file)).toLowerCase(),
          excerpt,
        });
      }
    }
  }
  return { entries, youngestMtimeMs };
}

/**
 * Score one entry against query tokens. Basename is the STRONG signal (exact +2, prefix +1 --
 * the hook's original semantics); the body excerpt is a WEAKER signal (exact-token +1, NOT
 * double-counting a token already matched in the basename, capped at BODY_SCORE_CAP so a long
 * excerpt cannot dominate a filename match). An entry with no excerpt scores exactly as the
 * legacy basename-only path did -- so the live fallback is byte-identical to today.
 */
export function scoreEntry(entry, queryTokens) {
  if (!entry || typeof entry.basename !== "string" || !Array.isArray(queryTokens)) return 0;
  // Split the basename on `_` too (NOT the query's `[^a-z0-9_]+`): vault filenames are snake_case
  // (reference_okuma_cycle_dialect), so splitting on `_` makes each part individually matchable --
  // a real recall gain over the legacy `_`-joined token (which only prefix-matched the whole name).
  // Strictly >= legacy recall; query tokens are space-separated prose so the asymmetry is moot.
  const bt = entry.basename.split(/[^a-z0-9]+/).filter(Boolean);
  const bset = new Set(bt);
  let s = 0;
  for (const q of queryTokens) {
    if (bset.has(q)) s += 2;
    else if (bt.some((t) => t.startsWith(q))) s += 1;
  }
  if (entry.excerpt) {
    const et = new Set(
      String(entry.excerpt).toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length >= MIN_TOKEN_LEN),
    );
    let bodyHits = 0;
    for (const q of queryTokens) if (!bset.has(q) && et.has(q)) bodyHits += 1;
    s += Math.min(bodyHits, BODY_SCORE_CAP);
  }
  return s;
}

/**
 * Load the vault-precheck sidecar. Returns the parsed doc {schemaVersion, sourceMtimeMs, entries}
 * or null when absent / unparseable / wrong-shape. Staleness is GRACEFUL (mirrors the
 * memory-index-sidecar contract): a present-but-stale sidecar is still returned -- a newly added
 * file simply will not appear until the next regen, never a hard failure. The caller falls back
 * to a live basename walk only when this returns null.
 */
export function loadSidecar({ sidecarPath = SIDECAR_PATH, existsImpl = existsSync, readFileImpl = (p) => readFileSync(p, "utf8") } = {}) {
  if (!existsImpl(sidecarPath)) return null;
  let sc;
  try { sc = JSON.parse(readFileImpl(sidecarPath)); } catch { return null; }
  if (!sc || !Array.isArray(sc.entries)) return null;
  return sc;
}

/**
 * Pure freshness decision for the self-maintaining regen trigger (mirrors
 * memory-index-sidecar-regen): the sidecar is ABSENT -> regen; the youngest SCAN_DIRS dir mtime
 * is newer than the sidecar file -> STALE -> regen; otherwise fresh. Injectable fs impls keep it
 * unit-testable. The hook gates an actual (throttled, detached) regen spawn on this.
 * CAVEAT (same as the memory-index-sidecar-regen sibling, by design): a dir mtime bumps on
 * ADD/REMOVE of a child, not on an IN-PLACE body edit of an existing file -- so an edited (not
 * renamed) note's new body lags one regen cycle. Acceptable for an advisory precheck (graceful).
 * @returns {{regen:boolean, reason:"absent"|"stale"|"fresh"}}
 */
export function sidecarStaleness({ sidecarPath = SIDECAR_PATH, targets = SCAN_TARGETS, existsImpl = existsSync, statImpl = statSync } = {}) {
  let scMtime = 0;
  if (existsImpl(sidecarPath)) { try { scMtime = statImpl(sidecarPath).mtimeMs; } catch { /* treat as absent */ } }
  if (scMtime === 0) return { regen: true, reason: "absent" };
  let youngest = 0;
  for (const t of targets) {
    for (const bucket of t.buckets) {
      const dir = path.join(t.root, bucket);
      if (!existsImpl(dir)) continue;
      try { const m = statImpl(dir).mtimeMs; if (m > youngest) youngest = m; } catch { /* ignore */ }
    }
  }
  if (youngest > scMtime) return { regen: true, reason: "stale" };
  return { regen: false, reason: "fresh" };
}
