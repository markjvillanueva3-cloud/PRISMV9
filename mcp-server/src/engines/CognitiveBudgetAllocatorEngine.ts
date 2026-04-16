/**
 * CognitiveBudgetAllocatorEngine — Decide think-hard vs respond-fast per request
 *
 * Phase 0.18 U-AGI12 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Estimates the
 * cost of a request and allocates a reasoning budget: shallow (respond fast)
 * vs deep (simulate, cross-check, multi-step). Prevents over-spending on
 * trivial queries and under-spending on consequential ones.
 *
 * Input: descriptor of the requested work. Output: budget allocation plus
 * a rationale string the session can emit to justify its depth choice.
 *
 * No I/O. Deterministic scoring on feature weights.
 *
 * @module engines/CognitiveBudgetAllocatorEngine
 * @milestone PP-0.18-U-AGI12
 */

export type DepthTier = "shallow" | "medium" | "deep";

export interface WorkDescriptor {
  kind: "read" | "edit" | "create" | "refactor" | "review" | "analysis" | "chat";
  riskLevel?: "low" | "medium" | "high" | "critical";
  touchesCriticalFile?: boolean;
  expectedDependents?: number;
  userUrgent?: boolean;
  hasPreviousFailure?: boolean;
  tokenEstimate?: number;
}

export interface BudgetAllocation {
  depth: DepthTier;
  maxTokens: number;
  allowSimulation: boolean;
  allowMultiAgent: boolean;
  rationale: string[];
  score: number;
}

export interface AllocatorWeights {
  base: Record<WorkDescriptor["kind"], number>;
  riskBoost: Record<NonNullable<WorkDescriptor["riskLevel"]>, number>;
  criticalFileBoost: number;
  dependentPerUnit: number;
  dependentCap: number;
  userUrgentPenalty: number; // urgent pulls toward shallow
  previousFailureBoost: number;
}

export const DEFAULT_WEIGHTS: AllocatorWeights = Object.freeze({
  base: { read: 1, chat: 1, edit: 2, review: 2, analysis: 3, create: 3, refactor: 4 },
  riskBoost: { low: 0, medium: 1, high: 2, critical: 4 },
  criticalFileBoost: 3,
  dependentPerUnit: 0.1,
  dependentCap: 3,
  userUrgentPenalty: 1,
  previousFailureBoost: 1,
});

export class CognitiveBudgetAllocatorEngine {
  private readonly weights: AllocatorWeights;

  constructor(weights: AllocatorWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  allocate(desc: WorkDescriptor): BudgetAllocation {
    this.assertValid(desc);
    const rationale: string[] = [];
    const w = this.weights;

    let score = w.base[desc.kind];
    rationale.push(`base(${desc.kind}): +${w.base[desc.kind]}`);

    if (desc.riskLevel && desc.riskLevel !== "low") {
      const boost = w.riskBoost[desc.riskLevel];
      score += boost;
      rationale.push(`risk(${desc.riskLevel}): +${boost}`);
    }

    if (desc.touchesCriticalFile) {
      score += w.criticalFileBoost;
      rationale.push(`critical-file: +${w.criticalFileBoost}`);
    }

    if (desc.expectedDependents && desc.expectedDependents > 0) {
      const boost = Math.min(w.dependentCap, desc.expectedDependents * w.dependentPerUnit);
      score += boost;
      rationale.push(`${desc.expectedDependents} dependent(s): +${boost.toFixed(2)}`);
    }

    if (desc.hasPreviousFailure) {
      score += w.previousFailureBoost;
      rationale.push(`prior-failure: +${w.previousFailureBoost}`);
    }

    if (desc.userUrgent) {
      score -= w.userUrgentPenalty;
      rationale.push(`user-urgent: -${w.userUrgentPenalty}`);
    }

    const depth = this.classify(score);
    const alloc: BudgetAllocation = {
      depth,
      maxTokens: this.tokenBudget(depth, desc.tokenEstimate),
      allowSimulation: depth !== "shallow",
      allowMultiAgent: depth === "deep",
      rationale,
      score: Math.round(score * 100) / 100,
    };
    return alloc;
  }

  classify(score: number): DepthTier {
    if (score < 3) return "shallow";
    if (score < 6) return "medium";
    return "deep";
  }

  private tokenBudget(depth: DepthTier, baseEstimate?: number): number {
    const floor = depth === "shallow" ? 500 : depth === "medium" ? 2000 : 8000;
    if (!baseEstimate || !Number.isFinite(baseEstimate) || baseEstimate < 0) return floor;
    return Math.max(floor, Math.ceil(baseEstimate));
  }

  private assertValid(desc: WorkDescriptor): void {
    if (!desc.kind) throw new Error("WorkDescriptor.kind is required");
    if (!(desc.kind in this.weights.base)) throw new Error(`Unknown kind: ${desc.kind}`);
    if (desc.expectedDependents !== undefined && desc.expectedDependents < 0) {
      throw new Error("expectedDependents must be non-negative");
    }
  }
}

export const cognitiveBudgetAllocatorEngine = new CognitiveBudgetAllocatorEngine();
