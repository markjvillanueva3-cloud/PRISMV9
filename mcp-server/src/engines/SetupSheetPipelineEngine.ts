/**
 * SetupSheetPipelineEngine — Operator Setup Sheet Pipeline (U-MIO35)
 * ===================================================================
 *
 * Composes a complete, operator-ready setup sheet from:
 *   - Per-op tool list with magazine pocket assignments and assembly IDs
 *   - Offset presetting recommendations (length/diameter) per tool
 *   - Workholding & fixture instructions (WCS, clamp torque, stops)
 *   - Probing routine (optional work-offset probing, first-piece verification)
 *   - First-part verification checklist (critical dims, inspection gates)
 *
 * Differs from SetupSheetEngine (single-op shop-floor card): this pipeline
 * builds the full multi-op setup package bound to a routing id + control
 * plan id, with cross-linked inspection checkpoints. Output is the
 * single-source-of-truth handoff document between programmer and operator.
 *
 * Design contract:
 *   - Inputs are declarative (no physics calcs)
 *   - Outputs deterministic (no Date.now outside created timestamp)
 *   - Never throws in empty-list path *except* for "at least one op required"
 *
 * References:
 *   - AIAG APQP 2nd Ed §5.7: Pre-launch control plan and setup docs
 *   - NIMS "CNC Turning Operations" setup sheet standard
 *   - JM Die Company shop floor practice: Okuma/Haas/Hurco/Mitsubishi
 *
 * @module engines/SetupSheetPipelineEngine
 * @milestone MIO-MS0 U-MIO35
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type OffsetType = "length" | "diameter" | "wear" | "geometry";
export type OffsetMethod = "presetter" | "probe" | "touch-off" | "inherited";
export type ClampType = "vise" | "chuck" | "collet" | "magnetic" | "vacuum" | "soft_jaws" | "fixture_plate";

export interface SetupPipelineTool {
  /** Tool id, e.g. "T01" or "T23" */
  tool_id: string;
  /** Magazine pocket assignment (1-indexed). 0 = spindle/no-pocket (lathe gang) */
  pocket: number;
  /** Cutting tool description, e.g. "Ø12mm 4fl TiAlN endmill" */
  description: string;
  /** Assembly holder id (ER32, HSK63, BT30...) */
  holder_id?: string;
  /** Stickout/gauge length, mm */
  stickout_mm?: number;
  /** Tool life budget, minutes (from Taylor or registry) */
  life_budget_min?: number;
  /** Offsets to preset */
  offsets: {
    type: OffsetType;
    method: OffsetMethod;
    /** nominal value for reference (tool length, diameter, etc.) */
    nominal?: number;
    unit?: "mm" | "in";
  }[];
  /** Notes (coating, grade, spindle direction override, etc.) */
  notes?: string;
}

export interface SetupPipelineOperationInput {
  op_num: number;
  op_name: string;
  machine_id: string;
  wcs: "G54" | "G55" | "G56" | "G57" | "G58" | "G59";
  /** Tools used for this op */
  tools: SetupPipelineTool[];
  /** Workholding info */
  workholding: {
    clamp_type: ClampType;
    clamp_id?: string;
    /** Clamp torque spec, N·m */
    clamp_torque_nm?: number;
    /** Stops/positioning notes */
    stop_instructions?: string;
    fixture_id?: string;
  };
  /** Stock orientation / part loading */
  stock: {
    dims_mm: [number, number, number];
    orientation?: string;
    datum_face?: string;
  };
  /** Optional probing routine — run at setup or first-piece */
  probing?: {
    routine: "wcs_find" | "feature_probe" | "length_probe" | "none";
    cycle_number?: string; // e.g., "G65 P9801"
    notes?: string;
  };
  notes?: string;
}

export interface FirstPartCheckpoint {
  /** Reference to ControlPlan feature_id (cross-link) */
  feature_id: string;
  feature_name: string;
  /** Severity inherited from control plan */
  severity: "critical" | "major" | "minor";
  /** After which op does inspection happen */
  after_op: number;
  gage_id?: string;
  /** What to check before continuing run */
  instruction: string;
}

