/**
 * FRF-Based Stability Lobe Diagram — Frequency Response Function Method
 *
 * Computes stability lobe diagrams from measured or modeled Frequency Response
 * Functions (FRF) of the tool-holder-spindle assembly. Uses Altintas-Budak (1995)
 * zero-order analytical method for chatter prediction.
 *
 * Unlike the existing StabilityLobeDiagram (which uses simplified SDOF model),
 * this algorithm accepts full FRF data (complex compliance) for multi-mode systems.
 *
 * Manufacturing uses: chatter-free parameter selection, spindle speed optimization,
 * axial depth of cut limits, multi-mode stability analysis.
 *
 * References:
 * - Altintas, Y. & Budak, E. (1995). "Analytical Prediction of Stability Lobes in Milling"
 * - Schmitz, T.L. & Smith, K.S. (2019). "Machining Dynamics"
 *
 * @module algorithms/FRFStabilityLobe
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface ComplexValue {
  real: number;
  imag: number;
}

export interface FRFPoint {
  /** Frequency [Hz]. */
  frequency: number;
  /** Complex compliance (H = 1/(K - Mω² + jCω)) [m/N or μm/N]. */
  compliance: ComplexValue;
}

export interface FRFStabilityLobeInput {
  /** Measured/modeled FRF data points. */
  frf_data: FRFPoint[];
  /** Number of flutes on the cutter. */
  n_flutes: number;
  /** Specific cutting force coefficient Kt [N/mm²]. Default 2000 (steel). */
  Kt?: number;
  /** Radial immersion ratio (ae/D). Default 1 (full slot). */
  radial_immersion?: number;
  /** Spindle speed range min [RPM]. Default 1000. */
  speed_min?: number;
  /** Spindle speed range max [RPM]. Default 20000. */
  speed_max?: number;
  /** Number of speed points. Default 200. */
  n_speed_points?: number;
  /** Number of lobes to compute. Default 10. */
  n_lobes?: number;
  /** Units of FRF compliance. Default "m_per_N". */
  frf_units?: "m_per_N" | "um_per_N" | "mm_per_N";
}

export interface StabilityPoint {
  speed_rpm: number;
  depth_limit_mm: number;
  lobe_number: number;
}

export interface FRFStabilityLobeOutput extends WithWarnings {
  /** Stability boundary points (speed vs depth limit). */
  stability_boundary: StabilityPoint[];
  /** Absolute minimum stable depth [mm]. */
  min_stable_depth: number;
  /** Speed at minimum stable depth [RPM]. */
  speed_at_min_depth: number;
  /** Optimal sweet spots (local maxima in stability boundary). */
  sweet_spots: Array<{ speed_rpm: number; depth_limit_mm: number }>;
  /** Critical chatter frequency [Hz]. */
  critical_frequency: number;
  /** Number of dominant modes detected. */
  n_modes: number;
  calculation_method: string;
}

export class FRFStabilityLobe implements Algorithm<FRFStabilityLobeInput, FRFStabilityLobeOutput> {

