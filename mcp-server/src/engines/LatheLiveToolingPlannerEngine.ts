/**
 * LatheLiveToolingPlannerEngine — feature→toolpath+G-code planner for driven tooling
 *
 * Re-modularized from PRISM v8.89.002 monolith
 * `extracted/engines/tools/PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE.js` (635 LOC).
 *
 * Distinct from the existing live-tooling engines, which it complements rather
 * than duplicates:
 *   - LiveToolingEngine            → feasibility / power / torque (no toolpath)
 *   - LiveToolingSyntaxEngine      → multi-controller G-code formatting of
 *                                    pre-computed move arrays (no feature→path)
 *   - LiveToolingIntelligenceEngine→ specific-power / material intelligence
 * This engine owns the missing layer: given a *feature* (cross-hole, C-axis
 * pocket/hex/keyway, Y-axis pocket) it computes the toolpath operation list,
 * emits self-contained Fanuc-style G-code, and estimates cycle time.
 *
 * Fail-loud (CLAUDE.md R12): the source monolith *referenced* seven feature
 * handlers it never defined (`_addCAxisSlot/Contour/Face`,
 * `_addYAxisSlot/Flat/Contour/Drilling`). Rather than silently emit an empty
 * program for those feature types (the monolith's latent bug), this port throws
 * a descriptive error naming the unimplemented handler.
 *
 * Actions: live_tool_plan (via prism_turning dispatcher)
 */

import { z } from "zod";

// ============================================================================
// CONSTANTS (planner heuristics — NOT physics; no canonical-constant source)
// ============================================================================

/**
 * Per-operation cycle-time model (seconds). These are coarse motion-class
 * estimates carried over verbatim from the monolith — deliberately not in
 * physics/constants.ts because they model controller motion latency, not a
 * material/cutting law.
 */
const CYCLE_TIME_MODEL = {
  rapidSec: 0.5,
  feedSec: 2.0,
} as const;

const DEG_PER_RAD = 180 / Math.PI;
const HEX_FACES = 6;
const HEX_HALF_ANGLE_RAD = Math.PI / 6; // 30° — half the included angle of a hex face

// ============================================================================
// TYPES
// ============================================================================

export type LiveToolingPlanOperation =
  | "cross_drilling"
  | "cross_tapping"
  | "c_axis_milling"
  | "y_axis_milling";

export type CAxisFeatureType =
  | "pocket"
  | "hex"
  | "keyway"
  | "slot"
  | "contour"
  | "face";

export type YAxisFeatureType =
  | "pocket"
  | "slot"
  | "flat"
  | "contour"
  | "drilling";

/** Tool description for a driven (live) tool. */
export interface PlannerToolSpec {
  diameter: number;
  rpm?: number;
  feedRate?: number;
  plungeFeed?: number;
  description?: string;
  liveToolStart?: number; // M-code, default 33
  liveToolStop?: number; // M-code, default 35
  liveToolReverse?: number; // M-code (CCW) for rigid-tap extract, default 34
}

/** Bar/billet stock the part is turned from. */
export interface PlannerStockSpec {
  diameter?: number;
}

/** Machine envelope flags consulted by the planner. */
export interface PlannerMachineConfig {
  hasCAxis: boolean;
  hasYAxis: boolean;
}

export interface CrossDrillHole {
  diameter?: number;
  depth?: number;
  cPosition?: number; // C-axis angle, deg
  zPosition?: number; // Z on the part
  clearance?: number;
  peckDepth?: number | null; // null → straight drill
  dwellTime?: number; // seconds at bottom
  pitch?: number; // thread pitch mm/rev -- REQUIRED for cross_tapping (rigid-tap feed sync)
}

export interface PlannerFeature {
  type?: string;
  // pocket
  width?: number;
  length?: number;
  height?: number;
  depth?: number;
  zPosition?: number;
  zStart?: number;
  cPosition?: number;
  cornerRadius?: number;
  xPosition?: number;
  yOffset?: number;
  // hex
  flatWidth?: number;
}

export interface LiveToolingPlanInput {
  operation: LiveToolingPlanOperation;
  tool: PlannerToolSpec;
  stock?: PlannerStockSpec;
  hole?: CrossDrillHole;
  feature?: PlannerFeature;
  machineConfig?: Partial<PlannerMachineConfig>;
}

