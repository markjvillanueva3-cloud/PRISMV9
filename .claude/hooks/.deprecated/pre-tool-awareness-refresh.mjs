/**
 * pre-tool-awareness-refresh.mjs — Phase 1 Tier 0
 *
 * PreTool hook that refreshes awareness context when stale.
 * Ensures agent has current context before taking actions.
 */

import * as fs from "fs";
import * as path from "path";

const AWARENESS_STATE_PATH = "mcp-server/data/state/agent-memory.json";
const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const STALE_THRESHOLD_MS = 600000; // 10 minutes

function isAwarenessStale(lastUpdate) {
  if (!lastUpdate) return true;
  const lastTime = new Date(lastUpdate).getTime();
  return Date.now() - lastTime > STALE_THRESHOLD_MS;
}

export default async function preToolAwarenessRefresh({ tool, input }) {
  // Only check on write operations
  if (tool !== "Write" && tool !== "Edit" && tool !== "Bash") {
    return undefined;
  }

  // Skip for read-only bash commands
  if (tool === "Bash") {
    const cmd = input?.command || "";
    if (!cmd.includes("git commit") && !cmd.includes("rm ") && !cmd.includes("mv ")) {
      return undefined;
    }
  }

  try {
    const awarenessPath = path.join(process.cwd(), AWARENESS_STATE_PATH);

    if (!fs.existsSync(awarenessPath)) {
      // No awareness state = warn but don't block
      return {
        message: "⚠️ No awareness state found. Consider running /aware to build context."
      };
    }

    const awareness = JSON.parse(fs.readFileSync(awarenessPath, "utf-8"));

    if (isAwarenessStale(awareness.lastUpdate)) {
      // Check session awareness score
      const sessionPath = path.join(process.cwd(), SESSION_STATE_PATH);
      let awarenessScore = 0.5;

      if (fs.existsSync(sessionPath)) {
        try {
          const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
          awarenessScore = session.currentSession?.awarenessScore || 0.5;
        } catch {}
      }

      if (awarenessScore < 0.6) {
        return {
          message: `⚠️ Awareness is stale (last update: ${awareness.lastUpdate || "never"}). Score: ${(awarenessScore * 100).toFixed(0)}%. Consider running /aware before making changes.`
        };
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export const metadata = {
  id: "pre-tool-awareness-refresh",
  phase: "1.0",
  priority: 25,
  event: "PreTool"
};
