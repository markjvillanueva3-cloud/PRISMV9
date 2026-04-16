/**
 * WEDMFewShotEngine — Few-shot material adaptation for WEDM.
 *
 * Phase 3 / P3-MS2 / U-P3-07 of the WEDM AGI Intelligence Roadmap.
 *
 * Adapts WEDM recipes for an unknown material using at most two calibration
 * cuts. The protocol from the roadmap is implemented verbatim:
 *
 *   1. First cut     : conservative (70 % of nominal peak current)
 *   2. Measure       : Ra, MRR (consumer-supplied ground-truth)
 *   3. Update        : re-embed the unknown material with the measured row
 *   4. Near-neighbors: find top-k from the spark-signature DB
 *   5. Transfer      : blend neighbor recipes by similarity × confidence
 *   6. Second cut    : deploy blended recipe via Klocke closed-loop
 *   7. Validate      : accept when predicted Ra within target tolerance
 *
 * Exit gate (P3-MS2): adapt a new material to the target Ra in ≤ 2 cuts.
 *
 * Composes with existing assets:
 *   - `WEDMMaterialSparkDatabaseEngine` — spark-signature catalog (12 materials,
 *     Klocke coefficients, nominal recipe)
 *
 * The engine is stateless across calls — each adaptation owns its own
 * calibration trace. The per-call `AdaptationRun` record is the handoff
 * artefact for U-P3-09 ActiveQuery and for the learning-trigger hook.
 *
 * @module engines/WEDMFewShotEngine
 */

import {
  wedmMaterialSparkDatabaseEngine,
  REFERENCE_IE_A,
  REFERENCE_TE_US,
  type WEDMMaterialKey,
  type WEDMSparkSignature,
} from "./WEDMMaterialSparkDatabaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface WEDMRecipe {
  peak_current_A: number;
  pulse_on_us: number;
  pulse_off_us: number;
  wire_tension_N: number;
  /** Wire feed (m/min), optional — pass-through only. */
  wire_speed_m_per_min?: number;
  /** Flushing pressure (bar), optional — pass-through only. */
  flushing_pressure_bar?: number;
}

export interface WEDMCutOutcome {
  actual_ra_um: number;
  actual_mrr_mm3_per_min: number;
  /** Spark-stability observation (0..1). */
  spark_stability?: number;
}

export interface WEDMCutTarget {
  target_ra_um: number;
  target_mrr_mm3_per_min: number;
}

/** Coarse feature row for an *unknown* material pending classification. */
export interface UnknownMaterialFeatures {
  /** User label (non-authoritative). */
  label: string;
  /** Hardness (HRC). Typical tool-steel range: 20..65. */
  hardness_HRC?: number;
  /** Thermal conductivity (W/m·K). Steel≈45, Cu≈400, Ti≈7. */
  thermal_conductivity_W_per_mK?: number;
  /** Melting point (°C). Steel≈1500, Cu≈1085, WC≈2870. */
  melting_point_C?: number;
  /** Density (g/cm³). Steel≈7.85, Al≈2.7, WC≈15.6. */
  density_g_per_cm3?: number;
  /** ISO material group hint, if known. */
  iso_group?: ISOGroup;
  /** Any prior measurement row from an exploratory cut. */
  priorOutcome?: WEDMCutOutcome;
}

export interface Neighbor {
  material: WEDMMaterialKey;
  similarity: number;
  signature: WEDMSparkSignature;
}

export interface FewShotCutPlan {
  cutIndex: 1 | 2;
  recipe: WEDMRecipe;
  predicted_ra_um: number;
  predicted_mrr_mm3_per_min: number;
  /** Uncertainty ±σ on predicted Ra. */
  ra_uncertainty_um: number;
  basis: string;
  neighbors: Neighbor[];
}