export interface PlannedMotion {
  type: string;
  [k: string]: unknown;
}

export interface LiveToolingPlanResult {
  type: "CROSS_DRILLING" | "CROSS_TAPPING" | "C_AXIS_MILLING" | "Y_AXIS_MILLING";
  operations: PlannedMotion[];
  gcode: string[];
  cycleTime: number;
  tools: PlannerToolSpec[];
  confidence: ReturnType<LatheLiveToolingPlannerEngine["getConfidenceLevel"]>;
}

// ============================================================================
// VALIDATION
// ============================================================================

const toolSchema = z.object({
  diameter: z.number().positive(),
  rpm: z.number().positive().optional(),
  feedRate: z.number().positive().optional(),
  plungeFeed: z.number().positive().optional(),
  description: z.string().optional(),
  liveToolStart: z.number().int().optional(),
  liveToolStop: z.number().int().optional(),
  liveToolReverse: z.number().int().optional(),
});

// Explicit numeric field schemas (NOT z.record(z.any())): a string/NaN slipped
// through z.any() string-compares false against the centerline guard and then
// emits literal "NaN" into the G-code (silent-failure class — CLAUDE.md R12).
const finiteNum = z
  .number()
  .refine((n) => Number.isFinite(n), { message: "must be a finite number" });

const holeSchema = z
  .object({
    diameter: finiteNum.positive().optional(),
    depth: finiteNum.positive().optional(),
    cPosition: finiteNum.optional(),
    zPosition: finiteNum.optional(),
    clearance: finiteNum.nonnegative().optional(),
    peckDepth: finiteNum.positive().nullable().optional(),
    dwellTime: finiteNum.nonnegative().optional(),
    pitch: finiteNum.positive().optional(),
  })
  .strict();

const featureSchema = z
  .object({
    type: z.string().optional(),
    width: finiteNum.positive().optional(),
    length: finiteNum.positive().optional(),
    height: finiteNum.positive().optional(),
    depth: finiteNum.positive().optional(),
    zPosition: finiteNum.optional(),
    zStart: finiteNum.optional(),
    cPosition: finiteNum.optional(),
    cornerRadius: finiteNum.nonnegative().optional(),
    xPosition: finiteNum.optional(),
    yOffset: finiteNum.optional(),
    flatWidth: finiteNum.positive().optional(),
  })
  .strict();

const planInputSchema = z.object({
  operation: z.enum(["cross_drilling", "cross_tapping", "c_axis_milling", "y_axis_milling"]),
  tool: toolSchema,
  stock: z.object({ diameter: z.number().positive().optional() }).optional(),
  hole: holeSchema.optional(),
  feature: featureSchema.optional(),
  machineConfig: z
    .object({
      hasCAxis: z.boolean().optional(),
      hasYAxis: z.boolean().optional(),
    })
    .optional(),
});

// ============================================================================
// ENGINE
// ============================================================================

/** Lathe live-tooling feature→toolpath planner. */
export class LatheLiveToolingPlannerEngine {
  private readonly defaultMachineConfig: PlannerMachineConfig = {
    hasCAxis: true,
    hasYAxis: false,
  };

  /**
   * Plan a driven-tooling operation from a feature description.
   * @param input - operation selector + tool/stock/feature geometry
   * @returns operation list, self-contained G-code, and cycle-time estimate
   */
  plan(input: LiveToolingPlanInput): LiveToolingPlanResult {
    const parsed = planInputSchema.parse(input);
    const tool = parsed.tool as PlannerToolSpec;
    const stock = (parsed.stock ?? {}) as PlannerStockSpec;

    switch (parsed.operation) {
      case "cross_drilling":
        return this.generateCrossDrilling({
          tool,
          stock,
          hole: (parsed.hole ?? {}) as CrossDrillHole,
        });
      case "cross_tapping":
        return this.generateCrossTapping({
          tool,
          stock,
          hole: (parsed.hole ?? {}) as CrossDrillHole,
        });
      case "c_axis_milling":
        return this.generateCAxisMilling({
          tool,
          stock,
          feature: (parsed.feature ?? {}) as PlannerFeature,
        });
      case "y_axis_milling":
        return this.generateYAxisMilling({
          tool,
          stock,
          feature: (parsed.feature ?? {}) as PlannerFeature,
          machineConfig: {
            ...this.defaultMachineConfig,
            ...(parsed.machineConfig ?? {}),
          },
        });
      default: {
        // Exhaustiveness guard — unreachable given the zod enum.
        const _never: never = parsed.operation;
        throw new Error(`Unknown live-tooling operation: ${String(_never)}`);
      }
    }
  }

