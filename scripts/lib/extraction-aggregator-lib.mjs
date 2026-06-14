// scripts/lib/extraction-aggregator-lib.mjs
//
// U-TDP03 — Extraction Aggregator (pure core).
//
// Consumes the events JSONL produced by U-TDP01/U-TDP02 (and the MS1 hook)
// and aggregates extractions into per-part_class LEARNED TEMPLATES. The
// templates carry: feature prevalence, dimension distribution (mean ± stddev
// + min/max), and tolerance-band distribution per feature kind.
//
// These learned templates are the "training output" of the print-reading
// phase: they capture what the corpus ACTUALLY shows across classes, not
// what hand-tuned heuristics assert. Operators review + blend with the
// hand-tuned baseline via the existing cad_corpus_apply_learned action.
//
// PURE: no fs. Caller passes the events array + opts; returns template
// aggregates + summary. CLI shell does the JSONL read.
//
// ML rigor:
//   1. Stratified by part_class (every aggregate is per-class — no leakage
//      across classes).
//   2. No train/test split here (this IS the training pass; the val/test
//      split happens downstream in GroundTruthValidationEngine).
//   3. Tolerance bands computed as upper-lower (NOT absolute |upper|+|lower|)
//      so bilateral and unilateral tolerances are correctly distinguished.
//   4. NaN/Infinity guards on every numeric ingest — corrupt extractions
//      contribute zero to stats rather than poisoning the mean.
//   5. Welford's algorithm for online mean/variance — numerically stable
//      with single-pass over the event stream (no precision loss on 24K+ runs).

/** Event types the aggregator looks at. */
export const AGGREGATABLE_EVENT_TYPES = Object.freeze(["outcome_record"]);

/** Default minimum n_samples to emit a feature aggregate (avoid spurious low-n stats). */
export const DEFAULT_MIN_SAMPLES_PER_FEATURE = 3;

/**
 * Welford's online algorithm for mean + variance. Numerically stable across
 * many samples. Returns a NEW state — input is not mutated.
 *
 * @param {{n: number, mean: number, m2: number, min: number, max: number}} state
 * @param {number} value
 * @returns {{n: number, mean: number, m2: number, min: number, max: number}}
 */
export function welfordUpdate(state, value) {
  if (!Number.isFinite(value)) return state;
  const n = state.n + 1;
  const delta = value - state.mean;
  const mean = state.mean + delta / n;
  const delta2 = value - mean;
  const m2 = state.m2 + delta * delta2;
  const min = state.n === 0 ? value : Math.min(state.min, value);
  const max = state.n === 0 ? value : Math.max(state.max, value);
  return { n, mean, m2, min, max };
}

/** Fresh empty Welford state. */
export function welfordInit() {
  return { n: 0, mean: 0, m2: 0, min: 0, max: 0 };
}

/**
 * Finalize Welford state into a reportable distribution object. Variance
 * computed as m2/(n-1) (sample variance), zero when n<2.
 *
 * @param {{n: number, mean: number, m2: number, min: number, max: number}} state
 * @returns {{n: number, mean: number, stddev: number, min: number, max: number}}
 */
export function welfordFinalize(state) {
  const variance = state.n > 1 ? state.m2 / (state.n - 1) : 0;
  return {
    n: state.n,
    mean: state.n > 0 ? state.mean : 0,
    stddev: Math.sqrt(Math.max(variance, 0)),
    min: state.n > 0 ? state.min : 0,
    max: state.n > 0 ? state.max : 0,
  };
}

/**
 * Extract feature samples from a single extraction object. Tolerant of
 * varied shapes (the BlueprintExtraction shape from MS1-U7 has
 * `dimensions: [{kind?, nominal, tolerance?: {upper, lower}}]` and may
 * have `features: [{kind, ...}]` at the top level).
 *
 * @param {object|null|undefined} extraction
 * @returns {Array<{kind: string, nominal?: number, tolerance_band?: number}>}
 */
