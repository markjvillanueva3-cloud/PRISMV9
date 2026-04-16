/**
 * ProjectSchedulingEngine — CPM/PERT project scheduling
 *
 * Models: Critical path method, PERT 3-point estimates,
 *         slack/float, project duration probability
 * References: PMI PMBOK, Kelley & Walker 1959
 */

export interface Activity {
  id: string;
  duration: number;                    // deterministic or PERT most likely
  optimistic?: number;                 // PERT
  pessimistic?: number;                // PERT
  predecessors: string[];
}

export interface ProjectSchedulingInput {
  activities: Activity[];
  use_pert?: boolean;                  // default false
  target_duration?: number;            // for probability calc
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ProjectSchedulingResult {
  project_duration: AtomicValue;
  critical_path_length: AtomicValue;
  num_critical_activities: AtomicValue;
  total_float: AtomicValue;
  project_variance: AtomicValue;
  target_probability_pct: AtomicValue;
  num_activities: AtomicValue;
  parallelism_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Normal CDF approximation
function normCdf(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export class ProjectSchedulingEngine {
  calculate(input: ProjectSchedulingInput): ProjectSchedulingResult {
    const {
      activities,
      use_pert = false,
    } = input;

    const recs: string[] = [];
    const n = activities.length;

    // Build activity map
    const actMap = new Map<string, Activity>();
    for (const act of activities) actMap.set(act.id, act);

    // PERT expected duration and variance
    const durations = new Map<string, number>();
    const variances = new Map<string, number>();
    for (const act of activities) {
      if (use_pert && act.optimistic !== undefined && act.pessimistic !== undefined) {
        const te = (act.optimistic + 4 * act.duration + act.pessimistic) / 6;
        const v = ((act.pessimistic - act.optimistic) / 6) ** 2;
        durations.set(act.id, te);
        variances.set(act.id, v);
      } else {
        durations.set(act.id, act.duration);
        variances.set(act.id, 0);
      }
    }

    // Forward pass (ES, EF)
    const ES = new Map<string, number>();
    const EF = new Map<string, number>();
    const sorted = this._topoSort(activities);

    for (const id of sorted) {
      const act = actMap.get(id)!;
      let es = 0;
      for (const pred of act.predecessors) {
        es = Math.max(es, EF.get(pred) ?? 0);
      }
      ES.set(id, es);
      EF.set(id, es + (durations.get(id) ?? 0));
    }

    const projectDuration = Math.max(...Array.from(EF.values()), 0);

    // Backward pass (LS, LF)
    const LS = new Map<string, number>();
    const LF = new Map<string, number>();

    // Find successor map
    const successors = new Map<string, string[]>();
    for (const act of activities) {
      successors.set(act.id, []);
    }
    for (const act of activities) {
      for (const pred of act.predecessors) {
        const s = successors.get(pred);
        if (s) s.push(act.id);
      }
    }

    for (const id of sorted.slice().reverse()) {
      const succs = successors.get(id) ?? [];
      let lf = succs.length === 0 ? projectDuration : Math.min(...succs.map(s => LS.get(s) ?? projectDuration));
      LF.set(id, lf);
      LS.set(id, lf - (durations.get(id) ?? 0));
    }

    // Float and critical path
    let criticalCount = 0;
    let totalFloat = 0;
    let criticalVariance = 0;
    for (const act of activities) {
      const float = (LS.get(act.id) ?? 0) - (ES.get(act.id) ?? 0);
      totalFloat += float;
      if (Math.abs(float) < 0.001) {
        criticalCount++;
        criticalVariance += variances.get(act.id) ?? 0;
      }
    }

    // Probability of meeting target
    const target = input.target_duration ?? projectDuration;
    let prob = 50;
    if (criticalVariance > 0) {
      const z = (target - projectDuration) / Math.sqrt(criticalVariance);
      prob = normCdf(z) * 100;
    } else {
      prob = target >= projectDuration ? 100 : 0;
    }

    // Parallelism ratio (total duration of all activities / project duration)
    const totalDur = activities.reduce((s, a) => s + (durations.get(a.id) ?? 0), 0);
    const parallelism = projectDuration > 0 ? totalDur / projectDuration : 1;

    const isSafe = n >= 2 && projectDuration > 0;

    if (criticalCount === n) recs.push(`All activities critical — no slack, high risk`);
    if (criticalCount / n > 0.7) recs.push(`${criticalCount}/${n} activities critical — schedule inflexible`);
    if (prob < 50 && input.target_duration !== undefined) recs.push(`Only ${prob.toFixed(0)}% chance of meeting target ${target} — add buffer`);
    if (parallelism < 1.2) recs.push(`Low parallelism (${parallelism.toFixed(1)}) — mostly sequential`);
    if (recs.length === 0) recs.push(`Schedule nominal — duration=${projectDuration.toFixed(1)}, ${criticalCount} critical activities, P(target)=${prob.toFixed(0)}%`);

    return {
      project_duration: mkAv(Math.round(projectDuration * 10) / 10, "time_units", Math.sqrt(criticalVariance), "cpm"),
      critical_path_length: mkAv(criticalCount, "activities", 0, "zero_float"),
      num_critical_activities: mkAv(criticalCount, "count", 0, "cpm"),
      total_float: mkAv(Math.round(totalFloat * 10) / 10, "time_units", totalFloat * 0.05, "backward_pass"),
      project_variance: mkAv(Math.round(criticalVariance * 100) / 100, "time_units²", criticalVariance * 0.10, "pert"),
      target_probability_pct: mkAv(Math.round(prob * 10) / 10, "%", prob * 0.05, "normal_cdf"),
      num_activities: mkAv(n, "count", 0, "input"),
      parallelism_ratio: mkAv(Math.round(parallelism * 100) / 100, "ratio", parallelism * 0.05, "total_project"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }

  private _topoSort(activities: Activity[]): string[] {
    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const a of activities) {
      inDeg.set(a.id, a.predecessors.length);
      adj.set(a.id, []);
    }
    for (const a of activities) {
      for (const p of a.predecessors) {
        const list = adj.get(p);
        if (list) list.push(a.id);
      }
    }
    const queue = activities.filter(a => a.predecessors.length === 0).map(a => a.id);
    const result: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      for (const succ of adj.get(id) ?? []) {
        const d = (inDeg.get(succ) ?? 1) - 1;
        inDeg.set(succ, d);
        if (d === 0) queue.push(succ);
      }
    }
    return result;
  }
}

export const projectSchedulingEngine = new ProjectSchedulingEngine();