  /** Dispatcher-compatible alias (turningDispatcher calls `engine.calculate`). */
  calculate(input: LiveToolingPlanInput): LiveToolingPlanResult {
    return this.plan(input);
  }

  // --------------------------------------------------------------------------
  // CROSS DRILLING
  // --------------------------------------------------------------------------

  private generateCrossDrilling(p: {
    tool: PlannerToolSpec;
    stock: PlannerStockSpec;
    hole: CrossDrillHole;
  }): LiveToolingPlanResult {
    const { tool, stock, hole } = p;
    const diameter = hole.diameter ?? 6.0;
    const depth = hole.depth ?? 15.0;
    const cPosition = hole.cPosition ?? 0;
    const zPosition = hole.zPosition ?? -25.0;
    const clearance = hole.clearance ?? 2.0;
    const peckDepth = hole.peckDepth ?? null;
    const dwellTime = hole.dwellTime ?? 0.1;

    const operations: PlannedMotion[] = [];
    const stockRadius = (stock.diameter ?? 50) / 2;
    this.assertRadialDepth(depth, stockRadius, "cross_drilling");
    const xApproach = stockRadius + clearance;

    operations.push({ type: "POSITION_C_AXIS", c: cPosition, rapid: true });
    operations.push({ type: "RAPID_Z", z: zPosition });
    operations.push({ type: "RAPID_X", x: xApproach * 2 }); // diameter programming

    if (peckDepth && depth > peckDepth * 2) {
      const pecks = Math.ceil(depth / peckDepth);
      for (let i = 1; i <= pecks; i++) {
        const currentDepth = Math.min(i * peckDepth, depth);
        const xTarget = (stockRadius - currentDepth) * 2;
        operations.push({
          type: "DRILL_FEED",
          x: xTarget,
          feed: tool.feedRate ?? 0.1,
          peckNumber: i,
        });
        if (i < pecks) {
          operations.push({
            type: "PECK_RETRACT",
            x: xApproach * 2,
            rapid: true,
          });
        }
      }
    } else {
      const xTarget = (stockRadius - depth) * 2;
      operations.push({
        type: "DRILL_FEED",
        x: xTarget,
        feed: tool.feedRate ?? 0.1,
      });
    }

    if (dwellTime > 0) {
      operations.push({ type: "DWELL", time: dwellTime });
    }
    operations.push({ type: "RAPID_RETRACT", x: xApproach * 2 + 10 });

    return this.assemble(
      "CROSS_DRILLING",
      operations,
      this.gcodeCrossDrilling(operations, tool, diameter),
      tool,
    );
  }

  // --------------------------------------------------------------------------
  // CROSS TAPPING (rigid, live-tool radial tap at a C-angle)
  // U-LW-CROSS-TAP: cross-drilling existed but tapping was a genuine coverage gap
  // (capability audit #1). A rigid tap syncs feed to pitch (F = pitch*rpm mm/min),
  // taps IN, reverses the live tool, then feeds back OUT to extract. Additive new
  // op -- the 3 existing operations (drill/c-axis/y-axis) stay byte-identical.
  // --------------------------------------------------------------------------

