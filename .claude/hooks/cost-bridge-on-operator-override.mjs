#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-operator-override.mjs — PostToolUse advisory.
 * Fires when an operator edits a program / overrides a feed/speed /
 * accepts-with-edit on the traveler. Captures the edit as a Bayesian
 * learn-from-runs signal for the V11 engine + cost-bridge.
 *
 * Trigger: action matches /operator_override|program_edit|traveler_accept_with_edit/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/operator_override|program_edit|traveler_accept_with_edit/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge operator-override advisory ────────",
  "Operator-edit captured — feed Bayesian-adaptive loop:",
  "  • Capture the field edited + old value + new value + reason",
  "  • Append to outcomes ledger for BayesianAdaptiveEngine training",
  "  • Recompute cost report from post-edit values (not engine defaults)",
  "  • Operator-override stamp on the report (confidence boost on next run)",
  "Downstream: V11 engine convergence to operator-edited values over runs.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
