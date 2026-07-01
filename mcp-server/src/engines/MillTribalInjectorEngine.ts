/**
 * MillTribalInjectorEngine — push-time tribal-tip injection into mill pipeline consumers
 *
 * Parity for LatheTribalInjectorEngine (LATHE-AWARE-HARDEN MS8/U-LAT56). Where the
 * Lathe injector targets {speed_feed, program_assembler, post_processor, quote_estimator},
 * the Mill injector targets:
 *
 *   - speed_feed         → MillSpeedFeedOrchestratorEngine / SpeedFeedOrchestratorEngine
 *   - program_optimizer  → MillProgramOptimizerEngine / MillProgramGeneratorEngine
 *   - post_processor     → PostProcessorPipelineEngine (mill dialects)
 *   - dfm_check          → MillDFMEngine (DfM is mill-domain; lathe has quoting in the same slot)
 *
 * Design constraints (per MILL-PARITY-UPGRADE-MS0 + foxtrot soul):
 *   - Tips are *supplementary* — never override physics or safety
 *   - Push-time ("annotate this calculation"), not query-time (that's MillTribalKnowledgeEngine's job).
 *     The two engines are complementary: knowledge pulls, injector pushes.
 *   - Audit trail records which tips influenced which decisions, so the operator can trace a
 *     recommendation back to its tribal source.
 *   - Source attribution + confidence floor preserved per slot-foxtrot soul (no averaging).
 *
 * Scoring weights are mill-domain-tuned. Materially:
 *   - feature_hint matching is heavier (mill features = pocket/slot/contour/profile → strategy)
 *   - tool_geometry context added (mill cares about flute count, helix angle, coating differently
 *     than turning's nose radius / insert grade)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-TRIBAL-INJECTOR (iter57)
 * @version 1.0.0
 * @module MillTribalInjectorEngine
 */

import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type MillInjectionTarget =
  | "speed_feed"
  | "program_optimizer"
  | "post_processor"
  | "dfm_check";

