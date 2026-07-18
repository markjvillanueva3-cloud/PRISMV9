/**
 * SurfaceLocationErrorEngine
 * Predicts waviness/error on finished surfaces from forced vibration during milling.
 * At tooth-passing frequencies near structural natural frequencies, the tool vibrates
 * with a phase lag — cutting happens at the wrong location, creating surface error.
 *
 * The surface location error is the difference between the desired (commanded)
 * position and the actual position when the tooth passes. This is distinct from
 * chatter — SLE occurs in stable cutting but still degrades surface quality.
 *
 * Reference: Schmitz & Smith (2009) "Machining Dynamics", Chapter 8
 * Reference: Schmitz & Mann (2006) "Closed-form solutions for surface location error
 * in milling" Int. J. Machine Tools & Manufacture, 46(12-13), 1369-1377
 */

interface SLEInput {
  natural_freq_Hz: number;
  damping_ratio: number;
  stiffness_N_per_m: number;
  Ktc: number;               // tangential cutting force coeff [N/mm^2]
  Krc: number;               // radial cutting force coeff [N/mm^2]
  flutes: number;
  rpm: number;
  ae_mm: number;              // radial depth of cut
  D_mm: number;               // tool diameter
  ap_mm: number;              // axial depth of cut
  fz_mm: number;              // feed per tooth
}

interface SLEResult {
  sle_um: number;
  phase_deg: number;
  magnitude_um_per_N: number;
  tooth_passing_freq_Hz: number;
  ratio_to_natural: number;
  risk: "low" | "medium" | "high";
  recommendation: string;
}

interface RPMOptimizeInput {
  natural_freq_Hz: number;
  damping_ratio: number;
  stiffness_N_per_m: number;
  Ktc: number;
  Krc: number;
  flutes: number;
  ae_mm: number;
  D_mm: number;
  ap_mm: number;
  fz_mm: number;
  rpm_range: [number, number];
  rpm_points?: number;
}

interface RPMOptimizeResult {
  optimal_rpms: number[];
  sle_vs_rpm: Array<{ rpm: number; sle_um: number }>;
  worst_rpm: number;
  best_rpm: number;
}

interface CombinedFinishInput {
  natural_freq_Hz: number;
  damping_ratio: number;
  stiffness_N_per_m: number;
  Ktc: number;
  Krc: number;
  flutes: number;
  rpm: number;
  ae_mm: number;
  D_mm: number;
  ap_mm: number;
  fz_mm: number;
  tool_corner_radius_mm: number;
}

interface CombinedFinishResult {
  Ra_kinematic_um: number;
  sle_um: number;
  Ra_total_um: number;
  dominant_source: "kinematic" | "vibration";
  improvement_action: string;
}

export class SurfaceLocationErrorEngine {
  /**
   * Predict surface location error at a given RPM.
   *
   * Model: SLE = |G(jω_t)| × F0 × sin(phase(G(jω_t)))
   * where ω_t = tooth passing frequency, F0 = average force per tooth,
   * G = FRF of the structure.
   *
   * The key insight: even in stable cutting, the tool deflects with a phase lag
   * relative to the periodic cutting force. This phase lag causes the surface
   * to be cut at the wrong radial position.
   */
  predictSLE(input: SLEInput): SLEResult {
    const { natural_freq_Hz, damping_ratio, stiffness_N_per_m, Ktc, Krc,
            flutes, rpm, ae_mm, D_mm, ap_mm, fz_mm } = input;

    // Tooth passing frequency
    const omega_t = 2 * Math.PI * rpm * flutes / 60;
    const f_tooth = rpm * flutes / 60;

    // Natural frequency in rad/s
    const omega_n = 2 * Math.PI * natural_freq_Hz;

    // Frequency ratio
    const r = omega_t / omega_n;
    const zeta = damping_ratio;

    // FRF: G(jω) = 1/k × 1/((1-r²) + j(2ζr))
    const denom_real = 1 - r * r;
    const denom_imag = 2 * zeta * r;
    const denom_sq = denom_real * denom_real + denom_imag * denom_imag;

    const real_G = denom_real / (stiffness_N_per_m * denom_sq);
    const imag_G = -denom_imag / (stiffness_N_per_m * denom_sq);

    const magnitude_G = Math.sqrt(real_G * real_G + imag_G * imag_G);
    const phase_G = Math.atan2(imag_G, real_G);

    // Average cutting force per tooth (Kienzle-based)
    // F_avg = Ktc × ap × fz × (ae/D) + Krc contribution
    const immersion = ae_mm / D_mm;
    const F_tangential = Ktc * ap_mm * fz_mm * immersion;
    const F_radial = Krc * ap_mm * fz_mm * immersion;
    const F0 = Math.sqrt(F_tangential * F_tangential + F_radial * F_radial);

    // SLE = |G(jω_t)| × F0 × |sin(phase)|
    // The sin(phase) accounts for the component of deflection perpendicular to feed
    const sle_m = magnitude_G * F0 * Math.abs(Math.sin(phase_G));
    const sle_um = sle_m * 1e6; // convert to microns

    const magnitude_um_per_N = magnitude_G * 1e6;
    const phase_deg = phase_G * 180 / Math.PI;
    const ratio = f_tooth / natural_freq_Hz;

    // Risk assessment
    let risk: "low" | "medium" | "high";
    if (sle_um < 2) {
      risk = "low";
    } else if (sle_um < 10) {
      risk = "medium";
    } else {
      risk = "high";
    }

    // Recommendation
    let recommendation: string;
    if (ratio > 0.9 && ratio < 1.1) {
      recommendation = `Tooth-passing frequency (${f_tooth.toFixed(0)} Hz) is near natural frequency (${natural_freq_Hz.toFixed(0)} Hz). ` +
        `Change RPM to move away from resonance. Try ${Math.round(rpm * 0.8)} or ${Math.round(rpm * 1.25)} RPM.`;
    } else if (sle_um > 10) {
      recommendation = `SLE of ${sle_um.toFixed(1)} µm is excessive. Reduce depth of cut or feed, or use a stiffer setup.`;
    } else if (sle_um > 2) {
      recommendation = `SLE of ${sle_um.toFixed(1)} µm is moderate. Acceptable for roughing but verify for finish passes.`;
    } else {
      recommendation = `SLE of ${sle_um.toFixed(2)} µm is within typical finish tolerance. Current RPM is well-positioned.`;
    }

    return {
      sle_um: Math.round(sle_um * 1000) / 1000,
      phase_deg: Math.round(phase_deg * 10) / 10,
      magnitude_um_per_N: Math.round(magnitude_um_per_N * 1000) / 1000,
      tooth_passing_freq_Hz: Math.round(f_tooth * 10) / 10,
      ratio_to_natural: Math.round(ratio * 1000) / 1000,
      risk,
      recommendation,
    };
  }

