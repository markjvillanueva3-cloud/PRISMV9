#!/usr/bin/env node
// tier: T1
/**
 * bash-redirect-hook.mjs — PreToolUse Bash
 * Detects bash commands that should use dedicated tools instead.
 * cat/head/tail → Read, grep/rg → Grep, find/ls → Glob, echo > → Write
 * Saves tokens by using structured tool output instead of raw bash.
 */
import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
const input = JSON.parse(_raw);

const cmd = (input.tool_input?.command || '').trim();
if (!cmd) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const redirects = [];

// cat/head/tail → Read tool
if (/^\s*(cat|head|tail)\s+/.test(cmd) && !cmd.includes('|') && !cmd.includes('<<')) {
  redirects.push('Use Read tool instead of cat/head/tail — structured output, better token efficiency');
}

// grep/rg → Grep tool
if (/^\s*(grep|rg)\s+/.test(cmd)) {
  redirects.push('Use Grep tool instead of grep/rg — optimized output format, respects permissions');
}

// find → Glob tool
if (/^\s*find\s+/.test(cmd) && cmd.includes('-name')) {
  redirects.push('Use Glob tool instead of find — faster pattern matching, sorted by modification time');
}

// ls with complex patterns → Glob
if (/^\s*ls\s+.*\*/.test(cmd)) {
  redirects.push('Use Glob tool instead of ls with wildcards — structured file list output');
}

// echo/cat heredoc to file → Write tool
if (/>\s*\S+/.test(cmd) && /^\s*(echo|cat\s+<<|printf)/.test(cmd)) {
  redirects.push('Use Write tool instead of echo/cat redirect — tracks file creation, enables edit history');
}

// sed -i → Edit tool
if (/^\s*sed\s+.*-i/.test(cmd)) {
  redirects.push('Use Edit tool instead of sed -i — exact string replacement, safer, reviewable');
}

// awk for file processing → Read + structured handling
if (/^\s*awk\s+/.test(cmd) && !cmd.includes('|')) {
  redirects.push('Consider Read tool + structured processing instead of awk — better token efficiency');
}

if (redirects.length > 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: 'TOKEN SAVE: ' + redirects.join('. ') + '.'
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
