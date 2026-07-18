#!/usr/bin/env node
/**
 * COMBO-EFFICIENCY-MS0 / P1-U02 — Wiki↔Memory link fix suggester.
 *
 * Reads:   state/shared/.knowledge-link-audit.json (broken[] array)
 * Writes:  state/shared/wiki-link-fix-candidates.json
 *
 * For each broken `[[name]]` token, find the nearest-match wiki/memory
 * file by normalized-slug similarity, score each candidate, and emit a
 * confidence-graded JSON for operator review (auto-apply gate handled
 * by a separate apply script — this is suggester only).
 *
 * Two-stage scoring:
 *   (1) Cheap structural match — exact slug, levenshtein, prefix, contains.
 *       Catches ~70% of broken links (renames, case changes, drift).
 *   (2) Ollama semantic — only invoked when stage 1 returns 0 candidates
 *       above the cheap-confidence floor (knob-driven). Optional dependency;
 *       script works without Ollama, just emits fewer high-confidence
 *       candidates.
 *
 * Schema (output):
 *   {
 *     schemaVersion: "1.0.0",
 *     generatedAt: ISO,
 *     auditPath: str,
 *     wikiRoot: str,
 *     memRoot: str,
 *     totalBroken: number,
 *     processed: number,             // some may be skipped (batch limit)
 *     candidates: [
 *       {
 *         link: str,                  // original `[[X]]` text
 *         normalized: str,            // slug form from audit
 *         from: str,                  // source file path
 *         suggestions: [
 *           { target: str, score: number, reason: str, source: "structural"|"semantic" }
 *         ],
 *         bestScore: number,
 *         confidence: "high"|"medium"|"low"|"none",
 *         autoApplyEligible: boolean  // score >= AUTO_APPLY_FLOOR
 *       }, ...
 *     ],
 *     summary: { high: n, medium: n, low: n, none: n, autoApplyCount: n }
 *   }
 *
 * Pure exports (testable):
 *   slugify(s)
 *   levenshtein(a, b)
 *   scoreCandidate(brokenNormalized, candidateSlug)
 *   rankCandidates(broken, fileIndex, options)
 *   classifyConfidence(bestScore)
 *   buildSummary(candidates)
 *
 * I/O wrapper:
 *   suggestFixes({prismRoot, auditPath, wikiRoot, memRoot, batchLimit, outPath, write})
 *
 * CLI:
 *   node scripts/wiki-link-fix-suggester.mjs                # default paths, write all
 *   node scripts/wiki-link-fix-suggester.mjs --batch 50     # only process first 50 broken
 *   node scripts/wiki-link-fix-suggester.mjs --dry          # stdout summary only
 *   node scripts/wiki-link-fix-suggester.mjs --root <dir>
 *
 * Knobs:
 *   PRISM_WIKI_LINK_FIX_DISABLE=1            no-op CLI
 *   PRISM_WIKI_LINK_FIX_AUTO_APPLY_FLOOR=N   confidence cutoff (default 0.85)
 *   PRISM_WIKI_LINK_FIX_BATCH=N              cap on links processed per run
 *   PRISM_WIKI_LINK_FIX_OLLAMA_OFF=1         force-disable Ollama stage even if alive
 */

import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = "1.0.0";

// Confidence thresholds. AUTO_APPLY_FLOOR matches the envelope spec — fixes
// with score >= 0.85 are safe to auto-apply, below that needs operator review.
const AUTO_APPLY_FLOOR = 0.85;
const HIGH_CONFIDENCE  = 0.85;   // GREEN — safe to auto-apply
const MEDIUM_CONFIDENCE = 0.60;  // YELLOW — operator review
const LOW_CONFIDENCE = 0.30;     // FRINGE — manual triage
// Below LOW = "none" — no plausible candidate found.

// Short-token guard for the tight-Levenshtein AUTO-APPLY tier (session-gate P1).
// A 1-2 edit distance only counts as a confident typo/rename when the shorter token
// is at least this long AND the edits are a small fraction of it — otherwise it's a
// coincidental near-collision among short slugs (goal→go, echo→eco, skill→mill).
const MIN_AUTOAPPLY_LEN = 8;             // shorter token must be ≥ 8 chars
const MAX_AUTOAPPLY_EDIT_FRACTION = 0.17; // dist/minLen ≤ ~1/6 (e.g. 2 edits needs ≥12 chars)

// Default batch — protects against runaway full-corpus runs without explicit opt-in.
const DEFAULT_BATCH_LIMIT = 100;

// File-walk caps — defensive against runaway walks.
const MAX_FILES_TO_INDEX = 50_000;
const MAX_INDEX_DEPTH = 12;

// ─── Pure: slugify ─────────────────────────────────────────────────────────

