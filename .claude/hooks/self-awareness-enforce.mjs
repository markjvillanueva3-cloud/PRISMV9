#!/usr/bin/env node
// tier: T1
/**
 * Self-Awareness Enforcement Hook (UserPromptSubmit)
 *
 * HARD RULE: Any forge/rgs/autopilot command MUST load self-awareness first.
 * This hook injects a warning if the command is invoked without awareness context.
 */

import { readFileSync, existsSync } from "fs";

const input = JSON.parse(readFileSync(process.stdin.fd, "utf8"));
const prompt = input.prompt?.toLowerCase() || "";

// Commands that require self-awareness
const AWARENESS_REQUIRED_COMMANDS = [
  "/forge", "/rgs", "/autopilot", "/autopilot-full", "/autopilot-camk",
  "/forge-triple", "/forge-engines", "/forge-wiring", "/forge-hooks",
  "/forge-safety", "/forge-audit", "/forge-learn", "/forge-mcp-wire"
];

// Check if any awareness-required command is being invoked
const commandMatch = AWARENESS_REQUIRED_COMMANDS.find(cmd =>
  prompt.includes(cmd) || prompt.startsWith(cmd.slice(1))
);

if (commandMatch) {
  // Check if session already loaded awareness (marker file)
  const awarenessMarker = process.env.PRISM_AWARENESS_LOADED === "true";

  if (!awarenessMarker) {
    // Inject self-awareness loading requirement
    const injection = `
## SELF-AWARENESS PROTOCOL (AUTO-INJECTED)
Before executing ${commandMatch}, you MUST:
1. Read H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md
2. Read H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json
3. Call PRISMSelfAwarenessEngine.recommendAIFeatures(taskDescription)
4. Call DuplicationGuardEngine.mustCheckBeforeCreating() for any new assets
5. Check cross-session-asset-registry.json for recent builds

Output the SELF-AWARENESS LOADED block before proceeding.
`;

    console.log(JSON.stringify({
      decision: "modify",
      modification: {
        prompt: prompt + "\n" + injection
      }
    }));
  } else {
    console.log(JSON.stringify({ decision: "approve" }));
  }
} else {
  console.log(JSON.stringify({ decision: "approve" }));
}
