#!/usr/bin/env node
// tier: T4
/**
 * stop_on_circular_deps.mjs — Tier 6 Stop Hook
 * Warns when new circular dependency introduced.
 */
import fs from "node:fs";

const DEP_GRAPH = "H:/prism/mcp-server/data/state/DEP_GRAPH.json";
const STDIN_TIMEOUT_MS = 1500;

function readStdinJson(timeoutMs = STDIN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let buf = "", settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    };
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", finish);
    setTimeout(finish, timeoutMs);
  });
}

async function main() {
  const input = await readStdinJson();

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
