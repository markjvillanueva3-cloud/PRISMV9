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

import { FRFStabilityLobe } from "../algorithms/FRFStabilityLobe.js";
import { StabilityLobeDiagram } from "../algorithms/StabilityLobeDiagram.js";
import { EigensolverEngine } from "./EigensolverEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TOOL_MODULUS } from "../physics/constants.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

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
  tribal_tips?: KnowledgeTip[];
}

// Kienzle kc1_1 by ISO group — from canonical source
const KC11: Record<string, number> = Object.fromEntries(
  Object.entries(CANONICAL_KIENZLE).map(([k, v]) => [k, v.kc1_1])
);
const E_MOD: Record<string, number> = CANONICAL_TOOL_MODULUS as Record<string, number>;

export class ChatterStabilityLobeEngine {
  compute(input: ChatterInput): AtomicValue<ChatterResult> {
    const { tool, workpiece, machine, cutting } = input;
    const Ks = workpiece.kc11_mpa || KC11[workpiece.iso_group] || 1800; // specific cutting force (alpha_xx applied separately)
    const Z = tool.flute_count;

    // Structural dynamics — estimate or use provided
    const E = E_MOD[tool.material] || 600000;
    const I_mm4 = (Math.PI / 64) * Math.pow(tool.diameter_mm, 4);
    const L = tool.overhang_mm;
    const k = machine.stiffness_n_um ? machine.stiffness_n_um * 1000 : (3 * E * I_mm4) / Math.pow(L, 3); // N/mm
    const natFreq = machine.natural_frequency_hz || (1 / (2 * Math.PI)) * Math.sqrt(k * 1000 / 0.05); // rough mass estimate
    const zeta = machine.damping_ratio || 0.03; // typical damping ratio

    const sldResult = this._computeWithStabilityLobeDiagram(input, Ks, natFreq, zeta, k);
    if (sldResult) {
      const advisories = this._buildAdvisories(
        input,
        sldResult.optimal_rpm,
        sldResult.max_stable_ap_mm,
        sldResult.stable_pockets,
        zeta,
      );
      return {
        value: {
          ...sldResult,
          recommendations: advisories.recommendations,
          tribal_tips: advisories.tribal_tips,
        },
        unit: "stability_lobe_diagram",
        formula: "b_lim = -1/(2·Ks·N_t·α_xx·Re[G(ω_c)]/k) [Altintas-Budak]",
        confidence: machine.natural_frequency_hz ? 0.85 : 0.65,
      };
    }

    // Multi-mode extraction via EigensolverEngine (Altintas Ch. 3)
    // Build 2-element Euler-Bernoulli beam stiffness/mass for tool cantilever
    const modes = this._extractModes(E, I_mm4, L, tool.diameter_mm, zeta, natFreq, k);

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

        // Multi-mode FRF synthesis: G(ω) = Σᵢ (ψᵢ²/kᵢ) × 1/((1-rᵢ²) + j(2ζᵢrᵢ))
        let reG = 0;
        let imG = 0;
        for (const mode of modes) {
          const omega_ni = 2 * Math.PI * mode.freq;
          const ri = omega / omega_ni;
          const denom = mode.stiffness * ((1 - ri * ri) * (1 - ri * ri) + (2 * mode.zeta * ri) * (2 * mode.zeta * ri));
          reG += mode.participation * (1 - ri * ri) / denom;
          imG += mode.participation * (-(2 * mode.zeta * ri)) / denom;
        }

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

    const advisories = this._buildAdvisories(input, optimalRPM, globalMaxAp, stablePockets, zeta);

    const result: ChatterResult = {
      lobes,
      optimal_rpm: optimalRPM,
      max_stable_ap_mm: Math.round(globalMaxAp * 100) / 100,
      critical_frequency_hz: Math.round(natFreq),
      chatter_frequency_hz: Math.round(natFreq * 1.02),
      stable_pockets: stablePockets.sort((a, b) => b.max_ap_mm - a.max_ap_mm).slice(0, 5),
      recommendations: advisories.recommendations,
      tribal_tips: advisories.tribal_tips,
    };

    return {
      value: result,
      unit: "stability_lobe_diagram",
      formula: "a_lim=-1/(2×Ks×αxx×Re[G(ωc)]) [Altintas-Budak]",
      confidence: machine.natural_frequency_hz ? 0.85 : 0.65,
    };
  }

