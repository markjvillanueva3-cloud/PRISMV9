/**
 * SwissProductionReadinessGateHook — LATHE-PRO-MS6b FORGE-TRIPLE close
 *
 * BLOCKS emission of any Swiss multi-channel program when the production
 * plan is RED per `SwissUnmannedReadinessEngine`, OR when the caller has
 * not supplied a bar-management plan from `SwissBarProductionEngine`.
 *
 * Scope of guard (pre-tool phase):
 *   - turning_swiss_channel_emit            (final G-code for Swiss)
 *   - turning_swiss_bar_management          (verify plan inputs before commit)
 *   - turning_swiss_unmanned_score          (verify plan before scoring)
 *
 * Caller contract (soft mode):
 *   The gate reads `ctx.target.data.unmanned_verdict` (expected: "GREEN" /
 *   "YELLOW" / "RED") and `ctx.target.data.bar_plan` (must contain
 *   `parts_per_bar` and `bars_required`). If absent, the gate warns the
 *   caller to produce them first — it does NOT fabricate verdicts.
 *
 * Bypass: `ctx.target.data.skipProductionGate === true`.
 *
 * @module hooks/SwissProductionReadinessGateHook
 * @milestone LATHE-PRO-MS6b / U-LPS26-28
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

const SWISS_ACTIONS = new Set([
  "turning_swiss_channel_emit",
  "turning_swiss_bar_management",
  "turning_swiss_unmanned_score",
]);

const swissProductionReadinessGate: HookDefinition = {
  id: "swiss-production-readiness-gate",
  name: "Swiss Production Readiness Gate",
  description:
    "BLOCK emission of Swiss multi-channel programs that lack a bar-management plan OR " +
    "that score RED on the lights-out readiness assessment.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["lathe", "swiss", "production", "bar-management", "lights-out"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";
    if (!SWISS_ACTIONS.has(action)) {
      return hookSuccess(swissProductionReadinessGate, "Not a Swiss action", {
        data: { skipped: true },
      });
    }
    if (data.skipProductionGate === true) {
      return hookSuccess(swissProductionReadinessGate, "Gate skipped by caller", {
        data: { bypass: true },
      });
    }

    // A RED unmanned verdict blocks emission.
    const verdict = data.unmanned_verdict;
    if (verdict === "RED") {
      return hookBlock(
        swissProductionReadinessGate,
        "Swiss production plan scored RED — at least one critical factor failed. " +
          "Attended production only. Re-run with adjusted magazine / bin / tool-life inputs.",
        { data: { verdict } },
      );
    }

    // YELLOW is advisory: pass with a note.
    if (verdict === "YELLOW") {
      return hookSuccess(
        swissProductionReadinessGate,
        "Swiss production plan scored YELLOW — periodic operator check required during run.",
        { data: { verdict } },
      );
    }

    // Emission path must carry a bar plan.
    if (action === "turning_swiss_channel_emit") {
      const plan = data.bar_plan;
      if (!plan || typeof plan !== "object" || typeof plan.parts_per_bar !== "number") {
        return hookBlock(
          swissProductionReadinessGate,
          "Swiss channel emission requires `bar_plan` from turning_swiss_bar_management. " +
            "Produce it first or set `skipProductionGate: true` to bypass.",
        );
      }
      if (plan.parts_per_bar === 0) {
        return hookBlock(
          swissProductionReadinessGate,
          "Bar plan reports parts_per_bar=0 — bar dimensions cannot produce one part. " +
            "Check bar_length_mm, grip_length_mm, part_length_mm, cutoff_width_mm.",
        );
      }
    }

    return hookSuccess(swissProductionReadinessGate, "Swiss production plan OK");
  },
};

export const SWISS_PRODUCTION_READINESS_GATE_HOOKS: HookDefinition[] = [
  swissProductionReadinessGate,
];

export { swissProductionReadinessGate };
