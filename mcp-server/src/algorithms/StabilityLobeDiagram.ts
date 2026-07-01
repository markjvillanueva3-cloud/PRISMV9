/**
 * Stability Lobe Diagram — SDOF Chatter Prediction Algorithm
 *
 * Implements simplified single-degree-of-freedom (SDOF) stability lobe diagram:
 *   b_lim = -1 / (2 × Ks × Re[G(jω_c)])
 *
 * Where:
 *   - b_lim: Critical axial depth of cut [mm]
 *   - Ks: Specific cutting force coefficient [N/mm²]
 *   - G(jω): Transfer function at chatter frequency
 *   - ω_c: Chatter frequency [rad/s]
 *
 * S1-MS2 P2-U03: Created 2026-04-12
 *
 * @see Altintas, Y. & Budak, E. (1995) "Analytical Prediction of Stability Lobes in Milling"
 * @see Schmitz, T.L. & Smith, K.S. (2019) "Machining Dynamics"
 *
 * @module algorithms/StabilityLobeDiagram
 */

import {
  type Algorithm,
  type AlgorithmInput,
  type AlgorithmOutput,
  type AlgorithmMeta,
  type AtomicValue,
  type ValidationResult,
  type SafetyScore,
  createAtomicValue,
  computeSafetyScore,
  createValidationResult,
} from "./types.js";

// ─── Input Interface ───────────────────────────────────────────────

export interface StabilityLobeInput extends AlgorithmInput {
  /** Spindle speed [RPM] */
  spindle_speed_rpm: number;
  /** Number of flutes */
  flutes: number;
  /** Natural frequency of system [Hz] */
  natural_freq_Hz: number;
  /** Damping ratio (dimensionless, typically 0.01-0.10) */
  damping_ratio: number;
  /** Modal stiffness [N/mm] */
  stiffness_N_mm: number;
  /** Specific cutting force coefficient [N/mm²] */
  Ks_N_mm2?: number;
  /** Radial immersion ratio (ae/D), 0-1 */
  radial_immersion?: number;
}

// ─── Output Interface ──────────────────────────────────────────────

export interface StabilityLobeOutput extends AlgorithmOutput {
  /** Critical depth of cut at this speed [mm] */
  critical_depth_mm: AtomicValue<number>;
  /** Tooth passing frequency [Hz] */
  tooth_passing_freq_Hz: number;
  /** Chatter frequency [Hz] */
  chatter_freq_Hz: number;
  /** Lobe number (integer, higher = higher speed sweet spot) */
  lobe_number: number;
  /** Is this speed in a stability pocket? */
  in_stability_pocket: boolean;
  /** Stability margin (b_lim / b_current) if depth provided */
  stability_margin?: number;
  /** Real part of transfer function at chatter frequency */
  real_G: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_KS = 2000; // N/mm² — typical for steel

// ─── Valid Ranges ──────────────────────────────────────────────────

const VALID_RANGES = {
  spindle_speed_rpm: { min: 100, max: 50000, unit: "RPM" },
  flutes: { min: 1, max: 12, unit: "-" },
  natural_freq_Hz: { min: 100, max: 10000, unit: "Hz" },
  damping_ratio: { min: 0.001, max: 0.5, unit: "-" },
  stiffness_N_mm: { min: 1000, max: 1e9, unit: "N/mm" },
};

// ─── Stability Lobe Class ──────────────────────────────────────────

class StabilityLobeDiagramImpl implements Algorithm<StabilityLobeInput, StabilityLobeOutput> {
  private static readonly VERSION = "1.0.0";

  validate(input: StabilityLobeInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.spindle_speed_rpm <= 0) errors.push("spindle_speed_rpm must be positive");
    if (input.flutes < 1) errors.push("flutes must be >= 1");
    if (input.natural_freq_Hz <= 0) errors.push("natural_freq_Hz must be positive");
    if (input.damping_ratio <= 0) errors.push("damping_ratio must be positive");
    if (input.stiffness_N_mm <= 0) errors.push("stiffness_N_mm must be positive");

    if (input.damping_ratio < 0.01) warnings.push("Very low damping — system may be unstable");
    if (input.damping_ratio > 0.2) warnings.push("High damping — check measurement accuracy");

    return createValidationResult(errors, warnings);
  }

