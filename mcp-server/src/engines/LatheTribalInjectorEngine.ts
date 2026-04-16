/**
 * LatheTribalInjectorEngine (E105)
 * ==================================
 *
 * Injects tribal tips (sourced externally from TribalKnowledgeEngine) into
 * 4 downstream lathe engines:
 *   - SpeedFeedOrchestratorEngine    (tune cutting parameters)
 *   - TurningProgramAssemblerEngine  (bias program structure)
 *   - PostProcessorPipelineEngine    (annotate post comments)
 *   - QuoteEstimatorEngine            (incorporate customer preferences)
 *
 * Design constraints (per LATHE-AWARE-HARDEN roadmap):
 *   - Tips are *supplementary* — never override physics or safety
 *   - Push-time ("annotate this calculation"), not query-time (that's
 *     TribalKnowledgeActivationEngine's job). The two engines are
 *     complementary: activation pulls, injection pushes.
 *   - Audit trail records which tips influenced which decisions, so the
 *     operator can trace a recommendation back to its tribal source
 *
 * @module engines/LatheTribalInjectorEngine
 * @milestone LATHE-AWARE-HARDEN MS8 (U-LAT56)
 */

import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type InjectionTarget =
  | "speed_feed"
  | "program_assembler"
  | "post_processor"
  | "quote_estimator";

export interface TribalTip {
  id: string;
  content: string;
  category?: string;
  source_customer?: string;
  source_program?: string;
  confidence?: number;
  tags?: string[];
  keywords?: string[];
  priority?: number;
}

export interface InjectionContext {
  material?: string;
  iso_group?: string;
  operation?: string;
  machine?: string;
  controller?: string;
  customer?: string;
  features?: string[];
  complexity?: "simple" | "moderate" | "complex" | "very_complex";
  keywords?: string[];
}

export interface InjectedTip {
  tip: TribalTip;
  relevance_score: number; // 0..1
  matched_on: string[];
  recommendation_hint?: string;
}

export interface InjectionResult {
  target: InjectionTarget;
  injected: InjectedTip[];
  context: InjectionContext;
  total_tips_considered: number;
  total_tips_injected: number;
  audit_id: string;
  timestamp: string;
}

export interface InjectionAuditEntry {
  audit_id: string;
  target: InjectionTarget;
  context: InjectionContext;
  tip_ids: string[];
  timestamp: string;
}

