/**
 * SwissGuideBushingPhysicsEngine (U-LPR-SWISS, Lathe B4)
 *
 * Pure-physics engine for Swiss-type lathes (Tsugami, Citizen, Star). The
 * workpiece is fed through a guide bushing (GB) that supports it within
 * ~0.005–0.010 mm over the cutting tool. Two distinct operating regimes:
 *
 *   GB-on  — Workpiece simply-supported by bushing. Short cantilever a
 *            from bushing face to tool tip. Deflection δ ≈ F·a³/(3EI).
 *            Feed not stiffness-limited; surface finish drives limit.
 *   GB-off — Workpiece fully cantilevered from collet. Deflection grows
 *            as L³ (beam theory). Feed must drop to keep δ below ~0.005 mm
 *            to avoid chatter or out-of-round.
 *
 * All outputs in SI units (N, m, Pa, Hz). Kienzle cutting force comes
 * from the canonical constants table — never inlined. Guide-bushing
 * clearance is tuned to material stiffness: stiffer materials need less
 * radial slop, softer gummier materials need more to avoid seize.
 *
 * References:
 *   - Citizen LLC Swiss-Type Machining Handbook (2022), §4 "Guide-bushing
 *     clearance and feed-rate selection"
 *   - Tsugami T-Series Application Guide (2021), table T-4 "Bar-end
 *     remnant vs GB engagement"
 *   - Gere & Timoshenko, "Mechanics of Materials" 8ed, §9.3 "Beam
 *     deflection of circular cross-sections"
 *   - Kronenberg, "Machining Science and Application" (1966), §7
 *     "Small-diameter turning thrust and back-drag"
 */

export type GBMode = "gb_on" | "gb_off";

export interface SwissBarInputs {
  bar_od_mm: number;               // bar stock outer diameter
  part_length_mm: number;          // from collet face to tool tip
  bushing_engagement_mm?: number;  // only for gb_on; default 12 mm
  youngs_modulus_gpa: number;      // material E
  yield_mpa: number;               // for back-drag headroom
  kc_mpa: number;                  // specific cutting force (Kienzle kc1.1)
  spindle_rpm: number;             // actual spindle speed
  feed_per_rev_mm: number;         // candidate f
  ap_mm: number;                   // radial depth of cut
}

export interface GBClearanceAdvice {
  clearance_mm: number;
  min_mm: number;
  max_mm: number;
  rationale: string;
}

export interface SwissFeedLimits {
  mode: GBMode;
  max_deflection_mm: number;
  computed_deflection_mm: number;
  deflection_ratio: number;           // computed / max
  max_feed_per_rev_mm: number;        // what the beam bending allows
  effective_stiffness_N_per_m: number;
  feed_limited_by: "deflection" | "finish" | "thrust" | "ok";
  notes: string[];
}

export interface BarEndRemnant {
  mode: GBMode;
  min_remnant_mm: number;             // shortest stub usable
  typical_remnant_mm: number;         // production-typical
  max_reach_to_tool_mm: number;       // unsupported cantilever length
  reason: string;
}

export interface ThrustBackDrag {
  axial_thrust_N: number;
  friction_drag_N: number;
  net_feed_scaling: number;           // ≤ 1 (1 = no de-rating)
  effective_feed_mm_per_rev: number;
  warning?: string;
}

const DEFAULT_MAX_DEFLECTION_GB_ON_MM = 0.010;
const DEFAULT_MAX_DEFLECTION_GB_OFF_MM = 0.005;
const DEFAULT_BUSHING_ENGAGEMENT_MM = 12;
const DEFAULT_COLLET_FACE_TO_BUSHING_MM = 10;
// Friction coefficients for carbide bushing on hardened steel bar (dry).
// Jorgensen (2015) "Guide-bushing tribology in Swiss-type machining", Table 2.
const CARBIDE_BUSHING_MU = 0.12;
// Guide-bushing clearance scaling factor per ISO group (empirical).
// Higher = need more clearance (softer/gummier materials).
const MATERIAL_CLEARANCE_FACTOR: Record<string, number> = {
  P: 1.0,   // steel — baseline
  M: 1.3,   // stainless — sticks, need more room
  K: 0.9,   // cast iron — very clean chip, less clearance
  N: 1.2,   // aluminum — gummy, needs room for chip wrap
  S: 1.4,   // superalloy — heat + sticking
  H: 0.9,   // hardened — minimal expansion, tight clearance ok
};

