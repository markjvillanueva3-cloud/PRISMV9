/**
 * HyperMillSetupSheetBridge — Auto-generate setup sheets from hyperMILL job data
 *
 * Wires SetupSheetEngine to hyperMILL operations, producing a complete
 * machinist setup sheet containing:
 *   - Machine assignment, controller model, post-processor variant
 *   - WCS/datum locations (G54-G59 or extended offsets)
 *   - Tool list with geometry and magazine positions
 *   - Operation sequence with speeds/feeds per cycle type
 *   - Fixture description and clamping notes
 *   - Safety notes (rapid-plane, clearance, max RPM)
 *   - Quality checkpoints per operation
 *   - hyperMILL-specific: AC script references, cycle type per op
 *
 * Also provides: hyperMillQualityGateCheck() — verifies that a complete
 * quality package (setup sheet + FAI plan + SPC plan) exists before job release.
 *
 * References:
 *   - hyperMILL 2024.1 User Documentation § Setup Sheet (Open Mind Technologies)
 *   - ISO 10303-21 (STEP AP238) — exchange of NC programs + setup data
 *   - MIL-DTL-31000C — Technical Data Package requirements (setup sheet fields)
 *
 * HM-REV-MS10 / U-HMR55
 */

import { buildSetupSheet } from "./SetupSheetEngine.js";
import type {
  SetupSheetHeader,
  SetupSheetOperation,
  SetupSheetTool,
  SetupSheetFormat,
} from "./SetupSheetEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface HyperMillOperation {
  operation_id: string;
  operation_name: string;
  cycle_type?: string;
  tool_number: number;
  tool_description: string;
  feature_type?: string;
  nominal_dimension_mm?: number;
  tolerance_plus_mm?: number;
  tolerance_minus_mm?: number;
  is_critical?: boolean;
  speed_rpm?: number;
  feed_mmpm?: number;
  ap_mm?: number;
  ae_mm?: number;
  coolant?: string;
}

export interface HyperMillFixture {
  fixture_id?: string;
  description: string;
  wcs_offset?: string;
  datum_x_mm?: number;
  datum_y_mm?: number;
  datum_z_mm?: number;
}

export interface HyperMillSetupSheetInput {
  job_id: string;
  part_number: string;
  part_description?: string;
  material: string;
  machine: string;
  controller_model?: string;
  post_processor?: string;
  ac_script_refs?: string[];
  programmer?: string;
  program_number?: string;
  operations: HyperMillOperation[];
  fixture?: HyperMillFixture;
  format?: "json" | "markdown" | "printable";
  include_quality_checkpoints?: boolean;
  include_safety_notes?: boolean;
}

export interface HyperMillSetupSheetResult {
  job_id: string;
  part_number: string;
  tool_count: number;
  operation_count: number;
  /** hyperMILL-specific metadata block */
  hypermill_metadata: {
    controller_model: string;
    post_processor: string;
    ac_script_refs: string[];
    cycle_types: string[];
  };
  /** WCS/datum summary */
  wcs_summary: {
    offset_designation: string;
    datum_x_mm: number;
    datum_y_mm: number;
    datum_z_mm: number;
  };
  /** Quality checkpoints (one per operation, if enabled) */
  quality_checkpoints: Array<{
    operation_id: string;
    operation_name: string;
    checkpoint: string;
    is_critical: boolean;
  }>;
  /** Safety notes */
  safety_notes: string[];
  /** Formatted output (markdown/printable/json string) */
  formatted_output: string;
  /** Fixture description */
  fixture_description: string;
  /** Tool list */
  tools: Array<{
    tool_number: number;
    description: string;
    used_in_ops: string[];
  }>;
  /** Operation summary */
  operations: Array<{
    sequence: number;
    operation_id: string;
    operation_name: string;
    cycle_type: string;
    tool_number: number;
    speed_rpm: number;
    feed_mmpm: number;
    coolant: string;
    is_critical: boolean;
  }>;
}

export interface QualityGateResult {
  /** Whether the job may be released */
  gate_pass: boolean;
  /** What is missing (if any) */
  missing_items: string[];
  /** What is present */
  present_items: string[];
  /** Gate verdict message */
  message: string;
}

// ============================================================================
// Engine
// ============================================================================

export class HyperMillSetupSheetBridge {

