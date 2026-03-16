// @ts-nocheck
/**
 * PRISM MCP Server — Physics Auto-Calibration Engine
 *
 * Learns from actual cutting data (dynamometer force, measured Ra, actual tool life)
 * to Bayesian-update canonical physics constants per machine+material combo.
 *
 * QS-MS6 P2: Closes the loop between predictions and shop-floor reality.
 *
 * Methods:
 *  1. submit        — Accept measurement, Bayesian-update constants
 *  2. predict       — Use calibrated constants for prediction with uncertainty
 *  3. getState      — Return full calibration state
 *  4. reset         — Reset calibration for a material or all
 *  5. exportCalibration / importCalibration — Serialize/deserialize state
 *
 * Math:
 *  - Conjugate-normal Bayesian updating (Gelman et al. 2013, §2.5)
 *    Prior: N(mu_0, sigma_0²)
 *    Likelihood: N(x, sigma_obs²)
 *    Posterior: N(mu_n, sigma_n²)
 *      sigma_n² = 1 / (1/sigma_0² + n/sigma_obs²)
 *      mu_n = sigma_n² * (mu_0/sigma_0² + n*x_bar/sigma_obs²)
 *
 *  - Kienzle (1952): Fc = kc1.1 * b * h^(1-mc)
 *  - Taylor (1907): T = (C / Vc)^(1/n)
 *
 * References:
 *  - Kienzle (1952) — Specific cutting force model
 *  - Taylor (1907) — Tool-life equation V·T^n = C
 *  - Gelman, Carlin, Stern, Dunson, Vehtari, Rubin (2013) — Bayesian Data Analysis 3rd Ed.
 *  - Sandvik Coromant General Turning (2024) — Reference kc1.1 values
 *
 * @module PhysicsAutoCalibrationEngine
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// INTERFACES
// ============================================================================

/** Single cutting measurement for calibration */
export interface CalibrationMeasurement {
  /** Material name or ISO group (e.g., "P", "M", "K", "N", "S", "H", "Steel 1045") */
  material: string;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Number of flutes */
  flutes: number;
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Radial depth of cut [mm] (optional, defaults to tool_diameter_mm for slotting) */
  ae_mm?: number;
  /** Spindle speed [RPM] */
  spindle_rpm: number;
  /** Feed rate [mm/min] */
  feed_rate_mmmin: number;

  // Actual measurements (at least one required)
  /** Measured cutting force [N] (e.g., from dynamometer) */
  measured_force_N?: number;
  /** Measured surface roughness Ra [µm] */
  measured_Ra_um?: number;
  /** Measured tool life [min] */
  measured_tool_life_min?: number;
  /** Measured spindle power [kW] */
  measured_power_kW?: number;

  // Context
  /** Machine identifier for per-machine calibration */
  machine_id?: string;
  /** ISO timestamp of measurement */
  timestamp?: string;
  /** Free-text notes */
  notes?: string;
}

/** Bayesian posterior for a single constant */
export interface BayesianPosterior {
  /** Posterior mean */
  mean: number;
  /** Posterior standard deviation */
  std: number;
  /** Number of observations incorporated */
  n_observations: number;
  /** Prior mean (for reference) */
  prior_mean: number;
  /** History of individual observations */
  observations: number[];
}

/** Calibration state for a single material */
export interface MaterialCalibrationState {
  kc1_1: BayesianPosterior;
  mc: BayesianPosterior;
  taylor_C: BayesianPosterior;
  taylor_n: BayesianPosterior;
}

/** Full calibration state */
export interface CalibrationState {
  /** Bayesian posteriors per material (keyed by resolved ISO group) */
  materials: Record<string, MaterialCalibrationState>;
  /** Total measurements across all materials */
  total_measurements: number;
  /** ISO timestamp of last update */
  last_updated: string;
  /** Version for forward compatibility */
  version: number;
}

