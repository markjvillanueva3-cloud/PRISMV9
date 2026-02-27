/**
 * BatchOptimizationEngine — Manufacturing Intelligence Layer
 *
 * Optimizes production batch grouping, campaign sequencing, and
 * setup minimization for multiple jobs. Composes CampaignEngine + scheduler.
 *
 * Actions: batch_group, batch_sequence, batch_setup_minimize, batch_capacity
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BatchJob {
  id: string;
  part_name: string;
  quantity: number;
  material: string;
  material_iso_group: string;
  tooling_group: string;            // jobs with same tooling can share setup
  fixture_type: string;
  cycle_time_min: number;
  setup_time_min: number;
  due_date: string;
  priority: number;                 // 1–5 (5 = highest)
}

export interface BatchGroup {
  group_id: string;
  jobs: string[];                   // job IDs in this group
  reason: string;
  shared_tooling: boolean;
  shared_fixture: boolean;
  shared_material: boolean;
  total_parts: number;
  total_time_min: number;
  setup_saves_min: number;
}

export interface BatchSequence {
  sequence: BatchGroup[];
  total_makespan_min: number;
  total_setup_time_min: number;
  setup_savings_min: number;
  setup_savings_pct: number;
}

export interface SetupMatrix {
  /** Changeover time from group i to group j */
  matrix: Record<string, Record<string, number>>;
  groups: string[];
}

export interface BatchCapacity {
  total_demand_hours: number;
  available_hours: number;
  load_pct: number;
  can_complete_on_time: boolean;
  bottleneck_group: string | null;
  suggested_overtime_hours: number;
}

// ============================================================================
// GROUPING LOGIC
// ============================================================================

/**
 * Group jobs by similarity to minimize setups.
 * Priority: same tooling > same fixture > same material
 */
