/**
 * PhysicsFeatureExtractorEngine.ts
 * U-NN-FEAT03 — Physics-engine features for the cross-process neural learner.
 *
 * Reviewer 1 finding (5-way assessment): PRISM has 17 force/physics engines,
 * 9 wear/life engines, 13 chatter engines, 17 surface engines, and 24 thermal
 * engines, but NONE of them feed the T1-02 CrossProcessNeuralLearningEngine.
 * The neural net is doing pure tabular learning over 7 raw numerics + 4 hash
 * buckets — ignoring 80+ canonical physics models that already know what
 * matters (cutting force scales with depth × feed × kc1_1; tool life follows
 * Taylor's V·T^n=C; surface roughness is dominated by feed²/nose_radius...).
 *
 * This engine is a pure feature extractor: takes an OutcomeRecord, returns
 * a fixed Float64Array of physics-derived features. The features themselves
 * are then z-scored by the NN's existing Welford accumulator (U-NN-FEAT02).
 *
 * Design choices:
 *   - Pure: no I/O, no state, no randomness. Same record → same features.
 *   - Graceful: missing inputs (no material, zero RPM, missing tool data)
 *     return 0 for the affected feature, NEVER throw. The NN treats 0 as
 *     "this physics model couldn't run" — Welford normalizes around it.
 *   - Canonical: imports kc1_1/mc/Taylor/etc. from physics/constants.ts.
 *     No inline physics constants — would be hard-blocked by the
 *     materialSanityHook anyway.
 *
 * The 5 features (in order):
 *   0. kienzle_force_N      — Fc = kc1_1 · ap · h^(1-mc)  (Kienzle 1957)
 *   1. taylor_life_min      — T  = (C / Vc)^(1/n)         (Taylor 1907)
 *   2. chatter_risk_idx     — depth-to-diameter slenderness proxy
 *   3. surface_ra_um        — Ra ≈ fz² / (32 · r_nose)    (Brammertz 1961)
 *   4. thermal_load_W       — P  = Fc · Vc / 60           (cutting power)
 *
 * For 0/1 we use canonical helpers from physics/constants.ts. For 2/3 we use
 * textbook proxies because the full models (ChatterStabilityLobe needs FRF
 * data per spindle; SurfaceFinishPredictor needs nose radius from tool DB)
 * require lookups that aren't always in the OutcomeRecord. A 0-valued feature
 * here is a SIGNAL to the NN, not a bug.
 */

import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";
import {
  getKienzle,
  getTaylor,
  kienzleForce,
  taylorLife,
  cuttingPower,
} from "../physics/constants.js";

export const PHYSICS_FEATURE_DIM = 5;

export const PHYSICS_FEATURE_INDEX = {
  KIENZLE_FORCE_N: 0,
  TAYLOR_LIFE_MIN: 1,
  CHATTER_RISK_IDX: 2,
  SURFACE_RA_UM: 3,
  THERMAL_LOAD_W: 4,
} as const;

// Reasonable defaults when the OutcomeRecord lacks specific tool geometry.
// These are NOT physics constants (which live in constants.ts) — they are
// fallback inputs to physics models when the per-record data is missing.
const DEFAULT_NOSE_RADIUS_MM = 0.4; // Common insert nose radius (Sandvik)
const DEFAULT_FLUTES = 4;
const FEATURE_CLIP_RANGE_FORCE_N = 1e5;     // 100 kN — well above any practical cutting force
const FEATURE_CLIP_RANGE_LIFE_MIN = 1e4;    // 10,000 min — well above any tool's expected life
const FEATURE_CLIP_RANGE_CHATTER_IDX = 10;  // L/D > 10 → severe chatter risk anyway
const FEATURE_CLIP_RANGE_RA_UM = 100;       // 100 μm Ra is a stamping-grade surface
const FEATURE_CLIP_RANGE_POWER_W = 1e5;     // 100 kW

/**
 * Read a non-negative numeric field from request_summary, returning a
 * sentinel `default` when missing/non-finite/negative. Guarded so a record
 * with `spindle_rpm: NaN` cannot poison downstream physics.
 */
