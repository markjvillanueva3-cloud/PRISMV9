/**
 * post-write-sync-awareness.mjs — Phase 1 Tier 0
 *
 * PostTool hook (Write|Edit) that syncs awareness state after file changes.
 * Ensures awareness system reflects current file state.
 */

import * as fs from "fs";
import * as path from "path";

const AWARENESS_STATE_PATH = "mcp-server/data/state/agent-memory.json";
const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";

// High-value files that significantly increase awareness
const HIGH_VALUE_PATTERNS = [
  /CLAUDE\.md$/i,
  /roadmap.*\.md$/i,
  /HANDOFF.*\.md$/i,
  /settings\.json$/i,
  /dispatcher.*\.ts$/i
];

function isHighValueFile(filePath) {
  return HIGH_VALUE_PATTERNS.some(p => p.test(filePath));
}

export default async function postWriteSyncAwareness({ tool, input }) {
  // Only trigger on Write or Edit
  if (tool !== "Write" && tool !== "Edit") return undefined;

  const filePath = input?.file_path || input?.path || "";
  if (!filePath) return undefined;

  const syncTime = new Date().toISOString();

  try {
    // Update awareness state
    const awarenessPath = path.join(process.cwd(), AWARENESS_STATE_PATH);
    let awareness = { modifiedFiles: [], lastUpdate: null };

    if (fs.existsSync(awarenessPath)) {
      try {
        awareness = JSON.parse(fs.readFileSync(awarenessPath, "utf-8"));
      } catch {}
    }

    // Track modified file
    if (!awareness.modifiedFiles) awareness.modifiedFiles = [];
    if (!awareness.modifiedFiles.includes(filePath)) {
      awareness.modifiedFiles.push(filePath);
    }

    // Cap at 100 tracked files
    awareness.modifiedFiles = awareness.modifiedFiles.slice(-100);
    awareness.lastUpdate = syncTime;

    // Update awareness score based on file type
    const sessionPath = path.join(process.cwd(), SESSION_STATE_PATH);
    if (fs.existsSync(sessionPath)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
        if (session.currentSession) {
          const boost = isHighValueFile(filePath) ? 0.05 : 0.02;
          session.currentSession.awarenessScore = Math.min(
            1.0,
            (session.currentSession.awarenessScore || 0.5) + boost
          );
          fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
        }
      } catch {}
    }

    fs.writeFileSync(awarenessPath, JSON.stringify(awareness, null, 2));

    return undefined;
  } catch {
    return undefined;
  }
}

export const metadata = {
  id: "post-write-sync-awareness",
  phase: "1.0",
  priority: 80,
  event: "PostTool"
};
