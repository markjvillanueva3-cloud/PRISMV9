#!/usr/bin/env node
/**
 * stop_on_unsafe_gcode.mjs — Tier 6 Stop Hook
 * Warns when G-code was generated with safety warnings.
 */
import fs from "node:fs";

const GCODE_SAFETY_LOG = "H:/prism/mcp-server/data/state/gcode-safety-log.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(GCODE_SAFETY_LOG)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(GCODE_SAFETY_LOG, "utf-8"));
    const sessionEntries = (data.entries || [])
      .filter(e => Date.now() - (e.timestamp || 0) < 86400000)
      .filter(e => e.warnings?.length > 0 || e.safetyScore < 0.70);

    if (sessionEntries.length > 0) {
      const totalWarnings = sessionEntries.reduce((sum, e) => sum + (e.warnings?.length || 0), 0);
      console.log(JSON.stringify({
        result: "warn",
        message: `${sessionEntries.length} G-code generations had ${totalWarnings} safety warnings. Review before machining.`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
