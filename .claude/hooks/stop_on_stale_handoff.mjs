#!/usr/bin/env node
// tier: T4
/**
 * stop_on_stale_handoff.mjs — Tier 6 Stop Hook
 * Warns when handoff file is >24h old.
 */
import fs from "node:fs";
import path from "node:path";

const HANDOFF_PATTERNS = [
  "H:/prism/HANDOFF-*.md",
  "H:/prism/.claude/helpers/.compaction-survival.md"
];

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    const staleFiles = [];

    // Check compaction survival file
    const survivalFile = "H:/prism/.claude/helpers/.compaction-survival.md";
    if (fs.existsSync(survivalFile)) {
      const stat = fs.statSync(survivalFile);
      const age = Date.now() - stat.mtimeMs;
      if (age > 86400000) {
        staleFiles.push("compaction-survival.md");
      }
    }

    // Check for HANDOFF-*.md files
    const prismDir = "H:/prism";
    if (fs.existsSync(prismDir)) {
      const handoffs = fs.readdirSync(prismDir)
        .filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md"));

      for (const f of handoffs) {
        const stat = fs.statSync(path.join(prismDir, f));
        if (Date.now() - stat.mtimeMs > 86400000) {
          staleFiles.push(f);
        }
      }
    }

    if (staleFiles.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${staleFiles.length} handoff files >24h old: ${staleFiles.slice(0, 2).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
