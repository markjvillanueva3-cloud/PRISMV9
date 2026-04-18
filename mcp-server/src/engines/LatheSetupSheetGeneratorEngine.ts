/**
 * LatheSetupSheetGeneratorEngine — Operator Setup Documentation
 *
 * U-LTH39: Generates setup sheets for lathe programs.
 * Creates operator-friendly documentation with tool lists,
 * work holding requirements, and setup instructions.
 *
 * @module LatheSetupSheetGeneratorEngine
 */

import type { GeneratedProgram } from "./LatheProgramGeneratorEngine.js";
import type { ToolpathPlan, ToolChange } from "./LatheToolpathPlannerEngine.js";
import type { FeatureRecognitionResult } from "./LatheFeatureRecognitionEngine.js";
import type { BlueprintIntake } from "./LathePrintIngestPipelineEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tool list entry */
export interface SetupToolEntry {
  tool_number: number;
  tool_type: string;
  description: string;
  insert_spec?: string;
  holder_spec?: string;
  offset_number: number;
  operations: string[];
  notes?: string;
}

/** Work holding setup */
export interface WorkHoldingSetup {
  type: "chuck_3jaw" | "chuck_4jaw" | "collet" | "fixture" | "between_centers";
  jaw_type?: "soft" | "hard";
  grip_diameter_mm?: number;
  grip_length_mm?: number;
  stick_out_mm?: number;
  tailstock_required: boolean;
  tailstock_pressure?: number;
  notes?: string;
}

/** Stock specification */
export interface StockSpec {
  material: string;
  form: "round_bar" | "hex_bar" | "forging" | "casting";
  diameter_mm: number;
  length_mm: number;
  part_number?: string;
  heat_treat?: string;
}

/** Setup instruction step */
export interface SetupStep {
  step_number: number;
  category: "work_holding" | "tool_setup" | "program" | "inspection" | "safety";
  instruction: string;
  critical: boolean;
  estimated_time_min?: number;
}

/** Complete setup sheet */
export interface SetupSheet {
  sheet_id: string;
  generated_at: string;
  processing_time_ms: number;

  // Header info
  header: {
    program_number: number;
    program_name: string;
    part_number?: string;
    customer?: string;
    revision?: string;
    machine_id?: string;
    created_by: string;
  };

  // Stock
  stock: StockSpec;

  // Work holding
  work_holding: WorkHoldingSetup;

  // Tools
  tool_list: SetupToolEntry[];

  // Setup instructions
  setup_steps: SetupStep[];

  // Cycle info
  cycle_info: {
    estimated_cycle_time_sec: number;
    tool_changes: number;
    critical_dimensions: number;
    surface_finishes: number;
  };

  // Safety notes
  safety_notes: string[];

  // Quality checkpoints
  quality_checks: Array<{
    check: string;
    frequency: string;
    tolerance?: string;
  }>;

  // Formatted output
  formatted_text: string;
  formatted_html?: string;
}

