/**
 * LathePrintProgramEmitterEngine — U-LTH40 (LATHE-MASTER P4)
 *
 * Emits controller-specific G-code from the toolpath program and attaches a
 * signoff dossier. Built to be Master-Post-ready (P3) but operates standalone
 * via built-in controller dialects until Master Post fine-tuning completes.
 *
 * Supported controllers: Fanuc, Haas, Okuma OSP, Mitsubishi, Mazak, Siemens, Generic.
 *
 * @milestone LATHE-MASTER U-LTH40
 * @version 1.0.0
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ToolpathProgram, ToolpathOperation, ToolpathMove } from "./LathePrintToolpathGeneratorEngine.js";
import {
  makeDefaultConsensusVote,
  publishOutcomeToFeedbackBus,
  ORCHESTRATE_STAGE,
  type ConsensusVoteQuery,
  type ConsensusVoteVerdict,
} from "./domainAGIAdapterKit.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

// ============================================================================
// CONTROLLER DIALECTS
// ============================================================================

/**
 * Thrown when the toolpath violates the declared machine envelope and the
 * caller has not explicitly opted into override. ISO 16090-1 §5.3.2 requires
 * the controller to reject motion outside the declared work envelope; PRISM
 * enforces the same at emission time so a non-conforming program cannot reach
 * the post/controller in the first place.
 */
export class EnvelopeBlockError extends Error {
  readonly code = "ENVELOPE_BLOCKED" as const;
  readonly detail: {
    max_x_mm: number;
    max_z_mm: number;
    min_x_mm: number;
    min_z_mm: number;
  };
  constructor(check: {
    max_x_mm: number;
    max_z_mm: number;
    min_x_mm: number;
    min_z_mm: number;
    within_envelope: boolean;
  }) {
    super(
      `ENVELOPE_BLOCKED: toolpath exceeds declared machine envelope ` +
        `(X[${check.min_x_mm.toFixed(1)}..${check.max_x_mm.toFixed(1)}] mm, ` +
        `Z[${check.min_z_mm.toFixed(1)}..${check.max_z_mm.toFixed(1)}] mm). ` +
        `Refusing to emit G-code. Set allow_envelope_override=true with ` +
        `written machinist sign-off to bypass (emits with audit warning and ` +
        `fails validation).`,
    );
    this.detail = {
      max_x_mm: check.max_x_mm,
      max_z_mm: check.max_z_mm,
      min_x_mm: check.min_x_mm,
      min_z_mm: check.min_z_mm,
    };
    this.name = "EnvelopeBlockError";
  }
}

export type ControllerFamily = "fanuc" | "haas" | "okuma_osp" | "mitsubishi" | "mazak" | "siemens" | "generic";

interface ControllerDialect {
  family: ControllerFamily;
  program_start: string[];
  program_end: string[];
  tool_change: (toolStation: string) => string;
  spindle_on: (rpm: number) => string;
  spindle_off: string;
  coolant_on: string;
  coolant_off: string;
  css_on: (surface_speed_m_min: number, max_rpm: number) => string;
  css_off: string;
  peck_drill: (x: number, z: number, peck_depth_mm: number, feed: number) => string;
  thread_cycle: (x: number, z: number, pitch: number, depth_mm: number) => string;
  home: string;
  modal_setup: string[];
  comment: (text: string) => string;
  work_offset: (offset_id: number) => string;
  file_extension: string;
}