  private generateCrossTapping(p: {
    tool: PlannerToolSpec;
    stock: PlannerStockSpec;
    hole: CrossDrillHole;
  }): LiveToolingPlanResult {
    const { tool, stock, hole } = p;
    const diameter = hole.diameter ?? 6.0; // thread major diameter
    const depth = hole.depth ?? 12.0; // radial thread depth
    const cPosition = hole.cPosition ?? 0;
    const zPosition = hole.zPosition ?? -25.0;
    const clearance = hole.clearance ?? 2.0;
    const pitch = hole.pitch;
    // R12 fail-loud: a rigid tap MUST know its pitch (feed is synced to it). A wrong or
    // absent pitch snaps the tap -- never default-guess it.
    if (pitch === undefined || !Number.isFinite(pitch) || pitch <= 0) {
      throw new Error(
        "cross_tapping requires hole.pitch (thread pitch mm/rev, positive finite) -- a rigid tap syncs feed to pitch",
      );
    }

    const operations: PlannedMotion[] = [];
    const stockRadius = (stock.diameter ?? 50) / 2;
    this.assertRadialDepth(depth, stockRadius, "cross_tapping");
    const xApproach = stockRadius + clearance;
    const xTarget = (stockRadius - depth) * 2; // diameter programming

    operations.push({ type: "POSITION_C_AXIS", c: cPosition, rapid: true });
    operations.push({ type: "RAPID_Z", z: zPosition });
    operations.push({ type: "RAPID_X", x: xApproach * 2 });
    // Rigid tap IN -- feed synchronized to pitch (spindle CW, M33 default).
    operations.push({ type: "TAP_FEED", x: xTarget, feed: pitch, direction: "in" });
    // Reverse the live tool + feed back OUT to extract the tap (same synced pitch).
    operations.push({ type: "REVERSE_LIVE_TOOL" });
    operations.push({ type: "TAP_FEED", x: xApproach * 2, feed: pitch, direction: "out" });
    operations.push({ type: "RAPID_RETRACT", x: xApproach * 2 + 10 });

    return this.assemble(
      "CROSS_TAPPING",
      operations,
      this.gcodeCrossTapping(operations, tool, diameter, pitch),
      tool,
    );
  }

  // --------------------------------------------------------------------------
  // C-AXIS MILLING (polar interpolation)
  // --------------------------------------------------------------------------

  private generateCAxisMilling(p: {
    tool: PlannerToolSpec;
    stock: PlannerStockSpec;
    feature: PlannerFeature;
  }): LiveToolingPlanResult {
    const { tool, stock, feature } = p;
    const operations: PlannedMotion[] = [];
    const featureType = (feature.type ?? "pocket") as CAxisFeatureType;

    operations.push({ type: "ENABLE_POLAR", mode: "G12.1" });
    operations.push({ type: "SPINDLE_C_AXIS", command: "M19" });

    switch (featureType) {
      case "pocket":
        this.addCAxisPocket(operations, feature, tool, stock);
        break;
      case "hex":
        this.addHexMilling(operations, feature, tool, stock);
        break;
      case "keyway":
        this.addKeywayMilling(operations, feature, tool, stock);
        break;
      case "slot":
      case "contour":
      case "face":
        throw new Error(
          `c_axis_milling feature "${featureType}" is not implemented — ` +
            `the v8.89 monolith referenced _addCAxis${featureType[0].toUpperCase()}${featureType.slice(1)} ` +
            `but never defined it. Use pocket | hex | keyway.`,
        );
      default: {
        const _never: never = featureType;
        throw new Error(`Unknown C-axis feature type: ${String(_never)}`);
      }
    }

    operations.push({ type: "CANCEL_POLAR", mode: "G13.1" });

    return this.assemble(
      "C_AXIS_MILLING",
      operations,
      this.gcodeCAxisMilling(operations, tool),
      tool,
    );
  }

  private addCAxisPocket(
    operations: PlannedMotion[],
    feature: PlannerFeature,
    tool: PlannerToolSpec,
    stock: PlannerStockSpec,
  ): void {
    const width = feature.width ?? 20;
    const length = feature.length ?? 30;
    const depth = feature.depth ?? 5;
    const zPosition = feature.zPosition ?? -25;
    const cPosition = feature.cPosition ?? 0;

    const stockRadius = (stock.diameter ?? 50) / 2;
    this.assertRadialDepth(depth, stockRadius, "c_axis pocket");
    // tool.diameter is schema-required (z.number().positive()), so the
    // monolith's `|| 10` fallback is intentionally dropped — no silent 10mm.
    const toolRadius = tool.diameter / 2;
    const stepover = tool.diameter * 0.4;
    const depthPerPass = tool.diameter * 0.5;
    const passes = Math.ceil(depth / depthPerPass);
    const cHalfSpan = (length / 2 / stockRadius) * DEG_PER_RAD;

    for (let pass = 1; pass <= passes; pass++) {
      const currentDepth = Math.min(pass * depthPerPass, depth);
      const xDepth = stockRadius - currentDepth;
      const numPasses = Math.ceil((width / 2 - toolRadius) / stepover);

      for (let i = 0; i < numPasses; i++) {
        const currentWidth = toolRadius + (i + 1) * stepover;
        operations.push({
          type: "POLAR_MOVE",
          x: xDepth * 2,
          c: cPosition - cHalfSpan,
          z: zPosition - currentWidth,
          feed: tool.feedRate,
        });
        operations.push({
          type: "POLAR_MOVE",
          x: xDepth * 2,
          c: cPosition + cHalfSpan,
          z: zPosition - currentWidth,
          feed: tool.feedRate,
        });
        if (i < numPasses - 1) {
          operations.push({
            type: "POLAR_MOVE",
            x: xDepth * 2,
            c: cPosition + cHalfSpan,
            z: zPosition - currentWidth - stepover,
            feed: tool.feedRate,
          });
        }
      }
    }
  }

