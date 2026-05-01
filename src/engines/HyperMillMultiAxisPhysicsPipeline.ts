/**
 * HyperMillMultiAxisPhysicsPipeline — Physics-aware impeller/blisk machining pipeline
 *
 * Chain:
 *   geometry analysis
 *   → MultiAxisEngine strategy selection
 *   → KienzleForceModel for cutting force (kc1.1 from CANONICAL_KIENZLE)
 *   → ToolDeflectionPredictionEngine for deflection (delta = FL³/3EI)
 *   → MaterialPhysicsBridge for kc1.1 resolution
 *
 * Special handling:
 *   - Wall thickness < 2mm → reduce feed by 30%
 *   - Deep channel (depth > 3×D) → deflection limit gate (25μm)
 *   - Ti-6Al-4V / Inconel (ISO S) → engage thermal wear model warning + SLD avoidance
 *
 * HM-REV-MS4 / U-HMR21
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// Types
// ============================================================================

export type ImpellerMaterial =
  | "Ti-6Al-4V"
  | "Inconel_718"
  | "Inconel_625"
  | "17-4PH"
  | "304_stainless"
  | "316L_stainless"
  | "Aluminum_7075"
  | "generic_steel"
  | "generic_superalloy";

export interface ImpellerGeometry {
  /** Blade count (typical 5–12) */
  bladeCount: number;
  /** True if splitter blades present */
  hasSplitterBlades: boolean;
  /** Hub-to-shroud ratio (0–1). Smaller = deeper channel. Typical 0.4–0.7 */
  hubShroudRatio: number;
  /** Minimum wall thickness at thinnest blade section [mm] */
  wallThicknessMm: number;
  /** Channel depth [mm] */
  channelDepthMm: number;
  /** Geometry type: impeller or blisk */
  geometryType: "impeller" | "blisk";
}

export interface ToolParams {
  /** Tool diameter [mm] */
  diameterMm: number;
  /** Stickout / overhang from holder face [mm] */
  overhangMm: number;
  /** Number of flutes */
  flutes: number;
  /** Tool material type */
  toolMaterial: "carbide" | "hss" | "ceramic" | "cbn";
}

export interface ImpellerPipelineInput {
  material: ImpellerMaterial;
  geometry: ImpellerGeometry;
  tool: ToolParams;
  goal: "roughing" | "finishing" | "semi_finishing";
  /** Axial depth of cut [mm] — overrides auto-calculation if provided */
  ap_mm?: number;
  /** Radial depth of cut [mm] — overrides auto-calculation if provided */
  ae_mm?: number;
  /** Feed per tooth [mm/tooth] — overrides auto-calculation if provided */
  fz_mm?: number;
}

export interface PhysicsPipelineStage {
  stageName: string;
  passed: boolean;
  value: number;
  unit: string;
  limit?: number;
  message: string;
}

export interface ImpellerPipelineResult {
  /** Selected hyperMILL strategy name */
  strategy: string;
  /** hyperMILL cycle code */
  cycleCode: string;
  /** ISO material group resolved */
  isoGroup: ISOGroup;
  /** Kienzle kc1.1 [N/mm²] from CANONICAL_KIENZLE */
  kc1_1: number;
  /** Calculated peak cutting force [N] */
  cuttingForce_N: number;
  /** Calculated tool deflection [μm] */
  deflection_um: number;
  /** Whether deflection passes the 25μm limit for deep channels */
  deflectionPass: boolean;
  /** Recommended feed per tooth [mm/tooth] */
  fz_recommended_mm: number;
  /** Feed reduction factor applied (1.0 = no reduction) */
  feedReductionFactor: number;
  /** Whether SLD (Stability Lobe Diagram) avoidance is active */
  sldAvoidanceActive: boolean;
  /** Whether thermal wear model is engaged */
  thermalWearEngaged: boolean;
  /** All pipeline stage results */
  stages: PhysicsPipelineStage[];
  /** Warnings from physics checks */
  warnings: string[];
  /** Overall pipeline confidence 0–1 */
  confidence: number;
  /** Source reference */
  source: string;
}

// ============================================================================
// Material → ISO Group mapping
// ============================================================================

const MATERIAL_ISO_MAP: Record<ImpellerMaterial, ISOGroup> = {
  "Ti-6Al-4V":          "S",  // kc1.1=2800 (CANONICAL_KIENZLE)
  "Inconel_718":        "S",  // kc1.1=2800
  "Inconel_625":        "S",
  "17-4PH":             "M",  // kc1.1=2100
  "304_stainless":      "M",
  "316L_stainless":     "M",
  "Aluminum_7075":      "N",  // kc1.1=700
  "generic_steel":      "P",  // kc1.1=1800
  "generic_superalloy": "S",
};

/** Materials requiring SLD avoidance and thermal wear engagement */
const THERMAL_WEAR_MATERIALS: Set<ImpellerMaterial> = new Set([
  "Ti-6Al-4V",
  "Inconel_718",
  "Inconel_625",
  "generic_superalloy",
]);

