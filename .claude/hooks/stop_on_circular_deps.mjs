#!/usr/bin/env node
/**
 * stop_on_circular_deps.mjs — Tier 6 Stop Hook
 * Warns when new circular dependency introduced.
 */
import fs from "node:fs";

const DEP_GRAPH = "H:/prism/mcp-server/data/state/DEP_GRAPH.json";

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(DEP_GRAPH)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(DEP_GRAPH, "utf-8"));
    const cycles = data.cycles || data.circularDeps || [];
    const newCycles = cycles.filter(c => c.introducedThisSession || c.isNew);

    if (newCycles.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${newCycles.length} new circular dependencies: ${newCycles.slice(0, 2).map(c => c.path?.join("->") || c).join("; ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
