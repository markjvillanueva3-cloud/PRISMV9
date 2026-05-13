#!/usr/bin/env node
// tier: T3
/**
 * Coordination Update Reminder Hook (PostToolUse for Bash git commit)
 *
 * Enforces CLAUDE-CODEX-COORDINATION-DIRECTIVE.md:
 * - After git commits, remind agent to update coordination surfaces
 * - After completing major tasks, suggest workboard update
 *
 * Warning hook: continueOnError = true
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const COORDINATION_SURFACES = [
  'H:/prism/state/shared/AGENT_WORKBOARD.md',
  'H:/prism/state/shared/AGENT_CHAT.md',
  'H:/prism/state/shared/AGENT_COORDINATION_STATUS.md'
];

const COMMIT_COUNT_FILE = 'H:/prism/state/shared/.coordination-commit-counter.json';

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getCommitCount() {
  try {
    if (existsSync(COMMIT_COUNT_FILE)) {
      const data = JSON.parse(readFileSync(COMMIT_COUNT_FILE, 'utf8'));
      return data.count || 0;
    }
  } catch {}
  return 0;
}

function setCommitCount(count) {
  try {
    ensureDir(COMMIT_COUNT_FILE);
    writeFileSync(COMMIT_COUNT_FILE, JSON.stringify({ count, updated: new Date().toISOString() }));
  } catch {}
}

function main() {
  try {
    const command = process.env.TOOL_INPUT_command || process.env.TOOL_INPUT || '';
    const tool = process.env.TOOL || '';

    // Only check Bash commits
    if (tool !== 'Bash') {
      process.exit(0);
    }

    // Check if this is a git commit
    const isCommit = command.includes('git commit') && !command.includes('--amend');
    if (!isCommit) {
      process.exit(0);
    }

    // Increment commit counter
    let commitCount = getCommitCount() + 1;
    setCommitCount(commitCount);

    // Every 3 commits, remind about coordination update
    if (commitCount % 3 === 0) {
      console.log(JSON.stringify({
        additionalContext: `COORDINATION DIRECTIVE REMINDER: ${commitCount} commits since last coordination update.\n` +
          `Consider updating shared surfaces:\n` +
          `  node H:\\prism\\.claude\\helpers\\agent-coordination.mjs post --message "current: ... | next: ... | done: ..."\n` +
          `Or use /chat to post a quick status update.`
      }));
    }

    process.exit(0);

  } catch (err) {
    // Silent failure - this is advisory
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
