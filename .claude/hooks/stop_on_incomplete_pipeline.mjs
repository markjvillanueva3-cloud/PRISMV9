#!/usr/bin/env node
// tier: T4
/**
 * stop_on_incomplete_pipeline.mjs — Tier 6 Stop Hook
 * Prevents exit when extraction or forge pipelines are half-finished.
 */
import fs from "node:fs";
import path from "node:path";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const PIPELINE_FILES = [
  "harvest-pipeline-state.json",
  "extraction-pipeline-state.json",
  "forge-pipeline-state.json"
];

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    const incomplete = [];

    for (const file of PIPELINE_FILES) {
      const filePath = path.join(STATE_DIR, file);
      if (!fs.existsSync(filePath)) continue;

      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (data.status === "in_progress" || data.status === "started") {
          const age = Date.now() - (data.startedAt || 0);
          if (age < 3600000) { // <1h old
            incomplete.push({
              pipeline: file.replace("-state.json", ""),
              progress: data.progress || "unknown"
            });
          }
        }
      } catch {}
    }

    if (incomplete.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${incomplete.length} incomplete pipelines: ${incomplete.map(p => p.pipeline).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
