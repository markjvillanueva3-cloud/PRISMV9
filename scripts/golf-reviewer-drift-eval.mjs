#!/usr/bin/env node
/**
 * golf-reviewer-drift-eval.mjs — CLEANUP-MS0 / U-CLEANUP-B9
 *
 * Model-drift evaluation suite for the golf peer-commit reviewer (B4).
 *
 * The peer-audit reviewer dispatches an LLM agent to grade peer commits.
 * Over time the underlying model, the prompt, or the dispatch harness can
 * silently drift — a reviewer that used to catch a P0 starts missing it.
 * This suite catches that drift by running the reviewer against a FROZEN
 * corpus of known-bug commits with known-correct verdicts, weekly, and
 * alerting when accuracy degrades.
 *
 * § Corpus (state/shared/golf-reviewer-eval/corpus.json)
 *   10 frozen entries, each: { id, commitSha, description, expectedVerdict,
 *   expectedSeverity, promptVersion }. The corpus is operator-seeded with
 *   real historical bug commits; this script ships the SCHEMA + a skeleton
 *   so the weekly cron is wired from day one (it reports `corpus_unseeded`
 *   until an operator fills in real commits).
 *
 * § Drift detection
 *   Precedence (not a flat OR): FLOOR is an always-on absolute-safety
 *   backstop and always contributes to the alert. The DRIFT signal proper
 *   is CONFORMAL when applicable, else SLOPE (cold-start fallback) — never
 *   both: when conformal is applicable, slope is computed for context but
 *   does NOT fold into `drifted`.
 *     1. CONFORMAL (primary, R4-P1-8) — split-conformal prediction-set
 *        membership. The latest accuracy is "in the set" iff it lies within
 *        the (1−α) distribution-free prediction interval built from the
 *        prior window points; a value BELOW the lower band trips drift (a
 *        value above the upper band is improvement, never drift). This is
 *        the conformal-prediction-set membership check the envelope's
 *        R4-P1-8 calls for, replacing the naive slope heuristic as the
 *        authoritative gate WHENEVER it is applicable.
 *     2. SLOPE  — linear-regression slope over the last DRIFT_WINDOW_WEEKS
 *        of accuracy history < DRIFT_SLOPE_THRESHOLD (default -0.20 over the
 *        window). Catches gradual degradation.
 *     3. FLOOR  — the latest accuracy < DRIFT_ABSOLUTE_FLOOR (default 0.70).
 *        Catches a sudden cliff that a short slope window would miss.
 *
 *   § Two reasoned deviations from the literal envelope text (R7 — surface,
 *     don't silently average):
 *     a. ENGINE REFERENCE + COVERAGE SCOPE. The envelope names
 *        `prism_intelligence:xproc_aps_calibrate/xproc_aps_set`. That action
 *        pair is the CrossProcessAPS *classification* engine (probability
 *        simplex + integer class labels) — semantically wrong for a scalar
 *        accuracy time-series; forcing the ledger through it produces
 *        meaningless prediction sets. The correct family is scalar
 *        split-conformal *regression* (`xproc_conformal_*` /
 *        CrossProcessConformalPredictionEngine). This module mirrors that
 *        engine's exact RANK RULE k = ⌈(N+1)(1−α)⌉ with the same
 *        k>N → unbounded/abstain fallback. Honest scope of the equivalence:
 *        the engine takes a CALLER-SUPPLIED point prediction; this module
 *        instead uses a median plug-in predictor derived from the same
 *        window. So it is split-conformal-*style* (a conformalised residual
 *        band around a robust location estimate), NOT the textbook
 *        split-conformal finite-sample guarantee — the median plug-in makes
 *        the residuals only approximately exchangeable, so the coverage is
 *        approximate, not exact. It computes a bit-identical band to
 *        CrossProcessConformalPredictionEngine ONLY when that engine is fed
 *        `prediction = median(window)`; the rank-rule mirror (not a full
 *        coverage-guarantee mirror) is what makes the standalone cron and
 *        the in-MCP path agree. Implemented as a pure local function (no MCP
 *        round-trip) because — as the original B9 skeleton documented — a
 *        weekly .mjs cron cannot cheaply reach the dispatcher; ~20 lines of
 *        pure math is the right call, not a fragile subprocess hop. Further:
 *        the residual band is two-sided at level (1−α) but the DRIFT
 *        DECISION is one-sided (lower breach only), so the effective
 *        false-alarm rate of the decision is ≈α/2 (≈5% at α=0.10), not α —
 *        conservative by design (fewer false drifts on a noisy reviewer).
 *     b. RETAINED BASELINE. The envelope says "instead of the naive slope
 *        heuristic". Conformal yields a finite band only once
 *        N ≥ ⌈1/α⌉−1 calibration points (= 9 at α=0.10, matching the
 *        engine's MIN_CALIBRATION_FOR_ALPHA; below that k>N → abstain).
 *        N here is the count of prior weekly history rows in the window
 *        (the fresh eval is the disjoint test point, not in N). Removing
 *        slope+floor would leave the first ~8 evaluated weeks with NO drift
 *        coverage. So slope+floor are retained as the cold-start fallback;
 *        `primaryGate` reports which gate was authoritative for this run
 *        ("conformal" when applicable, else "slope+floor"). Conformal
 *        SUPERSEDES the naive slope — it does not merely co-exist: when
 *        applicable, slope is computed for context but does NOT fold into
 *        `drifted`. FLOOR is orthogonal (an always-on absolute-safety
 *        backstop) and always folds in.
 *
 * § Prompt drift
 *   Each corpus entry carries a `promptVersion`. If the reviewer's emitted
 *   `promptVersion` (read from the verdict's prompt-version header) differs
 *   from the corpus's expectation, that's flagged separately as
 *   `promptDriftDetected` — a prompt change is a legitimate reason for an
 *   accuracy shift and the operator should re-baseline the corpus.
 *
 * § Model pinning
 *   The reviewer agent MUST be pinned to a STABLE model id (default
 *   `claude-sonnet-4-6`), NOT "latest" — otherwise the eval measures model-
 *   release noise instead of genuine drift. `PINNED_REVIEWER_MODEL` is the
 *   canonical pin; the runner records the actual model used and flags a
 *   mismatch.
 *
 * Exit codes (advisory — the weekly cron should surface, not block):
 *   0 — ran cleanly (regardless of whether drift was detected)
 *   1 — real error (corpus unreadable, history-file write failure)
 *   2 — usage error
 *
 * @module scripts/golf-reviewer-drift-eval
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync,
} from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1;
export const DEFAULT_REPO_ROOT = "H:/prism";
export const CORPUS_RELATIVE = "state/shared/golf-reviewer-eval/corpus.json";
export const HISTORY_RELATIVE = "state/shared/golf-reviewer-eval/accuracy-history.jsonl";
export const EXPECTED_CORPUS_SIZE = 10;
export const PINNED_REVIEWER_MODEL = "claude-sonnet-4-6";
export const DRIFT_WINDOW_WEEKS = 12;
export const DRIFT_SLOPE_THRESHOLD = -0.20;   // total drop over the window
export const DRIFT_ABSOLUTE_FLOOR = 0.70;     // latest accuracy must stay >= this
// Split-conformal miscoverage rate. α=0.10 → 90% two-sided residual band
// (the one-sided lower drift decision has ≈α/2 effective false-alarm rate).
// The gate is applicable once N (prior-window calibration rows, excluding
// the disjoint fresh test point) ≥ ⌈1/α⌉−1 = 9 — i.e. the 9th evaluated
// weekly history row onward. Below that the rank k=⌈(N+1)(1−α)⌉ exceeds N
// (unbounded band; matches CrossProcessConformalPredictionEngine's
// MIN_CALIBRATION_FOR_ALPHA = ⌈1/α⌉−1) and the gate abstains.
export const DEFAULT_CONFORMAL_ALPHA = 0.10;
export const VALID_VERDICTS = new Set(["bug", "clean", "needs-review"]);
export const VALID_SEVERITIES = new Set(["P0", "P1", "P2", "P3", "none"]);

// ── ARGS ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = {
    json: false,
    dryRun: false,
    repoRoot: null,
    corpusPath: null,
    historyPath: null,
    nowMs: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--json":        out.json = true; break;
      case "--dry-run":     out.dryRun = true; break;
      case "--repo-root":   out.repoRoot = argv[i + 1]; i++; break;
      case "--corpus":      out.corpusPath = argv[i + 1]; i++; break;
      case "--history":     out.historyPath = argv[i + 1]; i++; break;
      case "--now":         out.nowMs = Date.parse(argv[i + 1]); i++; break;
      case "--help":
      case "-h":            out.help = true; break;
      default:
        if (a && a.startsWith("--")) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

export function resolvePaths(opts) {
  let repoRoot = opts.repoRoot;
  if (!repoRoot) {
    try {
      const here = fileURLToPath(import.meta.url);
      repoRoot = path.resolve(path.dirname(path.dirname(here)));
    } catch {
      repoRoot = DEFAULT_REPO_ROOT;
    }
  } else {
    repoRoot = path.resolve(repoRoot);
  }
  return {
    repoRoot,
    corpusPath: opts.corpusPath ?? path.join(repoRoot, CORPUS_RELATIVE),
    historyPath: opts.historyPath ?? path.join(repoRoot, HISTORY_RELATIVE),
  };
}

// ── CORPUS ───────────────────────────────────────────────────────────────────

/**
 * Load + validate the eval corpus. Returns { ok, entries[], errors[] }.
 * An entry is valid when it has id + commitSha + expectedVerdict (in
 * VALID_VERDICTS) + expectedSeverity (in VALID_SEVERITIES). A skeleton
 * entry with a placeholder commitSha of "" is treated as `unseeded` —
 * counted but not run.
 */
