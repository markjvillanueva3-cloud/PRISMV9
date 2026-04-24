#!/usr/bin/env node
/**
 * bash-destructive-guard.mjs - PreToolUse Bash
 * Blocks or warns on destructive shell commands. Prevents accidental data loss.
 *
 * Git rules mirror GitSafetyEngine (mcp-server/src/engines/GitSafetyEngine.ts) —
 * 10-rule classifier with confirmationPrompt + saferAlternative + protected-branch
 * detection. Kept inline here because hooks can't import from the TS source at
 * runtime. Keep the rule set in sync when GitSafetyEngine changes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'node:path';
import os from 'node:os';

// ── BlastDampenerEngine mirror (U-FORE-17): sliding-window rate limiter
// for destructive operations. If a user insists on the same warn-level
// destructive git command 3+ times within 10 minutes, escalate to block.
const BLAST_WINDOW_MS = 10 * 60 * 1000;
const BLAST_MAX = 3;
const BLAST_FILE = join(os.tmpdir(), 'prism-hook-state', 'bash-destructive-blast.json');
function blastLoad() { try { return JSON.parse(readFileSync(BLAST_FILE, 'utf8')); } catch { return {}; } }
function blastSave(s) {
  try {
    const d = dirname(BLAST_FILE);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    writeFileSync(BLAST_FILE, JSON.stringify(s));
  } catch { /* ignore */ }
}
function blastRecordAndCheck(ruleIds) {
  const now = Date.now();
  const state = blastLoad();
  let overLimit = null;
  for (const id of ruleIds) {
    const times = (state[id] || []).filter((t) => t > now - BLAST_WINDOW_MS);
    times.push(now);
    state[id] = times;
    if (times.length >= BLAST_MAX) overLimit = { id, count: times.length };
  }
  for (const k of Object.keys(state)) {
    const filtered = state[k].filter((t) => t > now - BLAST_WINDOW_MS * 2);
    if (filtered.length === 0) delete state[k];
    else state[k] = filtered;
  }
  blastSave(state);
  return overLimit;
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Bash') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const command = tool_input?.command || '';

// ── Filesystem-level hard blocks (not in GitSafetyEngine scope) ──
const fsBlockPatterns = [
  { pattern: /rm\s+(-[rf]+\s+)*[\/~]\s*$/, reason: 'rm on root or home directory' },
  { pattern: /rm\s+-rf\s+\//, reason: 'rm -rf on absolute root path' },
  { pattern: />\s*\/dev\/sd[a-z]/, reason: 'writing to block device' },
  { pattern: /mkfs\./, reason: 'filesystem format command' },
  { pattern: /dd\s+.*of=\/dev\//, reason: 'dd to block device' },
  { pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, reason: 'fork bomb' },
];

for (const { pattern, reason } of fsBlockPatterns) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `🛑 BLOCKED: ${reason}\n  Command: ${command}\n  This command is too dangerous to execute.`,
    }));
    process.exit(0);
  }
}