export interface SetupSheetPipelineInput {
  part_number: string;
  revision: string;
  job_id?: string;
  customer?: string;
  quantity?: number;
  /** Routing id from U-MIO33 */
  routing_id?: string;
  /** Control plan id from U-MIO34 */
  control_plan_id?: string;
  programmer?: string;
  operators?: string[];
  operations: SetupPipelineOperationInput[];
  first_part_checks?: FirstPartCheckpoint[];
  /** Extra safety notes (e.g. "Coolant ON before spindle start") */
  safety_notes?: string[];
}

export interface SetupSheetPipelineOperation extends SetupPipelineOperationInput {
  tool_count: number;
  pocket_collisions: string[]; // feature_id list of tools sharing a pocket
  offsets_to_preset: number;
}

export interface SetupSheetPipelineSummary {
  operation_count: number;
  total_tools: number;
  unique_tools: number;
  unique_pockets: number;
  probing_ops: number;
  critical_checkpoints: number;
  major_checkpoints: number;
  minor_checkpoints: number;
  warnings: string[];
}

export interface SetupSheetPipeline {
  setup_id: string;
  part_number: string;
  revision: string;
  job_id: string;
  customer: string;
  quantity: number;
  routing_id: string;
  control_plan_id: string;
  programmer: string;
  operators: string[];
  created: string;
  operations: SetupSheetPipelineOperation[];
  first_part_checks: FirstPartCheckpoint[];
  safety_notes: string[];
  summary: SetupSheetPipelineSummary;
}

export interface SetupSheetPipelineForms {
  json: SetupSheetPipeline;
  markdown: string;
  csv: string;
}

// ── Engine ─────────────────────────────────────────────────────────────────

import { emitPipelineOutcome } from "./pipelineOutcomeEmit.js"; // CLOSE-THE-LOOPS-MS0: feed generation outcomes to the learning bus

// WIRE-EXEMPT: consumed by MachiningIntelligenceOrchestratorEngine (orchestrator layer, not a dispatcher).
// generate() now also publishes a DATA outcome to the learning bus via emitPipelineOutcome (CLOSE-THE-LOOPS-MS0).
export class SetupSheetPipelineEngine {
  private store: Map<string, SetupSheetPipeline> = new Map();
  private counter = 0;

