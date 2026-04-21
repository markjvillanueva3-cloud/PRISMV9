/**
 * MillTurnOrchestrationEngine — L2 aggregator for mill-turn + Swiss pipeline
 *
 * Single-entry router for mill-turn and Swiss-type turning programs.
 * Routes through the existing MillTurnCAMEngine for standard mill-turn
 * and MillTurnSwissPipelineEngine for sliding-headstock / guide-bushing.
 *
 * Member engines (2):
 *   MillTurnCAMEngine           — live tooling + sub-spindle
 *   MillTurnSwissPipelineEngine — Swiss-type sliding headstock
 *
 * @module engines/MillTurnOrchestrationEngine
 * @milestone MILL-MASTER-P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

export type MillTurnMember = "mill_turn" | "swiss";
export type MillTurnMachineClass = "mill-turn" | "swiss";

const MEMBER_FILES: Readonly<Record<MillTurnMember, string>> = Object.freeze({
  mill_turn: "MillTurnCAMEngine",
  swiss: "MillTurnSwissPipelineEngine",
});

const MEMBER_EXPORTS: Readonly<Record<MillTurnMember, string>> = Object.freeze({
  mill_turn: "millTurnCAMEngine",
  swiss: "millTurnSwissPipelineEngine",
});

export interface MillTurnRoutingContext {
  machine_class?: MillTurnMachineClass;
  has_guide_bushing?: boolean;
  has_sub_spindle?: boolean;
  multi_channel?: boolean;
}

export interface MillTurnRoutingResult {
  selected_member: MillTurnMember;
  rationale: string;
}

export interface MillTurnInvocationResult {
  member: MillTurnMember;
  method: string;
  ok: boolean;
  result?: unknown;
  reason?: string;
}

export class MillTurnOrchestrationEngine {
  private invocationCount = 0;

  /** List all 2 member engines. */
  list(): MillTurnMember[] {
    return Object.keys(MEMBER_FILES) as MillTurnMember[];
  }

  count(): number {
    return this.list().length;
  }

  /**
   * Pick the right member engine given machine context.
   * Swiss-type machines (sliding headstock + guide bushing) → swiss pipeline.
   * Everything else (mill-turn / sub-spindle / multi-channel) → MillTurnCAM.
   */
  route(ctx: MillTurnRoutingContext): MillTurnRoutingResult {
    if (ctx.machine_class === "swiss" || ctx.has_guide_bushing) {
      return {
        selected_member: "swiss",
        rationale: "Swiss-type detected (sliding headstock / guide bushing) — routes to MillTurnSwissPipelineEngine",
      };
    }
    return {
      selected_member: "mill_turn",
      rationale: "Mill-turn / sub-spindle / multi-channel — routes to MillTurnCAMEngine",
    };
  }

  /**
   * Generic member-method invocation. Never throws.
   */
  async invoke(
    member: MillTurnMember,
    method: string,
    ...args: unknown[]
  ): Promise<MillTurnInvocationResult> {
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
      log.warn(`[MillTurnOrchestration] invoke(${member}.${method}) failed: ${err.message}`);
      return { member, method, ok: false, reason: err.message };
    }
  }

  getSelfAwareness(): {
    engine_name: string;
    member_count: number;
    members: MillTurnMember[];
    invocation_count: number;
  } {
    return {
      engine_name: "MillTurnOrchestrationEngine",
      member_count: this.count(),
      members: this.list(),
      invocation_count: this.invocationCount,
    };
  }

  getInvocationCount(): number {
    return this.invocationCount;
  }
}

export const millTurnOrchestrationEngine = new MillTurnOrchestrationEngine();
