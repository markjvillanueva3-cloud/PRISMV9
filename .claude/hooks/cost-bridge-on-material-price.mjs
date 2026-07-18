#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-material-price.mjs — PostToolUse advisory.
 * Fires when the material registry / material price feed is updated.
 * Surfaces a reminder that every cached ProgramCostReport for that
 * material's ISO group needs material_cost recompute.
 *
 * Trigger: action matches /material.*price|material_registry_update|material_cost_update/.
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
if (!/material.*price|material_registry_update|material_cost_update/i.test(action)) {
  process.stdout.write("{}");
  process.exit(0);
}

const msg = [
  "",
  "─── cost-bridge material-price advisory ───────────",
  "Material price changed — refresh all cached reports for affected ISO group:",
  "  • per_part.material_cost_usd recomputes (volume × density × $/kg)",
  "  • overhead + total + quoted_unit_price cascade",
  "  • data_freshness.material_price_age_hours resets to 0",
  "Downstream: every quote referencing this material needs re-quote.",
  "───────────────────────────────────────────────────",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
