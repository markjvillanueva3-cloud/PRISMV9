#!/usr/bin/env node
/**
 * stop_on_broken_imports.mjs — Tier 6 Stop Hook
 * Warns when import statements point to missing files.
 */
import fs from "node:fs";
import path from "node:path";

const IMPORT_CHECK_REPORT = "H:/prism/mcp-server/data/state/import-check-report.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(IMPORT_CHECK_REPORT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(IMPORT_CHECK_REPORT, "utf-8"));
    const age = Date.now() - (data.timestamp || 0);

    // Only warn if report is fresh (<4h)
    if (age > 14400000) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const broken = data.brokenImports || data.missing || [];

    if (broken.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${broken.length} broken imports detected: ${broken.slice(0, 3).map(b => b.file || b).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
