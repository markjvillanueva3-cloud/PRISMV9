#!/usr/bin/env node
/**
 * session-awareness-inject.mjs — UserPromptSubmit hook
 *
 * Injects real-time awareness of other active sessions.
 * READS FROM existing AGENT_COORDINATION_STATUS.json (no duplicate state).
 *
 * Shows what other Claude/Codex terminals are working on.
 */

import { promises as fs } from 'node:fs';

const STATUS_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_STATUS.json';
const STALE_MS = 300000; // 5 minutes (matches daemon)

async function readStatus() {
  try {
    return JSON.parse(await fs.readFile(STATUS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function getMyId() {
  const host = process.env.COMPUTERNAME || 'unknown';
  return `Claude@${host}/pid-${process.pid}`;
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'unknown';
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const status = await readStatus();
  if (!status) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const myId = getMyId();
  const now = Date.now();

  // Get active sessions from families
  const activeSessions = [];
  for (const family of (status.families || [])) {
    if (family.family === 'Agent') continue; // Skip subagents

    for (const instance of (family.instances || []).slice(0, 10)) {
      // Skip self
      if (instance.includes(`pid-${process.pid}`)) continue;

      activeSessions.push({
        id: instance,
        family: family.family
      });
    }
  }

  // Also check latest entry for current work
  const latest = status.latest_entry;
  const latestAge = latest?.timestamp ?
    Date.now() - new Date(latest.timestamp).getTime() : Infinity;

  // Only inject if there are other recent sessions
  if (activeSessions.length === 0 && latestAge > STALE_MS) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Build compact injection
  const otherCount = Math.min(activeSessions.length, 5);
  const lines = activeSessions.slice(0, 5).map(s => {
    const shortId = s.id.split('/')[0];
    return `  • ${shortId}`;
  });

  let injection = '';
  if (otherCount > 0) {
    injection = `## 🔗 ${otherCount} Other Session${otherCount > 1 ? 's' : ''} Online
${lines.join('\n')}`;
  }

  // Add latest activity if recent
  if (latest && latestAge < 60000 && !latest.agent_instance?.includes(`pid-${process.pid}`)) {
    const who = latest.agent_instance?.split('/')[0] || 'Someone';
    const what = latest.current || latest.message?.slice(0, 40) || 'working';
    injection += injection ? '\n' : '';
    injection += `**Latest:** ${who} — ${what} (${formatTimeAgo(latest.timestamp)} ago)`;
  }

  if (injection) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: injection
      }
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
