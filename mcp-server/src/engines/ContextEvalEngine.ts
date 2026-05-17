/**
 * ContextEvalEngine
 * =================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE
 *
 * Before an agent acts on retrieved context, score whether that context is
 * COMPLETE relative to a golden expectation set. The golden set
 * (`state/shared/context-eval-golden.json`) is a list of entries:
 *
 *   { id, query, requiredTokens[], requiredFiles?[], minCoverage? }
 *
 * Given a free-text `query` and the `retrievedContext` string the agent is
 * about to act on, the engine:
 *
 *   1. Picks the best-matching golden entry by query-token Jaccard overlap
 *      (deterministic; ties broken by entry id for cross-run stability).
 *   2. Computes coverage = |requiredTokens present in retrievedContext| /
 *      |requiredTokens|, plus an optional requiredFiles sub-score.
 *   3. Returns a verdict — PASS (coverage ≥ threshold) / WARN
 *      (floor ≤ coverage < threshold) / FAIL (< floor) / NO_MATCH (no
 *      golden entry matched the query at all) — with the explicit list of
 *      missing tokens / files so the caller can surface the gap.
 *
 * Two-phase, read-only (no file writes — pure scorer, so none of the
 * atomicity / read-modify-write surface of B3/B5/B6):
 *   1. loadGolden()  — deterministic golden-set read + schema validation.
 *   2. evaluate()    — pure scoring against the loaded set.
 *
 * Advisory by design: the companion PostToolUse hook
 * (`post-memory-context-eval.mjs`) scores the just-retrieved context (the
 * tool RESULT) and surfaces a WARN/FAIL as `additionalContext`, never
 * blocks (operator-in-the-loop is unconditional; R12 — surface the gap,
 * don't hide it, but don't gate the agent on a heuristic coverage score
 * either).
 *
 * Inherited hardening from the B3/B5/B6 family: Zod on every public entry,
 * lstat-safe single-file read, frozen-now determinism, malformed-golden
 * fail-loud (a corrupt golden file degrades to NO_MATCH with a warning, it
 * never throws into the agent's hot path), `_internals` test seam, singleton
 * + run wrapper.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE
 * @module engines/ContextEvalEngine
 */

import { readFileSync, existsSync, lstatSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

// ---------- Public types -----------------------------------------------------

export type ContextVerdict = "PASS" | "WARN" | "FAIL" | "NO_MATCH";

export interface GoldenEntry {
  id: string;
  query: string;
  requiredTokens: string[];
  requiredFiles?: string[];
  /** Per-entry override of the PASS threshold (0..1). */
  minCoverage?: number;
}

export interface ContextEvalResult {
  verdict: ContextVerdict;
  /** Golden entry id that matched, or null on NO_MATCH. */
  matchedGoldenId: string | null;
  /** Query-token Jaccard similarity to the matched entry (0..1). */
  matchScore: number;
  /** requiredTokens coverage fraction (0..1). */
  tokenCoverage: number;
  /** requiredFiles coverage fraction (0..1); 1 when entry has no files. */
  fileCoverage: number;
  /** Combined coverage actually compared against the threshold. */
  coverage: number;
  /** Threshold used for the PASS cut (entry override or opts default). */
  threshold: number;
  /** Floor used for the WARN/FAIL cut. */
  floor: number;
  missingTokens: string[];
  missingFiles: string[];
  warnings: string[];
  /** ISO8601 of evaluation (pinned via opts.now for determinism). */
  generatedAt: string;
}

export interface ContextEvalOptions {
  /** Override golden-set path (defaults to state/shared/context-eval-golden.json). */
  goldenPath?: string;
  /** Override "now" for deterministic timestamps in tests (ms epoch). */
  now?: number;
  /** PASS threshold 0..1 (default 0.8). Per-entry minCoverage overrides this. */
  threshold?: number;
  /** WARN/FAIL boundary 0..1 (default 0.5). coverage < floor → FAIL. */
  floor?: number;
  /** Weight of token coverage vs file coverage in the combined score (0..1, default 0.7). */
  tokenWeight?: number;
  /** Minimum query-Jaccard to consider a golden entry a match (default 0.15). */
  minMatchScore?: number;
  /** Max bytes read from the golden file (default 1 MiB). */
  maxGoldenBytes?: number;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_GOLDEN_PATH = "H:/prism/state/shared/context-eval-golden.json";
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_FLOOR = 0.5;
const DEFAULT_TOKEN_WEIGHT = 0.7;
const DEFAULT_MIN_MATCH_SCORE = 0.15;
const DEFAULT_MAX_GOLDEN_BYTES = 1024 * 1024;

const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 1;
const MAX_GOLDEN_BYTES_MIN = 256;
const MAX_GOLDEN_BYTES_MAX = 16 * 1024 * 1024;

export const ContextEvalOptionsSchema = z.object({
  goldenPath: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  threshold: z.number().min(THRESHOLD_MIN).max(THRESHOLD_MAX).optional(),
  floor: z.number().min(THRESHOLD_MIN).max(THRESHOLD_MAX).optional(),
  tokenWeight: z.number().min(THRESHOLD_MIN).max(THRESHOLD_MAX).optional(),
  minMatchScore: z.number().min(THRESHOLD_MIN).max(THRESHOLD_MAX).optional(),
  maxGoldenBytes: z.number().int().min(MAX_GOLDEN_BYTES_MIN).max(MAX_GOLDEN_BYTES_MAX).optional(),
}).passthrough();

const GoldenEntrySchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1),
  requiredTokens: z.array(z.string().min(1)).min(1),
  requiredFiles: z.array(z.string().min(1)).optional(),
  minCoverage: z.number().min(0).max(1).optional(),
}).passthrough();