/** Generation configuration */
export interface SetupSheetConfig {
  include_html?: boolean;
  operator_name?: string;
  machine_id?: string;
  include_safety?: boolean;
  include_quality?: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheSetupSheetGeneratorEngine {
  private sheetCounter = 0;

  /**
   * Generate setup sheet from pipeline results
   */
  generate(
    program: GeneratedProgram,
    plan: ToolpathPlan,
    recognition: FeatureRecognitionResult,
    intake: BlueprintIntake,
    config: SetupSheetConfig = {}
  ): SetupSheet {
    const startTime = Date.now();
    const sheetId = `setup_${++this.sheetCounter}_${Date.now()}`;

    // Build header
    const header = {
      program_number: program.header.program_number,
      program_name: program.header.program_name,
      part_number: intake.part_info.part_number,
      customer: intake.part_info.customer,
      revision: intake.part_info.revision,
      machine_id: config.machine_id || program.header.machine_id,
      created_by: config.operator_name || "PRISM"
    };

    // Build stock spec
    const stock = this.buildStockSpec(plan, intake);

    // Build work holding
    const workHolding = this.buildWorkHolding(stock, recognition);

    // Build tool list
    const toolList = this.buildToolList(plan.tool_changes);

    // Build setup steps
    const setupSteps = this.buildSetupSteps(toolList, workHolding, header, config);

    // Build safety notes
    const safetyNotes = config.include_safety !== false
      ? this.buildSafetyNotes(recognition, stock)
      : [];

    // Build quality checks
    const qualityChecks = config.include_quality !== false
      ? this.buildQualityChecks(recognition, intake)
      : [];

    // Build cycle info
    const cycleInfo = {
      estimated_cycle_time_sec: plan.total_cycle_time_sec,
      tool_changes: plan.total_tool_changes,
      critical_dimensions: intake.dimensions.filter(d =>
        (d.tolerance_plus + Math.abs(d.tolerance_minus)) < 0.05
      ).length,
      surface_finishes: intake.surface_finishes.length
    };

    // Generate formatted text
    const formattedText = this.formatAsText(
      header, stock, workHolding, toolList, setupSteps, cycleInfo, safetyNotes, qualityChecks
    );

    // Generate HTML if requested
    const formattedHtml = config.include_html
      ? this.formatAsHtml(header, stock, workHolding, toolList, setupSteps, cycleInfo, safetyNotes, qualityChecks)
      : undefined;

    return {
      sheet_id: sheetId,
      generated_at: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,

      header,
      stock,
      work_holding: workHolding,
      tool_list: toolList,
      setup_steps: setupSteps,
      cycle_info: cycleInfo,
      safety_notes: safetyNotes,
      quality_checks: qualityChecks,

      formatted_text: formattedText,
      formatted_html: formattedHtml
    };
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    total_sheets: number;
    supported_work_holding: string[];
    supported_stock_forms: string[];
  } {
    return {
      total_sheets: this.sheetCounter,
      supported_work_holding: ["chuck_3jaw", "chuck_4jaw", "collet", "fixture", "between_centers"],
      supported_stock_forms: ["round_bar", "hex_bar", "forging", "casting"]
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private buildStockSpec(plan: ToolpathPlan, intake: BlueprintIntake): StockSpec {
    return {
      material: intake.part_info.material || "Unknown",
      form: "round_bar",
      diameter_mm: plan.stock.diameter,
      length_mm: plan.stock.length,
      part_number: intake.part_info.part_number
    };
  }

  private buildWorkHolding(stock: StockSpec, recognition: FeatureRecognitionResult): WorkHoldingSetup {
    const hasID = recognition.summary.has_boring;
    const hasThreading = recognition.summary.has_threading;

    // Use defaults if stock dimensions not available
    const diameter = stock.diameter_mm || 50;
    const length = stock.length_mm || 100;

    // Determine grip length (rule of thumb: 1.5x diameter or minimum 25mm)
    const gripLength = Math.max(25, diameter * 1.5);

    // Stick out is total length minus grip (minimum 10mm)
    const stickOut = Math.max(10, length - gripLength);

    // Determine if tailstock is needed (long parts or threading)
    const lengthToDiameterRatio = diameter > 0 ? length / diameter : 2;
    const tailstockRequired = lengthToDiameterRatio > 4 || hasThreading;

    return {
      type: hasID ? "chuck_3jaw" : "chuck_3jaw",
      jaw_type: diameter < 50 ? "soft" : "hard",
      grip_diameter_mm: diameter,
      grip_length_mm: gripLength,
      stick_out_mm: stickOut,
      tailstock_required: tailstockRequired,
      tailstock_pressure: tailstockRequired ? 3 : undefined,
      notes: hasID ? "Ensure clear bore path for ID operations" : undefined
    };
  }

  private buildToolList(toolChanges: ToolChange[]): SetupToolEntry[] {
    const tools: SetupToolEntry[] = [];

    for (const tc of toolChanges) {
      const entry: SetupToolEntry = {
        tool_number: tc.tool_number,
        tool_type: tc.tool_type,
        description: tc.tool_description,
        offset_number: tc.tool_number,
        operations: tc.operations
      };

      // Add insert specs based on tool type
      if (tc.tool_type === "turning_external") {
        entry.insert_spec = "CNMG 120408";
        entry.holder_spec = "PCLNR 2020K-12";
      } else if (tc.tool_type === "boring") {
        entry.insert_spec = "CCMT 060204";
        entry.holder_spec = "S16Q-SCLCR-3";
      } else if (tc.tool_type.includes("threading")) {
        entry.insert_spec = "16ER 1.5 ISO";
        entry.holder_spec = "SER 2020K-16";
      } else if (tc.tool_type === "grooving_external") {
        entry.insert_spec = "GX24-3E3.0N";
        entry.holder_spec = "GFVR 2020K-3B";
      } else if (tc.tool_type === "drilling") {
        entry.insert_spec = "Carbide Drill";
      } else if (tc.tool_type === "parting") {
        entry.insert_spec = "N123G2-0300";
        entry.holder_spec = "LF123G13-2020B";
      }

      tools.push(entry);
    }

    return tools;
  }

  private buildSetupSteps(
    toolList: SetupToolEntry[],
    workHolding: WorkHoldingSetup,
    header: SetupSheet["header"],
    config: SetupSheetConfig
  ): SetupStep[] {
    const steps: SetupStep[] = [];
    let stepNum = 0;

    // Safety first
    steps.push({
      step_number: ++stepNum,
      category: "safety",
      instruction: "Ensure machine guards are in place and emergency stop is functional",
      critical: true
    });

    // Work holding setup
    steps.push({
      step_number: ++stepNum,
      category: "work_holding",
      instruction: `Mount ${workHolding.jaw_type} jaws on ${workHolding.type.replace("_", " ")}`,
      critical: true,
      estimated_time_min: 5
    });

    steps.push({
      step_number: ++stepNum,
      category: "work_holding",
      instruction: `Set jaw grip to Ø${workHolding.grip_diameter_mm}mm, grip length ${workHolding.grip_length_mm}mm`,
      critical: true,
      estimated_time_min: 3
    });

    if (workHolding.tailstock_required) {
      steps.push({
        step_number: ++stepNum,
        category: "work_holding",
        instruction: `Position tailstock with live center, pressure ${workHolding.tailstock_pressure} bar`,
        critical: true,
        estimated_time_min: 3
      });
    }

    // Tool setup
    for (const tool of toolList) {
      steps.push({
        step_number: ++stepNum,
        category: "tool_setup",
        instruction: `Load T${tool.tool_number}: ${tool.description}${tool.insert_spec ? ` (${tool.insert_spec})` : ""}`,
        critical: false,
        estimated_time_min: 2
      });
    }

    // Tool offsets
    steps.push({
      step_number: ++stepNum,
      category: "tool_setup",
      instruction: "Touch off all tools and set geometry offsets",
      critical: true,
      estimated_time_min: toolList.length * 3
    });

    // Program load
    steps.push({
      step_number: ++stepNum,
      category: "program",
      instruction: `Load program O${header.program_number} (${header.program_name})`,
      critical: true,
      estimated_time_min: 1
    });

    steps.push({
      step_number: ++stepNum,
      category: "program",
      instruction: "Verify work offsets (G54) are correct for stock position",
      critical: true,
      estimated_time_min: 2
    });

    steps.push({
      step_number: ++stepNum,
      category: "program",
      instruction: "Run single block through first tool to verify clearances",
      critical: true,
      estimated_time_min: 5
    });

    // First article inspection
    steps.push({
      step_number: ++stepNum,
      category: "inspection",
      instruction: "Complete first article inspection per quality requirements",
      critical: true,
      estimated_time_min: 10
    });

    return steps;
  }

  private buildSafetyNotes(recognition: FeatureRecognitionResult, stock: StockSpec): string[] {
    const notes: string[] = [];

    notes.push("Wear safety glasses at all times");
    notes.push("Keep hands clear of rotating chuck and workpiece");
    notes.push("Ensure chip guards are properly positioned");

    if (recognition.summary.has_threading) {
      notes.push("Threading: Verify spindle speed is within safe limits for thread pitch");
    }

    if (recognition.summary.has_grooving) {
      notes.push("Grooving: Watch for chip build-up, use appropriate coolant");
    }

    if (stock.diameter > 100) {
      notes.push("Large diameter workpiece: Use reduced spindle speeds");
    }

    if (recognition.feature_tree.complexity_score > 50) {
      notes.push("Complex part: Verify each operation before running in auto mode");
    }

    return notes;
  }

  private buildQualityChecks(
    recognition: FeatureRecognitionResult,
    intake: BlueprintIntake
  ): Array<{ check: string; frequency: string; tolerance?: string }> {
    const checks: Array<{ check: string; frequency: string; tolerance?: string }> = [];

    // Diameter checks
    const tightDiameters = intake.dimensions.filter(d =>
      d.type === "diameter" && (d.tolerance_plus + Math.abs(d.tolerance_minus)) < 0.05
    );

    for (const dim of tightDiameters.slice(0, 3)) {
      checks.push({
        check: `Ø${dim.nominal} diameter`,
        frequency: "Every part",
        tolerance: `+${dim.tolerance_plus}/-${Math.abs(dim.tolerance_minus)}`
      });
    }

    // Surface finish checks
    for (const sf of intake.surface_finishes.slice(0, 2)) {
      checks.push({
        check: `Surface finish ${sf.location || "critical surfaces"}`,
        frequency: "First article + every 10th",
        tolerance: `Ra ${sf.ra} ${sf.unit}`
      });
    }

    // Thread checks
    if (recognition.summary.has_threading) {
      checks.push({
        check: "Thread gauge check",
        frequency: "Every part",
        tolerance: "GO/NO-GO"
      });
    }

    // Length check
    checks.push({
      check: "Overall length",
      frequency: "Every part",
      tolerance: "Per print"
    });

    return checks;
  }

  private formatAsText(
    header: SetupSheet["header"],
    stock: StockSpec,
    workHolding: WorkHoldingSetup,
    toolList: SetupToolEntry[],
    setupSteps: SetupStep[],
    cycleInfo: SetupSheet["cycle_info"],
    safetyNotes: string[],
    qualityChecks: SetupSheet["quality_checks"]
  ): string {
    const lines: string[] = [];
    const divider = "=".repeat(60);
    const subDivider = "-".repeat(40);

    lines.push(divider);
    lines.push("LATHE SETUP SHEET");
    lines.push(divider);
    lines.push("");
    lines.push(`Program: O${header.program_number} - ${header.program_name}`);
    if (header.part_number) lines.push(`Part Number: ${header.part_number}`);
    if (header.customer) lines.push(`Customer: ${header.customer}`);
    if (header.machine_id) lines.push(`Machine: ${header.machine_id}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");

    lines.push(subDivider);
    lines.push("STOCK");
    lines.push(subDivider);
    lines.push(`Material: ${stock.material}`);
    lines.push(`Size: Ø${stock.diameter_mm}mm x ${stock.length_mm}mm`);
    lines.push(`Form: ${stock.form.replace("_", " ")}`);
    lines.push("");

    lines.push(subDivider);
    lines.push("WORK HOLDING");
    lines.push(subDivider);
    lines.push(`Type: ${workHolding.type.replace("_", " ")} (${workHolding.jaw_type} jaws)`);
    lines.push(`Grip: Ø${workHolding.grip_diameter_mm}mm x ${workHolding.grip_length_mm}mm`);
    lines.push(`Stick-out: ${workHolding.stick_out_mm}mm`);
    if (workHolding.tailstock_required) {
      lines.push(`Tailstock: Required (${workHolding.tailstock_pressure} bar)`);
    }
    lines.push("");

    lines.push(subDivider);
    lines.push("TOOL LIST");
    lines.push(subDivider);
    for (const tool of toolList) {
      lines.push(`T${String(tool.tool_number).padStart(2, "0")}: ${tool.description}`);
      if (tool.insert_spec) lines.push(`      Insert: ${tool.insert_spec}`);
    }
    lines.push("");

    lines.push(subDivider);
    lines.push("SETUP STEPS");
    lines.push(subDivider);
    for (const step of setupSteps) {
      const critical = step.critical ? " [CRITICAL]" : "";
      lines.push(`${step.step_number}. ${step.instruction}${critical}`);
    }
    lines.push("");

    lines.push(subDivider);
    lines.push("CYCLE INFO");
    lines.push(subDivider);
    const cycleMin = Math.floor(cycleInfo.estimated_cycle_time_sec / 60);
    const cycleSec = cycleInfo.estimated_cycle_time_sec % 60;
    lines.push(`Estimated Cycle Time: ${cycleMin}:${String(cycleSec).padStart(2, "0")}`);
    lines.push(`Tool Changes: ${cycleInfo.tool_changes}`);
    lines.push("");

    if (qualityChecks.length > 0) {
      lines.push(subDivider);
      lines.push("QUALITY CHECKS");
      lines.push(subDivider);
      for (const check of qualityChecks) {
        lines.push(`• ${check.check} (${check.frequency})${check.tolerance ? ` - ${check.tolerance}` : ""}`);
      }
      lines.push("");
    }

    if (safetyNotes.length > 0) {
      lines.push(subDivider);
      lines.push("SAFETY NOTES");
      lines.push(subDivider);
      for (const note of safetyNotes) {
        lines.push(`⚠ ${note}`);
      }
    }

    lines.push("");
    lines.push(divider);

    return lines.join("\n");
  }

  private formatAsHtml(
    header: SetupSheet["header"],
    stock: StockSpec,
    workHolding: WorkHoldingSetup,
    toolList: SetupToolEntry[],
    setupSteps: SetupStep[],
    cycleInfo: SetupSheet["cycle_info"],
    safetyNotes: string[],
    qualityChecks: SetupSheet["quality_checks"]
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Setup Sheet - O${header.program_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; border-bottom: 2px solid #333; }
    h2 { background: #f0f0f0; padding: 8px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .critical { color: red; font-weight: bold; }
    .safety { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }
    .quality { background: #d4edda; padding: 10px; border-left: 4px solid #28a745; }
  </style>
</head>
<body>
  <h1>Lathe Setup Sheet</h1>
  <p><strong>Program:</strong> O${header.program_number} - ${header.program_name}</p>
  ${header.part_number ? `<p><strong>Part:</strong> ${header.part_number}</p>` : ""}
  ${header.customer ? `<p><strong>Customer:</strong> ${header.customer}</p>` : ""}

  <h2>Stock</h2>
  <p>${stock.material} - Ø${stock.diameter_mm}mm x ${stock.length_mm}mm</p>

  <h2>Work Holding</h2>
  <p>${workHolding.type.replace("_", " ")} with ${workHolding.jaw_type} jaws</p>
  <p>Grip: Ø${workHolding.grip_diameter_mm}mm, Stick-out: ${workHolding.stick_out_mm}mm</p>

  <h2>Tool List</h2>
  <table>
    <tr><th>Tool</th><th>Description</th><th>Insert</th></tr>
    ${toolList.map(t => `<tr><td>T${t.tool_number}</td><td>${t.description}</td><td>${t.insert_spec || "-"}</td></tr>`).join("")}
  </table>

  <h2>Setup Steps</h2>
  <ol>
    ${setupSteps.map(s => `<li${s.critical ? ' class="critical"' : ""}>${s.instruction}</li>`).join("")}
  </ol>

  ${qualityChecks.length > 0 ? `
  <h2>Quality Checks</h2>
  <div class="quality">
    <ul>
      ${qualityChecks.map(c => `<li><strong>${c.check}</strong> - ${c.frequency}${c.tolerance ? ` (${c.tolerance})` : ""}</li>`).join("")}
    </ul>
  </div>
  ` : ""}

  ${safetyNotes.length > 0 ? `
  <h2>Safety Notes</h2>
  <div class="safety">
    <ul>
      ${safetyNotes.map(n => `<li>${n}</li>`).join("")}
    </ul>
  </div>
  ` : ""}

</body>
</html>`;
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheSetupSheetGeneratorEngine = new LatheSetupSheetGeneratorEngine();
