#!/usr/bin/env node
/**
 * node-orphan-cleaner.mjs — Stop hook
 *
 * Cleans up orphan Node.js processes left behind by agent spawns.
 * Identifies processes by:
 *   1. PIDs tracked in state file from agent spawns
 *   2. Long-running node processes with PRISM/Claude patterns
 *
 * Safe: Won't kill current session, parent processes, or unrelated node instances.
 */

import { execSync, spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const STATE_FILE = join("H:/prism/state/shared", "node-orphan-cleaner.state.json");
const MAX_ORPHAN_AGE_MS = 5 * 60 * 1000; // 5 minutes - processes older than this are suspect

// Parse stdin for hook input
let stdinInput = {};
try {
  const stdin = readFileSync(0, "utf-8").trim();
  if (stdin) stdinInput = JSON.parse(stdin);
} catch { /* No stdin */ }

async function readState() {
  try {
    const data = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { trackedPids: [], lastCleanup: null };
  }
}

async function writeState(state) {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch { /* non-critical */ }
}

function getNodeProcesses() {
  try {
    // Windows: use wmic for detailed process info
    const output = execSync(
      'wmic process where "name=\'node.exe\'" get processid,commandline,creationdate /format:csv',
      { encoding: "utf8", timeout: 10000 }
    );

    const processes = [];
    const lines = output.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("Node,"));

    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length >= 4) {
        const cmdLine = parts.slice(1, -2).join(","); // CommandLine can have commas
        const creationDate = parts[parts.length - 2];
        const pid = parseInt(parts[parts.length - 1]);

        if (pid && !isNaN(pid)) {
          processes.push({ pid, cmdLine, creationDate });
        }
      }
    }
    return processes;
  } catch {
    return [];
  }
}

function isOrphanCandidate(proc, currentPid, parentPid) {
  // Never kill current process or parent
  if (proc.pid === currentPid || proc.pid === parentPid) return false;

  const cmd = proc.cmdLine.toLowerCase();

  // Must be PRISM/Claude related
  const isPrismRelated =
    cmd.includes("prism") ||
    cmd.includes("claude") ||
    cmd.includes("portable-node") ||
    cmd.includes("mcp-server") ||
    cmd.includes(".claude");

  if (!isPrismRelated) return false;

  // Skip known legitimate long-running processes
  const isLegitimate =
    cmd.includes("mcp-server/dist/index") || // Main MCP server
    cmd.includes("ollama") ||
    cmd.includes("daemon");

  if (isLegitimate) return false;

  return true;
}

function killProcess(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const state = await readState();
  const currentPid = process.pid;
  const parentPid = process.ppid;

  const nodeProcesses = getNodeProcesses();
  const killed = [];
  const failed = [];

  // 1. Kill tracked PIDs that are still running
  for (const tracked of state.trackedPids || []) {
    const proc = nodeProcesses.find(p => p.pid === tracked.pid);
    if (proc) {
      if (killProcess(tracked.pid)) {
        killed.push({ pid: tracked.pid, reason: "tracked" });
      } else {
        failed.push(tracked.pid);
      }
    }
  }

  // 2. Find and kill orphan candidates
  for (const proc of nodeProcesses) {
    if (killed.some(k => k.pid === proc.pid)) continue; // Already killed

    if (isOrphanCandidate(proc, currentPid, parentPid)) {
      // Parse creation date (YYYYMMDDHHMMSS.FFFFFF+TZO format)
      let ageMs = MAX_ORPHAN_AGE_MS + 1; // Default to old enough
      try {
        if (proc.creationDate) {
          const dateStr = proc.creationDate.substring(0, 14);
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const hour = parseInt(dateStr.substring(8, 10));
          const min = parseInt(dateStr.substring(10, 12));
          const sec = parseInt(dateStr.substring(12, 14));
          const created = new Date(year, month, day, hour, min, sec);
          ageMs = Date.now() - created.getTime();
        }
      } catch { /* Use default */ }

      // Only kill if older than threshold (avoid killing fresh processes)
      if (ageMs > MAX_ORPHAN_AGE_MS) {
        if (killProcess(proc.pid)) {
          killed.push({ pid: proc.pid, reason: "orphan", ageMs });
        } else {
          failed.push(proc.pid);
        }
      }
    }
  }

  // Update state
  state.trackedPids = [];
  state.lastCleanup = new Date().toISOString();
  state.lastKilled = killed;
  await writeState(state);

  // Report
  if (killed.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `🧹 Cleaned up ${killed.length} orphan Node process(es): ${killed.map(k => `PID ${k.pid}`).join(", ")}`,
    }));
  } else {
    process.stdout.write("{}");
  }
}

main().catch(() => process.stdout.write("{}"));
