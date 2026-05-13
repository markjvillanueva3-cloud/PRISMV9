// tier: T4
/**
 * session-start-compact-p1.mjs — Phase 1 Tier 0
 *
 * SessionStart:compact hook that handles context compaction events.
 * Preserves critical state through compaction boundaries.
 */

import * as fs from "fs";
import * as path from "path";

const COMPACTION_LOG_PATH = "mcp-server/data/state/compaction-log.json";
const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const SURVIVAL_PATH = ".claude/helpers/.compaction-survival.md";

export default async function sessionStartCompactP1() {
  const compactionTime = new Date().toISOString();
  const agentId = process.env.CLAUDE_AGENT_ID || `agent-${process.pid}`;

  try {
    // Log compaction event
    const logPath = path.join(process.cwd(), COMPACTION_LOG_PATH);
    let log = { compactions: [] };

    if (fs.existsSync(logPath)) {
      try {
        log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
      } catch {}
    }

    // Get session context before compaction
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
    let sessionContext = {};
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        sessionContext = state.currentSession || {};
      } catch {}
    }

    log.compactions.push({
      timestamp: compactionTime,
      agentId,
      sessionId: sessionContext.sessionId || "unknown",
      toolCallsBeforeCompact: sessionContext.toolCalls || 0,
      filesModifiedBeforeCompact: sessionContext.filesModified?.length || 0
    });

    // Keep last 100 compactions
    log.compactions = log.compactions.slice(-100);
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

    // Update survival file timestamp
    const survivalPath = path.join(process.cwd(), SURVIVAL_PATH);
    if (fs.existsSync(survivalPath)) {
      const content = fs.readFileSync(survivalPath, "utf-8");
      const updated = content.replace(
        /## Generated: .*/,
        `## Generated: ${compactionTime}`
      );
      fs.writeFileSync(survivalPath, updated);
    }

    // Increment compaction counter in session state
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        if (state.currentSession) {
          state.currentSession.compactionCount =
            (state.currentSession.compactionCount || 0) + 1;
          state.currentSession.lastCompaction = compactionTime;
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        }
      } catch {}
    }

    return {
      message: `Compaction logged. Session context preserved.`
    };
  } catch (err) {
    return {
      message: `Compaction hook warning: ${err.message}`
    };
  }
}

export const metadata = {
  id: "session-start-compact-p1",
  phase: "1.0",
  priority: 10,
  event: "SessionStart:compact"
};
