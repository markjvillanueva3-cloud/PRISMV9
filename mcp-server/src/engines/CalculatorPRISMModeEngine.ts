/**
 * MCAT-MS0 P3-U04: Calculator PRISM Mode Engine
 *
 * Orchestrates calculator PRISM mode that derives best-fit tooling, holder,
 * coolant, software, and toolpath categories from the active machine package,
 * saved machine profile, and user inventory.
 *
 * PRISM Mode Features:
 * - Tooling recommendations based on machine capabilities
 * - Holder selection based on spindle interface
 * - Coolant strategy optimization for material/operation
 * - CAM software recommendations based on controller
 * - Toolpath category suggestions based on machine kinematics
 *
 * @module engines/CalculatorPRISMModeEngine
 * @milestone MCAT-MS0/P3-U04
 */

import { log } from "../utils/Logger.js";
import {
  machineConsumerBindingEngine,
  type BoundMachineContext,
} from "./MachineConsumerBindingEngine.js";
import { machineCapabilitySurfaceEngine } from "./MachineCapabilitySurfaceEngine.js";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PRISMModeInput {
  /** Active machine ID */
  machine_id: string;
  /** Operation type (turning, milling, drilling, etc.) */
  operation_type: string;
  /** Material ISO group (P, M, K, N, S, H) */
  material_iso_group?: string;
  /** Part geometry complexity */
  geometry_complexity?: "simple" | "moderate" | "complex" | "freeform";
  /** Surface finish requirement (Ra in µm) */
  surface_finish_ra?: number;
  /** Tolerance class (IT5-IT14) */
  tolerance_class?: string;
  /** User's tool inventory IDs */
  user_inventory_ids?: string[];
  /** Preferred CAM software */
  preferred_cam?: string;
}

export interface ToolingRecommendation {
  category: string;
  tool_type: string;
  coating: string;
  grade: string;
  geometry: string;
  reason: string;
  confidence: number;
  from_inventory: boolean;
  inventory_match_id?: string;
}

export interface HolderRecommendation {
  holder_type: string;
  interface: string;
  size: string;
  balance_grade: string;
  reason: string;
  confidence: number;
}

export interface CoolantRecommendation {
  strategy: string;
  type: string;
  pressure_bar?: number;
  concentration_pct?: number;
  reason: string;
  confidence: number;
}

export interface SoftwareRecommendation {
  cam_system: string;
  post_processor: string;
  simulation_support: boolean;
  controller_compatibility: number;
  reason: string;
  alternatives: string[];
}

export interface ToolpathRecommendation {
  category: string;
  strategy: string;
  suitable_for: string[];
  machine_capability_match: number;
  reason: string;
}

export interface PRISMModeResult {
  machine_id: string;
  machine_display_name: string;
  operation_type: string;
  tooling: ToolingRecommendation[];
  holders: HolderRecommendation[];
  coolant: CoolantRecommendation;
  software: SoftwareRecommendation;
  toolpaths: ToolpathRecommendation[];
  overall_confidence: number;
  optimization_notes: string[];
  warnings: string[];
}

export interface InventoryMatch {
  inventory_id: string;
  tool_type: string;
  match_score: number;
  compatible: boolean;
}

export interface PRISMModeStats {
  total_recommendations: number;
  inventory_matches: number;
  average_confidence: number;
  last_calculation: string;
}

// ============================================================================
// TOOLING DATABASE (simplified for demonstration)
// ============================================================================

const TOOLING_BY_MATERIAL: Record<string, { coating: string; grade: string }> = {
  P: { coating: "TiAlN", grade: "P20-P30" },
  M: { coating: "AlTiN", grade: "M20-M30" },
  K: { coating: "TiCN", grade: "K10-K20" },
  N: { coating: "DLC", grade: "N10-N20" },
  S: { coating: "TiAlN-nano", grade: "S10-S20" },
  H: { coating: "CBN", grade: "H10-H20" },
};

const HOLDER_BY_SPINDLE: Record<string, { type: string; interface: string }> = {
  BT40: { type: "Hydraulic Chuck", interface: "BT40" },
  BT50: { type: "Hydraulic Chuck", interface: "BT50" },
  HSK63A: { type: "Shrink Fit", interface: "HSK-A63" },
  HSK100A: { type: "Shrink Fit", interface: "HSK-A100" },
  CAT40: { type: "Hydraulic Chuck", interface: "CAT40" },
  CAT50: { type: "Hydraulic Chuck", interface: "CAT50" },
};

