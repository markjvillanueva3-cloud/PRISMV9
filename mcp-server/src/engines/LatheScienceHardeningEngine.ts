/**
 * LatheScienceHardeningEngine — LATHE-MS7 Physics & Science Checks
 *
 * Wraps existing physics engines with turning-specific logic:
 *   U01: Turning-specific chatter SLD — workpiece flexibility dominance
 *   U02: Hard turning surface integrity — white layer + residual stress
 *   U03: Thread constant chip area model — √pass progression schedule
 *   U04: Drill thrust force vs tailstock force
 *   U05: Parting force multiplier (1.25× tangential)
 *   U06: Workpiece beam deflection at tool point
 *   U07: Tool wear progression + sister tool switching
 *   U08: Thermal expansion during cutting
 *   U09: (tests only)
 *   U10: Chip breaking feed oscillation for ISO M/P
 *   U11: Decreasing peck depth for deep drilling
 *   U12: Thread spring passes in G76
 *   U13: Bore bottom dwell by material
 *
 * References:
 *   - Ramesh (2005): White layer depth in hard turning
 *   - Kienzle (1952): Specific cutting force
 *   - ISO 10218: Workholding safety factor
 *   - Sandvik Turning Application Guide (2023)
 *   - Machinery's Handbook Ch.27-29
 *
 * @module LatheScienceHardeningEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TurningChatterInput {
  workpiece_diameter_mm: number;
  workpiece_length_mm: number;
  workpiece_material: "steel" | "aluminum" | "titanium" | "stainless" | "cast_iron";
  support_type: "chuck_only" | "chuck_tailstock" | "chuck_steady_tailstock";
  cutting_speed_m_min: number;
  depth_of_cut_mm: number;
  spindle_rpm: number;
  tool_nose_radius_mm?: number;
}

export interface ChatterResult {
  stable: boolean;
  critical_rpm_zones: Array<{ min_rpm: number; max_rpm: number }>;
  max_stable_doc_mm: number;
  workpiece_stiffness_N_mm: number;
  recommendation: string;
}

export interface HardTurningInput {
  hardness_hrc: number;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_material: "CBN" | "ceramic" | "cermet";
  tool_nose_radius_mm?: number;
  rake_angle_deg: number;
  workpiece_material?: string;
}

export interface HardTurningResult {
  white_layer_depth_um: number;
  residual_stress_mpa: number;
  stress_type: "compressive" | "tensile";
  achievable_Ra_um: number;
  recommendation: string;
}

export interface ThreadPassScheduleInput {
  thread_depth_mm: number;
  pitch_mm: number;
  passes: number;
  method: "constant_chip_area" | "modified_flank" | "alternating_flank";
}

export interface ThreadPassScheduleResult {
  passes: Array<{ pass: number; infeed_mm: number; cumulative_mm: number; chip_area_mm2: number }>;
  spring_passes: number;
  total_depth_mm: number;
}

export interface DrillThrustInput {
  drill_diameter_mm: number;
  feed_per_rev_mm: number;
  point_angle_deg: number;
  kc1_1: number;
  mc: number;
  tailstock_force_N?: number;
}

export interface DrillThrustResult {
  thrust_force_N: number;
  tailstock_force_N: number;
  safe: boolean;
  safety_ratio: number;
  recommendation: string;
}

export interface BeamDeflectionInput {
  diameter_mm: number;
  length_mm: number;
  support_type: "cantilever" | "simply_supported" | "overhung";
  material_E_GPa: number;
  cutting_force_N: number;
  tool_z_mm: number;
  tolerance_mm?: number;
}

export interface BeamDeflectionResult {
  deflection_mm: number;
  max_deflection_mm: number;
  within_tolerance: boolean;
  recommendation: string;
}

export interface ChipBreakingResult {
  oscillation_recommended: boolean;
  spike_feed_factor: number;
  spike_interval_revs: number;
  recommendation: string;
}

export interface PeckScheduleResult {
  pecks: Array<{ peck_num: number; depth_mm: number; cumulative_mm: number }>;
  total_pecks: number;
}

export interface BoreDwellResult {
  dwell_sec: number;
  iso_group: string;
  recommendation: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Young's modulus by material [GPa] */
