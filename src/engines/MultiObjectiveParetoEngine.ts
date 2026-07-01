/**
 * MultiObjectiveParetoEngine — Pareto-optimal multi-objective machining optimizer.
 *
 * Given N objectives (cycle time, surface finish, tool life, cost, power),
 * generates the Pareto frontier of non-dominated solutions by varying
 * cutting parameters within bounds.
 *
 * Uses: Grid sampling → Kienzle/Taylor physics → dominance filtering → frontier extraction.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface ObjectiveSpec {
  name: string;
  minimize: boolean;
  weight: number; // 0-1, for weighted-sum fallback
  target?: number;
  hard_limit?: number;
}

export interface ParetoInput {
  objectives: ObjectiveSpec[];
  parameter_bounds: {
    spindle_rpm: [number, number];
    feed_per_tooth_mm: [number, number];
    axial_depth_mm: [number, number];
    radial_depth_mm: [number, number];
  };
  fixed: {
    tool_diameter_mm: number;
    flute_count: number;
    material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    cutting_speed_range_m_min?: [number, number];
    geometry_volume_cm3?: number;
  };
  machine: {
    max_power_kw: number;
    max_rpm: number;
  };
  grid_resolution?: number; // points per dimension (default 8)
}

export interface ParetoSolution {
  id: number;
  parameters: {
    spindle_rpm: number;
    feed_per_tooth_mm: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
    feed_rate_mmmin: number;
    cutting_speed_m_min: number;
  };
  objectives: Record<string, number>;
  feasible: boolean;
  dominated: boolean;
}

export interface ParetoResult {
  frontier: ParetoSolution[];
  dominated_solutions: number;
  total_evaluated: number;
  infeasible_count: number;
  utopia_point: Record<string, number>;
  nadir_point: Record<string, number>;
  best_compromise: ParetoSolution | null;
  sensitivity: Array<{
    parameter: string;
    most_sensitive_objective: string;
    elasticity: number; // % change in objective per % change in parameter
  }>;
}

const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };
const TAYLOR_N: Record<string, number> = { P: 0.25, M: 0.20, K: 0.30, N: 0.35, S: 0.15, H: 0.12 };
const TAYLOR_REF: Record<string, { vc: number; T: number }> = {
  P: { vc: 200, T: 60 }, M: { vc: 120, T: 45 }, K: { vc: 250, T: 75 },
  N: { vc: 400, T: 90 }, S: { vc: 50, T: 30 }, H: { vc: 80, T: 40 },
};

export class MultiObjectiveParetoEngine {
  compute(input: ParetoInput): AtomicValue<ParetoResult> {
    const { objectives, parameter_bounds: bounds, fixed, machine } = input;
    const res = input.grid_resolution || 8;
    const kc11 = KC11[fixed.material_iso_group] || 2100;
    const mc = 0.25;
    const taylorRef = TAYLOR_REF[fixed.material_iso_group] || TAYLOR_REF.P;
    const taylorN = TAYLOR_N[fixed.material_iso_group] || 0.25;
    const volume = fixed.geometry_volume_cm3 || 50;

    // Generate grid of parameter combinations
    const rpmValues = this.linspace(bounds.spindle_rpm[0], bounds.spindle_rpm[1], res);
    const fzValues = this.linspace(bounds.feed_per_tooth_mm[0], bounds.feed_per_tooth_mm[1], res);
    const apValues = this.linspace(bounds.axial_depth_mm[0], bounds.axial_depth_mm[1], Math.max(3, Math.floor(res / 2)));
    const aeValues = this.linspace(bounds.radial_depth_mm[0], bounds.radial_depth_mm[1], Math.max(3, Math.floor(res / 2)));

    const allSolutions: ParetoSolution[] = [];
    let id = 0;

    for (const rpm of rpmValues) {
      if (rpm > machine.max_rpm) continue;
      const vc = Math.PI * fixed.tool_diameter_mm * rpm / 1000;

      for (const fz of fzValues) {
        for (const ap of apValues) {
          for (const ae of aeValues) {
            const feedRate = rpm * fz * fixed.flute_count;

            // Physics calculations
            const hm = fz * Math.sqrt(ae / fixed.tool_diameter_mm);
            const Fc = kc11 * ap * hm * Math.pow(Math.max(0.001, hm), -mc);
            const power = (Fc * vc) / 60000;
            const mrr = (ap * ae * feedRate) / 1000;
            const cycleTime = volume / Math.max(mrr, 0.001) * 1.15;
            const scallop = (ae * ae) / (8 * fixed.tool_diameter_mm / 2);
            const Ra = scallop * 4 + 0.2;
            const toolLifeMin = taylorRef.T * Math.pow(taylorRef.vc / vc, 1 / taylorN);
            const toolLifeParts = Math.max(1, Math.floor(toolLifeMin / cycleTime));
            const costPerPart = cycleTime * 1.5 + (1 / toolLifeParts) * 50; // machine rate + tool cost

            // Check feasibility
            const feasible = power <= machine.max_power_kw && feedRate <= 30000;

            // Compute objective values
            const objValues: Record<string, number> = {};
            for (const obj of objectives) {
              switch (obj.name.toLowerCase()) {
                case "cycle_time": objValues[obj.name] = Math.round(cycleTime * 100) / 100; break;
                case "surface_finish": objValues[obj.name] = Math.round(Ra * 100) / 100; break;
                case "tool_life": objValues[obj.name] = toolLifeParts; break;
                case "power": objValues[obj.name] = Math.round(power * 100) / 100; break;
                case "cost": objValues[obj.name] = Math.round(costPerPart * 100) / 100; break;
                case "mrr": objValues[obj.name] = Math.round(mrr * 100) / 100; break;
                case "force": objValues[obj.name] = Math.round(Fc); break;
                default: objValues[obj.name] = 0;
              }
            }

            // Check hard limits
            let hardLimitViolated = false;
            for (const obj of objectives) {
              if (obj.hard_limit !== undefined) {
                const val = objValues[obj.name];
                if (obj.minimize && val > obj.hard_limit) hardLimitViolated = true;
                if (!obj.minimize && val < obj.hard_limit) hardLimitViolated = true;
              }
            }

            allSolutions.push({
              id: id++,
              parameters: {
                spindle_rpm: Math.round(rpm),
                feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
                axial_depth_mm: Math.round(ap * 100) / 100,
                radial_depth_mm: Math.round(ae * 100) / 100,
                feed_rate_mmmin: Math.round(feedRate),
                cutting_speed_m_min: Math.round(vc),
              },
              objectives: objValues,
              feasible: feasible && !hardLimitViolated,
              dominated: false,
            });
          }
        }
      }
    }

    // Filter to feasible solutions
    const feasible = allSolutions.filter(s => s.feasible);

    // Pareto dominance filtering
    for (let i = 0; i < feasible.length; i++) {
      for (let j = 0; j < feasible.length; j++) {
        if (i === j || feasible[j].dominated) continue;
        if (this.dominates(feasible[j], feasible[i], objectives)) {
          feasible[i].dominated = true;
          break;
        }
      }
    }

    const frontier = feasible.filter(s => !s.dominated);
    const dominatedCount = feasible.length - frontier.length;
    const infeasibleCount = allSolutions.length - feasible.length;

    // Utopia and nadir points
    const utopia: Record<string, number> = {};
    const nadir: Record<string, number> = {};
    for (const obj of objectives) {
      const vals = frontier.map(s => s.objectives[obj.name]);
      if (vals.length === 0) { utopia[obj.name] = 0; nadir[obj.name] = 0; continue; }
      utopia[obj.name] = obj.minimize ? Math.min(...vals) : Math.max(...vals);
      nadir[obj.name] = obj.minimize ? Math.max(...vals) : Math.min(...vals);
    }

    // Best compromise (closest to utopia by weighted distance)
    let bestCompromise: ParetoSolution | null = null;
    let bestDist = Infinity;
    for (const sol of frontier) {
      let dist = 0;
      for (const obj of objectives) {
        const range = Math.abs(nadir[obj.name] - utopia[obj.name]) || 1;
        const normalized = (sol.objectives[obj.name] - utopia[obj.name]) / range;
        dist += obj.weight * normalized * normalized;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestCompromise = sol;
      }
    }

    // Sensitivity analysis
    const sensitivity = this.computeSensitivity(frontier, objectives);

    const result: ParetoResult = {
      frontier,
      dominated_solutions: dominatedCount,
      total_evaluated: allSolutions.length,
      infeasible_count: infeasibleCount,
      utopia_point: utopia,
      nadir_point: nadir,
      best_compromise: bestCompromise,
      sensitivity,
    };

    return {
      value: result,
      unit: "pareto_frontier",
      formula: "grid_sample→Kienzle+Taylor→dominance_filter",
      confidence: frontier.length > 3 ? 0.85 : 0.6,
    };
  }

  private dominates(a: ParetoSolution, b: ParetoSolution, objectives: ObjectiveSpec[]): boolean {
    let atLeastOneBetter = false;
    for (const obj of objectives) {
      const va = a.objectives[obj.name];
      const vb = b.objectives[obj.name];
      if (obj.minimize) {
        if (va > vb) return false;
        if (va < vb) atLeastOneBetter = true;
      } else {
        if (va < vb) return false;
        if (va > vb) atLeastOneBetter = true;
      }
    }
    return atLeastOneBetter;
  }

  private computeSensitivity(frontier: ParetoSolution[], objectives: ObjectiveSpec[]) {
    const params = ["spindle_rpm", "feed_per_tooth_mm", "axial_depth_mm", "radial_depth_mm"] as const;
    const result: ParetoResult["sensitivity"] = [];

    for (const param of params) {
      let maxElasticity = 0;
      let mostSensitive = objectives[0]?.name || "";

      for (const obj of objectives) {
        // Compute correlation between parameter and objective across frontier
        if (frontier.length < 3) continue;
        const paramVals = frontier.map(s => s.parameters[param]);
        const objVals = frontier.map(s => s.objectives[obj.name]);
        const elasticity = Math.abs(this.correlation(paramVals, objVals));
        if (elasticity > maxElasticity) {
          maxElasticity = elasticity;
          mostSensitive = obj.name;
        }
      }

      result.push({
        parameter: param,
        most_sensitive_objective: mostSensitive,
        elasticity: Math.round(maxElasticity * 100) / 100,
      });
    }

    return result;
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return denom > 0 ? num / denom : 0;
  }

  private linspace(start: number, end: number, count: number): number[] {
    if (count <= 1) return [start];
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + i * step);
  }
}

export const multiObjectiveParetoEngine = new MultiObjectiveParetoEngine();
