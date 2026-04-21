/**
 * MaterialTraceabilityGateHook — LATHE-PRO-MS9 FORGE-TRIPLE
 *
 * BLOCKS aerospace / medical / safety_critical turning emission when the
 * caller-supplied `compliance_result` (from `TurningComplianceCheckEngine`)
 * reports `is_compliant === false`, OR when the biocompatibility verdict
 * (from `TurningBiocompatibleMaterialGuardEngine`) is "BLOCK".
 *
 * Scope:
 *   - turning_compliance_check
 *   - turning_biocompat_check
 *   - turning_assemble_program
 *   - turning_swiss_channel_emit
 *   - turning_fai_generate
 *
 * Bypass: `skipMaterialTraceabilityGate: true`.
 *
 * @module hooks/MaterialTraceabilityGateHook
 * @milestone LATHE-PRO-MS9 / U-LPR06
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

const GUARDED_ACTIONS = new Set([
  "turning_compliance_check",
  "turning_biocompat_check",
  "turning_assemble_program",
  "turning_swiss_channel_emit",
  "turning_fai_generate",
]);

const materialTraceabilityGate: HookDefinition = {
  id: "material-traceability-gate",
  name: "Material Traceability Gate",
  description:
    "BLOCKS regulated-regime turning emission without verified material cert, " +
    "complete digital thread, DHR payload, current IQ/OQ/PQ, or when biocompat verdict is BLOCK.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["lathe", "compliance", "traceability", "cmtr", "as9100", "iso13485"],
  handler: (ctx: HookContext): HookResult => {
    const data = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";
    if (!GUARDED_ACTIONS.has(action)) {
      return hookSuccess(materialTraceabilityGate, "Not a guarded action", {
        data: { skipped: true },
      });
    }
    if (data.skipMaterialTraceabilityGate === true) {
      return hookSuccess(materialTraceabilityGate, "Gate bypassed by caller", {
        data: { bypass: true },
      });
    }

    // Biocompat verdict
    const bio = data.biocompat_result;
    if (bio && bio.verdict === "BLOCK") {
      return hookBlock(
        materialTraceabilityGate,
        `Biocompatibility BLOCK: ${
          Array.isArray(bio.issues) && bio.issues.length > 0
            ? bio.issues.slice(0, 3).map((i: any) => i.rule).join(", ")
            : "see biocompat_result.issues"
        }`,
        { data: { verdict: "BLOCK", issues: bio.issues?.slice?.(0, 3) } },
      );
    }

    // Compliance verdict
    const comp = data.compliance_result;
    if (comp && typeof comp === "object") {
      if (comp.regime === "none") {
        return hookSuccess(materialTraceabilityGate, "Regime=none — traceability not enforced.");
      }
      if (comp.is_compliant === false) {
        const issues: string[] = Array.isArray(comp.blocking_issues) ? comp.blocking_issues : [];
        return hookBlock(
          materialTraceabilityGate,
          `Compliance failure under regime=${comp.regime}: ${
            issues.length > 0 ? issues.slice(0, 3).join("; ") : "see artefacts[]"
          }`,
          { data: { regime: comp.regime, issues } },
        );
      }
      return hookSuccess(materialTraceabilityGate, `Compliance OK under regime=${comp.regime}.`);
    }

    return hookSuccess(
      materialTraceabilityGate,
      "No compliance_result / biocompat_result supplied — caller should run turning_compliance_check first.",
    );
  },
};

export const MATERIAL_TRACEABILITY_GATE_HOOKS: HookDefinition[] = [materialTraceabilityGate];
export { materialTraceabilityGate };
