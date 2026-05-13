#!/usr/bin/env node
// tier: T4
/**
 * stop_on_undocumented_action.mjs — Tier 6 Stop Hook
 * Warns when MCP action exists without schema/documentation.
 */
import fs from "node:fs";

const ORPHAN_REPORT = "H:/prism/mcp-server/data/state/orphan-report.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(ORPHAN_REPORT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(ORPHAN_REPORT, "utf-8"));
    const age = Date.now() - (data.timestamp || 0);

    if (age > 14400000) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const orphanActions = (data.orphans || [])
      .filter(o => o.type === "action" || o.type === "schema");

    if (orphanActions.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${orphanActions.length} undocumented actions: ${orphanActions.slice(0, 3).map(o => o.name).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