export class SwissGuideBushingPhysicsEngine {
  /**
   * Recommend guide-bushing radial clearance. Bar OD and material
   * stiffness drive it: stiffer bars tolerate smaller gaps; softer
   * materials need more headroom to avoid seizure under thermal growth.
   */
  recommendClearance(input: {
    bar_od_mm: number;
    iso_group: string;
    surface_speed_m_per_min?: number; // higher Vc → more thermal growth
  }): GBClearanceAdvice {
    if (input.bar_od_mm <= 0) throw new Error("bar_od_mm must be >0");
    if (input.bar_od_mm > 80) {
      throw new Error("Swiss-type typically limited to bar_od ≤ 80 mm");
    }
    const factor = MATERIAL_CLEARANCE_FACTOR[input.iso_group] ?? 1.0;
    // Baseline 0.005–0.010 mm, scale slightly with bar OD (larger
    // bars need proportionally less tight clearance because thermal
    // growth effects scale with circumference).
    const baselineMin = 0.005 + (input.bar_od_mm / 40) * 0.001;
    const baselineMax = 0.010 + (input.bar_od_mm / 40) * 0.002;
    const thermalBump =
      input.surface_speed_m_per_min !== undefined &&
      input.surface_speed_m_per_min > 200
        ? 0.001
        : 0;
    const min = baselineMin * factor + thermalBump;
    const max = baselineMax * factor + thermalBump;
    const nominal = (min + max) / 2;
    return {
      clearance_mm: round5(nominal),
      min_mm: round5(min),
      max_mm: round5(max),
      rationale: `ISO-${input.iso_group} factor=${factor.toFixed(2)}, bar_od=${input.bar_od_mm}mm, thermal_bump=${thermalBump}mm`,
    };
  }

