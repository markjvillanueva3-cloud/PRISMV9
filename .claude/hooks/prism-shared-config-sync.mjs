/**
 * prism-shared-config-sync.mjs (Hermes Mode Aware)
 * Respects PRISM_HERMES_MODE toggle for quick switching between behaviors.
 */

import fs from 'fs';

const CENTRAL = 'H:/prism/state/shared/PRISM_SHARED_ROUTING_CONFIG.json';
const CLAUDE_SETTINGS = 'C:/Users/wompu/.claude/settings.json';

export async function syncSharedConfig(event = 'manual') {
  const central = JSON.parse(fs.readFileSync(CENTRAL, 'utf8'));
  const claude = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  const env = claude.env || {};

  const hermesMode = env.PRISM_HERMES_MODE === "1";

  if (hermesMode) {
    // === Hermes-like aggressive local-first behavior ===
    env.PRISM_MODEL_ROUTER_ENABLED = "1";
    env.PRISM_DEFAULT_TO_LOCAL_FIRST = "1";
    env.PRISM_CLAUDE_ESCALATION_THRESHOLD = "0.65";
    env.PRISM_AUTO_INVOCATION_ENABLED = "1";
    env.PRISM_PREFER_OLLAMA_FOR_BUILD = "1";
    env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY = "24";
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = "120000";
    
    console.log(`[PRISM] Hermes Mode ACTIVE (${event})`);
  } else {
    // === Default Claude Code behavior (more conservative) ===
    env.PRISM_MODEL_ROUTER_ENABLED = "0";
    env.PRISM_DEFAULT_TO_LOCAL_FIRST = "0";
    env.PRISM_AUTO_INVOCATION_ENABLED = "0";
    env.PRISM_PREFER_OLLAMA_FOR_BUILD = "0";
    
    console.log(`[PRISM] Hermes Mode DISABLED - using default Claude behavior (${event})`);
  }

  claude.env = env;
  fs.writeFileSync(CLAUDE_SETTINGS, JSON.stringify(claude, null, 2));
}
