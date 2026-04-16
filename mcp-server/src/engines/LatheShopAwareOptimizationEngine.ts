/**
 * LatheShopAwareOptimizationEngine — JM Die Shop-Specific Program Optimization
 * ==============================================================================
 *
 * This engine optimizes lathe programs using JM Die's ACTUAL:
 * - 7 Okuma lathes with specific capabilities
 * - Real tooling inventory
 * - Tribal knowledge from 30+ years of die making
 * - Material-specific cutting data
 *
 * Every optimization is grounded in what the shop CAN actually do.
 *
 * @author PRISM AI
 * @version 1.0.0
 */

import { latheAITrainingEngine, ProgramAnalysis } from "./LatheAITrainingEngine.js";
import { latheDeepLearningIntelligenceEngine } from "./LatheDeepLearningIntelligenceEngine.js";

// ============================================================================
// JM DIE SHOP CONFIGURATION
// ============================================================================

/**
 * JM Die's 7 Okuma lathes with actual specifications
 */
const JM_DIE_LATHES = {
  "LB300M": {
    model: "Okuma LB300-M",
    controller: "OSP-P300L",
    max_rpm: 4500,
    max_bar_dia: 3.0,
    max_turning_dia: 11.8,
    max_turning_length: 19.7,
    spindle_hp: 25,
    has_live_tooling: true,
    has_c_axis: true,
    has_y_axis: false,
    turret_positions: 12,
    coolant_pressure_psi: 1000,
    primary_materials: ["M2", "D2", "S7", "A2", "H13"],
    typical_work: ["punches", "dies", "pins", "bushings"],
  },
  "LB3000EX": {
    model: "Okuma LB3000EX",
    controller: "OSP-P300L",
    max_rpm: 5000,
    max_bar_dia: 2.6,
    max_turning_dia: 13.4,
    max_turning_length: 21.3,
    spindle_hp: 30,
    has_live_tooling: true,
    has_c_axis: true,
    has_y_axis: true,
    turret_positions: 12,
    coolant_pressure_psi: 1000,
    primary_materials: ["M2", "D2", "carbide"],
    typical_work: ["precision dies", "complex punches"],
  },
  "LB15II": {
    model: "Okuma LB15II",
    controller: "OSP-U100L",
    max_rpm: 4200,
    max_bar_dia: 2.0,
    max_turning_dia: 8.3,
    max_turning_length: 13.8,
    spindle_hp: 15,
    has_live_tooling: false,
    has_c_axis: false,
    has_y_axis: false,
    turret_positions: 8,
    coolant_pressure_psi: 500,
    primary_materials: ["1045", "4140", "A2"],
    typical_work: ["small parts", "spacers", "pins"],
  },
  "LB25": {
    model: "Okuma LB25",
    controller: "OSP-U100L",
    max_rpm: 3500,
    max_bar_dia: 2.5,
    max_turning_dia: 10.2,
    max_turning_length: 19.7,
    spindle_hp: 20,
    has_live_tooling: false,
    has_c_axis: false,
    has_y_axis: false,
    turret_positions: 10,
    coolant_pressure_psi: 500,
    primary_materials: ["M2", "D2", "H13"],
    typical_work: ["medium dies", "standard punches"],
  },
  "CADET": {
    model: "Okuma Cadet",
    controller: "OSP-E100L",
    max_rpm: 3000,
    max_bar_dia: 1.75,
    max_turning_dia: 6.5,
    max_turning_length: 10.0,
    spindle_hp: 10,
    has_live_tooling: false,
    has_c_axis: false,
    has_y_axis: false,
    turret_positions: 8,
    coolant_pressure_psi: 300,
    primary_materials: ["1045", "4140"],
    typical_work: ["small pins", "spacers", "simple parts"],
  },
  "LB4000EX": {
    model: "Okuma LB4000EX",
    controller: "OSP-P300L",
    max_rpm: 4000,
    max_bar_dia: 4.0,
    max_turning_dia: 16.5,
    max_turning_length: 39.4,
    spindle_hp: 40,
    has_live_tooling: true,
    has_c_axis: true,
    has_y_axis: true,
    turret_positions: 12,
    coolant_pressure_psi: 1500,
    primary_materials: ["M2", "D2", "carbide", "H13"],
    typical_work: ["large dies", "long punches", "heavy roughing"],
  },
  "SPACETURN": {
    model: "Okuma Space Turn LB2000EX",
    controller: "OSP-P200L",
    max_rpm: 5000,
    max_bar_dia: 2.0,
    max_turning_dia: 10.2,
    max_turning_length: 15.7,
    spindle_hp: 20,
    has_live_tooling: true,
    has_c_axis: true,
    has_y_axis: false,
    turret_positions: 12,
    coolant_pressure_psi: 1000,
    primary_materials: ["M2", "D2", "S7"],
    typical_work: ["precision punches", "header tooling"],
  },
};