  private addHexMilling(
    operations: PlannedMotion[],
    feature: PlannerFeature,
    tool: PlannerToolSpec,
    stock: PlannerStockSpec,
  ): void {
    const flatWidth = feature.flatWidth ?? 17; // across-flats
    const depth = feature.depth ?? 3;
    const cPosition = feature.cPosition ?? 0;
    const stockRadius = (stock.diameter ?? 50) / 2;
    // Circumradius from across-flats: R = AF / (2 cos30°). Retained for
    // downstream consumers / validation though the monolith only used it
    // implicitly via the constant face spacing.
    const hexCircumradius = flatWidth / (2 * Math.cos(HEX_HALF_ANGLE_RAD));
    void hexCircumradius;

    for (let face = 0; face < HEX_FACES; face++) {
      const angle = cPosition + face * (360 / HEX_FACES);
      operations.push({ type: "POSITION_C", c: angle });
      operations.push({
        type: "FACE_CUT",
        x: (stockRadius - depth) * 2,
        feed: tool.feedRate,
      });
    }
    for (let face = 0; face < HEX_FACES; face++) {
      const angle = cPosition + face * (360 / HEX_FACES);
      operations.push({
        type: "FINISH_FACE",
        c: angle,
        x: (stockRadius - depth) * 2,
        feed: (tool.feedRate ?? 0) * 0.5,
      });
    }
  }

  private addKeywayMilling(
    operations: PlannedMotion[],
    feature: PlannerFeature,
    tool: PlannerToolSpec,
    stock: PlannerStockSpec,
  ): void {
    const length = feature.length ?? 25;
    const depth = feature.depth ?? 3.5;
    const zStart = feature.zStart ?? -15;
    const cPosition = feature.cPosition ?? 0;
    const stockRadius = (stock.diameter ?? 50) / 2;

    operations.push({ type: "POSITION_C", c: cPosition });
    const xDepth = (stockRadius - depth) * 2;
    operations.push({
      type: "PLUNGE",
      x: xDepth,
      feed: tool.plungeFeed ?? (tool.feedRate ?? 0) * 0.5,
    });
    operations.push({
      type: "LINEAR_Z",
      z: zStart - length,
      feed: tool.feedRate,
    });
    operations.push({ type: "RAPID_RETRACT", x: stockRadius * 2 + 5 });
  }

  // --------------------------------------------------------------------------
  // Y-AXIS MILLING
  // --------------------------------------------------------------------------

  private generateYAxisMilling(p: {
    tool: PlannerToolSpec;
    stock: PlannerStockSpec;
    feature: PlannerFeature;
    machineConfig: PlannerMachineConfig;
  }): LiveToolingPlanResult {
    const { tool, stock, feature, machineConfig } = p;
    if (!machineConfig.hasYAxis) {
      throw new Error("Machine does not have Y-axis capability");
    }

    const operations: PlannedMotion[] = [];
    operations.push({ type: "C_AXIS_LOCK", c: feature.cPosition ?? 0 });
    operations.push({
      type: "LIVE_TOOL_START",
      rpm: tool.rpm ?? 3000,
      direction: "CW",
    });

    const featureType = (feature.type ?? "pocket") as YAxisFeatureType;
    switch (featureType) {
      case "pocket":
        this.addYAxisPocket(operations, feature, tool, stock);
        break;
      case "slot":
      case "flat":
      case "contour":
      case "drilling":
        throw new Error(
          `y_axis_milling feature "${featureType}" is not implemented — ` +
            `the v8.89 monolith referenced _addYAxis${featureType[0].toUpperCase()}${featureType.slice(1)} ` +
            `but never defined it. Use pocket.`,
        );
      default: {
        const _never: never = featureType;
        throw new Error(`Unknown Y-axis feature type: ${String(_never)}`);
      }
    }

    operations.push({ type: "LIVE_TOOL_STOP" });
    operations.push({ type: "C_AXIS_RELEASE" });

    return this.assemble(
      "Y_AXIS_MILLING",
      operations,
      this.gcodeYAxisMilling(operations, tool),
      tool,
    );
  }

