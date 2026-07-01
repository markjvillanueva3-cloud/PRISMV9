/**
 * prism_cimco — CIMCO Edit 2026 + Machine Simulation bridge dispatcher
 * =============================================================================
 *
 * SPINE-1 of the CIMCO integration. The single invocable MCP surface every galaxy
 * calls to query the verified CIMCO inventory (86 machine defs / 25 .js posts + 44
 * .eRPost controllers / 366 cutters) and to evaluate Machine-Simulation reports
 * through PRISM's pass/fail gate. CIMCO is the fleet program/post **verification +
 * simulation oracle** (wiki [[cimco-verification-simulation-integration]]).
 *
 * Carved out as its own focused dispatcher (echo's post-processor domain) rather
 * than bloating the 20K-line camDispatcher — mirrors the camFunctionDispatcher
 * carve-out precedent. Action names prefixed `cimco_*` for cross-dispatcher
 * uniqueness (rules/dispatchers.md).
 *
 * 11 actions — backed by CimcoVerificationBridgeEngine:
 *   - cimco_inventory_summary    → engine.summary()
 *   - cimco_machine_query        → engine.machineQuery()
 *   - cimco_post_query           → engine.postQuery()
 *   - cimco_tool_query           → engine.toolQuery()
 *   - cimco_sim_report_evaluate  → engine.evaluateSimulationReport()
 *   - cimco_control_channels     → engine.controlChannels()
 *   - cimco_nav_query            → engine.navQuery()       (blind-nav surface map, 511 surfaces)
 *   - cimco_nav_readiness        → engine.navReadiness()   (post-proving critical-path readiness + gaps)
 *   - cimco_launch_surface       → engine.launchSurface()  (exe inventory + launch patterns + External-Commands hook)
 *   - cimco_dialect_allowlist    → engine.dialectAllowlist() (per-dialect observed-G/M vocabulary summary)
 *   - cimco_dialect_lint         → engine.dialectLint()    (static proving: flag a post's codes unobserved in JM goldens)
 *
 * Authored 2026-06-02 — CIMCO-INTEGRATION-MS0 U-CIMCO-BRIDGE-ENGINE (slot:echo).
 * nav-map actions added 2026-06-03 — U-CIMCO-NAV-MAP (cimco-blind-nav-plot Workflow, 154 CHM pages).
 * launch-surface action added 2026-06-03 — U-CIMCO-LAUNCH-PROBE (exe + CLI + External-Commands probe).
 * dialect-allowlist actions added 2026-06-03 — U-CIMCO-DIALECT-ALLOWLISTS (G/M vocab mined from JM goldens).
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CIMCO_ACTION_SCHEMAS } from "../../schemas/cimcoActionSchemas.js";

const ACTIONS = [
  "cimco_inventory_summary",
  "cimco_machine_query",
  "cimco_post_query",
  "cimco_tool_query",
  "cimco_sim_report_evaluate",
  "cimco_control_channels",
  "cimco_nav_query",
  "cimco_nav_readiness",
  "cimco_launch_surface",
  "cimco_dialect_allowlist",
  "cimco_dialect_lint",
  "cimco_live_run_clearance",
] as const;

export type CimcoAction = typeof ACTIONS[number];

const _str = (v: unknown): string | undefined => (v !== undefined && v !== null ? String(v) : undefined);
const _num = (v: unknown): number | undefined => (v !== undefined && v !== null ? Number(v) : undefined);

/**
 * Pure routing entry point — returns the engine result without MCP wrapping.
 * Exposed so tests (and other internal callers) can invoke the dispatcher
 * surface without going through the MCP server harness.
 */
