/**
 * HyperMillGrindingBridge — Grinding workflow routing for hyperMILL operations
 *
 * Routes hyperMILL finishing operations to PRISM's GrindingProgramAssemblerEngine
 * when any of 4 physical triggers are met:
 *   1. Ra < 0.4 µm — surface finish too tight for milling
 *   2. Tolerance < 0.01 mm — dimensional tolerance exceeds milling capability
 *   3. Hardness > 55 HRC — hard turning limit reached, grinding required
 *   4. Feature type — bearing bore / journal / spindle seat
 *
 * Grinding burn risk gate (U-HMR33):
 *   Computes specific grinding energy u = F_t / (a_e × b) [J/mm³] and blocks
 *   if predicted temperature exceeds material burn threshold (theta_burn from
 *   GrindingProgramAssemblerEngine's material database, which uses values from
 *   Malkin (1989) and Jaeger (1942) heat flux model).
 *
 *   Wheel compatibility check: blocks if abrasive type is incompatible with
 *   material (e.g., aluminum oxide wheel on cemented carbide).
 *
 * Grinding types routed:
 *   - surface_grind    — flat surfaces, faces
 *   - cylindrical_grind — OD/ID turning (bearing bores, journals)
 *   - creep_feed       — profile grinding (blades, complex profiles)
 *   - centerless       — bars, pins, rollers
 *
 * Sources:
 *   - Malkin, S. (1989) "Grinding Technology: Theory and Application"
 *   - Jaeger, J.C. (1942) "Moving sources of heat" Proc. R. Soc. NSW
 *   - Verkerk (1977) CIRP Annals kinematic roughness model
 *   - Rowe (2009) "Principles of Modern Grinding Technology" §4
 *
 * HM-REV-MS6 / U-HMR32 + U-HMR33
 */

import {
  GrindingProgramAssemblerEngine,
  type SurfaceGrindProfile,
  type CylindricalGrindProfile,
  type GrindingProgram,
} from "./GrindingProgramAssemblerEngine.js";

// ============================================================================
// Types
// ============================================================================

export type GrindingType =
  | "surface_grind"
  | "cylindrical_grind"
  | "creep_feed"
  | "centerless";

export type GrindingTrigger =
  | "ra_too_tight"
  | "tolerance_too_tight"
  | "hardness_exceeds_milling"
  | "bearing_bore_feature";

export type WheelAbrasive =
  | "WA"   // White aluminum oxide — steel, soft alloys
  | "A"    // Brown aluminum oxide — general purpose steel
  | "GC"   // Green silicon carbide — tungsten carbide, ceramic
  | "C"    // Black silicon carbide — cast iron, non-ferrous
  | "CBN"  // Cubic boron nitride — hardened steel, Inconel
  | "diamond"; // PCD diamond — carbide, ceramics, glass

export interface GrindingRouteInput {
  /** Feature description */
  featureName: string;
  /** Material key (matching GrindingProgramAssemblerEngine material DB) */
  material: string;
  /** Required surface finish Ra [µm] */
  requiredRa_um: number;
  /** Dimensional tolerance [mm] */
  tolerance_mm: number;
  /** Material hardness [HRC] */
  hardness_hrc: number;
  /** Feature type classification */
  featureType?: "flat_surface" | "cylindrical_od" | "cylindrical_id" | "bearing_bore" | "profile" | "bar";
  /** Part length / workpiece OD [mm] */
  partSize_mm: number;
  /** Part width (for surface grinding) [mm] */
  partWidth_mm?: number;
  /** Stock to remove [mm] */
  stock_mm?: number;
  /** Wheel spec override */
  wheelSpec?: string;
  /** Controller dialect */
  controller?: string;
  /** Workpiece wheel diameter [mm] — if omitted, auto-selected */
  wheelDiameter_mm?: number;
  /** Wheel width [mm] */
  wheelWidth_mm?: number;
  /** Approach speed for burn risk check [mm/min] (table speed v_w) */
  tableSpeed_mmmin?: number;
  /** Depth of cut per pass a_e [mm] — for burn risk calculation */
  depthOfCut_mm?: number;
  /** Wheel life remaining [%] — for wheel condition warning */
  wheelLifeRemaining_pct?: number;
  /** Wheel abrasive type — for compatibility check */
  wheelAbrasive?: WheelAbrasive;
}

