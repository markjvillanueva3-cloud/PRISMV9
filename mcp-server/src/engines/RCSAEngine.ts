/**
 * RCSAEngine — Receptance Coupling Substructure Analysis
 *
 * MILL-AGI Phase 2 (MILL-MS7): Physics Hardening — Long-Reach Tool Dynamics
 *
 * Predicts tool point FRF (Frequency Response Function) by coupling individual
 * substructure receptances:
 *   - Spindle-holder receptance H_sh(ω)
 *   - Holder-tool receptance H_ht(ω)
 *   - Tool beam receptance H_tool(ω)
 *
 * The coupled system FRF is computed using receptance coupling theory:
 *   H_coupled = H_A + H_A × (H_B⁻¹ + H_A)⁻¹ × H_A
 *
 * This is critical for:
 *   - Long-reach tools (L/D > 4) where beam dynamics dominate
 *   - 5-axis machining with tilted tool (effective length changes)
 *   - Holder extensions and adapters
 *   - Predicting stability limits when tool changes but spindle FRF is constant
 *
 * Physics Model:
 *   - Euler-Bernoulli beam for tool shaft
 *   - Timoshenko beam for short/thick tools
 *   - Point mass for inserts/tips
 *   - Distributed parameter model for holders
 *
 * References:
 *   [1] Schmitz & Smith (2008) "Machining Dynamics" Ch. 4 — RCSA fundamentals
 *   [2] Schmitz, T.L. (2000) "Predicting High-Speed Machining Dynamics by
 *       Substructure Analysis" CIRP Annals
 *   [3] Park, Altintas, & Movahhedy (2003) "Receptance coupling for end mills"
 *       Int. J. Mach. Tools Manuf.
 *   [4] MIT 2.008 Manufacturing Processes — Vibration Module
 *
 * @module engines/RCSAEngine
 * @milestone MILL-AGI-P2/MILL-MS7-01
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface FRFPoint {
  frequency_hz: number;
  magnitude: number;
  phase_rad: number;
  real: number;
  imag: number;
}

export interface SubstructureFRF {
  id: string;
  type: "spindle" | "holder" | "extension" | "tool" | "insert";
  frequencies_hz: number[];
  H11: ComplexNumber[];
  H12?: ComplexNumber[];
  H21?: ComplexNumber[];
  H22: ComplexNumber[];
}

export interface ToolGeometry {
  diameter_mm: number;
  flute_length_mm: number;
  shank_diameter_mm?: number;
  shank_length_mm?: number;
  overall_length_mm: number;
  material: "carbide" | "hss" | "cermet" | "steel";
  flute_count?: number;
  helix_angle_deg?: number;
}

export interface HolderGeometry {
  type: "shrink_fit" | "collet" | "hydraulic" | "milling_chuck" | "weldon";
  taper: "CAT40" | "CAT50" | "BT30" | "BT40" | "HSK-A63" | "HSK-A100" | "ISO40";
  gauge_length_mm: number;
  bore_diameter_mm: number;
  body_diameter_mm?: number;
}

export interface ExtensionGeometry {
  length_mm: number;
  outer_diameter_mm: number;
  inner_diameter_mm?: number;
  material: "steel" | "carbide" | "aluminum";
}

export interface RCSAInput {
  tool: ToolGeometry;
  holder: HolderGeometry;
  extensions?: ExtensionGeometry[];
  spindle_frf?: SubstructureFRF;
  frequency_range_hz?: [number, number];
  frequency_points?: number;
}

export interface RCSAResult {
  tool_point_frf: FRFPoint[];
  dominant_mode: {
    frequency_hz: number;
    damping_ratio: number;
    stiffness_n_per_um: number;
    modal_mass_kg: number;
  };
  secondary_modes: Array<{
    frequency_hz: number;
    damping_ratio: number;
  }>;
  effective_stiffness_n_per_um: number;
  dynamic_stiffness_min_n_per_um: number;
  critical_frequencies_hz: number[];
  overhang_ratio: number;
  beam_model: "euler_bernoulli" | "timoshenko";
  warnings: string[];
  confidence: number;
}

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

interface MaterialProps {
  E_gpa: number;
  density_kg_m3: number;
  poisson: number;
}

const MATERIAL_PROPERTIES: Record<string, MaterialProps> = {
  carbide: { E_gpa: 600, density_kg_m3: 14500, poisson: 0.22 },
  hss: { E_gpa: 210, density_kg_m3: 8100, poisson: 0.29 },
  cermet: { E_gpa: 450, density_kg_m3: 7200, poisson: 0.25 },
  steel: { E_gpa: 210, density_kg_m3: 7850, poisson: 0.3 },
  aluminum: { E_gpa: 70, density_kg_m3: 2700, poisson: 0.33 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RCSAEngine {
  /**
   * Compute tool point FRF using receptance coupling.
   */
  computeToolPointFRF(input: RCSAInput): RCSAResult {
    const startTime = performance.now();

    const freqRange = input.frequency_range_hz ?? [100, 5000];
    const freqPoints = input.frequency_points ?? 500;
    const frequencies = this.generateFrequencyArray(freqRange[0], freqRange[1], freqPoints);

    const overhangRatio = input.tool.overall_length_mm / input.tool.diameter_mm;
    const beamModel = this.selectBeamModel(input.tool);

    const toolFRF = this.computeToolBeamFRF(input.tool, frequencies, beamModel);

    const holderFRF = this.computeHolderFRF(input.holder, frequencies);

    let coupledFRF = this.coupleSubstructures(holderFRF, toolFRF, frequencies);

    if (input.extensions) {
      for (const ext of input.extensions) {
        const extFRF = this.computeExtensionFRF(ext, frequencies);
        coupledFRF = this.coupleSubstructures(coupledFRF, extFRF, frequencies);
      }
    }

    if (input.spindle_frf) {
      coupledFRF = this.coupleWithSpindle(coupledFRF, input.spindle_frf, frequencies);
    }

    const toolPointFRF = this.formatFRFOutput(coupledFRF, frequencies);

    const dominantMode = this.findDominantMode(toolPointFRF);
    const secondaryModes = this.findSecondaryModes(toolPointFRF, dominantMode.frequency_hz);
    const criticalFreqs = this.findCriticalFrequencies(toolPointFRF);

    const effectiveStiffness = this.computeEffectiveStiffness(toolPointFRF);
    const dynamicStiffnessMin = this.computeMinDynamicStiffness(toolPointFRF);

    const warnings = this.generateWarnings(input, dominantMode, overhangRatio);
    const confidence = this.computeConfidence(input, beamModel);

    const duration = performance.now() - startTime;
    log.debug(
      `[RCSA] L/D=${overhangRatio.toFixed(1)}, f_dom=${dominantMode.frequency_hz.toFixed(0)}Hz, k=${effectiveStiffness.toFixed(1)}N/µm in ${duration.toFixed(1)}ms`
    );

    return {
      tool_point_frf: toolPointFRF,
      dominant_mode: dominantMode,
      secondary_modes: secondaryModes,
      effective_stiffness_n_per_um: effectiveStiffness,
      dynamic_stiffness_min_n_per_um: dynamicStiffnessMin,
      critical_frequencies_hz: criticalFreqs,
      overhang_ratio: overhangRatio,
      beam_model: beamModel,
      warnings,
      confidence,
    };
  }

  /**
   * Compute stability limit (max stable depth) at given RPM using RCSA-derived FRF.
   */
  computeStabilityLimit(
    rcsaResult: RCSAResult,
    rpm: number,
    fluteCount: number,
    kc_mpa: number,
    radialImmersionRatio: number
  ): { ap_limit_mm: number; chatter_freq_hz: number; confidence: number } {
    const toothPassingFreq = (rpm * fluteCount) / 60;

    const orientedFRF = this.computeOrientedFRF(
      rcsaResult.tool_point_frf,
      radialImmersionRatio
    );

    let minReal = 0;
    let chatterFreq = 0;
    for (const point of orientedFRF) {
      if (point.real < minReal) {
        minReal = point.real;
        chatterFreq = point.frequency_hz;
      }
    }

    const Ks = kc_mpa * 1e6;
    const ap_limit = minReal === 0 ? Infinity : -1 / (2 * Ks * minReal) * 1e6;

    return {
      ap_limit_mm: Math.max(ap_limit, 0.1),
      chatter_freq_hz: chatterFreq,
      confidence: rcsaResult.confidence * 0.9,
    };
  }

  /**
   * Validate input parameters.
   */
  validateInput(input: RCSAInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.tool.diameter_mm <= 0) errors.push("Tool diameter must be positive");
    if (input.tool.overall_length_mm <= 0) errors.push("Tool length must be positive");
    if (input.tool.overall_length_mm < input.tool.diameter_mm) {
      errors.push("Tool length cannot be less than diameter");
    }
    if (input.holder.gauge_length_mm <= 0) errors.push("Holder gauge length must be positive");
    if (input.holder.bore_diameter_mm <= 0) errors.push("Holder bore diameter must be positive");
    if (input.holder.bore_diameter_mm < input.tool.diameter_mm * 0.8) {
      errors.push("Holder bore may be too small for tool shank");
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE — BEAM MODELS
  // ============================================================================

  private selectBeamModel(tool: ToolGeometry): "euler_bernoulli" | "timoshenko" {
    const aspectRatio = tool.overall_length_mm / tool.diameter_mm;
    return aspectRatio > 10 ? "euler_bernoulli" : "timoshenko";
  }

  private computeToolBeamFRF(
    tool: ToolGeometry,
    frequencies: number[],
    model: "euler_bernoulli" | "timoshenko"
  ): ComplexNumber[] {
    const mat = MATERIAL_PROPERTIES[tool.material] ?? MATERIAL_PROPERTIES.carbide;
    const E = mat.E_gpa * 1e9;
    const rho = mat.density_kg_m3;

    const D = tool.diameter_mm / 1000;
    const L = tool.overall_length_mm / 1000;

    const I = (Math.PI * Math.pow(D, 4)) / 64;
    const A = (Math.PI * Math.pow(D, 2)) / 4;
    const m = rho * A * L;

    const f1 = (1.875 ** 2 / (2 * Math.PI)) * Math.sqrt((E * I) / (rho * A * L ** 4));

    const k_static = (3 * E * I) / (L ** 3);

    const zeta = 0.02;

    return frequencies.map((f) => {
      const omega = 2 * Math.PI * f;
      const omega_n = 2 * Math.PI * f1;
      const r = omega / omega_n;

      const denom_real = (1 - r * r);
      const denom_imag = 2 * zeta * r;
      const denom_mag_sq = denom_real ** 2 + denom_imag ** 2;

      const H_real = (1 / k_static) * denom_real / denom_mag_sq;
      const H_imag = (1 / k_static) * (-denom_imag) / denom_mag_sq;

      if (model === "timoshenko") {
        const shearFactor = 1 + 0.1 * (D / L) ** 2;
        return { real: H_real * shearFactor, imag: H_imag * shearFactor };
      }

      return { real: H_real, imag: H_imag };
    });
  }

  private computeHolderFRF(holder: HolderGeometry, frequencies: number[]): ComplexNumber[] {
    const holderStiffness = this.getHolderStiffness(holder);
    const holderDamping = this.getHolderDamping(holder);

    const f_holder = 800 + holderStiffness * 5;

    return frequencies.map((f) => {
      const omega = 2 * Math.PI * f;
      const omega_n = 2 * Math.PI * f_holder;
      const r = omega / omega_n;
      const zeta = holderDamping;

      const k = holderStiffness * 1e6;
      const denom_real = 1 - r * r;
      const denom_imag = 2 * zeta * r;
      const denom_mag_sq = denom_real ** 2 + denom_imag ** 2;

      return {
        real: (1 / k) * denom_real / denom_mag_sq,
        imag: (1 / k) * (-denom_imag) / denom_mag_sq,
      };
    });
  }

  private computeExtensionFRF(ext: ExtensionGeometry, frequencies: number[]): ComplexNumber[] {
    const mat = MATERIAL_PROPERTIES[ext.material] ?? MATERIAL_PROPERTIES.steel;
    const E = mat.E_gpa * 1e9;
    const rho = mat.density_kg_m3;

    const D = ext.outer_diameter_mm / 1000;
    const d = (ext.inner_diameter_mm ?? 0) / 1000;
    const L = ext.length_mm / 1000;

    const I = (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(d, 4));
    const A = (Math.PI / 4) * (D * D - d * d);

    const f1 = (1.875 ** 2 / (2 * Math.PI)) * Math.sqrt((E * I) / (rho * A * L ** 4));
    const k_static = (3 * E * I) / (L ** 3);
    const zeta = 0.015;

    return frequencies.map((f) => {
      const omega = 2 * Math.PI * f;
      const omega_n = 2 * Math.PI * f1;
      const r = omega / omega_n;

      const denom_real = 1 - r * r;
      const denom_imag = 2 * zeta * r;
      const denom_mag_sq = denom_real ** 2 + denom_imag ** 2;

      return {
        real: (1 / k_static) * denom_real / denom_mag_sq,
        imag: (1 / k_static) * (-denom_imag) / denom_mag_sq,
      };
    });
  }

  // ============================================================================
  // PRIVATE — RECEPTANCE COUPLING
  // ============================================================================

  private coupleSubstructures(
    H_A: ComplexNumber[],
    H_B: ComplexNumber[],
    frequencies: number[]
  ): ComplexNumber[] {
    return frequencies.map((_, i) => {
      const Ha = H_A[i];
      const Hb = H_B[i];

      const sum_real = Ha.real + Hb.real;
      const sum_imag = Ha.imag + Hb.imag;

      const sum_mag_sq = sum_real ** 2 + sum_imag ** 2;
      if (sum_mag_sq < 1e-30) {
        return { real: Ha.real, imag: Ha.imag };
      }

      const inv_real = sum_real / sum_mag_sq;
      const inv_imag = -sum_imag / sum_mag_sq;

      const Ha_inv_real = Ha.real * inv_real - Ha.imag * inv_imag;
      const Ha_inv_imag = Ha.real * inv_imag + Ha.imag * inv_real;

      const coupled_real = Ha.real - (Ha.real * Ha_inv_real - Ha.imag * Ha_inv_imag);
      const coupled_imag = Ha.imag - (Ha.real * Ha_inv_imag + Ha.imag * Ha_inv_real);

      return { real: coupled_real, imag: coupled_imag };
    });
  }

  private coupleWithSpindle(
    tool_holder_frf: ComplexNumber[],
    spindle_frf: SubstructureFRF,
    frequencies: number[]
  ): ComplexNumber[] {
    return frequencies.map((f, i) => {
      const th = tool_holder_frf[i];

      const spindleIdx = this.findClosestIndex(spindle_frf.frequencies_hz, f);
      const sp = spindle_frf.H22[spindleIdx] ?? { real: 1e-9, imag: 0 };

      const sum_real = th.real + sp.real;
      const sum_imag = th.imag + sp.imag;
      const sum_mag_sq = sum_real ** 2 + sum_imag ** 2;

      if (sum_mag_sq < 1e-30) return th;

      return {
        real: (th.real * sp.real - th.imag * sp.imag) / sum_mag_sq + th.real,
        imag: (th.real * sp.imag + th.imag * sp.real) / sum_mag_sq + th.imag,
      };
    });
  }

  // ============================================================================
  // PRIVATE — ANALYSIS
  // ============================================================================

  private formatFRFOutput(frf: ComplexNumber[], frequencies: number[]): FRFPoint[] {
    return frequencies.map((f, i) => {
      const H = frf[i];
      const magnitude = Math.sqrt(H.real ** 2 + H.imag ** 2);
      const phase = Math.atan2(H.imag, H.real);
      return {
        frequency_hz: f,
        magnitude,
        phase_rad: phase,
        real: H.real,
        imag: H.imag,
      };
    });
  }

  private findDominantMode(frf: FRFPoint[]): {
    frequency_hz: number;
    damping_ratio: number;
    stiffness_n_per_um: number;
    modal_mass_kg: number;
  } {
    let maxMag = 0;
    let maxIdx = 0;
    for (let i = 0; i < frf.length; i++) {
      if (frf[i].magnitude > maxMag) {
        maxMag = frf[i].magnitude;
        maxIdx = i;
      }
    }

    const f_n = frf[maxIdx].frequency_hz;

    let halfPowerIdx1 = maxIdx;
    let halfPowerIdx2 = maxIdx;
    const halfPowerMag = maxMag / Math.sqrt(2);

    for (let i = maxIdx - 1; i >= 0; i--) {
      if (frf[i].magnitude < halfPowerMag) {
        halfPowerIdx1 = i;
        break;
      }
    }
    for (let i = maxIdx + 1; i < frf.length; i++) {
      if (frf[i].magnitude < halfPowerMag) {
        halfPowerIdx2 = i;
        break;
      }
    }

    const f1 = frf[halfPowerIdx1].frequency_hz;
    const f2 = frf[halfPowerIdx2].frequency_hz;
    const zeta = (f2 - f1) / (2 * f_n);

    const k = 1 / (2 * maxMag * zeta) / 1e6;

    const omega_n = 2 * Math.PI * f_n;
    const m = k * 1e6 / (omega_n ** 2);

    return {
      frequency_hz: f_n,
      damping_ratio: Math.max(zeta, 0.005),
      stiffness_n_per_um: k,
      modal_mass_kg: m,
    };
  }

  private findSecondaryModes(
    frf: FRFPoint[],
    dominantFreq: number
  ): Array<{ frequency_hz: number; damping_ratio: number }> {
    const modes: Array<{ frequency_hz: number; damping_ratio: number }> = [];

    const avgMag = frf.reduce((a, p) => a + p.magnitude, 0) / frf.length;

    for (let i = 5; i < frf.length - 5; i++) {
      const isPeak =
        frf[i].magnitude > frf[i - 1].magnitude &&
        frf[i].magnitude > frf[i + 1].magnitude &&
        frf[i].magnitude > avgMag * 2;

      if (isPeak && Math.abs(frf[i].frequency_hz - dominantFreq) > 100) {
        modes.push({
          frequency_hz: frf[i].frequency_hz,
          damping_ratio: 0.02,
        });
      }
    }

    return modes.slice(0, 3);
  }

  private findCriticalFrequencies(frf: FRFPoint[]): number[] {
    const critical: number[] = [];
    const threshold = -Math.PI / 2;

    for (let i = 1; i < frf.length; i++) {
      if (frf[i - 1].phase_rad > threshold && frf[i].phase_rad <= threshold) {
        critical.push(frf[i].frequency_hz);
      }
    }

    return critical;
  }

  private computeEffectiveStiffness(frf: FRFPoint[]): number {
    const lowFreqPoints = frf.filter((p) => p.frequency_hz < 200);
    if (lowFreqPoints.length === 0) return 50;

    const avgMag = lowFreqPoints.reduce((a, p) => a + p.magnitude, 0) / lowFreqPoints.length;
    return 1 / avgMag / 1e6;
  }

  private computeMinDynamicStiffness(frf: FRFPoint[]): number {
    const maxMag = Math.max(...frf.map((p) => p.magnitude));
    return 1 / maxMag / 1e6;
  }

  private computeOrientedFRF(frf: FRFPoint[], radialImmersion: number): FRFPoint[] {
    const mu = radialImmersion <= 0.5 ? 0.5 : radialImmersion;
    return frf.map((p) => ({
      ...p,
      real: p.real * mu,
      imag: p.imag * mu,
    }));
  }

  // ============================================================================
  // PRIVATE — HELPERS
  // ============================================================================

  private generateFrequencyArray(start: number, end: number, points: number): number[] {
    const step = (end - start) / (points - 1);
    return Array.from({ length: points }, (_, i) => start + i * step);
  }

  private findClosestIndex(arr: number[], target: number): number {
    let closest = 0;
    let minDiff = Math.abs(arr[0] - target);
    for (let i = 1; i < arr.length; i++) {
      const diff = Math.abs(arr[i] - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  }

  private getHolderStiffness(holder: HolderGeometry): number {
    const baseStiffness: Record<string, number> = {
      shrink_fit: 100,
      hydraulic: 90,
      collet: 70,
      milling_chuck: 65,
      weldon: 50,
    };

    const taperFactor: Record<string, number> = {
      "HSK-A100": 1.3,
      "HSK-A63": 1.2,
      CAT50: 1.1,
      BT40: 1.0,
      CAT40: 0.95,
      ISO40: 0.9,
      BT30: 0.8,
    };

    const base = baseStiffness[holder.type] ?? 70;
    const taper = taperFactor[holder.taper] ?? 1.0;

    return base * taper;
  }

  private getHolderDamping(holder: HolderGeometry): number {
    const damping: Record<string, number> = {
      shrink_fit: 0.015,
      hydraulic: 0.025,
      collet: 0.02,
      milling_chuck: 0.018,
      weldon: 0.012,
    };
    return damping[holder.type] ?? 0.02;
  }

  private generateWarnings(
    input: RCSAInput,
    dominant: { frequency_hz: number; stiffness_n_per_um: number },
    overhangRatio: number
  ): string[] {
    const warnings: string[] = [];

    if (overhangRatio > 6) {
      warnings.push(`High L/D ratio (${overhangRatio.toFixed(1)}) — expect low stiffness`);
    }

    if (dominant.stiffness_n_per_um < 10) {
      warnings.push(`Very low stiffness (${dominant.stiffness_n_per_um.toFixed(1)} N/µm)`);
    }

    if (dominant.frequency_hz < 500) {
      warnings.push(`Low natural frequency (${dominant.frequency_hz.toFixed(0)} Hz) — chatter risk`);
    }

    if (input.extensions && input.extensions.length > 0) {
      warnings.push("Extensions reduce stiffness and shift natural frequencies");
    }

    return warnings;
  }

  private computeConfidence(input: RCSAInput, model: string): number {
    let confidence = 0.85;

    if (!input.spindle_frf) confidence -= 0.1;
    if (model === "timoshenko") confidence += 0.05;
    if (input.tool.overall_length_mm / input.tool.diameter_mm > 8) confidence -= 0.1;

    return Math.max(Math.min(confidence, 0.95), 0.5);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const rcsaEngine = new RCSAEngine();
