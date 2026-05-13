#!/usr/bin/env node
// tier: T4
/**
 * stop-index-sync.mjs — Stop hook for index synchronization
 *
 * Runs on session Stop to regenerate indices if engines/dispatchers were created.
 * Checks session write tracker for new .ts files in src/engines or src/tools/dispatchers.
 *
 * Regenerates:
 *   - MASTER_INDEX.json (if dispatchers changed)
 *   - CODE_SYSTEM_INDEX.json (if any tracked files changed)
 *   - PRISM-INVENTORY-LATEST.md (always, for accurate counts)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const REPO_ROOT = "H:/prism";
const TRACKER_DIR = "H:/prism/.claude/cache/session-writes";
const SCRIPTS = {
  masterIndex: path.join(REPO_ROOT, "scripts", "generate-master-index.mjs"),
  codeIndex: path.join(REPO_ROOT, "scripts", "regen-code-index.mjs"),
  inventory: path.join(REPO_ROOT, "scripts", "update-prism-inventory.mjs"),
};

function readTracker() {
  const files = [];
  try {
    if (!fs.existsSync(TRACKER_DIR)) return { files: [] };

    const sessions = fs.readdirSync(TRACKER_DIR)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => ({
        path: path.join(TRACKER_DIR, f),
        mtime: fs.statSync(path.join(TRACKER_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 3); // Last 3 sessions

    for (const session of sessions) {
      const lines = fs.readFileSync(session.path, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.file_path) files.push(entry.file_path);
        } catch {}
      }
    }
  } catch {}
  return { files };
}

function hasNewEngines(files) {
  return files.some(f => /[/\\]src[/\\]engines[/\\][^/\\]+\.ts$/.test(f));
}

function hasNewDispatchers(files) {
  return files.some(f => /[/\\]src[/\\]tools[/\\]dispatchers[/\\][^/\\]+\.ts$/.test(f));
}

function hasNewTests(files) {
  return files.some(f => /[/\\]src[/\\]__tests__[/\\][^/\\]+\.test\.ts$/.test(f));
}

function runScript(scriptPath, quiet = true) {
  if (!fs.existsSync(scriptPath)) return;

  const args = quiet ? [scriptPath, "--quiet"] : [scriptPath];
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    cwd: REPO_ROOT,
  });
  child.on("error", () => {});
  child.unref();
}

async function main() {
  const input = readStdinSafe();

  const tracker = readTracker();
  const files = tracker.files || [];

  if (files.length === 0) {
    process.exit(0);
  }

  const needsMasterIndex = hasNewDispatchers(files);
  const needsCodeIndex = hasNewEngines(files) || hasNewDispatchers(files) || hasNewTests(files);

  // Always update inventory for accurate counts
  runScript(SCRIPTS.inventory);

  if (needsCodeIndex) {
    runScript(SCRIPTS.codeIndex);
  }

  if (needsMasterIndex) {
    runScript(SCRIPTS.masterIndex, false);
  }

  // Log what we triggered
  const triggered = ["inventory"];
  if (needsCodeIndex) triggered.push("code-index");
  if (needsMasterIndex) triggered.push("master-index");

  console.log(JSON.stringify({
    continue: true,
    additionalContext: `Index sync triggered: ${triggered.join(", ")}`
  }));

  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