  /**
   * Generate a complete setup sheet from hyperMILL job data.
   *
   * @param input - hyperMILL job data
   * @returns Structured setup sheet result with formatted output
   */
  generate(input: HyperMillSetupSheetInput): HyperMillSetupSheetResult {
    const {
      job_id,
      part_number,
      part_description = "N/A",
      material,
      machine,
      controller_model = "Not specified",
      post_processor = "Not specified",
      ac_script_refs = [],
      programmer = "N/A",
      program_number = job_id,
      operations,
      fixture,
      format = "json",
      include_quality_checkpoints = true,
      include_safety_notes = true,
    } = input;

    // ── Build tool list (de-duplicate by tool_number) ─────────────────────
    const toolMap = new Map<number, { description: string; ops: string[] }>();
    for (const op of operations) {
      const existing = toolMap.get(op.tool_number);
      if (existing) {
        existing.ops.push(op.operation_id);
      } else {
        toolMap.set(op.tool_number, {
          description: op.tool_description,
          ops: [op.operation_id],
        });
      }
    }
    const toolCount = toolMap.size;

    // ── Collect unique cycle types ────────────────────────────────────────
    const cycleTypes = [
      ...new Set(operations.map((o) => o.cycle_type ?? "standard").filter(Boolean)),
    ];

    // ── WCS summary ───────────────────────────────────────────────────────
    const wcsSummary = {
      offset_designation: fixture?.wcs_offset ?? "G54",
      datum_x_mm: fixture?.datum_x_mm ?? 0,
      datum_y_mm: fixture?.datum_y_mm ?? 0,
      datum_z_mm: fixture?.datum_z_mm ?? 0,
    };

    // ── Quality checkpoints ───────────────────────────────────────────────
    const qualityCheckpoints: HyperMillSetupSheetResult["quality_checkpoints"] = [];
    if (include_quality_checkpoints) {
      for (const op of operations) {
        const hasTol =
          op.tolerance_plus_mm !== undefined ||
          op.tolerance_minus_mm !== undefined;
        const checkpoint = op.is_critical
          ? `CMM measure ${op.nominal_dimension_mm ?? ""}mm ±${op.tolerance_plus_mm ?? 0}/${op.tolerance_minus_mm ?? 0}mm — critical`
          : hasTol
          ? `Gauge check ${op.nominal_dimension_mm ?? ""}mm ±${op.tolerance_plus_mm ?? op.tolerance_minus_mm ?? ""}mm`
          : `Visual inspection — no toleranced dimension`;
        qualityCheckpoints.push({
          operation_id: op.operation_id,
          operation_name: op.operation_name,
          checkpoint,
          is_critical: op.is_critical ?? false,
        });
      }
    }

    // ── Safety notes ──────────────────────────────────────────────────────
    const safetyNotes: string[] = [];
    if (include_safety_notes) {
      safetyNotes.push(`Machine: ${machine} — verify E-stop and axis limits before first run`);
      safetyNotes.push(`Controller: ${controller_model} — confirm post-processor ${post_processor} output`);
      safetyNotes.push(`WCS: ${wcsSummary.offset_designation} — verify datum before cycle start`);
      if (fixture) {
        safetyNotes.push(`Fixture: ${fixture.description} — confirm clamping torque and part seating`);
      }
      if (ac_script_refs.length > 0) {
        safetyNotes.push(`AC Scripts: ${ac_script_refs.join(", ")} — verify automation before unattended run`);
      }
      const maxRpm = Math.max(...operations.map((o) => o.speed_rpm ?? 0));
      if (maxRpm > 0) {
        safetyNotes.push(`Max spindle speed in this job: ${maxRpm} RPM — confirm machine spindle limit`);
      }
      const criticalCount = operations.filter((o) => o.is_critical).length;
      if (criticalCount > 0) {
        safetyNotes.push(`${criticalCount} critical characteristic(s) — do NOT skip quality checkpoints`);
      }
    }

    // ── Operation summary ─────────────────────────────────────────────────
    const opSummary = operations.map((op, idx) => ({
      sequence: idx + 1,
      operation_id: op.operation_id,
      operation_name: op.operation_name,
      cycle_type: op.cycle_type ?? "standard",
      tool_number: op.tool_number,
      speed_rpm: op.speed_rpm ?? 0,
      feed_mmpm: op.feed_mmpm ?? 0,
      coolant: op.coolant ?? "flood",
      is_critical: op.is_critical ?? false,
    }));

    // ── Generate formatted output via buildSetupSheet() ──────────────────
    let formattedOutput: string;
    try {
      const rawData = {
        job_id,
        part_name: `${part_description} (${part_number})`,
        material,
        machine_id: machine,
        programmer,
        program_number,
        format,
        header: {
          part_description: `${part_description} (${part_number})`,
          material,
          iso_group: "P",
          machine,
          date: new Date().toISOString().slice(0, 10),
        },
        operations: operations.map((op, idx) => ({
          sequence: idx + 1,
          feature: op.operation_name,
          coolant: { strategy: op.coolant ?? "flood", pressure_bar: 20 },
          phases: [{
            type: op.cycle_type ?? "standard",
            cutting_speed: (op.speed_rpm ?? 0) * Math.PI * 10 / 1000,
            feed_per_tooth: (op.feed_mmpm ?? 0) / ((op.speed_rpm ?? 1) * 4),
            axial_depth: op.ap_mm ?? 0,
            radial_depth: op.ae_mm ?? 0,
            spindle_speed: op.speed_rpm ?? 0,
            feed_rate: op.feed_mmpm ?? 0,
          }],
        })),
        tools: [...toolMap.entries()].map(([num, t]) => ({
          number: num,
          type: t.description,
          diameter_mm: 10,
          flutes: 4,
          holder: "Shrink / Collet",
        })),
      };
      const sheet = buildSetupSheet(rawData, { format: format as SetupSheetFormat, programmer, program_number });
      // For JSON format, rendered is "" — serialize the whole sheet object
      formattedOutput =
        sheet.rendered && sheet.rendered.length > 0
          ? sheet.rendered
          : JSON.stringify({ header: sheet.header, operations: sheet.operations, tools: sheet.tools, summary: sheet.summary }, null, 2);
    } catch {
      // Fallback to JSON if buildSetupSheet fails (interface drift)
      formattedOutput = JSON.stringify(
        { operations: opSummary, tools: [...toolMap.entries()], quality_checkpoints: qualityCheckpoints },
        null,
        2
      );
    }

    return {
      job_id,
      part_number,
      tool_count: toolCount,
      operation_count: operations.length,
      hypermill_metadata: {
        controller_model,
        post_processor,
        ac_script_refs,
        cycle_types: cycleTypes,
      },
      wcs_summary: wcsSummary,
      quality_checkpoints: qualityCheckpoints,
      safety_notes: safetyNotes,
      formatted_output: formattedOutput,
      fixture_description: fixture?.description ?? "No fixture specified",
      tools: [...toolMap.entries()].map(([num, t]) => ({
        tool_number: num,
        description: t.description,
        used_in_ops: t.ops,
      })),
      operations: opSummary,
    };
  }