export function extractFeatureSamples(extraction) {
  if (!extraction || typeof extraction !== "object") return [];
  const out = [];
  // dimensions[] — typical OCR output: {id, kind?, type?, nominal, tolerance?: {upper, lower}}
  if (Array.isArray(extraction.dimensions)) {
    for (const d of extraction.dimensions) {
      if (!d || typeof d !== "object") continue;
      const kind = typeof d.kind === "string" && d.kind
        ? d.kind
        : (typeof d.type === "string" && d.type ? d.type : "unspecified_dim");
      const nominal = Number(d.nominal);
      const sample = { kind };
      if (Number.isFinite(nominal)) sample.nominal = nominal;
      if (d.tolerance && typeof d.tolerance === "object") {
        const upper = Number(d.tolerance.upper);
        const lower = Number(d.tolerance.lower);
        if (Number.isFinite(upper) && Number.isFinite(lower)) {
          sample.tolerance_band = upper - lower;
        }
      }
      out.push(sample);
    }
  }
  // features[] — explicit features (less common but used in some RAG outputs)
  if (Array.isArray(extraction.features)) {
    for (const f of extraction.features) {
      if (!f || typeof f !== "object" || typeof f.kind !== "string") continue;
      const sample = { kind: f.kind };
      const size = Number(f.typical_size_mm ?? f.size_mm ?? f.nominal);
      if (Number.isFinite(size)) sample.nominal = size;
      out.push(sample);
    }
  }
  return out;
}

/**
 * Aggregate a list of events into per-class learned-template stats.
 *
 * @param {Array<object>} events — outcome_record events from the consumer pipeline
 * @param {{minSamplesPerFeature?: number, now?: () => string}} [opts]
 * @returns {{
 *   schemaVersion: number,
 *   generatedAt: string,
 *   eventsConsumed: number,
 *   classes: Array<{
 *     part_class: string,
 *     n_samples: number,
 *     features: Array<{
 *       kind: string,
 *       evidence_count: number,
 *       prevalence: number,
 *       dimension_distribution: {n: number, mean: number, stddev: number, min: number, max: number},
 *       tolerance_distribution: {n: number, mean: number, stddev: number, min: number, max: number}
 *     }>
 *   }>,
 *   summary: object
 * }}
 */
export function aggregateExtractions(events, opts = {}) {
  const minSamples = Number.isFinite(Number(opts.minSamplesPerFeature)) && Number(opts.minSamplesPerFeature) >= 1
    ? Math.floor(Number(opts.minSamplesPerFeature))
    : DEFAULT_MIN_SAMPLES_PER_FEATURE;
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();

  // perClass: Map<part_class, { n_samples, perFeature: Map<kind, {count, dimWelford, tolWelford}> }>
  const perClass = new Map();
  let eventsConsumed = 0;
  let skipped = { type: 0, no_payload: 0, no_class: 0, no_extraction: 0 };

  for (const ev of Array.isArray(events) ? events : []) {
    if (!ev || typeof ev !== "object") { skipped.type++; continue; }
    if (!AGGREGATABLE_EVENT_TYPES.includes(ev.type)) { skipped.type++; continue; }
    const payload = ev.payload;
    if (!payload || typeof payload !== "object") { skipped.no_payload++; continue; }
    const partClass = typeof payload.part_class === "string" && payload.part_class
      ? payload.part_class
      : null;
    if (!partClass) { skipped.no_class++; continue; }

    // Initialize per-class bucket if first encounter.
    if (!perClass.has(partClass)) {
      perClass.set(partClass, { n_samples: 0, perFeature: new Map() });
    }
    const bucket = perClass.get(partClass);
    bucket.n_samples += 1;

    // The extraction object lives at payload.extracted (operator_correction shape)
    // or payload.extraction (training-driver shape). Try both.
    const extraction = payload.extracted ?? payload.extraction ?? null;
    if (!extraction) { skipped.no_extraction++; continue; }

    eventsConsumed += 1;
    const featureSamples = extractFeatureSamples(extraction);
    // Track which feature kinds appeared in THIS extraction (for prevalence).
    const kindsInThisExtraction = new Set();
    for (const fs of featureSamples) {
      kindsInThisExtraction.add(fs.kind);
      if (!bucket.perFeature.has(fs.kind)) {
        bucket.perFeature.set(fs.kind, {
          count: 0,
          dimWelford: welfordInit(),
          tolWelford: welfordInit(),
        });
      }
      const fb = bucket.perFeature.get(fs.kind);
      if (Number.isFinite(fs.nominal)) {
        fb.dimWelford = welfordUpdate(fb.dimWelford, fs.nominal);
      }
      if (Number.isFinite(fs.tolerance_band)) {
        fb.tolWelford = welfordUpdate(fb.tolWelford, fs.tolerance_band);
      }
    }
    // Prevalence counts: increment EACH unique kind seen this extraction (one
    // increment per extraction even if the same kind shows multiple dimensions).
    for (const kind of kindsInThisExtraction) {
      bucket.perFeature.get(kind).count += 1;
    }
  }

  // Materialize the report.
  const classes = [];
  for (const [partClass, bucket] of perClass.entries()) {
    const features = [];
    for (const [kind, fb] of bucket.perFeature.entries()) {
      if (fb.count < minSamples) continue;
      features.push({
        kind,
        evidence_count: fb.count,
        prevalence: bucket.n_samples > 0 ? fb.count / bucket.n_samples : 0,
        dimension_distribution: welfordFinalize(fb.dimWelford),
        tolerance_distribution: welfordFinalize(fb.tolWelford),
      });
    }
    // Sort features by prevalence descending — operator review priority.
    features.sort((a, b) => b.prevalence - a.prevalence);
    classes.push({ part_class: partClass, n_samples: bucket.n_samples, features });
  }
  // Sort classes by n_samples descending — operator focuses on big classes first.
  classes.sort((a, b) => b.n_samples - a.n_samples);

  return {
    schemaVersion: 1,
    generatedAt: now(),
    eventsConsumed,
    classes,
    summary: {
      classCount: classes.length,
      eventsConsumed,
      skipped,
      minSamplesPerFeature: minSamples,
    },
  };
}