export function loadCorpus(corpusPath) {
  if (!existsSync(corpusPath)) {
    return { ok: false, reason: "corpus_missing", entries: [], errors: [`corpus not found at ${corpusPath}`] };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(corpusPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: "corpus_parse_error", entries: [], errors: [e instanceof Error ? e.message : String(e)] };
  }
  if (!raw || !Array.isArray(raw.entries)) {
    return { ok: false, reason: "corpus_malformed", entries: [], errors: ["corpus.entries is not an array"] };
  }
  const entries = [];
  const errors = [];
  for (const e of raw.entries) {
    if (!e || typeof e !== "object") { errors.push("non-object entry skipped"); continue; }
    if (typeof e.id !== "string" || e.id.length === 0) { errors.push("entry missing id"); continue; }
    const seeded = typeof e.commitSha === "string" && e.commitSha.length > 0;
    const verdictOk = VALID_VERDICTS.has(e.expectedVerdict);
    const severityOk = VALID_SEVERITIES.has(e.expectedSeverity);
    if (seeded && (!verdictOk || !severityOk)) {
      errors.push(`entry ${e.id}: seeded but invalid verdict/severity`);
      continue;
    }
    entries.push({
      id: e.id,
      commitSha: seeded ? e.commitSha : "",
      description: typeof e.description === "string" ? e.description : "",
      expectedVerdict: verdictOk ? e.expectedVerdict : null,
      expectedSeverity: severityOk ? e.expectedSeverity : null,
      promptVersion: typeof e.promptVersion === "string" ? e.promptVersion : null,
      seeded,
    });
  }
  const seededCount = entries.filter((e) => e.seeded).length;
  return {
    ok: true,
    reason: seededCount === 0 ? "corpus_unseeded" : "corpus_loaded",
    entries,
    seededCount,
    errors,
  };
}

