#!/usr/bin/env node
/**
 * coordination-summary-generator.mjs (U-COORD01)
 *
 * Generates lightweight AGENT_COORDINATION_SUMMARY.json (<5KB)
 * for fast reads instead of parsing 155KB status file on every prompt.
 *
 * Called by daemon to update summary when full status changes.
 */

import * as fs from 'fs';

const STATUS_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_STATUS.json';
const SUMMARY_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_SUMMARY.json';
const STALE_MS = 300000; // 5 minutes

function readFullStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function isRecent(timestamp) {
  if (!timestamp) return false;
  return Date.now() - new Date(timestamp).getTime() < STALE_MS;
}

function generateSummary(status) {
  if (!status) {
    return {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      daemon_active: false,
      active_sessions: 0,
      sessions: [],
      latest_activity: null,
      health: 'offline'
    };
  }

  // Count active sessions (exclude stale)
  const activeSessions = [];
  for (const family of (status.families || [])) {
    if (family.family === 'Agent') continue; // Skip subagents

    for (const instance of (family.instances || []).slice(0, 20)) {
      activeSessions.push({
        id: instance,
        family: family.family
      });
    }
  }

  // Get latest activity
  const latest = status.latest_entry;
  const latestRecent = latest && isRecent(latest.timestamp);

  // Determine health
  let health = 'healthy';
  if (!status.daemon?.active) health = 'daemon_offline';
  else if (activeSessions.length === 0) health = 'no_sessions';
  else if (!latestRecent) health = 'stale';

  return {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    daemon_active: status.daemon?.active || false,
    daemon_pid: status.daemon?.pid || null,
    active_sessions: activeSessions.length,
    sessions: activeSessions.slice(0, 10).map(s => ({
      id: s.id.split('/')[0], // Compact: "Claude@HOST" not full path
      family: s.family
    })),
    latest_activity: latestRecent ? {
      who: latest.agent_instance?.split('/')[0] || 'Unknown',
      what: (latest.current || latest.message || '').slice(0, 50),
      when: latest.timestamp
    } : null,
    health,
    full_status_size_kb: Math.round((fs.statSync(STATUS_PATH).size || 0) / 1024)
  };
}

function writeSummary(summary) {
  try {
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to write summary:', err.message);
    return false;
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const status = readFullStatus();
  const summary = generateSummary(status);

  if (writeSummary(summary)) {
    const size = JSON.stringify(summary).length;
    console.log(`Summary generated: ${summary.active_sessions} sessions, ${size} bytes, health: ${summary.health}`);
  }
}

// Run if called directly
main().catch(console.error);

export { generateSummary, writeSummary, readFullStatus };