export interface GrindingRouteResult {
  /** Whether this operation should be routed to grinding */
  grindingRequired: boolean;
  /** Triggers that activated grinding routing */
  triggers: GrindingTrigger[];
  /** Grinding type selected */
  grindingType: GrindingType | null;
  /** Burn risk gate result */
  burnRiskGate: BurnRiskGateResult;
  /** Full grinding program (if grindingRequired=true and burn risk gate passes) */
  grindingProgram?: GrindingProgram;
  /** Recommended wheel spec */
  recommendedWheelSpec: string;
  /** Routing justification */
  justification: string;
  /** Warnings */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

export interface BurnRiskGateResult {
  /** Whether operation is blocked due to burn risk */
  blocked: boolean;
  /** Predicted specific grinding energy [J/mm³] */
  specificEnergy_J_mm3: number;
  /** Burn threshold from material DB [°C] */
  burnThreshold_C: number;
  /** Whether burn risk exceeds threshold */
  burnRisk: boolean;
  /** Wheel compatibility status */
  wheelCompatible: boolean;
  /** Wheel life status */
  wheelLifeOk: boolean;
  /** Gate message */
  message: string;
}

// ============================================================================
// Wheel compatibility database
// ============================================================================

/**
 * Wheel-material compatibility matrix.
 * Source: Norton Abrasives wheel selection guide; Rowe (2009) §3.4
 */
const WHEEL_COMPATIBILITY: Record<string, WheelAbrasive[]> = {
  // Steel family
  steel:           ["WA", "A", "CBN"],
  "4140_steel":    ["WA", "A", "CBN"],
  "4140_hardened": ["CBN", "WA"],
  "52100_bearing": ["CBN", "WA"],
  "d2_tool_steel": ["CBN", "WA"],
  hardened_steel:  ["CBN", "WA"],
  // Cast iron
  cast_iron:       ["A", "C"],
  gray_cast_iron:  ["A", "C"],
  // Carbide
  carbide:         ["GC", "diamond"],
  tungsten_carbide:["GC", "diamond"],
  // Ceramics / glass
  ceramic:         ["diamond", "GC"],
  glass:           ["diamond"],
  // Non-ferrous
  aluminum:        ["C", "GC"],
  copper:          ["C"],
  // Default fallback
  default:         ["WA", "A", "CBN"],
};

/**
 * Typical specific grinding energy u [J/mm³] by material.
 * Used for burn risk pre-check when full program not yet assembled.
 * Source: Malkin (1989) Table 4.2
 */
const BASE_SPECIFIC_ENERGY: Record<string, number> = {
  "4140_steel":    13.8,
  "4140_hardened": 16.2,
  "52100_bearing": 18.5,
  "d2_tool_steel": 22.0,
  hardened_steel:  18.0,
  cast_iron:       11.0,
  titanium:        24.0,
  inconel:         28.0,
  aluminum:        7.5,
  default:         14.0,
};

/**
 * Burn thresholds [°C] by material.
 * Source: GrindingProgramAssemblerEngine GRINDING_MATERIALS DB (Malkin 1989)
 */
const BURN_THRESHOLDS: Record<string, number> = {
  "4140_steel":    600,
  "4140_hardened": 550,
  "52100_bearing": 520,
  "d2_tool_steel": 500,
  hardened_steel:  540,
  cast_iron:       650,
  titanium:        450,
  inconel:         600,
  aluminum:        400,
  default:         580,
};

// ============================================================================
// Routing triggers — physics-based thresholds
// ============================================================================

/** Ra [µm] below which milling cannot reliably achieve — must grind */
const RA_GRINDING_THRESHOLD_UM = 0.4;

/** Dimensional tolerance [mm] below which milling limits are exceeded */
const TOLERANCE_GRINDING_THRESHOLD_MM = 0.010;

/** Hardness [HRC] above which hard turning becomes unreliable — grind instead */
const HARDNESS_GRINDING_THRESHOLD_HRC = 55;

/** Feature types that always route to cylindrical grinding */
const BEARING_FEATURE_TYPES = new Set(["bearing_bore", "cylindrical_id", "cylindrical_od"]);

// ============================================================================
// Engine
// ============================================================================

export class HyperMillGrindingBridge {
  private readonly engine = new GrindingProgramAssemblerEngine();

