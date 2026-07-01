#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-dispatch.mjs — consolidated PostToolUse cost-bridge router (slot:charlie quoting galaxy).
 *
 * WHY: the 16 `cost-bridge-on-<event>.mjs` advisory hooks (COST-EFFICIENCY-BRIDGE-MS0/MS1) shipped
 * standalone but were NEVER wired (gotcha #7 "build-standalone-wire-later"). Wiring 16 separate
 * PostToolUse entries would spawn 16 node processes per tool call — unacceptable overhead. This
 * dispatcher reads the PostToolUse event ONCE and runs all 16 rules in-process: 1 spawn, not 16.
 * Each rule is action-regex-gated; a non-matching tool call is a cheap no-op (`{}`). When a
 * cost-bearing domain event IS detected it surfaces a concise cascade headline + a pointer to the
 * full `cost-bridge-on-<event>.mjs` checklist (DRY — the 16 originals remain the canonical detail).
 *
 * Pure advisory — NEVER mutates state, NEVER blocks (always exit 0). The bridge re-run is the
 * operator's call (expensive on large programs).
 *
 * Knobs: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1 (shared family knob — also silences the 16 originals)
 *        PRISM_COST_BRIDGE_DISPATCH_DISABLE=1 (silences ONLY this dispatcher).
 *
 * @milestone COST-EFFICIENCY-BRIDGE (MS0/MS1 consolidation, slot:charlie 2026-05-29)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Each rule: { event, re, head }. `re` is the EXACT action gate from cost-bridge-on-<event>.mjs;
// `head` is a 1-line cascade summary — full checklist lives in the named hook (DRY).
export const RULES = [
  { event: "cad-import",          re: /cad_import|step_import|iges_import|f3d_import|dxf_import|cad_load/i,
    head: "CAD imported → re-baseline material + feature inventory; quote baseline shifts (re-quote)" },
  { event: "cam-strategy-select", re: /cam_strategy_select|cam_toolpath_strategy|adaptive_select|hsm_select|trochoidal_select|roughing_select|finishing_select/i,
    head: "CAM strategy chosen → MRR/cycle/tool-wear recompute; adaptive vs conventional ~2-4× cycle delta" },
  { event: "cam-tool-select",     re: /cam_tool_select|tool_assign|operation_tool_pick|cam_tool_pick/i,
    head: "CAM tool selected → tooling cost + MRR/cycle + wear amortization; cheapest-correct via optimizer" },
  { event: "machine-rate",        re: /shop_config|machine_rate|labor_rate|overhead_update/i,
    head: "Shop rates changed → ALL cached reports recompute (labor/machine/overhead → quote)" },
  { event: "material-price",      re: /material.*price|material_registry_update|material_cost_update/i,
    head: "Material price changed → material_cost recompute for ISO group; referencing quotes re-quote" },
  { event: "operator-override",   re: /operator_override|program_edit|traveler_accept_with_edit/i,
    head: "Operator edit captured → feed Bayesian-adaptive loop; recompute from post-edit values" },
  { event: "pdf-extract",         re: /pdf_extract|blueprint_extract|drawing_extract|print_extract|pdf_learn/i,
    head: "Print/blueprint extracted → material/tolerance/finish/inspection drive cost inputs" },
  { event: "precommit",           re: /program_commit|quote_commit|cam_commit|precommit_program|precommit_quote|precommit_cam/i,
    head: "Cost-bearing artifact committing → verify report fresh + no stale warnings + reconciles to quote" },
  { event: "program-emit",        re: /master_post_hurco|master_post_okuma|master_post_mazak|master_post_haas|cam:emit_|lathe_p2p_emit|post_processor.*emit/i,
    head: "Post-emission → refresh ProgramCostReport (runtime-predict → reverse-CAD → bridge.build)" },
  { event: "quote-accept",        re: /quote.*accept|quote_accept|order.*from.*quote/i,
    head: "Quote accepted → push to ERP + snapshot cost baseline for variance; confidence locks" },
  { event: "reverse-cad",         re: /gcode_reverse_cad|reverse.*cad|cad_reconstruct/i,
    head: "Reverse-CAD landed → refresh material_removed/MRR/cost_per_mm3/optimization_potential" },
  { event: "runtime-predict",     re: /gcode_runtime_predict|runtime.*predict/i,
    head: "Runtime predicted → refresh cycle/spindle-hours/utilization/lead-time" },
  { event: "shop-config-change",  re: /shop_config_update|machine_add|machine_remove|spindle_swap|control_swap|capacity_envelope/i,
    head: "Shop config changed → re-route machine selection + capacity + quote delivery dates" },
  { event: "spc-log",             re: /spc_measurement|spc_log|measurement_log|actual_cycle_log/i,
    head: "SPC logged → predicted-vs-actual delta to BayesianAdaptive; Cpk + NN/GNN tier-5 outcome (PSN #10)" },
  { event: "tool-catalog",        re: /tool_catalog_update|tool_pricing|tool_enrich|tool_life_log/i,
    head: "Tool catalog/pricing changed → tool_wear_fraction + tooling cost cascade to quote" },
  { event: "tool-wear-log",       re: /tool_wear_log|tool_life_log|wear_measurement/i,
    head: "Tool wear logged → tool-life recompute + wear-cost amortization + replacement scheduling" },
];

/** Extract the dispatch action from a PostToolUse event. Pure + defensive. */
export function extractAction(event) {
  if (!event || typeof event !== "object") return "";
  const ti = event.tool_input;
  if (!ti || typeof ti !== "object") return "";
  const a = ti.action ?? (ti.params && ti.params.action) ?? "";
  return typeof a === "string" ? a : "";
}

/** Return every rule whose action-gate matches. Pure. */
export function matchRules(action, rules = RULES) {
  if (typeof action !== "string" || action.length === 0) return [];
  const safe = Array.isArray(rules) ? rules : [];
  return safe.filter((r) => r && r.re instanceof RegExp && r.re.test(action));
}

/** Build the consolidated advisory string for matched rules. Pure. "" when none. */
export function buildAdvisory(matched) {
  const list = Array.isArray(matched) ? matched.filter((m) => m && m.event) : [];
  if (list.length === 0) return "";
  const lines = [
    "─── 💲 cost-bridge advisory (quoting galaxy) ───────",
    `${list.length} cost-bearing event${list.length > 1 ? "s" : ""} detected — refresh the ProgramCostReport:`,
    ...list.map((m) => `  • ${m.event}: ${m.head}`),
    "Full checklist per event: `.claude/hooks/cost-bridge-on-<event>.mjs`. Re-run is operator's call (advisory only).",
    "Disable: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1 (family) · PRISM_COST_BRIDGE_DISPATCH_DISABLE=1 (this).",
    "───────────────────────────────────────────────────",
  ];
  return "\n" + lines.join("\n");
}

function emit(json) {
  process.stdout.write(JSON.stringify(json));
  process.exit(0);
}

function main() {
  if (
    process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1" ||
    process.env.PRISM_COST_BRIDGE_DISPATCH_DISABLE === "1"
  )
    emit({});

  let payload = "";
  try {
    payload = readFileSync(0, "utf8");
  } catch {
    emit({});
  }
  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    emit({});
  }

  const action = extractAction(event);
  const matched = matchRules(action);
  const advisory = buildAdvisory(matched);
  if (!advisory) emit({});

  emit({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: advisory } });
}

// Bulletproof main-module check: true ONLY when this file IS the entry point.
// (A plain endsWith() guard fired under `node --test`, running main() → readFileSync(0)
// blocked on the runner's open stdin → hang. Comparing the resolved entry path to this
// module's own URL never matches the .test.mjs path that imports us.)
const invokedDirectly = (() => {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  try {
    main();
  } catch {
    emit({}); // fail-soft: never throw out of a PostToolUse hook
  }
}
