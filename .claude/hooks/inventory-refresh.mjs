#!/usr/bin/env node
/**
 * Inventory Refresh — SessionStart hook
 *
 * Regenerates PRISM-INVENTORY-LATEST.md at the start of each chat session,
 * throttled to once per 24 hours. Runs in the background so it never delays
 * session start.
 *
 * Throttle: H:/prism/.claude/cache/inventory-last-refresh.txt (ISO timestamp).
 * TTL: 24h.
 *
 * Output: silent on success (no stdout). Errors logged to
 *   H:/prism/.claude/cache/inventory-refresh.log
 * Never blocks session start regardless of result.
 *
 * Related: AGI-INFRA INV-AUTO-MS2. Script: scripts/update-prism-inventory.mjs.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = "H:/prism/.claude/cache";
const THROTTLE_FILE = path.join(CACHE_DIR, "inventory-last-refresh.txt");
const LOG_FILE = path.join(CACHE_DIR, "inventory-refresh.log");
const TTL_MS = 24 * 60 * 60 * 1000;

// Resolve script relative to the hook location, so this works from the main
// tree, a worktree, or wherever the hook is invoked from. Hook lives at
// <repo-root>/.claude/hooks/ so the script is at <repo-root>/scripts/.
const SCRIPT_CANDIDATES = [
  path.join(__dirname, "..", "..", "scripts", "update-prism-inventory.mjs"),
  "H:/prism/scripts/update-prism-inventory.mjs",
];

function resolveScript() {
  for (const p of SCRIPT_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function logErr(msg) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch {
    // give up silently
  }
}

function isThrottled() {
  try {
    const ts = fs.readFileSync(THROTTLE_FILE, "utf8").trim();
    const last = Date.parse(ts);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last < TTL_MS;
  } catch {
    return false;
  }
}

function markRefreshed() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(THROTTLE_FILE, new Date().toISOString() + "\n", "utf8");
  } catch {
    // non-fatal
  }
}

function main() {
  // Read hook input but don't require it
  let _buf = "";
  process.stdin.on("data", (c) => (_buf += c));
  process.stdin.on("end", () => {
    if (isThrottled()) process.exit(0);
    const script = resolveScript();
    if (!script) {
      logErr(`inventory script not found in any of: ${SCRIPT_CANDIDATES.join(", ")}`);
      process.exit(0);
    }

    // Spawn detached so the session isn't blocked
    const child = spawn(process.execPath, [script, "--quiet"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", (e) => logErr(`spawn error: ${e.message}`));
    child.unref();
    markRefreshed();
    process.exit(0);
  });

  // If stdin closes immediately, handle that too
  setTimeout(() => process.stdin.destroy(), 200);
}

main();
