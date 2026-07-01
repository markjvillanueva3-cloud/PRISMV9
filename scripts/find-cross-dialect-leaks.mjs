#!/usr/bin/env node
/**
 * Cross-dialect token-leak isolator — surfaces the 5 cross-dialect leaks
 * that the iter14 quality_score=0 regression fix unmasked.
 *
 * The main validator (scripts/post-processor-validate-corpus.mjs) only
 * persists a 10-failure sample to the JSON report, so the 5 leaks are
 * not individually recoverable from there. This script re-runs the
 * scenarios and writes a leak-only report with the offending tokens.
 *
 * Authored 2026-05-26 (slot:echo /goal overnight iter15) — surfaces the
 * triage punch list for operator's "training Hurco perfect" goal.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCENARIO_DIR = path.join(REPO_ROOT, "state", "shared", "scenarios", "post-processor", "batch-001", "scenarios");
const ENGINE_PATH = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "MasterPostProcessorUnifiedAGIEngine.js");
const OUT_REPORT = path.join(REPO_ROOT, "state", "shared", "specs", "CROSS-DIALECT-LEAKS-2026-05-26.md");

// Match the stub-synth from the validator (verbatim)
function synthesizeOpStubGcode(scenario) {
  const d = scenario.controller.dialect;
  const op = scenario.operation;
  const dia = scenario.geometry?.diameter_mm ?? 10;
  const preamble = d === "heidenhain"
    ? "0 BEGIN PGM TEST MM\n1 BLK FORM 0.1 Z X-50 Y-50 Z-25\n"
    : "G21 G90 G54\n";
  const lines = [preamble];
  if (op === "turning" || op === "rough-turn" || op === "finish-turn") {
    lines.push("G50 S3500\n", "G96 S180 M03\n", `G00 X${(dia + 2).toFixed(3)} Z2.0\n`, "G01 Z-25.0 F0.15\n", "G00 X100\n");
  } else if (op === "milling" || op === "contour" || op === "face" || op === "pocket") {
    lines.push("T1 M06\n", "S6000 M03\n", "G00 X0 Y0\n", "G00 Z2.0\n", "G01 Z-2.0 F300\n", `G01 X${(dia * 4).toFixed(3)} F600\n`, "G00 Z25\n");
  } else if (op === "drilling" || op === "tap-rigid") {
    lines.push("T2 M06\n", "S2500 M03\n", "G00 X10 Y10\n", "G81 Z-10 R2 F150\n", "G80\n");
  } else if (op === "boring" || op === "bore") {
    lines.push("T3 M06\n", "S1500 M03\n", "G00 X0 Y0 Z2\n", "G85 Z-15 R2 F100\n", "G80\n");
  } else if (op === "threading" || op === "thread-turn") {
    lines.push("G50 S2000\n", "G97 S800 M03\n", `G00 X${(dia + 0.5).toFixed(3)} Z2.0\n`, `G92 X${(dia - 1.5).toFixed(3)} Z-20 F1.5\n`, "G00 X100\n");
  } else {
    lines.push("G00 X0 Y0 Z2\n", "G01 Z0 F100\n");
  }
  lines.push(d === "heidenhain" ? "99 END PGM TEST MM\n" : "M30\n");
  return lines.join("");
}

function scenarioToEngineInput(scenario) {
  return {
    controller: scenario.controller.dialect,
    operation_intent: scenario.operation,
    tool_diameter_mm: scenario.geometry.diameter_mm,
    spindle_rpm: undefined,
    feed_rate_mmmin: undefined,
    validate_physics: true,
    validate_kinematics: scenario.axis_count >= 4,
    inject_tribal: true,
    enable_deep_learning: false,
    gcode: synthesizeOpStubGcode(scenario),
  };
}

async function main() {
  // Lazy-load engine via dynamic import (matches validator pattern)
  const url = "file:///" + ENGINE_PATH.replace(/\\/g, "/");
  if (!fs.existsSync(ENGINE_PATH)) {
    console.error(`engine dist not found: ${ENGINE_PATH} — run npm run build first`);
    process.exit(2);
  }
  const mod = await import(url);
  const engine = mod.masterPostProcessorUnifiedAGIEngine || mod.default;
  if (!engine) {
    console.error("engine singleton not exported");
    process.exit(2);
  }

  if (!fs.existsSync(SCENARIO_DIR)) {
    console.error(`scenario dir not found: ${SCENARIO_DIR}`);
    process.exit(2);
  }
  const files = fs.readdirSync(SCENARIO_DIR).filter((f) => f.endsWith(".json")).sort();
  const leaks = [];

  for (const f of files) {
    const scenario = JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, f), "utf8"));
    let result;
    try {
      result = engine.generatePost(scenarioToEngineInput(scenario));
    } catch (e) {
      continue;
    }
    const gcode = result.gcode || "";
    const expectedDialect = scenario.controller?.dialect;
    const banned = scenario.expected_gcode_shape?.must_not_contain || [];
    const leakedTokens = banned.filter((tok) => gcode.includes(tok));
    if (leakedTokens.length > 0) {
      leaks.push({
        id: scenario.id || f.replace(".json", ""),
        controller: scenario.controller,
        operation: scenario.operation,
        expectedDialect,
        leakedTokens,
        engineOutput: gcode.slice(0, 800),
        enhancements: result.enhancements || [],
        quality_score: result.quality_score,
      });
    }
  }

  // Build the report
  let md = `# Cross-Dialect Token-Leak Triage (2026-05-26)\n\n`;
  md += `**Slot:** echo (claude-9029a5d7) · **Trigger:** iter14 P0 D11 fix unmasked these 5 leaks from POST-PROCESSOR-PROVE-OUT-2026-05-26\n\n`;
  md += `**What this is:** when the validator's iter14 fix made the engine actually run (was returning quality_score=0 short-circuit), 5 scenarios surfaced where the engine emitted G/M codes that the scenario explicitly forbids for that dialect. This is a real dialect-purity bug in MasterPostProcessorUnifiedAGIEngine — the offending tokens come either from (a) shared codegen templates that don't branch on dialect, or (b) the optimize-existing-gcode branch passing through stub tokens that the dialect rule rejects.\n\n`;
  md += `**Found:** ${leaks.length} leak scenario(s) of ${files.length} total.\n\n`;
  md += `## Per-scenario findings\n\n`;
  for (const leak of leaks) {
    md += `### ${leak.id} — ${leak.expectedDialect} / ${leak.operation}\n\n`;
    md += `**Banned tokens that leaked into engine output:** ${leak.leakedTokens.map((t) => `\`${t}\``).join(", ")}\n\n`;
    md += `**Engine output (first 800 chars):**\n\`\`\`\n${leak.engineOutput}\n\`\`\`\n\n`;
    md += `**Enhancements applied:** ${leak.enhancements.join(", ") || "(none)"}\n\n`;
    md += `**Quality score:** ${leak.quality_score}\n\n`;
    md += `---\n\n`;
  }
  md += `## Triage tomorrow\n\n`;
  md += `For each leak above:\n`;
  md += `1. Identify whether the leaked token is in our stub (synthesizeOpStubGcode passes through to optimize-existing-gcode branch) OR in the engine's added enhancements (HSM injection / coolant / etc.)\n`;
  md += `2. If stub-source: scenario corpus is wrong (stub uses a non-dialect-pure base) OR validator should not gate stub passthrough\n`;
  md += `3. If engine-source: MasterPostProcessorUnifiedAGIEngine has a real dialect-purity bug — the enhancement path is not dialect-aware\n`;
  md += `4. Fix in priority order: engine-source bugs first (real product issue), then scenario/stub.\n\n`;
  md += `## Provenance\n- Runner: \`scripts/find-cross-dialect-leaks.mjs\`\n- Parent prove-out: \`state/shared/specs/POST-PROCESSOR-PROVE-OUT-2026-05-26.md\`\n- Validator fix: iter14 commit (slot/echo)\n- Engine: \`mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts\`\n`;

  fs.writeFileSync(OUT_REPORT, md);
  console.log(`wrote ${OUT_REPORT} (${fs.statSync(OUT_REPORT).size} bytes)`);
  console.log(`leaks: ${leaks.length} / ${files.length} scenarios`);
  if (leaks.length > 0) {
    console.log("scenarios:", leaks.map((l) => `${l.id} (${l.expectedDialect}: ${l.leakedTokens.join(",")})`).join(" · "));
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
