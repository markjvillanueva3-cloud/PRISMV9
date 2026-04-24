// Wired: prism_dev.replan_evaluate (devDispatcher.ts)
/**
 * ReplanTriggerEngine — U-FORE-18 (Multi-Agent Coordination Spine)
 *
 * Decides when an existing plan needs to be torn down and rebuilt.
 * Watches for: precondition invalidation, exogenous state change,
 * deadline slip, and resource loss. Returns structured verdicts so
 * the planner can decide between full replan / patch / continue.
 */

export type ReplanReason =
  | "precondition_invalidated"
  | "deadline_missed"
  | "resource_lost"
  | "assumption_violated"
  | "external_event"
  | "time_budget_exceeded";

export interface PlanSnapshot {
  planId: string;
  createdAt: number;
  preconditions: Record<string, unknown>;
  deadlines?: Record<string, number>;
  resources?: string[];
  assumptions?: Record<string, unknown>;
}

export interface ReplanInput {
  plan: PlanSnapshot;
  currentState: Record<string, unknown>;
  currentTime?: number;
  lostResources?: string[];
  externalEvents?: string[];
  timeBudgetRemainingMs?: number;
  minTimeBudgetMs?: number;
}

export interface ReplanVerdict {
  shouldReplan: boolean;
  severity: "none" | "patch" | "full";
  reasons: Array<{ kind: ReplanReason; detail: string }>;
  continueHint?: string;
}

const MIN_TIME_BUDGET_DEFAULT = 10_000;

export class ReplanTriggerEngine {
  readonly name = "ReplanTriggerEngine";

  evaluate(input: ReplanInput): ReplanVerdict {
    this.validate(input);
    const reasons: Array<{ kind: ReplanReason; detail: string }> = [];
    const now = input.currentTime ?? Date.now();

    for (const [key, expected] of Object.entries(input.plan.preconditions)) {
      const actual = input.currentState[key];
      if (!this.deepEqual(actual, expected)) {
        reasons.push({ kind: "precondition_invalidated", detail: `${key}` });
      }
    }

    if (input.plan.deadlines) {
      for (const [task, deadline] of Object.entries(input.plan.deadlines)) {
        if (now > deadline) {
          reasons.push({ kind: "deadline_missed", detail: task });
        }
      }
    }

    if (input.lostResources && input.plan.resources) {
      const lost = input.lostResources.filter((r) => input.plan.resources!.includes(r));
      for (const r of lost) reasons.push({ kind: "resource_lost", detail: r });
    }

    if (input.plan.assumptions) {
      for (const [key, expected] of Object.entries(input.plan.assumptions)) {
        const actual = input.currentState[key];
        if (!this.deepEqual(actual, expected)) {
          reasons.push({ kind: "assumption_violated", detail: key });
        }
      }
    }

    for (const evt of input.externalEvents ?? []) {
      reasons.push({ kind: "external_event", detail: evt });
    }

    const budget = input.timeBudgetRemainingMs;
    const minBudget = input.minTimeBudgetMs ?? MIN_TIME_BUDGET_DEFAULT;
    if (typeof budget === "number" && budget < minBudget) {
      reasons.push({ kind: "time_budget_exceeded", detail: `remaining=${budget}ms` });
    }

    const severity = this.severityFor(reasons);
    return {
      shouldReplan: severity !== "none",
      severity,
      reasons,
      continueHint: severity === "none" ? "plan still valid — continue" : undefined,
    };
  }

  private severityFor(reasons: Array<{ kind: ReplanReason; detail: string }>): ReplanVerdict["severity"] {
    if (reasons.length === 0) return "none";
    const hasFull = reasons.some(
      (r) => r.kind === "precondition_invalidated" ||
        r.kind === "resource_lost" ||
        r.kind === "deadline_missed",
    );
    return hasFull ? "full" : "patch";
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  private validate(input: ReplanInput): void {
    if (!input) throw new Error("ReplanTriggerEngine.evaluate: input required");
    if (!input.plan || typeof input.plan.planId !== "string" || input.plan.planId.length === 0) {
      throw new Error("ReplanTriggerEngine.evaluate: plan.planId required");
    }
    if (!input.plan.preconditions || typeof input.plan.preconditions !== "object") {
      throw new Error("ReplanTriggerEngine.evaluate: plan.preconditions required");
    }
    if (!input.currentState || typeof input.currentState !== "object") {
      throw new Error("ReplanTriggerEngine.evaluate: currentState required");
    }
  }
}

export const replanTriggerEngine = new ReplanTriggerEngine();
