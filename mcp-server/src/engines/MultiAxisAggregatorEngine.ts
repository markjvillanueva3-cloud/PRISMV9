/**
 * MultiAxisAggregatorEngine — L2 aggregator for MultiAxis* engines
 *
 * Thin router over the MultiAxis engine family. Unlike FiveAxis (which is
 * 5-axis-specific), MultiAxis covers general 4+/5-axis orchestration that
 * isn't kinematic-dedicated.
 *
 * Member engines (3):
 *   MultiAxisKinematicEngine          — rotary kinematics
 *   MultiAxisPrintToProgramEngine     — print → multi-axis program
 *   MultiaxisToolpathEngine           — toolpath generation
 *
 * @module engines/MultiAxisAggregatorEngine
 * @milestone MILL-MASTER-P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

export type MultiAxisMember = "kinematic" | "print_to_program" | "toolpath";

const MEMBER_FILES: Readonly<Record<MultiAxisMember, string>> = Object.freeze({
  kinematic: "MultiAxisKinematicEngine",
  print_to_program: "MultiAxisPrintToProgramEngine",
  toolpath: "MultiaxisToolpathEngine",
});

const MEMBER_EXPORTS: Readonly<Record<MultiAxisMember, string>> = Object.freeze({
  kinematic: "multiAxisKinematicEngine",
  print_to_program: "multiAxisPrintToProgramEngine",
  toolpath: "multiaxisToolpathEngine",
});

export interface MultiAxisInvocationResult {
  member: MultiAxisMember;
  method: string;
  ok: boolean;
  result?: unknown;
  reason?: string;
}

export class MultiAxisAggregatorEngine {
  private invocationCount = 0;

  list(): MultiAxisMember[] {
    return Object.keys(MEMBER_FILES) as MultiAxisMember[];
  }

  count(): number {
    return this.list().length;
  }

  async invoke(
    member: MultiAxisMember,
    method: string,
    ...args: unknown[]
  ): Promise<MultiAxisInvocationResult> {
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
      log.warn(`[MultiAxisAggregator] invoke(${member}.${method}) failed: ${err.message}`);
      return { member, method, ok: false, reason: err.message };
    }
  }

  getSelfAwareness(): {
    engine_name: string;
    member_count: number;
    members: MultiAxisMember[];
    invocation_count: number;
  } {
    return {
      engine_name: "MultiAxisAggregatorEngine",
      member_count: this.count(),
      members: this.list(),
      invocation_count: this.invocationCount,
    };
  }

  getInvocationCount(): number {
    return this.invocationCount;
  }
}

export const multiAxisAggregatorEngine = new MultiAxisAggregatorEngine();
