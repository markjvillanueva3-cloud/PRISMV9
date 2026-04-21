/**
 * SwissBackWorkingOp2Engine
 * =========================
 *
 * Generates Op2 (back-working) toolpaths on Swiss / mill-turn machines with
 * correct sub-spindle coordinate reversal per controller (U-LPS22, MS6b).
 *
 * Coordinate convention:
 *   - Main spindle: Z = 0 at collet face, Z negative = into bar.
 *   - Sub spindle: after part transfer, the part's cut-off face becomes the
 *     new datum. Two dialects diverge:
 *       * Citizen Cincom ($2)       : Z = 0 at cut-off face; Z-positive cuts "into" the part.
 *       * Star SR / W-axis          : uses W axis alongside Z; W = 0 at sub datum.
 *       * Tsugami B-series          : Z stays negative (origin at sub face; Z− into part).
 *       * Mazak Integrex            : $2 flips origin; Z+ into part.
 *       * DMG MORI NTX              : CHANDATA(2) switches datum; Z+ into part.
 *
 * Back-work operations supported:
 *   - face_to_length      (square the cut-off face to final L)
 *   - bore_back           (internal feature from the cut end)
 *   - chamfer_back        (break edge on the cut end)
 *   - cross_hole          (radial drill on sub-turret live tooling)
 *   - internal_thread     (sub-spindle threading cycle)
 *   - finish_back         (finish face + chamfer in one cycle)
 *
 * Simultaneous Op2 + Op1:
 *   The engine reports whether the generated Op2 program is longer than the
 *   caller-supplied Op1 duration. If Op2 > Op1, Op2 is the cycle-time
 *   bottleneck — the caller should shorten Op2 (fewer passes, higher feed,
 *   reduced entry/exit moves) before simultaneous parallelism yields any
 *   benefit.
 *
 * The engine is a pure G-code emitter — it does NOT calculate speeds/feeds.
 * Those come from the caller (typically `AutoSpeedFeedEngine`).
 *
 * References:
 *   - Citizen Cincom $2 Back-Working Programming Manual §7.3
 *   - Star SR-20 W-Axis Guide §4
 *   - Tsugami BO Sub-Spindle Operations Manual §5
 *
 * @module engines/SwissBackWorkingOp2Engine
 * @milestone LATHE-PRO-MS6b / U-LPS22
 */

export type SubSpindleDialect = "citizen" | "star" | "tsugami" | "mazak" | "dmg_mori";

export type BackWorkOpType =
  | "face_to_length"
  | "bore_back"
  | "chamfer_back"
  | "cross_hole"
  | "internal_thread"
  | "finish_back";

export interface BackWorkOp {
  type: BackWorkOpType;
  /** Tool number on the sub-turret / gang slide. */
  tool_number: number;
  tool_label?: string;
  /** Z depth (mm) from sub-spindle datum, always positive. The emitter flips
   *  sign per dialect. */
  depth_mm: number;
  /** X position for the op (mm). Diameter-programmed. */
  x_mm: number;
  /** Feed (mm/rev). */
  feed_mm_rev: number;
  /** Spindle RPM during the op. */
  spindle_rpm: number;
  /** For cross_hole: C-axis position (deg). */
  c_position_deg?: number;
  /** For internal_thread: pitch (mm/rev) and thread depth pass count. */
  thread_pitch_mm?: number;
  /** Thread starting X for thread cycle. */
  thread_start_x_mm?: number;
}

export interface Op2Input {
  dialect: SubSpindleDialect;
  /** Final part length (mm) — target for face_to_length. */
  final_length_mm: number;
  /** Program number for the Op2 block. */
  program_number: number;
  /** Ordered list of back-work ops. */
  ops: BackWorkOp[];
  /** Op1 estimated duration (s) — used for simultaneous-cut reporting. */
  op1_duration_s?: number;
  /** Whether the machine has C-axis (enables cross_hole, rotary features). */
  has_c_axis?: boolean;
}

export interface Op2Result {
  dialect: SubSpindleDialect;
  /** G-code lines (one per block). */
  lines: string[];
  /** Estimated Op2 cycle time (s) — sum of op durations with overhead. */
  op2_duration_s: number;
  /** True when Op2 is the cycle-time bottleneck (op2 > op1). */
  is_bottleneck: boolean;
  /** Diagnostic warnings. */
  warnings: string[];
  /** Per-op duration breakdown. */
  per_op_time_s: Array<{ op_id: string; duration_s: number }>;
}

/** Returns the Z-axis multiplier (+1 or −1) for the dialect's sub-spindle convention. */
function zFlip(dialect: SubSpindleDialect): 1 | -1 {
  switch (dialect) {
    case "citizen":
    case "mazak":
    case "dmg_mori":
      return +1; // Z+ into part
    case "star":
    case "tsugami":
      return -1; // Z− into part (origin at face, cutting toward collet)
  }
}