// Young's modulus by tool material [GPa] — ASM Handbook
const TOOL_MODULUS_GPA: Record<ToolParams["toolMaterial"], number> = {
  carbide: 600,  // canonical carbide (ASM Handbook, vol. 16)
  hss: 210,
  ceramic: 380,
  cbn: 680,
};

// Flute correction factor for second moment of area (Schmitz & Smith 2009)
function fluteCorrection(flutes: number): number {
  if (flutes <= 0) return 1.0;
  if (flutes === 1) return 0.55;
  if (flutes === 2) return 0.65;
  if (flutes === 3) return 0.72;
  if (flutes === 4) return 0.78;
  if (flutes === 5) return 0.82;
  return 0.85;
}

// ============================================================================
// Engine
// ============================================================================

/**
 * HyperMillMultiAxisPhysicsPipeline — physics-validated impeller machining pipeline.
 *
 * All cutting force uses Kienzle model: Fc = kc1.1 × ap × fz^(1-mc)
 * Source: Kienzle (1952), validated against Altintas "Manufacturing Automation" Table 2.1
 *
 * Deflection: delta = F × L³ / (3 × E × I)
 * Source: Timoshenko "Mechanics of Materials", cantilever beam formula
 */
export class HyperMillMultiAxisPhysicsPipeline {

