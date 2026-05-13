// tier: T0
/**
 * cross-terminal-conflict.mjs — Phase 1 Tier 5D
 *
 * PreTool hook that detects concurrent edits from multiple terminals.
 * Uses lock files and process heartbeats to prevent lost work.
 */

import * as fs from "fs";
import * as path from "path";

const LOCKS_DIR = "mcp-server/data/locks";
const HEARTBEAT_STALE_MS = 60000; // 1 minute

function getLockPath(filePath) {
  const hash = Buffer.from(filePath).toString("base64url").slice(0, 32);
  return path.join(process.cwd(), LOCKS_DIR, `file_${hash}.lock`);
}

function isLockStale(lockData) {
  const lastHeartbeat = new Date(lockData.lastHeartbeat || lockData.lockedAt);
  return Date.now() - lastHeartbeat.getTime() > HEARTBEAT_STALE_MS;
}

export default async function crossTerminalConflict({ tool, input }) {
  // Only check Write/Edit tools
  if (tool !== "Write" && tool !== "Edit") return undefined;

  const filePath = input?.file_path || input?.path || "";
  if (!filePath) return undefined;

  // Skip lock files themselves
  if (filePath.includes("/locks/")) return undefined;

  const lockPath = getLockPath(filePath);
  const currentPid = process.pid;
  const currentAgent = process.env.CLAUDE_AGENT_ID || `pid-${currentPid}`;

  // Ensure locks directory exists
  const locksDir = path.join(process.cwd(), LOCKS_DIR);
  if (!fs.existsSync(locksDir)) {
    fs.mkdirSync(locksDir, { recursive: true });
  }

  // Check for existing lock
  if (fs.existsSync(lockPath)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(lockPath, "utf-8"));

      // If lock is from different agent and not stale, block
      if (lockData.agentId !== currentAgent && !isLockStale(lockData)) {
        return {
          decision: "block",
          reason: `
╔══════════════════════════════════════════════════════════════╗
║         CROSS-TERMINAL CONFLICT — Phase 1 Tier 5D             ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: File is being edited by another terminal            ║
║                                                              ║
║ File: ${path.basename(filePath).slice(0,50).padEnd(50)}║
║ Locked by: ${lockData.agentId.slice(0,45).padEnd(45)}║
║ Since: ${lockData.lockedAt?.slice(0,49).padEnd(49)}║
║                                                              ║
║ Wait for the other session to complete, or coordinate        ║
║ via AGENT_CHAT.md to resolve the conflict.                   ║
╚══════════════════════════════════════════════════════════════╝
`
        };
      }
    } catch {
      // Corrupt lock file, remove it
      try { fs.unlinkSync(lockPath); } catch {}
    }
  }

  // Acquire lock
  const lockData = {
    agentId: currentAgent,
    pid: currentPid,
    filePath: filePath,
    lockedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString()
  };

  try {
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  } catch {
    // Can't write lock, proceed anyway
  }

  return undefined;
}

export const metadata = {
  id: "cross-terminal-conflict",
  phase: "1.5D",
  priority: 40,
  event: "PreTool"
};
