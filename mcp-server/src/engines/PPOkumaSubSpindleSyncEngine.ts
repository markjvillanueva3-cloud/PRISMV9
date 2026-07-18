/**
 * PPOkumaSubSpindleSyncEngine — Okuma LU3000 / LT-series twin-spindle post
 *
 * Sub-spindle programming for Okuma twin-spindle turning centers.
 * Complements PPOkumaTurningPostEngine (single-spindle) by adding:
 *   - Sub-spindle part transfer (pickoff cycle)
 *   - Synchronous spindle mode for phase-matched operations
 *   - Cut-off with chuck hand-over
 *   - Second-op machining on sub-spindle
 *   - Dual-turret simultaneous operation ($1/$2 channels)
 *   - Tailstock management
 *   - Main/sub chuck pressure control
 *
 * ⚠ UNVERIFIED DIALECT (R12, 2026-06-28): the M/G codes below are NOT cited to a real
 * LU3000/LT program or manual and are NOT confirmed against any machine. They DIVERGE
 * from the JM fleet's verified Okuma chucker codes (sub/main chuck M248/M249 + M83/M84,
 * sync M151/M150, interlock M247/M246 + M185/M184 -- see MULTUS_B250_SUBSPINDLE_CODES in
 * data/marks-multus-patterns.ts, sourced from Mark's running programs). The JM fleet has
 * NO LU3000 (it is 100% Okuma OSP chuckers: GENOS/LB/Multus/Crown/LNC). Do NOT rely on
 * this engine's emit for any JM machine without first verifying its codes against that
 * machine's OWN running program. For the JM Multus B250 chucker transfer, use
 * OkumaB250LatheMasterPostEngine.generateSubSpindleTransfer (verified).
 *
 * Okuma LU3000/LT dialect conventions (UNVERIFIED -- see warning above):
 *   - M170/M171: Sub-spindle forward/reverse (C2)
 *   - M180/M181: Sub-spindle CW/CCW
 *   - G145/G146: Synchronous spindle on/off
 *   - M87/M89: Main chuck open/close (OPEN/CLAMP)
 *   - M227/M228: Sub chuck open/close
 *   - M130/M131: Tailstock forward/retract
 *   - $1/$2: Dual-turret channel markers
 *   - G110: Sub-spindle work offset
 *
 * @module PPOkumaSubSpindleSyncEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type SubSpindleOperation =
  | "sync_transfer"       // Part transfer main → sub (with cutoff)
  | "sync_spindle"        // Synchronous rotation (for threading / flat handoff)
  | "sub_machining"       // Second-op on sub-spindle (drilling/facing)
  | "dual_turret"         // Both turrets working simultaneously
  | "pickoff"             // Sub-spindle picks off finished part
  | "parts_catcher";      // Drop-off cycle to catcher

export interface TransferCycle {
  main_spindle_rpm?: number;      // RPM at transfer (typically low, 50-200)
  sub_spindle_rpm?: number;
  main_chuck_pressure?: number;   // main chuck clamp pressure 0-100%
  sub_chuck_pressure?: number;
  approach_z_mm: number;          // Sub-spindle position where chuck opens
  transfer_z_mm: number;          // Z where sub clamps / cutoff happens
  clearance_z_mm?: number;        // Retract after transfer
  cutoff_tool?: number;           // Cut-off tool number (default: 7)
  cutoff_tool_position?: number;
  cutoff_feed_mm_rev?: number;
  cutoff_x_target_mm?: number;    // Stop X for cutoff (default: -1 for full)
  slug_catcher?: boolean;         // Enable M-code for part catcher
}

export interface SubSpindleOperationInput {
  type: SubSpindleOperation;

  // Transfer-specific
  transfer?: TransferCycle;

  // Sync mode
  sync_offset_deg?: number;       // Phase offset for sync mode (0-360°)

  // Sub-machining (second-op)
  sub_ops?: Array<{
    op_type: "face" | "drill" | "bore" | "tap";
    tool_number: number;
    tool_position: number;
    speed_rpm?: number;
    speed_sfm?: number;
    css?: boolean;
    feed_mm_rev?: number;
    start_x_mm?: number;
    end_x_mm?: number;
    start_z_mm?: number;
    end_z_mm?: number;
  }>;

  // Dual-turret
  turret_1_ops?: string[];        // Channel 1 ops (G-code lines)
  turret_2_ops?: string[];        // Channel 2 ops
  sync_wait_code?: string;        // e.g., "M200" waitcode

  // General
  comment?: string;
}

export interface SubSpindleProgramInput {
  program_number?: string;
  part_description?: string;
  material?: string;
  machine_model?: "LU3000" | "LU45" | "LT3000" | "LB3000II";  // Okuma twin-spindle models
  operations: SubSpindleOperationInput[];
}

export interface SubSpindleProgram {
  gcode_lines: string[];
  gcode_text: string;
  line_count: number;
  operation_count: number;
  transfer_count: number;
  uses_sync: boolean;
  uses_dual_turret: boolean;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPOkumaSubSpindleSyncEngine {
  /**
   * Generate a complete sub-spindle program.
   */
  generate(input: SubSpindleProgramInput): SubSpindleProgram {
    const lines: string[] = [];
    const warnings: string[] = [];
    const progNum = input.program_number ?? "0001";
    const machine = input.machine_model ?? "LU3000";

    // Header
    lines.push(`%`);
    lines.push(`O${progNum}`);
    lines.push(`(${input.part_description ?? "SUB-SPINDLE PROGRAM"})`);
    lines.push(`(MACHINE: OKUMA ${machine} — TWIN SPINDLE)`);
    lines.push(`(MATERIAL: ${input.material ?? "TOOL STEEL"})`);
    lines.push(`(GENERATED BY PP-AGI — SUB-SPINDLE / SYNC)`);
    lines.push(``);

    // Machine setup
    lines.push(`G20 G40 G80 (INITIAL STATE — INCH/CANCEL)`);
    lines.push(`G00 G28 U0 W0 (HOME MAIN SLIDE)`);
    lines.push(`G00 G28 B0 (HOME SUB-SPINDLE)`);
    lines.push(``);

    let transferCount = 0;
    let usesSync = false;
    let usesDualTurret = false;

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      lines.push(``);
      lines.push(`(==== OP ${i + 1}: ${op.type.toUpperCase()} ====)`);
      if (op.comment) {
        lines.push(`(${op.comment})`);
      }

      switch (op.type) {
        case "sync_transfer": {
          transferCount++;
          this.emitSyncTransfer(op.transfer, lines, warnings);
          break;
        }
        case "sync_spindle": {
          usesSync = true;
          this.emitSyncSpindle(op.sync_offset_deg ?? 0, lines);
          break;
        }
        case "sub_machining": {
          this.emitSubMachining(op.sub_ops ?? [], lines, warnings);
          break;
        }
        case "dual_turret": {
          usesDualTurret = true;
          this.emitDualTurret(op.turret_1_ops ?? [], op.turret_2_ops ?? [], op.sync_wait_code ?? "M200", lines);
          break;
        }
        case "pickoff": {
          this.emitPickoff(op.transfer, lines);
          break;
        }
        case "parts_catcher": {
          this.emitPartsCatcher(lines);
          break;
        }
      }
    }

    // Program end
    lines.push(``);
    lines.push(`(--- PROGRAM END ---)`);
    lines.push(`G00 G28 U0 W0 (HOME MAIN)`);
    lines.push(`G00 G28 B0 (HOME SUB)`);
    lines.push(`M181 (SUB SPINDLE STOP)`);
    lines.push(`M5 (MAIN SPINDLE STOP)`);
    lines.push(`M30`);
    lines.push(`%`);

    return {
      gcode_lines: lines,
      gcode_text: lines.join("\n"),
      line_count: lines.length,
      operation_count: input.operations.length,
      transfer_count: transferCount,
      uses_sync: usesSync,
      uses_dual_turret: usesDualTurret,
      warnings,
    };
  }

  /**
   * Emit sync transfer block: main→sub with cutoff.
   */
  private emitSyncTransfer(xfer: TransferCycle | undefined, lines: string[], warnings: string[]): void {
    if (!xfer) {
      warnings.push("sync_transfer missing transfer config — emitting skeleton only");
      lines.push(`(TRANSFER CONFIG MISSING — SKELETON ONLY)`);
      return;
    }
    const mainRPM = xfer.main_spindle_rpm ?? 100;
    const subRPM = xfer.sub_spindle_rpm ?? mainRPM;
    const cutoffTool = xfer.cutoff_tool ?? 7;
    const cutoffToolPos = xfer.cutoff_tool_position ?? cutoffTool;
    const cutoffFeed = xfer.cutoff_feed_mm_rev ?? 0.05;
    const cutoffX = xfer.cutoff_x_target_mm ?? -1;

    if (mainRPM > 500) {
      warnings.push(`Transfer RPM ${mainRPM} high — recommend <500 for stable clamp handoff`);
    }

    // Set low RPM for transfer
    lines.push(`(TRANSFER: MAIN→SUB AT LOW RPM)`);
    lines.push(`M3 S${mainRPM} (MAIN SPINDLE CW)`);
    lines.push(`M180 M181 S${subRPM} (SUB SPINDLE PREP)`);

    // Enable synchronous mode for phase match
    lines.push(`G145 (SYNC SPINDLE MODE ON)`);

    // Chuck pressure set
    if (xfer.main_chuck_pressure !== undefined) {
      lines.push(`(MAIN CHUCK PRESSURE: ${xfer.main_chuck_pressure}%)`);
    }
    if (xfer.sub_chuck_pressure !== undefined) {
      lines.push(`(SUB CHUCK PRESSURE: ${xfer.sub_chuck_pressure}%)`);
    }

    // Approach sub-spindle to workpiece
    lines.push(`G00 B${xfer.approach_z_mm.toFixed(3)} (APPROACH SUB)`);
    lines.push(`M227 (SUB CHUCK OPEN)`);
    lines.push(`G01 B${xfer.transfer_z_mm.toFixed(3)} F500 (ENGAGE PART)`);
    lines.push(`M228 (SUB CHUCK CLOSE)`);
    lines.push(`G04 P500 (DWELL FOR CLAMP)`);

    // Cut-off tool engages
    lines.push(`T0${cutoffTool}0${cutoffToolPos} (CUTOFF TOOL)`);
    lines.push(`G00 X50 Z-5 (APPROACH CUTOFF X/Z)`);
    lines.push(`G01 X${cutoffX.toFixed(3)} F${cutoffFeed.toFixed(3)} (PART OFF)`);

    // Main chuck opens
    lines.push(`M87 (MAIN CHUCK OPEN)`);
    lines.push(`G04 P200 (DWELL)`);

    // Retract cutoff tool, back off sub-spindle
    lines.push(`G00 X60 (RETRACT CUTOFF)`);
    const clearance = xfer.clearance_z_mm ?? (xfer.approach_z_mm + 50);
    lines.push(`G00 B${clearance.toFixed(3)} (RETRACT SUB)`);

    // Disable sync
    lines.push(`G146 (SYNC SPINDLE MODE OFF)`);
    lines.push(`M5 (MAIN SPINDLE STOP)`);

    // Parts catcher (optional)
    if (xfer.slug_catcher) {
      lines.push(`M24 (PARTS CATCHER OUT)`);
      lines.push(`G04 P1000 (CATCHER DWELL)`);
      lines.push(`M25 (PARTS CATCHER IN)`);
    }
  }

  /**
   * Emit sync spindle setup.
   */
  private emitSyncSpindle(offsetDeg: number, lines: string[]): void {
    lines.push(`(SYNCHRONOUS SPINDLE MODE — PHASE OFFSET ${offsetDeg}°)`);
    lines.push(`M3 S300 (MAIN SPINDLE)`);
    lines.push(`M180 S300 (SUB SPINDLE MATCH RPM)`);
    if (offsetDeg !== 0) {
      lines.push(`G145 P${offsetDeg.toFixed(2)} (SYNC ON WITH PHASE OFFSET)`);
    } else {
      lines.push(`G145 (SYNC ON — ZERO PHASE)`);
    }
  }

  /**
   * Emit sub-spindle machining (second-op).
   */
  private emitSubMachining(
    subOps: Array<any>,
    lines: string[],
    warnings: string[],
  ): void {
    if (subOps.length === 0) {
      warnings.push("sub_machining has no sub_ops configured");
      lines.push(`(NO SUB-OPS CONFIGURED)`);
      return;
    }

    lines.push(`(--- SUB-SPINDLE MACHINING ---)`);
    lines.push(`G110 (SUB-SPINDLE WORK OFFSET)`);

    for (const op of subOps) {
      lines.push(`(SUB OP: ${op.op_type.toUpperCase()})`);
      const tStr = `T0${op.tool_number}0${op.tool_position}`;
      lines.push(`${tStr} (TOOL)`);

      // Spindle mode
      if (op.css) {
        lines.push(`G96 S${op.speed_sfm ?? 200} M180 (CSS)`);
      } else {
        lines.push(`G97 S${op.speed_rpm ?? 1000} M180 (RPM MODE)`);
      }

      // Position
      if (op.start_x_mm !== undefined) {
        lines.push(`G00 X${op.start_x_mm.toFixed(3)} (RAPID X)`);
      }
      if (op.start_z_mm !== undefined) {
        lines.push(`G00 Z${op.start_z_mm.toFixed(3)} (RAPID Z — SUB REF)`);
      }

      // Execute
      const feed = op.feed_mm_rev ?? 0.1;
      switch (op.op_type) {
        case "face":
          lines.push(`G01 X${(op.end_x_mm ?? 0).toFixed(3)} F${feed.toFixed(3)} (FACE)`);
          break;
        case "drill":
          lines.push(`G74 Z${(op.end_z_mm ?? -10).toFixed(3)} F${feed.toFixed(3)} (PECK DRILL)`);
          break;
        case "bore":
          lines.push(`G01 Z${(op.end_z_mm ?? -10).toFixed(3)} F${feed.toFixed(3)} (BORE PASS)`);
          lines.push(`G01 X${(op.start_x_mm ?? 20).toFixed(3)} (RETRACT X)`);
          lines.push(`G00 Z2 (RETRACT Z)`);
          break;
        case "tap":
          lines.push(`G95 (FEED/REV)`);
          lines.push(`G84 Z${(op.end_z_mm ?? -10).toFixed(3)} F${feed.toFixed(3)} (RIGID TAP)`);
          break;
      }
      lines.push(`M181 (SUB STOP)`);
    }
  }

  /**
   * Emit dual-turret parallel ops with wait codes.
   */
  private emitDualTurret(
    t1Ops: string[],
    t2Ops: string[],
    waitCode: string,
    lines: string[],
  ): void {
    lines.push(`(--- DUAL TURRET PARALLEL ---)`);
    lines.push(`$1 (CHANNEL 1 — UPPER TURRET)`);
    for (const line of t1Ops) {
      lines.push(line);
    }
    lines.push(`${waitCode} (WAIT FOR T2)`);
    lines.push(``);
    lines.push(`$2 (CHANNEL 2 — LOWER TURRET)`);
    for (const line of t2Ops) {
      lines.push(line);
    }
    lines.push(`${waitCode} (WAIT FOR T1)`);
    lines.push(``);
    lines.push(`$1 (RESUME CHANNEL 1)`);
  }

  /**
   * Emit pickoff cycle (sub-spindle grabs finished part, no cutoff).
   */
  private emitPickoff(xfer: TransferCycle | undefined, lines: string[]): void {
    const approach = xfer?.approach_z_mm ?? 100;
    const transfer = xfer?.transfer_z_mm ?? 10;
    lines.push(`(PICKOFF CYCLE — SUB GRABS FINISHED PART)`);
    lines.push(`M3 S${xfer?.main_spindle_rpm ?? 50}`);
    lines.push(`M180 S${xfer?.sub_spindle_rpm ?? xfer?.main_spindle_rpm ?? 50}`);
    lines.push(`G145 (SYNC)`);
    lines.push(`G00 B${approach.toFixed(3)} (APPROACH)`);
    lines.push(`M227 (SUB CHUCK OPEN)`);
    lines.push(`G01 B${transfer.toFixed(3)} F300 (PICKOFF)`);
    lines.push(`M228 (SUB CHUCK CLOSE)`);
    lines.push(`G04 P500 (CLAMP DWELL)`);
    lines.push(`M87 (MAIN OPEN)`);
    const retractZ = (xfer?.clearance_z_mm ?? approach + 50);
    lines.push(`G00 B${retractZ.toFixed(3)} (RETRACT)`);
    lines.push(`G146 (SYNC OFF)`);
  }

  /**
   * Emit parts catcher cycle.
   */
  private emitPartsCatcher(lines: string[]): void {
    lines.push(`(PARTS CATCHER — EJECT TO BIN)`);
    lines.push(`M227 (SUB CHUCK OPEN)`);
    lines.push(`M24 (PARTS CATCHER OUT)`);
    lines.push(`G04 P2000 (DROP DWELL)`);
    lines.push(`M25 (CATCHER IN)`);
    lines.push(`M228 (SUB CHUCK READY)`);
  }

  /**
   * Generate a simple part transfer program (main → sub with cutoff).
   */
  generateSimpleTransfer(
    barDiameterMm: number,
    partLengthMm: number,
    material = "D2",
  ): SubSpindleProgram {
    return this.generate({
      material,
      part_description: `SIMPLE TRANSFER D${barDiameterMm} L${partLengthMm}`,
      operations: [{
        type: "sync_transfer",
        transfer: {
          main_spindle_rpm: 150,
          sub_spindle_rpm: 150,
          main_chuck_pressure: 80,
          sub_chuck_pressure: 70,
          approach_z_mm: partLengthMm + 5,
          transfer_z_mm: partLengthMm + 1,
          clearance_z_mm: partLengthMm + 100,
          cutoff_tool: 7,
          cutoff_tool_position: 7,
          cutoff_feed_mm_rev: 0.05,
          cutoff_x_target_mm: -1,
          slug_catcher: true,
        },
      }],
    });
  }

  /**
   * List supported operation types.
   */
  listOperations(): SubSpindleOperation[] {
    return ["sync_transfer", "sync_spindle", "sub_machining", "dual_turret", "pickoff", "parts_catcher"];
  }

  /**
   * List supported machine models.
   */
  listMachineModels(): string[] {
    return ["LU3000", "LU45", "LT3000", "LB3000II"];
  }
}

export const ppOkumaSubSpindleSyncEngine = new PPOkumaSubSpindleSyncEngine();
