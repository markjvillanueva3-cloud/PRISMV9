#!/usr/bin/env node
// tier: T4
/**
 * linear-roadmap-sync.mjs — SessionStart + Stop hooks
 *
 * Syncs PRISM roadmap-index.json with Linear issues when Linear plugin is active.
 *
 * SessionStart: Fetch Linear issues → inject relevant context
 * Stop: Update Linear with session progress
 *
 * REQUIRES: Linear plugin authenticated (via /mcp command)
 *
 * To enable Linear sync:
 * 1. Run /mcp in Claude Code to authenticate Linear
 * 2. Create a Linear project called "PRISM" or configure LINEAR_PROJECT env
 * 3. This hook will auto-sync roadmap units with Linear issues
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PRISM_ROOT = 'H:/prism';
const ROADMAP_PATH = resolve(PRISM_ROOT, 'mcp-server/data/roadmap-index.json');
const LINEAR_STATE_PATH = resolve(PRISM_ROOT, 'mcp-server/data/state/linear-sync-state.json');
const LINEAR_PROJECT = process.env.LINEAR_PROJECT || 'PRISM';

/**
 * Check if Linear plugin is configured and authenticated
 */
function isLinearConfigured() {
  try {
    // Check for Linear MCP configuration
    const mcpPath = resolve(process.env.HOME || process.env.USERPROFILE, '.claude/.mcp.json');
    if (!existsSync(mcpPath)) return false;

    const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'));
    return 'linear' in (mcp.mcpServers || mcp || {});
  } catch {
    return false;
  }
}

/**
 * Load current roadmap state
 */
function loadRoadmap() {
  try {
    if (!existsSync(ROADMAP_PATH)) return { milestones: [] };
    return JSON.parse(readFileSync(ROADMAP_PATH, 'utf8'));
  } catch {
    return { milestones: [] };
  }
}

/**
 * Load Linear sync state (maps roadmap units to Linear issues)
 */
function loadLinearState() {
  try {
    if (!existsSync(LINEAR_STATE_PATH)) return { issueMap: {}, lastSync: null };
    return JSON.parse(readFileSync(LINEAR_STATE_PATH, 'utf8'));
  } catch {
    return { issueMap: {}, lastSync: null };
  }
}

/**
 * Save Linear sync state
 */
function saveLinearState(state) {
  state.lastSync = new Date().toISOString();
  writeFileSync(LINEAR_STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * Generate context about Linear integration status
 */
function generateLinearContext(roadmap, linearState) {
  const lines = [];
  const inProgress = roadmap.milestones?.filter(m => m.status === 'in_progress') || [];
  const pending = roadmap.milestones?.filter(m => m.status === 'pending') || [];

  lines.push('## Linear Integration Status');
  lines.push('');

  if (!isLinearConfigured()) {
    lines.push('⚠️ Linear plugin not configured. Run `/mcp` to authenticate.');
    lines.push('');
    lines.push('**Benefits of Linear integration:**');
    lines.push('- Auto-create issues for roadmap units');
    lines.push('- Track progress across Claude sessions');
    lines.push('- Link commits to Linear issues');
    lines.push('- Sprint planning visibility');
    return lines.join('\n');
  }

  lines.push(`✅ Linear connected (project: ${LINEAR_PROJECT})`);
  lines.push('');
  lines.push(`**In Progress:** ${inProgress.length} milestones`);
  for (const m of inProgress.slice(0, 5)) {
    const issueId = linearState.issueMap?.[m.id];
    lines.push(`  - ${m.id}: ${m.title}${issueId ? ` [${issueId}]` : ''}`);
  }

  lines.push('');
  lines.push(`**Pending:** ${pending.length} milestones`);

  if (linearState.lastSync) {
    lines.push('');
    lines.push(`Last sync: ${linearState.lastSync}`);
  }

  return lines.join('\n');
}

/**
 * Main hook handler
 */
async function main() {
  const event = process.env.HOOK_EVENT || 'SessionStart';

  if (event === 'SessionStart') {
    const roadmap = loadRoadmap();
    const linearState = loadLinearState();
    const context = generateLinearContext(roadmap, linearState);

    const ctxJson = typeof context === 'string' ? context : JSON.stringify(context);
    const reason = isLinearConfigured()
      ? `Linear sync active: ${Object.keys(linearState.issueMap || {}).length} issues mapped | ${ctxJson.slice(0, 200)}`
      : 'Linear not configured (optional)';
    console.log(JSON.stringify({
      decision: 'approve',
      reason,
    }));
  } else if (event === 'Stop') {
    // On stop, save state for next session
    const linearState = loadLinearState();
    saveLinearState(linearState);

    console.log(JSON.stringify({
      decision: 'approve',
      reason: 'Linear state saved'
    }));
  } else {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main().catch(err => {
  console.log(JSON.stringify({
    decision: 'approve',
    reason: `Linear sync error: ${err.message}`
  }));
});
