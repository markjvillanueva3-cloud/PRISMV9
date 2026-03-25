/**
 * HolePatternPipelineEngine — Hole Pattern Recognition & Optimized Drilling
 *
 * Recognizes hole patterns (bolt circles, rectangular grids, irregular),
 * optimizes drill sequence (nearest-neighbor TSP), selects peck cycles
 * (G73/G81/G83), calculates spot drill depths, and handles multi-diameter
 * stepped holes (counterbore/countersink/ream stacks).
 *
 * Physics (inline):
 *   - Drill thrust: Fz = 0.5 × kc1.1 × (D/2) × f^(1-mc) × sin(point_angle/2)
 *   - Drill torque: M = Fz × D / (4000)  [Nm]
 *   - Peck depth: Q = 3×D for steel, 5×D for aluminum (standard rule)
 *   - Spot drill depth: d_spot = (D_spot/2) / tan(point_angle/2)
 *   - Cycle time: t = L/(f×n) + rapid_time
 *
 * @module engines/HolePatternPipelineEngine
 */

import { log } from "../utils/Logger.js";
import {
  getKienzleByISO, getTaylor, PECK_RULES, DRILL_POINT_FACTORS,
  calcTapDrill, COOLANT_MATRIX, correctedCuttingForce,
  chipThinningFactor, thermalDeratingFactor,
} from "./MachiningKnowledgeBaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type HoleType =
  | "through" | "blind" | "counterbore" | "countersink"
  | "stepped" | "reamed" | "tapped" | "interpolated"
  | "pilot" | "spotface";

export type HolePatternType =
  | "bolt_circle" | "rectangular_grid" | "linear_row"
  | "irregular" | "radial" | "nested_circles";

export interface HoleSpec {
  id: string;
  type: HoleType;
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
  depth_mm: number;
  counterbore_diameter_mm?: number;
  counterbore_depth_mm?: number;
  countersink_diameter_mm?: number;
  countersink_angle_deg?: number;
  ream_diameter_mm?: number;
  ream_tolerance_mm?: number;
  tap_pitch_mm?: number;
  tap_class?: string;
  surface_finish_Ra_um?: number;
  tolerance_mm?: number;
  through_material_thickness_mm?: number;
}

export interface HolePattern {
  pattern_id: string;
  pattern_type: HolePatternType;
  holes: HoleSpec[];
  center_x_mm?: number;
  center_y_mm?: number;
  bolt_circle_diameter_mm?: number;
  grid_spacing_x_mm?: number;
  grid_spacing_y_mm?: number;
  grid_rows?: number;
  grid_cols?: number;
}

export interface HoleMaterial {
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
}

export interface DrillToolSelection {
  tool_number: number;
  tool_type: "center_drill" | "spot_drill" | "twist_drill" | "insert_drill"
    | "reamer" | "counterbore_tool" | "countersink_tool" | "tap"
    | "thread_mill" | "boring_bar" | "interpolation_endmill";
  diameter_mm: number;
  point_angle_deg: number;
  flutes: number;
  flute_length_mm: number;
  overall_length_mm: number;
  material: "carbide" | "HSS" | "cobalt_HSS";
  coating: string;
}

export interface DrillCuttingParams {
  spindle_rpm: number;
  feed_mm_rev: number;
  feed_mm_min: number;
  peck_depth_mm?: number;
  cutting_speed_m_min: number;
  retract_type: "full" | "chip_break";
}

export interface DrillPhysics {
  thrust_force_N: number;
  torque_Nm: number;
  power_kW: number;
  tool_life_holes: number;
  predicted_Ra_um: number;
}

export interface DrillPlannedOp {
  op_number: number;
  tool: DrillToolSelection;
  cutting_params: DrillCuttingParams;
  physics: DrillPhysics;
  canned_cycle: "G81" | "G82" | "G83" | "G73" | "G84" | "G85" | "G86" | "G76";
  hole_ids: string[];
  cycle_time_per_hole_sec: number;
  total_cycle_time_sec: number;
  drill_sequence: Array<{ x: number; y: number; hole_id: string }>;
  notes: string[];
}

