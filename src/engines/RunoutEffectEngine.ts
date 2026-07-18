/**
 * RunoutEffectEngine — TIR (Total Indicator Runout) impact on tool life & surface finish.
 *
 * Models how spindle/holder/tool runout affects:
 * - Individual flute loading (unequal chip loads)
 * - Effective tool life reduction (worst flute wears fastest)
 * - Surface finish degradation (waviness from runout)
 * - Dynamic force variation (once-per-revolution excitation)
 * - Effective vs programmed chipload
 *
 * Ref: Armarego & Deshpande (1991), Wan & Altintas (2014).
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface RunoutInput {
  tool: {
    diameter_mm: number;
    flute_count: number;
    helix_angle_deg?: number;
  };
  runout: {
    tir_um: number;             // Total Indicator Runout
    angle_deg?: number;         // runout orientation (0-360)
    source: "spindle" | "holder" | "tool" | "combined";
  };
  cutting: {
    spindle_rpm: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  };
}

export interface FluteLoad {
  flute_number: number;
  effective_chipload_mm: number;
  chipload_deviation_pct: number;
  force_n: number;
  force_deviation_pct: number;
  relative_wear_rate: number;   // 1.0 = nominal, >1 = accelerated
}

export interface RunoutResult {
  flute_loads: FluteLoad[];
  max_chipload_mm: number;
  min_chipload_mm: number;
  chipload_imbalance_pct: number;
  tool_life_reduction_pct: number;
  surface_waviness_um: number;       // Wa from runout
  effective_surface_ra_um: number;    // Ra with runout effect
  force_variation_pct: number;        // peak-to-peak force oscillation
  once_per_rev_frequency_hz: number;
  critical_tir_um: number;            // TIR where life drops 50%
  recommendations: string[];
}

const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };

export class RunoutEffectEngine {
  compute(input: RunoutInput): AtomicValue<RunoutResult> {
    const { tool, runout, cutting, material } = input;
    const Z = tool.flute_count;
    const fz = cutting.feed_per_tooth_mm;
    const tir = runout.tir_um / 1000; // mm
    const D = tool.diameter_mm;
    const ap = cutting.axial_depth_mm;
    const ae = cutting.radial_depth_mm;
    const kc11 = KC11[material.iso_group] || 2100;
    const rpm = cutting.spindle_rpm;

    // Runout orientation (default: worst case at 0°)
    const runoutAngle = (runout.angle_deg ?? 0) * Math.PI / 180;

    // Per-flute chipload calculation
    const fluteLoads: FluteLoad[] = [];
    let maxChipload = 0, minChipload = Infinity;
    let maxForce = 0, minForce = Infinity;

    for (let i = 0; i < Z; i++) {
      const fluteAngle = (2 * Math.PI * i) / Z;
      // Radial offset of this flute due to runout
      const radialOffset = tir * Math.cos(fluteAngle - runoutAngle);

      // Effective chipload for this flute
      // Flute at +offset takes more material, opposite takes less
      const effectiveChipload = Math.max(0, fz + radialOffset);

      // Kienzle force for this flute
      const hm = effectiveChipload * Math.sqrt(ae / D);
      const Fc = kc11 * ap * hm * Math.pow(Math.max(0.001, hm), -0.25);

      const chiploaDev = ((effectiveChipload - fz) / fz) * 100;
      const forceDev = Fc > 0 ? ((Fc - (kc11 * ap * (fz * Math.sqrt(ae / D)) * Math.pow(Math.max(0.001, fz * Math.sqrt(ae / D)), -0.25))) / (kc11 * ap * (fz * Math.sqrt(ae / D)) * Math.pow(Math.max(0.001, fz * Math.sqrt(ae / D)), -0.25))) * 100 : 0;

      // Wear rate proportional to chip load squared (Armarego model)
      const wearRate = Math.pow(effectiveChipload / Math.max(0.001, fz), 2);

      fluteLoads.push({
        flute_number: i + 1,
        effective_chipload_mm: Math.round(effectiveChipload * 10000) / 10000,
        chipload_deviation_pct: Math.round(chiploaDev * 10) / 10,
        force_n: Math.round(Fc * 10) / 10,
        force_deviation_pct: Math.round(forceDev * 10) / 10,
        relative_wear_rate: Math.round(wearRate * 100) / 100,
      });

      maxChipload = Math.max(maxChipload, effectiveChipload);
      minChipload = Math.min(minChipload, effectiveChipload);
      maxForce = Math.max(maxForce, Fc);
      minForce = Math.min(minForce, Fc);
    }

    const chiploaDimbalance = ((maxChipload - minChipload) / fz) * 100;
    const forceVariation = maxForce > 0 ? ((maxForce - minForce) / ((maxForce + minForce) / 2)) * 100 : 0;

    // Tool life reduction — worst flute determines life
    const worstFluteWear = Math.max(...fluteLoads.map(f => f.relative_wear_rate));
    const lifeReduction = (1 - 1 / worstFluteWear) * 100;

    // Surface waviness from runout (once-per-rev pattern)
    const waviness = tir * 1000; // TIR directly maps to waviness amplitude in μm

    // Surface roughness with runout
    const Rn = 0.8; // default nose radius
    const baseRa = (fz * fz) / (8 * Rn) / 4 * 1000; // μm
    const runoutRa = baseRa * (1 + chiploaDimbalance / 100 * 0.5);

    // Once-per-revolution frequency
    const oprFreq = rpm / 60;

    // Critical TIR (where life drops 50%)
    // Life drops 50% when worst flute wear rate = 2x → chipload = fz × √2 → offset = fz × (√2 - 1)
    const criticalTIR = fz * (Math.sqrt(2) - 1) * 1000; // μm

    // Recommendations
    const recs: string[] = [];
    if (tir * 1000 > criticalTIR) {
      recs.push(`TIR ${tir * 1000}μm exceeds critical ${criticalTIR.toFixed(1)}μm — tool life reduced ${lifeReduction.toFixed(0)}%. Improve holder concentricity.`);
    }
    if (tir * 1000 > fz * 1000 * 0.5) {
      recs.push("TIR > 50% of chipload — significant imbalance. Use shrink-fit or hydraulic holder.");
    }
    if (minChipload < fz * 0.3) {
      recs.push("Some flutes nearly idle — rubbing instead of cutting, accelerating wear.");
    }
    if (forceVariation > 30) {
      recs.push(`Force variation ${forceVariation.toFixed(0)}% — may excite vibrations at ${oprFreq.toFixed(0)}Hz.`);
    }
    if (runout.source === "spindle") {
      recs.push("Spindle runout — check spindle bearing condition and preload.");
    }
    if (runout.source === "holder" || runout.source === "tool") {
      recs.push("Holder/tool runout — use precision collet (ER-UP) or shrink-fit holder for <3μm TIR.");
    }
    if (Z === 2 && tir * 1000 > 10) {
      recs.push("2-flute with high runout — one flute may do all the work. Switch to 3+ flutes or fix runout.");
    }

    return {
      value: {
        flute_loads: fluteLoads,
        max_chipload_mm: Math.round(maxChipload * 10000) / 10000,
        min_chipload_mm: Math.round(minChipload * 10000) / 10000,
        chipload_imbalance_pct: Math.round(chiploaDimbalance * 10) / 10,
        tool_life_reduction_pct: Math.round(lifeReduction * 10) / 10,
        surface_waviness_um: Math.round(waviness * 10) / 10,
        effective_surface_ra_um: Math.round(runoutRa * 1000) / 1000,
        force_variation_pct: Math.round(forceVariation * 10) / 10,
        once_per_rev_frequency_hz: Math.round(oprFreq * 10) / 10,
        critical_tir_um: Math.round(criticalTIR * 10) / 10,
        recommendations: recs,
      },
      unit: "μm",
      formula: "fz_eff = fz ± TIR×cos(θ), wear ∝ fz² [Armarego]",
      confidence: 0.8,
    };
  }
}

export const runoutEffectEngine = new RunoutEffectEngine();
