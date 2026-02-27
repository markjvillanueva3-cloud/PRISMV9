/**
 * ProcessPlanEngine — Manufacturing Intelligence Layer
 *
 * Generates complete manufacturing process plans from part features.
 * Composes ToolSelection + MaterialSelection + GenerativeProcessEngine
 * to produce ordered operation sequences with tool/speed/feed assignments.
 *
 * Actions: plan_generate, plan_optimize, plan_estimate_time, plan_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureCategory = "hole" | "pocket" | "slot" | "face" | "profile" | "thread" | "chamfer" | "bore" | "groove" | "freeform";

export interface PartFeature {
  id: string;
  type: FeatureCategory;
  dimensions: {
    diameter_mm?: number;
    width_mm?: number;
    length_mm?: number;
    depth_mm?: number;
    pitch_mm?: number;             // for threads
  };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  count?: number;                  // e.g., 4× identical holes
}

export interface ProcessPlanInput {
  part_name: string;
  material_iso_group: string;
  material_name?: string;
  features: PartFeature[];
  stock: { x_mm: number; y_mm: number; z_mm: number };
  batch_size?: number;
}

export interface ProcessOperation {
  seq: number;
  setup: number;                   // setup number (1, 2, etc.)
  operation: string;               // "Face Mill", "Drill", "Ream", etc.
  feature_ids: string[];
  tool: {
    type: string;
    diameter_mm: number;
    description: string;
  };
  cutting_params: {
    speed_mpm: number;
    feed_mmrev: number;
    depth_of_cut_mm: number;
    rpm: number;
    feed_rate_mmmin: number;
  };
  estimated_time_min: number;
  notes: string[];
}

export interface ProcessPlan {
  part_name: string;
  material: string;
  total_setups: number;
  total_operations: number;
  total_time_min: number;
  operations: ProcessOperation[];
  tool_list: string[];
  setup_summary: { setup: number; description: string; operations: number }[];
}

export interface PlanOptimization {
  original_time_min: number;
  optimized_time_min: number;
  savings_pct: number;
  changes: string[];
}

export interface TimeEstimate {
  cutting_time_min: number;
  rapid_time_min: number;
  tool_change_time_min: number;
  setup_time_min: number;
  total_cycle_time_min: number;
  total_with_setup_min: number;
}

// ============================================================================
// OPERATION TEMPLATES
// ============================================================================

const FEATURE_OPERATION_MAP: Record<FeatureCategory, { ops: string[]; tools: string[] }> = {
  face:    { ops: ["Face Mill"], tools: ["face_mill"] },
  pocket:  { ops: ["Rough Pocket", "Finish Pocket"], tools: ["end_mill", "end_mill"] },
  slot:    { ops: ["Slot Mill"], tools: ["end_mill"] },
  hole:    { ops: ["Center Drill", "Drill"], tools: ["center_drill", "drill"] },
  bore:    { ops: ["Rough Bore", "Finish Bore"], tools: ["boring_bar", "boring_bar"] },
  thread:  { ops: ["Drill", "Thread Mill"], tools: ["drill", "thread_mill"] },
  chamfer: { ops: ["Chamfer"], tools: ["chamfer_mill"] },
  profile: { ops: ["Rough Profile", "Finish Profile"], tools: ["end_mill", "end_mill"] },
  groove:  { ops: ["Groove"], tools: ["grooving_tool"] },
  freeform:{ ops: ["Rough 3D", "Semi-Finish 3D", "Finish 3D"], tools: ["end_mill", "ball_mill", "ball_mill"] },
};

/** ISO group → base surface speed m/min for carbide */
const ISO_SPEEDS: Record<string, number> = { P: 250, M: 120, K: 200, N: 600, S: 45, H: 80 };

/** Tool change time seconds */
const TOOL_CHANGE_SEC = 8;

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

function calcRPM(speed_mpm: number, diameter_mm: number): number {
  return Math.round((speed_mpm * 1000) / (Math.PI * Math.max(diameter_mm, 0.1)));
}

function calcFeedRate(feed_mmrev: number, rpm: number): number {
  return Math.round(feed_mmrev * rpm);
}

