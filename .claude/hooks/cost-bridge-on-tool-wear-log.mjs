#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-tool-wear-log.mjs — fires when operator logs tool wear.
 * Updates tool_life expected remaining + tooling_cost recompute.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/tool_wear_log|tool_life_log|wear_measurement/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "─── cost-bridge tool-wear advisory ────\nTool wear logged — refresh tool_wear_fraction + tooling_cost.\n──────────────────────────────────────" } }));
