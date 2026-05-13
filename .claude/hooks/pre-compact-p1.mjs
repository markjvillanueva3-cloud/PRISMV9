// tier: T4
/**
 * pre-compact-p1.mjs — Phase 1 Tier 0
 *
 * PreCompact hook that saves critical state before compaction.
 * Ensures no work is lost during context compression.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const SURVIVAL_PATH = ".claude/helpers/.compaction-survival.md";
const HANDOFF_DIR = "state/shared";

export default async function preCompactP1() {
  const preCompactTime = new Date().toISOString();

  try {
    // Read current session state
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
    let sessionState = {};

    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        sessionState = state.currentSession || {};
      } catch {}
    }

    // Build pre-compact snapshot
    const snapshot = {
      timestamp: preCompactTime,
      sessionId: sessionState.sessionId || "unknown",
      toolCalls: sessionState.toolCalls || 0,
      filesModified: sessionState.filesModified || [],
      pendingWork: sessionState.pendingWork || [],
      awarenessScore: sessionState.awarenessScore || 0.5
    };

    // Write to survival file
    const survivalPath = path.join(process.cwd(), SURVIVAL_PATH);
    const survivalDir = path.dirname(survivalPath);

    if (!fs.existsSync(survivalDir)) {
      fs.mkdirSync(survivalDir, { recursive: true });
    }

    let survivalContent = `# Compaction Survival State
## Generated: ${preCompactTime}

## Session State
- Session ID: ${snapshot.sessionId}
- Tool Calls: ${snapshot.toolCalls}
- Files Modified: ${snapshot.filesModified.length}
- Awareness Score: ${snapshot.awarenessScore}

## Pending Work
${snapshot.pendingWork.length > 0
  ? snapshot.pendingWork.map(w => `- ${w}`).join("\n")
  : "None tracked"}

## Files Modified This Session
${snapshot.filesModified.length > 0
  ? snapshot.filesModified.slice(-20).map(f => `- ${f}`).join("\n")
  : "None"}
`;

    fs.writeFileSync(survivalPath, survivalContent);

    // Mark session state as pre-compact
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        if (state.currentSession) {
          state.currentSession.preCompactSnapshot = snapshot;
          state.currentSession.preCompactTime = preCompactTime;
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        }
      } catch {}
    }

    return {
      message: `Pre-compact snapshot saved. ${snapshot.filesModified.length} files tracked.`
    };
  } catch (err) {
    return {
      message: `Pre-compact warning: ${err.message}`
    };
  }
}

export const metadata = {
  id: "pre-compact-p1",
  phase: "1.0",
  priority: 5,
  event: "PreCompact"
};