const CAM_BY_CONTROLLER: Record<string, { primary: string; alternatives: string[] }> = {
  fanuc: { primary: "Mastercam", alternatives: ["Fusion 360", "GibbsCAM", "hyperMILL"] },
  siemens: { primary: "NX CAM", alternatives: ["hyperMILL", "Mastercam"] },
  haas: { primary: "Mastercam", alternatives: ["Fusion 360", "BobCAD"] },
  mazak: { primary: "Mastercam", alternatives: ["Esprit", "hyperMILL"] },
  okuma: { primary: "Mastercam", alternatives: ["Esprit", "GibbsCAM"] },
  dmg_mori: { primary: "hyperMILL", alternatives: ["NX CAM", "Mastercam"] },
};

// ============================================================================
// ENGINE
// ============================================================================

class CalculatorPRISMModeEngine {
  private statsCache: PRISMModeStats = {
    total_recommendations: 0,
    inventory_matches: 0,
    average_confidence: 0,
    last_calculation: "never",
  };

  /**
   * Generate PRISM mode recommendations for calculator.
   */
  calculate(input: PRISMModeInput): PRISMModeResult | null {
    const binding = machineConsumerBindingEngine.bind(input.machine_id);
    if (!binding.success || !binding.context) {
      log.warn(`[CalculatorPRISMMode] No binding for ${input.machine_id}`);
      return null;
    }

    const ctx = binding.context;
    const warnings: string[] = [];
    const optimizationNotes: string[] = [];

    // Generate recommendations
    const tooling = this.recommendTooling(input, ctx, warnings);
    const holders = this.recommendHolders(input, ctx, warnings);
    const coolant = this.recommendCoolant(input, ctx, warnings);
    const software = this.recommendSoftware(input, ctx);
    const toolpaths = this.recommendToolpaths(input, ctx);

    // Calculate overall confidence
    const confidences = [
      ...tooling.map(t => t.confidence),
      ...holders.map(h => h.confidence),
      coolant.confidence,
      software.controller_compatibility,
      ...toolpaths.map(t => t.machine_capability_match),
    ];
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.5;

    // Add optimization notes based on analysis
    if (ctx.spindle.max_rpm > 15000) {
      optimizationNotes.push("High-speed spindle enables HSM strategies");
    }
    if (ctx.kinematics.axis_count >= 5) {
      optimizationNotes.push("5-axis capability enables swarf and multi-axis contouring");
    }
    if (ctx.coolant.enabled_strategies.includes("through_spindle")) {
      optimizationNotes.push("Through-spindle coolant improves deep hole drilling");
    }

    // Update stats
    this.statsCache = {
      total_recommendations: tooling.length + holders.length + toolpaths.length + 2,
      inventory_matches: tooling.filter(t => t.from_inventory).length,
      average_confidence: avgConfidence,
      last_calculation: new Date().toISOString(),
    };

    return {
      machine_id: ctx.shop_machine_id,
      machine_display_name: ctx.display_name,
      operation_type: input.operation_type,
      tooling,
      holders,
      coolant,
      software,
      toolpaths,
      overall_confidence: avgConfidence,
      optimization_notes: optimizationNotes,
      warnings,
    };
  }

  /**
   * Recommend tooling based on operation and material.
   */
  private recommendTooling(
    input: PRISMModeInput,
    ctx: BoundMachineContext,
    warnings: string[]
  ): ToolingRecommendation[] {
    const recommendations: ToolingRecommendation[] = [];
    const isoGroup = input.material_iso_group || "P";
    const materialProps = TOOLING_BY_MATERIAL[isoGroup] || TOOLING_BY_MATERIAL.P;

    // Main tool recommendation
    const mainTool = this.getMainToolForOperation(input.operation_type);
    const inventoryMatch = this.checkInventory(mainTool.type, input.user_inventory_ids);

    recommendations.push({
      category: "primary",
      tool_type: mainTool.type,
      coating: materialProps.coating,
      grade: materialProps.grade,
      geometry: mainTool.geometry,
      reason: `Best for ${input.operation_type} in ISO ${isoGroup} material`,
      confidence: 0.85,
      from_inventory: inventoryMatch.compatible,
      inventory_match_id: inventoryMatch.inventory_id,
    });

    // Finishing tool if high surface finish required
    if (input.surface_finish_ra && input.surface_finish_ra < 1.6) {
      recommendations.push({
        category: "finishing",
        tool_type: this.getFinishingTool(input.operation_type),
        coating: "PVD-TiAlN",
        grade: `${isoGroup}10`,
        geometry: "wiper",
        reason: `Wiper geometry for Ra < ${input.surface_finish_ra} µm finish`,
        confidence: 0.9,
        from_inventory: false,
      });
    }

    // Roughing tool for complex geometry
    if (input.geometry_complexity === "complex" || input.geometry_complexity === "freeform") {
      recommendations.push({
        category: "roughing",
        tool_type: this.getRoughingTool(input.operation_type),
        coating: materialProps.coating,
        grade: `${isoGroup}30-${isoGroup}40`,
        geometry: "high-feed",
        reason: "High-feed geometry for aggressive material removal",
        confidence: 0.8,
        from_inventory: false,
      });
    }

    // Check spindle speed compatibility
    const maxToolRPM = this.estimateMaxToolRPM(mainTool.type);
    if (ctx.spindle.max_rpm < maxToolRPM * 0.7) {
      warnings.push(`Spindle max ${ctx.spindle.max_rpm} RPM may limit ${mainTool.type} performance`);
    }

    return recommendations;
  }

