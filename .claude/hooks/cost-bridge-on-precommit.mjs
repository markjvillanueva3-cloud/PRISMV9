#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-precommit.mjs — PostToolUse advisory.
 * Fires when a program/quote/CAM artifact is committed (precommit hook
 * surface). Surfaces the canonical cost-bridge re-run reminder so the
 * commit ships with a fresh ProgramCostReport rather than stale data.
 *
 * Trigger: action matches /program_commit|quote_commit|cam_commit|precommit_program|precommit_quote|precommit_cam/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/program_commit|quote_commit|cam_commit|precommit_program|precommit_quote|precommit_cam/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge precommit advisory ────────────────",
  "Cost-bearing artifact about to commit — verify report fresh:",
  "  • ProgramCostReport regenerated since last input change?",
  "  • data_freshness.warnings empty? (no stale tool/material/rate)",
  "  • per_part.total_cost_usd reconciles to quote.quoted_unit_price_usd?",
  "  • optimizer recommendations applied OR explicit defer noted?",
  "Downstream: stale-cost commits poison analytics + auto-update cascade.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