function groupJobs(jobs: BatchJob[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  const assigned = new Set<string>();

  // Pass 1: Group by tooling (strongest grouping criterion)
  const byTooling = new Map<string, BatchJob[]>();
  for (const job of jobs) {
    const key = job.tooling_group;
    if (!byTooling.has(key)) byTooling.set(key, []);
    byTooling.get(key)!.push(job);
  }

  let gid = 0;
  for (const [toolingKey, toolingJobs] of byTooling) {
    if (toolingJobs.length < 2) continue;

    // Sub-group by fixture within tooling group
    const byFixture = new Map<string, BatchJob[]>();
    for (const j of toolingJobs) {
      if (!byFixture.has(j.fixture_type)) byFixture.set(j.fixture_type, []);
      byFixture.get(j.fixture_type)!.push(j);
    }

    for (const [fixtureKey, fixtureJobs] of byFixture) {
      const jobIds = fixtureJobs.map(j => j.id);
      const totalParts = fixtureJobs.reduce((s, j) => s + j.quantity, 0);
      const totalCutTime = fixtureJobs.reduce((s, j) => s + j.quantity * j.cycle_time_min, 0);
      const singleSetupTime = fixtureJobs[0].setup_time_min;
      const individualSetupTime = fixtureJobs.reduce((s, j) => s + j.setup_time_min, 0);
      const setupSaved = individualSetupTime - singleSetupTime;

      for (const id of jobIds) assigned.add(id);

      groups.push({
        group_id: `BG-${++gid}`,
        jobs: jobIds,
        reason: `Shared tooling (${toolingKey}) + fixture (${fixtureKey})`,
        shared_tooling: true, shared_fixture: true,
        shared_material: fixtureJobs.every(j => j.material_iso_group === fixtureJobs[0].material_iso_group),
        total_parts: totalParts,
        total_time_min: Math.round(totalCutTime + singleSetupTime),
        setup_saves_min: Math.round(setupSaved),
      });
    }
  }

  // Pass 2: Remaining unassigned jobs get individual groups
  for (const job of jobs) {
    if (assigned.has(job.id)) continue;
    groups.push({
      group_id: `BG-${++gid}`,
      jobs: [job.id],
      reason: "No grouping opportunity — unique tooling/fixture",
      shared_tooling: false, shared_fixture: false, shared_material: false,
      total_parts: job.quantity,
      total_time_min: Math.round(job.quantity * job.cycle_time_min + job.setup_time_min),
      setup_saves_min: 0,
    });
  }

  return groups;
}

/**
 * Setup changeover time estimation.
 * Same tooling = 5 min (just load new program)
 * Same fixture, different tooling = 15 min
 * Different everything = 30 min (full changeover)
 */
function changeover(from: BatchGroup, to: BatchGroup, jobs: BatchJob[]): number {
  const fromJob = jobs.find(j => j.id === from.jobs[0]);
  const toJob = jobs.find(j => j.id === to.jobs[0]);
  if (!fromJob || !toJob) return 30;

  if (fromJob.tooling_group === toJob.tooling_group) return 5;
  if (fromJob.fixture_type === toJob.fixture_type) return 15;
  if (fromJob.material_iso_group === toJob.material_iso_group) return 20;
  return 30;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BatchOptimizationEngine {
  group(jobs: BatchJob[]): BatchGroup[] {
    return groupJobs(jobs);
  }

  sequence(jobs: BatchJob[]): BatchSequence {
    const groups = groupJobs(jobs);

    // Sort groups: highest priority first, then earliest due date
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    groups.sort((a, b) => {
      const aPriority = Math.max(...a.jobs.map(id => jobMap.get(id)?.priority || 0));
      const bPriority = Math.max(...b.jobs.map(id => jobMap.get(id)?.priority || 0));
      if (aPriority !== bPriority) return bPriority - aPriority;

      const aDue = Math.min(...a.jobs.map(id => new Date(jobMap.get(id)?.due_date || "2099-12-31").getTime()));
      const bDue = Math.min(...b.jobs.map(id => new Date(jobMap.get(id)?.due_date || "2099-12-31").getTime()));
      return aDue - bDue;
    });

    // Calculate total times
    let totalSetup = 0;
    let totalWithoutGrouping = 0;

    for (let i = 0; i < groups.length; i++) {
      if (i === 0) {
        totalSetup += jobs.find(j => j.id === groups[i].jobs[0])?.setup_time_min || 20;
      } else {
        totalSetup += changeover(groups[i - 1], groups[i], jobs);
      }
    }

    for (const job of jobs) {
      totalWithoutGrouping += job.setup_time_min;
    }

    const totalMakespan = groups.reduce((s, g) => s + g.total_time_min, 0) + totalSetup;
    const setupSavings = totalWithoutGrouping - totalSetup;

    return {
      sequence: groups,
      total_makespan_min: Math.round(totalMakespan),
      total_setup_time_min: Math.round(totalSetup),
      setup_savings_min: Math.round(setupSavings),
      setup_savings_pct: totalWithoutGrouping > 0
        ? Math.round((setupSavings / totalWithoutGrouping) * 10000) / 100
        : 0,
    };
  }

  setupMatrix(jobs: BatchJob[]): SetupMatrix {
    const groups = groupJobs(jobs);
    const matrix: Record<string, Record<string, number>> = {};

    for (const from of groups) {
      matrix[from.group_id] = {};
      for (const to of groups) {
        matrix[from.group_id][to.group_id] = from.group_id === to.group_id
          ? 0
          : changeover(from, to, jobs);
      }
    }

    return { matrix, groups: groups.map(g => g.group_id) };
  }

  capacity(jobs: BatchJob[], availableHoursPerDay: number = 16, horizonDays: number = 30): BatchCapacity {
    const sequence = this.sequence(jobs);
    const totalDemand = sequence.total_makespan_min / 60;
    const totalAvailable = availableHoursPerDay * horizonDays;
    const loadPct = (totalDemand / Math.max(totalAvailable, 1)) * 100;

    // Find bottleneck group (longest)
    const bottleneck = sequence.sequence.reduce((max, g) => g.total_time_min > max.total_time_min ? g : max, sequence.sequence[0]);

    return {
      total_demand_hours: Math.round(totalDemand * 100) / 100,
      available_hours: totalAvailable,
      load_pct: Math.round(loadPct * 10) / 10,
      can_complete_on_time: totalDemand <= totalAvailable,
      bottleneck_group: bottleneck ? bottleneck.group_id : null,
      suggested_overtime_hours: Math.max(0, Math.round((totalDemand - totalAvailable) * 100) / 100),
    };
  }
}

export const batchOptimizationEngine = new BatchOptimizationEngine();
