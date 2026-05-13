#!/usr/bin/env node
// tier: T1
/**
 * asset-deletion-block.mjs — PreToolUse hook
 *
 * HARD BLOCKS deletion of system assets:
 * - Hooks, skills, scripts, settings
 * - Also blocks disabling hooks in settings.json
 *
 * User must explicitly request deletion for it to be allowed.
 */

import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return require("fs").readFileSync(0, "utf-8");
  } catch { return ""; }
}

const PROTECTED_PATHS = [
  '/.claude/hooks/',
  '/.claude/commands/',
  '/.claude/scripts/',
  '/.claude/settings',
  '/prism/.claude/',
  '/mcp-server/src/engines/',
  '/mcp-server/src/tools/dispatchers/',
  '/mcp-server/src/schemas/',
  '/mcp-server/src/__tests__/',
  '/PRISM/resources/',
  '/prism/resources/',
  '/PRISM/JM DIE/',
  '/prism/JM DIE/',
  '/PRISM/JM%20DIE/',
];

const DELETION_PATTERNS = [
  /\brm\s+-rf?\b/i,
  /\brmdir\b/i,
  /\brmSync\b/i,
  /\bunlinkSync\b/i,
  /\bfs\.rm\b/i,
  /\bdel\s+\/[fqs]/i,  // Windows del command
  /Remove-Item/i,
];

function isProtectedPath(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return PROTECTED_PATHS.some(p => normalized.includes(p));
}

function containsDeletionCommand(command) {
  if (!command) return false;
  return DELETION_PATTERNS.some(p => p.test(command));
}

function isSettingsDisable(tool, input) {
  if (tool !== 'Edit' && tool !== 'Write') return false;
  const filePath = input?.file_path || '';
  if (!filePath.includes('settings.json')) return false;

  const newString = input?.new_string || input?.content || '';
  // Check for disabling hooks or removing hook entries
  if (newString.includes('"disableAllHooks": true')) return true;
  if (newString.includes('"enabled": false')) return true;

  return false;
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const tool = input.tool_name || input.tool || "";
  const toolInput = input.tool_input || input.input || {};

  // Check Bash commands for deletion
  if (tool === 'Bash') {
    const command = toolInput?.command || '';
    if (containsDeletionCommand(command)) {
      // Check if targeting protected paths
      const targets = PROTECTED_PATHS.filter(p => command.includes(p));
      if (targets.length > 0) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: `
╔══════════════════════════════════════════════════════════════╗
║        🛑 ASSET DELETION BLOCKED                             ║
╠══════════════════════════════════════════════════════════════╣
║ Cannot delete protected system assets.
║
║ Protected paths detected:
${targets.map(t => `║   • ${t}`).join('\n')}
║
║ RULE: Settings, hooks, skills, scripts, tools, and features
║ are NOT allowed to be deleted or disabled without explicit
║ user permission.
║
║ If you need to remove something, ask the user first.
╚══════════════════════════════════════════════════════════════╝
`
        }));
        return;
      }
    }
  }

  // Check Write/Edit to protected files
  if ((tool === 'Write' || tool === 'Edit') && isProtectedPath(toolInput?.file_path)) {
    // Allow edits but check for settings disable patterns
    if (isSettingsDisable(tool, toolInput)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `
╔══════════════════════════════════════════════════════════════╗
║        🛑 SETTINGS DISABLE BLOCKED                           ║
╠══════════════════════════════════════════════════════════════╣
║ Cannot disable hooks or system protections.
║
║ RULE: Settings changes that disable functionality require
║ explicit user permission.
║
║ If you need to disable something, ask the user first.
╚══════════════════════════════════════════════════════════════╝
`
      }));
      return;
    }
  }

  console.log(JSON.stringify({ decision: 'approve' }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
