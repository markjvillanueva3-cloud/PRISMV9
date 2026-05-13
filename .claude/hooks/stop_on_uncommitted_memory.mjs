#!/usr/bin/env node
// tier: T4
/**
 * stop_on_uncommitted_memory.mjs — Tier 6 Stop Hook
 * Warns when memory entries edited but not synced.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MEMORY_DIR = path.join(os.homedir(), ".claude", "projects", "H--PRISM", "memory");
const MEMORY_INDEX = path.join(MEMORY_DIR, "MEMORY.md");

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    // Check for recent memory file modifications
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith(".md"));
    const recentlyModified = files.filter(f => {
      try {
        const stat = fs.statSync(path.join(MEMORY_DIR, f));
        return Date.now() - stat.mtimeMs < 3600000; // <1h
      } catch { return false; }
    });

    // Check if MEMORY.md index was also updated
    if (recentlyModified.length > 0 && fs.existsSync(MEMORY_INDEX)) {
      const indexStat = fs.statSync(MEMORY_INDEX);
      const indexAge = Date.now() - indexStat.mtimeMs;

      if (indexAge > 3600000) {
        console.log(JSON.stringify({
          result: "warn",
          message: `${recentlyModified.length} memory files changed but MEMORY.md index not updated`
        }));
        return;
      }
    }

    console.log(JSON.stringify({ result: "pass" }));
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
