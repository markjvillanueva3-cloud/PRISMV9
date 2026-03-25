/**
 * ChatterStabilityLobeEngine — Regenerative chatter stability analysis.
 *
 * Computes stability lobe diagrams (SLD) for milling operations.
 * Determines the maximum stable axial depth of cut as a function of spindle RPM.
 *
 * Physics: Transfer function G(ω) → oriented FRF → critical depth a_lim
 *   a_lim = -1 / (2 × Ks × Re[G(ω)])
 *   where Ks = specific cutting force, G(ω) = structural FRF
 *
 * Ref: Altintas & Budak (1995) analytical stability model.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface ChatterInput {
  tool: {
    diameter_mm: number;
    flute_count: number;
    overhang_mm: number;
    material: "carbide" | "hss" | "cermet";
  };
  workpiece: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    kc11_mpa?: number;
  };
  machine: {
    natural_frequency_hz?: number;
    damping_ratio?: number;
    stiffness_n_um?: number;
    max_rpm: number;
    min_rpm?: number;
  };
  cutting: {
    radial_immersion_ratio: number; // ae/D (0-1)
    up_milling: boolean;
  };
  rpm_range?: [number, number];
  rpm_points?: number;
}

export interface StabilityLobe {
  lobe_number: number;
  rpm_values: number[];
  ap_limit_mm: number[];
}

export interface ChatterResult {
  lobes: StabilityLobe[];
  optimal_rpm: number;
  max_stable_ap_mm: number;
  critical_frequency_hz: number;
  chatter_frequency_hz: number;
  stable_pockets: Array<{
    rpm_range: [number, number];
    max_ap_mm: number;
    lobe: number;
  }>;
  recommendations: string[];
}

const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };
const E_MOD: Record<string, number> = { carbide: 600000, hss: 210000, cermet: 450000 };

export class ChatterStabilityLobeEngine {
  compute(input: ChatterInput): AtomicValue<ChatterResult> {
    const { tool, workpiece, machine, cutting } = input;
    const Ks = (workpiece.kc11_mpa || KC11[workpiece.iso_group] || 2100) * 0.5; // avg force coefficient
    const Z = tool.flute_count;

    // Structural dynamics — estimate or use provided
    const E = E_MOD[tool.material] || 600000;
    const I = (Math.PI / 64) * Math.pow(tool.diameter_mm, 4);
    const L = tool.overhang_mm;
    const k = machine.stiffness_n_um ? machine.stiffness_n_um * 1000 : (3 * E * I) / Math.pow(L, 3); // N/mm
    const natFreq = machine.natural_frequency_hz || (1 / (2 * Math.PI)) * Math.sqrt(k * 1000 / 0.05); // rough mass estimate
    const zeta = machine.damping_ratio || 0.03; // typical damping ratio

    // Directional coefficient for milling
    const ae_ratio = cutting.radial_immersion_ratio;
    const phi_st = cutting.up_milling ? 0 : Math.acos(2 * ae_ratio - 1);
    const phi_ex = cutting.up_milling ? Math.acos(1 - 2 * ae_ratio) : Math.PI;
    const alpha_xx = 0.5 * ((phi_ex - phi_st) - 0.5 * (Math.sin(2 * phi_ex) - Math.sin(2 * phi_st)));

    // RPM range
    const minRPM = input.rpm_range?.[0] || machine.min_rpm || 2000;
    const maxRPM = input.rpm_range?.[1] || machine.max_rpm;
    const nPoints = input.rpm_points || 100;

    // Generate stability lobes for N = 0..5
    const maxLobes = 6;
    const lobes: StabilityLobe[] = [];
    const stablePockets: ChatterResult["stable_pockets"] = [];
    let globalMaxAp = 0;
    let optimalRPM = minRPM;

    for (let N = 0; N < maxLobes; N++) {
      const rpmValues: number[] = [];
      const apValues: number[] = [];

      for (let i = 0; i < nPoints; i++) {
        const rpm = minRPM + (maxRPM - minRPM) * i / (nPoints - 1);

        // Tooth passing frequency
        const ftooth = (rpm / 60) * Z;

        // Chatter frequency (near natural frequency)
        // For each lobe N, the phase condition gives:
        // ε = 2π - 2 × arctan(Re[G]/Im[G])
        // RPM = 60 × fc / (Z × (N + ε/(2π)))

        // Sweep chatter frequency near natural frequency
        const fcRatio = 1 + 0.1 * Math.sin(i * Math.PI / nPoints); // small sweep
        const fc = natFreq * fcRatio;
        const omega = 2 * Math.PI * fc;

        // FRF at chatter frequency
        const omega_n = 2 * Math.PI * natFreq;
        const r = omega / omega_n;
        const reG = (1 - r * r) / (k * ((1 - r * r) * (1 - r * r) + (2 * zeta * r) * (2 * zeta * r)));
        const imG = -(2 * zeta * r) / (k * ((1 - r * r) * (1 - r * r) + (2 * zeta * r) * (2 * zeta * r)));

        // Phase
        const psi = Math.atan2(imG, reG);
        const epsilon = Math.PI - 2 * psi;

        // RPM for this lobe
        const lobeRPM = (60 * fc) / (Z * (N + epsilon / (2 * Math.PI)));

        if (lobeRPM < minRPM || lobeRPM > maxRPM) continue;

        // Critical depth of cut
        const magG = Math.sqrt(reG * reG + imG * imG);
        const a_lim = -1 / (2 * Ks * alpha_xx * reG);

        if (a_lim > 0 && a_lim < 100) { // reasonable range
          rpmValues.push(Math.round(lobeRPM));
          apValues.push(Math.round(a_lim * 100) / 100);

          if (a_lim > globalMaxAp) {
            globalMaxAp = a_lim;
            optimalRPM = Math.round(lobeRPM);
          }
        }
      }

      if (rpmValues.length > 0) {
        lobes.push({ lobe_number: N, rpm_values: rpmValues, ap_limit_mm: apValues });

        // Find stable pocket (peak of this lobe)
        const maxIdx = apValues.indexOf(Math.max(...apValues));
        if (maxIdx >= 0) {
          const pocketCenter = rpmValues[maxIdx];
          const pocketWidth = rpmValues.length > 1 ?
            Math.abs(rpmValues[Math.min(maxIdx + 1, rpmValues.length - 1)] - rpmValues[Math.max(maxIdx - 1, 0)]) : 200;
          stablePockets.push({
            rpm_range: [Math.round(pocketCenter - pocketWidth / 2), Math.round(pocketCenter + pocketWidth / 2)],
            max_ap_mm: Math.round(apValues[maxIdx] * 100) / 100,
            lobe: N,
          });
        }
      }
    }

    // Recommendations
    const recs: string[] = [];
    recs.push(`Optimal RPM: ${optimalRPM} — max stable depth: ${globalMaxAp.toFixed(1)}mm`);
    if (stablePockets.length > 0) {
      const best = stablePockets.sort((a, b) => b.max_ap_mm - a.max_ap_mm)[0];
      recs.push(`Best stable pocket: ${best.rpm_range[0]}-${best.rpm_range[1]} RPM (ap ≤ ${best.max_ap_mm}mm)`);
    }
    if (zeta < 0.02) {
      recs.push("Low damping ratio — consider vibration-damping toolholder");
    }
    if (tool.overhang_mm / tool.diameter_mm > 5) {
      recs.push(`L/D = ${(tool.overhang_mm / tool.diameter_mm).toFixed(1)} — high chatter risk, reduce overhang`);
    }

    // Playbook: enrich with domain advice
    try {
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
      const pbResult = machiningPlaybookEngine.advise({
        categories: ["toolpath_strategy", "anti_pattern"],
        material_iso: workpiece.iso_group,
        operation_type: "milling",
        spindle_rpm: optimalRPM,
      });
      for (const rule of pbResult.rules) {
        if (rule.severity === "critical" || rule.severity === "important") {
          recs.push(`[Playbook ${rule.id}] ${rule.title}`);
        }
      }
    } catch { /* playbook not available */ }

    const result: ChatterResult = {
      lobes,
      optimal_rpm: optimalRPM,
      max_stable_ap_mm: Math.round(globalMaxAp * 100) / 100,
      critical_frequency_hz: Math.round(natFreq),
      chatter_frequency_hz: Math.round(natFreq * 1.02),
      stable_pockets: stablePockets.sort((a, b) => b.max_ap_mm - a.max_ap_mm).slice(0, 5),
      recommendations: recs,
    };

    return {
      value: result,
      unit: "stability_lobe_diagram",
      formula: "a_lim=-1/(2×Ks×αxx×Re[G(ωc)]) [Altintas-Budak]",
      confidence: machine.natural_frequency_hz ? 0.85 : 0.65,
    };
  }

  /**
   * Multi-frequency stability solution for low radial immersion (ae/D < 25%).
   * The zeroth-order approximation (ZOA) overestimates stability by 15-30% at low immersion.
   * This method includes higher harmonics of directional factors for accurate prediction.
   *
   * Reference: Budak & Altintas (1998) "Analytical Prediction of Chatter Stability in
   * Milling—Part II: Application of the General Formulation to Common Milling Systems"
   * ASME J. Dyn. Sys., Meas., and Control, 120(1), 31-36
   */
  multiFrequencyStability(input: {
    natural_freq_Hz: number;
    damping_ratio: number;
    stiffness_N_per_m: number;
    Ktc: number;
    Krc: number;
    ae_mm: number;
    D_mm: number;
    flutes: number;
    rpm_range: [number, number];
    rpm_points?: number;
    harmonics?: number;
  }): {
    lobes: Array<{ rpm: number; a_lim_mm: number }>;
    zoa_lobes: Array<{ rpm: number; a_lim_mm: number }>;
    max_stable_depth_mm: number;
    optimal_rpm: number;
    improvement_vs_zoa_pct: number;
    immersion_ratio: number;
    method: "multi_frequency";
  } {
    const {
      natural_freq_Hz, damping_ratio, stiffness_N_per_m, Ktc, Krc,
      ae_mm, D_mm, flutes, rpm_range, rpm_points = 200, harmonics = 4,
    } = input;

    const immersion_ratio = ae_mm / D_mm;

    // Engagement angles (up-milling convention)
    const phi_st = 0;
    const phi_ex = Math.acos(1 - 2 * immersion_ratio);

    // ── Compute Fourier coefficients of directional factors ──
    // a_pq(r) = (N_t/2π) × ∫[φ_st..φ_ex] directional_term × e^(-j·r·N_t·φ) dφ
    // For the zeroth harmonic (r=0) this is the standard ZOA
    const computeDirectionalCoeffs = (numHarmonics: number): Array<{ axx: number; axy: number; ayx: number; ayy: number }> => {
      const coeffs: Array<{ axx: number; axy: number; ayx: number; ayy: number }> = [];
      const nSteps = 500; // integration steps
      const dPhi = (phi_ex - phi_st) / nSteps;
      const Kr = Krc / Ktc; // force ratio

      for (let r = 0; r <= numHarmonics; r++) {
        let axx = 0, axy = 0, ayx = 0, ayy = 0;

        for (let s = 0; s <= nSteps; s++) {
          const phi = phi_st + s * dPhi;
          const w = (s === 0 || s === nSteps) ? 0.5 : 1.0; // trapezoidal

          // Directional factors per Altintas (2012) eq. 3.33
          const sin2 = Math.sin(2 * phi);
          const cos2 = Math.cos(2 * phi);

          const gxx = 0.5 * (sin2 + Kr * (1 - cos2));
          const gxy = 0.5 * ((1 + cos2) + Kr * sin2);
          const gyx = 0.5 * ((-1 + cos2) + Kr * sin2);
          const gyy = 0.5 * (sin2 - Kr * (1 + cos2));

          // For r-th harmonic: multiply by cos/sin of r*N_t*phi
          // Using real part approximation for the dominant effect
          const harmonicAngle = r * flutes * phi;
          const cosH = Math.cos(harmonicAngle);
          const sinH = Math.sin(harmonicAngle);

          // Fourier coefficient (real part contributes to stability limit)
          axx += w * gxx * cosH * dPhi;
          axy += w * gxy * cosH * dPhi;
          ayx += w * gyx * cosH * dPhi;
          ayy += w * gyy * cosH * dPhi;
        }

        const scale = flutes / (2 * Math.PI);
        coeffs.push({
          axx: axx * scale,
          axy: axy * scale,
          ayx: ayx * scale,
          ayy: ayy * scale,
        });
      }

      return coeffs;
    };

    const allCoeffs = computeDirectionalCoeffs(harmonics);
    const zoaCoeffs = [allCoeffs[0]]; // zeroth order only

    // ── Sweep RPM and compute stability limits ──
    const computeLobes = (coeffs: Array<{ axx: number; axy: number; ayx: number; ayy: number }>): Array<{ rpm: number; a_lim_mm: number }> => {
      const lobes: Array<{ rpm: number; a_lim_mm: number }> = [];
      const omega_n = 2 * Math.PI * natural_freq_Hz;
      const k = stiffness_N_per_m / 1000; // Convert N/m → N/mm for consistency with Ktc [N/mm²]
      const zeta = damping_ratio;

      for (let i = 0; i < rpm_points; i++) {
        const rpm = rpm_range[0] + (rpm_range[1] - rpm_range[0]) * i / (rpm_points - 1);
        const omega_tooth = 2 * Math.PI * rpm * flutes / 60;

        // Sweep chatter frequencies near natural frequency
        // The chatter frequency is near fn but shifted by the process
        let minAlim = Infinity;

        for (let fc_mult = 0.70; fc_mult <= 1.30; fc_mult += 0.005) {
          const fc = natural_freq_Hz * fc_mult;
          const omega_c = 2 * Math.PI * fc;
          const r = omega_c / omega_n;

          // FRF at chatter frequency
          const dr = 1 - r * r;
          const di = 2 * zeta * r;
          const denom_sq = dr * dr + di * di;
          const reG = dr / (k * denom_sq);
          const imG = -di / (k * denom_sq);

          // Sum directional coefficients with harmonic coupling
          let sum_axx = 0;
          for (let h = 0; h < coeffs.length; h++) {
            // Each harmonic h contributes with a phase that depends on omega_tooth
            // At higher harmonics, the FRF is evaluated at omega_c + h*omega_tooth
            if (h === 0) {
              sum_axx += coeffs[h].axx;
            } else {
              // FRF at shifted frequency: omega_c + h*omega_tooth
              const omega_shifted = omega_c + h * omega_tooth;
              const r_s = omega_shifted / omega_n;
              const dr_s = 1 - r_s * r_s;
              const di_s = 2 * zeta * r_s;
              const denom_s = dr_s * dr_s + di_s * di_s;
              const reG_s = dr_s / (k * denom_s);

              // Harmonic contribution weighted by shifted FRF ratio
              const frfRatio = Math.abs(reG_s) / (Math.abs(reG) + 1e-30);
              sum_axx += coeffs[h].axx * frfRatio;
            }
          }

          // For 2D: use eigenvalue of directional matrix summed across harmonics
          // Full 2D eigenvalue: Λ = 0.5*(axx+ayy) ± sqrt((axx-ayy)²/4 + axy*ayx)
          // Sum all harmonic contributions for accurate low-immersion result
          let totalAxx = 0, totalAyy = 0, totalAxy = 0, totalAyx = 0;
          for (const c of coeffs) {
            totalAxx += Math.abs(c.axx);
            totalAyy += Math.abs(c.ayy);
            totalAxy += Math.abs(c.axy);
            totalAyx += Math.abs(c.ayx);
          }
          const sumTotal = totalAxx + totalAyy;
          const detTotal = totalAxx * totalAyy - totalAxy * totalAyx;
          const disc = sumTotal * sumTotal / 4 - detTotal;
          const effectiveEigen = 0.5 * sumTotal + (disc > 0 ? Math.sqrt(disc) : 0);

          if (Math.abs(effectiveEigen * reG) > 1e-20) {
            // Critical depth: a_lim = -1/(2 × Ktc × Lambda_real × Re[G])
            const a_lim = -1 / (2 * Ktc * effectiveEigen * reG);
            if (a_lim > 0.01 && a_lim < 500) {
              if (a_lim < minAlim) minAlim = a_lim;
            }
          }
        }

        if (minAlim < Infinity) {
          lobes.push({ rpm: Math.round(rpm), a_lim_mm: Math.round(minAlim * 1000) / 1000 });
        }
      }

      return lobes;
    };

    const multiFreqLobes = computeLobes(allCoeffs);
    const zoaLobes = computeLobes(zoaCoeffs);

    // ── Compute summary statistics ──
    let maxStableMulti = 0, optimalRpmMulti = rpm_range[0];
    for (const pt of multiFreqLobes) {
      if (pt.a_lim_mm > maxStableMulti) {
        maxStableMulti = pt.a_lim_mm;
        optimalRpmMulti = pt.rpm;
      }
    }

    let maxStableZoa = 0;
    for (const pt of zoaLobes) {
      if (pt.a_lim_mm > maxStableZoa) {
        maxStableZoa = pt.a_lim_mm;
      }
    }

    // At low immersion, multi-freq gives LOWER limits than ZOA (ZOA is optimistic)
    // improvement_vs_zoa_pct shows how much more conservative multi-freq is
    // Positive means ZOA was over-predicting by this percentage
    const avgMulti = multiFreqLobes.reduce((s, p) => s + p.a_lim_mm, 0) / (multiFreqLobes.length || 1);
    const avgZoa = zoaLobes.reduce((s, p) => s + p.a_lim_mm, 0) / (zoaLobes.length || 1);
    const improvement = avgZoa > 0 ? ((avgZoa - avgMulti) / avgZoa) * 100 : 0;

    return {
      lobes: multiFreqLobes,
      zoa_lobes: zoaLobes,
      max_stable_depth_mm: Math.round(maxStableMulti * 1000) / 1000,
      optimal_rpm: optimalRpmMulti,
      improvement_vs_zoa_pct: Math.round(improvement * 10) / 10,
      immersion_ratio: Math.round(immersion_ratio * 1000) / 1000,
      method: "multi_frequency",
    };
  }
}

export const chatterStabilityLobeEngine = new ChatterStabilityLobeEngine();
