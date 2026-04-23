#!/usr/bin/env node
/**
 * bash-destructive-guard.mjs - PreToolUse Bash
 * Blocks or warns on destructive shell commands.
 * Prevents accidental data loss.
 */

import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Bash') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const command = tool_input?.command || '';

// BLOCK: Extremely dangerous commands
const blockPatterns = [
  { pattern: /rm\s+(-[rf]+\s+)*[\/~]\s*$/, reason: 'rm on root or home directory' },
  { pattern: /rm\s+-rf\s+\//, reason: 'rm -rf on absolute root path' },
  { pattern: />\s*\/dev\/sd[a-z]/, reason: 'writing to block device' },
  { pattern: /mkfs\./, reason: 'filesystem format command' },
  { pattern: /dd\s+.*of=\/dev\//, reason: 'dd to block device' },
  { pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, reason: 'fork bomb' },
];

for (const { pattern, reason } of blockPatterns) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `🛑 BLOCKED: ${reason}\n  Command: ${command}\n  This command is too dangerous to execute.`
    }));
    process.exit(0);
  }
}

// WARN: Potentially destructive commands
const warnPatterns = [
  { pattern: /rm\s+-rf?\s+/, msg: 'rm -rf can delete entire directories' },
  { pattern: /git\s+reset\s+--hard/, msg: 'git reset --hard discards uncommitted changes' },
  { pattern: /git\s+clean\s+-[fd]+/, msg: 'git clean removes untracked files' },
  { pattern: /git\s+push\s+.*--force/, msg: 'force push overwrites remote history' },
  { pattern: /git\s+push\s+.*-f\b/, msg: 'force push overwrites remote history' },
  { pattern: /git\s+checkout\s+--\s+\./, msg: 'git checkout -- . discards all local changes' },
  { pattern: /git\s+stash\s+drop/, msg: 'git stash drop permanently removes stash' },
  { pattern: /git\s+branch\s+-D/, msg: 'git branch -D force-deletes branch' },
  { pattern: /truncate\s+/, msg: 'truncate empties file contents' },
  { pattern: />\s*\S+\.(ts|js|json|md|py)/, msg: 'redirect may overwrite source file' },
  { pattern: /pkill|killall/, msg: 'kills processes by name (broad match)' },
  { pattern: /DROP\s+(TABLE|DATABASE)/i, msg: 'SQL DROP is destructive' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;?\s*$/i, msg: 'DELETE without WHERE affects all rows' },
];

for (const { pattern, msg } of warnPatterns) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `⚠️ Destructive command detected: ${msg}\n  Command: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}\n  Consider: backup first, or use safer alternative.`,
      },
    }));
    process.exit(0);
  }
}

console.log(JSON.stringify({ continue: true }));
