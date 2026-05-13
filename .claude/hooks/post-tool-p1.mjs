// tier: T4
/**
 * post-tool-p1.mjs — Phase 1 Tier 0
 *
 * PostTool hook that tracks tool execution and updates session state.
 * Foundation for monitoring and metrics collection.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";

export default async function postToolP1({ tool, input, output }) {
  const toolTime = new Date().toISOString();

  try {
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);

    if (!fs.existsSync(statePath)) return undefined;

    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    if (!state.currentSession) return undefined;

    // Increment tool call count
    state.currentSession.toolCalls = (state.currentSession.toolCalls || 0) + 1;
    state.currentSession.lastActivity = toolTime;

    // Track file modifications
    if (tool === "Write" || tool === "Edit") {
      const filePath = input?.file_path || input?.path;
      if (filePath && !state.currentSession.filesModified.includes(filePath)) {
        state.currentSession.filesModified.push(filePath);
      }

      // Increase awareness when reading/modifying files
      state.currentSession.awarenessScore = Math.min(
        1.0,
        (state.currentSession.awarenessScore || 0.5) + 0.03
      );
    }

    // Track reads (increase awareness)
    if (tool === "Read") {
      state.currentSession.awarenessScore = Math.min(
        1.0,
        (state.currentSession.awarenessScore || 0.5) + 0.01
      );
    }

    // Track commits
    if (tool === "Bash" && input?.command?.includes("git commit")) {
      const commitMatch = String(output).match(/\[[\w-]+ ([a-f0-9]+)\]/);
      if (commitMatch) {
        if (!state.currentSession.commitsMade) {
          state.currentSession.commitsMade = [];
        }
        state.currentSession.commitsMade.push({
          hash: commitMatch[1],
          time: toolTime
        });
      }
    }

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return undefined;
  } catch {
    return undefined;
  }
}

export const metadata = {
  id: "post-tool-p1",
  phase: "1.0",
  priority: 85,
  event: "PostTool"
};
