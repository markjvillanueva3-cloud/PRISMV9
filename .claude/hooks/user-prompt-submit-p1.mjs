// tier: T4
/**
 * user-prompt-submit-p1.mjs — Phase 1 Tier 0
 *
 * UserPromptSubmit hook that processes user input before execution.
 * Tracks prompts and injects awareness context.
 */

import * as fs from "fs";
import * as path from "path";

const SESSION_STATE_PATH = "mcp-server/data/state/session-state.json";
const PROMPT_LOG_PATH = "mcp-server/data/state/prompt-log.jsonl";

export default async function userPromptSubmitP1({ prompt }) {
  const promptTime = new Date().toISOString();
  const agentId = process.env.CLAUDE_AGENT_ID || `agent-${process.pid}`;

  try {
    // Log prompt (without sensitive content)
    const logPath = path.join(process.cwd(), PROMPT_LOG_PATH);
    const logDir = path.dirname(logPath);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = {
      timestamp: promptTime,
      agentId,
      promptLength: prompt?.length || 0,
      promptHash: Buffer.from(prompt?.slice(0, 100) || "").toString("base64").slice(0, 16),
      hasCode: /```/.test(prompt || ""),
      hasPath: /[A-Z]:[\\\/]|\/[\w-]+\//.test(prompt || "")
    };

    fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");

    // Update session state
    const statePath = path.join(process.cwd(), SESSION_STATE_PATH);
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        if (state.currentSession) {
          state.currentSession.promptCount =
            (state.currentSession.promptCount || 0) + 1;
          state.currentSession.lastActivity = promptTime;

          // Increase awareness slightly with each prompt (context building)
          state.currentSession.awarenessScore = Math.min(
            1.0,
            (state.currentSession.awarenessScore || 0.5) + 0.02
          );

          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        }
      } catch {}
    }

    return undefined; // Don't modify prompt
  } catch {
    return undefined;
  }
}

export const metadata = {
  id: "user-prompt-submit-p1",
  phase: "1.0",
  priority: 20,
  event: "UserPromptSubmit"
};
