/**
 * BottleneckAnalysisEngine — Theory of Constraints & DBR Scheduling
 *
 * Identifies production bottlenecks using Theory of Constraints (TOC) analysis,
 * implements Drum-Buffer-Rope scheduling, and provides sensitivity analysis
 * across multiple scenarios.
 *
 * @engine BottleneckAnalysisEngine
 * @dispatcher calcDispatcher
 * @actions bottleneck_identify, bottleneck_dbr, bottleneck_sensitivity
 */

// ── Types ──

export interface ResourceInput {
  type: "machine" | "tool" | "operator" | "material";
  id: string;
  capacity_per_shift: number;
  demand_per_shift: number;
  cost_per_hour?: number;
}

export interface BottleneckRecommendation {
  action: string;
  expected_improvement_pct: number;
  cost: number;
}

export interface BottleneckResult {
  bottleneck: {
    resource_id: string;
    type: string;
    utilization_pct: number;
    excess_demand: number;
  };
  constraint_ranking: Array<{
    resource_id: string;
    utilization_pct: number;
    slack: number;
  }>;
  throughput_limited_by: string;
  recommendations: BottleneckRecommendation[];
}

export interface DBRInput {
  bottleneck_id: string;
  buffer_time_min: number;
  jobs: Array<{
    id: string;
    operations: Array<{ resource_id: string; time_min: number }>;
  }>;
}

export interface DBRResult {
  drum_rate: number;
  rope_release_schedule: Array<{ job_id: string; release_time: number }>;
  buffer_status: "green" | "yellow" | "red";
  expected_throughput_per_shift: number;
}

export interface SensitivityInput {
  resources: ResourceInput[];
  scenarios: Array<{
    name: string;
    changes: Array<Partial<ResourceInput> & { id: string }>;
  }>;
}

export interface SensitivityScenarioResult {
  name: string;
  bottleneck_id: string;
  bottleneck_utilization_pct: number;
  throughput_change_pct: number;
  bottleneck_shifted: boolean;
}

export interface SensitivityResult {
  baseline_bottleneck_id: string;
  scenarios: SensitivityScenarioResult[];
}

// ── Engine ──

class BottleneckAnalysisEngine {
  /**
   * Identify the primary bottleneck using Theory of Constraints.
   * The bottleneck is the resource with the highest utilization (demand/capacity).
   * Generates ranked constraints and actionable recommendations.
   */
  identifyBottlenecks(input: { resources: ResourceInput[] }): BottleneckResult {
    const { resources } = input;
    if (!resources || resources.length === 0) {
      throw new Error("No resources provided for bottleneck analysis");
    }

    // Calculate utilization for each resource
    const ranked = resources.map(r => {
      const util = r.capacity_per_shift > 0
        ? (r.demand_per_shift / r.capacity_per_shift) * 100
        : r.demand_per_shift > 0 ? Infinity : 0;
      const slack = r.capacity_per_shift - r.demand_per_shift;
      return { ...r, utilization_pct: Math.round(util * 10) / 10, slack };
    }).sort((a, b) => b.utilization_pct - a.utilization_pct);

    const top = ranked[0];
    const excessDemand = Math.max(0, top.demand_per_shift - top.capacity_per_shift);

    // Generate recommendations based on bottleneck type and severity
    const recommendations: BottleneckRecommendation[] = [];
    const costPerHour = top.cost_per_hour ?? 50;

    if (top.utilization_pct > 100) {
      // Over capacity — critical
      recommendations.push({
        action: `Add capacity to ${top.id}: increase from ${top.capacity_per_shift} to ${Math.ceil(top.demand_per_shift * 1.1)} units/shift`,
        expected_improvement_pct: Math.round(((top.utilization_pct - 90) / top.utilization_pct) * 100),
        cost: costPerHour * 8 * 20, // Monthly cost estimate
      });
      recommendations.push({
        action: `Add overtime shift for ${top.id}`,
        expected_improvement_pct: Math.min(30, Math.round(excessDemand / top.demand_per_shift * 100)),
        cost: costPerHour * 1.5 * 4, // 4 hours overtime at 1.5x
      });
    }

    if (top.utilization_pct > 85) {
      recommendations.push({
        action: `Reduce setup time on ${top.id} (SMED methodology)`,
        expected_improvement_pct: Math.round(Math.min(15, top.utilization_pct - 85)),
        cost: costPerHour * 16, // 2 days of kaizen
      });
      recommendations.push({
        action: `Implement preventive maintenance schedule for ${top.id}`,
        expected_improvement_pct: 5,
        cost: costPerHour * 8,
      });
    }

    if (top.type === "operator") {
      recommendations.push({
        action: `Cross-train operators for ${top.id} tasks`,
        expected_improvement_pct: 10,
        cost: costPerHour * 40, // 1 week training
      });
    }

    if (top.type === "machine") {
      recommendations.push({
        action: `Evaluate parallel/duplicate ${top.id} machine investment`,
        expected_improvement_pct: Math.round(Math.min(50, excessDemand / Math.max(top.capacity_per_shift, 1) * 100)),
        cost: costPerHour * 8 * 250, // Rough annual machine cost
      });
    }

    return {
      bottleneck: {
        resource_id: top.id,
        type: top.type,
        utilization_pct: top.utilization_pct,
        excess_demand: Math.round(excessDemand * 100) / 100,
      },
      constraint_ranking: ranked.map(r => ({
        resource_id: r.id,
        utilization_pct: r.utilization_pct,
        slack: Math.round(r.slack * 100) / 100,
      })),
      throughput_limited_by: top.id,
      recommendations,
    };
  }

