// scripts/lib/rtk-fraction-tune.mjs — pure-function lib
//
// PSN-RTK-ADOPTION-MEASURE/U-RAM02 (2026-05-24, slot:alpha)
//
// Reads the rtk-adoption-measure.jsonl ledger and produces a tuned
// RTK_SAVINGS_FRACTION table that blends the current static values
// with the empirically observed p50 of (observed_tokens / NOMINAL_VERBOSE_TOKENS)
// per base command. Used to replace the static FRACTIONS table in
// .claude/hooks/posttool-rtk-adoption-measure.mjs once enough samples exist.
//
// Pure — no I/O, no side effects. The hook integration is a follow-up unit.
//
// Exports:
//   parseAdoptionLedger(text) → {byBase: Map<string, Array<{observed_tokens, est_tokens}>>}
//   computeP50Fraction(samples) → number   (median of observed_tokens / NOMINAL_VERBOSE_TOKENS)
//   tuneFractions(currentTable, ledgerText, opts?) → newTable
//
// Conventions:
//   - NOMINAL_VERBOSE_TOKENS = 1000 (matches the hook's heuristic baseline)
//   - blendWeight is the WEIGHT GIVEN TO THE EMPIRICAL p50.
//     new = current * (1 - w) + p50 * w
//     blendWeight=0.3 → 70% trust the prior, 30% learn from samples (anti-overreact).
//   - minSamples is a hard floor: bases below it inherit the current value unchanged.
//   - Output fractions are clamped to [0.05, 0.99] to keep the hook's est_tokens
//     well-behaved (the hook multiplies NOMINAL_VERBOSE_TOKENS by the fraction).
//   - Fail-soft on malformed JSON lines, missing fields, non-finite numbers.

export const NOMINAL_VERBOSE_TOKENS = 1000;
const FRACTION_MIN = 0.05;
const FRACTION_MAX = 0.99;

/**
 * Parse newline-delimited JSON adoption-ledger text.
 *
 * Each line is expected to look like:
 *   {"ts":"...","kind":"measured","base":"git","est_tokens":700,
 *    "observed_bytes":2800,"observed_tokens":700,"delta_pct":0,
 *    "classification":"on-target"}
 *
 * Lines missing `base` or with non-finite `observed_tokens` are silently
 * skipped. Lines without `est_tokens` are still indexed (the tuner does not
 * actually need est_tokens for the p50 computation — it normalises against
 * NOMINAL_VERBOSE_TOKENS — but we keep est_tokens in the per-sample object so
 * downstream consumers can audit the original heuristic estimate).
 */
export function parseAdoptionLedger(text) {
  const byBase = new Map();
  if (typeof text !== "string" || text.length === 0) return { byBase };

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // fail-soft on bad JSON
    }
    if (!obj || typeof obj !== "object") continue;
    const base = typeof obj.base === "string" ? obj.base.toLowerCase() : null;
    if (!base) continue;
    const observed_tokens = Number(obj.observed_tokens);
    if (!Number.isFinite(observed_tokens) || observed_tokens < 0) continue;
    const est_tokens = Number.isFinite(Number(obj.est_tokens))
      ? Number(obj.est_tokens)
      : null;
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push({ observed_tokens, est_tokens });
  }
  return { byBase };
}

/**
 * Median of the per-sample fraction observed_tokens / NOMINAL_VERBOSE_TOKENS.
 *
 * Median (p50) is used rather than the mean because a single very-quiet or
 * very-noisy command should not yank the table. Returns NaN for empty input
 * so callers can branch — tuneFractions() uses this to skip a base.
 *
 * For even-length sample sets we take the lower-mid value (deterministic
 * across platforms and identical to numpy's `lower` interpolation). This
 * keeps the function pure-integer-arithmetic-free of float-comparison drift.
 */
export function computeP50Fraction(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return NaN;
  const ratios = [];
  for (const s of samples) {
    if (!s || typeof s !== "object") continue;
    const obs = Number(s.observed_tokens);
    if (!Number.isFinite(obs) || obs < 0) continue;
    ratios.push(obs / NOMINAL_VERBOSE_TOKENS);
  }
  if (ratios.length === 0) return NaN;
  ratios.sort((a, b) => a - b);
  // lower-median for even-length (deterministic) — matches our hand-worked
  // test expectations and avoids float-equality fragility on (a+b)/2.
  const mid = Math.floor((ratios.length - 1) / 2);
  return ratios[mid];
}

function clampFraction(x) {
  if (!Number.isFinite(x)) return null;
  if (x < FRACTION_MIN) return FRACTION_MIN;
  if (x > FRACTION_MAX) return FRACTION_MAX;
  return x;
}

/**
 * Produce a tuned fraction table by blending the current static values with
 * the empirically observed p50 fractions per base. Pure: returns a new object,
 * never mutates the input.
 *
 *   - For each base in currentTable, if the ledger has ≥minSamples valid
 *     entries for that base, blend: new = cur*(1-w) + p50*w
 *   - Bases below minSamples keep their current value unchanged.
 *   - Bases that appear in the ledger but NOT in currentTable are ignored —
 *     adding a new base is a deliberate schema change, not a tuning event.
 *   - blendWeight is clamped to [0, 1].
 *   - Result fractions are clamped to [FRACTION_MIN, FRACTION_MAX].
 *
 * On malformed inputs (non-object table, non-string ledger text), returns a
 * shallow copy of currentTable so callers can swap unconditionally.
 */
export function tuneFractions(currentTable, ledgerText, opts = {}) {
  const out = {};
  if (!currentTable || typeof currentTable !== "object") return out;
  for (const k of Object.keys(currentTable)) out[k] = currentTable[k];

  if (typeof ledgerText !== "string" || ledgerText.length === 0) return out;

  const minSamples = Number.isFinite(opts.minSamples)
    ? Math.max(1, Math.floor(opts.minSamples))
    : 5;
  let blendWeight = Number.isFinite(opts.blendWeight) ? opts.blendWeight : 0.3;
  if (blendWeight < 0) blendWeight = 0;
  if (blendWeight > 1) blendWeight = 1;

  const { byBase } = parseAdoptionLedger(ledgerText);

  for (const base of Object.keys(currentTable)) {
    const cur = Number(currentTable[base]);
    if (!Number.isFinite(cur)) continue;
    const samples = byBase.get(base);
    if (!samples || samples.length < minSamples) continue;
    const p50 = computeP50Fraction(samples);
    if (!Number.isFinite(p50)) continue;
    const blended = cur * (1 - blendWeight) + p50 * blendWeight;
    const clamped = clampFraction(blended);
    if (clamped == null) continue;
    out[base] = clamped;
  }
  return out;
}
