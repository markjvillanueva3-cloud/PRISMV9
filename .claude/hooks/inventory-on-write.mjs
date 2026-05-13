#!/usr/bin/env node
// tier: T3
/**
 * Inventory On-Write — PostToolUse hook
 *
 * Triggers inventory refresh after Write operations to:
 *   - src/engines/*.ts (new engines)
 *   - src/__tests__/*.ts (new tests)
 *   - src/tools/dispatchers/*.ts (new dispatchers)
 *
 * Throttled to once per 5 minutes to avoid spam during batch creation.
 * Runs in background, never blocks the tool response.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = "H:/prism/.claude/cache";
const THROTTLE_FILE = path.join(CACHE_DIR, "inventory-write-last.txt");
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const TRACKED_PATTERNS = [
  /[/\\]src[/\\]engines[/\\][^/\\]+\.ts$/,
  /[/\\]src[/\\]__tests__[/\\][^/\\]+\.test\.ts$/,
  /[/\\]src[/\\]tools[/\\]dispatchers[/\\][^/\\]+\.ts$/,
];

const INVENTORY_SCRIPT_CANDIDATES = [
  path.join(__dirname, "..", "..", "scripts", "update-prism-inventory.mjs"),
  "H:/prism/scripts/update-prism-inventory.mjs",
];

const SYNC_SCRIPT_CANDIDATES = [
  path.join(__dirname, "..", "..", "scripts", "sync-awareness-counts.mjs"),
  "H:/prism/scripts/sync-awareness-counts.mjs",
];

function resolveScript(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
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

function isTrackedPath(filePath) {
  if (!filePath) return false;
  return TRACKED_PATTERNS.some((re) => re.test(filePath));
}

async function main() {
  const input = readStdinSafe();

  try {
    const data = JSON.parse(input);

    // PostToolUse: check if tool was Write and path is tracked
    if (data.tool_name !== "Write") {
      process.exit(0);
    }

    const filePath = data.tool_input?.file_path || "";
    if (!isTrackedPath(filePath)) {
      process.exit(0);
    }

    // Throttle check
    if (isThrottled()) {
      process.exit(0);
    }

    const inventoryScript = resolveScript(INVENTORY_SCRIPT_CANDIDATES);
    const syncScript = resolveScript(SYNC_SCRIPT_CANDIDATES);

    if (!inventoryScript) {
      process.exit(0);
    }

    // Spawn detached background process for inventory update
    const child1 = spawn(process.execPath, [inventoryScript, "--quiet"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child1.on("error", () => {});
    child1.unref();

    // Also spawn sync script to update CLAUDE.md counts (runs after inventory)
    if (syncScript) {
      setTimeout(() => {
        const child2 = spawn(process.execPath, [syncScript, "--quiet"], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        child2.on("error", () => {});
        child2.unref();
      }, 500); // Small delay to let inventory script write first
    }

    markRefreshed();

  } catch {
    // Invalid JSON or other error - exit silently
  }

  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });