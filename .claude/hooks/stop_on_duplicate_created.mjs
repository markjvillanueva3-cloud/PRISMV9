#!/usr/bin/env node
/**
 * stop_on_duplicate_created.mjs — Tier 6 Stop Hook
 * Warns when duplicate asset bypassed dedup guard.
 */
import fs from "node:fs";

const DEDUP_LOG = "H:/prism/mcp-server/data/state/dedup-violations.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(DEDUP_LOG)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(DEDUP_LOG, "utf-8"));
    const sessionViolations = (data.violations || [])
      .filter(v => Date.now() - (v.timestamp || 0) < 86400000);

    if (sessionViolations.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${sessionViolations.length} duplicate assets created: ${sessionViolations.slice(0, 3).map(v => v.name).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
