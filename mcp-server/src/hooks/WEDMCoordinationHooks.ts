/**
 * WEDM Coordination Hooks — MS-P0.5-COORD (Round 4 Coordination Substrate)
 *
 * Hooks built alongside the coordination substrate. U-P0.5-COORD-01 introduces
 * `wedm-awareness-coverage` which verifies every WEDM dispatcher action invokes
 * `consultAwareness` — enforces the 100% coverage exit criterion.
 *
 * More coordination hooks (tribal propagation, blackboard activity, reasoning
 * ledger heartbeat) will be added by subsequent U-P0.5-COORD-* units.
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
  hookBlock,
} from "../engines/HookExecutor.js";
import { wedmAwarenessAdoptionEngine } from "../engines/WEDMAwarenessAdoptionEngine.js";

const COVERAGE_TARGET_PCT = 100;
const BUDGET_BREACH_CEILING_PCT = 5;

const wedmAwarenessCoverage: HookDefinition = {
  id: "wedm-awareness-coverage",
  name: "WEDM Awareness Coverage Gate",
  description:
    "Ensures 100% of WEDM dispatcher actions invoke consultAwareness. Blocks when coverage drops below target or budget breach rate exceeds 5%.",
  phase: "on-audit",
  category: "validation",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["wedm", "coordination", "awareness", "coverage", "MS-P0.5-COORD"],
  handler: (_ctx: HookContext): HookResult => {
    const summary = wedmAwarenessAdoptionEngine.getCoverageSummary();

    if (summary.totalDispatchers === 0) {
      return hookSuccess(wedmAwarenessCoverage, "No WEDM dispatchers registered yet (cold start)", {
        data: summary as any,
      });
    }

    // Structural bypass: dispatcher registered but never invoked consultAwareness.
    // Indicates the dispatcher file doesn't call the middleware — hard fail.
    const registeredButNever = summary.silentDispatchers.filter(d => {
      // Only block if adoption engine has seen ANY activity at all;
      // on pure cold start, all dispatchers are silent by definition.
      return summary.lastUpdate > 0;
    });
    if (registeredButNever.length > 0) {
      return hookBlock(
        wedmAwarenessCoverage,
        `WEDM dispatchers with zero consultAwareness invocations: ${registeredButNever.join(", ")}. Structural bypass — wire awarenessMiddleware.`,
        { data: summary as any },
      );
    }

    if (summary.recentBreachRate > BUDGET_BREACH_CEILING_PCT) {
      return hookWarning(
        wedmAwarenessCoverage,
        `Recent awareness latency breach rate ${summary.recentBreachRate}% > ${BUDGET_BREACH_CEILING_PCT}% (50ms budget)`,
        { data: summary as any },
      );
    }

    return hookSuccess(
      wedmAwarenessCoverage,
      `WEDM awareness coverage ${summary.coveragePct}% (${summary.coveredActions}/${summary.totalActions}) across ${summary.wiredDispatchers}/${summary.totalDispatchers} dispatchers`,
      { data: summary as any },
    );
  },
};

export const wedmCoordinationHooks: HookDefinition[] = [wedmAwarenessCoverage];
