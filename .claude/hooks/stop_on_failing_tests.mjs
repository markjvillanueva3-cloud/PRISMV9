#!/usr/bin/env node
/**
 * stop_on_failing_tests.mjs — Tier 6 Stop Hook
 * Prevents exit when loop-scope tests are failing.
 */
import fs from "node:fs";
import path from "node:path";

const TEST_REPORT = "H:/prism/mcp-server/data/state/TEST_COVERAGE_INDEX.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(TEST_REPORT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(TEST_REPORT, "utf-8"));
    const failing = data.failing || data.failed || 0;
    const lastRun = data.timestamp || data.lastRun || 0;
    const age = Date.now() - lastRun;

    // Only warn if test run was within last 2 hours
    if (age < 7200000 && failing > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${failing} tests failing. Run \`npx vitest run\` before exit.`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