// ── EVAL ─────────────────────────────────────────────────────────────────────

/**
 * Run the reviewer against every seeded corpus entry. Pure-ish: the only
 * I/O is delegated to the injected `runReviewer` (test seam). The default
 * `runReviewer` returns a `not_implemented` verdict so the suite degrades
 * gracefully when no reviewer hookup is wired — the cron still produces a
 * history row (with accuracy 0 + reason `reviewer_not_wired`) so the
 * operator sees the cron IS firing.
 *
 * @param {Array} entries - validated corpus entries
 * @param {{ runReviewer?: (entry) => Promise<{verdict, severity, model, promptVersion}> }} [opts]
 */
export async function runEval(entries, opts = {}) {
  const seeded = entries.filter((e) => e.seeded);
  if (seeded.length === 0) {
    return {
      ran: 0,
      correct: 0,
      accuracy: 0,
      reason: "corpus_unseeded",
      perEntry: [],
      modelMismatch: false,
      promptDriftDetected: false,
    };
  }

  const runReviewer = opts.runReviewer ?? defaultRunReviewer;
  const perEntry = [];
  let correct = 0;
  let modelMismatch = false;
  let promptDriftDetected = false;

  for (const entry of seeded) {
    let result;
    try {
      result = await runReviewer(entry);
    } catch (e) {
      perEntry.push({
        id: entry.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        verdictMatch: false,
        severityMatch: false,
      });
      continue;
    }
    const verdictMatch = result?.verdict === entry.expectedVerdict;
    const severityMatch = result?.severity === entry.expectedSeverity;
    // "Correct" = both verdict + severity match. Verdict-only matches are
    // partial credit in `perEntry` but don't count toward accuracy — a
    // reviewer that says "bug" but misjudges severity is still drifting.
    const isCorrect = verdictMatch && severityMatch;
    if (isCorrect) correct++;
    if (result?.model && result.model !== PINNED_REVIEWER_MODEL) modelMismatch = true;
    if (result?.promptVersion && entry.promptVersion && result.promptVersion !== entry.promptVersion) {
      promptDriftDetected = true;
    }
    perEntry.push({
      id: entry.id,
      ok: true,
      verdictMatch,
      severityMatch,
      isCorrect,
      gotVerdict: result?.verdict ?? null,
      gotSeverity: result?.severity ?? null,
      gotModel: result?.model ?? null,
      gotPromptVersion: result?.promptVersion ?? null,
    });
  }

  const reviewerWired = perEntry.some((p) => p.ok && p.gotVerdict !== "not_implemented");
  return {
    ran: seeded.length,
    correct,
    accuracy: seeded.length > 0 ? correct / seeded.length : 0,
    reason: reviewerWired ? "evaluated" : "reviewer_not_wired",
    perEntry,
    modelMismatch,
    promptDriftDetected,
  };
}