  private _buildAdvisories(
    input: ChatterInput,
    optimalRPM: number,
    maxStableAp: number,
    stablePockets: ChatterResult["stable_pockets"],
    zeta: number,
  ): { recommendations: string[]; tribal_tips?: KnowledgeTip[] } {
    const recs: string[] = [];
    recs.push(`Optimal RPM: ${optimalRPM} — max stable depth: ${maxStableAp.toFixed(1)}mm`);
    if (stablePockets.length > 0) {
      const best = [...stablePockets].sort((a, b) => b.max_ap_mm - a.max_ap_mm)[0];
      recs.push(`Best stable pocket: ${best.rpm_range[0]}-${best.rpm_range[1]} RPM (ap ≤ ${best.max_ap_mm}mm)`);
    }
    if (zeta < 0.02) {
      recs.push("Low damping ratio — consider vibration-damping toolholder");
    }
    if (input.tool.overhang_mm / input.tool.diameter_mm > 5) {
      recs.push(`L/D = ${(input.tool.overhang_mm / input.tool.diameter_mm).toFixed(1)} — high chatter risk, reduce overhang`);
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["toolpath_strategy", "anti_pattern"],
      material_iso: input.workpiece.iso_group,
      operation_type: "milling",
      spindle_rpm: optimalRPM,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recs.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "speeds_feeds",
        material_iso_group: input.workpiece.iso_group,
        operation_type: "milling",
        min_confidence: 70,
        limit: 5,
        query: "chatter",
      });
    } catch { /* tribal tips are advisory — never block computation */ }

    return { recommendations: recs, tribal_tips };
  }

  private _computeWithStabilityLobeDiagram(
    input: ChatterInput,
    Ks: number,
    natFreq: number,
    zeta: number,
    kNmm: number,
  ): Pick<
    ChatterResult,
    "lobes" | "optimal_rpm" | "max_stable_ap_mm" | "critical_frequency_hz" | "chatter_frequency_hz" | "stable_pockets"
  > | null {
    try {
      const sldAlg = new StabilityLobeDiagram();
      const rpmRange: [number, number] = input.rpm_range || [input.machine.min_rpm || 2000, input.machine.max_rpm];
      const sldInput = {
        natural_frequency: natFreq,
        damping_ratio: zeta,
        stiffness: kNmm * 1000,
        specific_cutting_force: Ks,
        num_teeth: input.tool.flute_count,
        radial_immersion: input.cutting.radial_immersion_ratio,
        rpm_range: rpmRange,
        num_points: input.rpm_points || 100,
        num_lobes: 10,
      };

      const validation = sldAlg.validate(sldInput);
      if (!validation.valid) return null;

      const sldResult = sldAlg.calculate(sldInput);
      const lobes: StabilityLobe[] = sldResult.lobes.map((lobe: { lobe_number: number; rpm: number[]; depth_limit: number[] }) => ({
        lobe_number: lobe.lobe_number,
        rpm_values: lobe.rpm,
        ap_limit_mm: lobe.depth_limit,
      }));
      const stablePockets = sldResult.sweet_spots.map((ss: { rpm: number; max_depth: number; lobe_number: number }) => ({
        rpm_range: [Math.round(ss.rpm * 0.98), Math.round(ss.rpm * 1.02)] as [number, number],
        max_ap_mm: ss.max_depth,
        lobe: ss.lobe_number,
      }));

      if (lobes.length === 0 || sldResult.unconditional_limit <= 0) return null;

      return {
        lobes,
        optimal_rpm: sldResult.sweet_spots[0]?.rpm || rpmRange[0],
        max_stable_ap_mm: sldResult.unconditional_limit,
        critical_frequency_hz: Math.round(natFreq),
        chatter_frequency_hz: Math.round(sldResult.chatter_frequency),
        stable_pockets: stablePockets.slice(0, 5),
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract multi-mode parameters via EigensolverEngine.
   * Builds a 2-element Euler-Bernoulli cantilever beam model from tool geometry,
   * then uses generalizedEigen(K, M) to extract up to 3 modes.
   * Falls back to analytical cantilever beam modes if eigensolver fails.
   *
   * Ref: Altintas, "Manufacturing Automation", Ch. 3 — multi-mode FRF synthesis
   */
  private _extractModes(
    E_mpa: number, I_mm4: number, L_mm: number,
    D_mm: number, zeta: number, fn1_hz: number, k1_nmm: number
  ): Array<{ freq: number; zeta: number; stiffness: number; participation: number }> {
    // Cantilever beam modal ratios (analytical): fn2/fn1 = 6.267, fn3/fn1 = 17.55
    // Mass participation decreases: mode1 ~70%, mode2 ~20%, mode3 ~10%
    const modes: Array<{ freq: number; zeta: number; stiffness: number; participation: number }> = [];

    try {
      // Build 4×4 stiffness and consistent mass matrices for 2-element cantilever
      const le = L_mm / 2; // element length
      const rho = 7.85e-6; // kg/mm³ (steel density approx)
      const A_mm2 = (Math.PI / 4) * D_mm * D_mm;
      const EI = E_mpa * I_mm4; // N·mm²
      const rhoAL = rho * A_mm2 * le; // kg per element

      // Element stiffness matrix (Euler-Bernoulli, 4 DOF: [v1, θ1, v2, θ2])
      const ke = EI / (le * le * le);
      const Ke = [
        [12 * ke,   6 * ke * le,  -12 * ke,   6 * ke * le],
        [6 * ke * le, 4 * ke * le * le, -6 * ke * le, 2 * ke * le * le],
        [-12 * ke, -6 * ke * le,  12 * ke,  -6 * ke * le],
        [6 * ke * le, 2 * ke * le * le, -6 * ke * le, 4 * ke * le * le],
      ];

      // Element consistent mass matrix
      const me = rhoAL / 420;
      const Me = [
        [156 * me, 22 * me * le, 54 * me, -13 * me * le],
        [22 * me * le, 4 * me * le * le, 13 * me * le, -3 * me * le * le],
        [54 * me, 13 * me * le, 156 * me, -22 * me * le],
        [-13 * me * le, -3 * me * le * le, -22 * me * le, 4 * me * le * le],
      ];

      // Assemble 2 elements → 6 DOF [v0,θ0, v1,θ1, v2,θ2], then fix DOF 0,1 (clamped)
      // After fixing: 4 free DOF [v1,θ1, v2,θ2]
      // K_global[2:5,2:5] = Ke1[2:3,2:3] + Ke2[0:1,0:1] for overlapping node
      const Kg: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
      const Mg: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
      // Element 1 contribution to free DOFs (rows/cols 2,3 of element → 0,1 of global)
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          Kg[i][j] += Ke[i + 2][j + 2];
          Mg[i][j] += Me[i + 2][j + 2];
        }
      // Element 2 contribution: full 4×4 maps to global [0:3]
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          Kg[i][j] += Ke[i][j];
          Mg[i][j] += Me[i][j];
        }

      // Generalized eigenvalue problem: K·φ = ω²·M·φ
      const eigenResult = EigensolverEngine.generalizedEigen(Kg, Mg, { maxIterations: 300 });
      if (eigenResult.converged && eigenResult.eigenvalues.length >= 2) {
        // Sort eigenvalues ascending (natural frequencies)
        const pairs = eigenResult.eigenvalues
          .map((val, idx) => ({ omega2: Math.max(0, val), vec: eigenResult.eigenvectors[idx] }))
          .filter(p => p.omega2 > 0)
          .sort((a, b) => a.omega2 - b.omega2);

        // Extract up to 3 modes
        const nModes = Math.min(3, pairs.length);
        for (let m = 0; m < nModes; m++) {
          const fn = Math.sqrt(pairs[m].omega2) / (2 * Math.PI);
          // Modal stiffness scales with ω²: ki = k1 × (ωi/ω1)²
          const freqRatio = fn / Math.max(1, pairs[0].omega2 > 0 ? Math.sqrt(pairs[0].omega2) / (2 * Math.PI) : fn1_hz);
          const ki = k1_nmm * freqRatio * freqRatio;
          // Participation decreases with mode number
          const participation = m === 0 ? 1.0 : m === 1 ? 0.15 : 0.05;
          // Higher modes have slightly higher damping
          const zetai = zeta * (1 + 0.5 * m);
          modes.push({ freq: fn, zeta: zetai, stiffness: ki, participation });
        }
        return modes;
      }
    } catch { /* Eigensolver failed — fall back to analytical modes */ }

    // Fallback: analytical cantilever beam modes
    modes.push({ freq: fn1_hz, zeta, stiffness: k1_nmm, participation: 1.0 });
    modes.push({ freq: fn1_hz * 6.267, zeta: zeta * 1.5, stiffness: k1_nmm * 39.3, participation: 0.15 });
    modes.push({ freq: fn1_hz * 17.55, zeta: zeta * 2.0, stiffness: k1_nmm * 308, participation: 0.05 });
    return modes;
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

  /**
   * U-ALG2: Algorithm-backed stability analysis.
   * Uses StabilityLobeDiagram algorithm (SDOF) or FRFStabilityLobe (multi-mode FRF)
   * for validated, safety-critical chatter prediction.
   *
   * When assembly FRF data is available (from ReceptanceCouplingEngine.predictWithRCSA),
   * FRFStabilityLobe produces assembly-specific stability boundaries. Otherwise,
   * StabilityLobeDiagram provides SDOF-based prediction from structural parameters.
   *
   * Ref: Altintas & Budak (1995); Schmitz & Smith (2019) "Machining Dynamics"
   */
  computeWithAlgorithms(input: ChatterInput & {
    /** Measured/predicted FRF data (from RCSA or tap test) for multi-mode analysis */
    assembly_frf?: Array<{ frequency: number; real: number; imag: number }>;
  }): AtomicValue<ChatterResult & { algorithm_used: string }> {
    const { tool, workpiece, machine, cutting } = input;
    const Ks = (workpiece.kc11_mpa || KC11[workpiece.iso_group] || 2100);
    const rpmRange: [number, number] = input.rpm_range || [machine.min_rpm || 2000, machine.max_rpm];

    // Path 1: FRF-based multi-mode stability (most accurate)
    if (input.assembly_frf && input.assembly_frf.length >= 10) {
      try {
        const frfAlg = new FRFStabilityLobe();
        const frfInput = {
          frf_data: input.assembly_frf.map(pt => ({
            frequency: pt.frequency,
            compliance: { real: pt.real, imag: pt.imag },
          })),
          n_flutes: tool.flute_count,
          Kt: Ks,
          radial_immersion: cutting.radial_immersion_ratio,
          speed_min: rpmRange[0],
          speed_max: rpmRange[1],
          n_speed_points: input.rpm_points || 200,
          n_lobes: 10,
          frf_units: "m_per_N" as const,
        };

        const validation = frfAlg.validate(frfInput);
        if (validation.valid) {
          const frfResult = frfAlg.calculate(frfInput);

          // Convert to ChatterResult format
          const lobes: StabilityLobe[] = [];
          const lobeMap = new Map<number, { rpms: number[]; aps: number[] }>();
          for (const pt of frfResult.stability_boundary) {
            if (!lobeMap.has(pt.lobe_number)) lobeMap.set(pt.lobe_number, { rpms: [], aps: [] });
            const lobe = lobeMap.get(pt.lobe_number)!;
            lobe.rpms.push(Math.round(pt.speed_rpm));
            lobe.aps.push(Math.round(pt.depth_limit_mm * 100) / 100);
          }
          for (const [num, data] of lobeMap) {
            lobes.push({ lobe_number: num, rpm_values: data.rpms, ap_limit_mm: data.aps });
          }

          const stablePockets = frfResult.sweet_spots.map((ss: { speed_rpm: number; depth_limit_mm: number }, i: number) => ({
            rpm_range: [Math.round(ss.speed_rpm * 0.98), Math.round(ss.speed_rpm * 1.02)] as [number, number],
            max_ap_mm: Math.round(ss.depth_limit_mm * 100) / 100,
            lobe: i,
          }));

          const recs = [`FRF-based SLD: ${frfResult.n_modes} modes detected`];
          if (frfResult.sweet_spots.length > 0) {
            const best = frfResult.sweet_spots[0];
            recs.push(`Best sweet spot: ${Math.round(best.speed_rpm)} RPM (ap ≤ ${best.depth_limit_mm.toFixed(1)}mm)`);
          }

          return {
            value: {
              lobes,
              optimal_rpm: frfResult.sweet_spots[0]?.speed_rpm ? Math.round(frfResult.sweet_spots[0].speed_rpm) : rpmRange[0],
              max_stable_ap_mm: Math.round(frfResult.min_stable_depth * 100) / 100,
              critical_frequency_hz: Math.round(frfResult.critical_frequency),
              chatter_frequency_hz: Math.round(frfResult.critical_frequency * 1.02),
              stable_pockets: stablePockets.slice(0, 5),
              recommendations: recs,
              algorithm_used: "FRFStabilityLobe (multi-mode, Altintas-Budak 1995)",
            },
            unit: "stability_lobe_diagram",
            formula: "b_lim = -1/(2·Kt·α·Re[Σ Gp(ωc)]) — multi-mode FRF",
            confidence: 0.90,
          };
        }
      } catch { /* FRFStabilityLobe not available */ }
    }

    // Path 2: SDOF StabilityLobeDiagram algorithm (validated, safety-critical)
    try {
      const sldAlg = new StabilityLobeDiagram();

      const E = E_MOD[tool.material] || 600000;
      const I = (Math.PI / 64) * Math.pow(tool.diameter_mm, 4);
      const L = tool.overhang_mm;
      const k = machine.stiffness_n_um ? machine.stiffness_n_um * 1000 : (3 * E * I) / Math.pow(L, 3);
      const natFreq = machine.natural_frequency_hz || (1 / (2 * Math.PI)) * Math.sqrt(k * 1000 / 0.05);
      const zeta = machine.damping_ratio || 0.03;

      const sldInput = {
        natural_frequency: natFreq,
        damping_ratio: zeta,
        stiffness: k * 1000, // N/m
        specific_cutting_force: Ks,
        num_teeth: tool.flute_count,
        radial_immersion: cutting.radial_immersion_ratio,
        rpm_range: rpmRange,
        num_points: input.rpm_points || 100,
        num_lobes: 10,
      };

      const validation = sldAlg.validate(sldInput);
      if (validation.valid) {
        const sldResult = sldAlg.calculate(sldInput);

        const lobes: StabilityLobe[] = sldResult.lobes.map((lobe: { lobe_number: number; rpm: number[]; depth_limit: number[] }) => ({
          lobe_number: lobe.lobe_number,
          rpm_values: lobe.rpm,
          ap_limit_mm: lobe.depth_limit,
        }));

        const stablePockets = sldResult.sweet_spots.map((ss: { rpm: number; max_depth: number; lobe_number: number }) => ({
          rpm_range: [Math.round(ss.rpm * 0.98), Math.round(ss.rpm * 1.02)] as [number, number],
          max_ap_mm: ss.max_depth,
          lobe: ss.lobe_number,
        }));

        const recs = [`SLD algorithm: unconditional limit ${sldResult.unconditional_limit}mm`];
        if (sldResult.sweet_spots.length > 0) {
          recs.push(`Best sweet spot: ${sldResult.sweet_spots[0].rpm} RPM (ap ≤ ${sldResult.sweet_spots[0].max_depth}mm)`);
        }
        if (zeta < 0.02) recs.push("Low damping — consider vibration-damping toolholder");
        if (tool.overhang_mm / tool.diameter_mm > 5) {
          recs.push(`L/D = ${(tool.overhang_mm / tool.diameter_mm).toFixed(1)} — high chatter risk`);
        }

        return {
          value: {
            lobes,
            optimal_rpm: sldResult.sweet_spots[0]?.rpm || rpmRange[0],
            max_stable_ap_mm: sldResult.unconditional_limit,
            critical_frequency_hz: Math.round(natFreq),
            chatter_frequency_hz: Math.round(sldResult.chatter_frequency),
            stable_pockets: stablePockets.slice(0, 5),
            recommendations: recs,
            algorithm_used: "StabilityLobeDiagram (SDOF, Altintas-Budak 1995)",
          },
          unit: "stability_lobe_diagram",
          formula: "b_lim = -1/(2·Ks·N_t·α_xx·Re[G(ω_c)]/k)",
          confidence: machine.natural_frequency_hz ? 0.85 : 0.65,
        };
      }
    } catch { /* StabilityLobeDiagram algorithm not available */ }

    // Path 3: Inline fallback (existing compute method)
    const fallback = this.compute(input);
    return {
      value: { ...fallback.value, algorithm_used: "inline_SDOF_fallback" },
      unit: fallback.unit,
      formula: fallback.formula,
      confidence: fallback.confidence,
    };
  }
}

export const chatterStabilityLobeEngine = new ChatterStabilityLobeEngine();
