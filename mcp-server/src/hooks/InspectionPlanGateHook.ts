/**
 * InspectionPlanGateHook — LATHE-PRO-MS8 FORGE-TRIPLE
 *
 * BLOCKS emission of aerospace / medical / safety-critical turning programs
 * whose `quality_package.is_compliant` is false — typically missing FAI,
 * missing CMM program for GD&T features, or a Gage R&R ratio above 10 %
 * of the feature tolerance.
 *
 * Scope:
 *   - turning_inspection_plan
 *   - turning_fai_generate
 *   - turning_quality_package
 *   - turning_assemble_program
 *   - turning_swiss_channel_emit
 *
 * Block when `quality_package.is_compliant === false` AND regime is not
 * `"none"`. Pass with advisory when regime is "none".
 *
 * Bypass: `skipInspectionGate: true`.
 *
 * @module hooks/InspectionPlanGateHook
 * @milestone LATHE-PRO-MS8 / U-LPQ08
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

const GUARDED_ACTIONS = new Set([
  "turning_inspection_plan",
  "turning_fai_generate",
  "turning_quality_package",
  "turning_assemble_program",
  "turning_swiss_channel_emit",
]);

const inspectionPlanGate: HookDefinition = {
  id: "inspection-plan-gate",
  name: "Inspection Plan Gate",
  description:
    "BLOCKS aerospace / medical / safety-critical turning programs whose quality " +
    "package is non-compliant (missing FAI, missing CMM, failing Gage R&R).",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["lathe", "quality", "inspection", "fai", "compliance"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";
    if (!GUARDED_ACTIONS.has(action)) {
      return hookSuccess(inspectionPlanGate, "Not a guarded action", {
        data: { skipped: true },
      });
    }
    if (data.skipInspectionGate === true) {
      return hookSuccess(inspectionPlanGate, "Gate bypassed by caller", {
        data: { bypass: true },
      });
    }

    const pkg = data.quality_package;
    if (!pkg || typeof pkg !== "object") {
      // If caller hasn't supplied a quality package, only warn — don't block.
      // (Block at a higher layer when the regime demands it.)
      return hookSuccess(inspectionPlanGate, "No quality_package supplied — caller may run turning_quality_package first.");
    }
    const regime = pkg.regime;
    if (regime === "none") {
      return hookSuccess(inspectionPlanGate, "Regime=none — no inspection-gate enforcement.");
    }
    if (pkg.is_compliant === false) {
      const issues: string[] = Array.isArray(pkg.blocking_issues) ? pkg.blocking_issues : [];
      return hookBlock(
        inspectionPlanGate,
        `Quality package non-compliant under regime=${regime}: ${
          issues.length > 0 ? issues.slice(0, 3).join("; ") : "see artefacts[]"
        }`,
        { data: { regime, issues } },
      );
    }

    return hookSuccess(inspectionPlanGate, `Quality package compliant under regime=${regime}.`);
  },
};

export const INSPECTION_PLAN_GATE_HOOKS: HookDefinition[] = [inspectionPlanGate];
export { inspectionPlanGate };