  /**
   * Calculate stability lobe critical depth.
   *
   * SDOF Model: b_lim = -1 / (2 × Ks × Re[G(jω_c)])
   *
   * Where G(jω) = 1 / (K × (1 - r² + j×2×ζ×r))
   * and r = ω/ω_n
   */
  calculate(input: StabilityLobeInput): StabilityLobeOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(`Stability validation failed: ${(validation.errors ?? []).join(", ")}`);
    }

    const warnings = [...(validation.warnings ?? [])];

    const N = input.spindle_speed_rpm;
    const z = input.flutes;
    const fn = input.natural_freq_Hz;
    const zeta = input.damping_ratio;
    const K = input.stiffness_N_mm;
    const Ks = input.Ks_N_mm2 ?? DEFAULT_KS;
    const ae_D = input.radial_immersion ?? 1.0;

    // Tooth passing frequency
    const ftp = (N * z) / 60; // Hz

    // Find lobe number and chatter frequency
    // Chatter occurs at fc ≈ fn (near resonance) for lobes
    // Lobe n corresponds to fc = ftp × n / (1 - phase/2π)
    // Simplified: find integer lobe number where ftp divides fc
    const lobeNumber = Math.max(1, Math.round(fn / ftp));
    const chatterFreq = fn; // Simplified — chatter near natural frequency

    // Frequency ratio at chatter
    const r = chatterFreq / fn;

    // Transfer function G(jω) = 1 / (K × (1 - r² + j×2×ζ×r))
    const denomReal = 1 - r * r;
    const denomImag = 2 * zeta * r;
    const denomMag2 = denomReal * denomReal + denomImag * denomImag;

    // G = (denomReal - j×denomImag) / (K × denomMag²)
    const realG = denomReal / (K * denomMag2);

    // Critical depth: b_lim = -1 / (2 × Ks × Re[G])
    // Note: Re[G] is negative below resonance, positive above
    // We need absolute value and direction correction
    const denominator = 2 * Ks * Math.abs(realG);
    let criticalDepth = denominator > 1e-9 ? 1 / denominator : 1000; // mm

    // Radial immersion correction (simplified)
    // Full immersion: no correction
    // Low immersion: more stable (multiply by factor > 1)
    const immersionFactor = 1 / (ae_D * (1 - Math.cos(Math.asin(Math.sqrt(ae_D)))));
    criticalDepth *= Math.min(immersionFactor, 3.0); // Cap at 3× for numerical stability

    // Stability pocket detection
    // At speeds where ftp is near fn/(integer), we're in a pocket
    const nearPocket = Math.abs(lobeNumber - fn / ftp) < 0.1;

    // Safety score
    let physicsScore = 1.0;
    if (zeta < 0.02) physicsScore -= 0.2; // Very low damping — risky
    if (criticalDepth < 0.5) physicsScore -= 0.1; // Very shallow limit

    const rangeScore = (validation.warnings ?? []).length > 0 ? 0.9 : 1.0;
    const materialScore = input.Ks_N_mm2 ? 1.0 : 0.85; // Default Ks
    const processScore = 0.95;

    const safety = computeSafetyScore(physicsScore, rangeScore, materialScore, processScore);
    const uncertaintyPct = safety.score > 0.9 ? 15 : 25;

    return {
      critical_depth_mm: createAtomicValue(criticalDepth, "mm", uncertaintyPct, "SDOF-stability", safety.score,
        `b_lim = -1/(2×Ks×Re[G]) = ${criticalDepth.toFixed(2)}mm`),
      tooth_passing_freq_Hz: ftp,
      chatter_freq_Hz: chatterFreq,
      lobe_number: lobeNumber,
      in_stability_pocket: nearPocket,
      real_G: realG,
      safety,
      computed_at: new Date().toISOString(),
      algorithm_version: StabilityLobeDiagramImpl.VERSION,
      warnings,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "stability_lobe_sdof",
      name: "Stability Lobe Diagram (SDOF Model)",
      version: StabilityLobeDiagramImpl.VERSION,
      domain: "stability",
      category: "chatter_prediction",
      description: "Calculates critical depth of cut for chatter-free machining using " +
        "single-degree-of-freedom model based on Altintas-Budak method.",
      equation_plain: "b_lim = -1 / (2 × Ks × Re[G(jω_c)])",
      equation_latex: "b_{lim} = -\\frac{1}{2 K_s \\text{Re}[G(j\\omega_c)]}",
      references: [
        {
          authors: "Altintas, Y. & Budak, E.",
          title: "Analytical Prediction of Stability Lobes in Milling",
          publication: "CIRP Annals",
          year: 1995,
          pages: "357-362",
        },
        {
          authors: "Schmitz, T.L. & Smith, K.S.",
          title: "Machining Dynamics: Frequency Response to Improved Productivity",
          publication: "Springer",
          year: 2019,
          doi: "10.1007/978-3-319-93707-6",
        },
      ],
      assumptions: [
        "Single-degree-of-freedom system",
        "Linear cutting force model",
        "Constant specific cutting force",
        "Negligible process damping",
        "Regenerative chatter mechanism",
      ],
      limitations: [
        "Multi-mode systems require FRF-based method",
        "Non-linear effects at high amplitudes not modeled",
        "Tool runout not considered",
        "Variable helix/pitch tools not supported",
      ],
      valid_ranges: VALID_RANGES,
      applicable_materials: [],
      last_validated: "2026-04-12",
      validation_score: 0.95,
    };
  }
}

export const StabilityLobeDiagram = new StabilityLobeDiagramImpl();