export interface MillTribalTip {
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

export interface MillInjectionContext {
  material?: string;
  iso_group?: string;
  operation?: string;       // drilling | tapping | milling_rough | milling_finish | boring
  machine?: string;
  controller?: string;
  customer?: string;
  features?: string[];       // pocket, slot, contour, bolt_circle, thin_wall, chamfer, etc.
  tool_geometry?: string;    // square_end_mill, ball_nose, bull_nose, chamfer, drill, etc.
  complexity?: "simple" | "moderate" | "complex" | "very_complex";
  keywords?: string[];
}

export interface MillInjectedTip {
  tip: MillTribalTip;
  relevance_score: number; // 0..1
  matched_on: string[];
  recommendation_hint?: string;
}

export interface MillInjectionResult {
  target: MillInjectionTarget;
  injected: MillInjectedTip[];
  context: MillInjectionContext;
  total_tips_considered: number;
  total_tips_injected: number;
  audit_id: string;
  timestamp: string;
}

export interface MillInjectionAuditEntry {
  audit_id: string;
  target: MillInjectionTarget;
  context: MillInjectionContext;
  tip_ids: string[];
  timestamp: string;
}

export interface MillSharedKnowledgeHook {
  target: MillInjectionTarget;
  onInjection(result: MillInjectionResult): void;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class MillTribalInjectorEngineImpl {
  private auditLog: MillInjectionAuditEntry[] = [];
  private maxAuditSize = 500;
  private hooks = new Map<MillInjectionTarget, MillSharedKnowledgeHook[]>();

  /** Register a handler that runs every time tips are injected into a target. */
  registerHook(hook: MillSharedKnowledgeHook): void {
    const existing = this.hooks.get(hook.target) ?? [];
    existing.push(hook);
    this.hooks.set(hook.target, existing);
  }

  /**
   * Score tips against a context and inject the best matches into a target.
   * Returns a MillInjectionResult with audit trail.
   */
  inject(
    target: MillInjectionTarget,
    tips: MillTribalTip[],
    context: MillInjectionContext,
    options: { limit?: number; minRelevance?: number } = {}
  ): MillInjectionResult {
    const limit = options.limit ?? 5;
    const minRelevance = options.minRelevance ?? 0.15;

    const scored: MillInjectedTip[] = [];
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

    const auditId = `mill_inj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result: MillInjectionResult = {
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
          log.warn(`[MillTribalInjector] Hook error for ${target}: ${err}`);
        }
      }
    }

    return result;
  }

  /** Inject tips for all 4 downstream mill targets in one call. */
  injectAll(
    tips: MillTribalTip[],
    context: MillInjectionContext,
    options: { limitPerTarget?: number; minRelevance?: number } = {}
  ): Record<MillInjectionTarget, MillInjectionResult> {
    const targets: MillInjectionTarget[] = [
      "speed_feed",
      "program_optimizer",
      "post_processor",
      "dfm_check",
    ];
    const results: Partial<Record<MillInjectionTarget, MillInjectionResult>> = {};
    for (const target of targets) {
      results[target] = this.inject(target, tips, context, {
        limit: options.limitPerTarget,
        minRelevance: options.minRelevance,
      });
    }
    return results as Record<MillInjectionTarget, MillInjectionResult>;
  }

  /** Return the audit log (optionally filtered by target). */
  getAuditLog(target?: MillInjectionTarget, limit = 100): MillInjectionAuditEntry[] {
    const entries = target
      ? this.auditLog.filter((e) => e.target === target)
      : [...this.auditLog];
    return entries.slice(-limit);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  /** Lightweight stats for dispatcher status. */
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

  // ── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Mill-domain-tuned scoring. Weights are calibrated against mill-pipeline failure
   * modes (per JM-DIE mill operator review 2026-05): feature_hint matches drive
   * strategy selection ≥ material match for HSM/adaptive/trochoidal decisions, so
   * features carry more weight per match here (0.15 each, capped via final clamp)
   * than Lathe's 0.10.
   */
  private scoreTip(
    tip: MillTribalTip,
    ctx: MillInjectionContext
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
    // Mill-specific: tool_geometry weighted more (square vs ball-nose drives surface-finish strategy)
    if (ctx.tool_geometry && tipText.includes(ctx.tool_geometry.toLowerCase())) {
      score += 0.15;
      matched.push("tool_geometry");
    }
    if (ctx.features) {
      for (const f of ctx.features) {
        if (tipText.includes(f.toLowerCase())) {
          score += 0.15; // Mill features weighted heavier than Lathe's 0.10
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

    // Priority multiplier (priority 1-10, neutral at 5)
    const priority = tip.priority ?? 5;
    score *= 1 + (priority - 5) * 0.05;

    // Confidence floor (preserves slot-foxtrot soul rule: low-confidence tips down-weighted but not silenced)
    if (tip.confidence !== undefined) {
      score *= Math.max(0.3, tip.confidence);
    }

    return { score: Math.max(0, Math.min(1, score)), matched_on: matched };
  }

  /**
   * Build a mill-specific hint string per target. Each hint preserves the source tip
   * content (first 140 chars) so operators can trace the recommendation back to its tribal source.
   */
  private buildHint(tip: MillTribalTip, target: MillInjectionTarget): string {
    switch (target) {
      case "speed_feed":
        return `SpeedFeed consider: ${tip.content.slice(0, 140)}`;
      case "program_optimizer":
        return `Program hint: ${tip.content.slice(0, 140)}`;
      case "post_processor":
        return `Post comment (mill): ${tip.content.slice(0, 140)}`;
      case "dfm_check":
        return `DfM consideration: ${tip.content.slice(0, 140)}`;
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const millTribalInjectorEngine = new MillTribalInjectorEngineImpl();
export type { MillTribalInjectorEngineImpl };
