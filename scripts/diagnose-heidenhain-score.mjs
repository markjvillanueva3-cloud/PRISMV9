#!/usr/bin/env node
/**
 * One-shot diagnostic — capture actual emitted G-code + quality score
 * for Heidenhain + Mitsubishi + Fanuc baselines. Reveals whether HSM
 * injection fires, whether tribal injection mangles output, and which
 * of the 8 sub-scorer dimensions are returning low values per dialect.
 *
 * Usage: node H:/prism/scripts/diagnose-heidenhain-score.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const enginePath = path.resolve(REPO_ROOT, "mcp-server/dist/engines/MasterPostProcessorUnifiedAGIEngine.js");
const mod = await import(`file:///${enginePath.replace(/\\/g, "/")}`);
const engine = mod.masterPostProcessorUnifiedAGIEngine || mod.default;
if (!engine || typeof engine.generatePost !== "function") {
  console.error("ERROR: engine import failed — looked at:", enginePath);
  console.error("Exports:", Object.keys(mod));
  process.exit(1);
}

// Heidenhain milling stub (from post-processor-validate-corpus.mjs synthesizeOpStubGcode)
const heidenhainMilling = [
  "0 BEGIN PGM TEST MM\n",
  "1 BLK FORM 0.1 Z X-50 Y-50 Z-25\n",
  "TOOL CALL 1 Z S6000\n",
  "L X+0 Y+0 R0 FMAX M3\n",
  "L Z+2 R0 FMAX\n",
  "L Z-2 R0 F300\n",
  "L X40.000 R0 F600\n",
  "L Z+25 R0 FMAX\n",
  "99 END PGM TEST MM\n",
].join("");

const mitsubishiMilling = [
  "G21 G90 G54\n",
  "T1 M06\n",
  "S6000 M03\n",
  "G00 X0 Y0\n",
  "G00 Z2.0\n",
  "G01 Z-2.0 F300\n",
  "G01 X40.000 F600\n",
  "G00 Z25\n",
  "M30\n",
].join("");

const fanucMilling = mitsubishiMilling; // identical canonical Fanuc-family preamble

const cases = [
  { name: "heidenhain", gcode: heidenhainMilling },
  { name: "mitsubishi", gcode: mitsubishiMilling },
  { name: "fanuc", gcode: fanucMilling },
];

for (const c of cases) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`Controller: ${c.name}`);
  console.log(`${"═".repeat(70)}`);
  console.log("[INPUT GCODE]");
  console.log(c.gcode);

  const result = engine.generatePost({
    controller: c.name,
    gcode: c.gcode,
    operation_intent: "milling",
    tool_diameter_mm: 10,
    inject_tribal: true,
    validate_physics: false,
    validate_kinematics: false,
    enable_deep_learning: false,
  });

  console.log("[OUTPUT GCODE]");
  console.log(result.gcode);
  console.log(`[QUALITY] ${result.quality_score}`);
  console.log(`[ENHANCEMENTS] ${result.enhancements.join(", ")}`);
  console.log(`[WARNINGS] ${result.warnings.join(" | ")}`);

  // Inspect dialect-signal probes on the OUTPUT
  const profile = engine.getControllerProfile(c.name);
  const signals = profile.signals || {
    safe_start: /G28|G30|G53/i,
    work_offset: /G5[4-9]/i,
    hsm: /G0?5\.1\s*Q1|G187|CYCLE832|M120|G08\s*P1/i,
  };
  console.log(`[SIGNAL-PROBE]`);
  console.log(`  safe_start (${signals.safe_start}): ${signals.safe_start.test(result.gcode)}`);
  console.log(`  work_offset (${signals.work_offset}): ${signals.work_offset.test(result.gcode)}`);
  console.log(`  hsm (${signals.hsm}): ${signals.hsm.test(result.gcode)}`);
  console.log(`  hsm_code "${profile.hsm_code}" in output: ${profile.hsm_code ? result.gcode.includes(profile.hsm_code) : "N/A"}`);
  console.log(`  rtcp_mode "${profile.rtcp_mode}" in output: ${profile.rtcp_mode ? result.gcode.includes(profile.rtcp_mode) : "N/A"}`);
  console.log(`  comments count: ${(result.gcode.match(/\(|^;/gm) || []).length}`);
  console.log(`  M9 (coolant off): ${/M0?9/i.test(result.gcode)}`);
}
