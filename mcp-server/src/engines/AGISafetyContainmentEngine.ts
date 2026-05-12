/**
 * AGISafetyContainmentEngine — Validate autonomous goals before execution
 *
 * Phase 0.25.1 U-SAFE1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Gates every
 * goal from AutonomousGoalSynthesisEngine against a configurable list of
 * safety constraints. A goal proceeds only if every constraint returns
 * `ok=true`; otherwise the engine returns a block record with per-rule
 * reasons so the hook layer can surface a specific refusal message.
 *
 * Rules cover four tiers:
 *   - forbidden tags    (never execute regardless of other signals)
 *   - forbidden targets (never modify e.g. safety-critical files)
 *   - scope limits      (caps: max-assets-touched, max-psi-impact-at-once)
 *   - explicit approval (goals crossing risk thresholds need human OK)
 *
 * No I/O. Rules are registered by the caller; evaluation is deterministic.
 *
 * @module engines/AGISafetyContainmentEngine
 * @milestone PP-0.25.1-U-SAFE1
 */

export interface SafetyCandidate {
  id: string;
  title: string;
  tags?: string[];
  targets?: string[];
  estimatedAssetsTouched?: number;
  estimatedPsiImpact?: number;
  humanApproved?: boolean;
  riskLevel?: "low" | "medium" | "high" | "critical";
}

export interface SafetyRuleResult {
  rule: string;
  ok: boolean;
  reason?: string;
}

export interface SafetyContainmentConfig {
  forbiddenTags: string[];
  forbiddenTargets: string[];
  maxAssetsTouched: number;
  maxPsiImpactPerStep: number;
  requireApprovalAbove: "low" | "medium" | "high" | "critical";
}

export const DEFAULT_CONTAINMENT_CONFIG: SafetyContainmentConfig = Object.freeze({
  forbiddenTags: ["self-replicating", "disable-safety", "bypass-dedup"],
  forbiddenTargets: [
    "src/physics/constants.ts",
    "src/engines/SafetyEngine.ts",
    "src/engines/DuplicationGuardEngine.ts",
  ],
  maxAssetsTouched: 50,
  maxPsiImpactPerStep: 10,
  requireApprovalAbove: "medium",
});

const RISK_ORDER: Record<NonNullable<SafetyCandidate["riskLevel"]>, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export interface ContainmentDecision {
  candidateId: string;
  allowed: boolean;
  rules: SafetyRuleResult[];
  blockedBy: string[];
}

export class AGISafetyContainmentEngine {
  private config: SafetyContainmentConfig;

  constructor(config: SafetyContainmentConfig = DEFAULT_CONTAINMENT_CONFIG) {
    this.validateConfig(config);
    this.config = {
      ...config,
      forbiddenTags: config.forbiddenTags.map((t) => t.toLowerCase()),
      forbiddenTargets: [...config.forbiddenTargets],
    };
  }

  setConfig(config: SafetyContainmentConfig): void {
    this.validateConfig(config);
    this.config = {
      ...config,
      forbiddenTags: config.forbiddenTags.map((t) => t.toLowerCase()),
      forbiddenTargets: [...config.forbiddenTargets],
    };
  }

  evaluate(candidate: SafetyCandidate): ContainmentDecision {
    this.validateCandidate(candidate);
    const rules: SafetyRuleResult[] = [];

    rules.push(this.checkForbiddenTags(candidate));
    rules.push(this.checkForbiddenTargets(candidate));
    rules.push(this.checkAssetScope(candidate));
    rules.push(this.checkPsiImpact(candidate));
    rules.push(this.checkApproval(candidate));

    const blockedBy = rules.filter((r) => !r.ok).map((r) => r.rule);
    return {
      candidateId: candidate.id,
      allowed: blockedBy.length === 0,
      rules,
      blockedBy,
    };
  }

  evaluateBatch(candidates: readonly SafetyCandidate[]): ContainmentDecision[] {
    return candidates.map((c) => this.evaluate(c));
  }

  // --- rule implementations ----------------------------------------------

  private checkForbiddenTags(c: SafetyCandidate): SafetyRuleResult {
    const tags = (c.tags ?? []).map((t) => t.toLowerCase());
    for (const forbidden of this.config.forbiddenTags) {
      if (tags.includes(forbidden)) {
        return { rule: "forbidden-tags", ok: false, reason: `goal carries forbidden tag '${forbidden}'` };
      }
    }
    return { rule: "forbidden-tags", ok: true };
  }

  private checkForbiddenTargets(c: SafetyCandidate): SafetyRuleResult {
    const targets = c.targets ?? [];
    for (const target of targets) {
      for (const forbidden of this.config.forbiddenTargets) {
        if (target === forbidden || target.endsWith("/" + forbidden) || target.endsWith("\\" + forbidden)) {
          return { rule: "forbidden-targets", ok: false, reason: `target '${target}' is protected` };
        }
      }
    }
    return { rule: "forbidden-targets", ok: true };
  }

  private checkAssetScope(c: SafetyCandidate): SafetyRuleResult {
    const touched = c.estimatedAssetsTouched ?? 0;
    if (touched > this.config.maxAssetsTouched) {
      return {
        rule: "scope-limit",
        ok: false,
        reason: `estimated ${touched} assets > cap ${this.config.maxAssetsTouched}`,
      };
    }
    return { rule: "scope-limit", ok: true };
  }

  private checkPsiImpact(c: SafetyCandidate): SafetyRuleResult {
    const impact = Math.abs(c.estimatedPsiImpact ?? 0);
    if (impact > this.config.maxPsiImpactPerStep) {
      return {
        rule: "psi-impact",
        ok: false,
        reason: `|Δψ|=${impact} exceeds per-step cap ${this.config.maxPsiImpactPerStep}`,
      };
    }
    return { rule: "psi-impact", ok: true };
  }

  private checkApproval(c: SafetyCandidate): SafetyRuleResult {
    const risk = c.riskLevel ?? "low";
    if (RISK_ORDER[risk] > RISK_ORDER[this.config.requireApprovalAbove] && !c.humanApproved) {
      return {
        rule: "human-approval",
        ok: false,
        reason: `riskLevel=${risk} > ${this.config.requireApprovalAbove}; human approval required`,
      };
    }
    return { rule: "human-approval", ok: true };
  }

  private validateCandidate(c: SafetyCandidate): void {
    if (!c.id || c.id.trim() === "") throw new Error("candidate.id required");
    if (!c.title || c.title.trim() === "") throw new Error("candidate.title required");
    if (c.estimatedAssetsTouched !== undefined && c.estimatedAssetsTouched < 0) {
      throw new Error("estimatedAssetsTouched must be ≥ 0");
    }
    if (c.estimatedPsiImpact !== undefined && !Number.isFinite(c.estimatedPsiImpact)) {
      throw new Error("estimatedPsiImpact must be finite");
    }
  }

  private validateConfig(c: SafetyContainmentConfig): void {
    if (!Array.isArray(c.forbiddenTags)) throw new Error("forbiddenTags must be array");
    if (!Array.isArray(c.forbiddenTargets)) throw new Error("forbiddenTargets must be array");
    if (!(c.maxAssetsTouched >= 0)) throw new Error("maxAssetsTouched must be ≥ 0");
    if (!(c.maxPsiImpactPerStep >= 0)) throw new Error("maxPsiImpactPerStep must be ≥ 0");
    if (!["low", "medium", "high", "critical"].includes(c.requireApprovalAbove)) {
      throw new Error("requireApprovalAbove must be low/medium/high/critical");
    }
  }
}

export const agiSafetyContainmentEngine = new AGISafetyContainmentEngine();
