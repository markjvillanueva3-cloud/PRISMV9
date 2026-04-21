/**
 * FiveAxisAggregatorEngine — L2 aggregator for 9 FiveAxis* engines
 *
 * Provides a single-entry router over the FiveAxis engine family so the
 * mill facade can reach any 5-axis capability via one method call.
 * Thin wrapper — no domain logic, just typed delegation.
 *
 * Member engines (9):
 *   FiveAxisOrchestrationEngine       · FiveAxisAIUltraIntelligenceEngine
 *   FiveAxisDeepLearningEngine        · FiveAxisCAMIntegrationEngine
 *   FiveAxisToolpathIntegrationEngine · FiveAxisToolpathSynthesisEngine
 *   FiveAxisPostEngine                · FiveAxisDecisionEngine
 *   FiveAxisCADTemplateEngine
 *
 * @module engines/FiveAxisAggregatorEngine
 * @milestone MILL-MASTER-P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

export type FiveAxisMember =
  | "orchestration"
  | "ai_ultra"
  | "deep_learning"
  | "cam_integration"
  | "toolpath_integration"
  | "toolpath_synthesis"
  | "post"
  | "decision"
  | "cad_template";

const MEMBER_FILES: Readonly<Record<FiveAxisMember, string>> = Object.freeze({
  orchestration: "FiveAxisOrchestrationEngine",
  ai_ultra: "FiveAxisAIUltraIntelligenceEngine",
  deep_learning: "FiveAxisDeepLearningEngine",
  cam_integration: "FiveAxisCAMIntegrationEngine",
  toolpath_integration: "FiveAxisToolpathIntegrationEngine",
  toolpath_synthesis: "FiveAxisToolpathSynthesisEngine",
  post: "FiveAxisPostEngine",
  decision: "FiveAxisDecisionEngine",
  cad_template: "FiveAxisCADTemplateEngine",
});

const MEMBER_EXPORTS: Readonly<Record<FiveAxisMember, string>> = Object.freeze({
  orchestration: "fiveAxisOrchestrationEngine",
  ai_ultra: "fiveAxisAIUltraIntelligenceEngine",
  deep_learning: "fiveAxisDeepLearningEngine",
  cam_integration: "fiveAxisCAMIntegrationEngine",
  toolpath_integration: "fiveAxisToolpathIntegrationEngine",
  toolpath_synthesis: "fiveAxisToolpathSynthesisEngine",
  post: "fiveAxisPostEngine",
  decision: "fiveAxisDecisionEngine",
  cad_template: "fiveAxisCADTemplateEngine",
});

export interface AggregatorInvocationResult {
  member: FiveAxisMember;
  method: string;
  ok: boolean;
  result?: unknown;
  reason?: string;
}

export class FiveAxisAggregatorEngine {
  private invocationCount = 0;

  /** List all 9 member engine names. */
  list(): FiveAxisMember[] {
    return Object.keys(MEMBER_FILES) as FiveAxisMember[];
  }

  /** Member count. */
  count(): number {
    return this.list().length;
  }

  /**
   * Generic member-method invocation with graceful fallback.
   * Never throws — returns structured error on missing member/method.
   */
  async invoke(
    member: FiveAxisMember,
    method: string,
    ...args: unknown[]
  ): Promise<AggregatorInvocationResult> {
    this.invocationCount++;
    const fileName = MEMBER_FILES[member];
    const exportName = MEMBER_EXPORTS[member];
    if (!fileName) {
      return { member, method, ok: false, reason: `Unknown member: ${member}` };
    }
    try {
      const mod: any = await import(`./${fileName}.js`);
      const engine = mod[exportName];
      if (!engine) {
        return { member, method, ok: false, reason: `Export '${exportName}' not found in ${fileName}` };
      }
      const fn = engine[method];
      if (typeof fn !== "function") {
        return { member, method, ok: false, reason: `Method '${method}' not on ${exportName}` };
      }
      const result = await fn.call(engine, ...args);
      return { member, method, ok: true, result };
    } catch (err: any) {
      log.warn(`[FiveAxisAggregator] invoke(${member}.${method}) failed: ${err.message}`);
      return { member, method, ok: false, reason: err.message };
    }
  }

  /** Aggregator self-description. */
  getSelfAwareness(): {
    engine_name: string;
    member_count: number;
    members: FiveAxisMember[];
    invocation_count: number;
  } {
    return {
      engine_name: "FiveAxisAggregatorEngine",
      member_count: this.count(),
      members: this.list(),
      invocation_count: this.invocationCount,
    };
  }

  getInvocationCount(): number {
    return this.invocationCount;
  }
}

export const fiveAxisAggregatorEngine = new FiveAxisAggregatorEngine();