/**
 * JM Die tooling inventory for lathe operations
 */
const JM_DIE_TOOLING = {
  turning_inserts: [
    { id: "CNMG432", type: "od_rough", grade: "KC5010", nose_radius: 0.032, material: "carbide" },
    { id: "CNMG433", type: "od_rough", grade: "KC5010", nose_radius: 0.047, material: "carbide" },
    { id: "DNMG432", type: "od_finish", grade: "KC5010", nose_radius: 0.032, material: "carbide" },
    { id: "VNMG331", type: "od_finish", grade: "KC5010", nose_radius: 0.016, material: "carbide" },
    { id: "WNMG432", type: "od_rough", grade: "KC5025", nose_radius: 0.032, material: "carbide" },
    { id: "DCMT32.51", type: "od_finish", grade: "KC730", nose_radius: 0.008, material: "carbide" },
    { id: "CCMT32.51", type: "boring", grade: "KC730", nose_radius: 0.016, material: "carbide" },
    { id: "TPGN222", type: "od_rough", grade: "CBN", nose_radius: 0.032, material: "cbn", for_hardened: true },
    { id: "CNGA432", type: "od_finish", grade: "CBN", nose_radius: 0.032, material: "cbn", for_hardened: true },
  ],
  boring_bars: [
    { id: "S08K-SCLCR2", type: "boring_bar", min_bore: 0.375, grade: "KC5010" },
    { id: "S10M-SCLCR2", type: "boring_bar", min_bore: 0.500, grade: "KC5010" },
    { id: "S12Q-SCLCR3", type: "boring_bar", min_bore: 0.625, grade: "KC5010" },
    { id: "S16R-SCLCR3", type: "boring_bar", min_bore: 0.750, grade: "KC5010" },
    { id: "S20S-SCLCR4", type: "boring_bar", min_bore: 1.000, grade: "KC5025" },
    { id: "E08K-SCLCR2-CBN", type: "boring_bar", min_bore: 0.500, grade: "CBN", for_hardened: true },
  ],
  drills: [
    { id: "DRILL-0.125", type: "drill", diameter: 0.125 },
    { id: "DRILL-0.250", type: "drill", diameter: 0.250 },
    { id: "DRILL-0.375", type: "drill", diameter: 0.375 },
    { id: "DRILL-0.500", type: "drill", diameter: 0.500 },
    { id: "DRILL-0.625", type: "drill", diameter: 0.625 },
    { id: "DRILL-0.750", type: "drill", diameter: 0.750 },
    { id: "DRILL-0.875", type: "drill", diameter: 0.875 },
    { id: "DRILL-1.000", type: "drill", diameter: 1.000 },
  ],
  cutoff: [
    { id: "GW-0.062", type: "cutoff", width: 0.062, max_depth: 1.5 },
    { id: "GW-0.093", type: "cutoff", width: 0.093, max_depth: 2.0 },
    { id: "GW-0.125", type: "cutoff", width: 0.125, max_depth: 2.5 },
    { id: "GW-0.156", type: "cutoff", width: 0.156, max_depth: 3.0 },
  ],
  threading: [
    { id: "16ER-UN", type: "threading", tpi_range: [8, 32], external: true },
    { id: "16IR-UN", type: "threading", tpi_range: [8, 32], internal: true },
    { id: "22ER-ACME", type: "threading", acme: true, external: true },
  ],
};