export interface SharedKnowledgeHook {
  target: InjectionTarget;
  onInjection(result: InjectionResult): void;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class LatheTribalInjectorEngineImpl {
  private auditLog: InjectionAuditEntry[] = [];
  private maxAuditSize = 500;
  private hooks = new Map<InjectionTarget, SharedKnowledgeHook[]>();

  /**
   * Register a handler that runs every time tips are injected into a target.
   */
  registerHook(hook: SharedKnowledgeHook): void {
    const existing = this.hooks.get(hook.target) ?? [];
    existing.push(hook);
    this.hooks.set(hook.target, existing);
  }

  /**
   * Score tips against a context and inject the best matches into a target.
   * Returns an InjectionResult with audit trail.
   */
  inject(
    target: InjectionTarget,
    tips: TribalTip[],
    context: InjectionContext,
    options: { limit?: number; minRelevance?: number } = {}
  ): InjectionResult {
    const limit = options.limit ?? 5;
    const minRelevance = options.minRelevance ?? 0.15;

    const scored: InjectedTip[] = [];
    for (const tip of tips) {
      const { score, matched_on } = this.scoreTip(tip, context);
      if (score >= minRelevance) {
        scored.push({
          tip,
          relevance_score: score,
          matched_on,
          recommendation_hint: this.buildHint(tip, target),
        });
      }
    }

    scored.sort((a, b) => b.relevance_score - a.relevance_score);
    const injected = scored.slice(0, limit);

    const auditId = `inj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result: InjectionResult = {
      target,
      injected,
      context,
      total_tips_considered: tips.length,
      total_tips_injected: injected.length,
      audit_id: auditId,
      timestamp: new Date().toISOString(),
    };

    // Audit
    this.auditLog.push({
      audit_id: auditId,
      target,
      context,
      tip_ids: injected.map((i) => i.tip.id),
      timestamp: result.timestamp,
    });
    if (this.auditLog.length > this.maxAuditSize) {
      this.auditLog.splice(0, this.auditLog.length - this.maxAuditSize);
    }

    // Fire hooks
    const hooks = this.hooks.get(target);
    if (hooks) {
      for (const h of hooks) {
        try {
          h.onInjection(result);
        } catch (err) {
          log.warn(`[LatheTribalInjector] Hook error for ${target}: ${err}`);
        }
      }
    }

    return result;
  }

  /**
   * Convenience: inject tips for all 4 downstream targets.
   */
  injectAll(
    tips: TribalTip[],
    context: InjectionContext,
    options: { limitPerTarget?: number; minRelevance?: number } = {}
  ): Record<InjectionTarget, InjectionResult> {
    const targets: InjectionTarget[] = [
      "speed_feed",
      "program_assembler",
      "post_processor",
      "quote_estimator",
    ];
    const results: Partial<Record<InjectionTarget, InjectionResult>> = {};
    for (const target of targets) {
      results[target] = this.inject(target, tips, context, {
        limit: options.limitPerTarget,
        minRelevance: options.minRelevance,
      });
    }
    return results as Record<InjectionTarget, InjectionResult>;
  }

  /**
   * Return the audit log (optionally filtered by target).
   */
  getAuditLog(target?: InjectionTarget, limit = 100): InjectionAuditEntry[] {
    const entries = target
      ? this.auditLog.filter((e) => e.target === target)
      : [...this.auditLog];
    return entries.slice(-limit);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Lightweight stats for dispatcher status.
   */
  getStats(): {
    targets_supported: number;
    audit_entries: number;
    registered_hooks: number;
  } {
    let hookCount = 0;
    for (const list of this.hooks.values()) hookCount += list.length;
    return {
      targets_supported: 4,
      audit_entries: this.auditLog.length,
      registered_hooks: hookCount,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private scoreTip(
    tip: TribalTip,
    ctx: InjectionContext
  ): { score: number; matched_on: string[] } {
    const matched: string[] = [];
    let score = 0;

    const tipText = (
      tip.content +
      " " +
      (tip.tags ?? []).join(" ") +
      " " +
      (tip.keywords ?? []).join(" ")
    ).toLowerCase();

    if (ctx.material && tipText.includes(ctx.material.toLowerCase())) {
      score += 0.3;
      matched.push("material");
    }
    if (
      ctx.iso_group &&
      tip.tags?.some((t) => t.toLowerCase() === ctx.iso_group!.toLowerCase())
    ) {
      score += 0.2;
      matched.push("iso_group");
    }
    if (ctx.operation && tipText.includes(ctx.operation.toLowerCase())) {
      score += 0.25;
      matched.push("operation");
    }
    if (ctx.machine && tipText.includes(ctx.machine.toLowerCase())) {
      score += 0.15;
      matched.push("machine");
    }
    if (ctx.controller && tipText.includes(ctx.controller.toLowerCase())) {
      score += 0.1;
      matched.push("controller");
    }
    if (ctx.customer && tip.source_customer?.toLowerCase() === ctx.customer.toLowerCase()) {
      score += 0.2;
      matched.push("customer");
    }
    if (ctx.features) {
      for (const f of ctx.features) {
        if (tipText.includes(f.toLowerCase())) {
          score += 0.1;
          matched.push(`feature:${f}`);
        }
      }
    }
    if (ctx.keywords) {
      for (const k of ctx.keywords) {
        if (tipText.includes(k.toLowerCase())) {
          score += 0.05;
          matched.push(`keyword:${k}`);
        }
      }
    }

    // Priority multiplier
    const priority = tip.priority ?? 5;
    score *= 1 + (priority - 5) * 0.05;

    // Confidence floor
    if (tip.confidence !== undefined) {
      score *= Math.max(0.3, tip.confidence);
    }

    return { score: Math.max(0, Math.min(1, score)), matched_on: matched };
  }

  private buildHint(tip: TribalTip, target: InjectionTarget): string {
    switch (target) {
      case "speed_feed":
        return `Consider: ${tip.content.slice(0, 140)}`;
      case "program_assembler":
        return `Program hint: ${tip.content.slice(0, 140)}`;
      case "post_processor":
        return `Post comment: ${tip.content.slice(0, 140)}`;
      case "quote_estimator":
        return `Quote note: ${tip.content.slice(0, 140)}`;
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheTribalInjectorEngine = new LatheTribalInjectorEngineImpl();
export type { LatheTribalInjectorEngineImpl };