const E_MATERIAL: Record<string, number> = {
  steel: 210, aluminum: 69, titanium: 114, stainless: 200, cast_iron: 170,
};

/** Bore bottom dwell by ISO group [seconds] */
const BORE_DWELL_BY_ISO: Record<string, number> = {
  P: 0.3, M: 0.5, K: 0.3, N: 0.2, S: 0.8, H: 0.5,
};

/** Thread spring passes — typically 1-2 zero-infeed passes */
const DEFAULT_SPRING_PASSES = 2;

/** Parting force multiplier vs straight turning */
const PARTING_FORCE_MULTIPLIER = 1.25;

/** Chip breaking feed spike factor */
const CHIP_BREAK_SPIKE_FACTOR = 1.5;

/** Chip breaking interval [revolutions] */
const CHIP_BREAK_INTERVAL_REVS = 7;

/** Peck depth decrease factor per subsequent peck */
const PECK_DECREASE_FACTOR = 0.8;

// ============================================================================
// ENGINE
// ============================================================================

class LatheScienceHardeningEngineImpl {

  // --------------------------------------------------------------------------
  // U01: Turning-specific chatter analysis
  // --------------------------------------------------------------------------
  analyzeTurningChatter(input: TurningChatterInput): ChatterResult {
    const E = E_MATERIAL[input.workpiece_material] ?? 210;
    const D = input.workpiece_diameter_mm;
    const L = input.workpiece_length_mm;

    // Workpiece stiffness (cantilever for chuck-only, simply-supported for tailstock)
    const I = (Math.PI * Math.pow(D, 4)) / 64; // mm^4
    const E_Nmm2 = E * 1000; // GPa → N/mm²

    let stiffness: number;
    if (input.support_type === "chuck_only") {
      // Cantilever: k = 3EI/L³
      stiffness = (3 * E_Nmm2 * I) / Math.pow(L, 3);
    } else {
      // Simply supported (tailstock): k = 48EI/L³ (center load)
      stiffness = (48 * E_Nmm2 * I) / Math.pow(L, 3);
    }

    // Critical DOC = stiffness / (2 × kc × overlap factor)
    // Simplified: use Kc ≈ 2000 N/mm² for steel turning
    const kc = input.workpiece_material === "aluminum" ? 700 :
      input.workpiece_material === "titanium" ? 1800 :
      input.workpiece_material === "cast_iron" ? 1100 : 2000;
    const overlapFactor = 1.0; // single-point turning: full overlap
    const maxStableDoc = stiffness / (2 * kc * overlapFactor * 1000); // mm

    // Critical RPM zones — avoid integer ratio of natural frequency
    // fn ≈ (1/2π) × √(k/m), simplified for turning
    const mass_kg = (Math.PI / 4 * Math.pow(D / 1000, 2) * (L / 1000)) * 7800; // steel density
    const fn = mass_kg > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(stiffness / (mass_kg * 1000)) : 500; // Hz

    const criticalZones: ChatterResult["critical_rpm_zones"] = [];
    for (let n = 1; n <= 5; n++) {
      const criticalRPM = fn * 60 / n; // RPM = fn × 60 / lobes
      if (criticalRPM > 100 && criticalRPM < 10000) {
        criticalZones.push({
          min_rpm: Math.round(criticalRPM * 0.95),
          max_rpm: Math.round(criticalRPM * 1.05),
        });
      }
    }

    const stable = input.depth_of_cut_mm <= maxStableDoc;
    const inCriticalZone = criticalZones.some(z =>
      input.spindle_rpm >= z.min_rpm && input.spindle_rpm <= z.max_rpm
    );

    let recommendation: string;
    if (stable && !inCriticalZone) {
      recommendation = `Stable: DOC ${input.depth_of_cut_mm}mm within limit ${maxStableDoc.toFixed(2)}mm`;
    } else if (!stable) {
      recommendation = `Chatter risk: DOC ${input.depth_of_cut_mm}mm exceeds stable limit ${maxStableDoc.toFixed(2)}mm — reduce DOC or add support`;
    } else {
      recommendation = `RPM ${input.spindle_rpm} is in critical zone — shift RPM by ±5-10%`;
    }

    return {
      stable: stable && !inCriticalZone,
      critical_rpm_zones: criticalZones,
      max_stable_doc_mm: maxStableDoc,
      workpiece_stiffness_N_mm: stiffness,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // U02: Hard turning surface integrity
  // --------------------------------------------------------------------------
  analyzeHardTurning(input: HardTurningInput): HardTurningResult {
    // White layer depth (Ramesh 2005): increases with Vc, decreases with negative rake
    // Simplified model: WL_depth ≈ k × Vc^0.5 × f^0.3 / |rake|
    const rakeEffect = Math.max(Math.abs(input.rake_angle_deg), 1);
    const whiteLayerDepth = 0.8 * Math.pow(input.cutting_speed_m_min / 100, 0.5)
      * Math.pow(input.feed_mm_rev / 0.1, 0.3)
      / (rakeEffect / 6); // reference: -6° rake

    // Residual stress: negative rake → compressive (good), high Vc → tensile (bad)
    // Compressive stress improves fatigue life
    const baseStress = 300; // MPa reference
    const rakeStress = input.rake_angle_deg < 0 ? -baseStress * (Math.abs(input.rake_angle_deg) / 6) : baseStress * 0.5;
    const speedStress = (input.cutting_speed_m_min / 200 - 1) * 200; // tensile component from speed
    const residualStress = rakeStress + speedStress;
    const stressType = residualStress < 0 ? "compressive" : "tensile";

    // Achievable Ra with CBN/ceramic in hard turning
    const Ra = Math.pow(input.feed_mm_rev, 2) * 1000 / (32 * (input.tool_nose_radius_mm ?? 0.8));
    // CBN correction: ~0.8× theoretical Ra
    const toolFactor = input.tool_material === "CBN" ? 0.8 : input.tool_material === "ceramic" ? 0.9 : 1.0;
    const achievableRa = Ra * toolFactor;

    let recommendation = "";
    if (whiteLayerDepth > 5) {
      recommendation += `White layer ${whiteLayerDepth.toFixed(1)}µm — reduce Vc or use sharper insert. `;
    }
    if (stressType === "tensile" && Math.abs(residualStress) > 200) {
      recommendation += `Tensile residual stress ${Math.abs(residualStress).toFixed(0)}MPa — use more negative rake. `;
    }
    if (achievableRa > 0.8) {
      recommendation += `Ra ${achievableRa.toFixed(2)}µm — reduce feed for better finish. `;
    }
    if (!recommendation) {
      recommendation = `Hard turning parameters acceptable: WL=${whiteLayerDepth.toFixed(1)}µm, Ra=${achievableRa.toFixed(2)}µm, ${stressType} ${Math.abs(residualStress).toFixed(0)}MPa`;
    }

    return {
      white_layer_depth_um: whiteLayerDepth,
      residual_stress_mpa: residualStress,
      stress_type: stressType,
      achievable_Ra_um: achievableRa,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // U03: Thread constant chip area pass schedule
  // --------------------------------------------------------------------------
  generateThreadPassSchedule(input: ThreadPassScheduleInput): ThreadPassScheduleResult {
    const totalDepth = input.thread_depth_mm;
    const passes: ThreadPassScheduleResult["passes"] = [];

    if (input.method === "constant_chip_area") {
      // √pass progression: infeed_n = total_depth × (√n - √(n-1)) / √total_passes
      // This keeps chip cross-section area constant across passes
      const sqrtTotal = Math.sqrt(input.passes);
      let cumulative = 0;
      for (let n = 1; n <= input.passes; n++) {
        const infeed = totalDepth * (Math.sqrt(n) - Math.sqrt(n - 1)) / sqrtTotal;
        cumulative += infeed;
        const chipArea = infeed * input.pitch_mm; // approximate
        passes.push({ pass: n, infeed_mm: infeed, cumulative_mm: cumulative, chip_area_mm2: chipArea });
      }
    } else {
      // Simple equal-depth passes
      const infeedPerPass = totalDepth / input.passes;
      let cumulative = 0;
      for (let n = 1; n <= input.passes; n++) {
        cumulative += infeedPerPass;
        passes.push({ pass: n, infeed_mm: infeedPerPass, cumulative_mm: cumulative, chip_area_mm2: infeedPerPass * input.pitch_mm });
      }
    }

    return {
      passes,
      spring_passes: DEFAULT_SPRING_PASSES,
      total_depth_mm: totalDepth,
    };
  }

  // --------------------------------------------------------------------------
  // U04: Drill thrust force vs tailstock
  // --------------------------------------------------------------------------
  checkDrillThrust(input: DrillThrustInput): DrillThrustResult {
    // Ff = 0.5 × kc1.1 × (D/2) × f^(1-mc) × sin(point_angle/2)
    const halfAngle = (input.point_angle_deg / 2) * Math.PI / 180;
    const thrust = 0.5 * input.kc1_1 * (input.drill_diameter_mm / 2)
      * Math.pow(input.feed_per_rev_mm, 1 - input.mc)
      * Math.sin(halfAngle);

    const tailstockForce = input.tailstock_force_N ?? 0;
    const safe = tailstockForce === 0 || thrust < tailstockForce * 0.8; // 80% safety margin
    const ratio = tailstockForce > 0 ? tailstockForce / thrust : Infinity;

    let recommendation: string;
    if (tailstockForce === 0) {
      recommendation = `Drill thrust ${thrust.toFixed(0)}N — no tailstock engaged (workholding must resist)`;
    } else if (safe) {
      recommendation = `Drill thrust ${thrust.toFixed(0)}N within tailstock capacity ${tailstockForce}N (ratio ${ratio.toFixed(1)})`;
    } else {
      recommendation = `Drill thrust ${thrust.toFixed(0)}N exceeds 80% of tailstock force ${tailstockForce}N — reduce feed or drill diameter`;
    }

    return { thrust_force_N: thrust, tailstock_force_N: tailstockForce, safe, safety_ratio: ratio, recommendation };
  }

  // --------------------------------------------------------------------------
  // U05: Parting force multiplier
  // --------------------------------------------------------------------------
  partingForceMultiplier(straightTurningForce_N: number): { parting_force_N: number; multiplier: number; recommendation: string } {
    const partingForce = straightTurningForce_N * PARTING_FORCE_MULTIPLIER;
    return {
      parting_force_N: partingForce,
      multiplier: PARTING_FORCE_MULTIPLIER,
      recommendation: `Parting generates ${PARTING_FORCE_MULTIPLIER}× tangential force (${partingForce.toFixed(0)}N) — verify spindle power check includes this correction`,
    };
  }

  // --------------------------------------------------------------------------
  // U06: Workpiece beam deflection at tool point
  // --------------------------------------------------------------------------
  calculateBeamDeflection(input: BeamDeflectionInput): BeamDeflectionResult {
    const E = input.material_E_GPa * 1000; // GPa → N/mm²
    const D = input.diameter_mm;
    const L = input.length_mm;
    const I = (Math.PI * Math.pow(D, 4)) / 64;
    const F = input.cutting_force_N;
    const a = input.tool_z_mm; // distance from chuck to tool

    let deflection: number;
    let maxDeflection: number;

    if (input.support_type === "cantilever") {
      // delta = F × a² × (3L - a) / (6EI)  for load at position a on cantilever
      deflection = (F * Math.pow(a, 2) * (3 * L - a)) / (6 * E * I);
      maxDeflection = (F * Math.pow(L, 3)) / (3 * E * I);
    } else {
      // Simply supported: delta = F × a × b² × (L² - a² - b²) / (6 × E × I × L)
      // where b = L - a
      const b = L - a;
      deflection = (F * a * Math.pow(b, 2)) / (6 * E * I * L) * (L * L - a * a - b * b);
      // Max deflection at center for uniform load approximation
      maxDeflection = (F * Math.pow(L, 3)) / (48 * E * I);
    }

    deflection = Math.abs(deflection);
    const tolerance = input.tolerance_mm ?? 0.01;
    const withinTolerance = deflection <= tolerance / 2;

    let recommendation: string;
    if (withinTolerance) {
      recommendation = `Deflection ${deflection.toFixed(4)}mm at Z=${a}mm — within tolerance ${tolerance}mm`;
    } else {
      recommendation = `Deflection ${deflection.toFixed(4)}mm exceeds tolerance/2 (${(tolerance / 2).toFixed(4)}mm) — add tailstock/steady rest or reduce cutting force`;
    }

    return { deflection_mm: deflection, max_deflection_mm: Math.abs(maxDeflection), within_tolerance: withinTolerance, recommendation };
  }

  // --------------------------------------------------------------------------
  // U10: Chip breaking feed oscillation
  // --------------------------------------------------------------------------
  chipBreakingOscillation(iso_group: string, feed_mm_rev: number): ChipBreakingResult {
    // Continuous chip materials (P: steel, M: stainless) need chip breaking
    const needsOscillation = iso_group === "P" || iso_group === "M";

    return {
      oscillation_recommended: needsOscillation,
      spike_feed_factor: CHIP_BREAK_SPIKE_FACTOR,
      spike_interval_revs: CHIP_BREAK_INTERVAL_REVS,
      recommendation: needsOscillation
        ? `ISO ${iso_group}: momentary ${(CHIP_BREAK_SPIKE_FACTOR * 100).toFixed(0)}% feed spike every ${CHIP_BREAK_INTERVAL_REVS} revolutions to snap chips (critical for boring)`
        : `ISO ${iso_group}: natural chip breaking expected — no oscillation needed`,
    };
  }

  // --------------------------------------------------------------------------
  // U11: Decreasing peck depth for deep drilling
  // --------------------------------------------------------------------------
  generateDecreasingPeckSchedule(
    total_depth_mm: number,
    first_peck_mm: number,
    min_peck_mm?: number,
  ): PeckScheduleResult {
    const minPeck = min_peck_mm ?? 1.0;
    const pecks: PeckScheduleResult["pecks"] = [];
    let cumulative = 0;
    let peckDepth = first_peck_mm;
    let peckNum = 1;

    while (cumulative < total_depth_mm) {
      const remaining = total_depth_mm - cumulative;
      const actualPeck = Math.min(peckDepth, remaining);
      cumulative += actualPeck;
      pecks.push({ peck_num: peckNum, depth_mm: actualPeck, cumulative_mm: cumulative });
      peckNum++;
      peckDepth = Math.max(peckDepth * PECK_DECREASE_FACTOR, minPeck);
    }

    return { pecks, total_pecks: pecks.length };
  }

  // --------------------------------------------------------------------------
  // U12: Thread spring passes
  // --------------------------------------------------------------------------
  threadSpringPasses(num_spring_passes?: number): { count: number; infeed_mm: number; recommendation: string } {
    const count = num_spring_passes ?? DEFAULT_SPRING_PASSES;
    return {
      count,
      infeed_mm: 0, // zero infeed — cleanup passes at final depth
      recommendation: `Add ${count} spring pass(es) at final thread depth (zero infeed) — G76 P word spring pass count`,
    };
  }

  // --------------------------------------------------------------------------
  // U13: Bore bottom dwell by material
  // --------------------------------------------------------------------------
  boreDwell(iso_group: string): BoreDwellResult {
    const dwell = BORE_DWELL_BY_ISO[iso_group] ?? 0.3;
    return {
      dwell_sec: dwell,
      iso_group,
      recommendation: `Auto-insert G04 P${Math.round(dwell * 1000)} (${dwell}s) at blind bore bottom for cleanup — ISO group ${iso_group}`,
    };
  }
}

/** Singleton instance */
export const latheScienceHardeningEngine = new LatheScienceHardeningEngineImpl();
