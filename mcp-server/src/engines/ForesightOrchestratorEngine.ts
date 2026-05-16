// Wired: prism_dev.foresight_report (devDispatcher.ts) + /foresight skill
/**
 * ForesightOrchestratorEngine — U-FORE-12 (PSAU-FORESIGHT dispatcher)
 * =====================================================================
 *
 * Single orchestrator that composes the PSAU-FORESIGHT engines behind
 * one call. Given a proposed change description it returns a foresight
 * report covering:
 *   - gap prediction (via patterns / prior failures)
 *   - risk forecast (laplace-smoothed gate failure rates)
 *   - knowledge-gap check (prior-art coverage)
 *   - context-budget recommendation
 *   - verdict {go | caution | no_go} with teaching block when no_go
 *
 * This engine is the surface called by the `/foresight` skill and by
 * the MCP `foresight_report` action.
 */

import { riskForecastEngine } from "./RiskForecastEngine.js";
import { knowledgeGapAwarenessEngine } from "./KnowledgeGapAwarenessEngine.js";
import { contextBudgetForecastEngine } from "./ContextBudgetForecastEngine.js";
import { teachingNoGoEngine } from "./TeachingNoGoEngine.js";
import { progressiveDisclosureEngine } from "./ProgressiveDisclosureEngine.js";

export interface ForesightInput {
  description: string;
  unitClass?: string;
  proposedFiles?: string[];
  contextTokensUsed?: number;
  contextTokensLimit?: number;
  modelName?: string;
}

export interface ForesightReport {
  verdict: "go" | "caution" | "no_go";
  severity: "ok" | "warn" | "block";
  summary: string;
  sections: {
    risk: unknown;
    knowledgeGap: unknown;
    contextBudget: unknown;
    teachingBlock?: unknown;
  };
  disclosed: unknown;
}

export class ForesightOrchestratorEngine {
  readonly name = "ForesightOrchestratorEngine";

  async reportFor(input: ForesightInput): Promise<ForesightReport> {
    this.validate(input);

    const risk = this.safeCall(() =>
      riskForecastEngine.forecast({
        unitId: input.description.slice(0, 40),
        unitClass: input.unitClass ?? "generic",
      }),
    );
    const knowledgeGap = this.safeCall(() =>
      knowledgeGapAwarenessEngine.scan({ intent: input.description }),
    );
    const contextBudget = this.safeCall(() =>
      contextBudgetForecastEngine.forecast({
        currentTokens: input.contextTokensUsed ?? 0,
        remainingSteps: [],
        modelTier: (input.modelName as "opus_4_7_1m" | "opus_4_6" | "sonnet_4_6" | "opus_4_5" | "haiku_4_5" | "unknown" | undefined) ?? "opus_4_7_1m",
      }),
    );

    const severity = this.computeSeverity(risk, knowledgeGap, contextBudget);
    const verdict: ForesightReport["verdict"] =
      severity === "block" ? "no_go" : severity === "warn" ? "caution" : "go";

    const sections: ForesightReport["sections"] = {
      risk,
      knowledgeGap,
      contextBudget,
    };

    if (verdict === "no_go") {
      try {
        sections.teachingBlock = teachingNoGoEngine.respond({
          verdict: "no_go",
          failingCheck: this.firstBlockingReason(risk, knowledgeGap, contextBudget),
          context: { risk, knowledgeGap, contextBudget },
        });
      } catch { /* best-effort */ }
    }

    // Build sections for ProgressiveDisclosure — every section needs `title` +
    // `tokens` (rough char/4 estimate) per ForesightSection contract.
    const verdictBody = `verdict=${verdict}`;
    const riskBody = JSON.stringify(risk ?? {});
    const gapBody = JSON.stringify(knowledgeGap ?? {});
    const budgetBody = JSON.stringify(contextBudget ?? {});
    const estTokens = (s: string): number => Math.ceil(s.length / 4);
    const disclosed = this.safeCall(() =>
      progressiveDisclosureEngine.disclose({
        sections: [
          { key: "verdict", title: "Verdict", tokens: estTokens(verdictBody), severity: severity === "block" ? 5 : severity === "warn" ? 3 : 1, body: verdictBody },
          { key: "risk", title: "Failure Risk", tokens: estTokens(riskBody), severity: 3, body: riskBody },
          { key: "knowledgeGap", title: "Knowledge Gap", tokens: estTokens(gapBody), severity: 2, body: gapBody },
          { key: "contextBudget", title: "Context Budget", tokens: estTokens(budgetBody), severity: 4, body: budgetBody },
        ],
      }),
    );

    const summary = this.buildSummary(verdict, risk, knowledgeGap, contextBudget);
    return { verdict, severity, summary, sections, disclosed };
  }