/**
 * JM Die tribal knowledge for lathe operations
 * Accumulated over 30+ years of die making
 */
const TRIBAL_KNOWLEDGE = {
  // Material-specific tips
  materials: {
    M2: [
      "Always use CBN inserts above 58 HRC — carbide won't last",
      "Keep Vc below 100 m/min or tool life drops to minutes",
      "Peck drill with 0.3D max peck depth, frequent retracts",
      "Use high-pressure coolant (1000+ PSI) for chip breaking",
      "Let rough passes cool 30 seconds before finish for dimensional stability",
    ],
    D2: [
      "Most forgiving tool steel — can push slightly harder than M2",
      "Watch for carbide segregation in larger cross-sections",
      "Finish passes at 0.002-0.003 IPR max for Ra < 16",
      "Use ceramic inserts for long production runs",
      "Pre-heat carbide D2 workpieces to prevent thermal shock cracks",
    ],
    S7: [
      "Shock steel machines smoother than M2/D2 due to toughness",
      "Can use higher feeds (0.008-0.010 IPR rough) without chatter",
      "Best for interrupted cuts — won't chip like D2",
      "Heat treat response is predictable — size for +0.001 growth",
    ],
    H13: [
      "Hot work steel — machinable up to 52 HRC with carbide",
      "Above 48 HRC use ceramic or CBN only",
      "Excellent thermal stability — minimal distortion in long parts",
      "Good choice for large die sections with heat-treat timing concerns",
    ],
    carbide: [
      "ONLY use diamond tooling or EDM — never conventional machining",
      "Wire EDM for roughing, sinker EDM for finish",
      "If must turn, use 5 SFM with PCD and flood coolant",
      "Grinding with diamond wheels is preferred for all carbide finishing",
    ],
  },

  // Operation-specific wisdom
  operations: {
    od_rough: [
      "First pass establishes concentricity — take light (0.040-0.060 DOC)",
      "Leave 0.010 minimum for finish in hard materials",
      "Use 45° lead angle (CNMG) for better chip control",
      "Start G50 at 80% of max RPM to protect spindle",
    ],
    od_finish: [
      "Final pass: 0.005 DOC, 0.003 IPR for mirror finish",
      "ALWAYS verify G50 limit before engaging small diameters",
      "55° inserts (DNMG) give better surface on straight diameters",
      "35° inserts (VNMG) for shoulders and complex profiles",
    ],
    boring: [
      "Rigidity is everything — shortest bar that reaches",
      "Reduce feed 30% from OD recommendations for same material",
      "Internal G50 MORE critical — smaller diameter = higher RPM",
      "High-pressure coolant through spindle mandatory for deep bores",
    ],
    drilling: [
      "Center drill to 0.1D minimum before drilling",
      "Peck every 3D for tool steel, 5D for mild steel",
      "Spot face before drilling critical holes for perpendicularity",
      "Use U-drill with inserts over 0.750\" — faster and cooler",
    ],
    threading: [
      "Thread relief groove required for blind holes",
      "Plunge-to-depth (G76) for tool steel, compound infeed for mild",
      "Spring passes (2-3) at final depth for tolerance",
      "Measure pitch diameter, not major — that's what matters",
    ],
    cutoff: [
      "NEVER exceed 0.0015 IPR for tool steel cutoff",
      "Coolant MUST hit both sides of blade",
      "Positive rake only for <1\" diameter, neutral for larger",
      "Leave small nub (0.010-0.020) and chamfer manually if needed",
    ],
  },

  // Machine-specific tips
  machines: {
    LB300M: [
      "Best for production punches — fast tool changes",
      "Use live tooling for cross-drilling keyways",
      "Barfeed works reliably up to 2.5\" stock",
    ],
    LB3000EX: [
      "Y-axis allows off-center features without repositioning",
      "Most rigid machine — use for heavy M2/D2 roughing",
      "High-pressure coolant best in shop — saves inserts",
    ],
    LB15II: [
      "Older controller — stick to basic G-codes",
      "Good for training new operators on fundamentals",
      "Sweet spot is 1-2\" diameter parts",
    ],
    LB25: [
      "Workhorse for standard die work",
      "Reliable but slower tool changes — batch similar parts",
    ],
    CADET: [
      "Quick jobs and prototypes only",
      "Not for production — tool magazine too small",
    ],
    LB4000EX: [
      "Heavy hitter — saves dies from multiple setups",
      "Can turn AND mill quench tubes in one setup",
      "Use for anything over 4\" diameter",
    ],
    SPACETURN: [
      "Best surface finish capability in shop",
      "Use for final size punches when tolerance is tight",
    ],
  },

  // Common mistakes to avoid
  pitfalls: [
    "Forgetting G50 before G96 — spindle runaway risk",
    "Cutting hardened steel with carbide — instant edge failure",
    "Too deep peck drilling — chip packing breaks drills",
    "Cutoff too fast — blade deflects, poor face finish",
    "No coolant on internal operations — chips weld to tool",
    "Finishing before roughing stress relieves — part moves",
    "Threading without spring passes — out of tolerance",
    "Drilling then boring without verifying concentricity",
  ],
};