function estimateOpTime(feature: PartFeature, toolDia: number, depthOfCut: number, feedRate: number, isFinish: boolean): number {
  const d = feature.dimensions;
  let volume_mm3 = 0;

  if (feature.type === "pocket" || feature.type === "slot") {
    const w = d.width_mm || d.diameter_mm || 20;
    const l = d.length_mm || w;
    const depth = d.depth_mm || 5;
    volume_mm3 = w * l * depth;
  } else if (feature.type === "hole" || feature.type === "bore" || feature.type === "thread") {
    const dia = d.diameter_mm || 10;
    const depth = d.depth_mm || 20;
    volume_mm3 = Math.PI * Math.pow(dia / 2, 2) * depth;
  } else if (feature.type === "face") {
    const w = d.width_mm || 100;
    const l = d.length_mm || 100;
    volume_mm3 = w * l * (depthOfCut);
  } else if (feature.type === "profile" || feature.type === "chamfer") {
    const l = d.length_mm || (d.diameter_mm ? Math.PI * d.diameter_mm : 50);
    volume_mm3 = l * toolDia * (depthOfCut);
  } else {
    volume_mm3 = 1000; // default
  }

  const count = feature.count || 1;
  volume_mm3 *= count;

  // MRR = ap × ae × f × n (simplified)
  const ae = isFinish ? toolDia * 0.1 : toolDia * 0.6;
  const mrr = ae * depthOfCut * feedRate; // mm³/min
  const time = volume_mm3 / Math.max(mrr, 1);

  return Math.max(0.1, Math.round(time * 100) / 100);
}

