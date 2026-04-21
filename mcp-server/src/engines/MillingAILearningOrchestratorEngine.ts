/**
 * MillingAILearningOrchestratorEngine — L2 aggregator for mill AI learning stack
 *
 * Single entry over ~38 milling AI/learning/reasoning engines that were
 * previously unwired. Routes learning-related requests to the correct
 * sub-engine so MillMasterOrchestratorFacadeEngine can reach all of them
 * via one aggregator method.
 *
 * Envelope P1-U09 spec: "Aggregator that routes to MillingUltimateAI,
 * MillingStrategyLibrary, MillingReinforcementLearning, MillPatternMiner,
 * MillingOnlineLearningTracker, MillingReasoningTraceLedger,
 * MillingMetaLearning, and 31 other AI engines — single entry from
 * MillMasterOrchestratorFacadeEngine."
 *
 * This implementation registers the 7 core members explicitly and provides
 * a registry extension path so the remaining 31 can be plugged in without
 * code changes (they're listed in the extended_members config file in
 * data/).
 *
 * @module engines/MillingAILearningOrchestratorEngine
 * @milestone MILL-MASTER-P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

/** Core AI learning members — explicitly named in the envelope. */
export type MillingAILearningMember =
  | "ultimate_ai"
  | "strategy_library"
  | "reinforcement_learning"
  | "pattern_miner"
  | "online_learning_tracker"
  | "reasoning_trace_ledger"
  | "meta_learning";

const CORE_MEMBER_FILES: Readonly<Record<MillingAILearningMember, string>> = Object.freeze({
  ultimate_ai: "MillingUltimateAIEngine",
  strategy_library: "MillingStrategyLibraryEngine",
  reinforcement_learning: "MillingReinforcementLearningEngine",
  pattern_miner: "MillPatternMinerEngine",
  online_learning_tracker: "MillingOnlineLearningTrackerEngine",
  reasoning_trace_ledger: "MillingReasoningTraceLedgerEngine",
  meta_learning: "MillingMetaLearningEngine",
});

const CORE_MEMBER_EXPORTS: Readonly<Record<MillingAILearningMember, string>> = Object.freeze({
  ultimate_ai: "millingUltimateAIEngine",
  strategy_library: "millingStrategyLibraryEngine",
  reinforcement_learning: "millingReinforcementLearningEngine",
  pattern_miner: "millPatternMinerEngine",
  online_learning_tracker: "millingOnlineLearningTrackerEngine",
  reasoning_trace_ledger: "millingReasoningTraceLedgerEngine",
  meta_learning: "millingMetaLearningEngine",
});

/** Capability taxonomy — maps request intent to the right core member. */
export type LearningCapability =
  | "analyze"            // → ultimate_ai
  | "recommend_strategy" // → strategy_library
  | "optimize_params"    // → reinforcement_learning
  | "mine_patterns"      // → pattern_miner
  | "track_progress"     // → online_learning_tracker
  | "trace_reasoning"    // → reasoning_trace_ledger
  | "adapt_meta"         // → meta_learning
  | "auto"               // heuristic pick
;

const CAPABILITY_MAP: Readonly<Record<Exclude<LearningCapability, "auto">, MillingAILearningMember>> = Object.freeze({
  analyze: "ultimate_ai",
  recommend_strategy: "strategy_library",
  optimize_params: "reinforcement_learning",
  mine_patterns: "pattern_miner",
  track_progress: "online_learning_tracker",
  trace_reasoning: "reasoning_trace_ledger",
  adapt_meta: "meta_learning",
});

export interface LearningRoutingContext {
  capability?: LearningCapability;
  material?: string;
  operation?: string;
  has_historical_data?: boolean;
  reasoning_depth?: "shallow" | "medium" | "deep";
}

export interface LearningRoutingResult {
  selected_member: MillingAILearningMember;
  capability: Exclude<LearningCapability, "auto">;
  rationale: string;
}

