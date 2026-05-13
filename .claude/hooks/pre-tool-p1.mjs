// tier: T0
/**
 * pre-tool-p1.mjs — Phase 1 Tier 0
 *
 * PreTool hook that validates tool calls before execution.
 * Foundation for all pre-execution checks.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const FEATURE_FLAGS_PATH = "state/shared/HOOK_FEATURE_FLAGS.json";

// Tools that should always be allowed
const ALWAYS_ALLOWED = ["Read", "Glob", "Grep", "LS"];

function checkFeatureFlags() {
  const flagsPath = path.join(process.cwd(), FEATURE_FLAGS_PATH);
  if (!fs.existsSync(flagsPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(flagsPath, "utf-8"));
  } catch {
    return {};
  }
}

export default async function preToolP1({ tool, input }) {
  const flags = checkFeatureFlags();

  // Check if hooks are globally disabled
  if (flags.disableAllHooks) {
    return undefined;
  }

  // Always allow read-only tools
  if (ALWAYS_ALLOWED.includes(tool)) {
    return undefined;
  }

  // Update session last activity
  try {
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      if (state.currentSession) {
        state.currentSession.lastActivity = new Date().toISOString();
        state.currentSession.lastTool = tool;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      }
    }
  } catch {
    // Non-blocking
  }

  // Check for dangerous patterns in Bash commands
  if (tool === "Bash") {
    const cmd = input?.command || "";

    // Block rm -rf on critical paths
    if (/rm\s+-rf?\s+[\/\\]/.test(cmd) || /rm\s+-rf?\s+\*/.test(cmd)) {
      if (!flags.allowDangerousBash) {
        return {
          decision: "block",
          reason: "Blocked: Dangerous rm command. Set allowDangerousBash flag to override."
        };
      }
    }

    // Block force push to main
    if (/git\s+push.*--force.*main|git\s+push.*-f.*main/.test(cmd)) {
      return {
        decision: "block",
        reason: "Blocked: Force push to main is not allowed."
      };
    }
  }

  return undefined;
}

export const metadata = {
  id: "pre-tool-p1",
  phase: "1.0",
  priority: 15,
  event: "PreTool"
};
