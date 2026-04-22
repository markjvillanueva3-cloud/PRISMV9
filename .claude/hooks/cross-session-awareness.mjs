#!/usr/bin/env node
/**
 * cross-session-awareness.mjs — Force Cross-Session Visibility
 *
 * PreToolUse hook that READS other sessions' work before every tool call.
 * Injects warnings when another session is active on related work.
 *
 * This closes the loop — sessions are FORCED to see each other.
 */

import * as fs from "fs";
import * as os from "os";

const WORK_REGISTRY = "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json";
const WORKBOARD_JSON = "H:/prism/state/shared/AGENT_WORKBOARD.json";
const AGENT_CHAT = "H:/prism/state/shared/AGENT_CHAT.md";
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Only check once per minute
const LAST_CHECK_FILE = "H:/prism/state/shared/.cross-session-last-check.json";

function getMySessionId() {
  return `${os.hostname()}-${process.ppid || process.pid}`;
}

function shouldCheck() {
  try {
    if (fs.existsSync(LAST_CHECK_FILE)) {
      const data = JSON.parse(fs.readFileSync(LAST_CHECK_FILE, "utf-8"));
      const lastCheck = new Date(data.lastCheck || 0).getTime();
      if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
        return false; // Too soon
      }
    }
  } catch {
    // Check anyway
  }
  return true;
}

function markChecked() {
  try {
    fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify({
      lastCheck: new Date().toISOString(),
      checker: getMySessionId(),
    }));
  } catch {
    // Ignore
  }
}

function getOtherActiveSessions() {
  const others = [];
  const now = Date.now();
  const myId = getMySessionId();

  // Check ACTIVE_WORK_REGISTRY
  try {
    if (fs.existsSync(WORK_REGISTRY)) {
      const registry = JSON.parse(fs.readFileSync(WORK_REGISTRY, "utf-8"));
      for (const [sessionId, session] of Object.entries(registry.sessions || {})) {
        if (sessionId === myId) continue;
        const lastSeen = new Date(session.lastSeen || 0).getTime();
        if (now - lastSeen < STALE_THRESHOLD_MS) {
          others.push({
            id: sessionId.split("-").pop(), // Just PID
            work: session.currentWork || "unknown",
            units: (session.activeUnits || []).slice(0, 3),
            minutesAgo: Math.round((now - lastSeen) / 60000),
          });
        }
      }
    }
  } catch {
    // Ignore
  }

  // Also check AGENT_WORKBOARD for more detail
  try {
    if (fs.existsSync(WORKBOARD_JSON)) {
      const workboard = JSON.parse(fs.readFileSync(WORKBOARD_JSON, "utf-8"));
      for (const [instanceId, instance] of Object.entries(workboard.instances || {})) {
        const lastUpdated = new Date(instance.last_updated || 0).getTime();
        if (now - lastUpdated < STALE_THRESHOLD_MS) {
          // Check if already in others
          const pid = instanceId.match(/pid-(\d+)/)?.[1];
          if (pid && !others.find((o) => o.id === pid)) {
            others.push({
              id: pid,
              work: instance.current || "unknown",
              family: instance.agent_family,
              minutesAgo: Math.round((now - lastUpdated) / 60000),
            });
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  return others;
}

function getRecentChatMessages() {
  try {
    if (!fs.existsSync(AGENT_CHAT)) return [];
    const content = fs.readFileSync(AGENT_CHAT, "utf-8");
    const lines = content.split("\n").filter((l) => l.startsWith("- "));
    // Get last 5 messages from other agents
    return lines.slice(-5).map((l) => l.slice(2).trim());
  } catch {
    return [];
  }
}

async function main() {
  // Rate limit checks
  if (!shouldCheck()) {
    process.exit(0);
  }
  markChecked();

  const others = getOtherActiveSessions();
  const recentChat = getRecentChatMessages();

  if (others.length === 0 && recentChat.length === 0) {
    process.exit(0);
  }

  // Build awareness message
  const parts = [];

  if (others.length > 0) {
    const summary = others.slice(0, 3).map((o) => {
      const units = o.units?.length > 0 ? ` [${o.units.join(", ")}]` : "";
      return `${o.family || "Session"} ${o.id}: ${o.work}${units} (${o.minutesAgo}m ago)`;
    }).join(" | ");
    parts.push(`OTHER SESSIONS ACTIVE: ${summary}`);
  }

  if (recentChat.length > 0) {
    parts.push(`Recent comms: ${recentChat.slice(-2).join(" // ")}`);
  }

  if (parts.length > 0) {
    console.log(JSON.stringify({
      additionalContext: `[CrossSession] ${parts.join(" | ")}`,
    }));
  }
}

main().catch(() => process.exit(0));
