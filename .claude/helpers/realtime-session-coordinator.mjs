#!/usr/bin/env node
/**
 * realtime-session-coordinator.mjs — Real-Time Cross-Session Coordination
 *
 * FIRES ON: SessionStart, UserPromptSubmit
 *
 * This coordinator ensures ALL sessions (Claude + Codex) are aware of:
 * 1. Critical commands that MUST be suggested
 * 2. What other sessions are currently doing
 * 3. Recent work completed by other sessions
 * 4. Commands that should be auto-invoked
 *
 * Reads from UNIFIED_COMMAND_BROADCAST.json for command awareness
 * Reads from AGENT_CHAT.jsonl for real-time coordination
 */

import { promises as fs } from "node:fs";
import process from "node:process";

const PATHS = {
  commandBroadcast: "H:/prism/state/shared/UNIFIED_COMMAND_BROADCAST.json",
  agentChat: "H:/prism/state/shared/AGENT_CHAT.jsonl",
  activeWork: "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json",
  coordinationStatus: "H:/prism/state/shared/AGENT_COORDINATION_STATUS.json",
};

async function readJSON(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function readJSONL(path, limit = 20) {
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

function matchCommands(prompt, commands) {
  const promptLower = prompt.toLowerCase();
  const matches = [];

  for (const [cmd, info] of Object.entries(commands)) {
    for (const trigger of info.triggers || []) {
      if (promptLower.includes(trigger.toLowerCase())) {
        matches.push({
          command: cmd,
          purpose: info.purpose,
          priority: info.priority || 99,
          auto_invoke: info.auto_invoke || false,
          requires_dedup: info.requires_dedup || false,
        });
        break;
      }
    }
  }

  // Sort by priority (lower = more important)
  return matches.sort((a, b) => a.priority - b.priority);
}

function getRecentChatMessages(chatEntries, minutesAgo = 30) {
  const cutoff = Date.now() - minutesAgo * 60 * 1000;
  return chatEntries.filter(entry => {
    const ts = new Date(entry.timestamp).getTime();
    return ts > cutoff && entry.agent !== "Agent"; // Skip generic "Agent" entries
  });
}

function extractWorkFromChat(chatEntries) {
  const work = {
    engines: [],
    milestones: [],
    domains: [],
    sessions: new Set(),
  };

  for (const entry of chatEntries) {
    work.sessions.add(`${entry.agent}@${entry.machine || "unknown"}`);

    const text = (entry.current || "") + " " + (entry.message || "");

    // Extract engines
    const engineMatches = text.match(/(\w+Engine)/g) || [];
    work.engines.push(...engineMatches);

    // Extract milestones
    const msMatches = text.match(/([A-Z]+-MS\d+[A-Za-z]?)/g) || [];
    work.milestones.push(...msMatches);

    // Extract domains
    const domains = ["lathe", "mill", "edm", "wire", "turning", "threading", "grinding", "post", "pp"];
    for (const domain of domains) {
      if (new RegExp(`\\b${domain}\\b`, "i").test(text)) {
        work.domains.push(domain);
      }
    }
  }

  return {
    engines: [...new Set(work.engines)],
    milestones: [...new Set(work.milestones)],
    domains: [...new Set(work.domains)],
    activeSessions: work.sessions.size,
  };
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const promptRaw = process.env.TOOL_INPUT_prompt || process.env.PROMPT || "";
  const isSessionStart = process.argv.includes("--session-start");

  const parts = [];

  // Load command broadcast
  const broadcast = await readJSON(PATHS.commandBroadcast);
  const chatEntries = await readJSONL(PATHS.agentChat, 50);

  // Get recent chat activity (last 30 minutes)
  const recentChat = getRecentChatMessages(chatEntries, 30);
  const recentWork = extractWorkFromChat(recentChat);

  // Match commands from prompt
  if (promptRaw && broadcast?.critical_commands) {
    const matches = matchCommands(promptRaw, broadcast.critical_commands);

    if (matches.length > 0) {
      const autoInvoke = matches.filter(m => m.auto_invoke);
      const requiresDedup = matches.filter(m => m.requires_dedup);

      if (requiresDedup.length > 0) {
        parts.push("⚠️ DEDUP REQUIRED: Run /dedup BEFORE creating new assets!");
      }

      if (autoInvoke.length > 0) {
        parts.push(`🎯 SUGGESTED COMMANDS: ${autoInvoke.map(m => `${m.command} (${m.purpose})`).join(" | ")}`);
      }
    }
  }

  // Show active sessions on session start
  if (isSessionStart) {
    parts.push("");
    parts.push("═══════════════════════════════════════════════════════════");
    parts.push("        CROSS-SESSION REAL-TIME COORDINATION ACTIVE");
    parts.push("═══════════════════════════════════════════════════════════");

    if (recentWork.activeSessions > 0) {
      parts.push(`ACTIVE SESSIONS (30m): ${recentWork.activeSessions}`);
    }

    if (recentWork.milestones.length > 0) {
      parts.push(`MILESTONES IN PROGRESS: ${recentWork.milestones.slice(0, 5).join(", ")}`);
    }

    if (recentWork.engines.length > 0) {
      parts.push(`ENGINES BEING WORKED ON: ${recentWork.engines.slice(0, 5).join(", ")}`);
    }

    if (recentWork.domains.length > 0) {
      parts.push(`ACTIVE DOMAINS: ${recentWork.domains.join(", ")}`);
    }

    // Always show critical commands on session start
    parts.push("");
    parts.push("CRITICAL COMMANDS (AUTO-SUGGEST WHEN TRIGGERED):");
    parts.push("  /pdf-learn     → PDFs, documents, manuals, catalogs");
    parts.push("  /video-learn   → Videos, YouTube, tutorials");
    parts.push("  /forge-triple  → Create engines+skills+hooks (run /dedup FIRST!)");
    parts.push("  /dedup         → MANDATORY before creating ANY new asset");
    parts.push("  /wire-edm-studio → Wire EDM programming");
    parts.push("  /lathe-studio  → Lathe/turning programming");
    parts.push("  /quote-to-ship → Quotes, estimates, job costing");
    parts.push("  /auto-speed-feed → Speed/feed calculations");
    parts.push("");
    parts.push("COORDINATION RULES:");
    parts.push("  1. CHECK other sessions' work before starting");
    parts.push("  2. POST to AGENT_CHAT when doing significant work");
    parts.push("  3. CLAIM milestones before working on them");
    parts.push("  4. RUN /dedup before creating engines/hooks/skills");
    parts.push("═══════════════════════════════════════════════════════════");
  }

  // Check for conflicts with current work
  if (promptRaw && recentWork.engines.length > 0) {
    const promptLower = promptRaw.toLowerCase();
    for (const engine of recentWork.engines) {
      if (promptLower.includes(engine.toLowerCase().replace("engine", ""))) {
        parts.push(`⚠️ CONFLICT: "${engine}" is being worked on by another session!`);
      }
    }
  }

  if (parts.length > 0) {
    console.log(JSON.stringify({
      additionalContext: parts.join("\n"),
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true })));