/** Dialect-specific header announcing sub-spindle / Op2 context. */
function op2Header(dialect: SubSpindleDialect, progNum: number): string[] {
  const tag = `O${String(progNum).padStart(4, "0")}`;
  switch (dialect) {
    case "citizen":  return [`${tag} ($2 BACK-WORKING)`, "($2)"];
    case "star":     return [`${tag} (SUB SPINDLE W-AXIS)`, "(--- CH SUB ---)"];
    case "tsugami":  return [`${tag} ($2 SUB)`, "($2)"];
    case "mazak":    return [`${tag} (SUB PATH)`, "!C2"];
    case "dmg_mori": return [`${tag} (SUB CHANNEL)`, "CHANDATA(2)"];
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Estimate duration (s) for a single back-work op. */
function opDuration(op: BackWorkOp): number {
  if (op.feed_mm_rev <= 0 || op.spindle_rpm <= 0) return 3.0;
  const feedMmMin = op.feed_mm_rev * op.spindle_rpm;
  if (feedMmMin <= 0) return 3.0;
  switch (op.type) {
    case "face_to_length":
      return (op.x_mm / 2 / feedMmMin) * 60 + 1.0;
    case "bore_back":
    case "finish_back":
      return (op.depth_mm / feedMmMin) * 60 + 1.0;
    case "chamfer_back":
      return 1.5;
    case "cross_hole":
      return (op.depth_mm / feedMmMin) * 60 + 1.5;
    case "internal_thread":
      return (op.depth_mm / feedMmMin) * 60 * 4 + 2.0; // multi-pass
    default:
      return 3.0;
  }
}

export class SwissBackWorkingOp2Engine {
  /**
   * Emit Op2 (back-working) G-code block with correct coordinate reversal
   * per controller dialect.
   */
  generate(input: Op2Input): Op2Result {
    const warnings: string[] = [];
    const lines: string[] = [];
    const flip = zFlip(input.dialect);
    const perOp: Array<{ op_id: string; duration_s: number }> = [];
    let totalS = 0;

    lines.push(...op2Header(input.dialect, input.program_number));
    lines.push(`(FINAL LENGTH: ${input.final_length_mm}mm)`);
    lines.push("");

    let opIdx = 1;
    for (const op of input.ops) {
      const opId = `${op.type}_${opIdx++}`;
      const dZ = round4(op.depth_mm * flip); // flipped Z value
      const tStr = `T${String(op.tool_number).padStart(2, "0")}${
        op.tool_label ? `(${op.tool_label})` : ""
      }`;
      lines.push(`(--- OP2: ${op.type.toUpperCase()} ---)`);
      lines.push(tStr);
      lines.push(`G97 S${op.spindle_rpm} M04`); // sub spindle reverse

      switch (op.type) {
        case "face_to_length":
          // Z = 0 is datum; face to final length means cut the Z=0 surface.
          lines.push(`G00 X${round4(op.x_mm + 2)} Z${round4(2 * flip)}`);
          lines.push(`G01 X${round4(op.x_mm)} Z0 F${round4(op.feed_mm_rev)}`);
          lines.push(`G01 X0 F${round4(op.feed_mm_rev)}`);
          lines.push(`G00 X${round4(op.x_mm + 5)} Z${round4(5 * flip)}`);
          break;

        case "bore_back":
          lines.push(`G00 X${round4(op.x_mm)} Z${round4(1 * flip)}`);
          lines.push(`G01 Z${dZ} F${round4(op.feed_mm_rev)}`);
          lines.push(`G00 X${round4(op.x_mm - 1)} Z${round4(1 * flip)}`);
          break;

        case "chamfer_back":
          lines.push(`G00 X${round4(op.x_mm + 2)} Z${round4(1 * flip)}`);
          lines.push(`G01 X${round4(op.x_mm)} Z${round4(0.5 * flip)} F${round4(op.feed_mm_rev)}`);
          break;

        case "cross_hole":
          if (!input.has_c_axis) {
            warnings.push(`cross_hole op ${opId} requires C-axis which is not available on this sub-spindle.`);
            break;
          }
          if (op.c_position_deg != null) {
            lines.push(`G00 C${round4(op.c_position_deg)}`);
          }
          lines.push(`G00 X${round4(op.x_mm + 2)}`);
          lines.push(`G83 Z${dZ} F${round4(op.feed_mm_rev)}`); // peck drill cycle
          lines.push("G80");
          break;

        case "internal_thread":
          if (op.thread_pitch_mm == null || op.thread_start_x_mm == null) {
            warnings.push(`internal_thread op ${opId} missing thread_pitch_mm or thread_start_x_mm.`);
            break;
          }
          lines.push(`G00 X${round4(op.thread_start_x_mm)} Z${round4(2 * flip)}`);
          lines.push(`G76 X${round4(op.x_mm)} Z${dZ} F${round4(op.thread_pitch_mm)}`);
          break;

        case "finish_back":
          lines.push(`G00 X${round4(op.x_mm + 2)} Z${round4(1 * flip)}`);
          lines.push(`G01 Z0 F${round4(op.feed_mm_rev)}`);
          lines.push(`G01 X0 F${round4(op.feed_mm_rev)}`);
          lines.push(`G00 X${round4(op.x_mm + 5)} Z${round4(5 * flip)}`);
          break;
      }
      lines.push("");
      const t = round4(opDuration(op));
      perOp.push({ op_id: opId, duration_s: t });
      totalS += t;
    }

    lines.push("M05");
    lines.push("M30");
    lines.push("%");

    const isBottleneck = input.op1_duration_s != null && totalS > input.op1_duration_s;
    if (isBottleneck) {
      warnings.push(
        `Op2 duration ${round4(totalS)}s exceeds Op1 duration ${input.op1_duration_s}s — ` +
          `Op2 is the cycle-time bottleneck; simultaneous execution gives no cycle gain.`,
      );
    }

    return {
      dialect: input.dialect,
      lines,
      op2_duration_s: round4(totalS),
      is_bottleneck: isBottleneck,
      warnings,
      per_op_time_s: perOp,
    };
  }
}

/** Singleton instance. */
export const swissBackWorkingOp2Engine = new SwissBackWorkingOp2Engine();
