#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-tool-catalog.mjs — PostToolUse advisory.
 * Fires when tool catalog or tool pricing is updated. Surfaces a
 * reminder that cached ProgramCostReports for affected tools need
 * tooling_cost recompute + tool_efficiency_score refresh.
 *
 * Trigger: action matches /tool_catalog_update|tool_pricing|tool_enrich|tool_life_log/.
 *
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 *
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";

if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") {
  process.stdout.write("{}");
  process.exit(0);
}

let payload = "";
try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event;
try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }

const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/tool_catalog_update|tool_pricing|tool_enrich|tool_life_log/i.test(action)) {
  process.stdout.write("{}");
  process.exit(0);
}

const msg = [
  "",
  "─── cost-bridge tool-catalog advisory ─────────────",
  "Tool catalog / pricing changed — refresh cost reports:",
  "  • per_operation[].tool_wear_fraction recomputes from new tool_life",
  "  • tooling.total_tool_cost_usd cascades to total + quote",
  "  • tooling.most_expensive_tool may shift to a different T#",
  "  • tooling.tool_efficiency_score refreshes (cost vs material removed)",
  "Downstream: cost analyzer flags variance vs prior quote.",
  "───────────────────────────────────────────────────",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