  /**
   * Recommend holders based on spindle interface.
   */
  private recommendHolders(
    input: PRISMModeInput,
    ctx: BoundMachineContext,
    warnings: string[]
  ): HolderRecommendation[] {
    const recommendations: HolderRecommendation[] = [];

    // Determine spindle interface from capabilities
    const spindleInterface = this.inferSpindleInterface(ctx);
    const holderProps = HOLDER_BY_SPINDLE[spindleInterface] || {
      type: "Hydraulic Chuck",
      interface: "BT40",
    };

    // Balance grade based on RPM
    let balanceGrade = "G6.3";
    if (ctx.spindle.max_rpm > 15000) {
      balanceGrade = "G2.5";
    } else if (ctx.spindle.max_rpm > 10000) {
      balanceGrade = "G4";
    }

    // Primary holder
    recommendations.push({
      holder_type: holderProps.type,
      interface: holderProps.interface,
      size: this.getHolderSize(input.operation_type),
      balance_grade: balanceGrade,
      reason: `${holderProps.type} provides <3 µm TIR for precision`,
      confidence: 0.88,
    });

    // High-speed holder for finishing
    if (ctx.spindle.max_rpm > 12000 && input.surface_finish_ra && input.surface_finish_ra < 1.6) {
      recommendations.push({
        holder_type: "Shrink Fit",
        interface: holderProps.interface,
        size: this.getHolderSize(input.operation_type),
        balance_grade: "G2.5",
        reason: "Shrink fit for HSM finishing operations",
        confidence: 0.92,
      });
    }

    return recommendations;
  }

  /**
   * Recommend coolant strategy.
   */
  private recommendCoolant(
    input: PRISMModeInput,
    ctx: BoundMachineContext,
    warnings: string[]
  ): CoolantRecommendation {
    const enabledStrategies = ctx.coolant.enabled_strategies;
    const isoGroup = input.material_iso_group || "P";

    // Determine best strategy
    let strategy = "flood";
    let type = "emulsion";
    let pressure: number | undefined;
    let concentration = 8;
    let reason = "Standard flood coolant for general machining";

    // Through-spindle for drilling
    if (input.operation_type.includes("drill") && enabledStrategies.includes("through_spindle")) {
      strategy = "through_spindle";
      pressure = 70;
      reason = "Through-spindle coolant improves chip evacuation in drilling";
    }

    // MQL for aluminum
    if (isoGroup === "N" && enabledStrategies.includes("mql")) {
      strategy = "mql";
      type = "oil";
      concentration = 100;
      reason = "MQL prevents aluminum buildup edge";
    }

    // High-pressure for titanium/superalloys
    if ((isoGroup === "S" || isoGroup === "M") && enabledStrategies.includes("high_pressure")) {
      strategy = "high_pressure";
      pressure = 100;
      concentration = 10;
      reason = "High-pressure coolant required for heat extraction in difficult materials";
    }

    // Cryogenic check
    if (isoGroup === "S" && !enabledStrategies.includes("cryogenic")) {
      warnings.push("Cryogenic coolant recommended but not available for superalloys");
    }

    return {
      strategy,
      type,
      pressure_bar: pressure,
      concentration_pct: strategy === "mql" ? undefined : concentration,
      reason,
      confidence: enabledStrategies.includes(strategy) ? 0.9 : 0.7,
    };
  }

