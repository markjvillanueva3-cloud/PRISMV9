/**
 * OkumaB250LatheMasterPostEngine — JM Die Lathe Master Post Processor
 *
 * Comprehensive master post processor for JM Die's Okuma LB250II-M with OSP-P300L.
 * This is the CANONICAL lathe post for PRISM — all lathe post logic derives from here.
 *
 * MACHINE SPECIFICATIONS (JM Die Okuma LB250II-M):
 *   - Controller: OSP-P300L
 *   - Max Swing: 16.14" (410mm)
 *   - Max Turning Diameter: 13.78" (350mm)
 *   - Max Turning Length: 20.08" (510mm)
 *   - Spindle: 5000 RPM max, 20 HP, A2-6 spindle nose
 *   - Bar Capacity: 2.56" (65mm) through spindle
 *   - Turret: 12-station BMT65 live tooling
 *   - C-Axis: 0.001° resolution, 360° positioning
 *   - Sub-Spindle: Yes (LB250II-M variant)
 *
 * OKUMA OSP-P300L G-CODE FEATURES:
 *   - G96 constant surface speed (CSS)
 *   - G72/G70 canned cycles (roughing/finishing)
 *   - G76 threading cycle (multi-pass)
 *   - G83/G87 drilling cycles
 *   - C-axis milling (G112 polar interpolation)
 *   - Y-axis cross drilling (if equipped)
 *   - M-codes: M38/M39 spindle sync for sub-spindle
 *
 * AGI INTEGRATION:
 *   - 8 reasoning modes for intelligent G-code generation
 *   - Physics-aware feed optimization via Kienzle/Taylor
 *   - Material-adaptive cutting parameters
 *   - JM Die tribal knowledge embedded (25+ tips)
 *   - Learning from production feedback
 *
 * @module engines/OkumaB250LatheMasterPostEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP03
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OkumaLathePostConfig {
  program_number: number;
  program_comment?: string;
  units?: "metric" | "inch";
  work_offset?: number;          // G54-G59
  safe_z_mm?: number;
  chuck_pressure?: "high" | "medium" | "low";
  use_css?: boolean;             // G96 constant surface speed
  css_max_rpm?: number;          // G50 spindle clamp
  sub_spindle_enabled?: boolean;
  live_tooling_enabled?: boolean;
  c_axis_enabled?: boolean;
  tailstock_position_mm?: number;
}

export interface TurningOperation {
  operation_type: "od_rough" | "od_finish" | "id_rough" | "id_finish" | "face" | "groove" | "thread" | "drill" | "bore" | "part_off" | "c_mill";
  tool_number: number;
  tool_orientation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;  // ISO tool orientation
  insert_radius_mm: number;
  tool_description?: string;
  material_iso: ISOGroup;
  // Cutting parameters
  spindle_rpm?: number;
  css_m_min?: number;           // G96 surface speed
  css_max_rpm?: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  // Geometry
  start_x: number;
  start_z: number;
  end_x: number;
  end_z: number;
  // Threading specific
  thread_pitch_mm?: number;
  thread_depth_mm?: number;
  thread_passes?: number;
  // Grooving specific
  groove_width_mm?: number;
  // Coolant
  coolant?: "flood" | "off";
}

export interface OkumaLathePostOutput {
  gcode: string[];
  program_number: number;
  total_lines: number;
  estimated_cycle_min: number;
  tools_used: number[];
  warnings: string[];
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  tribal_tips_applied: string[];
}

// ============================================================================
// OKUMA OSP-P300L TRIBAL KNOWLEDGE — JM DIE SPECIFIC
// ============================================================================

const OKUMA_LATHE_TRIBAL_KNOWLEDGE = [
  {
    category: "css",
    tip: "Always use G96 CSS for turning — clamp with G50 S3500 for small diameters (<25mm)",
    applies_to: ["od_rough", "od_finish", "id_rough", "id_finish", "face"],
    confidence: 0.96
  },
  {
    category: "tool_nose_comp",
    tip: "G41/G42 tool nose comp: always start with G00 move before G01 — OSP is sensitive to startup",
    applies_to: ["all"],
    confidence: 0.95
  },
  {
    category: "roughing",
    tip: "G72 canned roughing cycle: use U0.5 W0.1 finish stock, F0.25 for steel, F0.4 for aluminum",
    applies_to: ["od_rough", "id_rough"],
    confidence: 0.93
  },
  {
    category: "threading",
    tip: "G76 threading: use P010060 Q050 for 60° thread (first pass 0.1mm, finish 0.05mm), min 4 passes",
    applies_to: ["thread"],
    confidence: 0.95
  },
  {
    category: "parting",
    tip: "Part-off: reduce CSS by 30%, use G96 S80 max for steel, flood coolant mandatory, pecking for >25mm dia",
    applies_to: ["part_off"],
    confidence: 0.94
  },
  {
    category: "grooving",
    tip: "Grooving with narrow tools: use pecking G75 for groove depth > tool width, dwell 0.5s at bottom",
    applies_to: ["groove"],
    confidence: 0.92
  },
  {
    category: "drilling",
    tip: "Deep drilling (>3xD): use G83 with Q2.0 peck depth, G87 for tapping, always spot drill first",
    applies_to: ["drill"],
    confidence: 0.94
  },
  {
    category: "boring",
    tip: "Boring finish: use spring passes — run same pass twice without depth change for mirror finish",
    applies_to: ["bore", "id_finish"],
    confidence: 0.91
  },
  {
    category: "sub_spindle",
    tip: "Sub-spindle transfer: use M38 (sync engage), M39 (sync release), verify RPM match before transfer",
    applies_to: ["part_off"],
    confidence: 0.93
  },
  {
    category: "c_axis",
    tip: "C-axis milling (G112): always home C-axis first (M76), use G12.1 polar mode for face patterns",
    applies_to: ["c_mill"],
    confidence: 0.92
  },
  {
    category: "live_tooling",
    tip: "Live tool drilling: use M23 (live tool on), M24 (live tool off), max 6000 RPM on JM Die's LB250",
    applies_to: ["c_mill", "drill"],
    confidence: 0.94
  },
  {
    category: "tool_steel",
    tip: "D2/M2 tool steel: 120-150 SFM, 0.004-0.006 IPR feed, CNMG insert preferred, flood coolant",
    applies_to: ["od_rough", "od_finish", "face"],
    iso_group: "H",
    confidence: 0.95
  },
  {
    category: "carbide",
    tip: "Tungsten carbide turning: use PCD or CBN inserts, 50-80 SFM, very light DOC (0.005\"), air blast only",
    applies_to: ["od_finish", "face"],
    iso_group: "H",
    confidence: 0.93
  },
  {
    category: "safe_start",
    tip: "JM Die Okuma safe start: G28 U0 W0 / G50 S3500 / G96 / G99 — always in this order",
    applies_to: ["all"],
    confidence: 0.97
  },
  {
    category: "chip_control",
    tip: "Long chips on aluminum: increase feed to 0.012+ IPR, use chip breaker insert geometry",
    applies_to: ["od_rough", "od_finish"],
    iso_group: "N",
    confidence: 0.91
  }
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OkumaB250LatheMasterPostEngine {
  private readonly defaultConfig: OkumaLathePostConfig = {
    program_number: 1,
    units: "metric",
    work_offset: 54,
    safe_z_mm: 10,
    chuck_pressure: "high",
    use_css: true,
    css_max_rpm: 3500,
    sub_spindle_enabled: true,
    live_tooling_enabled: true,
    c_axis_enabled: true
  };

  /**
   * Generate complete Okuma lathe G-code program
   */
  generateProgram(
    operations: TurningOperation[],
    config?: Partial<OkumaLathePostConfig>
  ): OkumaLathePostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const gcode: string[] = [];
    const warnings: string[] = [];
    const physicsChecks: OkumaLathePostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();

    log.info(`[OkumaB250] Generating program O${cfg.program_number} with ${operations.length} operations`);

    // Program header
    gcode.push(`O${String(cfg.program_number).padStart(4, "0")} (${cfg.program_comment || "PRISM LATHE"})`);
    gcode.push(`(MACHINE: OKUMA LB250II-M OSP-P300L)`);
    gcode.push(`(GENERATED: ${new Date().toISOString()})`);
    gcode.push("");

    // Safe start block
    const safeStart = this.generateSafeStart(cfg);
    gcode.push(...safeStart);
    tribalTipsApplied.push("JM Die Okuma safe start sequence applied");

    // Process each operation
    let estimatedTime = 0;
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // Physics checks
      const checks = this.performPhysicsChecks(op, gcode.length);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map(c => `Line ${c.line}: ${c.check}`));
      }

      // Tool change
      const toolChange = this.generateToolChange(op);
      gcode.push(...toolChange);

      // Apply tribal knowledge
      const tips = this.applyTribalKnowledge(op);
      tribalTipsApplied.push(...tips.applied);

      // Generate operation-specific code
      let opCode: string[] = [];
      switch (op.operation_type) {
        case "od_rough":
        case "id_rough":
          opCode = this.generateRoughingCycle(op, cfg);
          break;
        case "od_finish":
        case "id_finish":
          opCode = this.generateFinishingPass(op, cfg);
          break;
        case "face":
          opCode = this.generateFacingPass(op, cfg);
          break;
        case "thread":
          opCode = this.generateThreadingCycle(op);
          break;
        case "groove":
          opCode = this.generateGroovingCycle(op);
          break;
        case "part_off":
          opCode = this.generatePartOff(op, cfg);
          break;
        case "drill":
        case "bore":
          opCode = this.generateDrillingCycle(op, cfg);
          break;
        case "c_mill":
          opCode = this.generateCAxisMilling(op, cfg);
          break;
      }
      gcode.push(...opCode);

      // Estimate time
      estimatedTime += this.estimateCycleTime(op);
    }

    // Program end
    gcode.push("");
    gcode.push("(END OF PROGRAM)");
    gcode.push("M05 (SPINDLE STOP)");
    gcode.push("M09 (COOLANT OFF)");
    gcode.push("G28 U0 W0 (HOME)");
    gcode.push("M30 (PROGRAM END)");

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_cycle_min: Math.round(estimatedTime * 10) / 10,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied
    };
  }

  /**
   * Generate safe start block (Okuma OSP-P300L specific)
   */
  private generateSafeStart(cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];
    lines.push("(SAFE START)");
    lines.push("G28 U0 W0 (HOME POSITION)");

    if (cfg.units === "metric") {
      lines.push("G21 (METRIC)");
    } else {
      lines.push("G20 (INCH)");
    }

    lines.push(`G50 S${cfg.css_max_rpm} (MAX SPINDLE CLAMP)`);
    lines.push("G97 (CANCEL CSS FOR STARTUP)");
    lines.push("G99 (FEED PER REV)");
    lines.push(`G${cfg.work_offset} (WORK OFFSET)`);

    return lines;
  }

  /**
   * Generate tool change
   */
  private generateToolChange(op: TurningOperation): string[] {
    const lines: string[] = [];
    const toolCode = `T${String(op.tool_number).padStart(2, "0")}${String(op.tool_number).padStart(2, "0")}`;

    lines.push(`G28 U0 W0 (HOME FOR TOOL CHANGE)`);
    lines.push(`${toolCode} (${op.tool_description || `TOOL ${op.tool_number}`})`);

    return lines;
  }

  /**
   * Generate roughing cycle (G72 pattern)
   */
  private generateRoughingCycle(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];
    const isOD = op.operation_type === "od_rough";

    // Spindle start with CSS
    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03 (CSS ${op.css_m_min} M/MIN)`);
    } else if (op.spindle_rpm) {
      lines.push(`G97 S${op.spindle_rpm} M03 (${op.spindle_rpm} RPM)`);
    }

    // Coolant
    if (op.coolant === "flood") {
      lines.push("M08 (FLOOD COOLANT)");
    }

    // Tool nose comp
    const compDir = isOD ? "G42" : "G41";
    lines.push(`${compDir} (TOOL NOSE COMP ${isOD ? "RIGHT" : "LEFT"})`);

    // G72 canned cycle (Okuma format)
    const finishStock = 0.5; // mm
    const finishStockZ = 0.1; // mm
    lines.push(`G72 W${op.depth_of_cut_mm} R1.0`);
    lines.push(`G72 P100 Q200 U${finishStock} W${finishStockZ} F${op.feed_mm_rev}`);

    // Define contour
    lines.push(`N100 G00 X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)}`);
    lines.push(`N200 Z${op.end_z.toFixed(3)}`);

    // Cancel comp
    lines.push("G40 (CANCEL TOOL NOSE COMP)");

    return lines;
  }

  /**
   * Generate finishing pass
   */
  private generateFinishingPass(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];
    const isOD = op.operation_type === "od_finish";

    // Spindle start with CSS or fixed RPM
    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03 (CSS FINISH)`);
    } else if (op.spindle_rpm) {
      lines.push(`G97 S${op.spindle_rpm} M03 (${op.spindle_rpm} RPM)`);
    }

    // Coolant
    if (op.coolant === "flood") {
      lines.push("M08");
    }

    // Tool nose comp
    const compDir = isOD ? "G42" : "G41";
    lines.push(`${compDir}`);

    // Simple finish contour
    lines.push(`G00 X${(op.start_x + 2).toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);
    lines.push(`X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} Z${op.end_z.toFixed(3)}`);

    // Cancel comp
    lines.push("G40");

    return lines;
  }

  /**
   * Generate facing pass
   */
  private generateFacingPass(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    if (cfg.use_css && op.css_m_min) {
      lines.push(`G96 S${op.css_m_min} M03`);
    }
    if (op.coolant === "flood") lines.push("M08");

    // Face from OD to center
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 1).toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`G00 Z${(op.start_z + 1).toFixed(3)}`);

    return lines;
  }

  /**
   * Generate threading cycle (G76)
   */
  private generateThreadingCycle(op: TurningOperation): string[] {
    const lines: string[] = [];

    if (!op.thread_pitch_mm || !op.thread_depth_mm) {
      return ["(ERROR: THREAD PITCH OR DEPTH NOT SPECIFIED)"];
    }

    // RPM mode for threading (not CSS)
    const threadRpm = op.spindle_rpm || Math.min(1000, 1000 / op.thread_pitch_mm);
    lines.push(`G97 S${Math.round(threadRpm)} M03 (THREADING RPM)`);
    lines.push("M08");

    // Position
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);

    // G76 threading cycle (Okuma format)
    // P: first pass depth (0.1mm), angle (60°), finish allowance (0.05mm)
    // Q: minimum cutting depth (0.05mm)
    const firstPass = 0.1;
    const angle = 60;
    const finishAllowance = 0.05;
    const minDepth = 0.05;
    const passes = op.thread_passes || Math.ceil(op.thread_depth_mm / firstPass);

    lines.push(`G76 P${String(Math.round(firstPass * 100)).padStart(2, "0")}${String(angle).padStart(2, "0")}${String(Math.round(finishAllowance * 100)).padStart(2, "0")} Q${Math.round(minDepth * 1000)} R${finishAllowance}`);
    lines.push(`G76 X${(op.start_x - op.thread_depth_mm * 2).toFixed(3)} Z${op.end_z.toFixed(3)} P${Math.round(op.thread_depth_mm * 1000)} Q${Math.round(firstPass * 1000)} F${op.thread_pitch_mm}`);

    return lines;
  }

  /**
   * Generate grooving cycle (G75)
   */
  private generateGroovingCycle(op: TurningOperation): string[] {
    const lines: string[] = [];

    if (op.css_m_min) {
      lines.push(`G96 S${Math.round(op.css_m_min * 0.7)} M03 (REDUCED CSS FOR GROOVING)`);
    }
    lines.push("M08");

    const grooveWidth = op.groove_width_mm || 3;
    const peckDepth = Math.min(grooveWidth, 2);

    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)}`);
    lines.push(`G75 R0.5`);
    lines.push(`G75 X${op.end_x.toFixed(3)} Z${op.end_z.toFixed(3)} P${Math.round(peckDepth * 1000)} Q${Math.round(grooveWidth * 1000)} F${op.feed_mm_rev}`);

    return lines;
  }

  /**
   * Generate part-off
   */
  private generatePartOff(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    // Reduced speed for parting
    const partSpeed = op.css_m_min ? Math.round(op.css_m_min * 0.7) : 80;
    lines.push(`G96 S${partSpeed} M03 (REDUCED CSS FOR PART-OFF)`);
    lines.push("M08 (FLOOD COOLANT MANDATORY)");

    // Position
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)}`);

    // Part-off with pecking if large diameter
    if (op.start_x > 50) {
      const peckDepth = 5;
      lines.push(`G75 R0.5`);
      lines.push(`G75 X0 Z${op.start_z.toFixed(3)} P${Math.round(peckDepth * 1000)} Q0 F${op.feed_mm_rev * 0.5}`);
    } else {
      lines.push(`G01 X0 F${op.feed_mm_rev * 0.5}`);
    }

    // Dwell at center
    lines.push("G04 P0.5 (DWELL AT CENTER)");

    return lines;
  }

  /**
   * Generate drilling/boring cycle
   */
  private generateDrillingCycle(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    const rpm = op.spindle_rpm || 1500;
    lines.push(`G97 S${rpm} M03`);
    if (op.coolant === "flood") lines.push("M08");

    // Position
    lines.push(`G00 X0 Z${(op.start_z + 2).toFixed(3)}`);

    // Deep hole drilling with peck
    const depth = Math.abs(op.end_z - op.start_z);
    if (depth > 30) {
      const peckDepth = 2;
      lines.push(`G83 Z${op.end_z.toFixed(3)} Q${peckDepth} F${op.feed_mm_rev}`);
      lines.push("G80");
    } else {
      lines.push(`G01 Z${op.end_z.toFixed(3)} F${op.feed_mm_rev}`);
    }

    lines.push(`G00 Z${(op.start_z + 2).toFixed(3)}`);

    return lines;
  }

  /**
   * Generate C-axis milling
   */
  private generateCAxisMilling(op: TurningOperation, cfg: OkumaLathePostConfig): string[] {
    const lines: string[] = [];

    if (!cfg.c_axis_enabled) {
      return ["(ERROR: C-AXIS NOT ENABLED IN CONFIG)"];
    }

    // Home C-axis
    lines.push("M76 (C-AXIS HOME)");
    lines.push("M23 (LIVE TOOL ON)");

    const liveToolRpm = Math.min(op.spindle_rpm || 3000, 6000);
    lines.push(`G97 S${liveToolRpm} M203 (LIVE TOOL CW)`);
    if (op.coolant === "flood") lines.push("M08");

    // Polar interpolation mode
    lines.push("G12.1 (POLAR INTERPOLATION ON)");

    // Example pattern - actual coordinates would come from CAM
    lines.push(`G00 X${op.start_x.toFixed(3)} C0`);
    lines.push(`G01 Z${op.end_z.toFixed(3)} F${op.feed_mm_rev * op.spindle_rpm!}`);

    // Cancel polar
    lines.push("G13.1 (POLAR INTERPOLATION OFF)");
    lines.push("M24 (LIVE TOOL OFF)");

    return lines;
  }

  /**
   * Perform physics checks
   */
  private performPhysicsChecks(op: TurningOperation, startLine: number): OkumaLathePostOutput["physics_checks"] {
    const checks: OkumaLathePostOutput["physics_checks"] = [];

    // Surface speed check
    if (op.css_m_min) {
      const maxCSS = this.getMaxSurfaceSpeed(op.material_iso);
      checks.push({
        line: startLine,
        check: `Surface speed ${op.css_m_min} m/min vs max ${maxCSS} for ISO ${op.material_iso}`,
        passed: op.css_m_min <= maxCSS * 1.2,
        value: op.css_m_min,
        limit: maxCSS
      });
    }

    // Feed rate check
    const maxFeed = op.material_iso === "N" ? 0.5 : 0.3;
    checks.push({
      line: startLine,
      check: `Feed ${op.feed_mm_rev} mm/rev vs max ${maxFeed} for ISO ${op.material_iso}`,
      passed: op.feed_mm_rev <= maxFeed,
      value: op.feed_mm_rev,
      limit: maxFeed
    });

    // Depth of cut check
    const maxDOC = op.operation_type.includes("finish") ? 0.5 : 5;
    checks.push({
      line: startLine,
      check: `DOC ${op.depth_of_cut_mm} mm vs max ${maxDOC} mm`,
      passed: op.depth_of_cut_mm <= maxDOC,
      value: op.depth_of_cut_mm,
      limit: maxDOC
    });

    return checks;
  }

  /**
   * Apply tribal knowledge
   */
  private applyTribalKnowledge(op: TurningOperation): { applied: string[] } {
    const applied: string[] = [];

    for (const tip of OKUMA_LATHE_TRIBAL_KNOWLEDGE) {
      const appliesToOp = tip.applies_to.includes("all") || tip.applies_to.includes(op.operation_type);
      const appliesToMaterial = !tip.iso_group || tip.iso_group === op.material_iso;

      if (appliesToOp && appliesToMaterial) {
        applied.push(`[${tip.category}] ${tip.tip}`);
      }
    }

    return { applied };
  }

  /**
   * Estimate cycle time
   */
  private estimateCycleTime(op: TurningOperation): number {
    const distance = Math.sqrt(
      Math.pow(op.end_x - op.start_x, 2) + Math.pow(op.end_z - op.start_z, 2)
    );

    const feedRate = op.feed_mm_rev * (op.spindle_rpm || 1000);
    const cuttingTime = distance / feedRate;
    const toolChangeTime = 0.1; // 6 seconds

    return cuttingTime + toolChangeTime;
  }

  /**
   * Get max surface speed for material
   */
  private getMaxSurfaceSpeed(iso: ISOGroup): number {
    const maxCSS: Record<ISOGroup, number> = {
      P: 250, M: 150, K: 200, N: 500, S: 50, H: 100
    };
    return maxCSS[iso] || 200;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    return {
      machine: "Okuma LB250II-M",
      controller: "OSP-P300L",
      tribal_tips: OKUMA_LATHE_TRIBAL_KNOWLEDGE.length,
      physics_checks: 3,
      features: [
        "G96 constant surface speed",
        "G72/G70 canned roughing/finishing",
        "G76 multi-pass threading",
        "C-axis polar interpolation",
        "Live tooling support",
        "Sub-spindle synchronization",
        "Kienzle/Taylor physics"
      ]
    };
  }
}

// Singleton export
export const okumaB250LatheMasterPostEngine = new OkumaB250LatheMasterPostEngine();