export interface HolePatternResult {
  success: boolean;
  patterns_detected: HolePattern[];
  operations: DrillPlannedOp[];
  total_operations: number;
  total_holes: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  drill_sequence_optimized: boolean;
  travel_distance_saved_mm: number;
  confidence_score: number;
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
}

export interface HolePatternInput {
  part_number?: string;
  material: HoleMaterial;
  holes: HoleSpec[];
  max_spindle_rpm?: number;
  max_power_kW?: number;
  work_offset?: string;
  retract_height_mm?: number;
  auto_detect_patterns?: boolean;
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost";
}

// ============================================================================
// PHYSICS
// ============================================================================

// Kienzle constants sourced from MachiningKnowledgeBaseEngine (canonical)
// Using getKienzleByISO() — validated against Sandvik/Kennametal/Walter

const DRILL_SPEEDS: Record<string, { standard: number; insert: number }> = {
  P: { standard: 80, insert: 180 }, M: { standard: 50, insert: 120 },
  K: { standard: 90, insert: 200 }, N: { standard: 200, insert: 400 },
  S: { standard: 20, insert: 40 }, H: { standard: 30, insert: 60 },
};

const DRILL_FEEDS: Record<string, Record<string, number>> = {
  // Feed per rev (mm/rev) by diameter range
  P: { small: 0.12, medium: 0.20, large: 0.30 },
  M: { small: 0.08, medium: 0.15, large: 0.25 },
  K: { small: 0.15, medium: 0.25, large: 0.35 },
  N: { small: 0.15, medium: 0.25, large: 0.40 },
  S: { small: 0.05, medium: 0.08, large: 0.12 },
  H: { small: 0.04, medium: 0.06, large: 0.10 },
};

function drillThrust(kc1_1: number, mc: number, D: number, f: number, pointAngle: number): number {
  const halfAngle = (pointAngle * Math.PI) / 360;
  return 0.5 * kc1_1 * (D / 2) * Math.pow(f, 1 - mc) * Math.sin(halfAngle);
}

function drillTorque(thrust: number, D: number): number {
  return (thrust * D) / 4000;
}

function peckDepth(D: number, iso: string): number {
  switch (iso) {
    case "N": return D * 5;
    case "K": return D * 4;
    case "S":
    case "H": return D * 1.5;
    default: return D * 3;
  }
}

function spotDrillDepth(spotD: number, pointAngle: number): number {
  const halfAngle = (pointAngle * Math.PI) / 360;
  return (spotD / 2) / Math.tan(halfAngle);
}

// ============================================================================
// ENGINE
// ============================================================================

export class HolePatternPipelineEngine {
  readonly name = "HolePatternPipelineEngine";
  readonly version = "1.0.0";

