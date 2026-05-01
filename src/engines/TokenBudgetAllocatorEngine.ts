/**
 * TokenBudgetAllocatorEngine — Allocates token budget across task phases
 *
 * Given a total token budget and a set of task phases, optimally
 * distributes tokens to maximize productivity. Reserves tokens for
 * critical operations (commits, tests, handoffs).
 *
 * Token savings: Prevents running out of context at critical moments
 * by ensuring budget reserves for essential operations.
 *
 * @version 1.0.0
 */

export interface Phase {
  name: string;
  priority: number; // 1 (critical) to 5 (optional)
  estimatedTokens: number;
  minTokens: number; // minimum to be useful
  flexible: boolean; // can use more or less
}

export interface BudgetAllocation {
  phase: string;
  allocated: number;
  percent: number;
  canComplete: boolean;
}

export interface AllocationPlan {
  allocations: BudgetAllocation[];
  totalBudget: number;
  totalAllocated: number;
  reserve: number;
  canCompleteAll: boolean;
  droppedPhases: string[];
}

const SYSTEM_RESERVE = 5000; // tokens reserved for system overhead

export class TokenBudgetAllocatorEngine {

  /**
   * Allocate budget across phases.
   */
  allocate(totalBudget: number, phases: Phase[]): AllocationPlan {
    const available = totalBudget - SYSTEM_RESERVE;

    // Sort by priority (critical first)
    const sorted = [...phases].sort((a, b) => a.priority - b.priority);

    const allocations: BudgetAllocation[] = [];
    const droppedPhases: string[] = [];
    let remaining = available;

    // First pass: allocate minimum to critical phases
    for (const phase of sorted) {
      if (remaining >= phase.minTokens) {
        const allocated = Math.min(phase.estimatedTokens, remaining);
        allocations.push({
          phase: phase.name,
          allocated,
          percent: Math.round((allocated / totalBudget) * 100),
          canComplete: allocated >= phase.estimatedTokens,
        });
        remaining -= allocated;
      } else if (phase.priority <= 2) {
        // Critical phase can't fit — allocate what we have
        allocations.push({
          phase: phase.name,
          allocated: remaining,
          percent: Math.round((remaining / totalBudget) * 100),
          canComplete: false,
        });
        remaining = 0;
      } else {
        droppedPhases.push(phase.name);
      }
    }

    // Second pass: distribute remaining to flexible phases
    if (remaining > 0) {
      const flexible = allocations.filter(a => {
        const phase = phases.find(p => p.name === a.phase);
        return phase?.flexible && !a.canComplete;
      });

      if (flexible.length > 0) {
        const perPhase = Math.floor(remaining / flexible.length);
        for (const alloc of flexible) {
          alloc.allocated += perPhase;
          alloc.percent = Math.round((alloc.allocated / totalBudget) * 100);
          const phase = phases.find(p => p.name === alloc.phase);
          alloc.canComplete = alloc.allocated >= (phase?.estimatedTokens || 0);
        }
      }
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);

    return {
      allocations,
      totalBudget,
      totalAllocated,
      reserve: totalBudget - totalAllocated,
      canCompleteAll: droppedPhases.length === 0 && allocations.every(a => a.canComplete),
      droppedPhases,
    };
  }

  /**
   * Quick budget check for a single operation.
   */
  canAfford(remainingBudget: number, estimatedCost: number, mustReserve = 10000): boolean {
    return remainingBudget - estimatedCost >= mustReserve;
  }

  /**
   * Suggest phase to skip if over budget.
   */
  suggestCut(plan: AllocationPlan): string | null {
    // Find the lowest-priority, flexible phase that hasn't been dropped
    const candidates = plan.allocations
      .map(a => {
        const phase = { name: a.phase, priority: 5 }; // default
        return { ...a, priority: phase.priority };
      })
      .sort((a, b) => b.priority - a.priority);

    return candidates[0]?.phase || null;
  }

  /**
   * One-liner summary.
   */
  oneLiner(plan: AllocationPlan): string {
    const used = Math.round(plan.totalAllocated / 1000);
    const total = Math.round(plan.totalBudget / 1000);
    const phaseSummary = plan.allocations.map(a => `${a.phase}:${a.percent}%`).join(" ");
    return `${used}K/${total}K allocated | ${phaseSummary} | ${plan.droppedPhases.length} dropped`;
  }
}

export const tokenBudgetAllocatorEngine = new TokenBudgetAllocatorEngine();