function selectToolDiameter(feature: PartFeature, toolType: string): number {
  const d = feature.dimensions;

  if (toolType === "face_mill") return Math.min(80, Math.max(40, (d.width_mm || 50) * 1.3));
  if (toolType === "drill" || toolType === "center_drill") return d.diameter_mm || 10;
  if (toolType === "boring_bar") return Math.max(8, (d.diameter_mm || 20) * 0.8);
  if (toolType === "thread_mill") return (d.diameter_mm || 10) * 0.7;
  if (toolType === "ball_mill") return Math.min(12, (d.width_mm || 10) * 0.4);
  if (toolType === "chamfer_mill") return 10;
  if (toolType === "grooving_tool") return d.width_mm || 3;

  // end_mill for pockets, slots, profiles
  if (d.width_mm) return Math.min(d.width_mm * 0.7, 25);
  if (d.diameter_mm) return Math.min(d.diameter_mm * 0.6, 20);
  return 10;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ProcessPlanEngine {
  generate(input: ProcessPlanInput): ProcessPlan {
    const operations: ProcessOperation[] = [];
    let seq = 0;
    const setup = 1; // single-setup for now
    const toolSet = new Set<string>();
    const baseSpeed = ISO_SPEEDS[input.material_iso_group] || 200;

    // Always start with face mill if stock has top face
    const faceFeature: PartFeature = {
      id: "__face__", type: "face",
      dimensions: { width_mm: input.stock.x_mm, length_mm: input.stock.y_mm, depth_mm: 1 },
    };
    const faceOps = this.generateOpsForFeature(faceFeature, ++seq, setup, baseSpeed, toolSet, false);
    operations.push(...faceOps);
    seq += faceOps.length - 1;

    // Sort features: larger features first, then holes, then finishing
    const sorted = [...input.features].sort((a, b) => {
      const order: Record<string, number> = { face: 0, pocket: 1, slot: 2, profile: 3, hole: 4, bore: 5, thread: 6, groove: 7, chamfer: 8, freeform: 9 };
      return (order[a.type] || 5) - (order[b.type] || 5);
    });

    for (const feature of sorted) {
      const ops = this.generateOpsForFeature(feature, ++seq, setup, baseSpeed, toolSet, false);
      operations.push(...ops);
      seq += ops.length - 1;

      // If tight tolerance or finish needed, add finish pass
      if (feature.tolerance_mm && feature.tolerance_mm < 0.05) {
        const finishOps = this.generateOpsForFeature(feature, ++seq, setup, baseSpeed * 0.8, toolSet, true);
        operations.push(...finishOps);
        seq += finishOps.length - 1;
      }
    }

    // Renumber sequentially
    operations.forEach((op, i) => { op.seq = i + 1; });

    const totalTime = operations.reduce((s, op) => s + op.estimated_time_min, 0);

    return {
      part_name: input.part_name,
      material: `${input.material_name || input.material_iso_group}`,
      total_setups: 1,
      total_operations: operations.length,
      total_time_min: Math.round(totalTime * 100) / 100,
      operations,
      tool_list: Array.from(toolSet),
      setup_summary: [{ setup: 1, description: "Main setup — top face access", operations: operations.length }],
    };
  }

  optimize(plan: ProcessPlan): PlanOptimization {
    const changes: string[] = [];
    let savings = 0;

    // Optimization 1: Combine sequential operations using same tool
    let prevTool = "";
    for (const op of plan.operations) {
      if (op.tool.description === prevTool) {
        savings += TOOL_CHANGE_SEC / 60; // save one tool change
        changes.push(`Combine ${op.operation} with previous (same tool) — save tool change`);
      }
      prevTool = op.tool.description;
    }

    // Optimization 2: Increase feed rates for roughing by 10%
    for (const op of plan.operations) {
      if (op.operation.includes("Rough")) {
        const oldTime = op.estimated_time_min;
        op.cutting_params.feed_rate_mmmin *= 1.1;
        op.estimated_time_min *= 0.91;
        savings += oldTime - op.estimated_time_min;
        changes.push(`Increased roughing feed for ${op.operation} by 10%`);
      }
    }

    const optimizedTime = plan.total_time_min - savings;

    return {
      original_time_min: Math.round(plan.total_time_min * 100) / 100,
      optimized_time_min: Math.round(optimizedTime * 100) / 100,
      savings_pct: Math.round((savings / plan.total_time_min) * 10000) / 100,
      changes,
    };
  }

  estimateTime(plan: ProcessPlan, setupTimeMin: number = 20): TimeEstimate {
    let cuttingTime = 0;
    const rapidTime = plan.total_operations * 0.05; // ~3 sec rapid per op
    const toolChangeTime = (new Set(plan.operations.map(o => o.tool.description)).size * TOOL_CHANGE_SEC) / 60;

    for (const op of plan.operations) {
      cuttingTime += op.estimated_time_min;
    }

    const totalCycle = cuttingTime + rapidTime + toolChangeTime;

    return {
      cutting_time_min: Math.round(cuttingTime * 100) / 100,
      rapid_time_min: Math.round(rapidTime * 100) / 100,
      tool_change_time_min: Math.round(toolChangeTime * 100) / 100,
      setup_time_min: setupTimeMin,
      total_cycle_time_min: Math.round(totalCycle * 100) / 100,
      total_with_setup_min: Math.round((totalCycle + setupTimeMin) * 100) / 100,
    };
  }

  validate(plan: ProcessPlan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (plan.operations.length === 0) issues.push("Empty process plan");
    if (plan.total_time_min <= 0) issues.push("Invalid total time");

    // Check sequential ordering
    for (let i = 1; i < plan.operations.length; i++) {
      const prev = plan.operations[i - 1];
      const curr = plan.operations[i];
      if (curr.seq <= prev.seq) issues.push(`Sequence error: op ${curr.seq} after ${prev.seq}`);
    }

    // Check roughing before finishing
    const roughIdx = plan.operations.findIndex(o => o.operation.includes("Rough"));
    const finishIdx = plan.operations.findIndex(o => o.operation.includes("Finish"));
    if (roughIdx >= 0 && finishIdx >= 0 && roughIdx > finishIdx) {
      issues.push("Finishing before roughing — incorrect sequence");
    }

    // Check each operation has valid params
    for (const op of plan.operations) {
      if (op.cutting_params.rpm <= 0) issues.push(`Op ${op.seq}: Invalid RPM`);
      if (op.cutting_params.feed_rate_mmmin <= 0) issues.push(`Op ${op.seq}: Invalid feed rate`);
      if (op.estimated_time_min <= 0) issues.push(`Op ${op.seq}: Invalid time estimate`);
    }

    return { valid: issues.length === 0, issues };
  }

  private generateOpsForFeature(
    feature: PartFeature, startSeq: number, setup: number,
    baseSpeed: number, toolSet: Set<string>, isFinish: boolean
  ): ProcessOperation[] {
    const template = FEATURE_OPERATION_MAP[feature.type] || FEATURE_OPERATION_MAP["pocket"];
    const ops: ProcessOperation[] = [];

    const opsToUse = isFinish ? [template.ops[template.ops.length - 1]] : template.ops;
    const toolsToUse = isFinish ? [template.tools[template.tools.length - 1]] : template.tools;

    for (let i = 0; i < opsToUse.length; i++) {
      const toolType = toolsToUse[i];
      const diameter = selectToolDiameter(feature, toolType);
      const isFinishOp = opsToUse[i].includes("Finish") || isFinish;
      const speedFactor = isFinishOp ? 0.85 : 1.0;
      const speed = baseSpeed * speedFactor;
      const rpm = calcRPM(speed, diameter);
      const feedPerRev = isFinishOp ? 0.05 : 0.15;
      const depthOfCut = isFinishOp ? 0.3 : Math.min(diameter * 0.5, feature.dimensions.depth_mm || 5);
      const feedRate = calcFeedRate(feedPerRev, rpm);

      const toolDesc = `${Math.round(diameter)}mm ${toolType.replace(/_/g, " ")}`;
      toolSet.add(toolDesc);

      ops.push({
        seq: startSeq + i,
        setup,
        operation: opsToUse[i],
        feature_ids: [feature.id],
        tool: { type: toolType, diameter_mm: Math.round(diameter * 100) / 100, description: toolDesc },
        cutting_params: {
          speed_mpm: Math.round(speed), feed_mmrev: feedPerRev,
          depth_of_cut_mm: Math.round(depthOfCut * 100) / 100,
          rpm, feed_rate_mmmin: feedRate,
        },
        estimated_time_min: estimateOpTime(feature, diameter, depthOfCut, feedRate, isFinishOp),
        notes: isFinishOp ? ["Finish pass — reduced parameters"] : [],
      });
    }

    return ops;
  }
}

export const processPlanEngine = new ProcessPlanEngine();