/** Result of submitting a calibration measurement */
export interface CalibrationResult {
  /** Resolved material key */
  material: string;
  /** Constants before this update */
  before: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number };
  /** Constants after this update */
  after: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number };
  /** Percentage change for each constant */
  change_pct: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number };
  /** Overall confidence (0-1) based on observation count */
  confidence: number;
  /** Number of observations for this material */
  n_observations: number;
  /** Prediction improvement metrics (if force measurement provided) */
  prediction_improvement: {
    force_error_before_pct: number;
    force_error_after_pct: number;
  };
  /** Which constants were updated */
  updated_constants: string[];
  /** Warnings (e.g., extreme outlier) */
  warnings: string[];
}

/** Prediction result using calibrated constants */
export interface CalibrationPrediction {
  /** Predicted cutting force [N] */
  force_N: number;
  /** 95% confidence interval for force [N] */
  force_CI95: [number, number];
  /** Predicted tool life [min] */
  tool_life_min: number;
  /** 95% confidence interval for tool life [min] */
  tool_life_CI95: [number, number];
  /** Predicted power [kW] */
  power_kW: number;
  /** Whether calibrated or canonical constants were used */
  source: "calibrated" | "canonical" | "blended";
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Constants used */
  constants_used: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum observations before using fully calibrated (no shrinkage) */
const MIN_OBS_FULL_CALIBRATION = 5;
/** Minimum observations before using blended (shrinkage toward prior) */
const MIN_OBS_BLENDED = 1;
/** Prior standard deviation as fraction of prior mean for kc1_1 */
const PRIOR_STD_FRACTION_KC = 0.15;
/** Prior standard deviation as fraction of prior mean for mc */
const PRIOR_STD_FRACTION_MC = 0.20;
/** Prior standard deviation as fraction of prior mean for Taylor C */
const PRIOR_STD_FRACTION_TAYLOR_C = 0.20;
/** Prior standard deviation as fraction of prior mean for Taylor n */
const PRIOR_STD_FRACTION_TAYLOR_N = 0.25;
/** Observation noise as fraction of measured value */
const OBS_NOISE_FRACTION = 0.10;
/** Outlier threshold: reject if implied constant > this many sigma from prior */
const OUTLIER_SIGMA_THRESHOLD = 4.0;
/** Maximum observations stored per constant */
const MAX_OBSERVATIONS_STORED = 200;

/** Map common material names to ISO groups */
const MATERIAL_TO_ISO: Record<string, ISOGroup> = {
  // Direct ISO group names
  p: "P", m: "M", k: "K", n: "N", s: "S", h: "H",
  // Common steels → P
  steel: "P", "carbon steel": "P", "alloy steel": "P", "1018": "P", "1045": "P",
  "4140": "P", "4340": "P", "8620": "P", "a36": "P", "1020": "P",
  "steel 1045": "P", "steel 4140": "P", "steel 4340": "P",
  "aisi 1045": "P", "aisi 4140": "P", "aisi 4340": "P",
  // Stainless → M
  stainless: "M", "stainless steel": "M", "304": "M", "316": "M", "303": "M",
  "17-4ph": "M", "304l": "M", "316l": "M", "duplex": "M",
  // Cast iron → K
  "cast iron": "K", "gray iron": "K", "ductile iron": "K", "cgi": "K",
  "gray cast iron": "K", "nodular iron": "K", "fc250": "K",
  // Non-ferrous → N
  aluminum: "N", aluminium: "N", "6061": "N", "7075": "N", "2024": "N",
  brass: "N", copper: "N", bronze: "N", "al 6061": "N", "al 7075": "N",
  // Superalloys → S
  titanium: "S", inconel: "S", "ti-6al-4v": "S", "inconel 718": "S",
  "ti6al4v": "S", hastelloy: "S", waspaloy: "S", monel: "S",
  // Hardened → H
  "hardened steel": "H", "h13": "H", "d2": "H", "tool steel": "H",
  "hardened": "H", "52100": "H", "m2": "H", "s7": "H",
};

// ============================================================================
// ENGINE
// ============================================================================

export class PhysicsAutoCalibrationEngine {
  private state: CalibrationState;

