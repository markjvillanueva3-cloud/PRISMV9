/**
 * Stability Lobe Diagram (SLD) Calculator
 *
 * Computes the stability boundary for regenerative chatter in milling.
 *
 * Theory (Altintas & Budak, 1995):
 *   b_lim = -1 / (2·Ks·N_t·α_xx·Re[G(ω_c)] / k)
 *
 * Where:
 * - b_lim: critical axial depth of cut [mm]
 * - Ks: specific cutting force [N/mm²]
 * - N_t: number of teeth
 * - α_xx: average directional factor (depends on radial immersion)
 * - G(ω_c): FRF at chatter frequency
 * - k: structural stiffness [N/m]
 *
 * Sweet spots occur at RPMs where lobes peak (maximum stable depth).
 *
 * SAFETY-CRITICAL: Chatter predictions affect machine stability,
 * tool life, and surface quality. Conservative results preferred.
 *
 * References:
 * - Altintas, Y. & Budak, E. (1995). "Analytical Prediction of
 *   Stability Lobes in Milling"
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.4
 * - Tlusty, J. (2000). "Manufacturing Processes and Equipment"
 *
 * @module algorithms/StabilityLobeDiagram
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface StabilityLobeInput {
  /** Natural frequency of the dominant mode [Hz]. */
  natural_frequency: number;
  /** Damping ratio ζ [-] (typically 0.01-0.1). */
  damping_ratio: number;
  /** Structural stiffness [N/m]. */
  stiffness: number;
  /** Specific cutting force [N/mm²]. */
  specific_cutting_force: number;
  /** Number of teeth/flutes. */
  num_teeth: number;
  /** Radial immersion ratio ae/D (0-1, default 1.0 = full slot). */
  radial_immersion?: number;
  /** RPM range [min, max] (default [1000, 20000]). */
  rpm_range?: [number, number];
  /** Number of lobe points per lobe (default 100). */
  num_points?: number;
  /** Number of lobes to compute (default 10). */
  num_lobes?: number;
}

export interface StabilityLobe {
  /** Lobe index (k=0 is rightmost). */
  lobe_number: number;
  /** RPM values. */
  rpm: number[];
  /** Stability limit depth of cut [mm]. */
  depth_limit: number[];
}

export interface SweetSpot {
  /** RPM at sweet spot. */
  rpm: number;
  /** Maximum stable depth at this RPM [mm]. */
  max_depth: number;
  /** Lobe number. */
  lobe_number: number;
}

export interface StabilityLobeOutput extends WithWarnings {
  /** Array of stability lobes. */
  lobes: StabilityLobe[];
  /** Top sweet spots (sorted by max_depth desc). */
  sweet_spots: SweetSpot[];
  /** Minimum stable depth across all RPMs [mm]. */
  unconditional_limit: number;
  /** Average directional factor used. */
  directional_factor: number;
  /** Chatter frequency [Hz]. */
  chatter_frequency: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MIN_FREQ: 10,         // Hz
  MAX_FREQ: 50000,
  MIN_DAMPING: 0.001,
  MAX_DAMPING: 0.5,
  MIN_STIFFNESS: 1e3,   // N/m
  MAX_STIFFNESS: 1e10,
  MIN_KS: 50,           // N/mm²
  MAX_KS: 10000,
  MAX_DEPTH: 50,        // mm — reasonable physical limit
};

// ── Algorithm Implementation ────────────────────────────────────────

export class StabilityLobeDiagram implements Algorithm<StabilityLobeInput, StabilityLobeOutput> {

