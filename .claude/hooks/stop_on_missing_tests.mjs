#!/usr/bin/env node
// tier: T4
/**
 * stop_on_missing_tests.mjs — Tier 6 Stop Hook
 * Warns when engine/feature created without test coverage.
 */
import fs from "node:fs";
import path from "node:path";

const COVERAGE_INDEX = "H:/prism/mcp-server/data/state/TEST_COVERAGE_INDEX.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(COVERAGE_INDEX)) {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(COVERAGE_INDEX, "utf-8"));
    const uncovered = (data.uncoveredEngines || data.untested || [])
      .filter(e => {
        // Only flag if engine was created in last 24h
        const mtime = e.mtime || 0;
        return Date.now() - mtime < 86400000;
      });

    if (uncovered.length > 0) {
      console.log(JSON.stringify({ continue: false,
        stopReason: `${uncovered.length} recent engines without tests: ${uncovered.slice(0, 3).map(e => e.name || e).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
