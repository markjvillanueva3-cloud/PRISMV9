#!/usr/bin/env node
// tier: T4
/**
 * stop_on_awareness_degraded.mjs — Tier 6 Stop Hook
 * Warns when awareness score dropped below threshold during session.
 */
import fs from "node:fs";
import path from "node:path";

const HEALTH_REPORT = "H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json";
const THRESHOLD = 0.80;

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(HEALTH_REPORT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(HEALTH_REPORT, "utf-8"));
    const score = data.awareness?.score || data.awarenessScore || 1.0;

    if (score < THRESHOLD) {
      console.log(JSON.stringify({
        result: "warn",
        message: `Awareness score degraded to ${(score * 100).toFixed(1)}% (threshold: ${THRESHOLD * 100}%)`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
