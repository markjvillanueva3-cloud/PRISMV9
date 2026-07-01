#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-reverse-cad.mjs — PostToolUse advisory.
 * Fires when GCodeReverseCADEngine runs. Surfaces a reminder to refresh
 * per_operation.material_removed_mm3 + analytics.cost_per_mm3_removed_usd
 * + analytics.optimization_potential_pct.
 *
 * Trigger: action matches /gcode_reverse_cad|reverse.*cad|cad_reconstruct/.
 *
 * Knobs: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 *
 * @milestone COST-EFFICIENCY-BRIDGE-MS0
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
if (!/gcode_reverse_cad|reverse.*cad|cad_reconstruct/i.test(action)) {
  process.stdout.write("{}");
  process.exit(0);
}

const msg = [
  "",
  "─── cost-bridge reverse-CAD advisory ──────────────",
  "Reverse-CAD landed — refresh cost-efficiency analytics:",
  "  • per_operation[].material_removed_mm3 (volume conservation check)",
  "  • per_operation[].mrr_mm3_min (material removal rate)",
  "  • analytics.cost_per_mm3_removed_usd (efficiency metric)",
  "  • analytics.optimization_potential_pct (BidirectionalOptimizer savings)",
  "Downstream: cost analyzer + customer dashboard read these.",
  "───────────────────────────────────────────────────",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