const GoldenFileSchema = z.object({
  schemaVersion: z.string().optional(),
  entries: z.array(GoldenEntrySchema),
}).passthrough();

function validateOptions(opts: ContextEvalOptions): ContextEvalOptions {
  ContextEvalOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

function clamp01(v: number, dflt: number): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return dflt;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Lowercased alnum tokens, deduped, length ≥ 2 (drops noise like "a"/"of"). */
function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s.toLowerCase().split(/[^a-z0-9_.]+/)) {
    if (raw.length >= 2) out.add(raw);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Sound token presence (Arm-B P0-3 fix — pure `includes` made the scorer a
 * silent no-op because short golden tokens like `mc`/`ap`/`fc`/`vc` matched
 * arbitrary prose: "mc" inside "mcmaster", "ap" inside "apple", giving a
 * universal spurious PASS).
 *
 * A requiredToken is "present" when:
 *   1. it is a WHOLE token of the retrieved context (the tokenizer splits on
 *      `[^a-z0-9_.]+`, so "mcmaster" → {"mcmaster"} ≠ "mc" — no false hit);
 *   2. OR it is a compound identifier (contains a digit / `_` / `.`) and
 *      occurs as a substring — preserves the intended `kc1_1`→`kc1_1mpa`,
 *      `constants.ts`→`src/.../constants.ts` affordance. Compound identifiers
 *      have negligible accidental-substring risk; plain alphabetic tokens get
 *      NO substring fallback (that is the exact unsoundness Arm B flagged).
 * Case-insensitive.
 */
function tokenPresent(required: string, haystackLower: string, haystackTokens: Set<string>): boolean {
  const r = required.toLowerCase();
  if (haystackTokens.has(r)) return true;
  if (/[._0-9]/.test(r)) return haystackLower.includes(r);
  return false;
}

// ---------- Engine -----------------------------------------------------------

export class ContextEvalEngine {
  readonly name = "ContextEvalEngine";

  /**
   * Phase 1 — deterministic golden-set load + validation. Pure-functional
   * given the filesystem state. Never throws into the caller: a missing or
   * malformed golden file returns `{ entries: [], warnings: [...] }` so the
   * agent's hot path degrades to NO_MATCH (advisory) rather than crash.
   *
   * @param opts  Optional overrides (goldenPath, caps).
   * @returns     `{ entries, warnings, goldenPath }`.
   */
  loadGolden(opts: ContextEvalOptions = {}): { entries: GoldenEntry[]; warnings: string[]; goldenPath: string } {
    validateOptions(opts);
    const goldenPath = resolve(opts.goldenPath ?? DEFAULT_GOLDEN_PATH);
    const maxBytes = opts.maxGoldenBytes ?? DEFAULT_MAX_GOLDEN_BYTES;
    const warnings: string[] = [];

    if (!existsSync(goldenPath)) {
      warnings.push(`golden set not found at ${goldenPath} (degrading to NO_MATCH)`);
      return { entries: [], warnings, goldenPath };
    }
    // Symlink rejection (defense-in-depth — never follow a symlinked golden).
    try {
      if (lstatSync(goldenPath).isSymbolicLink()) {
        warnings.push(`golden set is a symlink — refusing to follow (${goldenPath})`);
        return { entries: [], warnings, goldenPath };
      }
    } catch {
      warnings.push(`golden set lstat failed (${goldenPath})`);
      return { entries: [], warnings, goldenPath };
    }

    let raw: Buffer;
    try {
      raw = readFileSync(goldenPath);
    } catch (e) {
      warnings.push(`golden set read failed: ${e instanceof Error ? e.message : String(e)}`);
      return { entries: [], warnings, goldenPath };
    }
    if (raw.length > maxBytes) {
      warnings.push(`golden set exceeds maxGoldenBytes (${raw.length} > ${maxBytes}); refusing to parse`);
      return { entries: [], warnings, goldenPath };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch (e) {
      warnings.push(`golden set is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return { entries: [], warnings, goldenPath };
    }
    const result = GoldenFileSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`golden set failed schema validation: ${result.error.issues.length} issue(s)`);
      return { entries: [], warnings, goldenPath };
    }
    // Reject duplicate ids (would make match tie-break non-deterministic).
    const seen = new Set<string>();
    const entries: GoldenEntry[] = [];
    for (const e of result.data.entries) {
      if (seen.has(e.id)) {
        warnings.push(`duplicate golden id "${e.id}" — keeping first occurrence`);
        continue;
      }
      seen.add(e.id);
      entries.push(e);
    }
    return { entries, warnings, goldenPath };
  }

  /**
   * Phase 2 — score a retrieved-context blob against the golden set for a
   * given query. Pure given the loaded golden set + inputs. Never throws.
   *
   * @param query             The agent's query / task description.
   * @param retrievedContext  The context string the agent is about to act on.
   * @param opts              Options including thresholds.
   * @returns                 ContextEvalResult.
   */
  evaluate(query: string, retrievedContext: string, opts: ContextEvalOptions = {}): ContextEvalResult {
    validateOptions(opts);
    const now = opts.now ?? Date.now();
    const generatedAt = new Date(now).toISOString();
    const threshold = clamp01(opts.threshold as number, DEFAULT_THRESHOLD);
    const floor = clamp01(opts.floor as number, DEFAULT_FLOOR);
    const tokenWeight = clamp01(opts.tokenWeight as number, DEFAULT_TOKEN_WEIGHT);
    const minMatchScore = clamp01(opts.minMatchScore as number, DEFAULT_MIN_MATCH_SCORE);

    const { entries, warnings, goldenPath } = this.loadGolden(opts);
    const baseWarnings = [...warnings];

    if (typeof query !== "string" || query.trim().length === 0) {
      return noMatch(generatedAt, threshold, floor, [...baseWarnings, "empty query — cannot match"]);
    }
    if (entries.length === 0) {
      return noMatch(generatedAt, threshold, floor, [...baseWarnings, `no golden entries loaded (${goldenPath})`]);
    }

    // Best match by query-token Jaccard; id tie-break for determinism.
    const qTokens = tokenize(query);
    let best: { entry: GoldenEntry; score: number } | null = null;
    for (const entry of entries) {
      const score = jaccard(qTokens, tokenize(entry.query));
      if (
        best === null ||
        score > best.score ||
        (score === best.score && entry.id.localeCompare(best.entry.id) < 0)
      ) {
        best = { entry, score };
      }
    }
    if (best === null || best.score < minMatchScore) {
      return noMatch(generatedAt, threshold, floor, [
        ...baseWarnings,
        `no golden entry matched query (best score ${best ? best.score.toFixed(3) : "n/a"} < minMatchScore ${minMatchScore})`,
      ]);
    }

    const entry = best.entry;
    // Arm-A P2: honor the "never throws" JSDoc — a non-string retrievedContext
    // (caller bug / bad dispatcher arg) must degrade to empty, not throw
    // .toLowerCase() into the agent's hot path.
    const safeContext = typeof retrievedContext === "string" ? retrievedContext : "";
    const haystackLower = safeContext.toLowerCase();
    const haystackTokens = tokenize(safeContext);
    const missingTokens = entry.requiredTokens.filter((t) => !tokenPresent(t, haystackLower, haystackTokens));
    const tokenCoverage =
      entry.requiredTokens.length === 0
        ? 1
        : (entry.requiredTokens.length - missingTokens.length) / entry.requiredTokens.length;

    const reqFiles = entry.requiredFiles ?? [];
    const missingFiles = reqFiles.filter((fpath) => !haystackLower.includes(fpath.toLowerCase()));
    const fileCoverage = reqFiles.length === 0 ? 1 : (reqFiles.length - missingFiles.length) / reqFiles.length;

    const coverage = tokenWeight * tokenCoverage + (1 - tokenWeight) * fileCoverage;
    const effThreshold = typeof entry.minCoverage === "number" ? clamp01(entry.minCoverage, threshold) : threshold;

    let verdict: ContextVerdict;
    if (coverage >= effThreshold) verdict = "PASS";
    else if (coverage >= floor) verdict = "WARN";
    else verdict = "FAIL";

    const evalWarnings = [...baseWarnings];
    if (verdict !== "PASS") {
      evalWarnings.push(
        `coverage ${coverage.toFixed(3)} ${verdict === "FAIL" ? "<" : "≥"} floor ${floor} (threshold ${effThreshold}); ` +
          `missing ${missingTokens.length} token(s)${missingFiles.length ? ` + ${missingFiles.length} file(s)` : ""}`,
      );
    }

    return {
      verdict,
      matchedGoldenId: entry.id,
      matchScore: best.score,
      tokenCoverage,
      fileCoverage,
      coverage,
      threshold: effThreshold,
      floor,
      missingTokens,
      missingFiles,
      warnings: evalWarnings,
      generatedAt,
    };
  }
}

function noMatch(
  generatedAt: string,
  threshold: number,
  floor: number,
  warnings: string[],
): ContextEvalResult {
  return {
    verdict: "NO_MATCH",
    matchedGoldenId: null,
    matchScore: 0,
    tokenCoverage: 0,
    fileCoverage: 0,
    coverage: 0,
    threshold,
    floor,
    missingTokens: [],
    missingFiles: [],
    warnings,
    generatedAt,
  };
}

// ---------- Helpers exported for tests --------------------------------------

/** @internal — exported for the test suite only; do NOT depend on from prod code. */
export const _internals = {
  clamp01,
  tokenize,
  jaccard,
  tokenPresent,
  GoldenEntrySchema,
  GoldenFileSchema,
  DEFAULT_THRESHOLD,
  DEFAULT_FLOOR,
  DEFAULT_TOKEN_WEIGHT,
  DEFAULT_MIN_MATCH_SCORE,
};

// ---------- Singleton --------------------------------------------------------

export const contextEvalEngine = new ContextEvalEngine();

export default ContextEvalEngine;

export function runContextEval(
  query: string,
  retrievedContext: string,
  opts: ContextEvalOptions = {},
): ContextEvalResult {
  validateOptions(opts);
  return contextEvalEngine.evaluate(query, retrievedContext, opts);
}
