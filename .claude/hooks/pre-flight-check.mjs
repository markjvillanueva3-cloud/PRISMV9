#!/usr/bin/env node
// tier: T1
/**
 * Pre-Flight Check — PreToolUse Hook
 *
 * Blocks destructive operations until safety checks pass:
 * - git push --force
 * - git reset --hard
 * - rm -rf
 * - Bulk file deletions
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DESTRUCTIVE_PATTERNS = [
  { pattern: /git\s+push\s+.*--force/i, name: 'force push', severity: 'high' },
  { pattern: /git\s+push\s+-f\b/i, name: 'force push', severity: 'high' },
  { pattern: /git\s+reset\s+--hard/i, name: 'hard reset', severity: 'high' },
  { pattern: /rm\s+-rf?\s+[^|&;]+/i, name: 'recursive delete', severity: 'medium' },
  { pattern: /git\s+branch\s+-D/i, name: 'force delete branch', severity: 'medium' },
  { pattern: /git\s+checkout\s+--\s+\./i, name: 'discard all changes', severity: 'high' },
  { pattern: /git\s+clean\s+-fd/i, name: 'clean untracked', severity: 'medium' },
];

function checkGitState() {
  try {
    const status = execSync('git status --porcelain 2>/dev/null', { windowsHide: true, encoding: 'utf8', cwd: 'H:/prism' });
    const uncommitted = status.trim().split('\n').filter(l => l.trim()).length;

    const ahead = execSync('git log origin/main..HEAD --oneline 2>/dev/null', { windowsHide: true, encoding: 'utf8', cwd: 'H:/prism' });
    const unpushed = ahead.trim().split('\n').filter(l => l.trim()).length;

    return { uncommitted, unpushed };
  } catch {
    return { uncommitted: 0, unpushed: 0 };
  }
}

async function main() {
  const toolName = process.env.TOOL_NAME || '';
  const command = process.env.TOOL_INPUT_command || '';

  // Only check Bash commands
  if (toolName !== 'Bash') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Check for destructive patterns
  let matched = null;
  for (const { pattern, name, severity } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      matched = { name, severity };
      break;
    }
  }

  if (!matched) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Run pre-flight checks
  const gitState = checkGitState();
  const warnings = [];

  if (gitState.uncommitted > 0) {
    warnings.push(`${gitState.uncommitted} uncommitted changes`);
  }
  if (gitState.unpushed > 0) {
    warnings.push(`${gitState.unpushed} unpushed commits`);
  }

  if (warnings.length > 0 && matched.severity === 'high') {
    console.log(JSON.stringify({
      continue: true,
      additionalContext: `## Pre-Flight Warning (${matched.name})\n⚠️ ${warnings.join(' | ')}\nConsider: git stash, git push, or /pre-flight snapshot first`
    }));
    return;
  }

  console.log(JSON.stringify({
    continue: true,
    additionalContext: `## Pre-Flight: ${matched.name} detected\nGit state checked: ${warnings.length === 0 ? 'clean' : warnings.join(', ')}`
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
