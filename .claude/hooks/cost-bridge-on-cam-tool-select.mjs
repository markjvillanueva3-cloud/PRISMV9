#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-cam-tool-select.mjs — PostToolUse advisory.
 * Fires when a tool is selected for a CAM operation. Tool $/each drives
 * tooling_cost; tool diameter + flute count drive MRR; tool life drives
 * tool_wear_fraction. Choosing a $40 carbide vs $200 indexable for the
 * same op = 5× cost delta in tooling.
 *
 * Trigger: action matches /cam_tool_select|tool_assign|operation_tool_pick|cam_tool_pick/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/cam_tool_select|tool_assign|operation_tool_pick|cam_tool_pick/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge CAM-tool-select advisory ──────────",
  "Tool selected for CAM op — drives tooling + MRR:",
  "  • per_op.tool_id + tool $/each → tooling.total_tool_cost_usd",
  "  • Tool dia + flute count → MRR coefficient → cycle time",
  "  • Tool life → tool_wear_fraction → wear-cost amortization",
  "  • Cheapest-correct tool surfaces via bidirectional optimizer",
  "Downstream: tooling + cycle + most_expensive_tool may shift; re-quote.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
