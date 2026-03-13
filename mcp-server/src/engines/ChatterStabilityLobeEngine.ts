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
}

export const chatterStabilityLobeEngine = new ChatterStabilityLobeEngine();
