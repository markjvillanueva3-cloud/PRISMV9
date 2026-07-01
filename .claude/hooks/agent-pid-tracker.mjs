#!/usr/bin/env node
// tier: T4
/**
 * agent-pid-tracker.mjs — PostToolUse hook for Agent
 *
 * Tracks PIDs of spawned agent processes so node-orphan-cleaner
 * can reliably clean them up on session Stop.
 *
 * Also detects if an agent spawn failed or is hanging.
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const STATE_FILE = join("H:/prism/state/shared", "node-orphan-cleaner.state.json");
const MAX_TRACKED = 50; // Keep max 50 PIDs in tracking

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

function getRecentNodeProcesses() {
  try {
    // Get node processes started in the last 30 seconds
    const output = execSync(
      'wmic process where "name=\'node.exe\'" get processid,commandline,creationdate /format:csv',
      { windowsHide: true, encoding: "utf8", timeout: 5000 }
    );

    const processes = [];
    const lines = output.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("Node,"));
    const now = Date.now();

    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length >= 4) {
        const cmdLine = parts.slice(1, -2).join(",");
        const creationDate = parts[parts.length - 2];
        const pid = parseInt(parts[parts.length - 1]);

        if (pid && !isNaN(pid) && creationDate) {
          // Parse creation date
          try {
            const dateStr = creationDate.substring(0, 14);
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1;
            const day = parseInt(dateStr.substring(6, 8));
            const hour = parseInt(dateStr.substring(8, 10));
            const min = parseInt(dateStr.substring(10, 12));
            const sec = parseInt(dateStr.substring(12, 14));
            const created = new Date(year, month, day, hour, min, sec);
            const ageMs = now - created.getTime();

            // Only track processes created in the last 30 seconds
            if (ageMs < 30000 && ageMs >= 0) {
              processes.push({ pid, cmdLine, ageMs });
            }
          } catch { /* Skip malformed */ }
        }
      }
    }
    return processes;
  } catch {
    return [];
  }
}

async function main() {
  const toolName = stdinInput.tool_name || process.env.TOOL_NAME || "";

  // Only track Agent tool calls
  if (toolName !== "Agent") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const state = await readState();
  state.trackedPids = state.trackedPids || [];

  // Find recently spawned node processes (likely from this agent call)
  const recentProcesses = getRecentNodeProcesses();

  // Filter to PRISM/Claude related
  const agentProcesses = recentProcesses.filter(p => {
    const cmd = p.cmdLine.toLowerCase();
    return (
      cmd.includes("prism") ||
      cmd.includes("claude") ||
      cmd.includes("portable-node") ||
      cmd.includes("agent")
    ) && !cmd.includes("agent-pid-tracker"); // Don't track self
  });

  // Add to tracking
  for (const proc of agentProcesses) {
    const existing = state.trackedPids.find(t => t.pid === proc.pid);
    if (!existing) {
      state.trackedPids.push({
        pid: proc.pid,
        trackedAt: new Date().toISOString(),
        cmdSnippet: proc.cmdLine.substring(0, 100),
      });
    }
  }

  // Trim to max size (FIFO)
  if (state.trackedPids.length > MAX_TRACKED) {
    state.trackedPids = state.trackedPids.slice(-MAX_TRACKED);
  }

  await writeState(state);

  // Report if we're tracking new processes
  if (agentProcesses.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: `📋 Tracking ${agentProcesses.length} agent process(es) for cleanup: PIDs ${agentProcesses.map(p => p.pid).join(", ")}`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
