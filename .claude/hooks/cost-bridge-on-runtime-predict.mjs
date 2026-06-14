#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-runtime-predict.mjs — PostToolUse advisory.
 * Fires when GCodeRuntimePredictorEngine is invoked. Surfaces a reminder
 * to refresh per_part.cycle_time_* + .performance in the last
 * ProgramCostReport for that program_id.
 *
 * Trigger: action name matches /gcode_runtime_predict|runtime.*predict/.
 *
 * Knobs: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1 silences this and the
 * sibling on-program-emit + on-reverse-cad hooks.
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
if (!/gcode_runtime_predict|runtime.*predict/i.test(action)) {
  process.stdout.write("{}");
  process.exit(0);
}

const msg = [
  "",
  "─── cost-bridge runtime advisory ──────────────────",
  "Runtime prediction landed — refresh ProgramCostReport:",
  "  • per_part.cycle_time_sec/min/spindle_hours",
  "  • performance.cutting_time_sec / .rapid_time_sec / .utilization_pct",
  "  • quote.lead_time_business_days (derived from spindle_hours)",
  "Downstream: scheduler + capacity planner read these.",
  "───────────────────────────────────────────────────",
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg },
}));
