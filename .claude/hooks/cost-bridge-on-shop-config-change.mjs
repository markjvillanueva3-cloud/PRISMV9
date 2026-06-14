#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-shop-config-change.mjs — PostToolUse advisory.
 * Fires when shop configuration changes (machine added/removed,
 * spindle changed, control swapped, capacity envelope updated).
 * Affects machine availability + machine-rate routing + machine selection.
 *
 * Trigger: action matches /shop_config_update|machine_add|machine_remove|spindle_swap|control_swap|capacity_envelope/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/shop_config_update|machine_add|machine_remove|spindle_swap|control_swap|capacity_envelope/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge shop-config advisory ──────────────",
  "Shop config changed — re-route machine selection + capacity:",
  "  • Machine availability matrix recompute",
  "  • Machine-rate routing per-op shifts (Hurco vs Okuma vs Haas)",
  "  • Capacity envelope updates — quote delivery dates re-baseline",
  "  • Bottleneck analysis refreshes (revenue_per_spindle_hour shifts)",
  "Downstream: scheduling + quote delivery dates need refresh.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
