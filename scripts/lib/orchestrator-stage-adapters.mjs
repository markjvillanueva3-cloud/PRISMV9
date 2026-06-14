// scripts/lib/orchestrator-stage-adapters.mjs
//
// Stage adapter factories for the MASTER-MACHINIST-ORCHESTRATOR pipeline
// shell. Each adapter is a pure-fn wrapper over a PRISM engine reference
// (engines live in mcp-server/src/engines/*.ts; this .mjs file holds the
// adapter contract + glue logic).
//
// Bundles three S-effort sierra units in one file:
//   - U-MMO-FEASIBILITY-GATE       (Stage  3) — wraps FeasibilityOrchestratorEngine
//   - U-MMO-MATERIAL-RESOLVE-STAGE (Stage  2) — wraps MaterialEquivalenceEngine
//   - U-MMO-TOOL-CRIB-STAGE        (Stage  9) — wraps ToolInventoryOrchestratorEngine
//
// DESIGN
// The adapters use DEPENDENCY INJECTION: each factory takes an engine-call
// fn that the caller wires up (real TS engine in production; mock in tests).
// This keeps the .mjs adapter pure-fn + the .ts engine logic isolated +
// testable here without spinning up the MCP daemon.
//
// CONTRACT
// Each adapter implements the U-MMO-PIPELINE-SHELL contract:
//   { engineRef: string, run(input, context) → stage-result }
// per scripts/lib/orchestrator-pipeline-shell.mjs.
//
// DOCTRINE
//   - R8 (read before write): engineRef cites the production PRISM engine.
//   - R12 (fail-loud): on engine-call failure surface errored=true; the
//     pipeline shell's catch handler propagates this to the decomposition.
//   - confidence reflects the underlying engine's confidence (default 0.85
//     for wire-only adapters until real engines wire their own).

// ---------------------------------------------------------------------------
// FEASIBILITY-GATE (U-MMO-FEASIBILITY-GATE) — Stage 3
//
// PURPOSE
// Pre-quote feasibility check. Today's PRISM runs feasibility AFTER quote
// is sent (Agent D's wrong-order P0). This adapter inserts the gate BEFORE
// the QUOTE-DRY-RUN aggregates costs — if infeasible on current shop, the
// downstream stages emit deferred=true and risk_premium = 25%.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} FeasibilityResult
 * @property {boolean} feasible
 * @property {string[]} reasons              - why feasible/not
 * @property {string[]} blockers             - hard blockers
 * @property {string[]} warnings             - soft concerns
 * @property {number} confidence             - 0..1
 * @property {object} [machine_recommended]  - { machine_id, reason }
 */

/**
 * Create a stage adapter that runs feasibility analysis.
 *
 * @param {object} params
 * @param {(input: object, context: object) => FeasibilityResult | Promise<FeasibilityResult>} params.callEngine
 *   - Injected fn that delegates to FeasibilityOrchestratorEngine.
 * @param {string} [params.engineRef="FeasibilityOrchestratorEngine"]
 * @param {number} [params.estimatedCost=12]    - $ for the feasibility check itself
 * @param {number} [params.estimatedDurationSec=0]
 * @returns {{ engineRef: string, run: Function }}
 */
