#!/usr/bin/env node
// tier: T4
/**
 * coordination-startup-banner.mjs (U-COORD06)
 *
 * SessionStart hook that displays cross-session coordination status.
 * Shows: "Connected to coordination daemon (N sessions online)"
 */

import * as fs from 'fs';

const SUMMARY_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_SUMMARY.json';

function readSummary() {
  try {
    return JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const summary = readSummary();

  if (!summary) {
    console.log(JSON.stringify({
      result: 'Coordination: offline (no summary file)'
    }));
    return;
  }

  const { daemon_active, active_sessions, health } = summary;

  let statusLine;
  if (!daemon_active) {
    statusLine = 'Coordination: daemon offline';
  } else if (health === 'healthy') {
    const others = Math.max(0, active_sessions - 1);
    statusLine = others > 0
      ? `Coordination: ${others} other session${others > 1 ? 's' : ''} online`
      : 'Coordination: connected (solo session)';
  } else {
    statusLine = `Coordination: ${health}`;
  }

  console.log(JSON.stringify({
    result: statusLine
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ result: 'Coordination: check failed' }));
});
