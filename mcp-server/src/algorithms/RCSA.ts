/**
 * RCSA — Receptance Coupling Substructure Analysis
 *
 * Implements Receptance Coupling to predict the tool-point FRF by
 * analytically joining substructure FRFs (spindle-holder and holder-tool).
 * Enables virtual tool assembly analysis without physical tap testing.
 *
 * The coupling equation: G_AB = G_A × (G_A + G_B)⁻¹ × G_B
 * where G_A and G_B are the receptance matrices of substructures.
 *
 * Manufacturing uses: virtual tap testing, tool assembly optimization,
 * holder selection for chatter avoidance, digital twin of spindle dynamics.
 *
 * References:
 * - Schmitz, T.L. & Duncan, G.S. (2005). "Three-Component Receptance Coupling"
 * - Park, S.S. et al. (2003). "Receptance Coupling for End Mills"
 * - Schmitz, T.L. & Smith, K.S. (2019). "Machining Dynamics" Ch. 5
 *
 * @module algorithms/RCSA
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface ComplexVal {
  re: number;
  im: number;
}

export interface RCSASubstructure {
  /** Frequency points [Hz]. */
  frequencies: number[];
  /** Direct receptance H11 at coupling point [m/N]. */
  H11: ComplexVal[];
  /** Cross receptance H12 (optional, for 2-point coupling). */
  H12?: ComplexVal[];
  /** Cross receptance H21 (optional). */
  H21?: ComplexVal[];
  /** Direct receptance H22 at free end (optional). */
  H22?: ComplexVal[];
}

export interface RCSAInput {
  /** Substructure A (spindle-holder assembly). */
  substructure_a: RCSASubstructure;
  /** Substructure B (tool/extension). */
  substructure_b: RCSASubstructure;
  /** Joint stiffness [N/m]. Default 1e8 (rigid). */
  joint_stiffness?: number;
  /** Joint damping [N·s/m]. Default 100. */
  joint_damping?: number;
  /** Whether to include rotational DOFs (3-component RCSA). Default false. */
  include_rotation?: boolean;
}

export interface RCSAOutput extends WithWarnings {
  /** Coupled assembly FRF at tool tip. */
  coupled_frf: Array<{ frequency: number; compliance: ComplexVal }>;
  /** Dominant natural frequency [Hz]. */
  dominant_frequency: number;
  /** Dynamic stiffness at dominant mode [N/m]. */
  dynamic_stiffness: number;
  /** Number of modes in coupled assembly. */
  n_modes: number;
  /** Modal parameters for each detected mode. */
  modes: Array<{
    frequency: number;
    damping_ratio: number;
    stiffness: number;
    peak_compliance: number;
  }>;
  /** Frequency shift from substructure A dominant mode [Hz]. */
  frequency_shift: number;
  /** Compliance magnitude at dominant frequency [m/N]. */
  peak_compliance: number;
  calculation_method: string;
}

export class RCSA implements Algorithm<RCSAInput, RCSAOutput> {