  /**
   * Build a complete setup sheet pipeline.
   *
   * @throws if operations list is empty
   */
  generate(input: SetupSheetPipelineInput): SetupSheetPipeline {
    if (!input.operations || input.operations.length === 0) {
      throw new Error("SetupSheetPipeline: at least one operation required");
    }

    const warnings: string[] = [];

    // Per-op enrichment + pocket conflict detection
    const operations: SetupSheetPipelineOperation[] = input.operations.map(op => {
      const pocketMap = new Map<number, string[]>();
      for (const t of op.tools) {
        if (!pocketMap.has(t.pocket)) pocketMap.set(t.pocket, []);
        pocketMap.get(t.pocket)!.push(t.tool_id);
      }
      const collisions: string[] = [];
      for (const [pocket, ids] of pocketMap.entries()) {
        if (pocket > 0 && ids.length > 1) {
          collisions.push(...ids);
          warnings.push(
            `Op ${op.op_num}: pocket ${pocket} assigned to multiple tools (${ids.join(", ")})`,
          );
        }
      }

      const offsetCount = op.tools.reduce((acc, t) => acc + t.offsets.length, 0);

      // Tool sanity warnings
      for (const t of op.tools) {
        if (t.stickout_mm !== undefined && t.stickout_mm <= 0) {
          warnings.push(`Op ${op.op_num} tool ${t.tool_id}: invalid stickout ${t.stickout_mm}`);
        }
        if (t.offsets.length === 0) {
          warnings.push(`Op ${op.op_num} tool ${t.tool_id}: no offsets defined`);
        }
      }

      return {
        ...op,
        tool_count: op.tools.length,
        pocket_collisions: collisions,
        offsets_to_preset: offsetCount,
      };
    });

    // Check op_num monotonicity
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].op_num <= operations[i - 1].op_num) {
        warnings.push(
          `Operation sequence not strictly monotonic: op ${operations[i].op_num} follows op ${operations[i - 1].op_num}`,
        );
      }
    }

    // First-part check cross-link to operations
    const checks = input.first_part_checks ?? [];
    const opNums = new Set(operations.map(o => o.op_num));
    for (const c of checks) {
      if (!opNums.has(c.after_op)) {
        warnings.push(
          `First-part check ${c.feature_id}: after_op=${c.after_op} does not match any operation`,
        );
      }
    }

    // Summary rollup
    const allTools = operations.flatMap(o => o.tools);
    const uniqueToolIds = new Set(allTools.map(t => t.tool_id));
    const uniquePockets = new Set(allTools.map(t => t.pocket).filter(p => p > 0));
    const probingOps = operations.filter(
      o => o.probing && o.probing.routine !== "none",
    ).length;

    this.counter++;
    const setupId = `SU-${String(this.counter).padStart(5, "0")}`;

    const pipeline: SetupSheetPipeline = {
      setup_id: setupId,
      part_number: input.part_number,
      revision: input.revision,
      job_id: input.job_id ?? "N/A",
      customer: input.customer ?? "N/A",
      quantity: input.quantity ?? 1,
      routing_id: input.routing_id ?? "N/A",
      control_plan_id: input.control_plan_id ?? "N/A",
      programmer: input.programmer ?? "N/A",
      operators: input.operators ?? [],
      created: new Date().toISOString(),
      operations,
      first_part_checks: checks,
      safety_notes: input.safety_notes ?? [],
      summary: {
        operation_count: operations.length,
        total_tools: allTools.length,
        unique_tools: uniqueToolIds.size,
        unique_pockets: uniquePockets.size,
        probing_ops: probingOps,
        critical_checkpoints: checks.filter(c => c.severity === "critical").length,
        major_checkpoints: checks.filter(c => c.severity === "major").length,
        minor_checkpoints: checks.filter(c => c.severity === "minor").length,
        warnings,
      },
    };

    this.store.set(setupId, pipeline);
    // CLOSE-THE-LOOPS-MS0: DATA-only, fire-and-forget -- a setup sheet must still render if the bus is down.
    emitPipelineOutcome({
      domain: "setup_sheet",
      engineName: "SetupSheetPipelineEngine",
      outcomeEventId: "setup_sheet_generated",
      predictionId: input.job_id ? `${input.job_id}-setup` : undefined,
      inline: { part_number: input.part_number, customer: input.customer ?? "N/A" },
      adapted: { operation_count: operations.length, total_tools: allTools.length, unique_tools: uniqueToolIds.size },
      reward: { objective: "other", raw_value: operations.length, sign_convention: "maximize" },
      metadata: { setup_id: setupId, warning_count: warnings.length },
    });
    return pipeline;
  }

  /** Retrieve pipeline by id */
  get(setup_id: string): SetupSheetPipeline | null {
    return this.store.get(setup_id) ?? null;
  }

  /** Generate JSON + Markdown + CSV in one shot */
  generateAll(input: SetupSheetPipelineInput): SetupSheetPipelineForms {
    const pipeline = this.generate(input);
    return {
      json: pipeline,
      markdown: this.renderMarkdown(pipeline),
      csv: this.renderCSV(pipeline),
    };
  }

  renderMarkdown(p: SetupSheetPipeline): string {
    const out: string[] = [];
    out.push(`# Setup Sheet ${p.setup_id}`);
    out.push("");
    out.push(`| Field | Value |`);
    out.push(`|-------|-------|`);
    out.push(`| Part | ${p.part_number} Rev ${p.revision} |`);
    out.push(`| Job | ${p.job_id} |`);
    out.push(`| Customer | ${p.customer} |`);
    out.push(`| Quantity | ${p.quantity} |`);
    out.push(`| Routing | ${p.routing_id} |`);
    out.push(`| Control Plan | ${p.control_plan_id} |`);
    out.push(`| Programmer | ${p.programmer} |`);
    out.push(`| Operators | ${p.operators.join(", ") || "—"} |`);
    out.push(`| Created | ${p.created} |`);
    out.push("");

    for (const op of p.operations) {
      out.push(`## Op ${op.op_num} — ${op.op_name}`);
      out.push("");
      out.push(`**Machine:** ${op.machine_id}  |  **WCS:** ${op.wcs}  |  **Stock:** ${op.stock.dims_mm.join("×")} mm`);
      out.push("");
      out.push(`### Workholding`);
      out.push(
        `- Type: **${op.workholding.clamp_type}**` +
          (op.workholding.clamp_id ? ` (${op.workholding.clamp_id})` : "") +
          (op.workholding.clamp_torque_nm ? ` — torque ${op.workholding.clamp_torque_nm} N·m` : ""),
      );
      if (op.workholding.fixture_id) out.push(`- Fixture: ${op.workholding.fixture_id}`);
      if (op.workholding.stop_instructions) out.push(`- Stops: ${op.workholding.stop_instructions}`);
      out.push("");

      out.push(`### Tools (${op.tools.length})`);
      out.push(`| Pocket | Tool | Description | Holder | Stickout | Offsets | Life | Notes |`);
      out.push(`|--------|------|-------------|--------|----------|---------|------|-------|`);
      for (const t of op.tools) {
        const offsetStr = t.offsets.map(o => `${o.type}:${o.method}`).join(", ");
        out.push(
          `| ${t.pocket} | ${t.tool_id} | ${t.description} | ${t.holder_id ?? "—"} | ${t.stickout_mm ?? "—"} mm | ${offsetStr} | ${t.life_budget_min ?? "—"} min | ${t.notes ?? ""} |`,
        );
      }
      out.push("");

      if (op.probing && op.probing.routine !== "none") {
        out.push(`### Probing`);
        out.push(`- Routine: ${op.probing.routine}`);
        if (op.probing.cycle_number) out.push(`- Cycle: ${op.probing.cycle_number}`);
        if (op.probing.notes) out.push(`- ${op.probing.notes}`);
        out.push("");
      }

      if (op.notes) {
        out.push(`### Notes`);
        out.push(op.notes);
        out.push("");
      }
    }

    if (p.first_part_checks.length > 0) {
      out.push(`## First-Part Verification Checklist`);
      out.push("");
      out.push(`| Feature | Severity | After Op | Gage | Check |`);
      out.push(`|---------|----------|----------|------|-------|`);
      for (const c of p.first_part_checks) {
        out.push(`| ${c.feature_name} (${c.feature_id}) | ${c.severity} | ${c.after_op} | ${c.gage_id ?? "—"} | ${c.instruction} |`);
      }
      out.push("");
    }

    if (p.safety_notes.length > 0) {
      out.push(`## Safety Notes`);
      for (const n of p.safety_notes) out.push(`- ⚠ ${n}`);
      out.push("");
    }

    out.push(`## Summary`);
    out.push(`- **Operations:** ${p.summary.operation_count}`);
    out.push(`- **Total tools:** ${p.summary.total_tools}`);
    out.push(`- **Unique tool IDs:** ${p.summary.unique_tools}`);
    out.push(`- **Unique pockets:** ${p.summary.unique_pockets}`);
    out.push(`- **Probing ops:** ${p.summary.probing_ops}`);
    out.push(`- **First-part checks:** ${p.first_part_checks.length} (C=${p.summary.critical_checkpoints}/M=${p.summary.major_checkpoints}/m=${p.summary.minor_checkpoints})`);
    if (p.summary.warnings.length > 0) {
      out.push("");
      out.push(`## Warnings`);
      for (const w of p.summary.warnings) out.push(`- ⚠ ${w}`);
    }
    return out.join("\n");
  }

  renderCSV(p: SetupSheetPipeline): string {
    const header = [
      "setup_id", "op_num", "op_name", "machine_id", "wcs",
      "pocket", "tool_id", "description", "holder_id",
      "stickout_mm", "offset_types", "life_budget_min", "tool_notes",
    ];
    const lines: string[] = [header.join(",")];
    for (const op of p.operations) {
      for (const t of op.tools) {
        lines.push([
          p.setup_id,
          op.op_num,
          csv(op.op_name),
          op.machine_id,
          op.wcs,
          t.pocket,
          t.tool_id,
          csv(t.description),
          t.holder_id ?? "",
          t.stickout_mm ?? "",
          csv(t.offsets.map(o => o.type).join("|")),
          t.life_budget_min ?? "",
          csv(t.notes ?? ""),
        ].join(","));
      }
    }
    return lines.join("\n");
  }

  /** Clear in-memory store */
  reset(): void {
    this.store.clear();
    this.counter = 0;
  }
}

function csv(v: string): string {
  if (!v) return "";
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export const setupSheetPipelineEngine = new SetupSheetPipelineEngine();
