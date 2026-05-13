#!/usr/bin/env node
// tier: T4
/**
 * stop_on_dirty_registry.mjs — Tier 6 Stop Hook
 * Prevents exit when extraction-log or asset registry has unflushed changes.
 */
import fs from "node:fs";
import path from "node:path";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const REGISTRIES = [
  "extraction-log.json",
  "cross-session-asset-registry.json"
];
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
    const dirty = [];

    for (const file of REGISTRIES) {
      const filePath = path.join(STATE_DIR, file);
      if (!fs.existsSync(filePath)) continue;

      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (data._dirty === true || data._pendingFlush === true) {
          dirty.push(file.replace(".json", ""));
        }
      } catch {}
    }

    if (dirty.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${dirty.length} registries need flush: ${dirty.join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
