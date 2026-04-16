/**
 * InverseStackupAllocatorEngine
 * ===============================
 *
 * Inverse of tolerance stackup: given an assembly/functional tolerance,
 * allocate that budget across component tolerances using one of:
 *   - Equal: each component gets the same share
 *   - Cost-weighted: looser tolerances get more budget (minimize total cost)
 *   - Capability-weighted (by Cpk): more-capable processes get tighter
 *   - Worst-case: arithmetic sum budget (conservative)
 *   - RSS: root-sum-square allocation (realistic for independent terms)
 *
 * This is the INVERSE of ToleranceStackEngine — that engine goes
 * components → assembly; this engine goes assembly → components.
 *
 * Worst-case stack:   T_assy = Σ |Ti|
 * RSS stack:          T_assy = sqrt(Σ Ti²)
 *
 * Cost model (Sutherland 1975 / Chase 1988):
 *   Cost(Ti) ∝ Ti^(-k)    (typical k ≈ 1.0 for conventional machining, 2.0 for precision)
 *   Minimizing total cost under Σ Ti² ≤ T_assy² gives:
 *     Ti ∝ (cost_weight_i)^(1/(k+2))
 *
 * Capability-weighted (Cpk):
 *   Process with high Cpk can hit tight tolerance with low scrap.
 *   Ti ∝ 1 / Cpk_i  (low Cpk → more budget, because it can't afford tightness).
 *
 * Validation:
 *   - Each Ti must be ≥ the process capability minimum (6σ) if provided
 *   - Infeasibility reported if minimum sum > T_assy
 *   - Output feasibility score in [0, 1]
 *
 * References:
 *   - Chase, K.W. (1988) "A Survey of Research on Tolerance Analysis"
 *   - Nigam, S. (1995) "Review of Statistical Approaches to Tolerance Analysis"
 *   - ASME Y14.5-2018 §9 Tolerance stacks
 *
 * @module engines/InverseStackupAllocatorEngine
 * @milestone LATHE-PRO-MS8
 */

export type AllocationMethod =
  | "equal"
  | "cost_weighted"
  | "capability_weighted"
  | "worst_case"
  | "rss";

export interface ComponentSpec {
  id: string;
  /** Nominal dimension (for reference) */
  nominal_mm?: number;
  /** Minimum achievable tolerance (6σ of the process). Optional but recommended. */
  min_tolerance_mm?: number;
  /** Cost exponent k — higher = more expensive to tighten. Default 1.0 */
  cost_exponent?: number;
  /** Process capability Cpk (typical 1.0 - 2.0). Default 1.33 */
  cpk?: number;
  /** Pre-fixed tolerance (locked, cannot reallocate) */
  fixed_tolerance_mm?: number;
  /** Weight/sign for directional stack (+1 or -1). Default +1 */
  sign?: 1 | -1;
}

export interface InverseStackupInput {
  /** Assembly / functional tolerance budget (mm) */
  assembly_tolerance_mm: number;
  /** Method */
  method: AllocationMethod;
  /** Components */
  components: ComponentSpec[];
}

export interface ComponentAllocation {
  id: string;
  allocated_tolerance_mm: number;
  min_floor_mm: number;
  utilization_pct: number;
  feasible: boolean;
  note?: string;
}

export interface InverseStackupResult {
  method: AllocationMethod;
  assembly_tolerance_mm: number;
  allocations: ComponentAllocation[];
  total_allocated_wc: number;
  total_allocated_rss: number;
  feasible: boolean;
  feasibility_score: number;
  warnings: string[];
  reasoning: string[];
}

