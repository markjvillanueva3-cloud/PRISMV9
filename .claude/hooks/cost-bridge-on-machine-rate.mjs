#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-machine-rate.mjs — PostToolUse advisory.
 * Fires when shop labor / machine hour rate / overhead fraction changes.
 * Affects EVERY cached ProgramCostReport (rates are universal).
 *
 * Trigger: action matches /shop_config|machine_rate|labor_rate|overhead_update/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/shop_config|machine_rate|labor_rate|overhead_update/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge machine-rate advisory ─────────────",
  "Shop rates changed — refresh ALL cached reports (universal effect):",
  "  • per_part.labor_cost_usd + .machine_cost_usd recompute",
  "  • per_part.overhead_usd + .total_cost_usd cascade",
  "  • quote.quoted_unit_price_usd updates",
  "  • analytics.revenue_per_spindle_hour_usd shifts",
  "Downstream: every quote in pipeline needs re-quote.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
