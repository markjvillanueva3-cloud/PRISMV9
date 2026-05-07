#!/usr/bin/env node
/**
 * codex-command-awareness.mjs — Command Awareness for Codex Sessions
 *
 * Codex sessions should run this at startup to get command awareness:
 *   node H:/prism/.claude/helpers/codex-command-awareness.mjs
 *
 * This provides the same command awareness that Claude sessions get via hooks.
 */

import { promises as fs } from "node:fs";

const PATHS = {
  commandBroadcast: "H:/prism/state/shared/UNIFIED_COMMAND_BROADCAST.json",
  directive: "H:/prism/state/shared/CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md",
  agentChat: "H:/prism/state/shared/AGENT_CHAT.jsonl",
  activeWork: "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json",
};

async function readJSON(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function readJSONL(path, limit = 10) {
  try {
    const raw = await fs.readFile(path, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const broadcast = await readJSON(PATHS.commandBroadcast);
  const recentChat = await readJSONL(PATHS.agentChat, 10);
  const activeWork = await readJSON(PATHS.activeWork);

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("           PRISM CODEX SESSION — COMMAND AWARENESS ACTIVE");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log("CRITICAL COMMANDS (AUTO-SUGGEST WHEN TRIGGERS DETECTED):");
  console.log("");

  if (broadcast?.critical_commands) {
    const sorted = Object.entries(broadcast.critical_commands)
      .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));

    for (const [cmd, info] of sorted.slice(0, 10)) {
      const triggers = (info.triggers || []).slice(0, 4).join(", ");
      console.log(`  ${cmd.padEnd(20)} — ${info.purpose}`);
      console.log(`     Triggers: ${triggers}`);
    }
  } else {
    console.log("  /pdf-learn         — AI PDF extraction (triggers: pdf, document, manual)");
    console.log("  /video-learn       — AI video extraction (triggers: video, youtube, tutorial)");
    console.log("  /forge-triple      — Engine+skill+hook creation (triggers: create, forge)");
    console.log("  /dedup             — MANDATORY duplicate check (triggers: before creating)");
    console.log("  /wire-edm-studio   — Wire EDM programming (triggers: wire edm, wedm)");
    console.log("  /lathe-studio      — Lathe programming (triggers: lathe, turning)");
    console.log("  /quote-to-ship     — Quote pipeline (triggers: quote, estimate)");
    console.log("  /auto-speed-feed   — Speed/feed calc (triggers: speed, feed)");
  }

  console.log("");
  console.log("MANDATORY RULES:");
  console.log("  1. ALWAYS suggest /pdf-learn when ANY PDF/document is mentioned");
  console.log("  2. ALWAYS suggest /video-learn when ANY video/tutorial is mentioned");
  console.log("  3. ALWAYS run /dedup BEFORE creating ANY new engine/hook/skill");
  console.log("  4. ALWAYS use /forge-triple (not /forge-engine) for new capabilities");
  console.log("");

  // Show recent cross-session activity
  if (recentChat.length > 0) {
    console.log("RECENT CROSS-SESSION ACTIVITY:");
    const claudeChat = recentChat.filter(c => c.agent !== "Agent").slice(-3);
    for (const entry of claudeChat) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`  [${time}] ${entry.agent}: ${(entry.current || entry.message || "").substring(0, 60)}...`);
    }
    console.log("");
  }

  // Show active work
  if (activeWork?.active?.length > 0) {
    console.log("ACTIVE WORK (avoid duplicating):");
    for (const work of activeWork.active.slice(-5)) {
      console.log(`  [${work.type}] ${work.name} (session ${work.session})`);
    }
    console.log("");
  }

  console.log("COORDINATION:");
  console.log("  - Read: UNIFIED_COMMAND_BROADCAST.json for command mappings");
  console.log("  - Check: ACTIVE_WORK_REGISTRY.json before starting work");
  console.log("  - Post: AGENT_CHAT.jsonl when doing significant work");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch(console.error);