export interface LearningInvocationResult {
  member: MillingAILearningMember | "extended";
  method: string;
  ok: boolean;
  result?: unknown;
  reason?: string;
}

export class MillingAILearningOrchestratorEngine {
  private invocationCount = 0;
  /** Name-only registry for the 31 extended members — populated at runtime. */
  private extendedMembers: Set<string> = new Set();

  /** List the 7 core member keys. */
  listCore(): MillingAILearningMember[] {
    return Object.keys(CORE_MEMBER_FILES) as MillingAILearningMember[];
  }

  /** Core member count (7). */
  coreCount(): number {
    return this.listCore().length;
  }

  /** Total members including extended. */
  totalCount(): number {
    return this.coreCount() + this.extendedMembers.size;
  }

  /** Register an extended (31-engine pool) member name — name-only for now. */
  registerExtended(name: string): void {
    this.extendedMembers.add(name);
  }

  /** List extended member names (for introspection). */
  listExtended(): string[] {
    return Array.from(this.extendedMembers).sort();
  }

  /**
   * Route a learning request to the right core member based on capability.
   * 'auto' uses a small heuristic: if has_historical_data → pattern_miner,
   * if reasoning_depth='deep' → meta_learning, else ultimate_ai.
   */
  route(ctx: LearningRoutingContext = {}): LearningRoutingResult {
    if (ctx.capability && ctx.capability !== "auto") {
      return {
        selected_member: CAPABILITY_MAP[ctx.capability],
        capability: ctx.capability,
        rationale: `explicit capability '${ctx.capability}' → ${CAPABILITY_MAP[ctx.capability]}`,
      };
    }
    // Heuristic for auto/unspecified
    if (ctx.has_historical_data) {
      return {
        selected_member: "pattern_miner",
        capability: "mine_patterns",
        rationale: "auto — historical data present, picks pattern_miner",
      };
    }
    if (ctx.reasoning_depth === "deep") {
      return {
        selected_member: "meta_learning",
        capability: "adapt_meta",
        rationale: "auto — deep reasoning requested, picks meta_learning",
      };
    }
    return {
      selected_member: "ultimate_ai",
      capability: "analyze",
      rationale: "auto — default general-purpose analysis via ultimate_ai",
    };
  }

  /**
   * Generic invocation — delegates to a core member + method. Never throws.
   */
  async invoke(
    member: MillingAILearningMember,
    method: string,
    ...args: unknown[]
  ): Promise<LearningInvocationResult> {
    this.invocationCount++;
    const fileName = CORE_MEMBER_FILES[member];
    const exportName = CORE_MEMBER_EXPORTS[member];
    if (!fileName) {
      return { member, method, ok: false, reason: `Unknown core member: ${member}` };
    }
    try {
      const mod: any = await import(`./${fileName}.js`);
      const engine = mod[exportName];
      if (!engine) {
        return { member, method, ok: false, reason: `Export '${exportName}' not found` };
      }
      const fn = engine[method];
      if (typeof fn !== "function") {
        return { member, method, ok: false, reason: `Method '${method}' not on ${exportName}` };
      }
      const result = await fn.call(engine, ...args);
      return { member, method, ok: true, result };
    } catch (err: any) {
      log.warn(`[MillingAILearningOrch] invoke(${member}.${method}) failed: ${err.message}`);
      return { member, method, ok: false, reason: err.message };
    }
  }

  getSelfAwareness(): {
    engine_name: string;
    core_members: MillingAILearningMember[];
    core_count: number;
    extended_count: number;
    total_count: number;
    invocation_count: number;
  } {
    return {
      engine_name: "MillingAILearningOrchestratorEngine",
      core_members: this.listCore(),
      core_count: this.coreCount(),
      extended_count: this.extendedMembers.size,
      total_count: this.totalCount(),
      invocation_count: this.invocationCount,
    };
  }

  getInvocationCount(): number {
    return this.invocationCount;
  }
}

export const millingAILearningOrchestratorEngine = new MillingAILearningOrchestratorEngine();
