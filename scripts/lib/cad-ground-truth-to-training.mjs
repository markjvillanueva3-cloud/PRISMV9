/**
 * cad-ground-truth-to-training.mjs -- pure converter: delta's CAD class-prototype GROUND-TRUTH
 * catalogs -> Alpaca CAD-generation training pairs (U-CAD-GT-FEATURE-PRIORS, slot:india 2026-06-11).
 * The POSITIVE-signal sibling of [[cad-fix-ledger-to-training]] (which converts NEGATIVE corrections).
 *
 * THE DORMANCY THIS CLOSES: `scripts/derive-ground-truth-from-cad.mjs` already mined
 * `cad-corpus-step-geometry-report.json` (662/665 JM-Die STEP files) into 11 per-class GT catalogs
 * at `state/shared/ocr-ground-truth/cad-prototype-<class>-*.json` -- each lists, per part_class, the
 * geometric features that class reliably exhibits, ranked by evidence_ratio (= fraction of corpus
 * parts of that class carrying the feature). But ONLY 5 of the 11 classes ever reached the
 * CAD-generation training signal (via the fix-ledger's negative corrections); the other 6
 * (blisk/bushing/general/impeller/shaft/valve_body) and the full POSITIVE prior were dormant. This
 * converts every GT catalog into a durable class->feature prior the CAD generator can learn: "a part
 * classified as <class> SHOULD include features [...]". Registered as a fleet LoRA source so the
 * assembler folds it into the corpus the CAD-gen fine-tune consumes -- the print->CAD accuracy lever.
 *
 * GROUNDED (R12, no fabrication): the catalog shape is the REAL artifact --
 *   { schemaVersion, part_class, prints:[ { pdf_path, cad_source, dimensions:[
 *       { kind, presence_only, evidence_count, evidence_ratio } ] } ], ... }
 * All dimensions are presence_only (feature PRESENCE, not values), so the signal is correctly
 * "which features this class requires", never a fabricated dimension/tolerance.
 *
 * TRUST: deterministically extracted from corpus evidence (not hand-authored doctrine) -> the fleet
 * assembler registers this advisory (0.5 weight). Pure -> hermetically testable, no fs/process.
 */

export const TIER_CORE = 0.7;   // present in >=70% of corpus parts of the class
export const TIER_COMMON = 0.5; // present in >=50%

/** Evidence tier label for a presence ratio. */
export function featureTier(ratio) {
  if (!Number.isFinite(ratio)) return "occasional";
  if (ratio >= TIER_CORE) return "core";
  if (ratio >= TIER_COMMON) return "common";
  return "occasional";
}

/**
 * Aggregate the feature dimensions across all prints of a catalog: dedup by `kind`, keeping the
 * HIGHEST evidence_ratio seen (and its evidence_count). Returns a list sorted by ratio descending.
 * Rejects malformed dimension entries (no kind / non-finite ratio) rather than emitting noise.
 */
export function aggregateFeatures(artifact) {
  if (!artifact || typeof artifact !== "object") return [];
  const prints = Array.isArray(artifact.prints) ? artifact.prints : [];
  const byKind = new Map();
  for (const pr of prints) {
    const dims = pr && Array.isArray(pr.dimensions) ? pr.dimensions : [];
    for (const d of dims) {
      if (!d || typeof d !== "object") continue;
      const kind = typeof d.kind === "string" && d.kind.trim() ? d.kind.trim() : null;
      const ratio = Number(d.evidence_ratio);
      if (!kind || !Number.isFinite(ratio)) continue;
      const count = Number.isFinite(Number(d.evidence_count)) ? Number(d.evidence_count) : null;
      const prev = byKind.get(kind);
      if (!prev || ratio > prev.evidence_ratio) {
        byKind.set(kind, { kind, evidence_ratio: ratio, evidence_count: count });
      }
    }
  }
  return [...byKind.values()].sort((a, b) => b.evidence_ratio - a.evidence_ratio);
}

/** Format a ratio as a stable 2-decimal string (deterministic; no locale drift). */
function r2(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Convert one GT catalog -> Alpaca CAD-gen training pairs:
 *   1. ONE class-level pair: the full evidence-ranked feature prior for the part_class.
 *   2. ONE per-feature pair for each feature at/above `minPerFeatureRatio` (default TIER_COMMON):
 *      a high-confidence "this feature is expected for this class" signal. Lower-confidence
 *      features still appear in the class-level list (graded), but do NOT get a standalone
 *      "required" pair -- teaching false certainty would poison the generator (R9: intent-true).
 * Returns [] when the artifact has no part_class or no usable features.
 */
export function gtArtifactToTrainingPairs(artifact, opts = {}) {
  if (!artifact || typeof artifact !== "object") return [];
  const partClass = typeof artifact.part_class === "string" && artifact.part_class.trim()
    ? artifact.part_class.trim()
    : null;
  if (!partClass) return [];
  const minPerFeature = Number.isFinite(Number(opts.minPerFeatureRatio))
    ? Number(opts.minPerFeatureRatio)
    : TIER_COMMON;

  const feats = aggregateFeatures(artifact);
  if (feats.length === 0) return [];

  const pairs = [];

  // 1. Class-level prior (the full graded feature set).
  const ranked = feats
    .map((f) => `"${f.kind}" (${featureTier(f.evidence_ratio)}, evidence ${r2(f.evidence_ratio)})`)
    .join("; ");
  pairs.push({
    instruction: `CAD generation from print -- a part classified as "${partClass}". List the geometric features the generated CAD model should include, ranked by how reliably this part class exhibits them (from STEP-corpus evidence).`,
    output: `A "${partClass}" part typically includes: ${ranked}. Core/common features are required; occasional features depend on the specific print.`,
  });

  // 2. Per-feature high-confidence pairs.
  for (const f of feats) {
    if (f.evidence_ratio < minPerFeature) continue;
    const tier = featureTier(f.evidence_ratio);
    const cnt = f.evidence_count != null ? `present in ${f.evidence_count} corpus parts, ` : "";
    pairs.push({
      instruction: `CAD generation from print -- "${partClass}" part. Should the regenerated model include the "${f.kind}" feature?`,
      output: `Yes -- "${f.kind}" is a ${tier} feature of "${partClass}" parts (${cnt}evidence_ratio ${r2(f.evidence_ratio)}). The generator should model it for this class.`,
    });
  }

  return pairs;
}

/**
 * Convert many GT catalogs -> a deduped pair list (dedup by instruction; first-seen wins, so a
 * re-run over the same catalogs is byte-stable). `artifacts` is an array of parsed catalog objects.
 */
export function gtArtifactsToTrainingPairs(artifacts, opts = {}) {
  const seen = new Set();
  const out = [];
  for (const a of Array.isArray(artifacts) ? artifacts : []) {
    for (const pair of gtArtifactToTrainingPairs(a, opts)) {
      if (seen.has(pair.instruction)) continue;
      seen.add(pair.instruction);
      out.push(pair);
    }
  }
  return out;
}