  /**
   * Compute feed-limit for cantilever-bending in either GB mode.
   * Uses beam theory: δ = F·L³/(3·E·I) for cantilever; δ = F·a²·b²/(3·E·I·L)
   * for simply-supported with intermediate load. I = π·d⁴/64 for round bar.
   */
  feedLimits(
    mode: GBMode,
    input: SwissBarInputs,
    max_deflection_mm?: number,
  ): SwissFeedLimits {
    if (input.bar_od_mm <= 0) throw new Error("bar_od_mm must be >0");
    if (input.part_length_mm <= 0) throw new Error("part_length_mm must be >0");
    if (input.youngs_modulus_gpa <= 0) {
      throw new Error("youngs_modulus_gpa must be >0");
    }
    if (input.feed_per_rev_mm <= 0) {
      throw new Error("feed_per_rev_mm must be >0");
    }
    if (input.ap_mm <= 0) throw new Error("ap_mm must be >0");
    if (input.spindle_rpm <= 0) throw new Error("spindle_rpm must be >0");

    const d_m = input.bar_od_mm / 1000;
    const L_m = input.part_length_mm / 1000;
    const E_pa = input.youngs_modulus_gpa * 1e9;
    const I = (Math.PI * Math.pow(d_m, 4)) / 64; // m⁴
    // Kienzle radial force proxy — use kc times chip area; we'll use the
    // radial component ≈ 0.3 * Fc (Merchant ratio for roughing turning).
    const ap_m = input.ap_mm / 1000;
    const f_m = input.feed_per_rev_mm / 1000;
    const Fc = input.kc_mpa * 1e6 * ap_m * f_m; // N
    const Fr = 0.3 * Fc; // radial component, N
    const maxDef =
      max_deflection_mm ??
      (mode === "gb_on"
        ? DEFAULT_MAX_DEFLECTION_GB_ON_MM
        : DEFAULT_MAX_DEFLECTION_GB_OFF_MM);
    const maxDef_m = maxDef / 1000;

    const notes: string[] = [];
    let stiffness: number; // N/m
    let deflection_m: number;
    if (mode === "gb_on") {
      // Effective cantilever from bushing face to tool tip ≈ L - engagement
      // with bushing acting as a roller support. We approximate as a
      // supported-cantilever with pinned base — δ = F·a³/(3·E·I) with
      // shortened a = L - bushing_engagement - collet_to_bushing.
      const engagement =
        input.bushing_engagement_mm ?? DEFAULT_BUSHING_ENGAGEMENT_MM;
      const colletToBush = DEFAULT_COLLET_FACE_TO_BUSHING_MM;
      const a_mm = Math.max(1, input.part_length_mm - engagement - colletToBush);
      const a_m = a_mm / 1000;
      stiffness = (3 * E_pa * I) / Math.pow(a_m, 3);
      deflection_m = Fr / stiffness;
      notes.push(
        `GB-on effective cantilever a=${a_mm.toFixed(1)}mm (L − engagement − collet)`,
      );
    } else {
      // Full cantilever from collet face
      stiffness = (3 * E_pa * I) / Math.pow(L_m, 3);
      deflection_m = Fr / stiffness;
      notes.push("GB-off full cantilever from collet face");
    }

    const deflection_mm = deflection_m * 1000;
    const ratio = deflection_mm / maxDef;
    // Feed scales linearly with Fr (constant kc, ap fixed), so
    // maxFeed = currentFeed * (maxDef / actualDef) capped by ratio.
    const maxFeed = input.feed_per_rev_mm / Math.max(ratio, 1e-9);
    let limitedBy: SwissFeedLimits["feed_limited_by"] = "ok";
    if (ratio >= 1.0) {
      limitedBy = "deflection";
      notes.push(
        `deflection ${deflection_mm.toFixed(4)} mm exceeds max ${maxDef.toFixed(4)} mm`,
      );
    } else if (ratio >= 0.7) {
      limitedBy = "deflection";
      notes.push("deflection approaching limit — consider GB-on or shorter L");
    }
    return {
      mode,
      max_deflection_mm: maxDef,
      computed_deflection_mm: round5(deflection_mm),
      deflection_ratio: round5(ratio),
      max_feed_per_rev_mm: round5(maxFeed),
      effective_stiffness_N_per_m: round5(stiffness),
      feed_limited_by: limitedBy,
      notes,
    };
  }

  /**
   * Minimum / typical bar-end remnant (material left in the collet at
   * cut-off time) for each GB mode. GB-on needs the bar to still span
   * the bushing, so remnant is larger. GB-off can cut closer to the
   * collet face.
   */
  barEndRemnant(mode: GBMode, bar_od_mm: number): BarEndRemnant {
    if (bar_od_mm <= 0) throw new Error("bar_od_mm must be >0");
    if (mode === "gb_on") {
      // Citizen/Tsugami spec — bar must extend past bushing by ≥ 1 OD
      // for reliable chucking transfer, typical 80–120 mm.
      const min = Math.max(80, bar_od_mm * 2);
      const typical = Math.max(100, bar_od_mm * 3);
      return {
        mode,
        min_remnant_mm: round5(min),
        typical_remnant_mm: round5(typical),
        max_reach_to_tool_mm: round5(typical - DEFAULT_BUSHING_ENGAGEMENT_MM),
        reason: "GB-on requires bar to span bushing + collet + transfer allowance",
      };
    }
    // GB-off: collet grips directly; remnant limited by collet face to
    // last cut, typically 20–40 mm for safety against collet collision.
    const min = 20;
    const typical = 30;
    return {
      mode,
      min_remnant_mm: round5(min),
      typical_remnant_mm: round5(typical),
      max_reach_to_tool_mm: round5(typical),
      reason: "GB-off limited by collet-face clearance to finishing tools",
    };
  }

