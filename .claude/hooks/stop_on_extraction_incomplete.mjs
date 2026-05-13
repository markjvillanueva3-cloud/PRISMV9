#!/usr/bin/env node
// tier: T4
/**
 * stop_on_extraction_incomplete.mjs — Tier 6 Stop Hook
 * Warns when PDF/video extraction started but not finished.
 */
import fs from "node:fs";

const EXTRACTION_LOG = "H:/prism/mcp-server/data/state/extraction-log.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(EXTRACTION_LOG)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(EXTRACTION_LOG, "utf-8"));
    const incomplete = (data.entries || [])
      .filter(e => e.status === "in_progress" || e.status === "started")
      .filter(e => Date.now() - (e.extractedAt || 0) < 86400000);

    if (incomplete.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${incomplete.length} incomplete extractions: ${incomplete.slice(0, 3).map(e => e.sourceId || e.sourcePath).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