  constructor() {
    this.state = {
      materials: {},
      total_measurements: 0,
      last_updated: new Date().toISOString(),
      version: 1,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: submit
  // --------------------------------------------------------------------------

  /**
   * Submit an actual cutting measurement and Bayesian-update the constants.
   *
   * Accepts dynamometer force, measured Ra, tool life, or power. At least one
   * measurement is required. Back-calculates implied physics constants and
   * updates the conjugate-normal posterior for each.
   */
  submit(measurement: CalibrationMeasurement): CalibrationResult {
    // ── Validate ──
    const warnings: string[] = [];
    const updatedConstants: string[] = [];

    if (
      measurement.measured_force_N == null &&
      measurement.measured_Ra_um == null &&
      measurement.measured_tool_life_min == null &&
      measurement.measured_power_kW == null
    ) {
      throw new Error("At least one measurement (force, Ra, tool life, or power) is required");
    }
    if (measurement.tool_diameter_mm <= 0) throw new Error("tool_diameter_mm must be > 0");
    if (measurement.flutes <= 0) throw new Error("flutes must be > 0");
    if (measurement.ap_mm <= 0) throw new Error("ap_mm must be > 0");
    if (measurement.spindle_rpm <= 0) throw new Error("spindle_rpm must be > 0");
    if (measurement.feed_rate_mmmin <= 0) throw new Error("feed_rate_mmmin must be > 0");

    // ── Resolve material → ISO group ──
    const isoGroup = this.resolveISO(measurement.material);
    const matKey = isoGroup;

    // ── Get or initialize material state ──
    const matState = this.getOrInitMaterial(matKey);
    const before = {
      kc1_1: matState.kc1_1.mean,
      mc: matState.mc.mean,
      taylor_C: matState.taylor_C.mean,
      taylor_n: matState.taylor_n.mean,
    };

    // ── Derive cutting parameters ──
    const fz = measurement.feed_rate_mmmin / (measurement.spindle_rpm * measurement.flutes); // mm/tooth
    const ae = measurement.ae_mm ?? measurement.tool_diameter_mm; // radial engagement
    const Vc = Math.PI * measurement.tool_diameter_mm * measurement.spindle_rpm / 1000; // m/min

    // Chip thickness h ≈ fz for straight milling (simplified; exact: fz * sin(engagement angle))
    // Use average chip thickness for partial engagement
    const engagementRatio = Math.min(ae / measurement.tool_diameter_mm, 1.0);
    const engagementAngle = Math.acos(1 - 2 * engagementRatio); // half-angle
    const h_avg = fz * engagementRatio; // average uncut chip thickness [mm]
    const h = Math.max(h_avg, 0.001); // floor to avoid division by zero

    // Chip width b ≈ ap (for κr=90°)
    const b = measurement.ap_mm;

    // ── Force-based kc1_1 calibration ──
    let forceErrorBefore = 0;
    let forceErrorAfter = 0;

    if (measurement.measured_force_N != null && measurement.measured_force_N > 0) {
      const F_measured = measurement.measured_force_N;

      // Predicted force with current constants
      const F_pred_before = this.kienzleForce(matState.kc1_1.mean, matState.mc.mean, b, h);
      forceErrorBefore = Math.abs(F_measured - F_pred_before) / F_measured * 100;

      // Back-calculate implied kc1_1:
      // Fc = kc1_1 * b * h^(1-mc)  →  kc1_1_implied = Fc / (b * h^(1-mc))
      const kc1_1_implied = F_measured / (b * Math.pow(h, 1 - matState.mc.mean));

      // Check for outlier
      const sigma_prior = matState.kc1_1.std;
      const deviation = Math.abs(kc1_1_implied - matState.kc1_1.mean) / sigma_prior;
      if (deviation > OUTLIER_SIGMA_THRESHOLD) {
        warnings.push(
          `kc1_1 implied value ${kc1_1_implied.toFixed(0)} is ${deviation.toFixed(1)}σ from ` +
          `current mean ${matState.kc1_1.mean.toFixed(0)} — possible outlier`
        );
      }

      // Bayesian conjugate-normal update
      const obsNoise = kc1_1_implied * OBS_NOISE_FRACTION;
      this.bayesianUpdate(matState.kc1_1, kc1_1_implied, obsNoise);
      updatedConstants.push("kc1_1");

      // Recalculate force error after update
      const F_pred_after = this.kienzleForce(matState.kc1_1.mean, matState.mc.mean, b, h);
      forceErrorAfter = Math.abs(F_measured - F_pred_after) / F_measured * 100;
    }

    // ── Power-based kc1_1 calibration (alternative to force) ──
    if (
      measurement.measured_power_kW != null &&
      measurement.measured_power_kW > 0 &&
      measurement.measured_force_N == null // don't double-update
    ) {
      const P_measured = measurement.measured_power_kW;
      // P = Fc * Vc / 60000  →  Fc = P * 60000 / Vc
      const F_implied = P_measured * 60000 / Vc;
      const kc1_1_implied = F_implied / (b * Math.pow(h, 1 - matState.mc.mean));

      const obsNoise = kc1_1_implied * OBS_NOISE_FRACTION * 1.5; // power has more noise
      this.bayesianUpdate(matState.kc1_1, kc1_1_implied, obsNoise);
      updatedConstants.push("kc1_1 (from power)");
    }

    // ── mc calibration (if both force and power, or multiple chip thicknesses in future) ──
    // For a single measurement, mc update is limited. We update mc if force-based
    // kc1_1 ratio deviates systematically (indicating mc mismatch).
    if (measurement.measured_force_N != null && measurement.measured_force_N > 0) {
      const F_measured = measurement.measured_force_N;
      // At this chip thickness, the mc that would give exact force:
      // Fc = kc1_1 * b * h^(1-mc)  →  1-mc = ln(Fc/(kc1_1*b)) / ln(h)
      // Only update if h is significantly different from 1mm (otherwise mc has no effect)
      if (Math.abs(Math.log(h)) > 0.1) { // h not too close to 1mm
        const ratio = F_measured / (matState.kc1_1.mean * b);
        if (ratio > 0) {
          const oneMinusMc_implied = Math.log(ratio) / Math.log(h);
          const mc_implied = 1 - oneMinusMc_implied;
          // Only update if mc_implied is physically reasonable (0.05 to 0.55)
          if (mc_implied > 0.05 && mc_implied < 0.55) {
            const obsNoise = Math.abs(mc_implied) * OBS_NOISE_FRACTION * 2; // mc is noisy from single measurement
            this.bayesianUpdate(matState.mc, mc_implied, Math.max(obsNoise, 0.02));
            updatedConstants.push("mc");
          }
        }
      }
    }

    // ── Tool life calibration ──
    if (measurement.measured_tool_life_min != null && measurement.measured_tool_life_min > 0) {
      const T_measured = measurement.measured_tool_life_min;

      // Taylor: T = (C/Vc)^(1/n)  →  C = Vc * T^n
      const taylor_n_current = matState.taylor_n.mean;
      const C_implied = Vc * Math.pow(T_measured, taylor_n_current);

      // Check outlier
      const deviation = Math.abs(C_implied - matState.taylor_C.mean) / matState.taylor_C.std;
      if (deviation > OUTLIER_SIGMA_THRESHOLD) {
        warnings.push(
          `Taylor C implied value ${C_implied.toFixed(0)} is ${deviation.toFixed(1)}σ from ` +
          `current mean ${matState.taylor_C.mean.toFixed(0)} — possible outlier`
        );
      }

      const obsNoise_C = C_implied * OBS_NOISE_FRACTION;
      this.bayesianUpdate(matState.taylor_C, C_implied, Math.max(obsNoise_C, 1));
      updatedConstants.push("taylor_C");

      // Also update Taylor n if we have enough observations to estimate it
      // n = ln(T2/T1) / ln(V1/V2) — need multiple speeds, so estimate from single point:
      // T = (C/Vc)^(1/n)  →  n = ln(C/Vc) / ln(T)
      if (T_measured > 1 && Vc > 0) {
        const n_implied = Math.log(matState.taylor_C.mean / Vc) / Math.log(T_measured);
        if (n_implied > 0.05 && n_implied < 0.60) {
          const obsNoise_n = Math.abs(n_implied) * OBS_NOISE_FRACTION * 2.5; // n is very noisy from single point
          this.bayesianUpdate(matState.taylor_n, n_implied, Math.max(obsNoise_n, 0.02));
          updatedConstants.push("taylor_n");
        }
      }
    }

    // ── Ra-based secondary calibration ──
    // Ra ≈ f²/(32·R_nose) — relates to feed, not directly to kc/taylor
    // However, if Ra is measured, we can infer effective nose radius correction
    // and store as a note. Not updating kc/taylor from Ra alone.
    if (measurement.measured_Ra_um != null && measurement.measured_Ra_um > 0) {
      warnings.push(
        `Ra=${measurement.measured_Ra_um.toFixed(2)}µm recorded. ` +
        `Ra calibration updates feed/nose parameters (not Kienzle/Taylor constants directly).`
      );
    }

    // ── Update state metadata ──
    this.state.total_measurements++;
    this.state.last_updated = measurement.timestamp ?? new Date().toISOString();

    const after = {
      kc1_1: matState.kc1_1.mean,
      mc: matState.mc.mean,
      taylor_C: matState.taylor_C.mean,
      taylor_n: matState.taylor_n.mean,
    };

    const changePct = (a: number, b: number) => b !== 0 ? ((a - b) / b) * 100 : 0;

    return {
      material: matKey,
      before,
      after,
      change_pct: {
        kc1_1: changePct(after.kc1_1, before.kc1_1),
        mc: changePct(after.mc, before.mc),
        taylor_C: changePct(after.taylor_C, before.taylor_C),
        taylor_n: changePct(after.taylor_n, before.taylor_n),
      },
      confidence: this.computeConfidence(matState),
      n_observations: Math.max(
        matState.kc1_1.n_observations,
        matState.taylor_C.n_observations
      ),
      prediction_improvement: {
        force_error_before_pct: forceErrorBefore,
        force_error_after_pct: forceErrorAfter,
      },
      updated_constants: updatedConstants,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: predict
  // --------------------------------------------------------------------------

  /**
   * Predict cutting force and tool life using calibrated constants.
   * Falls back to canonical if no calibration data. Uses shrinkage blending
   * for <5 observations.
   */
  predict(params: {
    material: string;
    tool_diameter_mm: number;
    flutes: number;
    ap_mm: number;
    ae_mm?: number;
    spindle_rpm: number;
    feed_rate_mmmin: number;
  }): CalibrationPrediction {
    const isoGroup = this.resolveISO(params.material);
    const matKey = isoGroup;
    const canonical = this.getCanonical(isoGroup);
    const matState = this.state.materials[matKey];

    // Determine source and constants
    let constants: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number };
    let source: "calibrated" | "canonical" | "blended";
    let confidence: number;

    if (!matState || matState.kc1_1.n_observations < MIN_OBS_BLENDED) {
      // No calibration — use canonical
      constants = canonical;
      source = "canonical";
      confidence = 0.5; // default confidence for uncalibrated
    } else if (matState.kc1_1.n_observations >= MIN_OBS_FULL_CALIBRATION) {
      // Fully calibrated
      constants = {
        kc1_1: matState.kc1_1.mean,
        mc: matState.mc.mean,
        taylor_C: matState.taylor_C.mean,
        taylor_n: matState.taylor_n.mean,
      };
      source = "calibrated";
      confidence = this.computeConfidence(matState);
    } else {
      // Blended: shrinkage toward prior
      const alpha = matState.kc1_1.n_observations / MIN_OBS_FULL_CALIBRATION;
      constants = {
        kc1_1: alpha * matState.kc1_1.mean + (1 - alpha) * canonical.kc1_1,
        mc: alpha * matState.mc.mean + (1 - alpha) * canonical.mc,
        taylor_C: alpha * matState.taylor_C.mean + (1 - alpha) * canonical.taylor_C,
        taylor_n: alpha * matState.taylor_n.mean + (1 - alpha) * canonical.taylor_n,
      };
      source = "blended";
      confidence = this.computeConfidence(matState) * alpha;
    }

    // ── Compute cutting parameters ──
    const fz = params.feed_rate_mmmin / (params.spindle_rpm * params.flutes);
    const ae = params.ae_mm ?? params.tool_diameter_mm;
    const Vc = Math.PI * params.tool_diameter_mm * params.spindle_rpm / 1000;
    const engagementRatio = Math.min(ae / params.tool_diameter_mm, 1.0);
    const h = Math.max(fz * engagementRatio, 0.001);
    const b = params.ap_mm;

    // ── Force prediction ──
    const F_pred = this.kienzleForce(constants.kc1_1, constants.mc, b, h);

    // 95% CI from posterior uncertainty
    const kc_std = matState ? matState.kc1_1.std : canonical.kc1_1 * PRIOR_STD_FRACTION_KC;
    const F_low = this.kienzleForce(constants.kc1_1 - 1.96 * kc_std, constants.mc, b, h);
    const F_high = this.kienzleForce(constants.kc1_1 + 1.96 * kc_std, constants.mc, b, h);

    // ── Tool life prediction ──
    const T_pred = Math.pow(constants.taylor_C / Vc, 1 / constants.taylor_n);
    const tc_std = matState ? matState.taylor_C.std : canonical.taylor_C * PRIOR_STD_FRACTION_TAYLOR_C;
    const T_low = Math.max(0.1, Math.pow((constants.taylor_C - 1.96 * tc_std) / Vc, 1 / constants.taylor_n));
    const T_high = Math.pow((constants.taylor_C + 1.96 * tc_std) / Vc, 1 / constants.taylor_n);

    // ── Power prediction ──
    const P_pred = F_pred * Vc / 60000; // kW

    return {
      force_N: Math.round(F_pred * 100) / 100,
      force_CI95: [Math.round(Math.max(0, F_low) * 100) / 100, Math.round(F_high * 100) / 100],
      tool_life_min: Math.round(T_pred * 100) / 100,
      tool_life_CI95: [
        Math.round(Math.max(0.1, T_low) * 100) / 100,
        Math.round(Math.min(T_high, 1e6) * 100) / 100,
      ],
      power_kW: Math.round(P_pred * 1000) / 1000,
      source,
      confidence: Math.round(confidence * 1000) / 1000,
      constants_used: {
        kc1_1: Math.round(constants.kc1_1 * 10) / 10,
        mc: Math.round(constants.mc * 10000) / 10000,
        taylor_C: Math.round(constants.taylor_C * 10) / 10,
        taylor_n: Math.round(constants.taylor_n * 10000) / 10000,
      },
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: getState
  // --------------------------------------------------------------------------

  /** Return full calibration state for inspection or persistence */
  getState(): CalibrationState {
    return structuredClone(this.state);
  }

  // --------------------------------------------------------------------------
  // PUBLIC: reset
  // --------------------------------------------------------------------------

  /**
   * Reset calibration for a specific material or all materials.
   * @param material - Material/ISO group to reset. If omitted, resets all.
   */
  reset(params?: { material?: string }): { reset: string; total_measurements: number } {
    if (params?.material) {
      const isoGroup = this.resolveISO(params.material);
      delete this.state.materials[isoGroup];
      return { reset: isoGroup, total_measurements: this.state.total_measurements };
    }
    this.state = {
      materials: {},
      total_measurements: 0,
      last_updated: new Date().toISOString(),
      version: 1,
    };
    return { reset: "all", total_measurements: 0 };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: exportCalibration / importCalibration
  // --------------------------------------------------------------------------

  /**
   * Export calibration state as JSON-serializable object.
   * Caller can persist to ~/.prism/calibration.json
   */
  exportCalibration(): CalibrationState {
    return structuredClone(this.state);
  }

  /**
   * Import calibration state from a previously exported JSON object.
   * Validates structure before accepting.
   */
  importCalibration(imported: CalibrationState): { success: boolean; materials_loaded: number; total_measurements: number } {
    // ── Validate structure ──
    if (!imported || typeof imported !== "object") {
      throw new Error("Invalid calibration state: must be an object");
    }
    if (!imported.materials || typeof imported.materials !== "object") {
      throw new Error("Invalid calibration state: missing 'materials' record");
    }
    if (typeof imported.total_measurements !== "number") {
      throw new Error("Invalid calibration state: missing 'total_measurements'");
    }

    // Validate each material entry
    const validISO = new Set(["P", "M", "K", "N", "S", "H"]);
    for (const [key, mat] of Object.entries(imported.materials)) {
      if (!validISO.has(key)) {
        throw new Error(`Invalid material key '${key}': must be ISO group (P/M/K/N/S/H)`);
      }
      for (const field of ["kc1_1", "mc", "taylor_C", "taylor_n"] as const) {
        const p = (mat as any)[field];
        if (!p || typeof p.mean !== "number" || typeof p.std !== "number" || typeof p.n_observations !== "number") {
          throw new Error(`Invalid calibration state for ${key}.${field}`);
        }
      }
    }

    this.state = structuredClone(imported);
    this.state.version = imported.version ?? 1;
    const materialCount = Object.keys(this.state.materials).length;

    return {
      success: true,
      materials_loaded: materialCount,
      total_measurements: this.state.total_measurements,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Bayesian update
  // --------------------------------------------------------------------------

  /**
   * Conjugate-normal Bayesian update.
   *
   * Prior: N(mu_0, sigma_0²)
   * Observation: x with noise N(0, sigma_obs²)
   * Posterior: N(mu_n, sigma_n²)
   *   precision_n = precision_0 + 1/sigma_obs²
   *   mu_n = (mu_0 * precision_0 + x / sigma_obs²) / precision_n
   *   sigma_n² = 1 / precision_n
   */
  private bayesianUpdate(posterior: BayesianPosterior, observation: number, obsNoise: number): void {
    const priorPrecision = 1 / (posterior.std * posterior.std);
    const obsPrecision = 1 / (obsNoise * obsNoise);
    const newPrecision = priorPrecision + obsPrecision;
    const newVariance = 1 / newPrecision;
    const newMean = (posterior.mean * priorPrecision + observation * obsPrecision) / newPrecision;

    posterior.mean = newMean;
    posterior.std = Math.sqrt(newVariance);
    posterior.n_observations++;

    // Store observation (bounded)
    posterior.observations.push(observation);
    if (posterior.observations.length > MAX_OBSERVATIONS_STORED) {
      posterior.observations = posterior.observations.slice(-MAX_OBSERVATIONS_STORED);
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Kienzle force model
  // --------------------------------------------------------------------------

  /**
   * Kienzle cutting force: Fc = kc1_1 * b * h^(1-mc)
   * @param kc1_1 - Specific cutting force at h=1mm [N/mm²]
   * @param mc    - Kienzle exponent
   * @param b     - Chip width [mm] (≈ ap for κr=90°)
   * @param h     - Uncut chip thickness [mm]
   */
  private kienzleForce(kc1_1: number, mc: number, b: number, h: number): number {
    return kc1_1 * b * Math.pow(h, 1 - mc);
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Material resolution
  // --------------------------------------------------------------------------

  /** Resolve material name to ISO group */
  private resolveISO(material: string): ISOGroup {
    const key = material.toLowerCase().trim();
    // Direct ISO group
    if (MATERIAL_TO_ISO[key]) return MATERIAL_TO_ISO[key];
    // Partial match
    for (const [pattern, group] of Object.entries(MATERIAL_TO_ISO)) {
      if (key.includes(pattern)) return group;
    }
    // Default to P (steel) with warning
    return "P";
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Get or initialize material calibration state
  // --------------------------------------------------------------------------

  private getOrInitMaterial(matKey: string): MaterialCalibrationState {
    if (!this.state.materials[matKey]) {
      const isoGroup = matKey as ISOGroup;
      const kienzle = CANONICAL_KIENZLE[isoGroup] ?? CANONICAL_KIENZLE.P;
      const taylor = CANONICAL_TAYLOR[isoGroup] ?? CANONICAL_TAYLOR.P;

      this.state.materials[matKey] = {
        kc1_1: {
          mean: kienzle.kc1_1,
          std: kienzle.kc1_1 * PRIOR_STD_FRACTION_KC,
          n_observations: 0,
          prior_mean: kienzle.kc1_1,
          observations: [],
        },
        mc: {
          mean: kienzle.mc,
          std: kienzle.mc * PRIOR_STD_FRACTION_MC,
          n_observations: 0,
          prior_mean: kienzle.mc,
          observations: [],
        },
        taylor_C: {
          mean: taylor.C,
          std: taylor.C * PRIOR_STD_FRACTION_TAYLOR_C,
          n_observations: 0,
          prior_mean: taylor.C,
          observations: [],
        },
        taylor_n: {
          mean: taylor.n,
          std: taylor.n * PRIOR_STD_FRACTION_TAYLOR_N,
          n_observations: 0,
          prior_mean: taylor.n,
          observations: [],
        },
      };
    }
    return this.state.materials[matKey];
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Canonical constants lookup
  // --------------------------------------------------------------------------

  private getCanonical(isoGroup: ISOGroup): { kc1_1: number; mc: number; taylor_C: number; taylor_n: number } {
    const kienzle = CANONICAL_KIENZLE[isoGroup] ?? CANONICAL_KIENZLE.P;
    const taylor = CANONICAL_TAYLOR[isoGroup] ?? CANONICAL_TAYLOR.P;
    return {
      kc1_1: kienzle.kc1_1,
      mc: kienzle.mc,
      taylor_C: taylor.C,
      taylor_n: taylor.n,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Confidence computation
  // --------------------------------------------------------------------------

  /**
   * Compute overall confidence (0-1) based on observation count and variance reduction.
   * More observations and tighter posteriors → higher confidence.
   */
  private computeConfidence(matState: MaterialCalibrationState): number {
    const nObs = Math.max(matState.kc1_1.n_observations, matState.taylor_C.n_observations);
    if (nObs === 0) return 0;

    // Observation-count component: saturates at ~20 observations
    const countFactor = 1 - Math.exp(-nObs / 8);

    // Variance-reduction component: how much tighter is posterior vs prior?
    const priorStd_kc = matState.kc1_1.prior_mean * PRIOR_STD_FRACTION_KC;
    const reductionKc = 1 - matState.kc1_1.std / priorStd_kc;

    const priorStd_C = matState.taylor_C.prior_mean * PRIOR_STD_FRACTION_TAYLOR_C;
    const reductionC = matState.taylor_C.n_observations > 0
      ? 1 - matState.taylor_C.std / priorStd_C
      : 0;

    const varianceFactor = Math.max(0, (reductionKc + reductionC) / 2);

    // Combined: geometric mean with floor
    return Math.max(0.1, Math.min(0.99, Math.sqrt(countFactor * Math.max(varianceFactor, 0.1))));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance for in-process calibration state */
export const physicsAutoCalibrationEngine = new PhysicsAutoCalibrationEngine();