  /**
   * Drum-Buffer-Rope scheduling.
   * Drum: bottleneck pace. Buffer: time protection before bottleneck.
   * Rope: material release timed to drum + buffer lead time.
   */
  drumBufferRope(input: DBRInput): DBRResult {
    const { bottleneck_id, buffer_time_min, jobs } = input;
    if (!jobs || jobs.length === 0) {
      return {
        drum_rate: 0,
        rope_release_schedule: [],
        buffer_status: "green",
        expected_throughput_per_shift: 0,
      };
    }

    // Calculate drum rate: max throughput at bottleneck (jobs per minute)
    let totalBottleneckTime = 0;
    let bottleneckJobCount = 0;
    for (const job of jobs) {
      for (const op of job.operations) {
        if (op.resource_id === bottleneck_id) {
          totalBottleneckTime += op.time_min;
          bottleneckJobCount++;
        }
      }
    }

    const avgBottleneckTime = bottleneckJobCount > 0 ? totalBottleneckTime / bottleneckJobCount : 0;
    const drumRate = avgBottleneckTime > 0 ? 1 / avgBottleneckTime : 0; // jobs per minute

    // Calculate rope release schedule: work backwards from bottleneck
    // Each job released = buffer_time + pre-bottleneck processing time before bottleneck start
    const releaseSchedule: Array<{ job_id: string; release_time: number }> = [];
    let bottleneckCursor = 0; // minutes from shift start when bottleneck starts this job

    for (const job of jobs) {
      // Sum pre-bottleneck processing time
      let preBottleneckTime = 0;
      let hasBottleneck = false;
      for (const op of job.operations) {
        if (op.resource_id === bottleneck_id) {
          hasBottleneck = true;
          break;
        }
        preBottleneckTime += op.time_min;
      }

      if (!hasBottleneck) {
        // Job doesn't use bottleneck — release immediately
        releaseSchedule.push({ job_id: job.id, release_time: 0 });
        continue;
      }

      // Release time = bottleneck start - buffer - pre-bottleneck processing
      const releaseTime = Math.max(0, bottleneckCursor - buffer_time_min - preBottleneckTime);
      releaseSchedule.push({ job_id: job.id, release_time: Math.round(releaseTime * 10) / 10 });

      // Advance bottleneck cursor
      const bnkTime = job.operations.find(o => o.resource_id === bottleneck_id)?.time_min ?? 0;
      bottleneckCursor += bnkTime;
    }

    // Buffer status: green if buffer > 1.5x avg, yellow if > 0.5x, red otherwise
    let bufferStatus: "green" | "yellow" | "red" = "green";
    if (avgBottleneckTime > 0) {
      const ratio = buffer_time_min / avgBottleneckTime;
      if (ratio < 0.5) bufferStatus = "red";
      else if (ratio < 1.5) bufferStatus = "yellow";
    }

    // Expected throughput: shift duration / avg bottleneck time
    const shiftMinutes = 480; // 8-hour shift
    const expectedThroughput = avgBottleneckTime > 0 ? Math.floor(shiftMinutes / avgBottleneckTime) : 0;

    return {
      drum_rate: Math.round(drumRate * 10000) / 10000,
      rope_release_schedule: releaseSchedule,
      buffer_status: bufferStatus,
      expected_throughput_per_shift: expectedThroughput,
    };
  }

  /**
   * Sensitivity analysis: evaluate how bottleneck shifts under different scenarios.
   */
  sensitivityAnalysis(input: SensitivityInput): SensitivityResult {
    const { resources, scenarios } = input;

    // Baseline
    const baseline = this.identifyBottlenecks({ resources });
    const baselineBnkId = baseline.bottleneck.resource_id;
    const baselineBnkUtil = baseline.bottleneck.utilization_pct;

    const results: SensitivityScenarioResult[] = [];

    for (const scenario of scenarios) {
      // Apply changes to create modified resource set
      const modified = resources.map(r => {
        const change = scenario.changes.find(c => c.id === r.id);
        if (!change) return { ...r };
        return {
          ...r,
          capacity_per_shift: change.capacity_per_shift ?? r.capacity_per_shift,
          demand_per_shift: change.demand_per_shift ?? r.demand_per_shift,
          cost_per_hour: change.cost_per_hour ?? r.cost_per_hour,
        };
      });

      const scenarioResult = this.identifyBottlenecks({ resources: modified });
      const newBnkId = scenarioResult.bottleneck.resource_id;
      const newBnkUtil = scenarioResult.bottleneck.utilization_pct;

      // Throughput change: inversely proportional to bottleneck utilization change
      // If bottleneck utilization decreased, throughput potential improved
      const throughputChange = baselineBnkUtil > 0
        ? ((baselineBnkUtil - newBnkUtil) / baselineBnkUtil) * 100
        : 0;

      results.push({
        name: scenario.name,
        bottleneck_id: newBnkId,
        bottleneck_utilization_pct: newBnkUtil,
        throughput_change_pct: Math.round(throughputChange * 100) / 100,
        bottleneck_shifted: newBnkId !== baselineBnkId,
      });
    }

    return {
      baseline_bottleneck_id: baselineBnkId,
      scenarios: results,
    };
  }
}

/** Singleton */
export const bottleneckAnalysisEngine = new BottleneckAnalysisEngine();
