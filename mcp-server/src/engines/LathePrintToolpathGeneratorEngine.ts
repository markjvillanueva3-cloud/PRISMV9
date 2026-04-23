/**
 * LathePrintToolpathGeneratorEngine — U-LTH39 (LATHE-MASTER P4)
 *
 * From sequence plan → per-operation toolpath with G-code and cycle-time prediction.
 * Generates moves (rapid, feed, arc, canned cycle) based on feature geometry + strategy.
 *
 * Physics:
 *   - Cutting speed: Vc = π · D · N / 1000 (m/min)
 *   - Spindle RPM: N = 1000 · Vc / (π · D)
 *   - Feed per min: Fmm_min = fz · N (mm/rev × RPM)
 *   - Kienzle force check: Fc = kc1.1 · ap · fz^(1-mc)
 *   - Cycle time per pass: T = L / Fmm_min (min) · 60 (sec)
 *
 * Citations:
 *   - Sandvik Coromant: Turning Handbook (Vc/fz tables)
 *   - Machinery's Handbook 31st: Lathe operations
 *   - ISO 13399: Cutting tool data exchange
 *
 * @milestone LATHE-MASTER U-LTH39
 * @version 1.0.0
 */

import { z } from "zod";
import type { FeatureInput, MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SequencePlan, PlannedOperation } from "./LathePrintSequencePlannerEngine.js";

// ============================================================================
// PHYSICS CONSTANTS (Sandvik cutting data baseline)
// ============================================================================

/** Base cutting speed Vc (m/min) by ISO group, category */
const BASE_VC: Record<string, Record<string, number>> = {
  P: { rough: 180, finish: 240, drill: 60, bore: 160, thread: 80, groove: 150 },
  M: { rough: 140, finish: 200, drill: 45, bore: 130, thread: 65, groove: 120 },
  K: { rough: 160, finish: 220, drill: 70, bore: 150, thread: 70, groove: 140 },
  N: { rough: 400, finish: 650, drill: 120, bore: 400, thread: 180, groove: 350 },
  S: { rough: 45,  finish: 65,  drill: 15, bore: 40,  thread: 25, groove: 40  },
  H: { rough: 80,  finish: 120, drill: 20, bore: 70,  thread: 30, groove: 70  },
};

/** Base feed per rev fz (mm/rev) by category */
const BASE_FZ: Record<string, number> = {
  rough: 0.30, finish: 0.12, drill: 0.15, bore: 0.18, thread: 1.50, groove: 0.08,
};

/** Base depth of cut ap (mm) by category */
const BASE_AP: Record<string, number> = {
  rough: 2.5, finish: 0.3, drill: 0, bore: 1.0, thread: 0, groove: 0,
};

/** Rapid feed rate (mm/min) */
const RAPID_FEED_MM_MIN = 20000;
/** Safety retract distance above workpiece (mm) */
const SAFE_Z_MM = 2.0;
const SAFE_X_CLEARANCE_MM = 2.0;

// ============================================================================
// SCHEMAS
// ============================================================================

export const ToolpathMoveSchema = z.object({
  move_type: z.enum(["rapid", "feed_linear", "feed_arc_cw", "feed_arc_ccw", "canned_cycle", "dwell", "tool_change"]),
  x_mm: z.number().optional(),
  z_mm: z.number().optional(),
  i_mm: z.number().optional(),  // arc center offset
  k_mm: z.number().optional(),
  feed_mm_min: z.number().min(0).optional(),
  rpm: z.number().min(0).optional(),
  gcode: z.string(),
  duration_sec: z.number().min(0),
  comment: z.string().optional(),
});
export type ToolpathMove = z.infer<typeof ToolpathMoveSchema>;

export const ToolpathOperationSchema = z.object({
  op_number: z.number().int().positive(),
  featureId: z.string(),
  featureType: z.string(),
  strategy_id: z.string(),
  tool_id: z.string(),
  cutting_speed_m_min: z.number().min(0),
  spindle_rpm: z.number().min(0),
  feed_mm_rev: z.number().min(0),
  feed_mm_min: z.number().min(0),
  depth_of_cut_mm: z.number().min(0),
  number_of_passes: z.number().int().min(0),
  moves: z.array(ToolpathMoveSchema),
  cycle_time_sec: z.number().min(0),
  cutting_force_n: z.number().min(0),
  material_removal_rate_cm3_min: z.number().min(0),
  warnings: z.array(z.string()),
});
export type ToolpathOperation = z.infer<typeof ToolpathOperationSchema>;