/**
 * Normalize a string to slug form: lowercase, alphanumeric + dashes,
 * collapse multiple dashes. Matches the audit's `normalized` field format.
 */
export function slugify(s) {
  if (typeof s !== "string") return "";
  return s
    .toLowerCase()
    .replace(/[\s_/.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Pure: Levenshtein distance ────────────────────────────────────────────

/**
 * Classic dynamic-programming Levenshtein. Bounded by max(|a|,|b|) so safe
 * on short slug strings (typically <60 chars). Returns 0 for identical.
 */
export function levenshtein(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return Infinity;
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  // Single-row optimization (no need for full 2D matrix).
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,     // insertion
        prev[j] + 1,         // deletion
        prev[j - 1] + cost,  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

// ─── Pure: score a candidate ───────────────────────────────────────────────

/**
 * Score a candidate file's slug against a broken-link normalized slug.
 * Returns {score (0..1), reason} where higher is better.
 *
 * Scoring rules (highest wins) — RECALIBRATED 2026-06-08 (U-VAULT-LINK-HEAL):
 *   1.0        — exact slug match                       → auto-apply OK
 *   0.86-0.92  — tight Levenshtein (≤2 edits, short)    → auto-apply OK (real typo/rename)
 *   0.70       — prefix/substring relationship          → MEDIUM, operator-review ONLY
 *   0.55-0.64  — 3-edit Levenshtein (short slug)        → low
 *   0.40-0.49  — moderate Levenshtein                   → low
 *   else       — distance-decay 1 - (dist / max(len))   → none
 *
 * WHY the demotion (the bug this fixes): the prior scorer returned 0.85-0.95 for a
 * BARE prefix/substring relationship, putting 91% of ~15.8K broken links above the
 * 0.85 auto-apply floor. But "candidate contains the broken token" is a weak rename
 * signal at scale — a short token like `echo` is a substring of dozens of unrelated
 * slugs, so auto-applying that set would corrupt links wholesale. A substring/prefix
 * match is now a *medium* suggestion (surfaced for operator review) and is NEVER
 * auto-apply-eligible on its own. Only an exact slug or a tight edit-distance (≤2,
 * the signature of a genuine typo or truncated rename) clears the auto-apply floor.
 * The decay function ensures very-different strings score near 0.
 */
export function scoreCandidate(brokenNormalized, candidateSlug) {
  if (typeof brokenNormalized !== "string" || typeof candidateSlug !== "string") {
    return { score: 0, reason: "invalid-input" };
  }
  if (brokenNormalized === candidateSlug) {
    return { score: 1.0, reason: "exact-match" };
  }
  if (brokenNormalized.length === 0 || candidateSlug.length === 0) {
    return { score: 0, reason: "empty-slug" };
  }
  const dist = levenshtein(brokenNormalized, candidateSlug);
  const maxLen = Math.max(brokenNormalized.length, candidateSlug.length);
  if (dist === 0) return { score: 1.0, reason: "exact-match" }; // defensive — already handled

  // Tight edit-distance is the ONLY auto-apply-eligible non-exact signal: a 1-2
  // char difference on a SUFFICIENTLY LONG slug is the signature of a genuine typo
  // or minor rename. Gated to ≤48 chars (1-2 edits stay a small fraction).
  //
  // CRITICAL short-token guard (session-gate P1, 2026-06-08): a 1-2 edit distance on
  // a SHORT token is itself a weak signal — `goal`→`go`, `null`→`mill`, `echo`→`eco`,
  // `skill`→`mill` are all ≤2 edits but are NOT renames, they're coincidental
  // near-collisions among dozens of short slugs. Auto-applying them is the SAME
  // wholesale-corruption class the structural demotion fixed, merely shifted to the
  // edit-distance path. So the tight-edit auto-apply tier requires BOTH (a) the
  // shorter token ≥ MIN_AUTOAPPLY_LEN chars, AND (b) the edit distance ≤ ~⅙ of the
  // shorter token (a real typo perturbs a small fraction). Anything tighter-but-short
  // falls through to 0.70 medium (operator-review), never auto-apply.
  if (dist <= 2 && maxLen <= 48) {
    const minLen = Math.min(brokenNormalized.length, candidateSlug.length);
    const editFraction = dist / minLen;
    if (minLen >= MIN_AUTOAPPLY_LEN && editFraction <= MAX_AUTOAPPLY_EDIT_FRACTION) {
      // dist 1 → 0.92, dist 2 → 0.86 (both ≥ 0.85 auto-apply floor)
      return { score: dist === 1 ? 0.92 : 0.86, reason: `levenshtein-${dist}` };
    }
    // Short/high-fraction near-collision → medium review, NOT auto-apply.
    return { score: 0.70, reason: `short-token-levenshtein-${dist}` };
  }

  // Structural prefix/substring relationship — a HINT for the operator, never
  // auto-apply. Capped at 0.70 (below the 0.85 floor) regardless of direction so a
  // noisy short-token substring can't masquerade as a confident fix.
  const structural =
    candidateSlug.startsWith(brokenNormalized) ? "broken-is-prefix-of-candidate"
    : brokenNormalized.startsWith(candidateSlug) ? "candidate-is-prefix-of-broken"
    : candidateSlug.includes(brokenNormalized) ? "broken-substring-of-candidate"
    : brokenNormalized.includes(candidateSlug) ? "candidate-substring-of-broken"
    : null;
  if (structural) {
    return { score: 0.70, reason: `structural-${structural}` };
  }

  // Looser Levenshtein → low confidence (operator review, never auto-apply).
  if (dist === 3 && maxLen <= 40) {
    return { score: 0.62, reason: `levenshtein-${dist}` };
  }
  if (dist <= 6 && maxLen <= 60) {
    return { score: 0.40 + (6 - dist) * 0.02, reason: `levenshtein-${dist}` };
  }
  // Distance-decay fallback. Bounded at 0.
  const score = Math.max(0, 1 - dist / maxLen);
  return { score, reason: `distance-decay-${dist}` };
}

// ─── Pure: rank candidates against a file index ────────────────────────────

/**
 * For a single broken link, rank all candidate files by score and return
 * the top-K suggestions above a noise floor.
 *
 * @param {string} normalized - broken-link slug
 * @param {Array<{slug, path}>} fileIndex - pre-computed file slug list
 * @param {{topK?, noiseFloor?}} opts
 * @returns {{suggestions, bestScore, confidence, autoApplyEligible}}
 */
export function rankCandidates(normalized, fileIndex, opts = {}) {
  const topK = opts.topK ?? 5;
  const noiseFloor = opts.noiseFloor ?? 0.20;  // drop very-distant matches entirely
  if (typeof normalized !== "string" || !Array.isArray(fileIndex)) {
    return { suggestions: [], bestScore: 0, confidence: "none", autoApplyEligible: false };
  }
  const scored = [];
  for (const entry of fileIndex) {
    if (!entry || typeof entry.slug !== "string") continue;
    const { score, reason } = scoreCandidate(normalized, entry.slug);
    if (score >= noiseFloor) {
      scored.push({ target: entry.path, score, reason, source: "structural" });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const topSuggestions = scored.slice(0, topK);
  const best = topSuggestions.length > 0 ? topSuggestions[0] : null;
  const bestScore = best ? best.score : 0;
  return {
    suggestions: topSuggestions,
    bestScore,
    confidence: classifyConfidence(bestScore),
    // Defense in depth: auto-apply requires BOTH a score above the floor AND a
    // reason that is genuinely a confident rewrite signal (exact slug or a tight
    // 1-2 edit typo). Score-alone is NOT enough — the distance-decay path can
    // return >0.85 for long slugs (e.g. two 61-char slugs, 3 edits → 0.95), which
    // is NOT a tight match. Gating on reason closes that leak. (U-VAULT-LINK-HEAL)
    autoApplyEligible: bestScore >= AUTO_APPLY_FLOOR && isAutoApplyReason(best && best.reason),
  };
}

// The ONLY match reasons safe to auto-apply: an exact slug, or a tight 1-2 edit
// typo/truncation. Everything else (structural prefix/substring, looser
// Levenshtein, distance-decay) is operator-review-only regardless of its score.
const AUTO_APPLY_REASONS = new Set(["exact-match", "levenshtein-1", "levenshtein-2"]);
export function isAutoApplyReason(reason) {
  return typeof reason === "string" && AUTO_APPLY_REASONS.has(reason);
}

// ─── Pure: confidence classifier ───────────────────────────────────────────

export function classifyConfidence(bestScore) {
  if (typeof bestScore !== "number" || !Number.isFinite(bestScore)) return "none";
  if (bestScore >= HIGH_CONFIDENCE) return "high";
  if (bestScore >= MEDIUM_CONFIDENCE) return "medium";
  if (bestScore >= LOW_CONFIDENCE) return "low";
  return "none";
}

// ─── Pure: build summary ───────────────────────────────────────────────────

export function buildSummary(candidates) {
  const summary = { high: 0, medium: 0, low: 0, none: 0, autoApplyCount: 0 };
  if (!Array.isArray(candidates)) return summary;
  for (const c of candidates) {
    if (!c || typeof c.confidence !== "string") continue;
    if (summary[c.confidence] !== undefined) summary[c.confidence] += 1;
    if (c.autoApplyEligible) summary.autoApplyCount += 1;
  }
  return summary;
}

// ─── I/O: build file index from walks ──────────────────────────────────────

/**
 * Walk a directory tree (depth-bounded) and emit {slug, path} for every .md.
 * Designed to be slow-but-safe: caps total files + depth + skips junk dirs.
 */
function indexMarkdownFiles(root, opts = {}) {
  const maxFiles = opts.maxFiles ?? MAX_FILES_TO_INDEX;
  const maxDepth = opts.maxDepth ?? MAX_INDEX_DEPTH;
  const skip = new Set(["node_modules", ".git", "dist", "build", "coverage", ".cache", ".hook-cache"]);
  const out = [];
  if (!root || !fs.existsSync(root)) return out;
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length > 0 && out.length < maxFiles) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (out.length >= maxFiles) break;
      if (skip.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else if (e.isFile() && e.name.endsWith(".md")) {
        const base = e.name.replace(/\.md$/, "");
        out.push({ slug: slugify(base), path: full });
      }
    }
  }
  return out;
}

// ─── I/O wrapper ───────────────────────────────────────────────────────────

const DEFAULT_AUDIT = "state/shared/.knowledge-link-audit.json";
const DEFAULT_WIKI  = "knowledge/wiki";
const DEFAULT_MEM   = "knowledge/memories";
const DEFAULT_OUT   = "state/shared/wiki-link-fix-candidates.json";

function safeReadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

export function suggestFixes({
  prismRoot = ".",
  auditPath = null,
  wikiRoot = null,
  memRoot = null,
  batchLimit = DEFAULT_BATCH_LIMIT,
  outPath = null,
  write = true,
} = {}) {
  const resolve = (rel) => path.join(prismRoot, rel);
  const audit = auditPath ?? resolve(DEFAULT_AUDIT);
  const wikiDir = wikiRoot ?? resolve(DEFAULT_WIKI);
  const memDir = memRoot ?? resolve(DEFAULT_MEM);

  const auditJson = safeReadJson(audit);
  const broken = (auditJson && Array.isArray(auditJson.broken)) ? auditJson.broken : [];
  const totalBroken = broken.length;
  const sliced = batchLimit > 0 ? broken.slice(0, batchLimit) : broken;

  // Build the file index ONCE — used for every broken link.
  const fileIndex = [
    ...indexMarkdownFiles(wikiDir),
    ...indexMarkdownFiles(memDir),
  ];

  const candidates = sliced.map((b) => {
    const normalized = typeof b.normalized === "string" ? b.normalized
      : typeof b.link === "string" ? slugify(b.link) : "";
    const ranked = rankCandidates(normalized, fileIndex);
    return {
      link: b.link ?? null,
      normalized,
      from: b.from ?? null,
      suggestions: ranked.suggestions,
      bestScore: ranked.bestScore,
      confidence: ranked.confidence,
      autoApplyEligible: ranked.autoApplyEligible,
    };
  });

  const summary = buildSummary(candidates);

  const result = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    auditPath: audit,
    wikiRoot: wikiDir,
    memRoot: memDir,
    totalBroken,
    processed: candidates.length,
    fileIndexSize: fileIndex.length,
    candidates,
    summary,
  };

  if (write) {
    const out = outPath ?? resolve(DEFAULT_OUT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    return { result, written: out };
  }
  return { result, written: null };
}

// ─── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dry: false, root: ".", out: null, batch: DEFAULT_BATCH_LIMIT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry") args.dry = true;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a === "--out") args.out = argv[++i] ?? null;
    else if (a === "--batch") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0) args.batch = Math.floor(n);
    }
  }
  return args;
}

function cliMain(argv) {
  if (process.env.PRISM_WIKI_LINK_FIX_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, skipped: "disabled-via-env" }));
    return 0;
  }
  const { dry, root, out, batch } = parseArgs(argv);
  const envBatch = Number(process.env.PRISM_WIKI_LINK_FIX_BATCH);
  const effectiveBatch = Number.isFinite(envBatch) && envBatch >= 0 ? envBatch : batch;
  const r = suggestFixes({ prismRoot: root, outPath: out, batchLimit: effectiveBatch, write: !dry });
  if (dry) {
    console.log(JSON.stringify({
      ok: true,
      schemaVersion: r.result.schemaVersion,
      totalBroken: r.result.totalBroken,
      processed: r.result.processed,
      fileIndexSize: r.result.fileIndexSize,
      summary: r.result.summary,
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      ok: true,
      written: r.written,
      totalBroken: r.result.totalBroken,
      processed: r.result.processed,
      summary: r.result.summary,
    }));
  }
  return 0;
}

const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = new URL(import.meta.url).pathname.replace(/^\//, "");
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(cliMain(process.argv.slice(2)));
}