/**
 * Default reviewer: returns a `not_implemented` verdict. The real golf
 * reviewer dispatch (B4 commit-reviewer-dispatch.mjs) is the production
 * hookup — wired by passing `opts.runReviewer`. Keeping the default a
 * graceful no-op means the weekly cron NEVER hard-fails just because the
 * reviewer hookup hasn't been wired yet.
 */
async function defaultRunReviewer(_entry) {
  return { verdict: "not_implemented", severity: "none", model: PINNED_REVIEWER_MODEL, promptVersion: null };
}

// ── DRIFT DETECTION ──────────────────────────────────────────────────────────

/**
 * Linear-regression slope of accuracy over the history window. Returns the
 * total expected change across the whole window (slope-per-step × steps),
 * so it's directly comparable to DRIFT_SLOPE_THRESHOLD. Pure.
 *
 * @param {Array<{accuracy:number}>} window - chronologically ordered
 * @returns {number} total accuracy change across the window (negative = degrading)
 */
export function regressionSlopeOverWindow(window) {
  const n = window.length;
  if (n < 2) return 0;
  // x = 0..n-1, y = accuracy. Ordinary least squares slope.
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    const y = Number.isFinite(window[i].accuracy) ? window[i].accuracy : 0;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  const slopePerStep = (n * sumXY - sumX * sumY) / denom;
  return slopePerStep * (n - 1);   // total change across the window
}

/**
 * Median of a numeric array (ascending-sorted internally). Even length →
 * mean of the two central elements. Mirrors the median convention used by
 * CrossProcessConformalPredictionEngine's `summarize`. Pure.
 *
 * @param {number[]} values
 * @returns {number} median (0 for empty input — caller guards applicability)
 */