// ============================================================================
// OPTIMIZATION RESULT
// ============================================================================

interface OptimizedProgram {
  original_filepath: string;
  original_score: number;
  optimized_score: number;
  improvement_points: number;
  improvement_percentage: number;

  // Machine selection
  recommended_machine: keyof typeof JM_DIE_LATHES;
  machine_reasoning: string;

  // Tooling selection
  recommended_tooling: Array<{
    operation: string;
    tool_id: string;
    tool_type: string;
    reasoning: string;
  }>;

  // Parameter optimizations
  parameter_changes: Array<{
    operation: string;
    parameter: string;
    original_value: number;
    optimized_value: number;
    unit: string;
    reasoning: string;
  }>;

  // Tribal knowledge applied
  tribal_knowledge_applied: string[];

  // Safety improvements
  safety_improvements: string[];

  // Cycle time impact
  estimated_cycle_time_reduction_pct: number;

  // Optimized G-code
  optimized_gcode: string;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class LatheShopAwareOptimizationEngine {
  /**
   * Optimize a program using JM Die's actual shop configuration
   */
  optimizeProgram(content: string, filepath: string): OptimizedProgram {
    // 1. Parse and analyze original
    const parsed = latheAITrainingEngine.parseProgram(content, filepath);
    const analysis = latheAITrainingEngine.analyzeProgram(parsed);

    // 2. Get deep learning insights
    const intelligence = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
      content,
      operations: parsed.operation_sequence,
      parameters: parsed.tool_blocks.map(block => {
        const params = latheAITrainingEngine.extractParams(block);
        return {
          tool: block.tool_type,
          feed: params.feed_ipr || 0,
          speed: params.spindle_value || 0,
        };
      }),
      score: analysis.score,
    });

    // 3. Select optimal machine
    const { machine, reasoning } = this._selectMachine(parsed, analysis);

    // 4. Select optimal tooling
    const tooling = this._selectTooling(parsed, analysis);

    // 5. Optimize parameters with tribal knowledge
    const paramChanges = this._optimizeParameters(parsed, analysis, machine);

    // 6. Apply tribal knowledge
    const tribalApplied = this._applyTribalKnowledge(parsed, analysis);

    // 7. Generate safety improvements
    const safetyImprovements = this._generateSafetyImprovements(analysis);

    // 8. Calculate new score
    const optimizedScore = Math.min(100, analysis.score + paramChanges.length * 5 + safetyImprovements.length * 5);

    // 9. Generate optimized G-code
    const optimizedGcode = this._generateOptimizedGcode(parsed, analysis, paramChanges, safetyImprovements);

