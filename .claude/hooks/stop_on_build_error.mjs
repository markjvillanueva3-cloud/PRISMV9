#!/usr/bin/env node
// tier: T4
/**
 * stop_on_build_error.mjs — Tier 6 Stop Hook
 * Prevents exit when build has new TS errors from this session.
 */
import fs from "node:fs";
import path from "node:path";

const HEALTH_REPORT = "H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(HEALTH_REPORT)) {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(HEALTH_REPORT, "utf-8"));
    const tscErrors = data.tscErrors || data.buildErrors || 0;
    const lastBuild = data.timestamp || data.lastBuild || 0;
    const age = Date.now() - lastBuild;

    // Only warn if build was within last 4 hours
    if (age < 14400000 && tscErrors > 0) {
      console.log(JSON.stringify({ continue: false,
        stopReason: `${tscErrors} TypeScript errors. Run \`npm run build\` to fix before exit.`
      }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