export function createFeasibilityGateAdapter({
  callEngine,
  engineRef = "FeasibilityOrchestratorEngine",
  estimatedCost = 12,
  estimatedDurationSec = 0,
} = {}) {
  if (typeof callEngine !== "function") {
    throw new Error("createFeasibilityGateAdapter: callEngine fn required");
  }
  return {
    engineRef,
    run(input, context) {
      let result;
      try {
        result = callEngine(input, context);
      } catch (err) {
        return {
          cost: estimatedCost,
          duration_estimate_sec: estimatedDurationSec,
          confidence: 0,
          evidence: [`feasibility engine threw: ${err.message}`],
          gdnt_passthrough: null,
          trace: `FEASIBILITY-GATE error: ${err.message}`,
          output: { _error: true, feasible: false },
          deferred: false,
        };
      }
      if (!result || typeof result.feasible !== "boolean") {
        return {
          cost: estimatedCost,
          duration_estimate_sec: estimatedDurationSec,
          confidence: 0,
          evidence: ["feasibility engine returned invalid result"],
          gdnt_passthrough: null,
          trace: "FEASIBILITY-GATE invalid-result",
          output: { _error: true, feasible: false },
          deferred: false,
        };
      }
      const evidence = [];
      if (result.feasible) {
        evidence.push("feasibility: PASS");
      } else {
        evidence.push("feasibility: FAIL");
      }
      for (const b of result.blockers || []) evidence.push(`BLOCKER: ${b}`);
      for (const r of result.reasons || []) evidence.push(`REASON: ${r}`);
      for (const w of result.warnings || []) evidence.push(`WARN: ${w}`);

      return {
        cost: estimatedCost,
        duration_estimate_sec: estimatedDurationSec,
        confidence: typeof result.confidence === "number" ? result.confidence : 0.85,
        evidence,
        gdnt_passthrough: null,
        trace: result.feasible
          ? `FEASIBILITY-GATE PASS (${(result.reasons || []).slice(0, 1).join("") || "n/a"})`
          : `FEASIBILITY-GATE FAIL (${(result.blockers || []).slice(0, 1).join("") || "no specific blocker"})`,
        output: {
          feasible: result.feasible,
          machine_recommended: result.machine_recommended || null,
          blockers: result.blockers || [],
          warnings: result.warnings || [],
        },
        deferred: false,
        feasibility_failed: !result.feasible,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// MATERIAL-RESOLVE (U-MMO-MATERIAL-RESOLVE-STAGE) — Stage 2
//
// PURPOSE
// Resolve raw material spec (alloy + heat-treat + supplier + form). The
// downstream SSF stage needs ISO group + hardness + machinability; the
// CAM-STRATEGY stage needs material density for tool-life math; the
// TOOL-CRIB stage needs material code to pick coated-vs-uncoated inserts.
//
// Today's PRISM has MaterialEquivalenceEngine + MaterialDatabaseBridgeEngine
// + HeatTreatmentResponseEngine but no coarse stage-orchestrator. This
// adapter is the orchestration layer.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} MaterialResolveResult
 * @property {string} canonical_id             - e.g. "ASTM_4140_PRE_HARDENED"
 * @property {string} iso_group                - P|M|K|N|S|H
 * @property {number} hardness_hb              - Brinell hardness
 * @property {number} [machinability_score]    - 0..1 (higher = easier)
 * @property {number} [yield_strength_mpa]
 * @property {boolean} [requires_heat_treat]
 * @property {string} [supplier_recommended]
 * @property {number} confidence               - 0..1
 */

/**
 * @param {object} params
 * @param {(input: object, context: object) => MaterialResolveResult} params.callEngine
 * @param {string} [params.engineRef="MaterialEquivalenceEngine"]
 * @param {number} [params.estimatedCost=0]   - lookup is free; material PROCUREMENT is downstream
 * @returns {{ engineRef: string, run: Function }}
 */
export function createMaterialResolveAdapter({
  callEngine,
  engineRef = "MaterialEquivalenceEngine",
  estimatedCost = 0,
} = {}) {
  if (typeof callEngine !== "function") {
    throw new Error("createMaterialResolveAdapter: callEngine fn required");
  }
  return {
    engineRef,
    run(input, context) {
      let result;
      try {
        result = callEngine(input, context);
      } catch (err) {
        return {
          cost: estimatedCost,
          duration_estimate_sec: 0,
          confidence: 0,
          evidence: [`material engine threw: ${err.message}`],
          gdnt_passthrough: null,
          trace: `MATERIAL-RESOLVE error: ${err.message}`,
          output: { _error: true },
          deferred: false,
        };
      }
      if (!result || typeof result.canonical_id !== "string" || !result.iso_group) {
        return {
          cost: estimatedCost,
          duration_estimate_sec: 0,
          confidence: 0,
          evidence: ["material engine returned invalid result (missing canonical_id or iso_group)"],
          gdnt_passthrough: null,
          trace: "MATERIAL-RESOLVE invalid-result",
          output: { _error: true },
          deferred: false,
        };
      }
      const validIsoGroups = ["P", "M", "K", "N", "S", "H"];
      if (!validIsoGroups.includes(result.iso_group)) {
        return {
          cost: estimatedCost,
          duration_estimate_sec: 0,
          confidence: 0,
          evidence: [`material engine returned invalid iso_group '${result.iso_group}'`],
          gdnt_passthrough: null,
          trace: "MATERIAL-RESOLVE invalid-iso-group",
          output: { _error: true },
          deferred: false,
        };
      }
      const evidence = [
        `material: ${result.canonical_id}`,
        `iso_group: ${result.iso_group}`,
        `hardness_hb: ${result.hardness_hb}`,
      ];
      if (result.requires_heat_treat) {
        evidence.push("requires heat-treat (cycle-time impact downstream)");
      }
      if (result.supplier_recommended) {
        evidence.push(`supplier: ${result.supplier_recommended}`);
      }
      return {
        cost: estimatedCost,
        duration_estimate_sec: 0,
        confidence: typeof result.confidence === "number" ? result.confidence : 0.90,
        evidence,
        gdnt_passthrough: null,
        trace: `MATERIAL: ${result.canonical_id} (ISO ${result.iso_group}, ${result.hardness_hb} HB)`,
        output: {
          canonical_id: result.canonical_id,
          iso_group: result.iso_group,
          hardness_hb: result.hardness_hb,
          machinability_score: result.machinability_score,
          yield_strength_mpa: result.yield_strength_mpa,
          requires_heat_treat: result.requires_heat_treat,
          supplier_recommended: result.supplier_recommended,
        },
        deferred: false,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// TOOL-CRIB (U-MMO-TOOL-CRIB-STAGE) — Stage 9
//
// PURPOSE
// Real-time inventory check + substitute selection. POST stage requires
// every called tool to actually exist in the JM Die crib at run-time;
// if not, this stage emits either (a) a substitute pick or (b) a buy-cost
// + lead-time addition to the quote.
//
// Wraps ToolInventoryOrchestratorEngine.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ToolRequest
 * @property {string} tool_id          - canonical tool identifier
 * @property {number} qty_required
 * @property {boolean} [critical_path] - true if cycle blocks on this tool
 */

/**
 * @typedef {object} ToolCribResult
 * @property {{ tool_id: string, in_stock: number, substitute?: string, buy_cost?: number, lead_days?: number }[]} availability
 * @property {number} total_buy_cost
 * @property {number} max_lead_days
 * @property {string[]} substitutes_applied
 * @property {string[]} hard_misses     - tools with no substitute + must order
 * @property {number} confidence
 */

/**
 * @param {object} params
 * @param {(toolRequests: ToolRequest[], context: object) => ToolCribResult} params.callEngine
 * @param {string} [params.engineRef="ToolInventoryOrchestratorEngine"]
 * @returns {{ engineRef: string, run: Function }}
 */
export function createToolCribAdapter({
  callEngine,
  engineRef = "ToolInventoryOrchestratorEngine",
} = {}) {
  if (typeof callEngine !== "function") {
    throw new Error("createToolCribAdapter: callEngine fn required");
  }
  return {
    engineRef,
    run(input, context) {
      // Stage input expected shape: prior stage emits { tools_required: ToolRequest[] }
      const requests =
        Array.isArray(input.tools_required)
          ? input.tools_required
          : Array.isArray(input.prior?.tools_required)
            ? input.prior.tools_required
            : [];
      if (requests.length === 0) {
        return {
          cost: 0,
          duration_estimate_sec: 0,
          confidence: 0.5,
          evidence: ["TOOL-CRIB: no tools_required in stage input — upstream CAM stage didn't emit tool list"],
          gdnt_passthrough: null,
          trace: "TOOL-CRIB: no tools requested",
          output: { tool_crib_ok: true, total_buy_cost: 0, max_lead_days: 0 },
          deferred: false,
        };
      }
      let result;
      try {
        result = callEngine(requests, context);
      } catch (err) {
        return {
          cost: 0,
          duration_estimate_sec: 0,
          confidence: 0,
          evidence: [`tool crib engine threw: ${err.message}`],
          gdnt_passthrough: null,
          trace: `TOOL-CRIB error: ${err.message}`,
          output: { _error: true },
          deferred: false,
        };
      }
      if (!result || !Array.isArray(result.availability)) {
        return {
          cost: 0,
          duration_estimate_sec: 0,
          confidence: 0,
          evidence: ["tool crib engine returned invalid result"],
          gdnt_passthrough: null,
          trace: "TOOL-CRIB invalid-result",
          output: { _error: true },
          deferred: false,
        };
      }
      const evidence = [];
      const buyCost = typeof result.total_buy_cost === "number" ? result.total_buy_cost : 0;
      const leadDays = typeof result.max_lead_days === "number" ? result.max_lead_days : 0;
      const subs = result.substitutes_applied || [];
      const misses = result.hard_misses || [];
      if (buyCost > 0) evidence.push(`tools to buy: $${buyCost.toFixed(2)}`);
      if (leadDays > 0) evidence.push(`max lead: ${leadDays}d`);
      if (subs.length > 0) evidence.push(`substitutes: ${subs.join(", ")}`);
      if (misses.length > 0) evidence.push(`HARD MISSES: ${misses.join(", ")}`);
      if (evidence.length === 0) evidence.push("all tools in inventory");

      // Lower confidence if substitutes or hard misses present
      const confidence =
        typeof result.confidence === "number"
          ? result.confidence
          : (misses.length > 0 ? 0.4 : subs.length > 0 ? 0.75 : 0.95);
      return {
        cost: buyCost,
        duration_estimate_sec: leadDays * 24 * 3600,  // lead time as seconds
        confidence,
        evidence,
        gdnt_passthrough: null,
        trace:
          misses.length > 0
            ? `TOOL-CRIB BLOCKED: ${misses.length} tools no substitute`
            : buyCost > 0
              ? `TOOL-CRIB: $${buyCost.toFixed(2)} order + ${leadDays}d lead`
              : `TOOL-CRIB: all in stock`,
        output: {
          tool_crib_ok: misses.length === 0,
          availability: result.availability,
          total_buy_cost: buyCost,
          max_lead_days: leadDays,
          substitutes_applied: subs,
          hard_misses: misses,
        },
        deferred: false,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Bundle: register all 3 adapters on a pipeline given the 3 engine calls.
// ---------------------------------------------------------------------------

/**
 * Convenience: register all 3 stage adapters on a pipeline given the
 * 3 engine-call fns. Useful for tests + integration smoke.
 *
 * @param {object} pipeline - from createPipeline()
 * @param {object} engines
 * @param {Function} engines.feasibility
 * @param {Function} engines.material
 * @param {Function} engines.toolCrib
 * @returns {void}
 */
export function registerWireUnits(pipeline, engines) {
  if (!pipeline || typeof pipeline.registerStage !== "function") {
    throw new Error("registerWireUnits: pipeline with registerStage required");
  }
  if (!engines || typeof engines !== "object") {
    throw new Error("registerWireUnits: engines object required");
  }
  if (typeof engines.feasibility === "function") {
    pipeline.registerStage("FEASIBILITY_GATE",
      createFeasibilityGateAdapter({ callEngine: engines.feasibility }));
  }
  if (typeof engines.material === "function") {
    pipeline.registerStage("MATERIAL_RESOLVE",
      createMaterialResolveAdapter({ callEngine: engines.material }));
  }
  if (typeof engines.toolCrib === "function") {
    pipeline.registerStage("TOOL_CRIB",
      createToolCribAdapter({ callEngine: engines.toolCrib }));
  }
}