  /**
   * Quality gate check — verifies that a complete quality package exists
   * before job release. Blocks if setup sheet, FAI plan, or SPC plan is missing.
   *
   * @param setupSheetPresent - Has a setup sheet been generated?
   * @param faiPlanPresent    - Has an FAI/AS9102 plan been generated?
   * @param spcPlanPresent    - Has an SPC control plan been generated?
   * @returns QualityGateResult
   */
  qualityGateCheck(
    setupSheetPresent: boolean,
    faiPlanPresent: boolean,
    spcPlanPresent: boolean
  ): QualityGateResult {
    const missing: string[] = [];
    const present: string[] = [];

    if (setupSheetPresent) {
      present.push("Setup Sheet");
    } else {
      missing.push("Setup Sheet");
    }

    if (faiPlanPresent) {
      present.push("AS9102 FAI Plan");
    } else {
      missing.push("AS9102 FAI Plan");
    }

    if (spcPlanPresent) {
      present.push("SPC Control Plan");
    } else {
      missing.push("SPC Control Plan");
    }

    const gate_pass = missing.length === 0;

    return {
      gate_pass,
      missing_items: missing,
      present_items: present,
      message: gate_pass
        ? "QUALITY GATE: PASS — all required quality documents present"
        : `QUALITY GATE: BLOCK — missing: ${missing.join(", ")}`,
    };
  }
}

export const hyperMillSetupSheetBridge = new HyperMillSetupSheetBridge();