  /**
   * Route a hyperMILL finishing operation to grinding if physics triggers are met.
   * Returns full grinding program when triggered and burn risk gate passes.
   *
   * @param input - Feature params, material, tolerance, Ra requirement
   * @returns Routing decision with optional grinding program + burn risk gate
   */
  calculate(input: GrindingRouteInput): GrindingRouteResult {
    const warnings: string[] = [];

    // ── 1. Evaluate routing triggers ──────────────────────────────────────────
    const triggers: GrindingTrigger[] = [];

    if (input.requiredRa_um < RA_GRINDING_THRESHOLD_UM) {
      triggers.push("ra_too_tight");
    }
    if (input.tolerance_mm < TOLERANCE_GRINDING_THRESHOLD_MM) {
      triggers.push("tolerance_too_tight");
    }
    if (input.hardness_hrc > HARDNESS_GRINDING_THRESHOLD_HRC) {
      triggers.push("hardness_exceeds_milling");
    }
    if (input.featureType && BEARING_FEATURE_TYPES.has(input.featureType)) {
      triggers.push("bearing_bore_feature");
    }

    const grindingRequired = triggers.length > 0;

    // ── 2. Select grinding type from feature geometry ─────────────────────────
    const grindingType = this._selectGrindingType(input);

    // ── 3. Burn risk gate ─────────────────────────────────────────────────────
    const burnRiskGate = this._runBurnRiskGate(input);

    if (burnRiskGate.blocked) {
      warnings.push(burnRiskGate.message);
    }
    if (!burnRiskGate.wheelCompatible) {
      warnings.push(
        `Wheel abrasive '${input.wheelAbrasive}' incompatible with material '${input.material}' — ` +
        `use ${this._recommendedAbrasive(input.material)}`,
      );
    }
    if (!burnRiskGate.wheelLifeOk) {
      warnings.push(
        `Wheel life remaining ${input.wheelLifeRemaining_pct}% < 20% — dress or replace before grinding`,
      );
    }

    // ── 4. Recommend wheel spec ────────────────────────────────────────────────
    const recommendedWheelSpec = input.wheelSpec ?? this._recommendWheelSpec(input.material, grindingType);

    // ── 5. Assemble grinding program if triggered and gate passes ─────────────
    let grindingProgram: GrindingProgram | undefined;

    if (grindingRequired && !burnRiskGate.blocked) {
      grindingProgram = this._assembleProgram(input, grindingType!, recommendedWheelSpec);
      if (grindingProgram?.warnings?.length) {
        warnings.push(...grindingProgram.warnings);
      }
    }

    // ── 6. Justification ──────────────────────────────────────────────────────
    const justification = grindingRequired
      ? `Grinding required: ${triggers.map(t => TRIGGER_DESCRIPTIONS[t]).join("; ")}`
      : "Milling sufficient — no grinding triggers activated";

    const confidence = grindingRequired ? 0.90 : 0.85;

    return {
      grindingRequired,
      triggers,
      grindingType: grindingRequired ? grindingType : null,
      burnRiskGate,
      grindingProgram,
      recommendedWheelSpec,
      justification,
      warnings,
      confidence,
      source:
        "GrindingProgramAssemblerEngine + Malkin-1989-specific-energy + Jaeger-1942-burn-temp",
    };
  }