export function medianOf(values) {
  const n = values.length;
  if (n === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = n >> 1;
  return (n & 1) === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * R4-P1-8 — split-conformal prediction-set membership gate (scalar
 * regression flavour). The prior-window accuracies are the calibration
 * set; the fresh `latestAccuracy` is the test point (it is NOT yet in
 * history — `runDriftEval` calls this before appending the new row, so
 * calibration/test are cleanly disjoint, as split-conformal requires).
 *
 * Algorithm — IDENTICAL rank rule to CrossProcessConformalPredictionEngine
 * so the standalone cron and the in-MCP engine agree to the bit:
 *   predictor ŷ = median(calibration accuracies)   (robust to the very
 *                                                    drift we detect)
 *   residuals  r_i = |acc_i − ŷ|                    (two-sided nonconformity)
 *   sort r ascending; N = #finite residuals
 *   k  = ⌈(N+1)·(1−α)⌉                              (1-indexed)
 *   k > N → unbounded band (insufficient calibration) → ABSTAIN
 *           (mirrors the engine's MIN_CALIBRATION_FOR_ALPHA fallback)
 *   else  radius = r_sorted[k−1]
 *   band  = [ŷ − radius, ŷ + radius]
 *
 * Membership / drift decision is intentionally ONE-SIDED: a value below
 * the lower band is degradation → drift; a value above the upper band is
 * the reviewer getting *better* → reported as `aboveBand` for context but
 * NEVER trips drift.
 *
 * Pure. No MCP round-trip (the original B9 skeleton documented why a weekly
 * .mjs cron can't cheaply reach the dispatcher — split-conformal is ~20
 * lines so a faithful in-process mirror is correct, not a subprocess hop).
 *
 * @param {Array<{accuracy:number}>} window - prior-window rows (calibration)
 * @param {number} latestAccuracy - fresh eval (test point, not in window)
 * @param {number} alpha - miscoverage rate in (0,1)
 * @returns {{applicable:boolean,tripped:boolean,predictor:number,
 *   radius:number,low:number,high:number,n:number,rankUsed:number,
 *   alpha:number,aboveBand:boolean,reason:(string|null)}}
 */
export function conformalDriftGate(window, latestAccuracy, alpha = DEFAULT_CONFORMAL_ALPHA) {
  const calib = window
    .map((r) => (r && Number.isFinite(r.accuracy) ? r.accuracy : null))
    .filter((v) => v !== null);
  const n = calib.length;
  const a = Number.isFinite(alpha) && alpha > 0 && alpha < 1 ? alpha : DEFAULT_CONFORMAL_ALPHA;
  const inapplicable = (extra) => ({
    applicable: false, tripped: false, predictor: NaN, radius: NaN,
    low: NaN, high: NaN, n, rankUsed: NaN, alpha: a, aboveBand: false,
    reason: null, ...extra,
  });
  if (n < 1) return inapplicable();

  const predictor = medianOf(calib);
  const residuals = calib.map((v) => Math.abs(v - predictor)).sort((x, y) => x - y);
  const k = Math.ceil((n + 1) * (1 - a));
  if (k > n) {
    // Unbounded band — insufficient calibration for a finite (1−α)
    // interval. Abstain; slope+floor cover this cold-start regime.
    return inapplicable();
  }
  const radius = residuals[k - 1];
  const low = predictor - radius;
  const high = predictor + radius;
  const finiteLatest = Number.isFinite(latestAccuracy);
  const belowBand = finiteLatest && latestAccuracy < low;
  const aboveBand = finiteLatest && latestAccuracy > high;
  return {
    applicable: true,
    tripped: belowBand,
    predictor,
    radius,
    low,
    high,
    n,
    rankUsed: k,
    alpha: a,
    aboveBand,
    reason: belowBand
      ? `latest accuracy ${latestAccuracy.toFixed(3)} below conformal band ` +
        `[${low.toFixed(3)}, ${high.toFixed(3)}] (ŷ=${predictor.toFixed(3)} ` +
        `±${radius.toFixed(3)}, ${Math.round((1 - a) * 100)}% two-sided band, ` +
        `N=${n}, k=${k})`
      : null,
  };
}

/**
 * Apply the drift gates to the accuracy history. Precedence (NOT a flat OR):
 *   • FLOOR  — always-on absolute-safety backstop; always folds into
 *     `drifted`.
 *   • DRIFT signal — CONFORMAL when applicable (authoritative, R4-P1-8),
 *     else SLOPE (cold-start fallback). Never both: when conformal is
 *     applicable, slope is computed for context but does NOT fold into
 *     `drifted`. `primaryGate` reports which was authoritative.
 * Returns a structured verdict. Pure.
 *
 * @param {Array<{ts:number,accuracy:number}>} history - chronological
 * @param {number} latestAccuracy
 */
export function detectDrift(history, latestAccuracy, opts = {}) {
  const windowWeeks = opts.windowWeeks ?? DRIFT_WINDOW_WEEKS;
  const slopeThreshold = opts.slopeThreshold ?? DRIFT_SLOPE_THRESHOLD;
  const floor = opts.absoluteFloor ?? DRIFT_ABSOLUTE_FLOOR;
  const conformalAlpha = opts.conformalAlpha ?? DEFAULT_CONFORMAL_ALPHA;

  const window = history.slice(-windowWeeks);
  const slope = regressionSlopeOverWindow(window);
  const conformal = conformalDriftGate(window, latestAccuracy, conformalAlpha);

  const slopeTripped = window.length >= 2 && slope < slopeThreshold;
  const floorTripped = Number.isFinite(latestAccuracy) && latestAccuracy < floor;
  const conformalTripped = conformal.tripped;

  // Precedence: conformal supersedes slope when applicable; floor is an
  // always-on backstop orthogonal to the drift detector.
  const primaryGate = conformal.applicable ? "conformal" : "slope+floor";
  const driftSignalTripped = conformal.applicable ? conformalTripped : slopeTripped;
  const drifted = driftSignalTripped || floorTripped;

  const reasons = [];
  if (conformalTripped) reasons.push(conformal.reason);
  if (!conformal.applicable && slopeTripped) {
    reasons.push(`slope ${slope.toFixed(3)} < threshold ${slopeThreshold} over ${window.length}-week window`);
  }
  if (floorTripped) reasons.push(`latest accuracy ${latestAccuracy.toFixed(3)} < floor ${floor}`);

  return {
    drifted,
    primaryGate,
    conformalTripped,
    slopeTripped,
    floorTripped,
    slope,
    conformal,
    windowSize: window.length,
    latestAccuracy,
    threshold: { slope: slopeThreshold, floor, conformalAlpha },
    reasons,
    // R4-P1-8 implemented: conformal-prediction-set membership gate is live
    // and authoritative whenever applicable. `conformal.applicable===false`
    // means cold-start (insufficient calibration) — slope+floor governed.
    conformalUpgradeAvailable: conformal.applicable,
  };
}

/**
 * Canonical non-drift verdict for a run where NO real evaluation happened
 * (unseeded corpus / unwired reviewer — runEval reason !== "evaluated").
 * Shape-compatible with `detectDrift` so `renderHuman`/`runDriftEval`
 * consumers need no special-casing. Drift detection on the accuracy=0
 * sentinel would be a confident false alarm, so we report `drifted:false`
 * with an explicit `skipped` reason instead. Pure.
 *
 * @param {number} windowSize - prior-window row count (informational)
 * @param {string} evalReason - the runEval reason that suppressed eval
 */
export function skippedDriftVerdict(windowSize, evalReason) {
  return {
    drifted: false,
    primaryGate: "n/a (not evaluated)",
    conformalTripped: false,
    slopeTripped: false,
    floorTripped: false,
    slope: 0,
    // Delegate to the canonical inapplicable() shape so this can never
    // silently drift from conformalDriftGate's return contract.
    conformal: conformalDriftGate([], NaN),
    windowSize,
    latestAccuracy: NaN,
    threshold: {
      slope: DRIFT_SLOPE_THRESHOLD,
      floor: DRIFT_ABSOLUTE_FLOOR,
      conformalAlpha: DEFAULT_CONFORMAL_ALPHA,
    },
    reasons: [`drift detection skipped — no evaluation this run (${evalReason})`],
    conformalUpgradeAvailable: false,
  };
}

// ── HISTORY ──────────────────────────────────────────────────────────────────

/**
 * Read the JSONL accuracy history. Each line: {ts, accuracy, ran, correct,
 * reason}. Malformed lines are skipped (graceful). Returns chronologically
 * ordered array.
 */
export function loadHistory(historyPath) {
  if (!existsSync(historyPath)) return [];
  try {
    const lines = readFileSync(historyPath, "utf-8").split("\n").filter(Boolean);
    const out = [];
    for (const ln of lines) {
      try {
        const r = JSON.parse(ln);
        if (r && Number.isFinite(r.accuracy) && Number.isFinite(r.ts)) out.push(r);
      } catch { /* skip malformed line */ }
    }
    return out.sort((a, b) => a.ts - b.ts);
  } catch {
    return [];
  }
}

/**
 * Append one history row via atomic read-rewrite (the file is small —
 * 1 row/week — so a full rewrite is cheap and avoids torn appends).
 */
export function appendHistory(historyPath, row, existing) {
  try { mkdirSync(path.dirname(historyPath), { recursive: true }); } catch { /* ignore */ }
  const all = [...(existing ?? []), row];
  const body = all.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const tmp = `${historyPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, body, "utf-8");
    renameSync(tmp, historyPath);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

// ── ORCHESTRATION ────────────────────────────────────────────────────────────

/**
 * Full weekly run: load corpus → eval → load history → detect drift →
 * append history row. Returns a stats object; never throws (errors surface
 * in the `error` field).
 */
export async function runDriftEval(opts = {}) {
  const paths = resolvePaths(opts);
  const nowMs = opts.nowMs ?? Date.now();

  const corpus = loadCorpus(paths.corpusPath);
  if (!corpus.ok) {
    return {
      schemaVersion: SCHEMA_VERSION,
      ok: false,
      error: corpus.reason,
      errorDetail: corpus.errors,
      corpusPath: paths.corpusPath,
    };
  }

  const evalResult = await runEval(corpus.entries, opts);
  const history = loadHistory(paths.historyPath);
  // Only run the drift detector against a REAL evaluation. When the corpus
  // is unseeded or the reviewer is unwired, runEval returns accuracy=0 with
  // reason!=="evaluated" — feeding that sentinel into detectDrift makes the
  // conformal/floor gates scream a confident false "DRIFTED" on every
  // cold-start week (the default state until an operator seeds the corpus).
  // Mirror the append guard (below): no evaluation → no drift verdict.
  const windowWeeks = opts.windowWeeks ?? DRIFT_WINDOW_WEEKS;
  const drift = evalResult.reason === "evaluated"
    ? detectDrift(history, evalResult.accuracy, opts)
    : skippedDriftVerdict(history.slice(-windowWeeks).length, evalResult.reason);

  const historyRow = {
    schemaVersion: SCHEMA_VERSION,
    ts: nowMs,
    iso: new Date(nowMs).toISOString(),
    accuracy: evalResult.accuracy,
    ran: evalResult.ran,
    correct: evalResult.correct,
    reason: evalResult.reason,
    modelMismatch: evalResult.modelMismatch,
    promptDriftDetected: evalResult.promptDriftDetected,
    drifted: drift.drifted,
  };

  // Only append a history row when there's a real evaluation — an unseeded
  // corpus or unwired reviewer shouldn't pollute the accuracy trend.
  let appended = false;
  if (!opts.dryRun && evalResult.reason === "evaluated") {
    appendHistory(paths.historyPath, historyRow, history);
    appended = true;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAtMs: nowMs,
    ok: true,
    corpus: {
      total: corpus.entries.length,
      seeded: corpus.seededCount,
      expectedSize: EXPECTED_CORPUS_SIZE,
      reason: corpus.reason,
      validationErrors: corpus.errors,
    },
    eval: {
      ran: evalResult.ran,
      correct: evalResult.correct,
      accuracy: evalResult.accuracy,
      reason: evalResult.reason,
      modelMismatch: evalResult.modelMismatch,
      promptDriftDetected: evalResult.promptDriftDetected,
      pinnedModel: PINNED_REVIEWER_MODEL,
    },
    drift,
    history: { rows: history.length, appended, row: appended ? historyRow : null },
    dryRun: Boolean(opts.dryRun),
    paths,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export function renderHuman(r) {
  if (!r.ok) {
    return `[b9-drift-eval] ERROR ${r.error}` + (r.errorDetail?.length ? `\n  ${r.errorDetail.join("\n  ")}` : "");
  }
  const lines = [
    `[b9-drift-eval] corpus=${r.corpus.seeded}/${r.corpus.total} seeded (${r.corpus.reason})`,
    `  eval: ${r.eval.correct}/${r.eval.ran} correct  accuracy=${r.eval.accuracy.toFixed(3)}  (${r.eval.reason})`,
    `  model: pinned=${r.eval.pinnedModel}  mismatch=${r.eval.modelMismatch}  prompt-drift=${r.eval.promptDriftDetected}`,
    `  drift: ${r.drift.drifted ? "⚠ DRIFTED" : "ok"}  primary=${r.drift.primaryGate}  slope=${r.drift.slope.toFixed(3)}  window=${r.drift.windowSize}`,
    r.drift.conformal.applicable
      ? `  conformal: band=[${r.drift.conformal.low.toFixed(3)}, ${r.drift.conformal.high.toFixed(3)}]  ŷ=${r.drift.conformal.predictor.toFixed(3)}  N=${r.drift.conformal.n}  k=${r.drift.conformal.rankUsed}${r.drift.conformal.aboveBand ? "  (latest ABOVE band — improvement)" : ""}`
      : r.drift.primaryGate.startsWith("n/a")
        ? `  conformal: n/a (run not evaluated — no drift verdict)`
        : (() => {
            const a = r.drift.threshold?.conformalAlpha ?? DEFAULT_CONFORMAL_ALPHA;
            const minN = Math.ceil(1 / a) - 1;   // engine MIN_CALIBRATION_FOR_ALPHA
            return `  conformal: n/a (cold-start, N=${r.drift.conformal.n} calibration rows < ${minN} for α=${a}; slope+floor authoritative)`;
          })(),
  ];
  for (const reason of r.drift.reasons) lines.push(`    - ${reason}`);
  lines.push(`  history: ${r.history.rows} row(s)${r.history.appended ? " (+1 appended)" : ""}`);
  return lines.join("\n");
}

export async function runCli(argv, { stdout, stderr, ...injections } = {}) {
  const out = stdout ?? process.stdout;
  const err = stderr ?? process.stderr;
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) {
    err.write(`golf-reviewer-drift-eval: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (opts.help) {
    out.write([
      "usage: golf-reviewer-drift-eval [--json] [--dry-run] [--now ISO]",
      "                                 [--repo-root PATH] [--corpus PATH] [--history PATH]",
      "",
      "U-CLEANUP-B9 — weekly model-drift eval for the golf peer-commit reviewer.",
      "Runs the reviewer against a frozen corpus, tracks accuracy. Drift gate:",
      "split-conformal prediction-set membership (primary, R4-P1-8) once",
      "calibration is sufficient, else regression slope (-0.20/12wk cold-start",
      "fallback); absolute floor (0.70) is an always-on safety backstop.",
      "",
    ].join("\n"));
    return 2;
  }
  let r;
  try {
    r = await runDriftEval({ ...opts, ...injections });
  } catch (e) {
    err.write(`golf-reviewer-drift-eval: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
  if (!r.ok) {
    err.write(renderHuman(r) + "\n");
    return 1;
  }
  if (opts.json) {
    out.write(JSON.stringify(r, null, 2) + "\n");
  } else {
    out.write(renderHuman(r) + "\n");
  }
  return 0;
}

// ── ENTRY ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  runCli(process.argv.slice(2)).then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`golf-reviewer-drift-eval: fatal: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
      process.exit(1);
    });
}