  /**
   * Recommend CAM software based on controller.
   */
  private recommendSoftware(
    input: PRISMModeInput,
    ctx: BoundMachineContext
  ): SoftwareRecommendation {
    const controllerFamily = ctx.controller.family.toLowerCase();
    const camConfig = CAM_BY_CONTROLLER[controllerFamily] || CAM_BY_CONTROLLER.fanuc;

    // Use preferred if specified and compatible
    let primary = camConfig.primary;
    if (input.preferred_cam && camConfig.alternatives.includes(input.preferred_cam)) {
      primary = input.preferred_cam;
    }

    // Determine simulation support
    const hasSimulation = ["NX CAM", "hyperMILL", "VERICUT"].includes(primary);

    return {
      cam_system: primary,
      post_processor: `${primary} - ${ctx.controller.family}`,
      simulation_support: hasSimulation,
      controller_compatibility: 0.95,
      reason: `${primary} has verified post-processor for ${ctx.controller.family}`,
      alternatives: camConfig.alternatives.filter(a => a !== primary),
    };
  }

  /**
   * Recommend toolpath strategies based on machine kinematics.
   */
  private recommendToolpaths(
    input: PRISMModeInput,
    ctx: BoundMachineContext
  ): ToolpathRecommendation[] {
    const recommendations: ToolpathRecommendation[] = [];
    const axisCount = ctx.kinematics.axis_count;
    const hasRotary = ctx.kinematics.has_rotary;

    // Base strategy by operation
    if (input.operation_type.includes("mill") || input.operation_type.includes("pocket")) {
      recommendations.push({
        category: "roughing",
        strategy: ctx.spindle.max_rpm > 12000 ? "Adaptive Clearing" : "Pocket",
        suitable_for: ["pockets", "3D roughing", "material removal"],
        machine_capability_match: 0.9,
        reason: ctx.spindle.max_rpm > 12000
          ? "High-speed spindle enables adaptive toolpath"
          : "Standard pocket strategy for material removal",
      });
    }

    if (input.operation_type.includes("turn")) {
      recommendations.push({
        category: "roughing",
        strategy: "Stock Turn",
        suitable_for: ["OD turning", "facing", "roughing"],
        machine_capability_match: 0.92,
        reason: "Stock-aware turning for efficient material removal",
      });
    }

    // 3+2 positioning if 4+ axis
    if (axisCount >= 4 && hasRotary) {
      recommendations.push({
        category: "positioning",
        strategy: "3+2 Positioning",
        suitable_for: ["angular features", "multiple faces", "undercuts"],
        machine_capability_match: 0.88,
        reason: "Rotary axis enables 3+2 positioning for angular access",
      });
    }

    // 5-axis simultaneous if available
    if (axisCount >= 5) {
      recommendations.push({
        category: "contouring",
        strategy: "5-Axis Simultaneous",
        suitable_for: ["impellers", "blisks", "complex surfaces", "turbine blades"],
        machine_capability_match: 0.95,
        reason: "Full 5-axis capability enables continuous surface machining",
      });

      if (input.geometry_complexity === "freeform") {
        recommendations.push({
          category: "finishing",
          strategy: "Swarf Cutting",
          suitable_for: ["ruled surfaces", "turbine blades", "airfoils"],
          machine_capability_match: 0.9,
          reason: "Swarf cutting optimal for ruled surface finishing",
        });
      }
    }

    // High-speed finishing
    if (ctx.spindle.max_rpm > 15000 && input.surface_finish_ra && input.surface_finish_ra < 1.6) {
      recommendations.push({
        category: "finishing",
        strategy: "HSM Pencil Finishing",
        suitable_for: ["corners", "fillets", "fine detail"],
        machine_capability_match: 0.93,
        reason: "High-speed pencil tracing for corner detail finishing",
      });
    }

    return recommendations;
  }

  /**
   * Check user inventory for matching tools.
   */
  checkInventory(toolType: string, inventoryIds?: string[]): InventoryMatch {
    if (!inventoryIds || inventoryIds.length === 0) {
      return { inventory_id: "", tool_type: toolType, match_score: 0, compatible: false };
    }

    // Simplified matching - would connect to actual inventory system
    const matchId = inventoryIds.find(id =>
      id.toLowerCase().includes(toolType.toLowerCase().split(" ")[0])
    );

    return {
      inventory_id: matchId || "",
      tool_type: toolType,
      match_score: matchId ? 0.85 : 0,
      compatible: !!matchId,
    };
  }