  private addYAxisPocket(
    operations: PlannedMotion[],
    feature: PlannerFeature,
    tool: PlannerToolSpec,
    stock: PlannerStockSpec,
  ): void {
    const width = feature.width ?? 20;
    const height = feature.height ?? 15;
    const depth = feature.depth ?? 5;
    const yOffset = feature.yOffset ?? 0;
    const zStart = feature.zStart ?? -25;
    const stockRadius = (stock.diameter ?? 50) / 2;
    const toolRadius = tool.diameter / 2;
    const stepover = tool.diameter * 0.4;
    const depthPerPass = tool.diameter * 0.3;
    const passes = Math.ceil(depth / depthPerPass);

    for (let pass = 1; pass <= passes; pass++) {
      const currentDepth = Math.min(pass * depthPerPass, depth);
      const xCurrent = (stockRadius - currentDepth) * 2;

      operations.push({
        type: "RAPID",
        x: stockRadius * 2 + 5,
        y: yOffset - height / 2,
        z: zStart,
      });
      operations.push({
        type: "PLUNGE",
        x: xCurrent,
        feed: tool.plungeFeed ?? (tool.feedRate ?? 0) * 0.3,
      });

      const numPasses = Math.ceil((height - toolRadius * 2) / stepover);
      for (let i = 0; i <= numPasses; i++) {
        const yPos = yOffset - height / 2 + toolRadius + i * stepover;
        const direction = i % 2 === 0 ? 1 : -1;
        operations.push({
          type: "LINEAR",
          z:
            zStart +
            (direction > 0 ? -width / 2 + toolRadius : width / 2 - toolRadius),
          y: yPos,
          feed: tool.feedRate,
        });
        operations.push({
          type: "LINEAR",
          z:
            zStart +
            (direction > 0 ? width / 2 - toolRadius : -width / 2 + toolRadius),
          y: yPos,
          feed: tool.feedRate,
        });
        if (i < numPasses) {
          operations.push({
            type: "LINEAR",
            y: yPos + stepover,
            feed: tool.feedRate,
          });
        }
      }
    }
    operations.push({
      type: "FINISH_CONTOUR",
      path: "pocket_perimeter",
      feed: (tool.feedRate ?? 0) * 0.7,
    });
  }

  // --------------------------------------------------------------------------
  // G-CODE GENERATION
  // --------------------------------------------------------------------------

  private gcodeCrossDrilling(
    operations: PlannedMotion[],
    tool: PlannerToolSpec,
    holeDiameter: number,
  ): string[] {
    const gcode: string[] = [];
    gcode.push("(CROSS DRILLING OPERATION)");
    gcode.push(`(TOOL: ${tool.description ?? "DRILL D" + holeDiameter})`);
    gcode.push("");
    gcode.push("M19 (ORIENT MAIN SPINDLE)");
    gcode.push(`M${tool.liveToolStart ?? 33} (START LIVE TOOL CW)`);
    gcode.push(`S${tool.rpm ?? 2000}`);

    const rpm = tool.rpm ?? 2000;
    for (const op of operations) {
      switch (op.type) {
        case "POSITION_C_AXIS":
          gcode.push(`C${(op.c as number).toFixed(3)}`);
          break;
        case "RAPID_Z":
          gcode.push(`G0 Z${(op.z as number).toFixed(3)}`);
          break;
        case "RAPID_X":
          gcode.push(`G0 X${(op.x as number).toFixed(3)}`);
          break;
        case "DRILL_FEED":
          gcode.push(
            `G1 X${(op.x as number).toFixed(3)} F${((op.feed as number) * rpm).toFixed(0)}`,
          );
          break;
        case "PECK_RETRACT":
        case "RAPID_RETRACT":
          gcode.push(`G0 X${(op.x as number).toFixed(3)}`);
          break;
        case "DWELL":
          gcode.push(`G4 P${((op.time as number) * 1000).toFixed(0)}`);
          break;
      }
    }
    gcode.push(`M${tool.liveToolStop ?? 35} (STOP LIVE TOOL)`);
    gcode.push("M5 (SPINDLE STOP)");
    return gcode;
  }

