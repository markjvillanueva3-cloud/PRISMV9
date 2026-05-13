// tier: T4
/**
 * session-end-p1.mjs — Phase 1 Tier 0
 *
 * Stop/SessionEnd hook that finalizes session state.
 * Ensures clean handoff and no orphaned work.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const SESSION_HISTORY_PATH = "mcp-server/data/state/session-history.json";
const CLAIMS_PATH = "mcp-server/data/state/active-claims.json";

export default async function sessionEndP1() {
  const endTime = new Date().toISOString();
  const agentId = process.env.CLAUDE_AGENT_ID || `agent-${process.pid}`;

  try {
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
    let sessionState = null;

    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        sessionState = state.currentSession;

        // Finalize session
        if (sessionState) {
          sessionState.endTime = endTime;
          sessionState.status = "completed";
          sessionState.duration = Date.now() - new Date(sessionState.startTime).getTime();

          state.lastCompletedSession = sessionState;
          state.currentSession = null;

          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        }
      } catch {}
    }

    // Add to session history
    if (sessionState) {
      const historyPath = path.join(process.cwd(), SESSION_HISTORY_PATH);
      let history = { sessions: [] };

      if (fs.existsSync(historyPath)) {
        try {
          history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
        } catch {}
      }

      history.sessions.push({
        sessionId: sessionState.sessionId,
        agentId,
        startTime: sessionState.startTime,
        endTime,
        toolCalls: sessionState.toolCalls || 0,
        filesModified: sessionState.filesModified?.length || 0,
        commitsMade: sessionState.commitsMade?.length || 0
      });

      // Keep last 500 sessions
      history.sessions = history.sessions.slice(-500);
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }

    // Release any claims held by this agent
    const claimsPath = path.join(process.cwd(), CLAIMS_PATH);
    if (fs.existsSync(claimsPath)) {
      try {
        const claims = JSON.parse(fs.readFileSync(claimsPath, "utf-8"));
        let released = 0;

        if (claims.activeClaims) {
          for (const [key, claim] of Object.entries(claims.activeClaims)) {
            if (claim.agentId === agentId) {
              delete claims.activeClaims[key];
              released++;
            }
          }

          if (released > 0) {
            fs.writeFileSync(claimsPath, JSON.stringify(claims, null, 2));
          }
        }
      } catch {}
    }

    return {
      message: `Session ended. State finalized.`
    };
  } catch (err) {
    return {
      message: `Session end warning: ${err.message}`
    };
  }
}

export const metadata = {
  id: "session-end-p1",
  phase: "1.0",
  priority: 90,
  event: "Stop"
};