  validate(input: FRFStabilityLobeInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.frf_data?.length || input.frf_data.length < 10) {
      issues.push({ field: "frf_data", message: "At least 10 FRF data points required", severity: "error" });
    }
    if (!input.n_flutes || input.n_flutes < 1) {
      issues.push({ field: "n_flutes", message: "Must be >= 1", severity: "error" });
    }
    if ((input.Kt ?? 2000) <= 0) {
      issues.push({ field: "Kt", message: "Must be > 0", severity: "error" });
    }
    if ((input.radial_immersion ?? 1) <= 0 || (input.radial_immersion ?? 1) > 1) {
      issues.push({ field: "radial_immersion", message: "Must be in (0, 1]", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: FRFStabilityLobeInput): FRFStabilityLobeOutput {
    const warnings: string[] = [];
    const Nt = input.n_flutes;
    const Kt = input.Kt ?? 2000; // N/mm²
    const ae_ratio = input.radial_immersion ?? 1;
    const nLobes = input.n_lobes ?? 10;
    const nSpeedPts = input.n_speed_points ?? 200;
    const speedMin = input.speed_min ?? 1000;
    const speedMax = input.speed_max ?? 20000;

    // Convert FRF units to m/N
    const unitScale = input.frf_units === "um_per_N" ? 1e-6
      : input.frf_units === "mm_per_N" ? 1e-3 : 1;

    // Average directional factor for milling
    const alphaxx = this.directionalFactor(ae_ratio);

    // Find negative real part minimum of oriented FRF
    // Λ = -1 / (2 × Kt × N × a₁ × Re[G(ωc)]_min)
    // where a₁ is directional coefficient

    let minRealG = 0;
    let criticalFreq = 0;
    const nModes = this.countModes(input.frf_data, unitScale);

    for (const pt of input.frf_data) {
      const realG = pt.compliance.real * unitScale * 1e3; // convert to mm/N
      if (realG < minRealG) {
        minRealG = realG;
        criticalFreq = pt.frequency;
      }
    }

    // Stability boundary computation
    const boundary: StabilityPoint[] = [];
    let globalMinDepth = Infinity;
    let speedAtMinDepth = speedMin;

    for (let iLobe = 0; iLobe < nLobes; iLobe++) {
      for (let iSpeed = 0; iSpeed < nSpeedPts; iSpeed++) {
        const speed = speedMin + (iSpeed / (nSpeedPts - 1)) * (speedMax - speedMin);
        const toothPassFreq = speed * Nt / 60; // Hz

        // Chatter frequency for this lobe
        const fc = toothPassFreq * (iLobe + this.phaseFromFRF(input.frf_data, toothPassFreq * (iLobe + 0.5), unitScale));

        // Find FRF value at chatter frequency
        const G = this.interpolateFRF(input.frf_data, fc, unitScale);

        // Oriented transfer function
        const realG_mm = G.real * 1e3; // m/N → mm/N after unitScale
        const imagG_mm = G.imag * 1e3;

        if (realG_mm >= 0) continue; // No stability limit at this frequency

        // Altintas-Budak: a_lim = -1 / (2 × Kt × Nt × alphaxx × Re[G])
        const aLim = -1 / (2 * Kt * Nt * alphaxx * realG_mm);

        if (aLim > 0 && aLim < 100) { // Reasonable range [mm]
          boundary.push({
            speed_rpm: speed,
            depth_limit_mm: aLim,
            lobe_number: iLobe,
          });

          if (aLim < globalMinDepth) {
            globalMinDepth = aLim;
            speedAtMinDepth = speed;
          }
        }
      }
    }

    // Sort by speed
    boundary.sort((a, b) => a.speed_rpm - b.speed_rpm);

    // Find sweet spots (local maxima in stability boundary)
    const sweetSpots: Array<{ speed_rpm: number; depth_limit_mm: number }> = [];
    for (let i = 1; i < boundary.length - 1; i++) {
      if (boundary[i].depth_limit_mm > boundary[i - 1].depth_limit_mm &&
          boundary[i].depth_limit_mm > boundary[i + 1].depth_limit_mm &&
          boundary[i].depth_limit_mm > globalMinDepth * 1.5) {
        sweetSpots.push({
          speed_rpm: boundary[i].speed_rpm,
          depth_limit_mm: boundary[i].depth_limit_mm,
        });
      }
    }

    if (globalMinDepth < 0.5) {
      warnings.push(`Very low stability limit: ${globalMinDepth.toFixed(2)}mm — system is chatter-prone`);
    }

    return {
      stability_boundary: boundary,
      min_stable_depth: globalMinDepth === Infinity ? 0 : globalMinDepth,
      speed_at_min_depth: speedAtMinDepth,
      sweet_spots: sweetSpots.slice(0, 10),
      critical_frequency: criticalFreq,
      n_modes: nModes,
      warnings,
      calculation_method: `FRF stability lobe (Altintas-Budak, ${input.frf_data.length} FRF pts, ${Nt} flutes, ${nLobes} lobes)`,
    };
  }

  private directionalFactor(ae_ratio: number): number {
    // Average directional factor for up/down milling
    // For full slot (ae/D = 1): α = 1/(2π) × [cos(2φ) - 2Kn×φ + Kn×sin(2φ)]
    // Simplified: for most cases ≈ ae_ratio / 2
    return ae_ratio / 2;
  }

  private phaseFromFRF(frf: FRFPoint[], freq: number, scale: number): number {
    const G = this.interpolateFRF(frf, freq, scale);
    // Phase angle normalized to [0, 1] for lobe index
    const phase = Math.atan2(G.imag, G.real);
    return (3 * Math.PI - 2 * phase) / (2 * Math.PI);
  }

  private interpolateFRF(frf: FRFPoint[], freq: number, scale: number): ComplexValue {
    // Linear interpolation of FRF data
    if (freq <= frf[0].frequency) return { real: frf[0].compliance.real * scale, imag: frf[0].compliance.imag * scale };
    if (freq >= frf[frf.length - 1].frequency) {
      const last = frf[frf.length - 1];
      return { real: last.compliance.real * scale, imag: last.compliance.imag * scale };
    }

    for (let i = 0; i < frf.length - 1; i++) {
      if (frf[i].frequency <= freq && freq <= frf[i + 1].frequency) {
        const t = (freq - frf[i].frequency) / (frf[i + 1].frequency - frf[i].frequency);
        return {
          real: (frf[i].compliance.real * (1 - t) + frf[i + 1].compliance.real * t) * scale,
          imag: (frf[i].compliance.imag * (1 - t) + frf[i + 1].compliance.imag * t) * scale,
        };
      }
    }

    return { real: 0, imag: 0 };
  }

  private countModes(frf: FRFPoint[], scale: number): number {
    // Count peaks in imaginary part (resonances)
    let modes = 0;
    for (let i = 1; i < frf.length - 1; i++) {
      const prev = Math.abs(frf[i - 1].compliance.imag * scale);
      const curr = Math.abs(frf[i].compliance.imag * scale);
      const next = Math.abs(frf[i + 1].compliance.imag * scale);
      if (curr > prev && curr > next) modes++;
    }
    return Math.max(1, modes);
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "frf-stability-lobe",
      name: "FRF-Based Stability Lobe Diagram",
      description: "Chatter stability analysis from measured FRF data using Altintas-Budak method",
      formula: "a_lim = -1 / (2 × Kt × Nt × α × Re[G(ωc)]); ε = π - 2×atan(Im[G]/Re[G])",
      reference: "Altintas & Budak (1995); Schmitz & Smith (2019)",
      safety_class: "critical",
      domain: "dynamics",
      inputs: { frf_data: "Measured FRF [Hz vs compliance]", n_flutes: "Number of teeth", Kt: "Cutting force coeff [N/mm²]" },
      outputs: { stability_boundary: "Speed-depth limit pairs", sweet_spots: "Optimal chatter-free conditions" },
    };
  }
}