// ── GitSafetyEngine rule mirror ──
// Each rule: { id, severity, pattern, impact, confirm, saferAlternative? }
const gitRules = [
  {
    id: 'push_force',
    severity: 'block',
    pattern: /\bgit\s+push\s+[^#\n]*--force(?!-with-lease)\b/,
    impact: 'Rewrites remote history and can permanently destroy teammates\' commits.',
    confirm: 'Do you really want to overwrite the remote branch and drop anything others pushed?',
    saferAlternative: 'git push --force-with-lease',
  },
  {
    id: 'reset_hard',
    severity: 'block',
    pattern: /\bgit\s+reset\s+[^#\n]*--hard\b/,
    impact: 'Discards all uncommitted changes in the working tree. They are NOT recoverable from `git stash`.',
    confirm: 'Every unstaged and staged change will be lost. Continue?',
    saferAlternative: 'git stash push -u && git reset',
  },
  {
    id: 'branch_force_delete',
    severity: 'warn',
    pattern: /\bgit\s+branch\s[^#\n]*-D(?:\s|$)/,
    impact: 'Deletes a branch even if it has unmerged commits that live nowhere else.',
    confirm: 'The branch has unmerged work. Delete anyway?',
    saferAlternative: 'git branch -d <branch>  # refuses if unmerged',
  },
  {
    id: 'checkout_discard',
    severity: 'warn',
    pattern: /\bgit\s+checkout\s+--\s+\./,
    impact: 'Discards all unstaged changes in the working tree.',
    confirm: 'All unsaved edits will be thrown away. Continue?',
    saferAlternative: 'git stash push -u',
  },
  {
    id: 'restore_discard_all',
    severity: 'warn',
    pattern: /\bgit\s+restore\s+--worktree\s+\./,
    impact: 'Discards all unstaged changes in the working tree.',
    confirm: 'All unsaved edits will be thrown away. Continue?',
    saferAlternative: 'git stash push -u',
  },
  {
    id: 'clean_force',
    severity: 'block',
    pattern: /\bgit\s+clean\s+[^#\n]*-f[dx]{0,2}/,
    impact: 'Deletes untracked files — including any in-progress work you haven\'t added.',
    confirm: 'Every untracked file will be permanently deleted. Continue?',
    saferAlternative: 'git clean -nd   # dry-run first',
  },
  {
    id: 'push_delete',
    severity: 'warn',
    pattern: /\bgit\s+push\s+[^#\n]*(?::[^\s]+|--delete\s+\S+)/,
    impact: 'Removes a branch from the remote.',
    confirm: 'The remote branch will be gone for everyone. Continue?',
  },
  {
    id: 'filter_branch',
    severity: 'block',
    pattern: /\bgit\s+filter-branch\b/,
    impact: 'Rewrites history across many commits. Collaborators will diverge.',
    confirm: 'History rewrite is a coordinated operation. Has every teammate agreed?',
    saferAlternative: 'git filter-repo  # safer, still destructive',
  },
  {
    id: 'rebase_interactive',
    severity: 'warn',
    pattern: /\bgit\s+rebase\s+.*\s-i\b|\bgit\s+rebase\s+.*--root\b/,
    impact: 'Rewrites local commit history.',
    confirm: 'Interactive or root rebase rewrites SHAs. Continue?',
  },
  {
    id: 'no_verify',
    severity: 'warn',
    pattern: /\bgit\s+(?:commit|push)\s+[^#\n]*--no-verify\b/,
    impact: 'Bypasses pre-commit / pre-push hooks that exist to catch mistakes.',
    confirm: 'Hooks exist for a reason. Really skip them?',
  },
  {
    id: 'stash_drop',
    severity: 'warn',
    pattern: /\bgit\s+stash\s+drop\b/,
    impact: 'Permanently removes a stash entry — unrecoverable.',
    confirm: 'The stash will be gone for good. Continue?',
  },
];

const PROTECTED_BRANCHES = ['main', 'master', 'release', 'production'];

function detectProtectedBranch(cmd) {
  for (const b of PROTECTED_BRANCHES) {
    const re = new RegExp(`\\b${b}\\b`);
    if (re.test(cmd)) return b;
  }
  return null;
}

// Collect all matching git rules (accumulate for compound commands)
const matchedGitRules = gitRules.filter((r) => r.pattern.test(command));
if (matchedGitRules.length > 0) {
  const protectedBranch = detectProtectedBranch(command);
  const hasDestructiveFlag = /--force|--hard|clean\s+-f/.test(command);
  const worstSeverity = matchedGitRules.some((r) => r.severity === 'block') ||
    (protectedBranch && hasDestructiveFlag)
    ? 'block'
    : 'warn';

  if (worstSeverity === 'block') {
    const rule = matchedGitRules.find((r) => r.severity === 'block') || matchedGitRules[0];
    const lines = [
      `🛑 BLOCKED — git safety [${rule.id}]`,
      `  ${rule.impact}`,
    ];
    if (protectedBranch && hasDestructiveFlag) {
      lines.push(`  Protected branch '${protectedBranch}' + destructive flag — cannot auto-proceed.`);
    }
    if (rule.saferAlternative) lines.push(`  Safer alternative: ${rule.saferAlternative}`);
    if (rule.confirm) lines.push(`  If intentional: ${rule.confirm}`);
    lines.push(`  Command: ${command.substring(0, 120)}${command.length > 120 ? '...' : ''}`);
    console.log(JSON.stringify({ decision: 'block', reason: lines.join('\n') }));
    process.exit(0);
  }

  // Warn-level — accumulate all rule IDs for accurate signal
  const rule = matchedGitRules[0];
  const ruleIdList = matchedGitRules.map((r) => r.id);
  const ruleIds = ruleIdList.join(', ');

  // BlastDampener escalation: if any rule in this command has fired
  // ≥3 times within 10 minutes, escalate warn → block. Prevents a user
  // (or looping agent) from grinding through warnings unchecked.
  const overLimit = blastRecordAndCheck(ruleIdList);
  if (overLimit) {
    const lines = [
      `🛑 BLOCKED — blast-dampener escalation`,
      `  Rule '${overLimit.id}' has fired ${overLimit.count} times within 10 minutes.`,
      `  Repeated destructive attempts exceed the safety envelope.`,
      `  ${rule.impact}`,
    ];
    if (rule.saferAlternative) lines.push(`  Safer alternative: ${rule.saferAlternative}`);
    lines.push(`  Command: ${command.substring(0, 120)}${command.length > 120 ? '...' : ''}`);
    console.log(JSON.stringify({ decision: 'block', reason: lines.join('\n') }));
    process.exit(0);
  }

  const lines = [
    `⚠️ Destructive git command — rules: ${ruleIds}`,
    `  ${rule.impact}`,
  ];
  if (rule.saferAlternative) lines.push(`  Safer alternative: ${rule.saferAlternative}`);
  lines.push(`  Command: ${command.substring(0, 120)}${command.length > 120 ? '...' : ''}`);
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: lines.join('\n'),
    },
  }));
  process.exit(0);
}

// ── Non-git destructive patterns (preserved from original) ──
const otherWarnPatterns = [
  { pattern: /rm\s+-rf?\s+/, msg: 'rm -rf can delete entire directories' },
  { pattern: /truncate\s+/, msg: 'truncate empties file contents' },
  { pattern: />\s*\S+\.(ts|js|json|md|py)/, msg: 'redirect may overwrite source file' },
  { pattern: /pkill|killall/, msg: 'kills processes by name (broad match)' },
  { pattern: /DROP\s+(TABLE|DATABASE)/i, msg: 'SQL DROP is destructive' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;?\s*$/i, msg: 'DELETE without WHERE affects all rows' },
];

for (const { pattern, msg } of otherWarnPatterns) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: `⚠️ Destructive command detected: ${msg}\n  Command: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}\n  Consider: backup first, or use safer alternative.`,
      },
    }));
    process.exit(0);
  }
}

console.log(JSON.stringify({ continue: true }));
