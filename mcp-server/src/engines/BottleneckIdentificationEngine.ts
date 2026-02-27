/**
 * BottleneckIdentificationEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Identifies production bottlenecks using Theory of Constraints (TOC).
 * Analyzes work center utilization, WIP accumulation, and throughput
 * to pinpoint the constraint limiting overall system output.
 *
 * Actions: bottleneck_identify, bottleneck_impact, bottleneck_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WorkCenter {
  id: string;
  name: string;
  capacity_parts_per_hr: number;
  actual_throughput_per_hr: number;
  utilization_pct: number;
  wip_queue_parts: number;
  avg_wait_time_min: number;
  num_machines: number;
  num_operators: number;
  downtime_pct: number;
}

export interface BottleneckInput {
  work_centers: WorkCenter[];
  demand_parts_per_hr: number;
  shift_hours: number;
}

export interface BottleneckResult {
  bottleneck_id: string;
  bottleneck_name: string;
  constraint_type: "capacity" | "reliability" | "quality" | "setup";
  system_throughput_per_hr: number;
  max_throughput_per_hr: number;       // if bottleneck resolved
  utilization_profile: { id: string; name: string; utilization_pct: number; is_bottleneck: boolean }[];
  improvement_impact: { action: string; throughput_gain_pct: number }[];
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BottleneckIdentificationEngine {
  identify(input: BottleneckInput): BottleneckResult {
    // Bottleneck = work center with highest utilization or lowest throughput ratio
    const sorted = [...input.work_centers].sort((a, b) => {
      // Primary: highest WIP queue
      // Secondary: highest utilization
      const scoreA = a.wip_queue_parts * 10 + a.utilization_pct;
      const scoreB = b.wip_queue_parts * 10 + b.utilization_pct;
      return scoreB - scoreA;
    });

    const bottleneck = sorted[0];

    // Determine constraint type
    let constraintType: BottleneckResult["constraint_type"] = "capacity";
    if (bottleneck.downtime_pct > 15) constraintType = "reliability";
    else if (bottleneck.utilization_pct > 95) constraintType = "capacity";
    else if (bottleneck.avg_wait_time_min > 60) constraintType = "setup";

    // System throughput = bottleneck throughput
    const systemThroughput = bottleneck.actual_throughput_per_hr;

    // Max throughput if bottleneck resolved (next bottleneck becomes constraint)
    const nextBottleneck = sorted.length > 1 ? sorted[1] : sorted[0];
    const maxThroughput = Math.min(input.demand_parts_per_hr, nextBottleneck.capacity_parts_per_hr);

    // Utilization profile
    const profile = input.work_centers.map(wc => ({
      id: wc.id,
      name: wc.name,
      utilization_pct: wc.utilization_pct,
      is_bottleneck: wc.id === bottleneck.id,
    }));

    // Improvement actions
    const improvements: BottleneckResult["improvement_impact"] = [];
    if (constraintType === "capacity") {
      improvements.push({
        action: `Add machine at ${bottleneck.name}`,
        throughput_gain_pct: Math.round((1 / bottleneck.num_machines) * 100),
      });
      improvements.push({
        action: "Reduce cycle time (tooling/process optimization)",
        throughput_gain_pct: Math.round(10 + (bottleneck.utilization_pct - 90)),
      });
    }
    if (constraintType === "reliability") {
      improvements.push({
        action: "Implement preventive maintenance",
        throughput_gain_pct: Math.round(bottleneck.downtime_pct * 0.6),
      });
    }
    improvements.push({
      action: "Offload non-critical ops from bottleneck",
      throughput_gain_pct: 15,
    });

    const recs: string[] = [];
    recs.push(`Bottleneck: ${bottleneck.name} (${constraintType}) — ${bottleneck.utilization_pct}% util, ${bottleneck.wip_queue_parts} WIP`);
    if (systemThroughput < input.demand_parts_per_hr) {
      recs.push(`System output ${systemThroughput.toFixed(1)}/hr below demand ${input.demand_parts_per_hr}/hr — address bottleneck`);
    }
    recs.push(`Resolving bottleneck could increase throughput to ${maxThroughput.toFixed(1)}/hr`);

    return {
      bottleneck_id: bottleneck.id,
      bottleneck_name: bottleneck.name,
      constraint_type: constraintType,
      system_throughput_per_hr: Math.round(systemThroughput * 10) / 10,
      max_throughput_per_hr: Math.round(maxThroughput * 10) / 10,
      utilization_profile: profile,
      improvement_impact: improvements,
      recommendations: recs,
    };
  }
}

export const bottleneckIdentificationEngine = new BottleneckIdentificationEngine();
