// tier: T1
/**
 * session-continuity-chain.mjs — U-CTX05 Multi-Session Handoff Chain
 *
 * Manages the 5-session handoff chain for cross-session context continuity.
 * - SessionStart: Loads last 5 sessions, injects compressed summaries
 * - SessionEnd: Appends current session to chain, prunes old
 *
 * Compression strategy:
 * - Sessions 1-2 (most recent): raw data preserved
 * - Sessions 3-5 (older): summarized to ~500 tokens each
 *
 * @hook SessionStart, SessionEnd
 */

import fs from 'fs';
import path from 'path';

const CHAIN_PATH = 'H:/prism/mcp-server/data/state/SESSION_CONTINUITY_CHAIN.json';
const MAX_SESSIONS = 5;
const RAW_CUTOFF = 2; // Sessions 1-2 are raw, 3-5 are summarized

function readChain() {
  try {
    if (fs.existsSync(CHAIN_PATH)) {
      return JSON.parse(fs.readFileSync(CHAIN_PATH, 'utf-8'));
    }
  } catch {}
  return {
    schemaVersion: 1,
    maxSessions: MAX_SESSIONS,
    sessions: [],
    lastUpdate: new Date().toISOString()
  };
}

function writeChain(chain) {
  try {
    chain.lastUpdate = new Date().toISOString();
    fs.writeFileSync(CHAIN_PATH, JSON.stringify(chain, null, 2));
  } catch (err) {
    console.error(`[session-chain] Write failed: ${err.message}`);
  }
}

function summarizeSession(session) {
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    family: session.family,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    summary: `${session.family} session (${session.totalToolCalls || 0} tools). ` +
      `Worked on: ${(session.milestonesWorked || []).slice(0, 3).join(', ') || 'unknown'}. ` +
      `Key: ${(session.keyDecisions || []).slice(0, 2).join('; ') || 'none recorded'}`,
    commits: (session.commits || []).slice(0, 5),
    _compressed: true
  };
}

function buildContextInjection(chain) {
  if (!chain.sessions || chain.sessions.length === 0) {
    return null;
  }

  const lines = ['## Prior Session Context (last 5)'];

  chain.sessions.slice(0, MAX_SESSIONS).forEach((session, idx) => {
    const isRecent = idx < RAW_CUTOFF;
    const label = isRecent ? '[RECENT]' : '[OLDER]';

    if (session._compressed) {
      lines.push(`${idx + 1}. ${label} ${session.summary}`);
    } else {
      const commits = (session.commits || []).slice(0, 3).join(', ') || 'none';
      const milestones = (session.milestonesWorked || []).slice(0, 3).join(', ') || 'unknown';
      lines.push(`${idx + 1}. ${label} ${session.family}@${session.machine || 'unknown'} — ` +
        `${session.totalToolCalls || 0} tools, milestones: ${milestones}, commits: ${commits}`);
      if (session.handoffNotes) {
        lines.push(`   → ${session.handoffNotes}`);
      }
    }
  });

  return lines.join('\n');
}

export default async function sessionContinuityChain(event) {
  const hookType = event?.hookType;
  const chain = readChain();

  if (hookType === 'SessionStart') {
    // Inject prior session context
    const injection = buildContextInjection(chain);

    if (injection) {
      return {
        decision: "approve",
        additionalContext: injection
      };
    }
    return { decision: "approve" };
  }

  if (hookType === 'SessionEnd') {
    // Append current session to chain
    const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;
    const family = process.env.CLAUDE_FAMILY || 'Claude';
    const machine = process.env.COMPUTERNAME || 'unknown';

    // Read session state for metrics
    let sessionState = {};
    try {
      const statePath = 'H:/prism/mcp-server/data/state/session-state.json';
      if (fs.existsSync(statePath)) {
        sessionState = JSON.parse(fs.readFileSync(statePath, 'utf-8')).currentSession || {};
      }
    } catch {}

    // Read recent commits
    let commits = [];
    try {
      const { execSync } = await import('child_process');
      const log = execSync('cd H:/prism && git log --oneline -5 --format="%h"', { encoding: 'utf-8' });
      commits = log.trim().split('\n').filter(Boolean);
    } catch {}

    const newSession = {
      sessionId,
      family,
      machine,
      startedAt: sessionState.startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      totalToolCalls: sessionState.toolCalls || 0,
      totalTokens: sessionState.tokensUsed || 0,
      commits,
      milestonesWorked: sessionState.milestonesWorked || [],
      keyDecisions: sessionState.keyDecisions || [],
      filesModified: (sessionState.filesModified || []).slice(0, 20),
      reasoningHighlights: sessionState.reasoningHighlights || [],
      handoffNotes: sessionState.handoffNotes || null
    };

    // Compress older sessions
    const updatedSessions = [newSession];

    chain.sessions.forEach((session, idx) => {
      if (updatedSessions.length >= MAX_SESSIONS) return;

      // Sessions beyond RAW_CUTOFF get compressed
      if (idx >= RAW_CUTOFF - 1 && !session._compressed) {
        updatedSessions.push(summarizeSession(session));
      } else {
        updatedSessions.push(session);
      }
    });

    chain.sessions = updatedSessions;
    writeChain(chain);

    return { decision: "approve" };
  }

  return { decision: "approve" };
}
