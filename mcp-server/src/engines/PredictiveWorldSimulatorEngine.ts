/**
 * PredictiveWorldSimulatorEngine — Pre-play outcomes before acting
 *
 * Phase 0.18 U-AGI9 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a
 * proposed change descriptor, predict whether tests will break, which
 * dependent files will likely fail, and a confidence on the rollout. It does
 * NOT run code or invoke vitest; it reasons over cached dependency signals
 * that callers pass in.
 *
 * The engine treats prediction as a small signal-aggregation problem: each
 * risk factor raises the estimated break probability. Outputs are intended
 * for a PreTool gate: "+Ψ, low risk" vs "warn, 3 likely breaks".
 *
 * @module engines/PredictiveWorldSimulatorEngine
 * @milestone PP-0.18-U-AGI9
 */

export interface ChangeDescriptor {
  path: string;
  kind: "edit" | "write" | "delete" | "rename";
  testFiles?: string[];
  dependents?: string[];
  criticalFile?: boolean;
  sizeDeltaLines?: number;
  touchesPublicApi?: boolean;
}

export interface SimulationResult {
  path: string;
  breakProbability: number; // 0..1
  likelyAffected: string[];
  warnings: string[];
  risk: "low" | "medium" | "high";
  recommendation: string;
}

export interface SimulatorWeights {
  criticalFile: number;
  publicApi: number;
  largeDelta: number; // lines threshold where large-delta penalty kicks in
  largeDeltaPenalty: number;
  dependentPerUnit: number;
  dependentCap: number;
  missingTestsPenalty: number;
  kindMultipliers: Record<ChangeDescriptor["kind"], number>;
}

export const DEFAULT_SIMULATOR_WEIGHTS: SimulatorWeights = Object.freeze({
  criticalFile: 0.3,
  publicApi: 0.2,
  largeDelta: 100,
  largeDeltaPenalty: 0.15,
  dependentPerUnit: 0.02,
  dependentCap: 0.3,
  missingTestsPenalty: 0.2,
  kindMultipliers: { edit: 1, write: 0.8, delete: 1.2, rename: 0.9 },
});

export class PredictiveWorldSimulatorEngine {
  private readonly weights: SimulatorWeights;

  constructor(weights: SimulatorWeights = DEFAULT_SIMULATOR_WEIGHTS) {
    this.weights = weights;
  }

  simulate(change: ChangeDescriptor): SimulationResult {
    this.validate(change);
    const w = this.weights;
    const warnings: string[] = [];

    let prob = 0.05; // baseline noise
    if (change.criticalFile) {
      prob += w.criticalFile;
      warnings.push("touches critical-classified file");
    }
    if (change.touchesPublicApi) {
      prob += w.publicApi;
      warnings.push("touches public API surface");
    }
    if (change.sizeDeltaLines !== undefined && change.sizeDeltaLines > w.largeDelta) {
      prob += w.largeDeltaPenalty;
      warnings.push(`large delta (${change.sizeDeltaLines} lines)`);
    }
    const deps = change.dependents?.length ?? 0;
    if (deps > 0) {
      const boost = Math.min(w.dependentCap, deps * w.dependentPerUnit);
      prob += boost;
      warnings.push(`${deps} known dependent(s)`);
    }
    const tests = change.testFiles?.length ?? 0;
    if (tests === 0 && change.kind !== "delete") {
      prob += w.missingTestsPenalty;
      warnings.push("no tests found for this path");
    }

    prob *= w.kindMultipliers[change.kind];
    prob = Math.min(1, Math.max(0, prob));

    const likelyAffected = this.rankAffected(change);
    const risk: SimulationResult["risk"] = prob >= 0.5 ? "high" : prob >= 0.2 ? "medium" : "low";
    const recommendation = this.recommendFor(risk, warnings);

    return {
      path: change.path,
      breakProbability: round4(prob),
      likelyAffected,
      warnings,
      risk,
      recommendation,
    };
  }

  private rankAffected(change: ChangeDescriptor): string[] {
    const deps = change.dependents ?? [];
    const tests = change.testFiles ?? [];
    return [...new Set([...tests, ...deps])].slice(0, 10);
  }

  private recommendFor(risk: SimulationResult["risk"], warnings: string[]): string {
    if (risk === "high") return `high break risk: ${warnings.join("; ")} → run simulation + review`;
    if (risk === "medium") return `medium risk: ${warnings.join("; ") || "baseline"} → run tests before landing`;
    return "low risk: proceed";
  }

  private validate(c: ChangeDescriptor): void {
    if (!c.path || c.path.trim() === "") throw new Error("path required");
    if (!c.kind || !(c.kind in this.weights.kindMultipliers)) throw new Error("kind invalid");
    if (c.sizeDeltaLines !== undefined && c.sizeDeltaLines < 0) throw new Error("sizeDeltaLines non-negative");
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const predictiveWorldSimulatorEngine = new PredictiveWorldSimulatorEngine();
