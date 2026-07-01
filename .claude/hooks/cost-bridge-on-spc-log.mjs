#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-spc-log.mjs — PostToolUse advisory.
 * Fires when SPC measurement is logged. Surfaces the variance signal
 * (predicted vs actual cycle time, predicted vs actual MRR) for the
 * Bayesian-adaptive learn-from-runs loop. Closes the loop into the
 * runtime predictor for calibration over time.
 *
 * Trigger: action matches /spc_measurement|spc_log|measurement_log|actual_cycle_log/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/spc_measurement|spc_log|measurement_log|actual_cycle_log/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge SPC-log advisory ──────────────────",
  "SPC measurement logged — feed variance back to predictor:",
  "  • Compute predicted vs actual cycle delta (target ≤5% error)",
  "  • Feed BayesianAdaptiveEngine with the delta for calibration",
  "  • Update tool-life if wear measurement included",
  "  • Update Cpk roll-up + scrap-risk on the part",
  "Downstream: NN/GNN tier-5 outcome event (closes PSN leg #10).",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
