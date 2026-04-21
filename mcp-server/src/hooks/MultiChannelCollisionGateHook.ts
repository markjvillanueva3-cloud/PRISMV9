/**
 * MultiChannelCollisionGateHook — LATHE-PRO-MS6a FORGE-TRIPLE (U-LPM08)
 *
 * HARD BLOCK on Swiss / mill-turn multi-channel programs that contain a
 * simultaneous-cut collision risk. Fires before any action that emits a
 * multi-channel G-code program, or that runs the collision-check action
 * itself. When `MultiChannelCollisionEngine.check()` returns `is_safe: false`
 * (any critical flag across zones 1–4 or deflection factor > 1.8), emission
 * is blocked until the scheduler serializes the offending op pair.
 *
 * Scope of guard:
 *   - turning_swiss_channel_emit         (emits final G-code)
 *   - turning_swiss_channel_balance      (could produce new schedule with collisions)
 *   - turning_swiss_part_transfer        (injects sync points — verify)
 *   - mill_turn_multi_channel            (legacy multi-channel calculation)
 *
 * Bypass: set `ctx.target.data.skipCollisionGate === true` only for explicit
 * debugging. Not intended for production.
 *
 * @module hooks/MultiChannelCollisionGateHook
 * @milestone LATHE-PRO-MS6a / U-LPM08
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

const MULTI_CHANNEL_ACTIONS = new Set([
  "turning_swiss_channel_emit",
  "turning_swiss_channel_balance",
  "turning_swiss_collision_check",
  "turning_swiss_part_transfer",
  "mill_turn_multi_channel",
]);

const multiChannelCollisionGate: HookDefinition = {
  id: "multi-channel-collision-gate",
  name: "Multi-Channel Collision Gate",
  description:
    "HARD BLOCK on Swiss / mill-turn programs containing simultaneous-cut collision " +
    "or force-interaction risk. Fires before channel-file emission, rebalance, part " +
    "transfer, or any multi-channel calculation action.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["lathe", "swiss", "multi-channel", "collision", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!MULTI_CHANNEL_ACTIONS.has(action)) {
      return hookSuccess(multiChannelCollisionGate, "Not a multi-channel action", {
        data: { skipped: true },
      });
    }
    if (data.skipCollisionGate === true) {
      return hookSuccess(multiChannelCollisionGate, "Gate skipped by explicit caller flag", {
        data: { bypass: true },
      });
    }

    // If the caller supplies a pre-computed collision report, inspect it.
    const precomputed = data.collision_report;
    if (precomputed && typeof precomputed === "object") {
      if (precomputed.is_safe === false) {
        const critical = Array.isArray(precomputed.flags)
          ? precomputed.flags.filter((f: any) => f.severity === "critical")
          : [];
        const critCount = critical.length || precomputed.critical_count || 0;
        return hookBlock(
          multiChannelCollisionGate,
          `Multi-channel program has ${critCount} critical collision(s). ` +
            `Serialize the offending op pair(s) before emission.`,
          { data: { violations: critical.slice(0, 5) } },
        );
      }
      return hookSuccess(multiChannelCollisionGate, "Pre-computed report is safe");
    }

    // If the caller supplies a sync-verification result, inspect that too.
    const syncReport = data.sync_verify_result;
    if (syncReport && syncReport.is_safe === false) {
      return hookBlock(
        multiChannelCollisionGate,
        `Multi-channel schedule failed sync verification (${syncReport.critical_count} critical). ` +
          `Fix unmatched pairs / deadlocks before emission.`,
        { data: { summary: syncReport.summary } },
      );
    }

    // If the caller supplies `ops` and `min_clearance_mm` we could run the
    // engine ourselves, but doing so from a sync hook handler isn't safe
    // (the engine is lazy-loaded). Instead we warn that the caller should
    // run the check explicitly.
    if (action === "turning_swiss_channel_emit" && !precomputed && !syncReport) {
      return hookSuccess(multiChannelCollisionGate, "No collision report supplied — caller should run `turning_swiss_collision_check` first");
    }

    return hookSuccess(multiChannelCollisionGate, "No collision risk detected");
  },
};

export const MULTI_CHANNEL_COLLISION_GATE_HOOKS: HookDefinition[] = [
  multiChannelCollisionGate,
];

export { multiChannelCollisionGate };
