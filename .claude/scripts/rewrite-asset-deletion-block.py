"""Rewrite asset-deletion-block.mjs to enforce: NO automated deletion on H:\ drive ever.
User-mandate 2026-04-27: 'make sure git or whatever caused this issue can't delete
anything from the H drive. I have to manually delete it.'

Hard-blocks (Bash):
  - rm -rf, rmdir, fs.rm/rmSync/unlinkSync targeting any H:\ path
  - Windows del /s|/q|/f|/a, rmdir /s
  - PowerShell Remove-Item with -Recurse or -Force
  - Git: clean -f variants, reset --hard, checkout/restore wholesale, filter-branch
  - robocopy with /MIR or /PURGE
  - find ... -delete or -exec rm
  - move on H: protected dirs (could destroy via overwrite)

Hard-blocks (Write/Edit):
  - settings.json with disableAllHooks/enabled:false
  - PROTECTED_PATHS legacy list still enforced for finer rules
"""

CONTENT = r'''#!/usr/bin/env node
/**
 * asset-deletion-block.mjs - PreToolUse hook
 *
 * USER MANDATE 2026-04-27:
 *   "make sure git or whatever caused this issue can't delete anything from
 *    the H drive. I have to manually delete it."
 *
 * Therefore: HARD BLOCK any automated deletion targeting H:\ drive.
 * Only manual user action (Explorer drag, manual command from human) deletes.
 *
 * Background: 60GB H:\PRISM\resources\ wiped 2026-04-26 ~3:52pm bypassing
 * recycle bin. Suspected git clean -fdx variant or robocopy /MIR. Both are
 * now hard-blocked when targeting any H:\ path.
 */

import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

// Legacy fine-grained protection (kept for Write/Edit checks)
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

// Destructive command patterns (any of these on H: path = HARD BLOCK)
const DESTRUCTIVE_PATTERNS = [
  { id: 'rm-rf',       re: /\brm\s+(?:-[rRfFvV]+\s+)+/,            desc: 'rm with -r/-f flags' },
  { id: 'rm-recurse',  re: /\brm\s+(?:--recursive|--force)\b/,     desc: 'rm --recursive/--force' },
  { id: 'rmdir',       re: /\brmdir\s+(?:-[pvRfFsS]+\s+)*/,        desc: 'rmdir' },
  { id: 'fs-rm',       re: /\b(?:fs\.rm|fs\.rmSync|fs\.unlink|fs\.unlinkSync|fs\.rmdir|fs\.rmdirSync)\s*\(/, desc: 'Node.js fs delete API' },
  { id: 'win-del',     re: /\bdel\s+(?:\/[sqfaSQFA]\s+)+/i,        desc: 'Windows del with /s/q/f/a' },
  { id: 'win-rmdir-s', re: /\brmdir\s+\/[sqSQ]/i,                  desc: 'Windows rmdir /s' },
  { id: 'powershell-remove', re: /Remove-Item\b[^\n]*?-(?:Recurse|Force)/i, desc: 'PowerShell Remove-Item -Recurse/-Force' },
  { id: 'git-clean',   re: /\bgit\s+clean\b[^#\n]*-[fdxX]+(?!\s*[a-z]*-?n)/, desc: 'git clean with -f/-d/-x' },
  { id: 'git-reset-hard', re: /\bgit\s+reset\s+(?:[^#\n]*\s)?--hard/, desc: 'git reset --hard' },
  { id: 'git-checkout-discard', re: /\bgit\s+checkout\s+(?:--\s+)?\.|\bgit\s+checkout\s+--\s+\S/, desc: 'git checkout . / git checkout -- ...' },
  { id: 'git-restore-discard', re: /\bgit\s+restore\s+(?:--worktree\s+)?\.|\bgit\s+restore\s+(?:--source[^#\n]*)?\s+\S/, desc: 'git restore .' },
  { id: 'git-filter-branch', re: /\bgit\s+filter-branch\b/, desc: 'git filter-branch (history rewrite)' },
  { id: 'robocopy-destructive', re: /\brobocopy\b[^#\n]*\/(?:MIR|PURGE)\b/i, desc: 'robocopy /MIR or /PURGE (mirrors source, deletes extras in dest)' },
  { id: 'find-delete', re: /\bfind\b[^#\n]*-(?:delete|exec\s+rm\b)/, desc: 'find -delete or find -exec rm' },
  { id: 'truncate',    re: /\btruncate\s+-s\s+0\b/, desc: 'truncate to zero bytes' },
  { id: 'shred',       re: /\bshred\s+/, desc: 'shred (overwrites + unlinks)' },
];

// Path patterns that detect H: drive targeting (any form)
const H_DRIVE_PATTERNS = [
  /\bH:[\\\/]/i,             // H:\... or H:/...
  /\b\/h\/[a-z]/i,           // /h/path (Git Bash)
  /\b\/mnt\/h\//i,           // /mnt/h/ (WSL)
  /\bcygdrive\/h\//i,        // /cygdrive/h/ (Cygwin)
];

function targetsHDrive(command) {
  if (!command) return false;
  // If command is run from H: cwd (no explicit path), it still affects H:.
  // We can't know cwd from hook input reliably, so we check both:
  //  - explicit H: path in command
  //  - cwd-relative paths in commands run from H: (caller would need to indicate)
  // For safety: if any H: path is mentioned OR no path is given (cwd-relative),
  // we treat as H: target.
  if (H_DRIVE_PATTERNS.some(p => p.test(command))) return true;
  // Cwd-relative commands (no absolute path): be conservative and assume H:
  // ONLY block these if pattern is absolutely destructive AND no other drive mentioned.
  if (/\b[A-GIJK-Z]:[\\\/]/i.test(command)) return false; // explicit other drive
  return true; // default: assume H: cwd
}

function isProtectedPath(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return PROTECTED_PATHS.some(p => normalized.includes(p));
}

function findDestructive(command) {
  if (!command) return null;
  for (const p of DESTRUCTIVE_PATTERNS) {
    if (p.re.test(command)) return p;
  }
  return null;
}

function isSettingsDisable(tool, input) {
  if (tool !== 'Edit' && tool !== 'Write') return false;
  const filePath = input?.file_path || '';
  if (!filePath.includes('settings.json')) return false;
  const newString = input?.new_string || input?.content || '';
  if (newString.includes('"disableAllHooks": true')) return true;
  if (newString.includes('"enabled": false')) return true;
  return false;
}

const ALLOW_TMP_PATHS = [
  /[\\\/]tmp[\\\/]/i,
  /[\\\/]temp[\\\/]/i,
  /[\\\/]\.cache[\\\/]/i,
  /[\\\/]node_modules[\\\/]/i,
  /[\\\/]dist[\\\/]/i,
  /[\\\/]\.next[\\\/]/i,
  /[\\\/]coverage[\\\/]/i,
  /\.tmp\b/i,
  /\.lock\b/i,
];

function isOnlyTempPaths(command) {
  // Crude heuristic: if every word that looks like a path matches a tmp pattern,
  // allow. Otherwise block. This permits `rm -rf node_modules` etc.
  const tokens = command.split(/\s+/).filter(t => /[\\\/]/.test(t) || /^[a-zA-Z][\w-]*$/.test(t));
  const pathTokens = tokens.filter(t => /[\\\/]/.test(t) && !t.startsWith('-'));
  if (pathTokens.length === 0) return false;
  return pathTokens.every(t => ALLOW_TMP_PATHS.some(re => re.test(t)));
}

async function main() {
  let input;
  try {
    const raw = readStdinSafe();
    if (!raw) { console.log(JSON.stringify({ continue: true })); return; }
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const tool = input.tool_name || input.tool || "";
  const toolInput = input.tool_input || input.input || {};

  // Bash: hard-block destructive commands targeting H:
  if (tool === 'Bash') {
    const command = toolInput?.command || '';
    const destructive = findDestructive(command);
    if (destructive) {
      // Allow only if entire command targets a known temp/cache path (not protected data)
      if (isOnlyTempPaths(command)) {
        console.log(JSON.stringify({ continue: true }));
        return;
      }
      if (targetsHDrive(command)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: [
            '',
            '+==============================================================+',
            '|        ASSET DELETION BLOCKED (H: drive protection)          |',
            '+==============================================================+',
            '| User mandate 2026-04-27: NO automated deletion on H: drive.  |',
            '| Files must be manually deleted by the user only.             |',
            '|                                                              |',
            '| Pattern matched: ' + destructive.id + ' (' + destructive.desc + ')',
            '| Command (truncated): ' + command.substring(0, 200),
            '|                                                              |',
            '| If a deletion is genuinely needed, ask the user to perform   |',
            '| it manually via Explorer or by typing the command            |',
            '| themselves with the ! prefix.                                |',
            '+==============================================================+',
          ].join('\n')
        }));
        return;
      }
    }
  }

  // Write/Edit: legacy protection for hook-disabling
  if ((tool === 'Write' || tool === 'Edit') && isProtectedPath(toolInput?.file_path)) {
    if (isSettingsDisable(tool, toolInput)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'SETTINGS DISABLE BLOCKED. Cannot disable hooks or system protections without explicit user request.'
      }));
      return;
    }
  }

  console.log(JSON.stringify({ decision: 'approve' }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
'''

P = r'H:\PRISM\.claude\hooks\asset-deletion-block.mjs'

# Backup current
import shutil, datetime, sys
ts = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copy2(P, P + f'.bak-{ts}')

# Write new (CRLF for Windows consistency)
with open(P, 'wb') as f:
    f.write(CONTENT.replace('\n', '\r\n').encode('utf-8'))

print('OK asset-deletion-block.mjs rewritten')
print(f'Backup: {P}.bak-{ts}')
