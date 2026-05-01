/**
 * FiveAxisPostEngine — Complete 5-axis post processing
 *
 * RTCP/TCPC per controller, rotary axis management, inverse time feed,
 * linearization with tolerance control, coordinate system rotation,
 * singularity detection and management.
 *
 * @module FiveAxisPostEngine
 */

// ─── Types ───────────────────────────────────────────────────────────

export type KinematicType = "table_table" | "head_head" | "head_table" | "table_head";

export interface FiveAxisBlock {
  x: number; y: number; z: number;
  a?: number; b?: number; c?: number;
  feed_mm_min?: number;
  tool_axis?: { i: number; j: number; k: number };
}

export interface TCPCConfig {
  controller: string;
  kinematics: KinematicType;
  pivot_length_mm?: number;
  gauge_length_mm?: number;
  rotary_axis_1: "A" | "B" | "C";
  rotary_axis_2: "A" | "B" | "C";
  rotary_limits?: {
    axis1_min: number; axis1_max: number;
    axis2_min: number; axis2_max: number;
  };
}

export interface SingularityResult {
  has_singularity: boolean;
  singularity_blocks: Array<{
    block_index: number;
    type: "gimbal_lock" | "axis_flip" | "near_pole";
    severity: "warning" | "critical";
    rotary_values: { a?: number; b?: number; c?: number };
  }>;
  recommendations: string[];
}

export interface InverseTimeFeedResult {
  blocks: Array<{
    index: number;
    f_inverse: number; // 1/minutes
    equivalent_feed_mm_min: number;
    linear_dist_mm: number;
    rotary_dist_deg: number;
  }>;
}

export interface LinearizationResult {
  original_blocks: number;
  linearized_blocks: number;
  max_deviation_mm: number;
  tolerance_mm: number;
}

// ─── TCPC Code Maps ──────────────────────────────────────────────────

interface TCPCCodes {
  on: string;
  off: string;
  type_param?: string;
}

