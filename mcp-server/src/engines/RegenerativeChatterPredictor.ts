/**
 * RegenerativeChatterPredictor — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Predicts regenerative chatter onset using stability lobe theory.
 * Chatter causes tool breakage, workpiece scrap, spindle damage,
 * and can eject workpieces — serious safety hazard.
 *
 * Implements Altintas-Budak analytical stability model for
 * turning and milling stability lobes.
 *
 * Actions: chatter_predict, chatter_stability_lobes, chatter_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type CutType = "slotting" | "half_immersion_up" | "half_immersion_down" | "quarter_immersion" | "full_immersion" | "turning";

export interface ChatterInput {
  cut_type: CutType;
  spindle_rpm: number;
  depth_of_cut_mm: number;
  num_flutes: number;
  tool_diameter_mm: number;
  natural_freq_Hz: number;            // dominant tool-point FRF
  stiffness_N_per_m: number;          // static stiffness at tool tip
  damping_ratio: number;              // modal damping ratio (0.01-0.10 typical)
  specific_cutting_force_N_mm2: number; // Kc (material-dependent)
  radial_depth_mm?: number;           // for milling (default = tool_diameter)
}

export interface StabilityLobe {
  lobe_number: number;
  rpm: number;
  critical_depth_mm: number;
}

export interface ChatterResult {
  is_stable: boolean;
  stability_margin_pct: number;       // positive = stable, negative = chatter
  critical_depth_mm: number;          // max stable depth at current RPM
  current_depth_mm: number;
  chatter_frequency_Hz: number;
  optimal_rpm: number;                // nearest lobe peak (max stable depth)
  optimal_depth_mm: number;           // max depth at optimal RPM
  stability_lobes: StabilityLobe[];
  severity: "stable" | "marginal" | "chatter" | "severe_chatter";
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RegenerativeChatterPredictor {
  predict(input: ChatterInput): ChatterResult {
    const fn = input.natural_freq_Hz;
    const zeta = input.damping_ratio;
    const k = input.stiffness_N_per_m;
    const Kc = input.specific_cutting_force_N_mm2;
    const Z = input.num_flutes;

    // Directional factor based on cut type
    const mu = this._directionalFactor(input);

    // Critical depth at arbitrary RPM (Altintas-Budak)
    // b_lim = -1 / (2 * Kc * mu * Re[G(jωc)])
    // For simplified single-mode: b_lim = k * (1 + kappa^2) / (Kc * Z * mu)
    // where kappa = Im/Re of oriented FRF

    // Chatter frequency search: ωc near natural frequency
    const omegaN = 2 * Math.PI * fn;

    // For each lobe, find the critical depth
    const lobes: StabilityLobe[] = [];
    let bestLobe: StabilityLobe | null = null;

    for (let N = 0; N <= 20; N++) {
      // Phase: epsilon = 3*pi - 2*N*pi (for N=0,1,2...)
      // RPM at lobe center: n = 60 * fc / (Z * (N + epsilon/(2*pi)))
      const epsilon = Math.PI; // simplified: at the peak of each lobe
      const lobeRpm = Math.round(60 * fn / (Z * (N + epsilon / (2 * Math.PI))));

      if (lobeRpm < 100 || lobeRpm > 60000) continue;

      // Critical depth at lobe peak (most stable point)
      // b_lim_peak = (2*k*(1+kappa_min^2)) / (Z*Kc*mu)
      // At lobe peak, kappa_min → 0, so:
      // b_lim_peak = 2*k / (Z*Kc*mu) at high damping
      // But with real damping: b_lim ≈ k * 2 * zeta * (1 + 1/(4*zeta^2)) / (Z * Kc * mu)
      const bLimPeak = (k * 2 * zeta * (1 + 1 / (4 * zeta ** 2))) / (Z * Kc * mu * 1e6);

      lobes.push({
        lobe_number: N,
        rpm: lobeRpm,
        critical_depth_mm: Math.round(bLimPeak * 1000) / 1000,
      });

      if (!bestLobe || bLimPeak > bestLobe.critical_depth_mm) {
        bestLobe = lobes[lobes.length - 1];
      }
    }

    // Critical depth at current RPM (between lobes = minimum stability)
    // Minimum b_lim between lobes: b_lim_min = k / (Z * Kc * mu) * 2 * zeta
    const bLimMin = (k * 2 * zeta) / (Z * Kc * mu * 1e6);

    // Find nearest lobe to current RPM for more accurate estimate
    const currentRpm = input.spindle_rpm;
    let criticalDepth = bLimMin; // conservative: between-lobe minimum

    for (const lobe of lobes) {
      const rpmDist = Math.abs(currentRpm - lobe.rpm) / lobe.rpm;
      if (rpmDist < 0.1) {
        // Near a lobe peak — interpolate
        criticalDepth = bLimMin + (lobe.critical_depth_mm - bLimMin) * (1 - rpmDist / 0.1);
        break;
      }
    }

    // Stability check
    const margin = (criticalDepth - input.depth_of_cut_mm) / criticalDepth * 100;
    const isStable = input.depth_of_cut_mm <= criticalDepth;

    // Chatter frequency (slightly above natural frequency)
    const chatterFreq = fn * (1 + zeta * 0.5);

    // Severity
    const severity: ChatterResult["severity"] =
      margin > 20 ? "stable"
      : margin > 0 ? "marginal"
      : margin > -30 ? "chatter"
      : "severe_chatter";

    // Recommendations
    const recs: string[] = [];
    if (severity === "severe_chatter") {
      recs.push("SAFETY: Severe chatter predicted — STOP. Risk of tool breakage and workpiece ejection");
      recs.push(`Reduce depth of cut to ${criticalDepth.toFixed(2)}mm or less`);
    }
    if (severity === "chatter") {
      recs.push(`Chatter predicted at ${currentRpm} RPM with ${input.depth_of_cut_mm}mm depth`);
      recs.push(`Maximum stable depth: ${criticalDepth.toFixed(2)}mm`);
    }
    if (bestLobe && Math.abs(currentRpm - bestLobe.rpm) / bestLobe.rpm > 0.05) {
      recs.push(`Optimal RPM for max depth: ${bestLobe.rpm} RPM (allows ${bestLobe.critical_depth_mm.toFixed(2)}mm depth)`);
    }
    if (severity === "marginal") {
      recs.push("Operating near stability boundary — monitor vibration closely");
    }
    if (zeta < 0.02) {
      recs.push("Very low damping — consider damped toolholder or vibration absorber");
    }
    if (recs.length === 0) {
      recs.push("Cutting parameters within stable envelope — proceed");
    }

    return {
      is_stable: isStable,
      stability_margin_pct: Math.round(margin * 10) / 10,
      critical_depth_mm: Math.round(criticalDepth * 1000) / 1000,
      current_depth_mm: input.depth_of_cut_mm,
      chatter_frequency_Hz: Math.round(chatterFreq * 10) / 10,
      optimal_rpm: bestLobe ? bestLobe.rpm : currentRpm,
      optimal_depth_mm: bestLobe ? bestLobe.critical_depth_mm : criticalDepth,
      stability_lobes: lobes.slice(0, 10), // first 10 lobes
      severity,
      recommendations: recs,
    };
  }

  private _directionalFactor(input: ChatterInput): number {
    if (input.cut_type === "turning") return 1.0;

    // Milling directional factor depends on radial immersion
    const ae = input.radial_depth_mm || input.tool_diameter_mm;
    const D = input.tool_diameter_mm;
    const ratio = ae / D;

    if (input.cut_type === "slotting" || input.cut_type === "full_immersion") return 1.0;
    if (input.cut_type === "half_immersion_down") return 0.75;
    if (input.cut_type === "half_immersion_up") return 0.75;
    if (input.cut_type === "quarter_immersion") return 0.5;

    // General: approximate as sin(phi_s) integration
    return Math.max(0.3, ratio);
  }

  stabilityLobes(input: Omit<ChatterInput, "spindle_rpm" | "depth_of_cut_mm">, rpmRange: [number, number]): StabilityLobe[] {
    const fullInput: ChatterInput = { ...input, spindle_rpm: rpmRange[0], depth_of_cut_mm: 0 } as ChatterInput;
    const result = this.predict(fullInput);
    return result.stability_lobes.filter(l => l.rpm >= rpmRange[0] && l.rpm <= rpmRange[1]);
  }
}

export const regenerativeChatterPredictor = new RegenerativeChatterPredictor();
