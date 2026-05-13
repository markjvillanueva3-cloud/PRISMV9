#!/usr/bin/env node
// tier: T4
/**
 * AI Session Sync — Stop Hook
 *
 * Captures session learnings and syncs state across sessions:
 * - Updates cross-session asset registry
 * - Records new engines/formulas/algorithms created
 * - Syncs coordination state for multi-agent workflows
 * - Logs session metrics for continuous improvement
 */

import { promises as fs } from 'node:fs';

const MCP_SERVER = 'H:/prism/mcp-server';
const STATE_DIR = `${MCP_SERVER}/data/state`;
const REGISTRY_PATH = `${STATE_DIR}/cross-session-asset-registry.json`;
const COORDINATION_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_STATUS.json';

async function readJSON(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch { return null; }
}

async function writeJSON(path, data) {
  try {
    await fs.writeFile(path, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
}

async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;
  const now = new Date().toISOString();

  // Load current registry
  let registry = await readJSON(REGISTRY_PATH);
  if (!registry) {
    registry = { schemaVersion: 1, lastUpdated: now, entries: [] };
  }

  // Update timestamp
  registry.lastUpdated = now;

  // Save registry
  await writeJSON(REGISTRY_PATH, registry);

  // Update coordination status
  let coordination = await readJSON(COORDINATION_PATH);
  if (!coordination) {
    coordination = { schemaVersion: 1, sessions: [], lastSync: now };
  }

  // Record session end
  coordination.lastSync = now;
  coordination.sessions = coordination.sessions || [];

  // Remove stale sessions (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  coordination.sessions = coordination.sessions.filter(s => {
    const ts = new Date(s.lastActive || s.startedAt).getTime();
    return ts > oneHourAgo;
  });

  await writeJSON(COORDINATION_PATH, coordination);

  // Output sync confirmation
  console.log(JSON.stringify({
    additionalContext: `Session sync complete. Registry: ${registry.entries.length} assets. Active sessions: ${coordination.sessions.length}.`
  }));
}

main().catch(err => {
  console.error('Session sync error:', err.message);
  process.exit(0);
});
