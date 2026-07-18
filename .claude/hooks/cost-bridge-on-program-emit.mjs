#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-program-emit.mjs — PostToolUse advisory hook.
 * Fires when a Hurco/Okuma/Mazak master-post emits a program, surfaces
 * a reminder to refresh the cost-efficiency report for that program.
 *
 * Trigger pattern: tool input contains action matching `master_post_*`
 * or `cam:emit_*` or any of the 3-axis mill post-emission actions.
 *
 * NEVER auto-mutates state — pure advisory. Operator decides whether to
 * actually re-run the bridge (the bridge is expensive on large programs).
 *
 * Knobs: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1 silences.
 *
 * @milestone COST-EFFICIENCY-BRIDGE-MS0
 */
import { readFileSync } from "node:fs";

const DISABLE = process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1";

function emit(json) {
  process.stdout.write(JSON.stringify(json));
  process.exit(0);
}

if (DISABLE) emit({});

let payload = "";
try {
  payload = readFileSync(0, "utf8");
} catch {
  emit({});
}

let event;
try {
  event = JSON.parse(payload);
} catch {
  emit({});
}

const toolName = event.tool_name ?? "";
const toolInput = event.tool_input ?? {};
const action = toolInput.action ?? toolInput.params?.action ?? "";

// Match post-emission patterns across all PRISM master posts
const POST_EMIT_PATTERNS = [
  /master_post_hurco/,
  /master_post_okuma/,
  /master_post_mazak/,
  /master_post_haas/,
  /cam:emit_/,
  /lathe_p2p_emit/,
  /post_processor.*emit/,
];

const matchesPost = POST_EMIT_PATTERNS.some(p => p.test(action));
if (!matchesPost) emit({});

const msg = [
  "",
  "─── cost-efficiency-bridge advisory ───────────────",
  `Post-emission detected (action: ${action}).`,
  "Refresh the cost-efficiency report for this program:",
  "  • runtime predict → reverse-CAD → bridge.build()",
  "  • Updates: per-part cycle, tooling cost, quote price, margin",
  "Downstream consumers (quote/ERP/scheduler/dashboard) read the refreshed",
  "ProgramCostReport from state/shared/cost-efficiency-reports/.",
  "Disable: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1",
  "───────────────────────────────────────────────────",
].join("\n");

emit({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: msg,
  },
});
