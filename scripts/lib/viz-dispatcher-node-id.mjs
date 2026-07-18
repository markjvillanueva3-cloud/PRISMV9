#!/usr/bin/env node
/**
 * viz-dispatcher-node-id.mjs — canonical MCP-tool-name → system-graph
 * dispatcher node-id resolver (SSOT for every ghost / bridge producer).
 *
 * BACKGROUND (the G4 dead-edge class, sierra):
 * The dispatcher INFERENCE rules + the per-kind bridge tables across PRISM all
 * speak the MCP *tool* name (`prism_calc`, `prism_safety`, …). But the merged
 * `system-graph.json` indexes dispatchers by their FILE-DERIVED id
 * (`disp.calcdispatcher`, from `calcDispatcher.ts`). A producer that emits an
 * edge `to: "dispatcher.prism_calc"` is doubly wrong:
 *   1. wrong PREFIX  — G1 SSOT is `disp`, not `dispatcher`
 *   2. wrong NAME    — MCP tool name (`prism_calc`) ≠ file id (`calcdispatcher`)
 * Both errors make the edge target a non-existent node → a dead edge surfaced
 * by `system-viz-dead-pixel-sweep.mjs`.
 *
 * `seed-ghost-from-unwired.mjs` was fixed first (U-VIZ-G4-SEEDER-FIX,
 * 2026-05-20). This module is the extraction of that proven mapping so the
 * remaining producers (`seed-ghost-llm-classify.mjs`,
 * `generate-pdf-course-bridge-features.mjs`) resolve through ONE source of
 * truth instead of re-introducing the `dispatcher.<mcp_tool>` bug.
 *
 * Pure-export contract (no top-level side effects):
 *   MCP_TOOL_TO_DISP_NODE_ID — frozen {mcp_tool_name → disp.<file_id>}
 *   mcpToolToDispNodeId(name) → canonical "disp.*" node id (R12-honest fallback)
 *
 * @milestone SYSTEM-VIZ-FS-COVERAGE / U-VIZ-G4-DEAD-EDGE
 * @slot sierra
 */

/**
 * MCP tool name → merged-graph dispatcher node id (file-derived).
 * Keep aligned with the dispatcher files under
 * `mcp-server/src/tools/dispatchers/*Dispatcher.ts` — the node id is
 * `disp.<basename-lowercased-without-extension>`.
 */
export const MCP_TOOL_TO_DISP_NODE_ID = Object.freeze({
  prism_calc: "disp.calcdispatcher",
  prism_safety: "disp.safetydispatcher",
  prism_cam: "disp.camdispatcher",
  prism_cad: "disp.caddispatcher",
  prism_turning: "disp.turningdispatcher",
  prism_5axis: "disp.fiveaxisdispatcher",
  prism_ai: "disp.aireasoningdispatcher",
  prism_intelligence: "disp.intelligencedispatcher",
  prism_omega: "disp.omegadispatcher",
  prism_memory: "disp.memorydispatcher",
  prism_session: "disp.sessiondispatcher",
  prism_dev: "disp.devdispatcher",
  prism_orchestrate: "disp.orchestrationdispatcher",
  prism_skill_script: "disp.skillscriptdispatcher",
  prism_guard: "disp.guarddispatcher",
  prism_intake: "disp.intakedispatcher",
  // Added 2026-05-30 (U-VIZ-G4-DEAD-EDGE-ENG scrutiny arm-B): these tools appear
  // as accumulated dispatcher.prism_* dead edges AND their file-derived disp.*
  // nodes exist in the merged graph — so adding them lets the merge canon pass
  // recover ~14 more dead→live edges instead of leaving honest dead pixels.
  prism_data: "disp.datadispatcher",
  prism_validation: "disp.validationdispatcher",
  prism_machinelive: "disp.machinelivedispatcher",
  prism_multiop: "disp.multiopdispatcher",
});

/**
 * Resolve an MCP tool name to its canonical merged-graph dispatcher node id.
 *
 * R12: a key NOT in the table falls through to `disp.<mcp_tool_name>`
 * (lowercased) — that surfaces as a SINGLE dead pixel on the next dead-edge
 * sweep (an honest "this dispatcher node does not exist" signal) instead of
 * propagating the malformed `dispatcher.<name>` prefix silently. An
 * empty/non-string input → `disp.unknown` (harmless; UNKNOWN classifications
 * are MIN_CONFIDENCE-gated upstream and never emit an edge).
 *
 * `Object.hasOwn` guards the prototype chain — without it
 * `mcpToolToDispNodeId("__proto__")` would resolve to Object.prototype (a
 * truthy non-string), bypassing the `disp.<lower>` fallback.
 */
export function mcpToolToDispNodeId(mcpToolName) {
  if (typeof mcpToolName !== "string" || mcpToolName.length === 0) return "disp.unknown";
  return Object.hasOwn(MCP_TOOL_TO_DISP_NODE_ID, mcpToolName)
    ? MCP_TOOL_TO_DISP_NODE_ID[mcpToolName]
    : `disp.${mcpToolName.toLowerCase()}`;
}