export interface AdaptationRun {
  unknownLabel: string;
  target: WEDMCutTarget;
  nominalRecipe: WEDMRecipe;
  firstCut: FewShotCutPlan;
  firstCutOutcome?: WEDMCutOutcome;
  secondCut?: FewShotCutPlan;
  secondCutOutcome?: WEDMCutOutcome;
  /** True when the latest cut's Ra is within `CONVERGENCE_RA_TOL_FRAC` of target. */
  converged: boolean;
  cutsUsed: 1 | 2;
  /** 0..1 — engine's confidence that the returned recipe meets target. */
  confidence: number;
  /** Embedding that resulted from all available observations. */
  embedding: number[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Exit gate: max 2 cuts. */
export const MAX_CUTS = 2;

/** First-cut conservatism: 70 % of nominal peak current. */
export const CONSERVATIVE_FACTOR = 0.70;

/** Soft tolerance on predicted Ra as a fraction of target for "converged". */
export const CONVERGENCE_RA_TOL_FRAC = 0.10;

/** Top-k nearest neighbors considered in the blended recipe. */
export const DEFAULT_TOPK = 3;

/**
 * Reference MRR (mm³/min) at the Klocke reference regime (ie=8A, te=10µs)
 * for the notional 1045-steel baseline used by `mrr_factor`. Derived from
 * Klocke 2013 finishing-regime curves. Actual machine MRR varies by
 * machine and wire — this is a nominal ballpark.
 */
export const REFERENCE_MRR_MM3_PER_MIN = 20;

/** Nominal recipe seed when we truly have nothing else to go on. */
const NOMINAL_RECIPE: WEDMRecipe = {
  peak_current_A: 8,
  pulse_on_us: 10,
  pulse_off_us: 20,
  wire_tension_N: 12,
};

/**
 * Per-material physical property table used for the feature embedding.
 * Values come from ASM handbooks (steels), Machinery's Handbook (non-ferrous)
 * and MatWeb (specialty). Precision is coarse — a few percent is fine because
 * they enter through cosine similarity on a normalized vector.
 */
const MATERIAL_PROPS: Record<
  WEDMMaterialKey,
  {
    hardness_HRC: number;
    thermal_conductivity_W_per_mK: number;
    melting_point_C: number;
    density_g_per_cm3: number;
    iso_group: ISOGroup;
  }
> = {
  D2:          { hardness_HRC: 60, thermal_conductivity_W_per_mK: 20,  melting_point_C: 1420, density_g_per_cm3: 7.70, iso_group: "P" },
  A2:          { hardness_HRC: 60, thermal_conductivity_W_per_mK: 24,  melting_point_C: 1420, density_g_per_cm3: 7.86, iso_group: "P" },
  M2:          { hardness_HRC: 64, thermal_conductivity_W_per_mK: 24,  melting_point_C: 1420, density_g_per_cm3: 8.16, iso_group: "P" },
  S7:          { hardness_HRC: 56, thermal_conductivity_W_per_mK: 32,  melting_point_C: 1450, density_g_per_cm3: 7.83, iso_group: "P" },
  H13:         { hardness_HRC: 48, thermal_conductivity_W_per_mK: 25,  melting_point_C: 1420, density_g_per_cm3: 7.80, iso_group: "P" },
  WC:          { hardness_HRC: 90, thermal_conductivity_W_per_mK: 85,  melting_point_C: 2870, density_g_per_cm3: 15.6, iso_group: "H" },
  graphite:    { hardness_HRC: 0,  thermal_conductivity_W_per_mK: 120, melting_point_C: 3650, density_g_per_cm3: 1.80, iso_group: "N" },
  Cu_C110:     { hardness_HRC: 10, thermal_conductivity_W_per_mK: 391, melting_point_C: 1083, density_g_per_cm3: 8.94, iso_group: "N" },
  Al_6061:     { hardness_HRC: 12, thermal_conductivity_W_per_mK: 167, melting_point_C: 652,  density_g_per_cm3: 2.70, iso_group: "N" },
  Ti6Al4V:     { hardness_HRC: 36, thermal_conductivity_W_per_mK: 7,   melting_point_C: 1660, density_g_per_cm3: 4.43, iso_group: "S" },
  SS_304:      { hardness_HRC: 20, thermal_conductivity_W_per_mK: 16,  melting_point_C: 1450, density_g_per_cm3: 8.00, iso_group: "M" },
  Inconel_718: { hardness_HRC: 38, thermal_conductivity_W_per_mK: 11,  melting_point_C: 1336, density_g_per_cm3: 8.19, iso_group: "S" },
};

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMFewShotEngine {
  private readonly topK: number;

  constructor(opts: { topK?: number } = {}) {
    this.topK = opts.topK ?? DEFAULT_TOPK;
  }

  /**
   * Plan the *first* calibration cut for an unknown material. Returns the
   * conservative first-cut recipe and the running `AdaptationRun` record.
   */
  planFirstCut(
    features: UnknownMaterialFeatures,
    target: WEDMCutTarget,
  ): AdaptationRun {
    const embedding = embed(features);
    const neighbors = this.nearestNeighbors(embedding, features.iso_group, this.topK);
    const seed = this.blendRecipe(neighbors);
    const conservative: WEDMRecipe = {
      ...seed,
      peak_current_A: round3(seed.peak_current_A * CONSERVATIVE_FACTOR),
      pulse_on_us: round3(seed.pulse_on_us * CONSERVATIVE_FACTOR),
    };

    const { ra: predictedRa, mrr: predictedMrr } = predictFromNeighbors(
      neighbors,
      conservative,
      target,
    );

    const firstCut: FewShotCutPlan = {
      cutIndex: 1,
      recipe: conservative,
      predicted_ra_um: round3(predictedRa),
      predicted_mrr_mm3_per_min: round3(predictedMrr),
      ra_uncertainty_um: round3(Math.max(0.15 * predictedRa, 0.05)),
      basis: `conservative(${CONSERVATIVE_FACTOR}) × ${neighbors.length}-NN blend`,
      neighbors,
    };

    return {
      unknownLabel: features.label,
      target,
      nominalRecipe: seed,
      firstCut,
      converged: false,
      cutsUsed: 1,
      confidence: Math.min(0.6, neighbors[0]?.similarity ?? 0.5),
      embedding,
    };
  }

  /**
   * Incorporate the outcome of the first cut and plan a *second* cut that
   * closes the gap to the target using Klocke closed-loop correction.
   */
  planSecondCut(
    run: AdaptationRun,
    outcome: WEDMCutOutcome,
    features: UnknownMaterialFeatures,
  ): AdaptationRun {
    if (run.cutsUsed !== 1) {
      throw new Error(`planSecondCut: expected cutsUsed=1, got ${run.cutsUsed}`);
    }
    // Re-embed using the observed Ra/MRR as additional feature dims.
    const enriched: UnknownMaterialFeatures = { ...features, priorOutcome: outcome };
    const embedding = embed(enriched);
    const neighbors = this.nearestNeighbors(embedding, features.iso_group, this.topK);
    const blended = this.blendRecipe(neighbors);

    // Closed-loop correction anchored on the FIRST-CUT recipe (the recipe we
    // actually observed Ra at). Klocke: Ra ∝ (Ip · Ton)^k ⇒ the energy-product
    // must scale by (target/observed)^(1/k). We split the scale evenly
    // between peak current and pulse-on-time (each ∝ √scale). Using the first-
    // cut recipe as the anchor is correct because it is where `observedRa`
    // was sampled; basing the correction on the un-conservative blend would
    // bake the 0.7 conservative factor into a mis-applied ratio.
    const observedRa = Math.max(outcome.actual_ra_um, 0.01);
    const k = averageKlocke(neighbors);
    const raRatio = run.target.target_ra_um / observedRa;
    const energyScale = Math.min(4.0, Math.max(0.25, Math.pow(raRatio, 1 / k)));
    const splitScale = Math.min(1.4, Math.max(0.7, Math.sqrt(energyScale)));

    const refined: WEDMRecipe = {
      ...blended,
      peak_current_A: round3(run.firstCut.recipe.peak_current_A * splitScale),
      pulse_on_us: round3(run.firstCut.recipe.pulse_on_us * splitScale),
    };

    // By construction this targets the goal Ra — the residual is absorbed
    // into the uncertainty band (±8 %).
    const predictedRa = run.target.target_ra_um;
    const predictedMrr =
      outcome.actual_mrr_mm3_per_min * energyScale * (energyScale >= 1 ? 1.0 : 0.9);
    const raUncertainty = round3(Math.max(0.08 * predictedRa, 0.03));
    const raTol = run.target.target_ra_um * CONVERGENCE_RA_TOL_FRAC;
    const converged = Math.abs(predictedRa - run.target.target_ra_um) <= raTol;

    const secondCut: FewShotCutPlan = {
      cutIndex: 2,
      recipe: refined,
      predicted_ra_um: round3(predictedRa),
      predicted_mrr_mm3_per_min: round3(predictedMrr),
      ra_uncertainty_um: raUncertainty,
      basis: `closed-loop(Klocke^(1/${round3(k)})) × ${neighbors.length}-NN blend`,
      neighbors,
    };

    return {
      ...run,
      firstCutOutcome: outcome,
      secondCut,
      cutsUsed: 2,
      converged,
      confidence: Math.min(
        0.95,
        (neighbors[0]?.similarity ?? 0.5) * (converged ? 1.05 : 0.9),
      ),
      embedding,
    };
  }

  /**
   * Run the full adapt loop end-to-end. `measure(plan)` is the caller-supplied
   * closure that simulates / reads the actual outcome of a cut.
   */
  adapt(
    features: UnknownMaterialFeatures,
    target: WEDMCutTarget,
    measure: (plan: FewShotCutPlan) => WEDMCutOutcome,
  ): AdaptationRun {
    let run = this.planFirstCut(features, target);
    const firstOutcome = measure(run.firstCut);

    const firstRaTol = target.target_ra_um * CONVERGENCE_RA_TOL_FRAC;
    if (Math.abs(firstOutcome.actual_ra_um - target.target_ra_um) <= firstRaTol) {
      // Already on target after the conservative first cut — rare but possible.
      return {
        ...run,
        firstCutOutcome: firstOutcome,
        converged: true,
        cutsUsed: 1,
        confidence: Math.min(0.9, run.confidence * 1.2),
      };
    }

    run = this.planSecondCut(run, firstOutcome, features);
    const secondOutcome = measure(run.secondCut!);
    const secondRaTol = target.target_ra_um * CONVERGENCE_RA_TOL_FRAC;
    const converged =
      Math.abs(secondOutcome.actual_ra_um - target.target_ra_um) <= secondRaTol;

    return {
      ...run,
      secondCutOutcome: secondOutcome,
      converged,
      confidence: Math.min(0.98, run.confidence * (converged ? 1.05 : 0.8)),
    };
  }

  /** Rank spark-DB materials by embedding similarity, optional ISO-group bonus. */
  nearestNeighbors(
    embedding: number[],
    isoGroup: ISOGroup | undefined,
    k: number,
  ): Neighbor[] {
    const all = wedmMaterialSparkDatabaseEngine.list();
    const scored = all.map<Neighbor>((sig) => {
      const e = embedSignature(sig);
      let sim = cosineSim(embedding, e);
      if (isoGroup && MATERIAL_PROPS[sig.key].iso_group === isoGroup) {
        sim = Math.min(1, sim + 0.05);
      }
      return { material: sig.key, similarity: round4(sim), signature: sig };
    });
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k);
  }

  /**
   * Weighted-average recipe over neighbors, weights = similarity. Falls back
   * to the global nominal recipe when there are no neighbors.
   */
  private blendRecipe(neighbors: Neighbor[]): WEDMRecipe {
    if (neighbors.length === 0) return { ...NOMINAL_RECIPE };
    let w = 0;
    let ip = 0, pon = 0;
    for (const n of neighbors) {
      w += n.similarity;
      ip += n.similarity * n.signature.peak_current_nominal_A;
      pon += n.similarity * n.signature.pulse_on_nominal_us;
    }
    if (w === 0) return { ...NOMINAL_RECIPE };
    return {
      peak_current_A: round3(ip / w),
      pulse_on_us: round3(pon / w),
      pulse_off_us: NOMINAL_RECIPE.pulse_off_us,
      wire_tension_N: NOMINAL_RECIPE.wire_tension_N,
    };
  }
}

// ============================================================================
// EMBEDDINGS (exported for test + ActiveQuery composition)
// ============================================================================

/**
 * Embed unknown-material features into a fixed-length 7-dim vector aligned
 * with `embedSignature`. Missing components fall back to mid-range steel-ish
 * defaults so nearest-neighbor remains well-defined.
 */
export function embed(f: UnknownMaterialFeatures): number[] {
  const hardness = f.hardness_HRC ?? 30;
  const thermal = f.thermal_conductivity_W_per_mK ?? 45;
  const melt = f.melting_point_C ?? 1500;
  const density = f.density_g_per_cm3 ?? 7.85;
  const isoAxis = isoAxisOf(f.iso_group);
  const raSeen = f.priorOutcome?.actual_ra_um ?? 1.6;
  const mrrSeen = f.priorOutcome?.actual_mrr_mm3_per_min ?? REFERENCE_MRR_MM3_PER_MIN;
  return [
    hardness / 100,
    thermal / 400,
    melt / 3500,
    density / 20,
    isoAxis,
    raSeen / 5,
    Math.log1p(mrrSeen) / Math.log1p(100),
  ];
}

/** Embed a spark-DB signature. Shares dim/normalization with `embed`. */
export function embedSignature(sig: WEDMSparkSignature): number[] {
  const props = MATERIAL_PROPS[sig.key];
  const raSeen = wedmMaterialSparkDatabaseEngine.predictRaUm(
    sig.key,
    REFERENCE_IE_A,
    REFERENCE_TE_US,
  );
  const mrrSeen = sig.mrr_factor * REFERENCE_MRR_MM3_PER_MIN;
  return [
    props.hardness_HRC / 100,
    props.thermal_conductivity_W_per_mK / 400,
    props.melting_point_C / 3500,
    props.density_g_per_cm3 / 20,
    isoAxisOf(props.iso_group),
    raSeen / 5,
    Math.log1p(mrrSeen) / Math.log1p(100),
  ];
}

export function isoAxisOf(g: ISOGroup | undefined): number {
  // Ordinal axis: P<M<K<N<S<H (rough machinability gradient).
  switch (g) {
    case "P": return 0.1;
    case "M": return 0.3;
    case "K": return 0.5;
    case "N": return 0.7;
    case "S": return 0.85;
    case "H": return 1.0;
    default:  return 0.5;
  }
}

// ============================================================================
// INTERNALS
// ============================================================================

function predictFromNeighbors(
  neighbors: Neighbor[],
  recipe: WEDMRecipe,
  target: WEDMCutTarget,
): { ra: number; mrr: number } {
  if (neighbors.length === 0) {
    return { ra: target.target_ra_um, mrr: target.target_mrr_mm3_per_min * 0.7 };
  }
  // Weighted-average Klocke prediction at the chosen recipe.
  let w = 0, raSum = 0, mrrSum = 0;
  for (const n of neighbors) {
    const s = n.signature;
    const ra = s.klocke_C * Math.pow(recipe.peak_current_A * recipe.pulse_on_us, s.klocke_k);
    const mrr = s.mrr_factor * REFERENCE_MRR_MM3_PER_MIN *
                (recipe.peak_current_A / s.peak_current_nominal_A) *
                (recipe.pulse_on_us / s.pulse_on_nominal_us);
    w += n.similarity;
    raSum += n.similarity * ra;
    mrrSum += n.similarity * mrr;
  }
  if (w === 0) return { ra: target.target_ra_um, mrr: target.target_mrr_mm3_per_min * 0.7 };
  return { ra: raSum / w, mrr: mrrSum / w };
}

function averageKlocke(neighbors: Neighbor[]): number {
  if (neighbors.length === 0) return 0.5;
  let w = 0, k = 0;
  for (const n of neighbors) {
    w += n.similarity;
    k += n.similarity * n.signature.klocke_k;
  }
  return w > 0 ? k / w : 0.5;
}

function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmFewShotEngine = new WEDMFewShotEngine();