  validate(input: RCSAInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const a = input.substructure_a;
    const b = input.substructure_b;

    if (!a?.frequencies?.length || a.frequencies.length < 10) {
      issues.push({ field: "substructure_a", message: "At least 10 frequency points required", severity: "error" });
    }
    if (!a?.H11?.length) {
      issues.push({ field: "substructure_a.H11", message: "H11 receptance required", severity: "error" });
    }
    if (!b?.frequencies?.length || b.frequencies.length < 10) {
      issues.push({ field: "substructure_b", message: "At least 10 frequency points required", severity: "error" });
    }
    if (!b?.H11?.length) {
      issues.push({ field: "substructure_b.H11", message: "H11 receptance required", severity: "error" });
    }
    if (a?.frequencies?.length && b?.frequencies?.length && a.frequencies.length !== b.frequencies.length) {
      issues.push({ field: "frequencies", message: "Both substructures must have same number of frequency points", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: RCSAInput): RCSAOutput {
    const warnings: string[] = [];
    const a = input.substructure_a;
    const b = input.substructure_b;
    const kj = input.joint_stiffness ?? 1e8;
    const cj = input.joint_damping ?? 100;

    const n = a.frequencies.length;
    const coupledFRF: Array<{ frequency: number; compliance: ComplexVal }> = [];

    for (let i = 0; i < n; i++) {
      const freq = a.frequencies[i];
      const omega = 2 * Math.PI * freq;

      // Substructure receptances at coupling point
      const Ha = a.H11[i]; // H_11^A (spindle-holder at coupling)
      const Hb = b.H11[i]; // H_11^B (tool at coupling)

      // Joint compliance: Hj = 1/(kj + j·ω·cj)
      const denom_j = kj * kj + (omega * cj) * (omega * cj);
      const Hj: ComplexVal = {
        re: kj / denom_j,
        im: -omega * cj / denom_j,
      };

      // Coupling equation (1-component):
      // H_coupled = Ha_22 × (Ha_22 + Hb_11 + Hj)^(-1) × Hb_11
      // For tool-tip response: need H_22^A (or use H_11^A as approximation if H_22 not available)
      const Ha22 = a.H22?.[i] ?? Ha;
      const Ha12 = a.H12?.[i] ?? Ha;

      // Sum at coupling point: S = Ha + Hb + Hj
      const S: ComplexVal = {
        re: Ha.re + Hb.re + Hj.re,
        im: Ha.im + Hb.im + Hj.im,
      };

      // Invert S: S^(-1) = conj(S) / |S|²
      const Smag2 = S.re * S.re + S.im * S.im;
      if (Smag2 < 1e-30) {
        coupledFRF.push({ frequency: freq, compliance: { re: 0, im: 0 } });
        continue;
      }
      const Sinv: ComplexVal = { re: S.re / Smag2, im: -S.im / Smag2 };

      // H_coupled = Ha22 - Ha12 × Sinv × Ha21
      // (using rigid coupling simplification: Ha21 ≈ Ha12)
      const Ha21 = a.H21?.[i] ?? Ha12;

      // Product: Ha12 × Sinv
      const p1: ComplexVal = {
        re: Ha12.re * Sinv.re - Ha12.im * Sinv.im,
        im: Ha12.re * Sinv.im + Ha12.im * Sinv.re,
      };

      // Product: p1 × Ha21
      const p2: ComplexVal = {
        re: p1.re * Ha21.re - p1.im * Ha21.im,
        im: p1.re * Ha21.im + p1.im * Ha21.re,
      };

      // Coupled: Ha22 - p2
      const Hc: ComplexVal = {
        re: Ha22.re - p2.re,
        im: Ha22.im - p2.im,
      };

      coupledFRF.push({ frequency: freq, compliance: Hc });
    }

    // Extract modal parameters from coupled FRF
    const modes: Array<{
      frequency: number; damping_ratio: number;
      stiffness: number; peak_compliance: number;
    }> = [];

    let peakMag = 0;
    let dominantFreq = 0;

    for (let i = 1; i < coupledFRF.length - 1; i++) {
      const mag = Math.sqrt(coupledFRF[i].compliance.re ** 2 + coupledFRF[i].compliance.im ** 2);
      const prevMag = Math.sqrt(coupledFRF[i - 1].compliance.re ** 2 + coupledFRF[i - 1].compliance.im ** 2);
      const nextMag = Math.sqrt(coupledFRF[i + 1].compliance.re ** 2 + coupledFRF[i + 1].compliance.im ** 2);

      if (mag > peakMag) {
        peakMag = mag;
        dominantFreq = coupledFRF[i].frequency;
      }

      // Detect modes (peaks in imaginary part or magnitude)
      const imagMag = Math.abs(coupledFRF[i].compliance.im);
      const prevImag = Math.abs(coupledFRF[i - 1].compliance.im);
      const nextImag = Math.abs(coupledFRF[i + 1].compliance.im);

      if (imagMag > prevImag && imagMag > nextImag && imagMag > peakMag * 0.1) {
        // Half-power bandwidth for damping estimation
        const halfPower = imagMag / Math.sqrt(2);
        let bwLow = coupledFRF[i].frequency;
        let bwHigh = coupledFRF[i].frequency;

        for (let j = i - 1; j >= 0; j--) {
          if (Math.abs(coupledFRF[j].compliance.im) < halfPower) {
            bwLow = coupledFRF[j].frequency;
            break;
          }
        }
        for (let j = i + 1; j < coupledFRF.length; j++) {
          if (Math.abs(coupledFRF[j].compliance.im) < halfPower) {
            bwHigh = coupledFRF[j].frequency;
            break;
          }
        }

        const fn = coupledFRF[i].frequency;
        const zeta = (bwHigh - bwLow) / (2 * fn);
        const stiffness = mag > 0 ? 1 / mag : 0; // N/m (inverse of compliance)

        modes.push({
          frequency: fn,
          damping_ratio: Math.max(0.001, Math.min(0.5, zeta)),
          stiffness,
          peak_compliance: mag,
        });
      }
    }

    // Frequency shift from dominant mode of substructure A
    let aMaxMag = 0, aDominant = 0;
    for (const pt of a.H11) {
      const mag = Math.sqrt(pt.re ** 2 + pt.im ** 2);
      if (mag > aMaxMag) { aMaxMag = mag; }
    }
    for (let i = 0; i < a.H11.length; i++) {
      const mag = Math.sqrt(a.H11[i].re ** 2 + a.H11[i].im ** 2);
      if (Math.abs(mag - aMaxMag) < 1e-15) { aDominant = a.frequencies[i]; break; }
    }

    const dynStiffness = peakMag > 0 ? 1 / peakMag : 0;

    if (modes.length === 0) {
      warnings.push("No clear modes detected in coupled FRF — check input data quality");
    }

    return {
      coupled_frf: coupledFRF,
      dominant_frequency: dominantFreq,
      dynamic_stiffness: dynStiffness,
      n_modes: modes.length,
      modes,
      frequency_shift: dominantFreq - aDominant,
      peak_compliance: peakMag,
      warnings,
      calculation_method: `RCSA coupling (${n} freq pts, kj=${kj.toExponential(1)} N/m, cj=${cj} N·s/m)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "rcsa",
      name: "Receptance Coupling Substructure Analysis",
      description: "Virtual tool-tip FRF prediction by coupling spindle-holder and tool substructures",
      formula: "H_coupled = H_A22 - H_A12 × (H_A + H_B + H_J)⁻¹ × H_A21",
      reference: "Schmitz & Duncan (2005); Park et al. (2003)",
      safety_class: "critical",
      domain: "dynamics",
      inputs: { substructure_a: "Spindle-holder FRF", substructure_b: "Tool FRF", joint_stiffness: "Joint stiffness [N/m]" },
      outputs: { coupled_frf: "Tool-tip FRF", dominant_frequency: "Primary mode [Hz]", dynamic_stiffness: "Stiffness [N/m]" },
    };
  }
}