export async function dispatchCimco(
  action: CimcoAction,
  rawParams: Record<string, unknown> = {},
): Promise<unknown> {
  // H1-MS2 param normalization (snake_case ↔ camelCase) — match camDispatcher.
  let params: Record<string, unknown> = rawParams;
  try {
    const { normalizeParams } = await import("../../utils/paramNormalizer.js");
    params = normalizeParams(rawParams) as Record<string, unknown>;
  } catch {
    /* normalizer not available — proceed with raw params */
  }

  // Zod schema validation.
  const validation = validateActionParams(action, params, CIMCO_ACTION_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_cimco");
  }

  const { cimcoVerificationBridgeEngine } = await import(
    "../../engines/post-processor/CimcoVerificationBridgeEngine.js"
  );

  switch (action) {
    case "cimco_inventory_summary": {
      return cimcoVerificationBridgeEngine.summary();
    }
    case "cimco_machine_query": {
      return cimcoVerificationBridgeEngine.machineQuery({
        name: _str(params.name),
        orientation: _str(params.orientation),
        unitsResolvedOnly: (params.units_resolved_only ?? params.unitsResolvedOnly) as boolean | undefined,
        limit: _num(params.limit),
      });
    }
    case "cimco_post_query": {
      return cimcoVerificationBridgeEngine.postQuery({
        kind: _str(params.kind) as "js" | "erpost" | undefined,
        type: _str(params.type),
        vendor: _str(params.vendor),
        name: _str(params.name),
        limit: _num(params.limit),
      });
    }
    case "cimco_tool_query": {
      return cimcoVerificationBridgeEngine.toolQuery({
        unitSystem: (params.unit_system ?? params.unitSystem) as string | undefined,
        type: _str(params.type),
        library: _str(params.library),
        limit: _num(params.limit),
      });
    }
    case "cimco_sim_report_evaluate": {
      // `report` may legitimately be null (clean run), an array, or a grouped object.
      const report = (params.report ?? null) as Parameters<
        typeof cimcoVerificationBridgeEngine.evaluateSimulationReport
      >[0];
      return cimcoVerificationBridgeEngine.evaluateSimulationReport(report);
    }
    case "cimco_control_channels": {
      return cimcoVerificationBridgeEngine.controlChannels();
    }
    case "cimco_nav_query": {
      return cimcoVerificationBridgeEngine.navQuery({
        channel: _str(params.channel),
        area: _str(params.area),
        proofRelevant: (params.proof_relevant ?? params.proofRelevant) as boolean | undefined,
        text: _str(params.text),
        limit: _num(params.limit),
      });
    }
    case "cimco_nav_readiness": {
      return cimcoVerificationBridgeEngine.navReadiness();
    }
    case "cimco_launch_surface": {
      return cimcoVerificationBridgeEngine.launchSurface();
    }
    case "cimco_dialect_allowlist": {
      return cimcoVerificationBridgeEngine.dialectAllowlist();
    }
    case "cimco_dialect_lint": {
      return cimcoVerificationBridgeEngine.dialectLint(_str(params.nc_text) ?? "", _str(params.family));
    }
    case "cimco_live_run_clearance": {
      // Live-run clearance gate: machineBound (U-CIMCO-SIM-4) + units + kinematics +
      // simVerdict.clearedForLiveRun + runComplete (U-CIMCO-SIM-5) → cleared?
      // NonNullable: assessLiveRunClearance has a default param (= {}), so Parameters<…>[0]
      // is `LiveRunClearanceInput | undefined`; strip the undefined arm to index its fields.
      type ClearanceArg = NonNullable<Parameters<typeof cimcoVerificationBridgeEngine.assessLiveRunClearance>[0]>;
      return cimcoVerificationBridgeEngine.assessLiveRunClearance({
        machine: (params.machine ?? null) as ClearanceArg["machine"],
        simVerdict: (params.sim_verdict ?? params.simVerdict ?? null) as ClearanceArg["simVerdict"],
        kinematicsVerified: (params.kinematics_verified ?? params.kinematicsVerified) as boolean | undefined,
        programUnits: (params.program_units ?? params.programUnits) as "inch" | "mm" | undefined,
        bindVerdict: (params.bind_verdict ?? params.bindVerdict ?? null) as ClearanceArg["bindVerdict"],
        runComplete: (params.run_complete ?? params.runComplete ?? null) as ClearanceArg["runComplete"],
      });
    }
    default: {
      // Exhaustiveness — TypeScript ensures every action is handled above.
      const _never: never = action;
      return { error: `Unknown action: ${String(_never)}` };
    }
  }
}

/**
 * Register the prism_cimco MCP tool.
 *
 * @param server - MCP server instance
 * @returns void
 */
export function registerCimcoDispatcher(server: any): void {
  server.tool(
    "prism_cimco",
    `CIMCO Edit 2026 + Machine Simulation bridge — PRISM's fleet program/post
verification + simulation oracle. Query the verified local CIMCO inventory
(86 machine defs, 25 readable .js posts + 44 binary .eRPost controllers, 366
cutters across 14 tool libs) and evaluate Machine-Simulation reports through
PRISM's pass/fail gate. UNITS-FIRST: machine/tool results carry units-resolution
status (44/86 vendor defs omit declared units — inferred mm where geometry proves it, never blind inch).
A CIMCO-sim CLEAN result is conformance-clean, NOT controller-verified. For cimco_sim_report_evaluate
the live-run go/no-go is 'clearedForLiveRun' (= pass AND the collision-check demonstrably ran), NOT bare
'pass' — an empty/unconfirmed report is pass:true but clearedForLiveRun:false (fail-OPEN guard).
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: CimcoAction;
      params?: Record<string, any>;
    }) => {
      log.info(`[prism_cimco] Action: ${action}`);
      let result: unknown;
      try {
        result = await dispatchCimco(action, rawParams);
      } catch (error) {
        return dispatcherError(error, action, "prism_cimco");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }],
      };
    },
  );
}