  private gcodeCrossTapping(
    operations: PlannedMotion[],
    tool: PlannerToolSpec,
    holeDiameter: number,
    pitch: number,
  ): string[] {
    const gcode: string[] = [];
    gcode.push("(CROSS TAPPING OPERATION - RIGID, LIVE TOOL RADIAL)");
    gcode.push(`(TOOL: ${tool.description ?? "TAP D" + holeDiameter + " PITCH" + pitch})`);
    gcode.push(`(RIGID TAP: FEED SYNCED TO PITCH ${pitch}mm/rev)`);
    gcode.push("");
    gcode.push("M19 (ORIENT MAIN SPINDLE)");
    gcode.push(`M${tool.liveToolStart ?? 33} (START LIVE TOOL CW)`);
    const rpm = tool.rpm ?? 800;
    gcode.push(`S${rpm}`);

    for (const op of operations) {
      switch (op.type) {
        case "POSITION_C_AXIS":
          gcode.push(`C${(op.c as number).toFixed(3)}`);
          break;
        case "RAPID_Z":
          gcode.push(`G0 Z${(op.z as number).toFixed(3)}`);
          break;
        case "RAPID_X":
          gcode.push(`G0 X${(op.x as number).toFixed(3)}`);
          break;
        case "TAP_FEED":
          // Synced feed mm/min = pitch(mm/rev) * rpm -- the rigid-tap invariant.
          gcode.push(
            `G1 X${(op.x as number).toFixed(3)} F${((op.feed as number) * rpm).toFixed(0)} (TAP ${op.direction === "out" ? "EXTRACT" : "IN"} - PITCH-SYNC)`,
          );
          break;
        case "REVERSE_LIVE_TOOL":
          gcode.push(`M${tool.liveToolReverse ?? 34} (REVERSE LIVE TOOL CCW - TAP EXTRACT)`);
          break;
        case "RAPID_RETRACT":
          gcode.push(`G0 X${(op.x as number).toFixed(3)}`);
          break;
      }
    }
    gcode.push(`M${tool.liveToolStop ?? 35} (STOP LIVE TOOL)`);
    gcode.push("M5 (SPINDLE STOP)");
    return gcode;
  }

  private gcodeCAxisMilling(
    operations: PlannedMotion[],
    tool: PlannerToolSpec,
  ): string[] {
    const gcode: string[] = [];
    gcode.push("(C-AXIS MILLING - POLAR INTERPOLATION)");
    gcode.push(`(TOOL: ${tool.description ?? "ENDMILL D" + tool.diameter})`);
    gcode.push("");

    for (const op of operations) {
      switch (op.type) {
        case "ENABLE_POLAR":
          gcode.push(`${op.mode as string} (POLAR INTERPOLATION ON)`);
          break;
        case "CANCEL_POLAR":
          gcode.push(`${op.mode as string} (POLAR INTERPOLATION OFF)`);
          break;
        case "SPINDLE_C_AXIS":
          gcode.push(`${op.command as string} (ORIENT SPINDLE FOR C-AXIS)`);
          break;
        case "POLAR_MOVE":
          gcode.push(
            `G1 X${(op.x as number).toFixed(3)} C${(op.c as number).toFixed(3)} Z${(op.z as number).toFixed(3)} F${(op.feed as number).toFixed(0)}`,
          );
          break;
        case "POSITION_C":
          gcode.push(`G0 C${(op.c as number).toFixed(3)}`);
          break;
        case "FACE_CUT":
        case "FINISH_FACE":
        case "PLUNGE":
          gcode.push(
            `G1 X${(op.x as number).toFixed(3)} F${(op.feed as number).toFixed(0)}`,
          );
          break;
        case "LINEAR_Z":
          gcode.push(
            `G1 Z${(op.z as number).toFixed(3)} F${(op.feed as number).toFixed(0)}`,
          );
          break;
        case "RAPID_RETRACT":
          gcode.push(`G0 X${(op.x as number).toFixed(3)}`);
          break;
      }
    }
    return gcode;
  }

