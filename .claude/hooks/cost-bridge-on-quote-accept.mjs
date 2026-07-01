#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-quote-accept.mjs — PostToolUse advisory.
 * Fires when a quote is accepted by a customer. Surfaces a reminder to
 * push the ProgramCostReport for that quote downstream into ERP as a
 * confirmed order, and snapshot the cost baseline for variance reporting.
 *
 * Trigger: action matches /quote.*accept|quote_accept|order.*from.*quote/.
 *
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 *
 * @milestone COST-EFFICIENCY-BRIDGE-MS1 (first of 13 deferred hooks)
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
if (!/quote.*accept|quote_accept|order.*from.*quote/i.test(action)) {
  process.stdout.write("{}");
  process.exit(0);
}

const msg = [
  "",
  "─── cost-bridge quote-accept advisory ─────────────",
  "Quote accepted — push to ERP + snapshot cost baseline:",
  "  • ERP order created with quote.quoted_unit_price_usd",
  "  • Snapshot cost_per_mm3_removed_usd as baseline for variance",
  "  • Set ProgramCostReport.refs.erp_order_id on the report",
  "  • Quote confidence locks at the accepted value (no further drift)",
  "Downstream: ERP + customer dashboard + variance analyzer all read.",
  "───────────────────────────────────────────────────",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
