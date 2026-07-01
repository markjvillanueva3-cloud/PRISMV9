#!/usr/bin/env node
// tier: T3
/**
 * cost-bridge-on-cad-import.mjs — PostToolUse advisory.
 * Fires when CAD is imported (STEP/IGES/F3D/DXF). New CAD = new material
 * volume baseline + new feature set + cost report must re-baseline.
 *
 * Trigger: action matches /cad_import|step_import|iges_import|f3d_import|dxf_import|cad_load/.
 * Knob: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1.
 * @milestone COST-EFFICIENCY-BRIDGE-MS1
 */
import { readFileSync } from "node:fs";
if (process.env.PRISM_COST_BRIDGE_ADVISORY_DISABLE === "1") { process.stdout.write("{}"); process.exit(0); }
let payload = ""; try { payload = readFileSync(0, "utf8"); } catch { process.stdout.write("{}"); process.exit(0); }
let event; try { event = JSON.parse(payload); } catch { process.stdout.write("{}"); process.exit(0); }
const action = event.tool_input?.action ?? event.tool_input?.params?.action ?? "";
if (!/cad_import|step_import|iges_import|f3d_import|dxf_import|cad_load/i.test(action)) { process.stdout.write("{}"); process.exit(0); }
const msg = [
  "",
  "─── cost-bridge CAD-import advisory ───────────────",
  "CAD imported — re-baseline material + feature inventory:",
  "  • Compute stock_volume_cc + part_volume_cc from new geometry",
  "  • material_cost_usd recompute (volume × price/kg × density)",
  "  • Feature inventory drives CAM strategy + tool selection",
  "  • Quote baseline shifts — re-quote required",
  "Downstream: print-to-program pipeline kicks off (CAD→CAM→post→cost).",
  "───────────────────────────────────────────────────",
].join("\n");
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: msg } }));