  private gcodeYAxisMilling(
    operations: PlannedMotion[],
    tool: PlannerToolSpec,
  ): string[] {
    const gcode: string[] = [];
    gcode.push("(Y-AXIS MILLING OPERATION)");
    gcode.push(`(TOOL: ${tool.description ?? "ENDMILL D" + tool.diameter})`);
    gcode.push("");

    for (const op of operations) {
      switch (op.type) {
        case "C_AXIS_LOCK":
          gcode.push(`M19 C${(op.c as number).toFixed(3)} (LOCK C-AXIS)`);
          break;
        case "C_AXIS_RELEASE":
          gcode.push("M20 (RELEASE C-AXIS)");
          break;
        case "LIVE_TOOL_START":
          gcode.push(`M33 S${op.rpm as number} (START LIVE TOOL)`);
          break;
        case "LIVE_TOOL_STOP":
          gcode.push("M35 (STOP LIVE TOOL)");
          break;
        case "RAPID": {
          let line = "G0";
          if (op.x !== undefined) line += ` X${(op.x as number).toFixed(3)}`;
          if (op.y !== undefined) line += ` Y${(op.y as number).toFixed(3)}`;
          if (op.z !== undefined) line += ` Z${(op.z as number).toFixed(3)}`;
          gcode.push(line);
          break;
        }
        case "LINEAR":
        case "PLUNGE": {
          let line = "G1";
          if (op.x !== undefined) line += ` X${(op.x as number).toFixed(3)}`;
          if (op.y !== undefined) line += ` Y${(op.y as number).toFixed(3)}`;
          if (op.z !== undefined) line += ` Z${(op.z as number).toFixed(3)}`;
          line += ` F${(op.feed as number).toFixed(0)}`;
          gcode.push(line);
          break;
        }
      }
    }
    return gcode;
  }

  // --------------------------------------------------------------------------
  // SHARED
  // --------------------------------------------------------------------------

  /**
   * Radial-depth safety guard. On a lathe every live-tool feature removes
   * material inward from the OD; a radial depth >= stock radius drives the
   * X diameter target (R-depth)*2 to <=0 — the tool crossing the spindle
   * centerline. Fail loud rather than emit a centerline-breaching program.
   */
  private assertRadialDepth(
    depth: number,
    stockRadius: number,
    ctx: string,
  ): void {
    if (depth >= stockRadius) {
      throw new Error(
        `${ctx} depth ${depth}mm meets/exceeds stock radius ${stockRadius}mm — toolpath would breach centerline`,
      );
    }
  }

  private estimateCycleTime(operations: PlannedMotion[]): number {
    let time = 0;
    for (const op of operations) {
      switch (op.type) {
        case "POSITION_C_AXIS":
        case "RAPID_Z":
        case "RAPID_X":
        case "RAPID":
          time += CYCLE_TIME_MODEL.rapidSec;
          break;
        case "DRILL_FEED":
        case "TAP_FEED":
        case "POLAR_MOVE":
        case "LINEAR":
        case "PLUNGE":
          time += CYCLE_TIME_MODEL.feedSec;
          break;
        case "DWELL":
          time += (op.time as number) ?? 0.1;
          break;
      }
    }
    return time;
  }

  private assemble(
    type: LiveToolingPlanResult["type"],
    operations: PlannedMotion[],
    gcode: string[],
    tool: PlannerToolSpec,
  ): LiveToolingPlanResult {
    return {
      type,
      operations,
      gcode,
      cycleTime: this.estimateCycleTime(operations),
      tools: [tool],
      confidence: this.getConfidenceLevel(),
    };
  }

  /** Self-reported confidence by sub-capability (carried from the monolith). */
  getConfidenceLevel(): {
    overall: number;
    crossDrilling: number;
    crossTapping: number;
    cAxisMilling: number;
    yAxisMilling: number;
    polygonTurning: number;
    threadWhirling: number;
  } {
    return {
      overall: 0.85,
      crossDrilling: 0.92,
      crossTapping: 0.85,
      cAxisMilling: 0.88,
      yAxisMilling: 0.82,
      polygonTurning: 0.75,
      threadWhirling: 0.7,
    };
  }
}

/** Singleton — matches sibling lathe-engine + turningDispatcher convention. */
export const latheLiveToolingPlannerEngine = new LatheLiveToolingPlannerEngine();