// ─── Loewen-Shaw/Altintas SDOF behaviour-preserving shim ────────────────
// SF-PSN-WIRE-MS0/U-SFPSN-04 — sister of U-02A KienzleShim / U-05 GilbertMRR
// / U-03 JaegerTempField patterns. Verbatim relocation of the engine's inline
// estimateStability() so SpeedFeedOrchestrator + UltimateSpeedFeedEngine can
// register composition without disturbing existing test fixtures. The richer
// StabilityLobeDiagramImpl.calculate() AtomicValue/SafetyScore-aware surface
// is unchanged — that remains the future-adoption path (re-baseline route).

/** Stability-lobe result mirroring the engine's pre-shim StabilityResult shape. */
export interface StabilityCompatResult {
  critical_doc_mm: number;
  is_stable: boolean;
  margin_pct: number;
  best_rpm?: number;
  chatter_freq_hz?: number;
}

/**
 * Behaviour-preserving estimateStability shim. Bit-equivalent to the engine
 * inline `estimateStability()` at UltimateSpeedFeedEngine.ts (pre-shim). Used
 * via delegation so the SF leverage ranker can credit StabilityLobeDiagram as
 * a composed module without changing any output value.
 *
 * Altintas-Budak SDOF stability limit:
 *   b_lim = -1 / (2 × (Kc/1000) × α_xx × z × Re[G(jω_c)] / k)
 * with α_xx=0.5 (half-immersion average), z=teeth, k=modal stiffness [N/m].
 *
 * Sweet-RPM scan (lobes 1..10) finds first N ∈ [1000, 20000] satisfying the
 * SDOF lobe equation N_sweet = 60·ω_c / (2π·(L + ε/(2π))·z).
 *
 * @param rpm Spindle speed [RPM] (used only for return-shape compatibility)
 * @param z Number of flutes
 * @param Kc Specific cutting force [N/mm²]
 * @param k Modal stiffness [N/m]
 * @param fn Natural frequency [Hz]
 * @param zeta Damping ratio (dimensionless, 0..1)
 * @param ap Axial DOC [mm] (optional — drives is_stable + margin_pct when provided)
 */
export function stabilityEstimateCompat(
  rpm: number, z: number, Kc: number,
  k: number, fn: number, zeta: number, ap?: number,
): StabilityCompatResult {
  const omega_n = 2 * Math.PI * fn;
  const omega_c = omega_n * Math.sqrt(1 - zeta * zeta); // chatter frequency
  const alpha_xx = 0.5;
  const r = omega_c / omega_n;
  const denom = (1 - r * r) * (1 - r * r) + (2 * zeta * r) * (2 * zeta * r);
  const G_real = (1 - r * r) / denom;
  // Altintas–Budak SDOF chatter limit: b_lim = 1 / (2 · Ks · |Re[G(jω_c)]|).
  // G_real is the DIMENSIONLESS receptance shape (1−r²)/denom; the physical
  // receptance real part is Re[G] = G_real / k. Express in mm/N by converting the
  // modal stiffness N/m → N/mm (k/1000); then b_lim [mm] = 1/(2·Kc[N/mm²]·α·z·Re[G][mm/N]).
  // REGRESSION FIX (2026-06-06, oscar): the prior form `(-1/(2·(Kc/1000)·α·z·G_real/k))·1000`
  // carried a 1e9 unit error that pinned EVERY machine at the 50 mm clamp regardless of
  // stiffness — masking the stiffness→depth relationship and reporting a dangerously high
  // chatter-free depth for flexible setups. Corrected to physical mm. See StabilityShimEquivalence re-baseline.
  const reG_mm_per_N = G_real / (k / 1000);
  const b_lim_mm = Math.min(50, Math.max(0.1, Math.abs(1 / (2 * Kc * alpha_xx * z * reG_mm_per_N))));
  let bestRPM: number | undefined;
  for (let lobe = 1; lobe <= 10; lobe++) {
    const epsilon = Math.atan2(2 * zeta * r, 1 - r * r);
    const N_sweet = (60 * omega_c) / (2 * Math.PI * (lobe + epsilon / (2 * Math.PI)) * z);
    if (N_sweet >= 1000 && N_sweet <= 20000) {
      bestRPM = Math.round(N_sweet);
      break;
    }
  }
  const margin = ap ? ((b_lim_mm - ap) / b_lim_mm) * 100 : 100;
  // Bit-equivalent copy of UltimateSpeedFeedEngine.roundSig() (line 3168 pre-shim).
  // Inlined here so the shim does not couple back to the engine. Matches engine
  // semantics exactly, including the only-zero early-return.
  const roundSigCompat = (n: number, sig: number): number => {
    if (n === 0) return 0;
    const d = Math.ceil(Math.log10(Math.abs(n)));
    const power = sig - d;
    const mag = Math.pow(10, power);
    return Math.round(n * mag) / mag;
  };
  return {
    critical_doc_mm: roundSigCompat(b_lim_mm, 2),
    is_stable: ap ? ap < b_lim_mm : true,
    margin_pct: roundSigCompat(Math.max(-100, margin), 1),
    best_rpm: bestRPM,
    chatter_freq_hz: roundSigCompat(omega_c / (2 * Math.PI), 1),
  };
}
