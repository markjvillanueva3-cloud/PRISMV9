/**
 * awareness-floor.mjs — Phase 1 Tier 5D
 *
 * PreTool hook that blocks commits when awareness score < 0.80.
 * Ensures agent has sufficient context before committing work.
 */

import * as fs from "fs";
import * as path from "path";

const AWARENESS_STATE_PATH = "mcp-server/data/state/agent-memory.json";
const AWARENESS_FLOOR = 0.80;

export default async function awarenessFloor({ tool, input }) {
  // Only check Bash tool with git commit
  if (tool !== "Bash") return undefined;

  const cmd = input?.command || "";
  if (!cmd.includes("git commit")) return undefined;

  // Read awareness state
  const statePath = path.join(process.cwd(), AWARENESS_STATE_PATH);
  if (!fs.existsSync(statePath)) {
    // No state file = can't verify awareness, allow with warning
    return undefined;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    const awarenessScore = state.awarenessScore ?? state.contextScore ?? 1.0;

    if (awarenessScore < AWARENESS_FLOOR) {
      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║              AWARENESS FLOOR — Phase 1 Tier 5D                ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Awareness score ${awarenessScore.toFixed(2)} < ${AWARENESS_FLOOR} floor            ║
║                                                              ║
║ You don't have enough context to commit safely.              ║
║ Run /aware or /reflect to rebuild context before committing. ║
║                                                              ║
║ Or set BYPASS_AWARENESS_FLOOR=true if confident.             ║
╚══════════════════════════════════════════════════════════════╝
`
      };
    }
  } catch {
    // Parse error, allow with warning
  }

  return undefined;
}

export const metadata = {
  id: "awareness-floor",
  phase: "1.5D",
  priority: 50,
  event: "PreTool"
};
