// tier: T4
/**
 * awareness-bootstrap.mjs — Phase 0.13 Awareness Bootstrap
 *
 * SessionStart hook that initializes situational awareness context.
 * First hook in the SessionStart chain per HOOK_ORDER_REGISTRY.
 */

import * as fs from "fs";
import * as path from "path";

const AWARENESS_STATE_PATH = "mcp-server/data/state/agent-memory.json";
const GOAL_STACK_PATH = "mcp-server/data/state/GOAL_STACK.json";

export default async function awarenessBootstrap({ session }) {
  const basePath = process.cwd();
  const timestamp = new Date().toISOString();

  // 1. Initialize or load session awareness
  let awareness = {
    sessionId: session?.id || `session-${Date.now()}`,
    startedAt: timestamp,
    lastActivity: timestamp,
    context: {},
    capabilities: []
  };

  const awarenessPath = path.join(basePath, AWARENESS_STATE_PATH);
  if (fs.existsSync(awarenessPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(awarenessPath, "utf-8"));
      awareness = { ...existing, lastActivity: timestamp };
    } catch { /* use defaults */ }
  }

  // 2. Initialize goal stack if missing
  const goalStackPath = path.join(basePath, GOAL_STACK_PATH);
  if (!fs.existsSync(goalStackPath)) {
    const defaultGoalStack = {
      schemaVersion: 1,
      goals: [],
      completedToday: 0,
      lastUpdated: timestamp
    };
    fs.writeFileSync(goalStackPath, JSON.stringify(defaultGoalStack, null, 2));
  }

  // 3. Detect current phase from CURRENT_POSITION.md
  let currentPhase = "unknown";
  const positionPath = path.join(basePath, "state/CURRENT_POSITION.md");
  if (fs.existsSync(positionPath)) {
    const content = fs.readFileSync(positionPath, "utf-8");
    const match = content.match(/Phase:\s*([^\n]+)/i);
    if (match) currentPhase = match[1].trim();
  }

  // 4. Inject into session context
  return {
    inject: {
      awareness: {
        sessionId: awareness.sessionId,
        phase: currentPhase,
        startedAt: awareness.startedAt
      }
    },
    message: `Awareness bootstrap: ${currentPhase}`
  };
}

// Hook metadata for HOOK_ORDER_REGISTRY
export const metadata = {
  id: "awareness-bootstrap",
  phase: "0.13",
  priority: 1,
  dependsOn: [],
  event: "SessionStart"
};