const DIALECTS: Record<ControllerFamily, ControllerDialect> = {
  fanuc: {
    family: "fanuc",
    program_start: ["%", "O1000 (PRISM LATHE PROGRAM — FANUC)"],
    program_end: ["G28 U0 W0", "M30", "%"],
    tool_change: (t) => `T${t.padStart(4, "0")} M06`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}  (CSS LIMIT)\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) => `G83 X${x.toFixed(3)} Z${z.toFixed(3)} Q${Math.round(q * 1000)} F${f.toFixed(3)}`,
    thread_cycle: (x, z, p, d) =>
      `G76 P010060 Q100 R${p.toFixed(3)}\nG76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(d * 1000)} Q${Math.round(p * 100)} F${p.toFixed(3)}`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G99", "G40", "G18"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".nc",
  },
  haas: {
    family: "haas",
    program_start: ["%", "O1000 (PRISM LATHE — HAAS)"],
    program_end: ["G28 U0 W0", "M30", "%"],
    tool_change: (t) => `T${t.padStart(4, "0")}`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) => `G83 X${x.toFixed(3)} Z${z.toFixed(3)} Q${Math.round(q * 1000)} F${f.toFixed(3)}`,
    thread_cycle: (x, z, p, d) =>
      `G76 P010060 Q100 R${p.toFixed(3)}\nG76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(d * 1000)} Q${Math.round(p * 100)} F${p.toFixed(3)}`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G99", "G40", "G18"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".nc",
  },
  okuma_osp: {
    family: "okuma_osp",
    program_start: ["O1000 (PRISM LATHE — OKUMA OSP)"],
    program_end: ["G00 X300 Z300 (SAFE HOME)", "M02"],
    tool_change: (t) => `T${t.padStart(6, "0")}`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) =>
      `G181 X${x.toFixed(3)} Z${z.toFixed(3)} D${q.toFixed(3)} F${f.toFixed(3)}\nG180`,
    thread_cycle: (x, z, p, d) =>
      `G71 X${x.toFixed(3)} Z${z.toFixed(3)} D${(d * 1000).toFixed(0)} F${p.toFixed(3)} A60 B${(p * 1000).toFixed(0)}`,
    home: "G00 X300 Z300",
    modal_setup: ["G20", "G97", "G40", "G94"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".min",
  },
  mitsubishi: {
    family: "mitsubishi",
    program_start: ["%", "O1000 (PRISM LATHE — MITSUBISHI)"],
    program_end: ["G28 U0 W0", "M30", "%"],
    tool_change: (t) => `T${t.padStart(4, "0")} M06`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) => `G83 X${x.toFixed(3)} Z${z.toFixed(3)} Q${Math.round(q * 1000)} F${f.toFixed(3)}`,
    thread_cycle: (x, z, p, d) =>
      `G76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(d * 1000)} Q${Math.round(p * 100)} F${p.toFixed(3)}`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G99", "G40", "G18"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".nc",
  },
  mazak: {
    family: "mazak",
    program_start: ["%", "O1000 (PRISM LATHE — MAZAK MAZATROL)"],
    program_end: ["G28 U0 W0", "M30", "%"],
    tool_change: (t) => `T${t.padStart(4, "0")}`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) => `G83 X${x.toFixed(3)} Z${z.toFixed(3)} Q${Math.round(q * 1000)} F${f.toFixed(3)}`,
    thread_cycle: (x, z, p, d) =>
      `G76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(d * 1000)} Q${Math.round(p * 100)} F${p.toFixed(3)}`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G99", "G40", "G18"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".eia",
  },
  siemens: {
    family: "siemens",
    program_start: [";PRISM LATHE — SIEMENS 840D"],
    program_end: ["G28 U0 W0", "M30"],
    tool_change: (t) => `T${t}`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `LIMS=${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) =>
      `CYCLE83(0, ${z.toFixed(3)}, 2, ${z.toFixed(3)}, 0, 0, ${q.toFixed(3)}, ${f.toFixed(3)}, 0, 0, 1)`,
    thread_cycle: (x, z, p, d) =>
      `CYCLE97(${p.toFixed(3)}, 0, ${z.toFixed(3)}, ${x.toFixed(3)}, 0, 0, 0, 0.1, 0, ${d.toFixed(3)}, 0, 1, 1, 3, 1, 1, 0)`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G95", "G40", "G18"],
    comment: (t) => `;${t}`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".mpf",
  },
  generic: {
    family: "generic",
    program_start: ["%", "O1000 (PRISM LATHE — GENERIC)"],
    program_end: ["M30", "%"],
    tool_change: (t) => `T${t.padStart(4, "0")}`,
    spindle_on: (rpm) => `M03 S${Math.round(rpm)}`,
    spindle_off: "M05",
    coolant_on: "M08",
    coolant_off: "M09",
    css_on: (vc, max) => `G50 S${max}\nG96 S${vc.toFixed(0)}`,
    css_off: "G97",
    peck_drill: (x, z, q, f) => `G83 X${x.toFixed(3)} Z${z.toFixed(3)} Q${Math.round(q * 1000)} F${f.toFixed(3)}`,
    thread_cycle: (x, z, p, d) =>
      `G76 X${x.toFixed(3)} Z${z.toFixed(3)} P${Math.round(d * 1000)} Q${Math.round(p * 100)} F${p.toFixed(3)}`,
    home: "G28 U0 W0",
    modal_setup: ["G21", "G99", "G40", "G18"],
    comment: (t) => `(${t.replace(/\)/g, "]")})`,
    work_offset: (id) => `G${54 + id - 1}`,
    file_extension: ".nc",
  },
};

// ============================================================================
// SCHEMAS
// ============================================================================

export const EmitOptionsSchema = z.object({
  controller: z.enum(["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens", "generic"]),
  use_css: z.boolean().optional(),              // constant surface speed
  include_coolant: z.boolean().optional(),
  include_comments: z.boolean().optional(),
  work_offset_id: z.number().int().min(1).max(6).optional(),
  program_number: z.number().int().min(1).max(9999).optional(),
  program_name: z.string().optional(),
  decimal_precision: z.number().int().min(0).max(6).optional(),
});
export type EmitOptions = z.infer<typeof EmitOptionsSchema> & {
  /** U-LSR04: bypass envelope hard-block with audit trail. */
  allow_envelope_override?: boolean;
};

export const SignoffDossierSchema = z.object({
  program_id: z.string(),
  controller: z.string(),
  generated_at: z.string(),
  generated_by: z.string(),
  prism_version: z.string(),
  total_operations: z.number().int().min(0),
  total_cycle_time_sec: z.number().min(0),
  total_gcode_lines: z.number().int().min(0),
  feature_count: z.number().int().min(0),
  tool_count: z.number().int().min(0),
  max_rpm_used: z.number().min(0),
  max_feed_used: z.number().min(0),
  max_cutting_force_n: z.number().min(0),
  physics_summary: z.object({
    min_vc_m_min: z.number(),
    max_vc_m_min: z.number(),
    avg_mrr_cm3_min: z.number(),
    total_material_removed_cm3: z.number(),
  }),
  safety_checks: z.array(z.object({
    check: z.string(),
    status: z.enum(["pass", "fail", "warning"]),
    detail: z.string(),
  })),
  citations: z.array(z.string()),
  approval_required_from: z.array(z.enum(["machinist", "programmer", "engineer"])),
});
export type SignoffDossier = z.infer<typeof SignoffDossierSchema>;

export const EmittedProgramSchema = z.object({
  program_id: z.string(),
  controller: z.string(),
  filename: z.string(),
  gcode: z.string(),
  gcode_lines: z.number().int().min(0),
  dossier: SignoffDossierSchema,
  warnings: z.array(z.string()),
  timestamp: z.string(),
});
export type EmittedProgram = z.infer<typeof EmittedProgramSchema>;

// ============================================================================
// CONSENSUS-GATED POST SELECTION — LATHE-P2P-CONSENSUS-MS4/P1-U02
// ============================================================================

/**
 * Result of consensus-gated post-processor selection. The chosen controller is
 * folded into the emitted program; full audit ride-along covers the candidate
 * set + verdict + escalation flag.
 */
export const ConsensusEmittedProgramSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  emitted: EmittedProgramSchema,
  selected_controller: z.enum(["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens", "generic"]),
  candidate_controllers: z.array(z.enum(["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens", "generic"])).min(1),
  consensus: z.object({
    answer: z.string(),
    confidence: z.number().min(0).max(1),
    voters: z.array(z.string()),
    auditId: z.string().optional(),
    agreement_met: z.boolean(),
    threshold: z.number().min(0).max(1),
    skipped: z.boolean().describe("True when only one candidate controller — consensus skipped, no vote fanned out."),
  }),
  escalated_to_human: z.boolean(),
  lineage_id: z.string(),
  job_id: z.string(),
  timestamp: z.string(),
});
export type ConsensusEmittedProgram = z.infer<typeof ConsensusEmittedProgramSchema>;

export type EmitConsensusFn = (q: ConsensusVoteQuery) => Promise<ConsensusVoteVerdict>;

export interface EmitWithConsensusOpts {
  agreementThreshold?: number;
  consensusDecide?: EmitConsensusFn;
  publish?: (event: OutcomeEvent) => void;
  jobId?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintProgramEmitterEngine {
  /**
   * Emit a controller-specific G-code program from a toolpath.
   * @param program Toolpath program (from U-LTH39)
   * @param options Controller and emission options
   * @returns Emitted G-code with signoff dossier
   */
  emit(program: ToolpathProgram, options: EmitOptions): EmittedProgram {
    if (!program || !Array.isArray(program.operations)) {
      throw new Error("Invalid toolpath program: missing operations");
    }

    const opts = EmitOptionsSchema.parse(options);
    const dialect = DIALECTS[opts.controller];
    if (!dialect) {
      throw new Error(`Unknown controller: ${opts.controller}`);
    }

    const precision = opts.decimal_precision ?? 3;
    const warnings: string[] = [...program.warnings];

    // U-LSR04 envelope hard-block. A toolpath that exceeds the declared
    // machine envelope must never reach the post/controller (ISO 16090-1
    // §5.3.2). Override is supported for written machinist sign-off but the
    // emission carries an AUDIT warning and validate() still fails on the
    // dossier.safety_checks machine_envelope "fail" status.
    const envCheck = program.machine_envelope_check;
    if (!envCheck.within_envelope) {
      if ((options as EmitOptions).allow_envelope_override !== true) {
        throw new EnvelopeBlockError(envCheck);
      }
      warnings.push(
        `AUDIT: envelope override applied — toolpath X[${envCheck.min_x_mm.toFixed(1)}..` +
          `${envCheck.max_x_mm.toFixed(1)}] Z[${envCheck.min_z_mm.toFixed(1)}..` +
          `${envCheck.max_z_mm.toFixed(1)}] exceeds declared envelope. Requires ` +
          `machinist + engineer sign-off before program release.`,
      );
    }

    // Header
    const lines: string[] = [];
    lines.push(...dialect.program_start.map(l => l.replace("O1000", `O${opts.program_number ?? 1000}`)));

    if (opts.program_name && opts.include_comments !== false) {
      lines.push(dialect.comment(`PART: ${opts.program_name}`));
    }
    if (opts.include_comments !== false) {
      lines.push(dialect.comment(`CONTROLLER: ${dialect.family.toUpperCase()}`));
      lines.push(dialect.comment(`GENERATED: ${new Date().toISOString()}`));
      lines.push(dialect.comment(`TOTAL CYCLE: ${(program.total_cycle_time_sec / 60).toFixed(2)} min`));
    }
    lines.push("");

    // Modal setup
    lines.push(...dialect.modal_setup);
    lines.push(dialect.work_offset(opts.work_offset_id ?? 1));
    lines.push(dialect.home);
    lines.push("");

    // Operations
    let maxRpm = 0, maxFeed = 0, maxForce = 0;
    let minVc = Infinity, maxVc = 0;
    let totalMrr = 0;

    for (const op of program.operations) {
      maxRpm = Math.max(maxRpm, op.spindle_rpm);
      maxFeed = Math.max(maxFeed, op.feed_mm_min);
      maxForce = Math.max(maxForce, op.cutting_force_n);
      minVc = Math.min(minVc, op.cutting_speed_m_min);
      maxVc = Math.max(maxVc, op.cutting_speed_m_min);
      totalMrr += op.material_removal_rate_cm3_min;

      if (opts.include_comments !== false) {
        lines.push(dialect.comment(`=== OP ${op.op_number}: ${op.featureType} (${op.strategy_id}) ===`));
      }

      // Tool change
      lines.push(dialect.tool_change(op.tool_id.replace(/^T0*/, "") || String(op.op_number)));

      // Spindle
      if (opts.use_css && op.cutting_speed_m_min > 0) {
        lines.push(dialect.css_on(op.cutting_speed_m_min, Math.round(op.spindle_rpm * 1.2)));
      } else {
        lines.push(dialect.spindle_on(op.spindle_rpm));
      }

      // Coolant
      if (opts.include_coolant !== false) {
        lines.push(dialect.coolant_on);
      }

      // Emit moves (filter tool_change + spindle moves that dialect handles)
      for (const move of op.moves) {
        const translated = this.translateMove(move, dialect, precision, opts.include_comments ?? true);
        if (translated) lines.push(translated);
      }

      // Spindle / coolant off at end of operation
      if (opts.include_coolant !== false) {
        lines.push(dialect.coolant_off);
      }
      lines.push("");
    }

    // Footer
    lines.push(...dialect.program_end);

    const gcode = lines.join("\n");
    const avgMrr = program.operations.length > 0 ? totalMrr / program.operations.length : 0;

    // Build dossier
    const dossier: SignoffDossier = {
      program_id: program.program_id,
      controller: dialect.family,
      generated_at: new Date().toISOString(),
      generated_by: "PRISM LathePrintProgramEmitter U-LTH40",
      prism_version: "1.0.0",
      total_operations: program.operations.length,
      total_cycle_time_sec: program.total_cycle_time_sec,
      total_gcode_lines: lines.length,
      feature_count: new Set(program.operations.map(o => o.featureId)).size,
      tool_count: new Set(program.operations.map(o => o.tool_id)).size,
      max_rpm_used: maxRpm,
      max_feed_used: maxFeed,
      max_cutting_force_n: maxForce,
      physics_summary: {
        min_vc_m_min: minVc === Infinity ? 0 : minVc,
        max_vc_m_min: maxVc,
        avg_mrr_cm3_min: avgMrr,
        total_material_removed_cm3: program.total_cutting_volume_cm3,
      },
      safety_checks: this.runSafetyChecks(program, warnings),
      citations: [
        "Sandvik Coromant Turning Application Guide",
        "Machinery's Handbook 31st ed.",
        "ISO 13399: Cutting tool data exchange",
        `Controller ref: ${dialect.family.toUpperCase()} programming manual`,
      ],
      approval_required_from: this.requiredApprovals(program, maxForce),
    };

    const filename = `${opts.program_name ?? "part"}${dialect.file_extension}`;

    return {
      program_id: program.program_id,
      controller: dialect.family,
      filename,
      gcode,
      gcode_lines: lines.length,
      dossier,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Translate a single move into controller-specific G-code line.
   * Skips moves that the dialect handles via header (tool_change/spindle_on).
   */
  private translateMove(
    move: ToolpathMove,
    dialect: ControllerDialect,
    precision: number,
    includeComments: boolean
  ): string | null {
    // Skip moves already emitted in per-op header
    if (move.move_type === "tool_change") return null;
    if (move.gcode.startsWith("M03")) return null;

    let line = "";
    switch (move.move_type) {
      case "rapid": {
        if (move.x_mm === undefined && move.z_mm === undefined) return null;
        const parts = ["G00"];
        if (move.x_mm !== undefined) parts.push(`X${(move.x_mm * 2).toFixed(precision)}`);
        if (move.z_mm !== undefined) parts.push(`Z${move.z_mm.toFixed(precision)}`);
        line = parts.join(" ");
        break;
      }
      case "feed_linear": {
        if (move.x_mm === undefined && move.z_mm === undefined) return null;
        const parts = ["G01"];
        if (move.x_mm !== undefined) parts.push(`X${(move.x_mm * 2).toFixed(precision)}`);
        if (move.z_mm !== undefined) parts.push(`Z${move.z_mm.toFixed(precision)}`);
        if (move.feed_mm_min !== undefined) parts.push(`F${move.feed_mm_min.toFixed(1)}`);
        line = parts.join(" ");
        break;
      }
      case "feed_arc_cw":
      case "feed_arc_ccw": {
        const g = move.move_type === "feed_arc_cw" ? "G02" : "G03";
        const parts = [g];
        if (move.x_mm !== undefined) parts.push(`X${(move.x_mm * 2).toFixed(precision)}`);
        if (move.z_mm !== undefined) parts.push(`Z${move.z_mm.toFixed(precision)}`);
        if (move.i_mm !== undefined) parts.push(`I${move.i_mm.toFixed(precision)}`);
        if (move.k_mm !== undefined) parts.push(`K${move.k_mm.toFixed(precision)}`);
        if (move.feed_mm_min !== undefined) parts.push(`F${move.feed_mm_min.toFixed(1)}`);
        line = parts.join(" ");
        break;
      }
      case "canned_cycle":
        line = move.gcode;  // already formatted
        break;
      case "dwell":
        line = `G04 P${Math.round((move.duration_sec ?? 0.1) * 1000)}`;
        break;
      default:
        line = move.gcode;
    }

    if (includeComments && move.comment) {
      line += ` ${dialect.comment(move.comment)}`;
    }
    return line;
  }

  /**
   * Run safety checks on the program
   */
  private runSafetyChecks(program: ToolpathProgram, warnings: string[]): SignoffDossier["safety_checks"] {
    const checks: SignoffDossier["safety_checks"] = [];

    checks.push({
      check: "machine_envelope",
      status: program.machine_envelope_check.within_envelope ? "pass" : "fail",
      detail: program.machine_envelope_check.within_envelope
        ? `X ${program.machine_envelope_check.max_x_mm.toFixed(1)}, Z ${program.machine_envelope_check.max_z_mm.toFixed(1)}`
        : "Toolpath exceeds envelope",
    });

    const maxForce = Math.max(...program.operations.map(o => o.cutting_force_n), 0);
    checks.push({
      check: "cutting_force",
      status: maxForce > 5000 ? "warning" : "pass",
      detail: `Max ${maxForce.toFixed(0)}N`,
    });

    const hasHighRpm = program.operations.some(o => o.spindle_rpm > 4000);
    checks.push({
      check: "high_rpm",
      status: hasHighRpm ? "warning" : "pass",
      detail: `Max ${Math.max(...program.operations.map(o => o.spindle_rpm), 0)} RPM`,
    });

    checks.push({
      check: "operations_present",
      status: program.operations.length > 0 ? "pass" : "fail",
      detail: `${program.operations.length} operations`,
    });

    if (warnings.length > 0) {
      checks.push({
        check: "program_warnings",
        status: "warning",
        detail: `${warnings.length} warnings`,
      });
    }

    return checks;
  }

  /**
   * Determine who must approve this program
   */
  private requiredApprovals(program: ToolpathProgram, maxForce: number): SignoffDossier["approval_required_from"] {
    const approvals: SignoffDossier["approval_required_from"] = ["programmer"];

    if (maxForce > 5000 || program.operations.length > 20) {
      approvals.push("engineer");
    }

    // Always need machinist signoff for lathe work
    approvals.push("machinist");

    return approvals;
  }

  /**
   * List supported controllers
   */
  listControllers(): ControllerFamily[] {
    return Object.keys(DIALECTS) as ControllerFamily[];
  }

  /**
   * Dry run: emit, then count lines without returning G-code body
   */
  dryRun(program: ToolpathProgram, options: EmitOptions): { lines: number; controller: string; ok: boolean } {
    try {
      const emitted = this.emit(program, options);
      return { lines: emitted.gcode_lines, controller: emitted.controller, ok: true };
    } catch {
      return { lines: 0, controller: options.controller, ok: false };
    }
  }

  /**
   * Validate emitted program
   */
  validate(emitted: EmittedProgram): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [...emitted.warnings];

    if (emitted.gcode_lines === 0) errors.push("Empty G-code");
    if (emitted.dossier.total_operations === 0) errors.push("No operations in dossier");

    emitted.dossier.safety_checks.forEach(c => {
      if (c.status === "fail") errors.push(`Safety check ${c.check}: ${c.detail}`);
      if (c.status === "warning") warnings.push(`${c.check}: ${c.detail}`);
    });

    return { valid: errors.length === 0, errors, warnings };
  }
}

// Extend the engine prototype with the consensus-gated emit method.
// Kept outside the original class body to leave the rest of the file
// untouched and let the consensus surface land as a strictly-additive
// LATHE-P2P-CONSENSUS-MS4/P1-U02 deliverable.
declare module "./LathePrintProgramEmitterEngine.js" {
  // module augmentation placeholder — types live on the class below
}

/**
 * Consensus-gated post-processor selection + emit
 * (LATHE-P2P-CONSENSUS-MS4/P1-U02).
 *
 * When the machine→controller mapping is ambiguous (e.g. Okuma B250IIW
 * supports both OSP-P300L and legacy OSP-P200L), present the candidate
 * controllers to the consensus seam and emit with the winning post.
 *
 * If only one candidate is supplied, consensus is SKIPPED — the unique
 * choice is emitted immediately, `consensus.skipped` is true, confidence=1,
 * no fanout cost. This matches envelope behavior: "consensus when machine
 * has ambiguous post mapping".
 *
 * Fail-open: seam throws / unknown answer → first candidate is emitted,
 * escalated_to_human flagged.
 *
 * @param program toolpath program to emit
 * @param candidateControllers controllers valid for this machine (≥1)
 * @param baseOptions emit options (controller is overridden by consensus)
 * @param opts seam injection + threshold + jobId
 * @returns consensus-gated emitted program with full audit trail
 */
async function emitWithConsensusImpl(
  this: LathePrintProgramEmitterEngine,
  program: ToolpathProgram,
  candidateControllers: ControllerFamily[],
  baseOptions: Omit<EmitOptions, "controller">,
  opts: EmitWithConsensusOpts = {},
): Promise<ConsensusEmittedProgram> {
  if (!Array.isArray(candidateControllers) || candidateControllers.length === 0) {
    throw new Error("emitWithConsensus: candidateControllers must contain at least one controller family");
  }

  const threshold = opts.agreementThreshold ?? 0.75;
  const lineageId = randomUUID();
  const jobId = opts.jobId ?? randomUUID();

  let selectedController: ControllerFamily;
  let verdict: ConsensusVoteVerdict;
  let skipped: boolean;

  if (candidateControllers.length === 1) {
    // No ambiguity — skip consensus, default-high confidence to the unique pick.
    selectedController = candidateControllers[0];
    verdict = { answer: selectedController, confidence: 1, voters: [] };
    skipped = true;
  } else {
    const consensusFn = opts.consensusDecide ?? makeDefaultConsensusVote({
      engineName: "LathePrintProgramEmitterEngine",
      callerEngine: "LathePrintProgramEmitterEngine.emitWithConsensus",
    });
    try {
      verdict = await consensusFn({
        question: `Which post-processor controller dialect minimizes risk for this lathe program?`,
        options: candidateControllers,
        decisionKind: "post_processor",
      });
    } catch {
      verdict = { answer: candidateControllers[0], confidence: 0, voters: [] };
    }
    const answer = verdict.answer as ControllerFamily;
    selectedController = candidateControllers.includes(answer) ? answer : candidateControllers[0];
    skipped = false;
  }

  const agreementMet = verdict.confidence >= threshold;
  const emitted = this.emit(program, { ...baseOptions, controller: selectedController });

  const result: ConsensusEmittedProgram = {
    schemaVersion: "1.0.0",
    emitted,
    selected_controller: selectedController,
    candidate_controllers: candidateControllers,
    consensus: {
      answer: selectedController,
      confidence: verdict.confidence,
      voters: verdict.voters,
      auditId: verdict.auditId,
      agreement_met: agreementMet,
      threshold,
      skipped,
    },
    escalated_to_human: !skipped && !agreementMet,
    lineage_id: lineageId,
    job_id: jobId,
    timestamp: new Date().toISOString(),
  };

  // Outcome event (v1.1.0 cross_process_decision).
  const event: OutcomeEvent = {
    schemaVersion: "1.1.0",
    event_id: randomUUID(),
    lineage_id: lineageId,
    domain: "lathe",
    kind: "cross_process_decision",
    severity: "info",
    source: "system",
    timestamp: result.timestamp,
    context: {
      job_id: jobId,
      pipeline_stage: ORCHESTRATE_STAGE,
      consensus_audit_id: verdict.auditId,
    },
    recommended: {
      decision_kind: "post_processor",
      candidates: candidateControllers,
      skipped,
    },
    actual: {
      selected: selectedController,
      agreement_met: agreementMet,
      threshold,
      escalated_to_human: result.escalated_to_human,
    },
    confidence: verdict.confidence,
  };
  try {
    (opts.publish ?? publishOutcomeToFeedbackBus)(event);
  } catch {
    // Observability seam — never block emission on bus failure.
  }

  return result;
}

// Attach to prototype so `lathePrintProgramEmitterEngine.emitWithConsensus(...)`
// is callable as a normal method while keeping the original class body untouched.
(LathePrintProgramEmitterEngine.prototype as unknown as {
  emitWithConsensus: typeof emitWithConsensusImpl;
}).emitWithConsensus = emitWithConsensusImpl;

// Augment the class type so TS surfaces the new method on the singleton.
declare global {
  // intentionally empty
}
interface LathePrintProgramEmitterEngine {
  emitWithConsensus(
    program: ToolpathProgram,
    candidateControllers: ControllerFamily[],
    baseOptions: Omit<EmitOptions, "controller">,
    opts?: EmitWithConsensusOpts,
  ): Promise<ConsensusEmittedProgram>;
}

export const lathePrintProgramEmitterEngine = new LathePrintProgramEmitterEngine();