  /**
   * Evaluate the grinding burn risk gate independently (for hooks/quick checks).
   *
   * Burn risk formula:
   *   u = F_t / (a_e × b)   [specific energy, J/mm³]
   *   θ_max ≈ θ_amb + C_g × u × (v_w / v_s)^0.5  [Jaeger adapted]
   * where C_g = 1.2 (empirical coefficient, Malkin 1989 Table 8.1)
   *
   * For simplicity, we use the material's base specific energy and estimate
   * temperature from process parameters.
   */
  runBurnRiskGate(params: {
    material: string;
    depthOfCut_mm: number;
    tableSpeed_mmmin?: number;
    wheelSpeed_m_s?: number;
    wheelAbrasive?: WheelAbrasive;
    wheelLifeRemaining_pct?: number;
  }): BurnRiskGateResult {
    return this._runBurnRiskGate({
      material: params.material,
      depthOfCut_mm: params.depthOfCut_mm,
      tableSpeed_mmmin: params.tableSpeed_mmmin ?? 5000,
      wheelAbrasive: params.wheelAbrasive,
      wheelLifeRemaining_pct: params.wheelLifeRemaining_pct,
      requiredRa_um: 0.8,
      tolerance_mm: 0.01,
      hardness_hrc: 40,
      featureName: "",
      partSize_mm: 100,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _runBurnRiskGate(input: GrindingRouteInput): BurnRiskGateResult {
    const matKey = input.material.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const u_base = BASE_SPECIFIC_ENERGY[matKey] ?? BASE_SPECIFIC_ENERGY.default;
    const theta_burn = BURN_THRESHOLDS[matKey] ?? BURN_THRESHOLDS.default;

    // Depth of cut and table speed for energy estimate
    const a_e = input.depthOfCut_mm ?? 0.02; // mm
    const v_w = input.tableSpeed_mmmin ?? 5000; // mm/min
    const v_s_m_s = 30; // typical wheel speed [m/s]

    // Specific energy scales with depth of cut (deeper = more heat)
    // u ≈ u_base × (a_e / 0.02)^0.3 (Malkin 1989, size effect on energy)
    const u_predicted = u_base * Math.pow(a_e / 0.02, 0.3);

    // Jaeger temperature estimate (adapted for grinding):
    // θ_max ≈ θ_amb + 1.2 × u × √(v_w / v_s)
    // v_w in m/s: v_w_m_s = v_w_mm_min / 60000
    const v_w_m_s = v_w / 60000;
    const theta_max = 20 + 1.2 * u_predicted * Math.sqrt(v_w_m_s / v_s_m_s) * 1000;
    // × 1000 for unit correction: u [J/mm³] × speed ratio → [°C]

    const burnRisk = theta_max > theta_burn;

    // Wheel compatibility
    const compatible = WHEEL_COMPATIBILITY[matKey] ?? WHEEL_COMPATIBILITY.default;
    const wheelCompatible = input.wheelAbrasive
      ? compatible.includes(input.wheelAbrasive)
      : true; // unknown wheel → don't block, just warn

    // Wheel life
    const wheelLifeOk = input.wheelLifeRemaining_pct !== undefined
      ? input.wheelLifeRemaining_pct >= 20
      : true;

    const blocked = burnRisk || !wheelCompatible;

    let message: string;
    if (burnRisk) {
      message = `BURN RISK BLOCK — Predicted temp ${Math.round(theta_max)}°C exceeds burn threshold ` +
        `${theta_burn}°C for ${input.material}. Reduce depth of cut (currently ${a_e}mm) ` +
        `or increase table speed, or apply flood coolant.`;
    } else if (!wheelCompatible) {
      message = `WHEEL INCOMPATIBILITY BLOCK — Abrasive '${input.wheelAbrasive}' not compatible ` +
        `with '${input.material}'. Use ${compatible.slice(0, 2).join(" or ")}.`;
    } else {
      message = `Burn risk gate PASS — Predicted ${Math.round(theta_max)}°C vs threshold ${theta_burn}°C`;
    }

    return {
      blocked,
      specificEnergy_J_mm3: Math.round(u_predicted * 100) / 100,
      burnThreshold_C: theta_burn,
      burnRisk,
      wheelCompatible,
      wheelLifeOk,
      message,
    };
  }

  private _selectGrindingType(input: GrindingRouteInput): GrindingType {
    if (!input.featureType) return "surface_grind";
    switch (input.featureType) {
      case "bearing_bore":
      case "cylindrical_id":
      case "cylindrical_od": return "cylindrical_grind";
      case "bar":            return "centerless";
      case "profile":        return "creep_feed";
      default:               return "surface_grind";
    }
  }

  private _recommendedAbrasive(material: string): string {
    const matKey = material.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const compatible = WHEEL_COMPATIBILITY[matKey] ?? WHEEL_COMPATIBILITY.default;
    return compatible[0] ?? "CBN";
  }

  private _recommendWheelSpec(material: string, grindingType: GrindingType | null): string {
    const matKey = material.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    // Mapping: material → recommended wheel spec
    const WHEEL_SPECS: Record<string, string> = {
      "4140_steel":    "WA46K8V",
      "4140_hardened": "CBN-B126",
      "52100_bearing": "CBN-B126",
      "d2_tool_steel": "WA46J8V",
      hardened_steel:  "CBN-B126",
      cast_iron:       "A36M8V",
      titanium:        "CBN-B91",
      inconel:         "CBN-B126",
      aluminum:        "C46K8V",
    };
    if (grindingType === "creep_feed") return WHEEL_SPECS[matKey] ?? "WA46G8V";
    return WHEEL_SPECS[matKey] ?? "WA46K8V";
  }

  private _assembleProgram(
    input: GrindingRouteInput,
    grindingType: GrindingType,
    wheelSpec: string,
  ): GrindingProgram {
    const partLen = input.partSize_mm;
    const partWidth = input.partWidth_mm ?? partLen * 0.5;
    const stock = input.stock_mm ?? 0.5;
    const controller = (input.controller ?? "fanuc_grind") as any;

    if (grindingType === "cylindrical_grind") {
      const profile: CylindricalGrindProfile = {
        operation_subtype: input.featureType === "bearing_bore" || input.featureType === "cylindrical_id"
          ? "id_bore" : "od_traverse",
        material: input.material,
        workpiece_od_mm: partLen,
        workpiece_length_mm: partWidth,
        stock_mm: stock,
        target_Ra_um: input.requiredRa_um,
        wheel_diameter_mm: input.wheelDiameter_mm ?? 300,
        wheel_width_mm: input.wheelWidth_mm ?? 40,
        wheel_spec: wheelSpec,
        controller,
      };
      return this.engine.assembleCylindricalGrind(profile);
    }

    // Default: surface grind
    const profile: SurfaceGrindProfile = {
      operation_subtype: grindingType === "creep_feed" ? "creep_feed" : "horizontal_reciprocating",
      material: input.material,
      part_length_mm: partLen,
      part_width_mm: partWidth,
      stock_mm: stock,
      target_Ra_um: input.requiredRa_um,
      wheel_diameter_mm: input.wheelDiameter_mm ?? 250,
      wheel_width_mm: input.wheelWidth_mm ?? 32,
      wheel_spec: wheelSpec,
      a_e_mm: input.depthOfCut_mm,
      v_w_mm_min: input.tableSpeed_mmmin,
      controller,
    };
    return this.engine.assembleSurfaceGrind(profile);
  }
}

const TRIGGER_DESCRIPTIONS: Record<GrindingTrigger, string> = {
  ra_too_tight:             `Ra < ${RA_GRINDING_THRESHOLD_UM}µm exceeds milling capability`,
  tolerance_too_tight:      `Tolerance < ${TOLERANCE_GRINDING_THRESHOLD_MM}mm exceeds milling capability`,
  hardness_exceeds_milling: `Hardness > ${HARDNESS_GRINDING_THRESHOLD_HRC} HRC requires grinding`,
  bearing_bore_feature:     "Bearing bore / journal requires cylindrical grinding",
};

export const hyperMillGrindingBridge = new HyperMillGrindingBridge();