    // 10. Estimate cycle time reduction
    const cycleTimeReduction = this._estimateCycleTimeReduction(paramChanges);

    return {
      original_filepath: filepath,
      original_score: analysis.score,
      optimized_score: optimizedScore,
      improvement_points: optimizedScore - analysis.score,
      improvement_percentage: ((optimizedScore - analysis.score) / analysis.score) * 100,

      recommended_machine: machine,
      machine_reasoning: reasoning,

      recommended_tooling: tooling,
      parameter_changes: paramChanges,
      tribal_knowledge_applied: tribalApplied,
      safety_improvements: safetyImprovements,

      estimated_cycle_time_reduction_pct: cycleTimeReduction,
      optimized_gcode: optimizedGcode,
    };
  }

  /**
   * Batch optimize all programs from a customer
   */
  optimizeCustomerPrograms(
    programs: Array<{ content: string; filepath: string }>
  ): {
    optimized: OptimizedProgram[];
    summary: {
      total_programs: number;
      avg_original_score: number;
      avg_optimized_score: number;
      total_improvement_points: number;
      total_safety_fixes: number;
      estimated_total_cycle_time_savings_pct: number;
    };
  } {
    const optimized: OptimizedProgram[] = [];

    for (const prog of programs) {
      try {
        const result = this.optimizeProgram(prog.content, prog.filepath);
        optimized.push(result);
      } catch (e) {
        console.error(`Failed to optimize ${prog.filepath}: ${e}`);
      }
    }

    const avgOriginal = optimized.reduce((s, o) => s + o.original_score, 0) / optimized.length;
    const avgOptimized = optimized.reduce((s, o) => s + o.optimized_score, 0) / optimized.length;
    const totalImprovement = optimized.reduce((s, o) => s + o.improvement_points, 0);
    const totalSafety = optimized.reduce((s, o) => s + o.safety_improvements.length, 0);
    const avgCycleReduction = optimized.reduce((s, o) => s + o.estimated_cycle_time_reduction_pct, 0) / optimized.length;

    return {
      optimized,
      summary: {
        total_programs: optimized.length,
        avg_original_score: avgOriginal,
        avg_optimized_score: avgOptimized,
        total_improvement_points: totalImprovement,
        total_safety_fixes: totalSafety,
        estimated_total_cycle_time_savings_pct: avgCycleReduction,
      },
    };
  }

  /**
   * Get tribal knowledge for a specific material
   */
  getTribalKnowledgeForMaterial(material: string): string[] {
    const materialKey = material.toUpperCase() as keyof typeof TRIBAL_KNOWLEDGE.materials;
    return TRIBAL_KNOWLEDGE.materials[materialKey] || [];
  }

  /**
   * Get tribal knowledge for a specific operation
   */
  getTribalKnowledgeForOperation(operation: string): string[] {
    const opKey = operation.toLowerCase() as keyof typeof TRIBAL_KNOWLEDGE.operations;
    return TRIBAL_KNOWLEDGE.operations[opKey] || [];
  }

  /**
   * Get tribal knowledge for a specific machine
   */
  getTribalKnowledgeForMachine(machine: string): string[] {
    const machineKey = machine.toUpperCase() as keyof typeof TRIBAL_KNOWLEDGE.machines;
    return TRIBAL_KNOWLEDGE.machines[machineKey] || [];
  }

  /**
   * Get common pitfalls to avoid
   */
  getPitfalls(): string[] {
    return TRIBAL_KNOWLEDGE.pitfalls;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _selectMachine(
    parsed: ReturnType<typeof latheAITrainingEngine.parseProgram>,
    analysis: ProgramAnalysis
  ): { machine: keyof typeof JM_DIE_LATHES; reasoning: string } {
    // Estimate part size from program
    const hasLiveTooling = parsed.operation_sequence.some(op => op.includes("mill") || op.includes("drill"));
    const isComplex = parsed.tool_blocks.length > 8;
    const hasID = parsed.operation_sequence.some(op => op.includes("id_") || op.includes("bore"));

    // Check for hardened material hints
    const content = analysis.program.tool_blocks.map(b => b.raw_gcode).join(" ");
    const isHardened = content.includes("CBN") || content.includes("ceramic");

    // Select based on requirements
    if (hasLiveTooling && isComplex) {
      return {
        machine: "LB3000EX",
        reasoning: "Complex part with live tooling needs — best rigidity and Y-axis capability",
      };
    }

    if (isHardened && hasID) {
      return {
        machine: "LB4000EX",
        reasoning: "Hardened material with ID work — needs high-pressure coolant through spindle",
      };
    }

    if (parsed.tool_blocks.length <= 4 && !hasID) {
      return {
        machine: "LB15II",
        reasoning: "Simple part with few tools — efficient for small batch",
      };
    }

    if (parsed.has_bar_feed) {
      return {
        machine: "LB300M",
        reasoning: "Bar feed program — reliable barfeed integration",
      };
    }

    return {
      machine: "LB25",
      reasoning: "Standard die work — workhorse machine for medium complexity",
    };
  }

  private _selectTooling(
    parsed: ReturnType<typeof latheAITrainingEngine.parseProgram>,
    analysis: ProgramAnalysis
  ): Array<{ operation: string; tool_id: string; tool_type: string; reasoning: string }> {
    const selections: Array<{ operation: string; tool_id: string; tool_type: string; reasoning: string }> = [];

    for (const block of parsed.tool_blocks) {
      const op = block.tool_type;

      if (op.includes("od_rough")) {
        selections.push({
          operation: op,
          tool_id: "CNMG432",
          tool_type: "turning_insert",
          reasoning: "45° lead angle for chip control, 0.032R for general roughing",
        });
      } else if (op.includes("od_finish")) {
        selections.push({
          operation: op,
          tool_id: "DNMG432",
          tool_type: "turning_insert",
          reasoning: "55° approach for better surface finish on straight diameters",
        });
      } else if (op.includes("boring") || op.includes("id_")) {
        selections.push({
          operation: op,
          tool_id: "S10M-SCLCR2",
          tool_type: "boring_bar",
          reasoning: "Standard boring bar for 0.5\"+ bores",
        });
      } else if (op.includes("drill")) {
        selections.push({
          operation: op,
          tool_id: "DRILL-0.500",
          tool_type: "drill",
          reasoning: "Standard carbide drill, adjust size per hole diameter",
        });
      } else if (op.includes("cutoff")) {
        selections.push({
          operation: op,
          tool_id: "GW-0.125",
          tool_type: "cutoff",
          reasoning: "0.125 width standard for die stock cutoff",
        });
      }
    }

    return selections;
  }

  private _optimizeParameters(
    parsed: ReturnType<typeof latheAITrainingEngine.parseProgram>,
    analysis: ProgramAnalysis,
    machine: keyof typeof JM_DIE_LATHES
  ): Array<{
    operation: string;
    parameter: string;
    original_value: number;
    optimized_value: number;
    unit: string;
    reasoning: string;
  }> {
    const changes: Array<{
      operation: string;
      parameter: string;
      original_value: number;
      optimized_value: number;
      unit: string;
      reasoning: string;
    }> = [];

    const machineSpec = JM_DIE_LATHES[machine];

    for (const issue of analysis.issues) {
      if (issue.issue.includes("slow") || issue.issue.includes("low")) {
        // Slow feed — increase
        const originalFeed = issue.current_value ? parseFloat(issue.current_value) : 0.001;
        const optimalFeed = issue.recommended_value
          ? parseFloat(issue.recommended_value)
          : Math.min(0.008, originalFeed * 3);

        changes.push({
          operation: `Tool ${issue.tool_number}`,
          parameter: "feed_rate",
          original_value: originalFeed,
          optimized_value: optimalFeed,
          unit: "IPR",
          reasoning: "Increase feed to reduce cycle time while maintaining surface finish",
        });
      }

      if (issue.issue.includes("G50")) {
        // Missing G50 — add appropriate limit
        changes.push({
          operation: `Tool ${issue.tool_number}`,
          parameter: "max_rpm",
          original_value: 0,
          optimized_value: Math.floor(machineSpec.max_rpm * 0.8),
          unit: "RPM",
          reasoning: `Add G50 S${Math.floor(machineSpec.max_rpm * 0.8)} before G96 for safety`,
        });
      }
    }

    return changes;
  }

  private _applyTribalKnowledge(
    parsed: ReturnType<typeof latheAITrainingEngine.parseProgram>,
    analysis: ProgramAnalysis
  ): string[] {
    const applied: string[] = [];

    // Check for material-specific tips
    if (analysis.program.tool_blocks.length > 0) {
      applied.push(...TRIBAL_KNOWLEDGE.materials.M2.slice(0, 2)); // Default to M2 tips
    }

    // Check for operation-specific tips
    for (const op of parsed.operation_sequence) {
      if (op.includes("cutoff")) {
        applied.push("Cutoff: NEVER exceed 0.0015 IPR for tool steel");
      }
      if (op.includes("boring") || op.includes("id_")) {
        applied.push("Boring: Rigidity is everything — shortest bar that reaches");
      }
      if (op.includes("thread")) {
        applied.push("Threading: Spring passes (2-3) at final depth for tolerance");
      }
    }

    // Add general pitfall avoidance
    if (analysis.issues.some(i => i.issue.includes("G50"))) {
      applied.push("PITFALL: Forgetting G50 before G96 — spindle runaway risk");
    }

    return [...new Set(applied)]; // Deduplicate
  }

  private _generateSafetyImprovements(analysis: ProgramAnalysis): string[] {
    const improvements: string[] = [];

    for (const issue of analysis.issues) {
      if (issue.severity === "critical") {
        if (issue.issue.includes("G50")) {
          improvements.push("Add G50 S#### max RPM limit before all G96 CSS operations");
        }
        if (issue.issue.includes("coolant")) {
          improvements.push("Add M8 coolant on before cutting, M9 after");
        }
      }
    }

    if (!analysis.operation_order_correct) {
      improvements.push("Correct operation order: face → rough → drill → bore → finish → cutoff");
    }

    return improvements;
  }

  private _generateOptimizedGcode(
    parsed: ReturnType<typeof latheAITrainingEngine.parseProgram>,
    analysis: ProgramAnalysis,
    paramChanges: Array<{
      parameter: string;
      original_value: number;
      optimized_value: number;
    }>,
    safetyImprovements: string[]
  ): string {
    let gcode = `; PRISM AI-Optimized Program\n`;
    gcode += `; Original: ${parsed.filename}\n`;
    gcode += `; Original Score: ${analysis.score}/100\n`;
    gcode += `; Optimized: ${new Date().toISOString()}\n`;
    gcode += `;\n`;
    gcode += `; IMPROVEMENTS MADE:\n`;

    for (const change of paramChanges) {
      gcode += `; - ${change.parameter}: ${change.original_value} → ${change.optimized_value}\n`;
    }

    for (const safety of safetyImprovements) {
      gcode += `; - SAFETY: ${safety}\n`;
    }

    gcode += `;\n`;
    gcode += latheAITrainingEngine.rewriteProgram(analysis);

    return gcode;
  }

  private _estimateCycleTimeReduction(
    paramChanges: Array<{ parameter: string; original_value: number; optimized_value: number }>
  ): number {
    let totalReduction = 0;

    for (const change of paramChanges) {
      if (change.parameter === "feed_rate" && change.original_value > 0) {
        // Feed rate increase directly reduces cutting time
        const speedup = change.optimized_value / change.original_value;
        totalReduction += (1 - 1 / speedup) * 10; // 10% weight per feed change
      }
    }

    return Math.min(40, totalReduction); // Cap at 40% reduction
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheShopAwareOptimizationEngine = new LatheShopAwareOptimizationEngine();
