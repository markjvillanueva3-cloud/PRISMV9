/**
 * WEDM GNN Hooks — MS-P5-GNN / U-P5-GNN-02
 *
 * Single hook so far:
 *
 *   wedm-gnn-rebuild-stale — post-tool warning that fires when the trained
 *   WEDM_GNN_WEIGHTS.json is older than `staleAgeDays` (default 7) AND the
 *   total job count in WEDM_JOB_HISTORY.json has grown by ≥ `minNewJobs`
 *   (default 50) since the last training run. The warning carries a
 *   /wedm-reason action hint (built later in U-P5-GNN-05) so the agent can
 *   trigger a re-train.
 *
 * Implementation delegates entirely to `wedmGraphAttentionEngine.isStale()`
 * — this hook is just the pub/sub surface.
 *
 * @see WEDMGraphAttentionEngine — MS-P5-GNN / U-P5-GNN-02
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { wedmGraphAttentionEngine } from "../engines/WEDMGraphAttentionEngine.js";

const TRIGGER_ACTION_PREFIXES = [
  "wedm_graph",       // any graph query / reason action
  "wedm_lattice",     // lattice rebuild / stats
  "wedm_predict",     // any predictor that consults graph prior
  "wedm_ra_predict",
  "wedm_wire_break_predict",
  "wedm_recast_predict",
] as const;

function isGnnRelatedAction(action: string): boolean {
  return TRIGGER_ACTION_PREFIXES.some((p) => action.startsWith(p));
}

const wedmGnnRebuildStale: HookDefinition = {
  id: "wedm-gnn-rebuild-stale",
  name: "WEDM GNN Rebuild-Stale Alert",
  description:
    "Post-tool warning that fires when WEDM_GNN_WEIGHTS.json is older than 7 days AND ≥50 new jobs are in WEDM_JOB_HISTORY.json since last train. Hint to re-run wedmGraphAttentionEngine.train().",
  phase: "post-tool",
  category: "validation",
  mode: "warning",
  priority: "low",
  enabled: true,
  tags: ["wedm", "gnn", "p5-ms-gnn", "model-quality"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? ctx.operation ?? "";

    if (!isGnnRelatedAction(action)) {
      return hookSuccess(wedmGnnRebuildStale, "Not a GNN-related action", {
        data: { skipped: true },
      });
    }

    const verdict = wedmGraphAttentionEngine.isStale();

    if (!verdict.stale) {
      return hookSuccess(wedmGnnRebuildStale, "GNN weights fresh", {
        data: {
          ageDays: Number(verdict.ageDays.toFixed(2)),
          newJobs: verdict.newJobs,
        },
      });
    }

    const msg =
      `WEDM GNN weights stale (${verdict.reason}). ` +
      `age=${verdict.ageDays.toFixed(1)}d, newJobs=${verdict.newJobs}. ` +
      `Run wedmGraphAttentionEngine.train(graph) and save() to refresh.`;
    return hookWarning(wedmGnnRebuildStale, msg, {
      warnings: [msg],
      data: {
        ageDays: Number(verdict.ageDays.toFixed(2)),
        newJobs: verdict.newJobs,
        reason: verdict.reason,
      },
    });
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const wedmGnnHooks: HookDefinition[] = [wedmGnnRebuildStale];
export { wedmGnnRebuildStale };
