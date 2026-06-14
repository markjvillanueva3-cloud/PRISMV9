#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-pdf-extract.mjs — PostToolUse advisory.
 * Fires when a print/blueprint PDF is extracted (dimensions, tolerances,
 * material callout, surface-finish). Tolerance bands drive op-count +
 * tool selection + machine selection — material callout drives stock cost.
 *
 * Trigger: action matches /pdf_extract|blueprint_extract|drawing_extract|print_extract|pdf_learn/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/pdf_extract|blueprint_extract|drawing_extract|print_extract|pdf_learn/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge PDF-extract advisory ──────────────",
  "Print/blueprint extracted — drives upstream cost inputs:",
  "  • Material callout → material_cost baseline (density × volume × $/kg)",
  "  • Tightest tolerance band → finish-op count + grinding decision",
  "  • Surface-finish callout → feed/speed throttle + tool selection",
  "  • Inspection requirements → CMM/SPC overhead in quote",
  "Downstream: CAM strategy + machine selection + quote all gated by print specs.",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