  /**
   * Sweep RPM range and find optimal RPMs where SLE is minimized.
   * SLE has valleys between resonance peaks — these are the sweet spots.
   */
  optimizeRPMForSLE(input: RPMOptimizeInput): RPMOptimizeResult {
    const { rpm_range, rpm_points = 200 } = input;
    const [rpmMin, rpmMax] = rpm_range;

    const sle_vs_rpm: Array<{ rpm: number; sle_um: number }> = [];

    for (let i = 0; i < rpm_points; i++) {
      const rpm = rpmMin + (rpmMax - rpmMin) * i / (rpm_points - 1);
      const result = this.predictSLE({ ...input, rpm });
      sle_vs_rpm.push({ rpm: Math.round(rpm), sle_um: result.sle_um });
    }

    // Find worst RPM (max SLE)
    let worstIdx = 0;
    let bestIdx = 0;
    for (let i = 0; i < sle_vs_rpm.length; i++) {
      if (sle_vs_rpm[i].sle_um > sle_vs_rpm[worstIdx].sle_um) worstIdx = i;
      if (sle_vs_rpm[i].sle_um < sle_vs_rpm[bestIdx].sle_um) bestIdx = i;
    }

    // Find local minima (valleys) — these are optimal RPMs
    const optimal_rpms: number[] = [];
    for (let i = 1; i < sle_vs_rpm.length - 1; i++) {
      if (sle_vs_rpm[i].sle_um <= sle_vs_rpm[i - 1].sle_um &&
          sle_vs_rpm[i].sle_um <= sle_vs_rpm[i + 1].sle_um) {
        // Verify it's a meaningful minimum (not just noise)
        const localMax = Math.max(sle_vs_rpm[i - 1].sle_um, sle_vs_rpm[i + 1].sle_um);
        if (localMax > sle_vs_rpm[i].sle_um * 1.05) {
          optimal_rpms.push(sle_vs_rpm[i].rpm);
        }
      }
    }

    // Always include the global best
    if (!optimal_rpms.includes(sle_vs_rpm[bestIdx].rpm)) {
      optimal_rpms.unshift(sle_vs_rpm[bestIdx].rpm);
    }

    return {
      optimal_rpms: optimal_rpms.slice(0, 10),
      sle_vs_rpm,
      worst_rpm: sle_vs_rpm[worstIdx].rpm,
      best_rpm: sle_vs_rpm[bestIdx].rpm,
    };
  }

  /**
   * Combined surface finish prediction: kinematic + vibration-induced error.
   *
   * Total surface error = sqrt(Ra_kinematic² + SLE²)
   * Ra_kinematic = fz² / (32 × r_nose) — ideal scallop height
   * SLE from forced vibration adds waviness on top of kinematic roughness.
   */
  combinedFinishPrediction(input: CombinedFinishInput): CombinedFinishResult {
    const { fz_mm, tool_corner_radius_mm } = input;

    // Kinematic roughness: Ra ≈ fz² / (32 × r) [µm]
    // Convert fz from mm to µm for consistent units
    const Ra_kinematic_um = (fz_mm * fz_mm * 1000) / (32 * tool_corner_radius_mm);

    // SLE from vibration
    const sleResult = this.predictSLE(input);
    const sle_um = sleResult.sle_um;

    // Combined: RSS of kinematic and vibration contributions
    const Ra_total_um = Math.sqrt(Ra_kinematic_um * Ra_kinematic_um + sle_um * sle_um);

    const dominant_source: "kinematic" | "vibration" =
      Ra_kinematic_um >= sle_um ? "kinematic" : "vibration";

    let improvement_action: string;
    if (dominant_source === "kinematic") {
      improvement_action = `Kinematic roughness dominates (${Ra_kinematic_um.toFixed(2)} vs ${sle_um.toFixed(2)} µm). ` +
        `Reduce feed per tooth or use larger corner radius to improve finish.`;
    } else {
      improvement_action = `Vibration-induced SLE dominates (${sle_um.toFixed(2)} vs ${Ra_kinematic_um.toFixed(2)} µm). ` +
        `Adjust RPM away from resonance or increase system stiffness. ` +
        `Try RPM = ${Math.round(input.rpm * 0.85)} or ${Math.round(input.rpm * 1.18)}.`;
    }

    return {
      Ra_kinematic_um: Math.round(Ra_kinematic_um * 1000) / 1000,
      sle_um: Math.round(sle_um * 1000) / 1000,
      Ra_total_um: Math.round(Ra_total_um * 1000) / 1000,
      dominant_source,
      improvement_action,
    };
  }
}

export const surfaceLocationErrorEngine = new SurfaceLocationErrorEngine();