  /**
   * Get PRISM mode for multiple machines and compare.
   */
  compareForMachines(
    input: Omit<PRISMModeInput, "machine_id">,
    machine_ids: string[]
  ): {
    machine_id: string;
    result: PRISMModeResult | null;
    score: number;
  }[] {
    return machine_ids.map(machine_id => {
      const result = this.calculate({ ...input, machine_id });
      return {
        machine_id,
        result,
        score: result?.overall_confidence || 0,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Get quick summary for calculator display.
   */
  getQuickSummary(machine_id: string, operation_type: string): {
    tooling_hint: string;
    holder_hint: string;
    coolant_hint: string;
    software_hint: string;
  } | null {
    const result = this.calculate({ machine_id, operation_type });
    if (!result) return null;

    return {
      tooling_hint: result.tooling[0]
        ? `${result.tooling[0].tool_type} (${result.tooling[0].coating})`
        : "Standard tooling",
      holder_hint: result.holders[0]
        ? `${result.holders[0].holder_type} ${result.holders[0].interface}`
        : "Standard holder",
      coolant_hint: `${result.coolant.strategy}${result.coolant.pressure_bar ? ` @ ${result.coolant.pressure_bar} bar` : ""}`,
      software_hint: result.software.cam_system,
    };
  }

  /**
   * Get statistics.
   */
  getStats(): PRISMModeStats {
    return { ...this.statsCache };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getMainToolForOperation(operation: string): { type: string; geometry: string } {
    const op = operation.toLowerCase();
    if (op.includes("turn") || op.includes("face")) {
      return { type: "Turning Insert CNMG", geometry: "C-style" };
    }
    if (op.includes("drill")) {
      return { type: "Solid Carbide Drill", geometry: "140° point" };
    }
    if (op.includes("bore")) {
      return { type: "Boring Bar", geometry: "55° lead" };
    }
    if (op.includes("thread")) {
      return { type: "Thread Mill", geometry: "60° V-profile" };
    }
    if (op.includes("slot") || op.includes("pocket")) {
      return { type: "End Mill", geometry: "4-flute" };
    }
    if (op.includes("finish")) {
      return { type: "Ball Nose End Mill", geometry: "2-flute" };
    }
    return { type: "End Mill", geometry: "4-flute" };
  }

  private getFinishingTool(operation: string): string {
    if (operation.includes("turn")) return "Wiper Insert WNMG";
    if (operation.includes("face")) return "Face Mill Wiper";
    return "Ball Nose End Mill";
  }

  private getRoughingTool(operation: string): string {
    if (operation.includes("turn")) return "Square Insert SNMG";
    return "High-Feed End Mill";
  }

  private estimateMaxToolRPM(toolType: string): number {
    if (toolType.includes("Ball Nose")) return 20000;
    if (toolType.includes("End Mill")) return 15000;
    if (toolType.includes("Drill")) return 8000;
    if (toolType.includes("Insert")) return 4000;
    return 10000;
  }

  private inferSpindleInterface(ctx: BoundMachineContext): string {
    // Infer from machine type and power
    if (ctx.spindle.max_power_kw > 30) return "HSK100A";
    if (ctx.spindle.max_power_kw > 20) return "BT50";
    if (ctx.spindle.max_rpm > 15000) return "HSK63A";
    return "BT40";
  }

  private getHolderSize(operation: string): string {
    if (operation.includes("rough")) return "ER32";
    if (operation.includes("drill")) return "ER20";
    if (operation.includes("finish")) return "ER16";
    return "ER25";
  }

  /**
   * Self-awareness metadata.
   */
  getSelfAwareness() {
    return {
      engine: "CalculatorPRISMModeEngine",
      milestone: "MCAT-MS0/P3-U04",
      purpose: "Orchestrates calculator PRISM mode deriving best-fit configurations from machine package",
      capabilities: [
        "calculate",
        "recommendTooling",
        "recommendHolders",
        "recommendCoolant",
        "recommendSoftware",
        "recommendToolpaths",
        "checkInventory",
        "compareForMachines",
        "getQuickSummary",
      ],
      outputs: [
        "tooling_recommendations",
        "holder_recommendations",
        "coolant_strategy",
        "software_recommendations",
        "toolpath_strategies",
      ],
      integrations: [
        "MachineConsumerBindingEngine",
        "MachineCapabilitySurfaceEngine",
        "ShopConfigurationEngine",
      ],
    };
  }
}

export const calculatorPRISMModeEngine = new CalculatorPRISMModeEngine();