export const ToolpathProgramSchema = z.object({
  program_id: z.string(),
  source_sequence_plan_id: z.string(),
  operations: z.array(ToolpathOperationSchema),
  total_cycle_time_sec: z.number().min(0),
  total_rapid_time_sec: z.number().min(0),
  total_feed_time_sec: z.number().min(0),
  total_cutting_volume_cm3: z.number().min(0),
  gcode_preview: z.string(),
  machine_envelope_check: z.object({
    max_x_mm: z.number(),
    max_z_mm: z.number(),
    min_x_mm: z.number(),
    min_z_mm: z.number(),
    within_envelope: z.boolean(),
  }),
  warnings: z.array(z.string()),
  timestamp: z.string(),
});
export type ToolpathProgram = z.infer<typeof ToolpathProgramSchema>;

export const MachineLimitsSchema = z.object({
  max_x_mm: z.number().min(0).max(1000),
  max_z_mm: z.number().min(0).max(3000),
  max_rpm: z.number().min(100).max(50000),
  max_feed_mm_min: z.number().min(0).max(50000),
});
export type MachineLimits = z.infer<typeof MachineLimitsSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToolpathGeneratorEngine {
  /**
   * Generate toolpath program from sequence plan + features + material
   * @param sequencePlan From LathePrintSequencePlannerEngine
   * @param features Original features (geometry context)
   * @param material ISO material for cutting data
   * @param limits Machine envelope (optional; defaults used if omitted)
   * @returns Complete ToolpathProgram with per-op moves, G-code, cycle time
   */
  generateProgram(
    sequencePlan: SequencePlan,
    features: FeatureInput[],
    material: MaterialInput,
    limits?: MachineLimits
  ): ToolpathProgram {
    if (!sequencePlan || !Array.isArray(sequencePlan.operations)) {
      throw new Error("Invalid sequence plan: missing operations");
    }
    if (!Array.isArray(features)) {
      throw new Error("Features must be an array");
    }

    const machineLimits = limits ?? {
      max_x_mm: 250,
      max_z_mm: 500,
      max_rpm: 5000,
      max_feed_mm_min: 10000,
    };
    MachineLimitsSchema.parse(machineLimits);

    const toolpathOps: ToolpathOperation[] = [];
    const warnings: string[] = [];

    let maxX = 0, maxZ = 0, minX = Infinity, minZ = Infinity;
    let totalRapidSec = 0;
    let totalFeedSec = 0;
    let totalVolCm3 = 0;

    for (const plannedOp of sequencePlan.operations) {
      const feature = features.find(f => f.id === plannedOp.featureId);
      if (!feature) {
        warnings.push(`No feature data for op ${plannedOp.op_number} (${plannedOp.featureId})`);
        continue;
      }

      const tpOp = this.generateOperation(plannedOp, feature, material, machineLimits);
      toolpathOps.push(tpOp);

      // Update envelope tracking
      tpOp.moves.forEach(m => {
        if (m.x_mm !== undefined) {
          maxX = Math.max(maxX, m.x_mm);
          minX = Math.min(minX, m.x_mm);
        }
        if (m.z_mm !== undefined) {
          maxZ = Math.max(maxZ, m.z_mm);
          minZ = Math.min(minZ, m.z_mm);
        }

        if (m.move_type === "rapid") totalRapidSec += m.duration_sec;
        else totalFeedSec += m.duration_sec;
      });

      totalVolCm3 += this.estimateVolume(feature) * tpOp.number_of_passes;
    }

    const envelopeOK =
      maxX <= machineLimits.max_x_mm &&
      maxZ <= machineLimits.max_z_mm;

    if (!envelopeOK) {
      warnings.push(`Toolpath exceeds machine envelope: X=${maxX.toFixed(1)} (max ${machineLimits.max_x_mm}), Z=${maxZ.toFixed(1)} (max ${machineLimits.max_z_mm})`);
    }

    const totalCycleSec = toolpathOps.reduce((s, o) => s + o.cycle_time_sec, 0);
    const gcodePreview = this.buildGCodePreview(toolpathOps);

    return {
      program_id: `tp_${Date.now()}`,
      source_sequence_plan_id: sequencePlan.plan_id,
      operations: toolpathOps,
      total_cycle_time_sec: totalCycleSec,
      total_rapid_time_sec: totalRapidSec,
      total_feed_time_sec: totalFeedSec,
      total_cutting_volume_cm3: totalVolCm3,
      gcode_preview: gcodePreview,
      machine_envelope_check: {
        max_x_mm: Math.max(0, maxX),
        max_z_mm: Math.max(0, maxZ),
        min_x_mm: minX === Infinity ? 0 : minX,
        min_z_mm: minZ === Infinity ? 0 : minZ,
        within_envelope: envelopeOK,
      },
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate a single operation's toolpath
   */
  private generateOperation(
    plannedOp: PlannedOperation,
    feature: FeatureInput,
    material: MaterialInput,
    limits: MachineLimits
  ): ToolpathOperation {
    const category = this.deriveCategory(plannedOp.strategy_id, feature.type);
    const warnings: string[] = [];

    // Step 1: Cutting speed + RPM
    const vcBase = BASE_VC[material.iso_group]?.[category] ?? 100;
    const matFactor = material.machinability_factor ?? 1.0;
    const vc = vcBase * matFactor;

    const dia = feature.diameter_mm ?? 25;
    let rpm = (1000 * vc) / (Math.PI * Math.max(dia, 1));
    if (rpm > limits.max_rpm) {
      warnings.push(`RPM ${rpm.toFixed(0)} capped to machine max ${limits.max_rpm}`);
      rpm = limits.max_rpm;
    }

    // Step 2: Feed per rev
    const fz = (BASE_FZ[category] ?? 0.15);
    let feed_mm_min = fz * rpm;
    if (feed_mm_min > limits.max_feed_mm_min) {
      warnings.push(`Feed ${feed_mm_min.toFixed(0)} capped to machine max ${limits.max_feed_mm_min}`);
      feed_mm_min = limits.max_feed_mm_min;
    }

    // Step 3: Depth of cut and number of passes
    const ap = BASE_AP[category] ?? 0.5;
    let numPasses = 1;
    if (category === "rough") {
      const totalDepth = Math.max(0, (feature.diameter_mm ?? 0) - (feature.diameter_mm ?? 0) * 0.9);
      numPasses = Math.max(1, Math.ceil(totalDepth / ap));
    } else if (feature.type === "drill") {
      const peckDepth = dia * 3;
      numPasses = Math.max(1, Math.ceil((feature.depth_mm ?? 10) / peckDepth));
    }

    // Step 4: Moves
    const moves = this.buildMoves(plannedOp, feature, category, rpm, feed_mm_min, ap, numPasses);

    // Step 5: Cutting force (Kienzle-proxy)
    const cuttingForce = this.estimateCuttingForce(material, category, ap, fz);

    // Step 6: MRR
    const mrr = this.calcMRR(category, ap, fz, rpm, dia);

    const cycleTime = moves.reduce((s, m) => s + m.duration_sec, 0);

    return {
      op_number: plannedOp.op_number,
      featureId: plannedOp.featureId,
      featureType: plannedOp.featureType,
      strategy_id: plannedOp.strategy_id,
      tool_id: plannedOp.tool_id ?? `T${String(plannedOp.tool_station ?? 1).padStart(2, "0")}`,
      cutting_speed_m_min: vc,
      spindle_rpm: Math.round(rpm),
      feed_mm_rev: fz,
      feed_mm_min: Math.round(feed_mm_min),
      depth_of_cut_mm: ap,
      number_of_passes: numPasses,
      moves,
      cycle_time_sec: cycleTime,
      cutting_force_n: cuttingForce,
      material_removal_rate_cm3_min: mrr,
      warnings,
    };
  }

  /**
   * Derive category from strategy ID or feature type
   */
  private deriveCategory(strategyId: string, featureType: string): string {
    if (featureType === "drill") return "drill";
    if (featureType === "id_bore") return "bore";
    if (featureType.startsWith("thread")) return "thread";
    if (featureType.startsWith("groove")) return "groove";
    if (strategyId.includes("rough")) return "rough";
    if (strategyId.includes("finish")) return "finish";
    if (strategyId.includes("bore")) return "bore";
    if (strategyId.includes("groove")) return "groove";
    if (strategyId.includes("thread")) return "thread";
    return "rough";
  }

  /**
   * Build sequence of toolpath moves for an operation
   */
  private buildMoves(
    plannedOp: PlannedOperation,
    feature: FeatureInput,
    category: string,
    rpm: number,
    feed: number,
    ap: number,
    numPasses: number
  ): ToolpathMove[] {
    const moves: ToolpathMove[] = [];
    const dia = feature.diameter_mm ?? 25;
    const length = feature.length_mm ?? 20;
    const depth = feature.depth_mm ?? 5;
    const toolId = plannedOp.tool_id ?? "T01";

    // 1. Tool change
    moves.push({
      move_type: "tool_change",
      gcode: `T${toolId.replace(/^T0?/, "").padStart(4, "0")} M06  (${plannedOp.strategy_name})`,
      duration_sec: 3.5,
      comment: `Tool change to ${toolId}`,
    });

    // 2. Rapid to safe approach
    const approachX = dia / 2 + SAFE_X_CLEARANCE_MM;
    const approachZ = SAFE_Z_MM;
    moves.push({
      move_type: "rapid",
      x_mm: approachX,
      z_mm: approachZ,
      gcode: `G00 X${(approachX * 2).toFixed(3)} Z${approachZ.toFixed(3)}`,
      duration_sec: 0.5,
      comment: "Rapid to approach",
    });

    // 3. Spindle on
    moves.push({
      move_type: "rapid",
      rpm: rpm,
      gcode: `M03 S${Math.round(rpm)}`,
      duration_sec: 2.0,
      comment: "Spindle on",
    });

    // 4. Operation-specific moves
    switch (category) {
      case "rough":
      case "finish":
      case "contour": {
        // OD turning: feed to start, then longitudinal cut
        for (let p = 0; p < numPasses; p++) {
          const cutDia = Math.max(dia - (numPasses - p - 1) * ap * 2, dia);
          moves.push({
            move_type: "feed_linear",
            x_mm: cutDia / 2,
            z_mm: 0,
            feed_mm_min: feed,
            gcode: `G01 X${cutDia.toFixed(3)} Z0 F${feed.toFixed(1)}`,
            duration_sec: (SAFE_Z_MM / feed) * 60,
            comment: `Feed to OD pass ${p + 1}`,
          });
          moves.push({
            move_type: "feed_linear",
            x_mm: cutDia / 2,
            z_mm: -length,
            feed_mm_min: feed,
            gcode: `G01 Z${(-length).toFixed(3)}`,
            duration_sec: (length / feed) * 60,
            comment: `Longitudinal cut pass ${p + 1}`,
          });
          // Retract
          moves.push({
            move_type: "rapid",
            x_mm: approachX,
            z_mm: SAFE_Z_MM,
            gcode: `G00 X${(approachX * 2).toFixed(3)} Z${SAFE_Z_MM}`,
            duration_sec: 0.3,
            comment: "Retract",
          });
        }
        break;
      }
      case "drill": {
        // G83 peck drilling
        const peckDepth = Math.max(dia * 2, 3);
        moves.push({
          move_type: "canned_cycle",
          x_mm: 0,
          z_mm: -depth,
          feed_mm_min: feed,
          gcode: `G83 X0 Z${(-depth).toFixed(3)} Q${(peckDepth * 1000).toFixed(0)} F${feed.toFixed(1)}`,
          duration_sec: (depth / feed) * 60 * 1.3,  // +30% for pecks
          comment: "Peck drill cycle",
        });
        moves.push({
          move_type: "canned_cycle",
          gcode: "G80",
          duration_sec: 0.1,
          comment: "Cancel cycle",
        });
        break;
      }
      case "bore": {
        moves.push({
          move_type: "feed_linear",
          x_mm: dia / 2,
          z_mm: 0,
          feed_mm_min: feed,
          gcode: `G01 X${dia.toFixed(3)} Z0 F${feed.toFixed(1)}`,
          duration_sec: 2.0,
          comment: "Enter bore",
        });
        moves.push({
          move_type: "feed_linear",
          x_mm: dia / 2,
          z_mm: -depth,
          feed_mm_min: feed,
          gcode: `G01 Z${(-depth).toFixed(3)}`,
          duration_sec: (depth / feed) * 60,
          comment: "Bore pass",
        });
        break;
      }
      case "thread": {
        const pitch = feature.tolerance_total_mm ?? 1.5;
        moves.push({
          move_type: "canned_cycle",
          x_mm: dia / 2,
          z_mm: -length,
          gcode: `G76 P010060 Q100 R${pitch.toFixed(3)} X${dia.toFixed(3)} Z${(-length).toFixed(3)} P${(pitch * 1000 * 0.6).toFixed(0)} Q${(pitch * 1000 * 0.1).toFixed(0)} F${pitch.toFixed(3)}`,
          duration_sec: (length / (pitch * rpm)) * 60 * 3,  // 3 passes typical
          comment: "Thread cycle G76",
        });
        break;
      }
      case "groove": {
        moves.push({
          move_type: "feed_linear",
          x_mm: dia / 2 - depth,
          z_mm: 0,
          feed_mm_min: feed,
          gcode: `G01 X${(dia - depth * 2).toFixed(3)} F${feed.toFixed(1)}`,
          duration_sec: (depth / feed) * 60,
          comment: "Plunge groove",
        });
        moves.push({
          move_type: "feed_linear",
          x_mm: dia / 2 + SAFE_X_CLEARANCE_MM,
          z_mm: 0,
          feed_mm_min: feed,
          gcode: `G01 X${(dia + SAFE_X_CLEARANCE_MM * 2).toFixed(3)}`,
          duration_sec: 0.5,
          comment: "Retract from groove",
        });
        break;
      }
      default:
        // Fallback
        moves.push({
          move_type: "feed_linear",
          x_mm: dia / 2,
          z_mm: -length,
          feed_mm_min: feed,
          gcode: `G01 X${dia.toFixed(3)} Z${(-length).toFixed(3)} F${feed.toFixed(1)}`,
          duration_sec: (length / feed) * 60,
          comment: `${category} operation`,
        });
    }

    // Final retract
    moves.push({
      move_type: "rapid",
      x_mm: approachX + 20,
      z_mm: SAFE_Z_MM + 10,
      gcode: `G00 X${((approachX + 20) * 2).toFixed(3)} Z${(SAFE_Z_MM + 10).toFixed(3)}`,
      duration_sec: 0.5,
      comment: "Safe retract",
    });

    return moves;
  }

  /**
   * Cutting force via Kienzle-proxy
   */
  private estimateCuttingForce(
    material: MaterialInput,
    category: string,
    ap: number,
    fz: number
  ): number {
    const kcByGroup: Record<string, number> = {
      P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200,
    };
    const kc = kcByGroup[material.iso_group] ?? 2000;
    const mc = 0.25; // typical
    // Fc = kc * ap * fz^(1-mc), fz in mm
    const fzEff = Math.max(fz, 0.001);
    return kc * Math.max(ap, 0.1) * Math.pow(fzEff, 1 - mc);
  }

  /**
   * Material removal rate (cm³/min)
   */
  private calcMRR(category: string, ap: number, fz: number, rpm: number, dia: number): number {
    if (category === "drill") {
      // Volume rate = feed × cross-section
      const crossArea = Math.PI * (dia / 2) * (dia / 2); // mm²
      const feedMmMin = fz * rpm;
      return (crossArea * feedMmMin) / 1000;  // cm³/min
    }
    if (category === "thread") {
      // Thread MRR: pitch volume per revolution × RPM
      // fz = pitch for threading; assume pitch width × 0.1mm depth per pass
      const effectiveAp = Math.max(ap, fz * 0.65); // thread depth ≈ 0.65·pitch
      return Math.max(0.01, (effectiveAp * fz * rpm) / 1000);
    }
    if (category === "groove") {
      const effectiveAp = Math.max(ap, 0.5); // plunge width
      return Math.max(0.01, (effectiveAp * fz * rpm) / 1000);
    }
    // Turning: Vc × ap × fz
    const vc = (Math.PI * dia * rpm) / 1000; // m/min
    const effectiveAp = Math.max(ap, 0.1); // ensure nonzero for any cutting op
    return Math.max(0.01, vc * effectiveAp * fz * 1); // cm³/min approx
  }

  /**
   * Volume estimate for a feature (cm³)
   */
  private estimateVolume(feature: FeatureInput): number {
    const dia = feature.diameter_mm ?? 25;
    const length = feature.length_mm ?? 10;
    const depth = feature.depth_mm ?? 5;

    switch (feature.type) {
      case "od_turn":
      case "taper_od":
        return (Math.PI * (dia / 20) * (dia / 20) * length / 10) * 0.1;
      case "face":
        return (Math.PI * (dia / 20) * (dia / 20) * depth / 10) * 0.1;
      case "drill":
      case "id_bore":
        return Math.PI * (dia / 20) * (dia / 20) * depth / 10;
      default:
        return 1;
    }
  }

  /**
   * Build condensed G-code preview
   */
  private buildGCodePreview(ops: ToolpathOperation[]): string {
    const lines: string[] = [
      "%",
      "O1000 (PRISM LATHE PROGRAM)",
      "G21 G99 G40 (METRIC FEED/REV CUTTER COMP OFF)",
      "G28 U0 W0 (HOME)",
      "",
    ];

    for (const op of ops) {
      lines.push(`(OP ${op.op_number}: ${op.featureType} — ${op.strategy_id})`);
      op.moves.forEach(m => lines.push(m.gcode));
      lines.push("");
    }

    lines.push("G28 U0 W0");
    lines.push("M30");
    lines.push("%");

    return lines.join("\n");
  }

  /**
   * Validate a generated program
   */
  validate(program: ToolpathProgram): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [...program.warnings];

    if (!program.machine_envelope_check.within_envelope) {
      errors.push("Toolpath exceeds machine envelope");
    }

    if (program.operations.length === 0) {
      errors.push("Empty toolpath program");
    }

    program.operations.forEach(op => {
      if (op.spindle_rpm <= 0) errors.push(`Op ${op.op_number}: invalid RPM ${op.spindle_rpm}`);
      if (op.cycle_time_sec <= 0) errors.push(`Op ${op.op_number}: zero cycle time`);
      warnings.push(...op.warnings);
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Export G-code only (for downstream post-processing)
   */
  exportGCode(program: ToolpathProgram): string {
    return program.gcode_preview;
  }

  /**
   * Get cycle time breakdown
   */
  getCycleTimeBreakdown(program: ToolpathProgram): {
    total_sec: number;
    total_min: number;
    rapid_sec: number;
    feed_sec: number;
    rapid_percent: number;
    feed_percent: number;
    productive_percent: number;
    by_operation_sec: Array<{ op: number; feature: string; seconds: number }>;
  } {
    const total = program.total_cycle_time_sec;
    return {
      total_sec: total,
      total_min: total / 60,
      rapid_sec: program.total_rapid_time_sec,
      feed_sec: program.total_feed_time_sec,
      rapid_percent: total > 0 ? (program.total_rapid_time_sec / total) * 100 : 0,
      feed_percent: total > 0 ? (program.total_feed_time_sec / total) * 100 : 0,
      productive_percent: total > 0 ? (program.total_feed_time_sec / total) * 100 : 0,
      by_operation_sec: program.operations.map(op => ({
        op: op.op_number,
        feature: op.featureType,
        seconds: op.cycle_time_sec,
      })),
    };
  }
}

export const lathePrintToolpathGeneratorEngine = new LathePrintToolpathGeneratorEngine();
