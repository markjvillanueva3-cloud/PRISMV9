/**
 * CostSanityGateHook — LATHE-PRO-MS10 FORGE-TRIPLE
 *
 * Advisory (not blocking by default) hook that fires when the caller-supplied
 * cost_per_part_result exceeds the industry benchmark OR when any single
 * bucket exceeds a suspicious concentration (> 70% of total).
 *
 * Unlike most safety/compliance gates this hook defaults to WARN — cost
 * anomalies are important signals but should not stop a run. Override via
 * `block_on_cost_anomaly: true` to turn it into a blocking gate.
 *
 * Scope:
 *   - turning_cost_optimize
 *   - turning_cost_per_part
 *   - turning_quote
 *
 * Bypass: `skipCostSanityGate: true`.
 *
 * @module hooks/CostSanityGateHook
 * @milestone LATHE-PRO-MS10 / U-LPE07
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning,
} from "../engines/HookExecutor.js";

const GUARDED_ACTIONS = new Set([
  "turning_cost_optimize",
  "turning_cost_per_part",
  "turning_quote",
]);

const BUCKET_CONCENTRATION_WARN = 70; // %

const costSanityGate: HookDefinition = {
  id: "cost-sanity-gate",
  name: "Cost Sanity Gate",
  description:
    "Flags turning cost-per-part results that exceed industry benchmarks OR that have a " +
    "single bucket above 70% concentration. Advisory by default; blocking when " +
    "block_on_cost_anomaly=true.",
  phase: "pre-tool",
  category: "quality-gate",
  mode: "non_blocking",
  priority: "medium",
  enabled: true,
  tags: ["lathe", "cost", "economics", "sanity"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";
    if (!GUARDED_ACTIONS.has(action)) {
      return hookSuccess(costSanityGate, "Not a guarded action", {
        data: { skipped: true },
      });
    }
    if (data.skipCostSanityGate === true) {
      return hookSuccess(costSanityGate, "Gate bypassed by caller", {
        data: { bypass: true },
      });
    }

    const r = data.cost_per_part_result;
    if (!r || typeof r !== "object") {
      return hookSuccess(costSanityGate, "No cost_per_part_result supplied — skipping sanity check.");
    }

    const reasons: string[] = [];
    if (r.within_benchmark === false) {
      reasons.push(
        `Total cost/part ${r.total_cost_per_part} exceeds caller benchmark.`,
      );
    }
    const buckets: Array<{ name: string; percent_of_total: number }> = Array.isArray(r.buckets)
      ? r.buckets
      : [];
    for (const b of buckets) {
      if (b.percent_of_total >= BUCKET_CONCENTRATION_WARN) {
        reasons.push(
          `Bucket '${b.name}' is ${b.percent_of_total}% of total — re-examine (>${BUCKET_CONCENTRATION_WARN}% concentration).`,
        );
      }
    }

    if (reasons.length === 0) {
      return hookSuccess(costSanityGate, "Cost sanity OK.");
    }

    const msg = reasons.join(" ");
    if (data.block_on_cost_anomaly === true) {
      return hookBlock(costSanityGate, `BLOCK: ${msg}`, { data: { reasons } });
    }
    return hookWarning(costSanityGate, `WARN: ${msg}`, { data: { reasons } });
  },
};

export const COST_SANITY_GATE_HOOKS: HookDefinition[] = [costSanityGate];
export { costSanityGate };