  calculate(action: string, params: Record<string, unknown>): HolePatternResult {
    switch (action) {
      case "hole_pattern_program":
        return this.runPipeline(params as unknown as HolePatternInput);
      case "hole_pattern_detect":
        return this.runPipeline({ ...params, auto_detect_patterns: true } as unknown as HolePatternInput);
      case "hole_pattern_optimize":
        return this.runPipeline(params as unknown as HolePatternInput);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // --------------------------------------------------------------------------
  // PATTERN DETECTION
  // --------------------------------------------------------------------------

  private detectPatterns(holes: HoleSpec[]): HolePattern[] {
    const patterns: HolePattern[] = [];
    const used = new Set<string>();

    // Detect bolt circles: holes on a common radius from a center
    const boltCircles = this.detectBoltCircles(holes, used);
    patterns.push(...boltCircles);

    // Detect rectangular grids
    const grids = this.detectGrids(holes, used);
    patterns.push(...grids);

    // Detect linear rows
    const rows = this.detectLinearRows(holes, used);
    patterns.push(...rows);

    // Remaining holes are irregular
    const remaining = holes.filter(h => !used.has(h.id));
    if (remaining.length > 0) {
      patterns.push({
        pattern_id: `PAT-IRR-1`,
        pattern_type: "irregular",
        holes: remaining,
      });
      remaining.forEach(h => used.add(h.id));
    }

    return patterns;
  }

  private detectBoltCircles(holes: HoleSpec[], used: Set<string>): HolePattern[] {
    const patterns: HolePattern[] = [];
    const available = holes.filter(h => !used.has(h.id));

    // Group by diameter (bolt circles have same-size holes)
    const byDiam = new Map<number, HoleSpec[]>();
    for (const h of available) {
      const key = Math.round(h.diameter_mm * 10) / 10;
      if (!byDiam.has(key)) byDiam.set(key, []);
      byDiam.get(key)!.push(h);
    }

    let patIdx = 1;
    for (const [, group] of byDiam) {
      if (group.length < 3) continue;

      // Check if all holes lie on a circle
      // Find centroid
      const cx = group.reduce((s, h) => s + h.x_mm, 0) / group.length;
      const cy = group.reduce((s, h) => s + h.y_mm, 0) / group.length;

      // Check radius consistency
      const radii = group.map(h => Math.sqrt((h.x_mm - cx) ** 2 + (h.y_mm - cy) ** 2));
      const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
      const maxDev = Math.max(...radii.map(r => Math.abs(r - avgR)));

      if (maxDev < avgR * 0.05 && avgR > 5) {
        // This is a bolt circle
        patterns.push({
          pattern_id: `PAT-BC-${patIdx++}`,
          pattern_type: "bolt_circle",
          holes: group,
          center_x_mm: Math.round(cx * 100) / 100,
          center_y_mm: Math.round(cy * 100) / 100,
          bolt_circle_diameter_mm: Math.round(avgR * 2 * 100) / 100,
        });
        group.forEach(h => used.add(h.id));
      }
    }

    return patterns;
  }

  private detectGrids(holes: HoleSpec[], used: Set<string>): HolePattern[] {
    const patterns: HolePattern[] = [];
    const available = holes.filter(h => !used.has(h.id));

    // Group by diameter
    const byDiam = new Map<number, HoleSpec[]>();
    for (const h of available) {
      const key = Math.round(h.diameter_mm * 10) / 10;
      if (!byDiam.has(key)) byDiam.set(key, []);
      byDiam.get(key)!.push(h);
    }

    let patIdx = 1;
    for (const [, group] of byDiam) {
      if (group.length < 4) continue;

      // Find unique X and Y values
      const xs = [...new Set(group.map(h => Math.round(h.x_mm * 10) / 10))].sort((a, b) => a - b);
      const ys = [...new Set(group.map(h => Math.round(h.y_mm * 10) / 10))].sort((a, b) => a - b);

      if (xs.length >= 2 && ys.length >= 2) {
        // Check uniform spacing
        const xSpaces = xs.slice(1).map((x, i) => x - xs[i]);
        const ySpaces = ys.slice(1).map((y, i) => y - ys[i]);
        const xUniform = xSpaces.length > 0 && Math.max(...xSpaces) - Math.min(...xSpaces) < 0.5;
        const yUniform = ySpaces.length > 0 && Math.max(...ySpaces) - Math.min(...ySpaces) < 0.5;

        if (xUniform && yUniform && group.length >= xs.length * ys.length * 0.8) {
          patterns.push({
            pattern_id: `PAT-GRID-${patIdx++}`,
            pattern_type: "rectangular_grid",
            holes: group,
            grid_spacing_x_mm: xSpaces.length > 0 ? Math.round(xSpaces[0] * 100) / 100 : 0,
            grid_spacing_y_mm: ySpaces.length > 0 ? Math.round(ySpaces[0] * 100) / 100 : 0,
            grid_rows: ys.length,
            grid_cols: xs.length,
          });
          group.forEach(h => used.add(h.id));
        }
      }
    }

    return patterns;
  }

  private detectLinearRows(holes: HoleSpec[], used: Set<string>): HolePattern[] {
    const patterns: HolePattern[] = [];
    const available = holes.filter(h => !used.has(h.id));

    // Group by same Y (horizontal row) or same X (vertical row)
    const byY = new Map<number, HoleSpec[]>();
    const byX = new Map<number, HoleSpec[]>();
    for (const h of available) {
      const ky = Math.round(h.y_mm * 10) / 10;
      const kx = Math.round(h.x_mm * 10) / 10;
      if (!byY.has(ky)) byY.set(ky, []);
      if (!byX.has(kx)) byX.set(kx, []);
      byY.get(ky)!.push(h);
      byX.get(kx)!.push(h);
    }

    let patIdx = 1;
    for (const [, row] of byY) {
      if (row.length >= 3 && row.every(h => !used.has(h.id))) {
        patterns.push({
          pattern_id: `PAT-ROW-${patIdx++}`,
          pattern_type: "linear_row",
          holes: row.sort((a, b) => a.x_mm - b.x_mm),
        });
        row.forEach(h => used.add(h.id));
      }
    }

    return patterns;
  }

  // --------------------------------------------------------------------------
  // DRILL SEQUENCE OPTIMIZATION (Nearest-Neighbor TSP)
  // --------------------------------------------------------------------------

  private optimizeSequence(holes: HoleSpec[]): { sequence: Array<{ x: number; y: number; hole_id: string }>; savedMm: number } {
    if (holes.length <= 1) {
      return {
        sequence: holes.map(h => ({ x: h.x_mm, y: h.y_mm, hole_id: h.id })),
        savedMm: 0,
      };
    }

    // Calculate unoptimized travel
    let unoptTravel = 0;
    for (let i = 1; i < holes.length; i++) {
      unoptTravel += Math.sqrt((holes[i].x_mm - holes[i - 1].x_mm) ** 2 + (holes[i].y_mm - holes[i - 1].y_mm) ** 2);
    }

    // Nearest-neighbor heuristic
    const remaining = [...holes];
    const sequence: Array<{ x: number; y: number; hole_id: string }> = [];
    let current = remaining.splice(0, 1)[0];
    sequence.push({ x: current.x_mm, y: current.y_mm, hole_id: current.id });

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = Math.sqrt((remaining[i].x_mm - current.x_mm) ** 2 + (remaining[i].y_mm - current.y_mm) ** 2);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      current = remaining.splice(bestIdx, 1)[0];
      sequence.push({ x: current.x_mm, y: current.y_mm, hole_id: current.id });
    }

    // Calculate optimized travel
    let optTravel = 0;
    for (let i = 1; i < sequence.length; i++) {
      optTravel += Math.sqrt((sequence[i].x - sequence[i - 1].x) ** 2 + (sequence[i].y - sequence[i - 1].y) ** 2);
    }

    return { sequence, savedMm: Math.round(unoptTravel - optTravel) };
  }

  // --------------------------------------------------------------------------
  // TOOL & PARAMETER SELECTION
  // --------------------------------------------------------------------------

  private selectDrillTool(hole: HoleSpec, opStage: string, toolNum: number): DrillToolSelection {
    switch (opStage) {
      case "spot":
        return {
          tool_number: toolNum, tool_type: "spot_drill",
          diameter_mm: 16, point_angle_deg: 90, flutes: 2,
          flute_length_mm: 15, overall_length_mm: 60,
          material: "carbide", coating: "TiN",
        };
      case "center":
        return {
          tool_number: toolNum, tool_type: "center_drill",
          diameter_mm: 3.15, point_angle_deg: 60, flutes: 2,
          flute_length_mm: 8, overall_length_mm: 45,
          material: "HSS", coating: "TiN",
        };
      case "drill":
        return {
          tool_number: toolNum,
          tool_type: hole.diameter_mm >= 20 ? "insert_drill" : "twist_drill",
          diameter_mm: hole.diameter_mm, point_angle_deg: 140, flutes: 2,
          flute_length_mm: Math.max(hole.depth_mm + 5, hole.diameter_mm * 3),
          overall_length_mm: Math.max(hole.depth_mm + 30, hole.diameter_mm * 5),
          material: hole.diameter_mm >= 20 ? "carbide" : "cobalt_HSS",
          coating: "TiAlN",
        };
      case "ream":
        return {
          tool_number: toolNum, tool_type: "reamer",
          diameter_mm: hole.ream_diameter_mm || hole.diameter_mm,
          point_angle_deg: 15, flutes: 6,
          flute_length_mm: hole.depth_mm + 5, overall_length_mm: hole.depth_mm + 40,
          material: "carbide", coating: "TiAlN",
        };
      case "counterbore":
        return {
          tool_number: toolNum, tool_type: "counterbore_tool",
          diameter_mm: hole.counterbore_diameter_mm || hole.diameter_mm * 1.8,
          point_angle_deg: 180, flutes: 4,
          flute_length_mm: (hole.counterbore_depth_mm || 5) + 5,
          overall_length_mm: (hole.counterbore_depth_mm || 5) + 40,
          material: "carbide", coating: "TiN",
        };
      case "countersink":
        return {
          tool_number: toolNum, tool_type: "countersink_tool",
          diameter_mm: hole.countersink_diameter_mm || hole.diameter_mm * 2,
          point_angle_deg: hole.countersink_angle_deg || 90, flutes: 3,
          flute_length_mm: 15, overall_length_mm: 60,
          material: "HSS", coating: "TiN",
        };
      case "tap":
        return {
          tool_number: toolNum, tool_type: "tap",
          diameter_mm: hole.diameter_mm, point_angle_deg: 0, flutes: 3,
          flute_length_mm: hole.depth_mm + 5, overall_length_mm: hole.depth_mm + 40,
          material: "HSS", coating: "TiN",
        };
      case "interpolate":
        return {
          tool_number: toolNum, tool_type: "interpolation_endmill",
          diameter_mm: hole.diameter_mm * 0.6, point_angle_deg: 0, flutes: 3,
          flute_length_mm: hole.depth_mm + 5, overall_length_mm: hole.depth_mm + 30,
          material: "carbide", coating: "TiAlN",
        };
      default:
        return {
          tool_number: toolNum, tool_type: "twist_drill",
          diameter_mm: hole.diameter_mm, point_angle_deg: 140, flutes: 2,
          flute_length_mm: hole.depth_mm + 5, overall_length_mm: hole.depth_mm + 30,
          material: "cobalt_HSS", coating: "TiN",
        };
    }
  }

  private calcDrillParams(
    tool: DrillToolSelection, hole: HoleSpec, mat: HoleMaterial, maxRPM: number,
  ): { params: DrillCuttingParams; physics: DrillPhysics } {
    const iso = mat.iso_group || "P";
    const kz = getKienzleByISO(iso);
    const speeds = DRILL_SPEEDS[iso] || DRILL_SPEEDS.P;
    const feedMap = DRILL_FEEDS[iso] || DRILL_FEEDS.P;

    const isInsert = tool.tool_type === "insert_drill";
    const Vc = isInsert ? speeds.insert : speeds.standard;

    let rpm = tool.diameter_mm > 0 ? Math.round((1000 * Vc) / (Math.PI * tool.diameter_mm)) : 2000;
    rpm = Math.min(rpm, maxRPM);
    const actualVc = (Math.PI * tool.diameter_mm * rpm) / 1000;

    const sizeKey = tool.diameter_mm < 8 ? "small" : tool.diameter_mm < 20 ? "medium" : "large";
    let f = feedMap[sizeKey] || 0.15;
    if (tool.tool_type === "reamer") f *= 0.5;
    if (tool.tool_type === "tap") f = hole.tap_pitch_mm || 1.5;

    const feedRate = f * rpm;
    const thrust = drillThrust(kz.kc1_1, kz.mc, tool.diameter_mm, f, tool.point_angle_deg || 140);
    const torque = drillTorque(thrust, tool.diameter_mm);
    const power = (torque * rpm * 2 * Math.PI) / 60000;

    // Tool life from canonical Taylor database (KB)
    const tayEntry = getTaylor(iso);
    const lifeMin = Math.pow(tayEntry.C / Math.max(actualVc, 1), 1 / tayEntry.n);
    const timePerHole = (hole.depth_mm / feedRate) * 60 + 3; // seconds
    const lifeHoles = Math.round(lifeMin * 60 / Math.max(timePerHole, 1));

    const needsPeck = hole.depth_mm > tool.diameter_mm * 3;
    const peck = needsPeck ? peckDepth(tool.diameter_mm, iso) : undefined;

    return {
      params: {
        spindle_rpm: rpm,
        feed_mm_rev: Math.round(f * 1000) / 1000,
        feed_mm_min: Math.round(feedRate),
        peck_depth_mm: peck ? Math.round(peck * 10) / 10 : undefined,
        cutting_speed_m_min: Math.round(actualVc),
        retract_type: needsPeck ? "full" : "chip_break",
      },
      physics: {
        thrust_force_N: Math.round(thrust),
        torque_Nm: Math.round(torque * 100) / 100,
        power_kW: Math.round(power * 100) / 100,
        tool_life_holes: lifeHoles,
        predicted_Ra_um: tool.tool_type === "reamer" ? 0.8 : 3.2,
      },
    };
  }

  private selectCannedCycle(tool: DrillToolSelection, hole: HoleSpec, peck?: number): DrillPlannedOp["canned_cycle"] {
    if (tool.tool_type === "tap") return "G84";
    if (tool.tool_type === "reamer") return "G85";
    if (tool.tool_type === "counterbore_tool" || tool.tool_type === "countersink_tool") return "G82";
    if (peck && hole.depth_mm > tool.diameter_mm * 5) return "G83"; // Full retract peck
    if (peck) return "G73"; // Chip-break peck
    return "G81"; // Simple drill
  }

  // --------------------------------------------------------------------------
  // G-CODE GENERATION
  // --------------------------------------------------------------------------

  private generateGCode(operations: DrillPlannedOp[], input: HolePatternInput): string {
    const lines: string[] = [];
    let lineNum = 10;
    const ln = () => { const n = lineNum; lineNum += 10; return `N${n}`; };
    const retract = input.retract_height_mm || 3;
    const wo = input.work_offset || "G54";

    lines.push(`%`);
    lines.push(`O${(input.part_number || "HOLE001").replace(/\D/g, "").slice(0, 4) || "1001"} (${input.part_number || "HOLE-PATTERN"})`);
    lines.push(`(MATERIAL: ${input.material.material_name} ISO-${input.material.iso_group})`);
    lines.push(`(TOTAL HOLES: ${input.holes.length})`);
    lines.push(`(GENERATED BY PRISM HolePatternPipelineEngine v1.0)`);
    lines.push(``);

    lines.push(`${ln()} G28 G91 Z0`);
    lines.push(`${ln()} G90 G21 G40 G80 ${wo}`);
    lines.push(``);

    let currentTool = -1;

    for (const op of operations) {
      if (op.tool.tool_number !== currentTool) {
        lines.push(`(--- TOOL ${op.tool.tool_number}: ${op.tool.tool_type} D${op.tool.diameter_mm} ---)`);
        lines.push(`${ln()} T${op.tool.tool_number} M06`);
        lines.push(`${ln()} G43 H${op.tool.tool_number} Z50.0`);
        lines.push(`${ln()} S${op.cutting_params.spindle_rpm} M03`);
        lines.push(`${ln()} M08`);
        currentTool = op.tool.tool_number;
      }

      const cycle = op.canned_cycle;
      const f = op.cutting_params.feed_mm_min;

      lines.push(`(${op.hole_ids.length} holes, cycle=${cycle})`);

      // First hole sets up the cycle
      const first = op.drill_sequence[0];
      lines.push(`${ln()} G00 X${first.x.toFixed(3)} Y${first.y.toFixed(3)}`);

      // Calculate Z depth from first hole
      const firstHole = input.holes.find(h => h.id === first.hole_id);
      const zDepth = -(firstHole?.depth_mm || 20);

      if (cycle === "G83" || cycle === "G73") {
        // Q is peck depth in mm (NOT microns) on Fanuc
        const qVal = op.cutting_params.peck_depth_mm || 3;
        lines.push(`${ln()} ${cycle} Z${zDepth.toFixed(1)} R${retract.toFixed(1)} Q${qVal.toFixed(1)} F${f}`);
      } else if (cycle === "G82") {
        lines.push(`${ln()} ${cycle} Z${zDepth.toFixed(1)} R${retract.toFixed(1)} P500 F${f} (Dwell 0.5s)`);
      } else if (cycle === "G84") {
        // Rigid tap: F = pitch × RPM (mm/min) in G94 mode, or pitch (mm/rev) in G95
        const tapPitch = op.cutting_params.feed_mm_rev;  // pitch stored as feed_mm_rev
        const tapFeed = Math.round(tapPitch * op.cutting_params.spindle_rpm);
        lines.push(`${ln()} G97 S${op.cutting_params.spindle_rpm} (Direct RPM for rigid tap)`);
        lines.push(`${ln()} G94 (Feed per minute for rigid tap sync)`);
        lines.push(`${ln()} ${cycle} Z${zDepth.toFixed(1)} R${retract.toFixed(1)} F${tapFeed} (Rigid tap, pitch=${tapPitch}mm)`);
        lines.push(`${ln()} G95 (Return to feed per rev)`);
      } else {
        lines.push(`${ln()} ${cycle} Z${zDepth.toFixed(1)} R${retract.toFixed(1)} F${f}`);
      }

      // Subsequent holes — just XY positions
      for (let i = 1; i < op.drill_sequence.length; i++) {
        const pt = op.drill_sequence[i];
        lines.push(`${ln()} X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)}`);
      }

      lines.push(`${ln()} G80 (Cancel cycle)`);
      lines.push(``);
    }

    lines.push(`${ln()} M09`);
    lines.push(`${ln()} G28 G91 Z0`);
    lines.push(`${ln()} M30`);
    lines.push(`%`);

    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // MAIN PIPELINE
  // --------------------------------------------------------------------------

  runPipeline(input: HolePatternInput): HolePatternResult {
    log.info(`[HolePatternPipeline] Processing ${input.holes.length} holes`);

    const warnings: HolePatternResult["warnings"] = [];
    const maxRPM = input.max_spindle_rpm || 10000;

    // Safety checks
    for (const hole of input.holes) {
      // Depth vs diameter (L/D ratio)
      if (hole.depth_mm > hole.diameter_mm * 10) {
        warnings.push({ stage: "safety", severity: "critical",
          message: `Hole ${hole.id}: L/D=${(hole.depth_mm / hole.diameter_mm).toFixed(1)} exceeds 10:1 — gun drill or special tooling required` });
      } else if (hole.depth_mm > hole.diameter_mm * 5) {
        warnings.push({ stage: "safety", severity: "warning",
          message: `Hole ${hole.id}: L/D=${(hole.depth_mm / hole.diameter_mm).toFixed(1)} > 5:1 — deep hole peck cycle required` });
      }
      // Hole spacing check
      for (const other of input.holes) {
        if (other.id <= hole.id) continue;
        const dist = Math.sqrt((hole.x_mm - other.x_mm) ** 2 + (hole.y_mm - other.y_mm) ** 2);
        const minSpacing = Math.max(hole.diameter_mm, other.diameter_mm) * 1.5;
        if (dist < minSpacing && dist > 0) {
          warnings.push({ stage: "safety", severity: "warning",
            message: `Holes ${hole.id}/${other.id}: center distance ${dist.toFixed(1)}mm < 1.5×D (${minSpacing.toFixed(1)}mm) — thin wall risk` });
        }
      }
      // Counterbore depth vs total depth
      if (hole.counterbore_depth_mm && hole.counterbore_depth_mm >= hole.depth_mm) {
        warnings.push({ stage: "safety", severity: "critical",
          message: `Hole ${hole.id}: counterbore depth ${hole.counterbore_depth_mm}mm >= hole depth ${hole.depth_mm}mm` });
      }
    }

    // Detect patterns
    const patterns = input.auto_detect_patterns !== false
      ? this.detectPatterns(input.holes)
      : [{ pattern_id: "PAT-ALL", pattern_type: "irregular" as HolePatternType, holes: input.holes }];

    // Group holes by required operations
    const opGroups = new Map<string, HoleSpec[]>();
    for (const hole of input.holes) {
      const stages = this.determineStages(hole);
      for (const stage of stages) {
        const key = `${stage}_${hole.diameter_mm}_${hole.depth_mm}`;
        if (!opGroups.has(key)) opGroups.set(key, []);
        opGroups.get(key)!.push(hole);
      }
    }

    // Generate operations
    const operations: DrillPlannedOp[] = [];
    let opNum = 1;
    let toolNum = 1;
    const toolMap = new Map<string, number>();
    let totalSaved = 0;

    // Sort stages: center/spot → drill → ream → counterbore → countersink → tap
    const stageOrder = ["center", "spot", "drill", "ream", "counterbore", "countersink", "tap", "interpolate"];

    for (const stage of stageOrder) {
      for (const [key, holes] of opGroups) {
        if (!key.startsWith(stage)) continue;

        const toolKey = `${stage}_${holes[0].diameter_mm}`;
        if (!toolMap.has(toolKey)) toolMap.set(toolKey, toolNum++);
        const tNum = toolMap.get(toolKey)!;

        const tool = this.selectDrillTool(holes[0], stage, tNum);
        const { params, physics } = this.calcDrillParams(tool, holes[0], input.material, maxRPM);
        const cycle = this.selectCannedCycle(tool, holes[0], params.peck_depth_mm);

        // Optimize sequence
        const { sequence, savedMm } = this.optimizeSequence(holes);
        totalSaved += savedMm;

        const feedRate = params.feed_mm_min || 500;
        const timePerHole = (holes[0].depth_mm / feedRate) * 60 + 2;
        const totalTime = timePerHole * holes.length + 5;

        operations.push({
          op_number: opNum++,
          tool,
          cutting_params: params,
          physics,
          canned_cycle: cycle,
          hole_ids: holes.map(h => h.id),
          cycle_time_per_hole_sec: Math.round(timePerHole),
          total_cycle_time_sec: Math.round(totalTime),
          drill_sequence: sequence,
          notes: [],
        });
      }
    }

    const totalCycleTime = operations.reduce((s, o) => s + o.total_cycle_time_sec, 0);
    const programText = this.generateGCode(operations, input);
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;

    let confidence = 0.90;
    if (warnings.some(w => w.severity === "critical")) confidence -= 0.2;
    confidence = Math.max(0.3, Math.min(1.0, confidence));

    return {
      success: true,
      patterns_detected: patterns,
      operations,
      total_operations: operations.length,
      total_holes: input.holes.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      program_text: programText,
      program_line_count: programText.split("\n").length,
      drill_sequence_optimized: true,
      travel_distance_saved_mm: totalSaved,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
    };
  }

  private determineStages(hole: HoleSpec): string[] {
    const stages: string[] = [];

    // Spot/center drill
    if (hole.type !== "interpolated") stages.push("center");

    // Main drill
    if (hole.type === "interpolated") {
      stages.push("interpolate");
    } else if (hole.type === "tapped") {
      stages.push("drill");
      stages.push("tap");
    } else {
      stages.push("drill");
    }

    // Secondary ops
    if (hole.ream_diameter_mm || hole.type === "reamed") stages.push("ream");
    if (hole.counterbore_diameter_mm || hole.type === "counterbore") stages.push("counterbore");
    if (hole.countersink_diameter_mm || hole.type === "countersink") stages.push("countersink");

    return stages;
  }
}

/** Singleton instance. */
export const holePatternPipelineEngine = new HolePatternPipelineEngine();