  validate(input: StabilityLobeInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.natural_frequency || input.natural_frequency < LIMITS.MIN_FREQ || input.natural_frequency > LIMITS.MAX_FREQ) {
      issues.push({ field: "natural_frequency", message: `Natural frequency must be ${LIMITS.MIN_FREQ}-${LIMITS.MAX_FREQ} Hz, got ${input.natural_frequency}`, severity: "error" });
    }
    if (!input.damping_ratio || input.damping_ratio < LIMITS.MIN_DAMPING || input.damping_ratio > LIMITS.MAX_DAMPING) {
      issues.push({ field: "damping_ratio", message: `Damping ratio must be ${LIMITS.MIN_DAMPING}-${LIMITS.MAX_DAMPING}, got ${input.damping_ratio}`, severity: "error" });
    }
    if (!input.stiffness || input.stiffness < LIMITS.MIN_STIFFNESS || input.stiffness > LIMITS.MAX_STIFFNESS) {
      issues.push({ field: "stiffness", message: `Stiffness must be ${LIMITS.MIN_STIFFNESS}-${LIMITS.MAX_STIFFNESS} N/m, got ${input.stiffness}`, severity: "error" });
    }
    if (!input.specific_cutting_force || input.specific_cutting_force < LIMITS.MIN_KS || input.specific_cutting_force > LIMITS.MAX_KS) {
      issues.push({ field: "specific_cutting_force", message: `Ks must be ${LIMITS.MIN_KS}-${LIMITS.MAX_KS} N/mm², got ${input.specific_cutting_force}`, severity: "error" });
    }
    if (!input.num_teeth || input.num_teeth < 1 || input.num_teeth > 100) {
      issues.push({ field: "num_teeth", message: `Number of teeth must be 1-100, got ${input.num_teeth}`, severity: "error" });
    }
    if (input.radial_immersion !== undefined && (input.radial_immersion <= 0 || input.radial_immersion > 1)) {
      issues.push({ field: "radial_immersion", message: `Radial immersion must be 0-1, got ${input.radial_immersion}`, severity: "error" });
    }
    if (input.damping_ratio && input.damping_ratio < 0.01) {
      issues.push({ field: "damping_ratio", message: `Very low damping (${input.damping_ratio}) — system is chatter-prone`, severity: "warning" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: StabilityLobeInput): StabilityLobeOutput {
    const warnings: string[] = [];
    const {
      natural_frequency,
      damping_ratio,
      stiffness,
      specific_cutting_force: Ks,
      num_teeth,
      radial_immersion = 1.0,
      rpm_range = [1000, 20000],
      num_points = 100,
      num_lobes = 10,
    } = input;

    const omega_n = 2 * Math.PI * natural_frequency;

    // Average directional factor (depends on radial immersion)
    // α_xx = (1/2π)(φ_s - sin(2φ_s)/2) where φ_s = arccos(1 - 2·ae/D)
    const phi_s = Math.acos(Math.max(-1, 1 - 2 * radial_immersion));
    const alpha_xx = (1 / (2 * Math.PI)) * (phi_s - Math.sin(2 * phi_s) / 2);

    // Damped natural frequency (chatter frequency)
    const omega_c = omega_n * Math.sqrt(1 - damping_ratio * damping_ratio);
    const chatter_frequency = omega_c / (2 * Math.PI);

    // FRF at chatter frequency
    const r = omega_c / omega_n;
    const denom = (1 - r * r) * (1 - r * r) + (2 * damping_ratio * r) * (2 * damping_ratio * r);
    const G_real = (1 - r * r) / denom;

    const lobes: StabilityLobe[] = [];
    let unconditional_limit = Infinity;

    for (let k = 0; k < num_lobes; k++) {
      const lobe: StabilityLobe = { lobe_number: k, rpm: [], depth_limit: [] };

      for (let i = 0; i < num_points; i++) {
        const epsilon = -2 * Math.PI * i / num_points;

        // Spindle speed for this lobe point
        const N = (60 * omega_c) / (2 * Math.PI * (k + epsilon / (2 * Math.PI)) * num_teeth);

        if (N >= rpm_range[0] && N <= rpm_range[1]) {
          // Stability limit depth
          const b_lim = -1 / (2 * Ks * alpha_xx * num_teeth * G_real / stiffness);

          if (b_lim > 0 && b_lim < LIMITS.MAX_DEPTH) {
            lobe.rpm.push(N);
            lobe.depth_limit.push(b_lim);

            if (b_lim < unconditional_limit) {
              unconditional_limit = b_lim;
            }
          }
        }
      }

      if (lobe.rpm.length > 0) {
        // Sort by RPM
        const sorted = lobe.rpm.map((rpm, i) => ({ rpm, doc: lobe.depth_limit[i] }))
          .sort((a, b) => a.rpm - b.rpm);
        lobe.rpm = sorted.map(x => Math.round(x.rpm));
        lobe.depth_limit = sorted.map(x => Math.round(x.doc * 100) / 100);
        lobes.push(lobe);
      }
    }

    // Find sweet spots (local maxima in each lobe)
    const sweet_spots: SweetSpot[] = [];
    for (const lobe of lobes) {
      for (let i = 1; i < lobe.depth_limit.length - 1; i++) {
        if (lobe.depth_limit[i] > lobe.depth_limit[i - 1] &&
            lobe.depth_limit[i] > lobe.depth_limit[i + 1]) {
          sweet_spots.push({
            rpm: lobe.rpm[i],
            max_depth: lobe.depth_limit[i],
            lobe_number: lobe.lobe_number,
          });
        }
      }
    }
    sweet_spots.sort((a, b) => b.max_depth - a.max_depth);

    // Warnings
    if (unconditional_limit === Infinity) {
      unconditional_limit = 0;
      warnings.push("Could not determine stability boundary — check input parameters");
    }
    if (unconditional_limit < 0.5) {
      warnings.push(`Very low unconditional limit (${unconditional_limit.toFixed(2)}mm) — system is chatter-prone`);
    }
    if (lobes.length === 0) {
      warnings.push("No lobes generated in RPM range — try wider range or different parameters");
    }
    if (alpha_xx < 0.01) {
      warnings.push(`Very low directional factor (${alpha_xx.toFixed(4)}) — light radial engagement`);
    }

    return {
      lobes,
      sweet_spots: sweet_spots.slice(0, 5),
      unconditional_limit: Math.round(unconditional_limit * 100) / 100,
      directional_factor: Math.round(alpha_xx * 10000) / 10000,
      chatter_frequency: Math.round(chatter_frequency * 10) / 10,
      warnings,
      calculation_method: "Stability Lobe Diagram (Altintas-Budak 1995)",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "stability-lobe",
      name: "Stability Lobe Diagram Calculator",
      description: "Computes stability boundary for regenerative chatter in milling",
      formula: "b_lim = -1 / (2·Ks·N_t·α_xx·Re[G(ω_c)] / k)",
      reference: "Altintas & Budak (1995); Altintas (2012) Ch.4",
      safety_class: "critical",
      domain: "stability",
      inputs: {
        natural_frequency: "Natural frequency [Hz]",
        damping_ratio: "Damping ratio ζ [-]",
        stiffness: "Structural stiffness [N/m]",
        specific_cutting_force: "Specific cutting force Ks [N/mm²]",
        num_teeth: "Number of teeth [-]",
        radial_immersion: "Radial immersion ae/D [-]",
      },
      outputs: {
        lobes: "Stability lobe curves",
        sweet_spots: "Optimal RPMs for max depth",
        unconditional_limit: "Min stable depth [mm]",
        chatter_frequency: "Chatter frequency [Hz]",
      },
    };
  }
}