/**
 * Parse a JSONL blob into events. Mirrors the consumer-lib parser (kept
 * separate to avoid coupling — aggregator and consumer can evolve independently).
 *
 * @param {string} blob
 * @returns {Array<object>}
 */
export function parseJsonl(blob) {
  if (typeof blob !== "string" || !blob.length) return [];
  const out = [];
  for (const line of blob.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) out.push(obj);
    } catch {
      // skip malformed lines — fail-soft
    }
  }
  return out;
}

/**
 * Compute a divergence score between a learned template and a hand-tuned
 * baseline template. Operators use this to decide which learned features
 * are trustworthy enough to blend.
 *
 * Returns per-feature divergence: |learned.prevalence - baseline.prevalence|.
 *
 * @param {{features: Array<{kind: string, prevalence: number}>}} learned
 * @param {{features: Array<{kind: string, prevalence: number}>}} baseline
 * @returns {{matched: Array<{kind: string, learned_prev: number, baseline_prev: number, divergence: number}>, only_in_learned: string[], only_in_baseline: string[]}}
 */
export function templateDivergence(learned, baseline) {
  const lf = (learned && Array.isArray(learned.features)) ? learned.features : [];
  const bf = (baseline && Array.isArray(baseline.features)) ? baseline.features : [];
  const lmap = new Map(lf.map((f) => [f.kind, f]));
  const bmap = new Map(bf.map((f) => [f.kind, f]));
  const matched = [];
  const only_in_learned = [];
  const only_in_baseline = [];
  for (const [kind, learnedF] of lmap.entries()) {
    if (bmap.has(kind)) {
      const baselineF = bmap.get(kind);
      const lp = Number(learnedF.prevalence) || 0;
      const bp = Number(baselineF.prevalence) || 0;
      matched.push({ kind, learned_prev: lp, baseline_prev: bp, divergence: Math.abs(lp - bp) });
    } else {
      only_in_learned.push(kind);
    }
  }
  for (const kind of bmap.keys()) {
    if (!lmap.has(kind)) only_in_baseline.push(kind);
  }
  // Sort matched by divergence descending — biggest disagreements top of list.
  matched.sort((a, b) => b.divergence - a.divergence);
  return { matched, only_in_learned, only_in_baseline };
}
