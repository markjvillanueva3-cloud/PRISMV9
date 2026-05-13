// tier: T4
/**
 * session-start-p1.mjs — Phase 1 Tier 0
 *
 * SessionStart hook that initializes session state and loads context.
 * Foundation for all other session lifecycle management.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const AGENT_PROFILES_PATH = "mcp-server/data/state/agent-profiles.json";

function generateSessionId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  const random = Math.random().toString(36).slice(2, 6);
  return `S${datePart}-${timePart}-${random}`;
}

export default async function sessionStartP1() {
  const sessionId = generateSessionId();
  const startTime = new Date().toISOString();
  const agentId = process.env.CLAUDE_AGENT_ID || `agent-${process.pid}`;

  // Initialize session state
  const sessionState = {
    sessionId,
    agentId,
    startTime,
    status: "active",
    toolCalls: 0,
    filesModified: [],
    commitsMade: [],
    awarenessScore: 0.5, // Start at 50%, build up
    lastActivity: startTime
  };

  const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
  const stateDir = path.dirname(statePath);

  try {
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Merge with existing if present (for session resume)
    let existing = {};
    if (fs.existsSync(statePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      } catch {}
    }

    const merged = {
      ...existing,
      currentSession: sessionState,
      sessions: [...(existing.sessions || []).slice(-99), sessionState]
    };

    fs.writeFileSync(statePath, JSON.stringify(merged, null, 2));

    // Update agent profile
    const profilesPath = path.join(process.cwd(), AGENT_PROFILES_PATH);
    if (fs.existsSync(profilesPath)) {
      try {
        const profiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
        if (!profiles.agents) profiles.agents = {};

        profiles.agents[agentId] = {
          ...profiles.agents[agentId],
          lastSessionId: sessionId,
          lastActive: startTime,
          sessionCount: (profiles.agents[agentId]?.sessionCount || 0) + 1
        };

        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
      } catch {}
    }

    // Set environment for other hooks
    process.env.PRISM_SESSION_ID = sessionId;

    return {
      message: `Session initialized: ${sessionId}`
    };
  } catch (err) {
    return {
      message: `Session init warning: ${err.message}`
    };
  }
}

export const metadata = {
  id: "session-start-p1",
  phase: "1.0",
  priority: 5,
  event: "SessionStart"
};