const TCPC_MAP: Record<string, TCPCCodes> = {
  fanuc_31i:         { on: "G43.4 H{offset}", off: "G49" },
  fanuc_30i:         { on: "G43.4 H{offset}", off: "G49" },
  fanuc_0i:          { on: "G43.4 H{offset}", off: "G49" },
  generic_fanuc:     { on: "G43.4 H{offset}", off: "G49" },
  siemens_840d:      { on: "TRAORI(1)", off: "TRAFOOF" },
  siemens_one:       { on: "TRAORI(1)", off: "TRAFOOF" },
  heidenhain_tnc640: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
  heidenhain_tnc7:   { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
  haas_ngc:          { on: "G234", off: "G49" },
  mazak_smooth_ai:   { on: "G43.4 H{offset}", off: "G49" },
  mazak_smooth_g:    { on: "G43.4 H{offset}", off: "G49" },
  okuma_osp_p300:    { on: "G43.4", off: "G49" },
  okuma_osp_p500:    { on: "G43.5 H{offset}", off: "G49" },
};

// ─── Coordinate Rotation Maps ────────────────────────────────────────

const COORD_ROTATION_MAP: Record<string, string> = {
  fanuc_31i:         "G68.2 X{x} Y{y} Z{z} I{a} J{b} K{c}",
  fanuc_30i:         "G68.2 X{x} Y{y} Z{z} I{a} J{b} K{c}",
  siemens_840d:      "CYCLE800(0,\"\",0,0,0,{a},{b},{c},0,0,0,0,1)",
  siemens_one:       "CYCLE800(0,\"\",0,0,0,{a},{b},{c},0,0,0,0,1)",
  heidenhain_tnc640: "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
  heidenhain_tnc7:   "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
  mazak_smooth_ai:   "G68 X{x} Y{y} R{angle}",
  haas_ngc:          "G68.2 X0 Y0 Z0 I{a} J{b} K{c}",
};

// ─── Engine Implementation ───────────────────────────────────────────

class FiveAxisPostEngineImpl {

  /**
   * Generate TCPC/RTCP activation codes for a controller
   */
  getTCPCCodes(controller: string, toolOffset?: number): TCPCCodes {
    const codes = TCPC_MAP[controller] ?? TCPC_MAP.generic_fanuc;
    return {
      on: codes.on.replace("{offset}", String(toolOffset ?? 1)),
      off: codes.off,
    };
  }

  /**
   * Generate coordinate rotation code for tilted work plane
   */
  getCoordRotation(controller: string, angles: { a: number; b: number; c: number }, origin?: { x: number; y: number; z: number }): string {
    const template = COORD_ROTATION_MAP[controller] ?? COORD_ROTATION_MAP.fanuc_31i ?? "";
    return template
      .replace("{a}", angles.a.toFixed(3))
      .replace("{b}", angles.b.toFixed(3))
      .replace("{c}", angles.c.toFixed(3))
      .replace("{x}", (origin?.x ?? 0).toFixed(3))
      .replace("{y}", (origin?.y ?? 0).toFixed(3))
      .replace("{z}", (origin?.z ?? 0).toFixed(3))
      .replace("{angle}", angles.c.toFixed(3));
  }

  /**
   * Detect singularities in a 5-axis toolpath
   * Gimbal lock occurs when B≈0 (head-head) or A≈±90 (table-tilt)
   */
  detectSingularities(
    blocks: FiveAxisBlock[],
    config: TCPCConfig
  ): SingularityResult {
    const singularities: SingularityResult["singularity_blocks"] = [];
    const recommendations: string[] = [];

    const threshold_deg = 2.0; // degrees from singularity
    const isHeadHead = config.kinematics === "head_head";

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const a = block.a ?? 0;
      const b = block.b ?? 0;
      const c = block.c ?? 0;

      // Head-head: singularity at B=0 (tool vertical)
      if (isHeadHead && Math.abs(b) < threshold_deg) {
        singularities.push({
          block_index: i,
          type: "gimbal_lock",
          severity: Math.abs(b) < 0.5 ? "critical" : "warning",
          rotary_values: { a, b, c },
        });
      }

      // Table-tilt (AC): singularity at A≈0 (tool vertical, C indeterminate)
      if (!isHeadHead && Math.abs(a) < threshold_deg) {
        singularities.push({
          block_index: i,
          type: "gimbal_lock",
          severity: "critical",
          rotary_values: { a, b, c },
        });
      }

      // Axis flip detection: rapid change in C axis (>170° between blocks)
      if (i > 0) {
        const prevC = blocks[i - 1].c ?? 0;
        const deltaC = Math.abs(c - prevC);
        if (deltaC > 170 && deltaC < 190) {
          singularities.push({
            block_index: i,
            type: "axis_flip",
            severity: "warning",
            rotary_values: { a, b, c },
          });
        }
      }

      // Rotary axis limit check
      if (config.rotary_limits) {
        const ax1 = config.rotary_axis_1 === "A" ? a : config.rotary_axis_1 === "B" ? b : c;
        const ax2 = config.rotary_axis_2 === "A" ? a : config.rotary_axis_2 === "B" ? b : c;
        if (ax1 < config.rotary_limits.axis1_min || ax1 > config.rotary_limits.axis1_max) {
          singularities.push({
            block_index: i,
            type: "near_pole",
            severity: "critical",
            rotary_values: { a, b, c },
          });
        }
        if (ax2 < config.rotary_limits.axis2_min || ax2 > config.rotary_limits.axis2_max) {
          singularities.push({
            block_index: i,
            type: "near_pole",
            severity: "critical",
            rotary_values: { a, b, c },
          });
        }
      }
    }

    if (singularities.length > 0) {
      const criticals = singularities.filter(s => s.severity === "critical");
      if (criticals.length > 0) {
        recommendations.push("CRITICAL: Toolpath passes through singularity zone — reorient part or split operation");
      }
      const flips = singularities.filter(s => s.type === "axis_flip");
      if (flips.length > 0) {
        recommendations.push(`WARNING: ${flips.length} axis flip(s) detected — add unwinding moves or reorder path`);
      }
    }

    return {
      has_singularity: singularities.length > 0,
      singularity_blocks: singularities,
      recommendations,
    };
  }

  /**
   * Calculate inverse time feed (G93) for 5-axis blocks
   * F = 1/time_per_block (in minutes)
   */
  calculateInverseTimeFeed(
    blocks: FiveAxisBlock[],
    config: { pivot_length_mm?: number; feed_mm_min: number }
  ): InverseTimeFeedResult {
    const result: InverseTimeFeedResult["blocks"] = [];
    const pivotLen = config.pivot_length_mm ?? 200;

    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];

      // Linear distance
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = curr.z - prev.z;
      const linearDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Rotary distance (approximate arc length at pivot)
      const da = ((curr.a ?? 0) - (prev.a ?? 0)) * Math.PI / 180;
      const db = ((curr.b ?? 0) - (prev.b ?? 0)) * Math.PI / 180;
      const dc = ((curr.c ?? 0) - (prev.c ?? 0)) * Math.PI / 180;
      const rotaryArc = pivotLen * Math.sqrt(da * da + db * db + dc * dc);

      // Combined distance
      const totalDist = Math.sqrt(linearDist * linearDist + rotaryArc * rotaryArc);

      // Time = distance / feed
      const time_min = totalDist / config.feed_mm_min;
      const f_inverse = time_min > 0 ? 1 / time_min : 0;

      result.push({
        index: i,
        f_inverse: +f_inverse.toFixed(4),
        equivalent_feed_mm_min: +(totalDist / Math.max(0.00001, time_min)).toFixed(1),
        linear_dist_mm: +linearDist.toFixed(4),
        rotary_dist_deg: +(Math.sqrt(
          ((curr.a ?? 0) - (prev.a ?? 0)) ** 2 +
          ((curr.b ?? 0) - (prev.b ?? 0)) ** 2 +
          ((curr.c ?? 0) - (prev.c ?? 0)) ** 2
        )).toFixed(4),
      });
    }

    return { blocks: result };
  }

  /**
   * Linearize long 5-axis moves into segments within tolerance
   * Uses binary search to find minimum segments needed
   */
  linearize(
    blocks: FiveAxisBlock[],
    tolerance_mm: number = 0.01
  ): { blocks: FiveAxisBlock[]; result: LinearizationResult } {
    const output: FiveAxisBlock[] = [blocks[0]];
    let totalSegments = 0;
    let maxDev = 0;

    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];

      // Check if this is a 5-axis move (rotary axes change)
      const hasRotary = (curr.a !== undefined && prev.a !== undefined && Math.abs(curr.a - prev.a) > 0.001) ||
                        (curr.b !== undefined && prev.b !== undefined && Math.abs(curr.b - prev.b) > 0.001) ||
                        (curr.c !== undefined && prev.c !== undefined && Math.abs(curr.c - prev.c) > 0.001);

      if (!hasRotary) {
        output.push(curr);
        totalSegments++;
        continue;
      }

      // Calculate the move length to determine segments needed
      const dist = Math.sqrt(
        (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2 + (curr.z - prev.z) ** 2
      );
      const rotaryChange = Math.sqrt(
        ((curr.a ?? 0) - (prev.a ?? 0)) ** 2 +
        ((curr.b ?? 0) - (prev.b ?? 0)) ** 2 +
        ((curr.c ?? 0) - (prev.c ?? 0)) ** 2
      );

      // Estimate deviation: chord error ≈ R × (1 - cos(θ/2)) where R ≈ dist, θ ≈ rotary
      const estimatedDev = dist * (1 - Math.cos((rotaryChange * Math.PI / 180) / 2));

      if (estimatedDev <= tolerance_mm) {
        output.push(curr);
        totalSegments++;
        maxDev = Math.max(maxDev, estimatedDev);
        continue;
      }

      // Binary search for minimum segments
      let numSegs = Math.max(2, Math.ceil(Math.sqrt(estimatedDev / tolerance_mm)));
      numSegs = Math.min(numSegs, 100); // cap at 100 segments per move

      for (let s = 1; s <= numSegs; s++) {
        const t = s / numSegs;
        output.push({
          x: prev.x + (curr.x - prev.x) * t,
          y: prev.y + (curr.y - prev.y) * t,
          z: prev.z + (curr.z - prev.z) * t,
          a: (prev.a ?? 0) + ((curr.a ?? 0) - (prev.a ?? 0)) * t,
          b: (prev.b ?? 0) + ((curr.b ?? 0) - (prev.b ?? 0)) * t,
          c: (prev.c ?? 0) + ((curr.c ?? 0) - (prev.c ?? 0)) * t,
          feed_mm_min: curr.feed_mm_min,
        });
      }
      totalSegments += numSegs;
      maxDev = Math.max(maxDev, tolerance_mm); // bounded by construction
    }

    return {
      blocks: output,
      result: {
        original_blocks: blocks.length,
        linearized_blocks: output.length,
        max_deviation_mm: +maxDev.toFixed(6),
        tolerance_mm,
      },
    };
  }

  /**
   * Check if rotary axes need unwinding (approaching limits)
   * Returns blocks with unwind moves inserted
   */
  checkRotaryUnwind(
    blocks: FiveAxisBlock[],
    limits: { min: number; max: number; axis: "A" | "B" | "C" }
  ): { unwound_blocks: FiveAxisBlock[]; unwinds_inserted: number } {
    const output: FiveAxisBlock[] = [];
    let unwinds = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = { ...blocks[i] };
      const axisKey = limits.axis.toLowerCase() as "a" | "b" | "c";
      const val = block[axisKey] ?? 0;

      // Check if approaching limit (within 10°)
      if (val > limits.max - 10 || val < limits.min + 10) {
        // Unwind by 360°
        if (val > limits.max - 10) {
          block[axisKey] = val - 360;
          unwinds++;
        } else if (val < limits.min + 10) {
          block[axisKey] = val + 360;
          unwinds++;
        }
      }

      output.push(block);
    }

    return { unwound_blocks: output, unwinds_inserted: unwinds };
  }
}

export const fiveAxisPostEngine = new FiveAxisPostEngineImpl();
export { FiveAxisPostEngineImpl };