function safeNum(
  record: OutcomeRecord,
  key: string,
  fallback: number,
): number {
  const reqAny = record.request_summary as Record<string, unknown>;
  const v = reqAny[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return fallback;
  return v;
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

export class PhysicsFeatureExtractorEngine {
  /**
   * Extract physics-derived features from a single OutcomeRecord. Returns
   * a Float64Array of length PHYSICS_FEATURE_DIM. Features are in physical
   * units (N, min, dimensionless, μm, W) — the caller is responsible for
   * z-score normalization (T1-02 does this via its Welford accumulator).
   *
   * @param record OutcomeRecord whose request_summary holds material, tool,
   *               spindle, feed, and depth fields. Missing fields → 0.
   * @returns Float64Array(5) — kienzle_N, taylor_min, chatter_idx, ra_um, power_W
   */
  static extract(record: OutcomeRecord): Float64Array {
    const out = new Float64Array(PHYSICS_FEATURE_DIM);

    const material = record.request_summary.material;
    const ap = safeNum(record, "depth_of_cut_mm", 0);
    const D = safeNum(record, "tool_diameter_mm", 0);
    const rpm = safeNum(record, "spindle_rpm", 0);
    const feedMmMin = safeNum(record, "feed_rate_mm_min", 0);
    let Vc = safeNum(record, "cutting_speed_m_min", 0);

    // Derive Vc from RPM × tool diameter when not explicitly provided.
    // Vc[m/min] = π · D[mm] · N[rpm] / 1000
    if (Vc <= 0 && D > 0 && rpm > 0) {
      Vc = (Math.PI * D * rpm) / 1000;
    }

    // Per-tooth chip load (turning treats this as feed-per-rev, which we
    // approximate with feed/rpm; milling divides by flutes).
    let fz = 0;
    if (rpm > 0 && feedMmMin > 0) {
      const isMilling = record.process === "mill";
      fz = feedMmMin / (rpm * (isMilling ? DEFAULT_FLUTES : 1));
    }

    // ─────── 0. Kienzle cutting force ───────
    if (material && ap > 0 && fz > 0) {
      const { kc1_1, mc } = getKienzle(material);
      const Fc = kienzleForce(kc1_1, mc, ap, fz);
      out[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N] = clamp(
        Fc,
        0,
        FEATURE_CLIP_RANGE_FORCE_N,
      );
    }

    // ─────── 1. Taylor tool life ───────
    if (material && Vc > 0) {
      const { C, n } = getTaylor(material);
      const T_min = taylorLife(C, n, Vc);
      out[PHYSICS_FEATURE_INDEX.TAYLOR_LIFE_MIN] = clamp(
        T_min,
        0,
        FEATURE_CLIP_RANGE_LIFE_MIN,
      );
    }

    // ─────── 2. Chatter risk (slenderness proxy) ───────
    // Real ChatterStabilityLobe needs spindle FRF — not in the record.
    // Textbook proxy: L/D ratio ≥ 4 starts to chatter; we use ap/D as a
    // depth-to-diameter index. Higher values = thinner cut relative to
    // tool stiffness = more chatter risk. NOT calibrated to real lobes.
    if (D > 0 && ap > 0) {
      const slenderness = ap / D;
      out[PHYSICS_FEATURE_INDEX.CHATTER_RISK_IDX] = clamp(
        slenderness,
        0,
        FEATURE_CLIP_RANGE_CHATTER_IDX,
      );
    }

    // ─────── 3. Surface roughness (Brammertz) ───────
    // Ra[μm] ≈ fz²[mm²] / (32 · r_nose[mm]) · 1000  →  fz²/(32·r) in μm
    // Reference: Brammertz (1961); see physics/constants.ts ::
    // "Brammertz: Ra[um] = fz^2 / (32*r) * 1000".
    if (fz > 0) {
      const r = DEFAULT_NOSE_RADIUS_MM;
      const Ra_um = (fz * fz) / (32 * r) * 1000;
      out[PHYSICS_FEATURE_INDEX.SURFACE_RA_UM] = clamp(
        Ra_um,
        0,
        FEATURE_CLIP_RANGE_RA_UM,
      );
    }

    // ─────── 4. Thermal load (cutting power as proxy) ───────
    // P[W] = Fc[N] · Vc[m/min] / 60. cuttingPower returns kW so ×1000.
    const Fc = out[PHYSICS_FEATURE_INDEX.KIENZLE_FORCE_N];
    if (Fc > 0 && Vc > 0) {
      const power_W = cuttingPower(Fc, Vc) * 1000;
      out[PHYSICS_FEATURE_INDEX.THERMAL_LOAD_W] = clamp(
        power_W,
        0,
        FEATURE_CLIP_RANGE_POWER_W,
      );
    }

    return out;
  }

  /**
   * Convenience: extract for a batch of records, returning a flat
   * (records.length × PHYSICS_FEATURE_DIM) row-major array. Useful for
   * bulk-featurizing a training set without per-record allocation overhead.
   */
  static extractBatch(records: readonly OutcomeRecord[]): Float64Array {
    const flat = new Float64Array(records.length * PHYSICS_FEATURE_DIM);
    for (let i = 0; i < records.length; i++) {
      const single = this.extract(records[i]);
      flat.set(single, i * PHYSICS_FEATURE_DIM);
    }
    return flat;
  }
}

export const physicsFeatureExtractorEngine = new PhysicsFeatureExtractorEngine();