class InverseStackupAllocatorEngineImpl {
  allocate(i: InverseStackupInput): InverseStackupResult {
    const warnings: string[] = [];
    const reasoning: string[] = [];

    if (i.components.length === 0) {
      return {
        method: i.method,
        assembly_tolerance_mm: i.assembly_tolerance_mm,
        allocations: [],
        total_allocated_wc: 0,
        total_allocated_rss: 0,
        feasible: false,
        feasibility_score: 0,
        warnings: ["No components provided"],
        reasoning: [],
      };
    }

    // Separate fixed vs free
    const fixed = i.components.filter((c) => c.fixed_tolerance_mm !== undefined);
    const free = i.components.filter((c) => c.fixed_tolerance_mm === undefined);
    const fixedSum_wc = fixed.reduce((s, c) => s + Math.abs(c.fixed_tolerance_mm!), 0);
    const fixedSum_sq = fixed.reduce((s, c) => s + c.fixed_tolerance_mm! ** 2, 0);

    const isRssMethod =
      i.method === "rss" ||
      i.method === "cost_weighted" ||
      i.method === "capability_weighted" ||
      i.method === "equal";
    const T = i.assembly_tolerance_mm;
    let remainingBudget: number;
    if (i.method === "worst_case") {
      remainingBudget = Math.max(0, T - fixedSum_wc);
    } else {
      const remSq = T * T - fixedSum_sq;
      remainingBudget = remSq > 0 ? Math.sqrt(remSq) : 0;
    }

    const n = free.length;
    const weights: number[] = free.map((c) => {
      if (i.method === "equal") return 1;
      if (i.method === "cost_weighted") return 1 / Math.pow(Math.max(0.1, c.cost_exponent ?? 1.0), 1);
      if (i.method === "capability_weighted") return 1 / Math.max(0.5, c.cpk ?? 1.33);
      return 1;
    });
    const sumWeights = weights.reduce((s, w) => s + w, 0) || 1;

    const allocations: ComponentAllocation[] = [];
    const allocMap = new Map<string, number>();

    for (const c of fixed) {
      const floor = c.min_tolerance_mm ?? 0;
      const t = c.fixed_tolerance_mm!;
      allocMap.set(c.id, t);
      allocations.push({
        id: c.id,
        allocated_tolerance_mm: round5(t),
        min_floor_mm: round5(floor),
        utilization_pct: floor > 0 ? round1((floor / t) * 100) : 100,
        feasible: t >= floor,
        note: "fixed",
      });
    }

    if (n > 0 && remainingBudget > 0) {
      if (i.method === "worst_case") {
        for (let idx = 0; idx < n; idx++) {
          const c = free[idx]!;
          const share = (weights[idx]! / sumWeights) * remainingBudget;
          allocMap.set(c.id, share);
        }
      } else {
        const sumWsq = weights.reduce((s, w) => s + w * w, 0);
        const k = sumWsq > 0 ? remainingBudget / Math.sqrt(sumWsq) : 0;
        for (let idx = 0; idx < n; idx++) {
          const c = free[idx]!;
          allocMap.set(c.id, k * weights[idx]!);
        }
      }
    } else if (n > 0) {
      for (const c of free) allocMap.set(c.id, 0);
      warnings.push("No tolerance budget remaining for free components after fixed allocations");
    }

    // Enforce floors with up to 5 redistribution iterations
    let iterations = 0;
    while (iterations < 5) {
      iterations++;
      let adjusted = false;
      const toFloor: ComponentSpec[] = [];
      for (const c of free) {
        const cur = allocMap.get(c.id) ?? 0;
        const floor = c.min_tolerance_mm ?? 0;
        if (cur < floor) {
          toFloor.push(c);
          allocMap.set(c.id, floor);
          adjusted = true;
        }
      }
      if (!adjusted) break;

      const flooredSet = new Set(toFloor.map((c) => c.id));
      const remainingFree = free.filter((c) => !flooredSet.has(c.id));
      const usedByFloor_wc = toFloor.reduce((s, c) => s + (c.min_tolerance_mm ?? 0), 0);
      const usedByFloor_sq = toFloor.reduce((s, c) => s + (c.min_tolerance_mm ?? 0) ** 2, 0);

      let newBudget: number;
      if (i.method === "worst_case") {
        newBudget = Math.max(0, remainingBudget - usedByFloor_wc);
      } else {
        const remSq = remainingBudget * remainingBudget - usedByFloor_sq;
        newBudget = remSq > 0 ? Math.sqrt(remSq) : 0;
      }

      const rfWeights: number[] = remainingFree.map((c) => {
        const origIdx = free.indexOf(c);
        return weights[origIdx] ?? 1;
      });
      const rfSumW = rfWeights.reduce((s, w) => s + w, 0) || 1;

      if (remainingFree.length > 0) {
        if (i.method === "worst_case") {
          for (let j = 0; j < remainingFree.length; j++) {
            allocMap.set(remainingFree[j]!.id, (rfWeights[j]! / rfSumW) * newBudget);
          }
        } else {
          const sumWsq = rfWeights.reduce((s, w) => s + w * w, 0);
          const k = sumWsq > 0 ? newBudget / Math.sqrt(sumWsq) : 0;
          for (let j = 0; j < remainingFree.length; j++) {
            allocMap.set(remainingFree[j]!.id, k * rfWeights[j]!);
          }
        }
      }
    }

    for (const c of free) {
      const t = allocMap.get(c.id) ?? 0;
      const floor = c.min_tolerance_mm ?? 0;
      const feas = t >= floor;
      allocations.push({
        id: c.id,
        allocated_tolerance_mm: round5(t),
        min_floor_mm: round5(floor),
        utilization_pct: t > 0 ? round1((floor / t) * 100) : 100,
        feasible: feas,
        note: feas ? undefined : "below process floor",
      });
    }

    const total_wc = allocations.reduce((s, a) => s + a.allocated_tolerance_mm, 0);
    const total_rss = Math.sqrt(allocations.reduce((s, a) => s + a.allocated_tolerance_mm ** 2, 0));

    const allFeasible = allocations.every((a) => a.feasible);
    const budgetMet = isRssMethod ? total_rss <= T * 1.001 : total_wc <= T * 1.001;
    const feasible = allFeasible && budgetMet;

    let feasibility_score: number;
    if (feasible) {
      feasibility_score = 1.0;
    } else {
      const floorSum_rss = Math.sqrt(
        i.components.reduce((s, c) => {
          const f = c.min_tolerance_mm ?? 0;
          return s + f * f;
        }, 0)
      );
      feasibility_score = Math.max(0, Math.min(1, T / Math.max(0.0001, floorSum_rss)));
    }

    reasoning.push(`Method=${i.method}, T_assy=${T}mm, ${fixed.length} fixed, ${free.length} free`);
    reasoning.push(`Σ_wc=${round4(total_wc)}mm, RSS=${round4(total_rss)}mm`);
    if (!budgetMet) {
      warnings.push(
        `Allocation exceeds budget: ${isRssMethod ? "RSS" : "worst-case"} sum ` +
          `${isRssMethod ? round4(total_rss) : round4(total_wc)} > ${T}`
      );
    }
    if (!allFeasible) {
      const infeas = allocations.filter((a) => !a.feasible).map((a) => a.id);
      warnings.push(`Components below process floor: ${infeas.join(", ")}`);
    }

    return {
      method: i.method,
      assembly_tolerance_mm: T,
      allocations,
      total_allocated_wc: round4(total_wc),
      total_allocated_rss: round4(total_rss),
      feasible,
      feasibility_score: round2(feasibility_score),
      warnings,
      reasoning,
    };
  }

  getStats(): { methods: AllocationMethod[]; models: Record<string, string> } {
    return {
      methods: ["equal", "cost_weighted", "capability_weighted", "worst_case", "rss"],
      models: {
        worst_case: "Σ |Ti|",
        rss: "sqrt(Σ Ti²)",
        cost_model: "Cost ∝ T^(-k), k=1.0 conventional, 2.0 precision",
      },
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round5(n: number): number { return Math.round(n * 100000) / 100000; }

export const inverseStackupAllocatorEngine = new InverseStackupAllocatorEngineImpl();
export type { InverseStackupAllocatorEngineImpl };