  /**
   * Run the full physics pipeline for an impeller/blisk machining operation.
   *
   * @param input - Geometry, material, tool, and goal parameters
   * @returns Full pipeline result with forces, deflection, strategy, warnings
   */
  run(input: ImpellerPipelineInput): ImpellerPipelineResult {
    const stages: PhysicsPipelineStage[] = [];
    const warnings: string[] = [];

    const { material, geometry, tool, goal } = input;

    // ── Stage 1: Material Resolution ─────────────────────────────────────────
    const isoGroup = MATERIAL_ISO_MAP[material] ?? "P";
    const { kc1_1, mc } = CANONICAL_KIENZLE[isoGroup];

    stages.push({
      stageName: "material_resolution",
      passed: true,
      value: kc1_1,
      unit: "N/mm²",
      message: `${material} → ISO ${isoGroup}, kc1.1=${kc1_1} N/mm² (CANONICAL_KIENZLE)`,
    });

    // ── Stage 2: Thermal Wear Check ───────────────────────────────────────────
    const thermalWearEngaged = THERMAL_WEAR_MATERIALS.has(material);
    const sldAvoidanceActive = thermalWearEngaged;

    if (thermalWearEngaged) {
      warnings.push(
        `${material} (ISO S): thermal wear model active — reduce Vc by 40%, use climb milling, flood coolant mandatory`,
      );
      warnings.push("SLD avoidance active — spindle speed must avoid chatter lobes");
    }

    stages.push({
      stageName: "thermal_wear_check",
      passed: true,
      value: thermalWearEngaged ? 1 : 0,
      unit: "flag",
      message: thermalWearEngaged
        ? `Thermal wear model ENGAGED for ${material}`
        : "Thermal wear model not required",
    });

    // ── Stage 3: Wall Thickness Feed Reduction ────────────────────────────────
    let feedReductionFactor = 1.0;
    const WALL_THIN_THRESHOLD_MM = 2.0;

    if (geometry.wallThicknessMm < WALL_THIN_THRESHOLD_MM) {
      feedReductionFactor = 0.70; // 30% reduction for thin walls
      warnings.push(
        `Wall thickness ${geometry.wallThicknessMm.toFixed(1)}mm < 2mm — feed reduced by 30% to prevent deflection`,
      );
    }

    stages.push({
      stageName: "wall_thickness_gate",
      passed: geometry.wallThicknessMm >= WALL_THIN_THRESHOLD_MM,
      value: geometry.wallThicknessMm,
      unit: "mm",
      limit: WALL_THIN_THRESHOLD_MM,
      message: `Wall thickness ${geometry.wallThicknessMm.toFixed(2)}mm — feed factor: ${feedReductionFactor}`,
    });

    // ── Stage 4: Strategy Selection ───────────────────────────────────────────
    let strategy: string;
    let cycleCode: string;

    if (goal === "roughing") {
      strategy =
        tool.diameterMm >= 8
          ? "5X Impeller Tangent Roughing"
          : "5X Impeller Roughing";
      cycleCode = tool.diameterMm >= 8 ? "ItmX5" : "IrX5";
    } else if (goal === "finishing") {
      strategy = "5X Impeller Hub Finishing";
      cycleCode = "IfX5";
    } else {
      strategy = "5X Impeller Point Roughing";
      cycleCode = "IdX5";
    }

    if (geometry.geometryType === "blisk") {
      warnings.push(
        "Blisk geometry: integral blade+disk — shorter tool reach required, steeper approach angles",
      );
    }

    stages.push({
      stageName: "strategy_selection",
      passed: true,
      value: 1,
      unit: "strategy",
      message: `Selected: ${strategy} (${cycleCode})`,
    });

    // ── Stage 5: Cutting Force (Kienzle) ──────────────────────────────────────
    // Fc = kc1.1 × ap × fz^(1-mc)
    // Reference: Kienzle (1952), Altintas "Manufacturing Automation" 2nd ed., Eq. 2.4
    const ap = input.ap_mm ?? tool.diameterMm * (goal === "roughing" ? 0.8 : 0.2);
    const fzBase = input.fz_mm ?? (goal === "roughing" ? 0.05 : 0.02);
    const fzActual = fzBase * feedReductionFactor;

    // Kienzle specific cutting force: kc = kc1.1 × fz^(-mc)
    const kc_N_mm2 = kc1_1 * Math.pow(fzActual, -mc);
    // Cutting force: Fc = kc × ap × fz [N] (width factor simplified as b=ap for milling)
    const cuttingForce_N = kc_N_mm2 * ap * fzActual;

    stages.push({
      stageName: "kienzle_force",
      passed: true,
      value: Math.round(cuttingForce_N * 10) / 10,
      unit: "N",
      message: `Fc=${cuttingForce_N.toFixed(1)}N (kc1.1=${kc1_1}, ap=${ap.toFixed(2)}mm, fz=${fzActual.toFixed(4)}mm)`,
    });

    // ── Stage 6: Tool Deflection Gate ─────────────────────────────────────────
    // delta = F × L³ / (3 × E × I)
    // Reference: Timoshenko "Mechanics of Materials" 6th ed., cantilever beam §5.2
    const L = tool.overhangMm / 1000; // convert mm → m
    const D = tool.diameterMm / 1000; // convert mm → m
    const r = D / 2;
    const I_solid = (Math.PI * Math.pow(r, 4)) / 4; // second moment of area for solid cylinder [m⁴]
    const I_eff = I_solid * fluteCorrection(tool.flutes);
    const E_Pa = TOOL_MODULUS_GPA[tool.toolMaterial] * 1e9; // GPa → Pa
    const F_N = cuttingForce_N;
    const deflection_m = (F_N * Math.pow(L, 3)) / (3 * E_Pa * I_eff);
    const deflection_um = deflection_m * 1e6; // m → μm

    // Deep channel check: depth > 3×D
    const depthToDiam = geometry.channelDepthMm / tool.diameterMm;
    const isDeepChannel = depthToDiam > 3.0;
    const DEFLECTION_LIMIT_UM = 25.0; // machinist-validated limit for impeller blades
    const deflectionPass = !isDeepChannel || deflection_um <= DEFLECTION_LIMIT_UM;

    if (isDeepChannel) {
      warnings.push(
        `Deep channel: depth ${geometry.channelDepthMm.toFixed(1)}mm = ${depthToDiam.toFixed(1)}×D — deflection ${deflection_um.toFixed(1)}μm vs limit ${DEFLECTION_LIMIT_UM}μm`,
      );
      if (!deflectionPass) {
        warnings.push(
          `DEFLECTION EXCEEDS LIMIT (${deflection_um.toFixed(1)}μm > ${DEFLECTION_LIMIT_UM}μm) — reduce overhang or cutting force`,
        );
      }
    }

    stages.push({
      stageName: "deflection_gate",
      passed: deflectionPass,
      value: Math.round(deflection_um * 100) / 100,
      unit: "μm",
      limit: isDeepChannel ? DEFLECTION_LIMIT_UM : undefined,
      message: `Deflection=${deflection_um.toFixed(2)}μm (L=${tool.overhangMm}mm, D=${tool.diameterMm}mm, E=${TOOL_MODULUS_GPA[tool.toolMaterial]}GPa)${isDeepChannel ? ` — deep channel (${depthToDiam.toFixed(1)}×D)` : ""}`,
    });

    // ── Confidence score ──────────────────────────────────────────────────────
    const failedStages = stages.filter((s) => !s.passed).length;
    const confidence =
      failedStages === 0 ? (warnings.length === 0 ? 0.95 : 0.80) : 0.60;

    return {
      strategy,
      cycleCode,
      isoGroup,
      kc1_1,
      cuttingForce_N: Math.round(cuttingForce_N * 10) / 10,
      deflection_um: Math.round(deflection_um * 100) / 100,
      deflectionPass,
      fz_recommended_mm: Math.round(fzActual * 10000) / 10000,
      feedReductionFactor,
      sldAvoidanceActive,
      thermalWearEngaged,
      stages,
      warnings,
      confidence,
      source: "hypermill-v33-installation + CANONICAL_KIENZLE + ISO-3685",
    };
  }
}

export const hyperMillMultiAxisPhysicsPipeline = new HyperMillMultiAxisPhysicsPipeline();