  private computeSeverity(risk: unknown, knowledgeGap: unknown, contextBudget: unknown): "ok" | "warn" | "block" {
    let score: "ok" | "warn" | "block" = "ok";
    const riskRec = risk as { topK?: Array<{ warn?: boolean }> } | undefined;
    const warnCount = Array.isArray(riskRec?.topK) ? riskRec!.topK!.filter((g) => g.warn === true).length : 0;
    if (warnCount >= 2) score = "warn";
    const gapRec = knowledgeGap as { topRelevance?: number } | undefined;
    if (gapRec && typeof gapRec.topRelevance === "number" && gapRec.topRelevance < 0.5) {
      // At this point in the flow, score is "ok" or "warn" only — block isn't
      // assignable until L116 below. Original ternary `score === "block" ?
      // "block" : "warn"` was unreachable (TS2367). Direct assign to "warn"
      // preserves intent (escalate on low relevance, don't downgrade).
      score = "warn";
    }
    const ctxRec = contextBudget as { recommendation?: string } | undefined;
    if (ctxRec?.recommendation === "handoff_now" || ctxRec?.recommendation === "compact_now") {
      score = "block";
    }
    return score;
  }

  private firstBlockingReason(risk: unknown, knowledgeGap: unknown, contextBudget: unknown): string {
    const ctx = contextBudget as { recommendation?: string } | undefined;
    if (ctx?.recommendation === "handoff_now") return "context_overflow";
    if (ctx?.recommendation === "compact_now") return "context_overflow";
    const gap = knowledgeGap as { topRelevance?: number } | undefined;
    if (gap && typeof gap.topRelevance === "number" && gap.topRelevance < 0.3) return "missing_tests";
    const r = risk as { topK?: Array<{ gate?: string; warn?: boolean }> } | undefined;
    if (r && Array.isArray(r.topK) && r.topK.length > 0) {
      const topGate = r.topK[0]?.gate;
      if (topGate === "sx_gate") return "sx_gate_violation";
      if (topGate === "canonical_constants") return "inline_physics_constant";
      if (topGate === "duplication_hard_block") return "duplicate_engine";
    }
    return "wiring_incomplete";
  }

  private buildSummary(
    verdict: ForesightReport["verdict"],
    risk: unknown,
    knowledgeGap: unknown,
    contextBudget: unknown,
  ): string {
    const parts: string[] = [`verdict=${verdict}`];
    const r = risk as { topK?: Array<{ warn?: boolean }> } | undefined;
    if (r && Array.isArray(r.topK)) {
      parts.push(`risk_warnings=${r.topK.filter((g) => g.warn === true).length}`);
    }
    const ctx = contextBudget as { recommendation?: string } | undefined;
    if (ctx?.recommendation) parts.push(`context=${ctx.recommendation}`);
    const gap = knowledgeGap as { topRelevance?: number } | undefined;
    if (gap && typeof gap.topRelevance === "number") {
      parts.push(`prior_art_rel=${gap.topRelevance.toFixed(2)}`);
    }
    return parts.join(" | ");
  }

  private safeCall<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch {
      return undefined;
    }
  }

  private validate(input: ForesightInput): void {
    if (!input) throw new Error("ForesightOrchestratorEngine.reportFor: input required");
    if (typeof input.description !== "string" || input.description.length === 0) {
      throw new Error("ForesightOrchestratorEngine.reportFor: description required");
    }
  }
}

export const foresightOrchestratorEngine = new ForesightOrchestratorEngine();
