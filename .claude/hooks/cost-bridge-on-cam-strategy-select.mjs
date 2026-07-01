#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-cam-strategy-select.mjs — PostToolUse advisory.
 * Fires when CAM strategy is chosen (adaptive vs conventional vs HSM
 * vs trochoidal vs rest-mill). Strategy drives MRR + cycle time +
 * tool wear rate. The same feature can be 2-4× faster with adaptive.
 *
 * Trigger: action matches /cam_strategy_select|cam_toolpath_strategy|adaptive_select|hsm_select|trochoidal_select|roughing_select|finishing_select/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/cam_strategy_select|cam_toolpath_strategy|adaptive_select|hsm_select|trochoidal_select|roughing_select|finishing_select/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge CAM-strategy advisory ─────────────",
  "CAM strategy chosen — drives MRR + cycle + tool wear:",
  "  • per_op.estimated_cycle_min recompute from strategy MRR coefficient",
  "  • per_op.material_removed_cc / per_op.tool_wear_fraction shift",
  "  • Adaptive vs conventional: 2-4× cycle delta common",
  "  • Recommend cheapest-correct strategy via PRISM bidirectional optimizer",
  "Downstream: total cycle + quote cascade; recommendation surfaces in optimizer report.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