  /**
   * Compute thrust back-drag on small-OD finishing. Axial thrust load
   * (≈ 0.4 × Fc per Kronenberg) presses workpiece into bushing. Resulting
   * friction drag = μ · F_thrust scales axial feed authority.
   */
  thrustBackDrag(input: SwissBarInputs, mode: GBMode): ThrustBackDrag {
    const d_m = input.bar_od_mm / 1000;
    const ap_m = input.ap_mm / 1000;
    const f_m = input.feed_per_rev_mm / 1000;
    const Fc = input.kc_mpa * 1e6 * ap_m * f_m;
    const Fa = 0.4 * Fc; // axial thrust
    // Only GB-on generates bushing friction back-drag
    const drag = mode === "gb_on" ? CARBIDE_BUSHING_MU * Fa : 0;
    // Net feed scaling: drag reduces apparent axial authority when
    // comparable to cutting thrust. Scale = Fa / (Fa + drag).
    const netScale = Fa === 0 ? 1 : Fa / (Fa + drag);
    const effectiveFeed = input.feed_per_rev_mm * netScale;
    // Warning for small-OD (<6 mm) GB-on where drag is ≥30 % of thrust
    let warning: string | undefined;
    if (mode === "gb_on" && d_m < 0.006 && drag / Math.max(Fa, 1e-6) > 0.2) {
      warning = `small-OD (<6 mm) GB-on: friction drag ${(
        (drag / Fa) * 100
      ).toFixed(1)}% of thrust — reduce f or switch to GB-off`;
    }
    return {
      axial_thrust_N: round5(Fa),
      friction_drag_N: round5(drag),
      net_feed_scaling: round5(netScale),
      effective_feed_mm_per_rev: round5(effectiveFeed),
      warning,
    };
  }

  /**
   * Recommend best mode given part geometry. Heuristic:
   *   • Long + slender (L/d > 4) → GB-on
   *   • Short + stubby (L/d ≤ 2) → GB-off (bar-end savings)
   *   • Middle: compute deflection in each mode and pick the lowest
   */
  recommendMode(input: SwissBarInputs): {
    mode: GBMode;
    reason: string;
    gb_on_deflection_mm: number;
    gb_off_deflection_mm: number;
  } {
    const ratio = input.part_length_mm / Math.max(input.bar_od_mm, 1e-6);
    const gbOn = this.feedLimits("gb_on", input);
    const gbOff = this.feedLimits("gb_off", input);
    let mode: GBMode;
    let reason: string;
    if (ratio > 4) {
      mode = "gb_on";
      reason = `slenderness L/d=${ratio.toFixed(2)} > 4 → GB-on mandatory`;
    } else if (ratio <= 2) {
      mode = "gb_off";
      reason = `stubby L/d=${ratio.toFixed(2)} ≤ 2 → GB-off saves bar-end remnant`;
    } else {
      mode =
        gbOn.computed_deflection_mm < gbOff.computed_deflection_mm
          ? "gb_on"
          : "gb_off";
      reason = `middle L/d=${ratio.toFixed(2)} → pick by lowest deflection`;
    }
    return {
      mode,
      reason,
      gb_on_deflection_mm: gbOn.computed_deflection_mm,
      gb_off_deflection_mm: gbOff.computed_deflection_mm,
    };
  }
}

function round5(v: number): number {
  if (!Number.isFinite(v)) return v;
  return Math.round(v * 1e5) / 1e5;
}

export const swissGuideBushingPhysicsEngine =
  new SwissGuideBushingPhysicsEngine();
