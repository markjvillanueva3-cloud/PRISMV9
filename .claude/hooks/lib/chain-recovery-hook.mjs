#!/usr/bin/env node
// tier: T3
/**
 * chain-recovery-hook.mjs — PostToolUseFailure
 * Classifies tool failures and suggests recovery actions.
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
const error = input.error || input.tool_error || '';
const toolName = input.tool_name || '';

const TRANSIENT = [/ENOENT/i, /EBUSY/i, /timed?\s*out/i, /EAGAIN/i, /ECONNRESET/i];
const PERMANENT = [/syntax\s*error/i, /maximum call stack/i, /out of memory/i, /permission denied/i];

let severity = 'recoverable';
let suggestion = 'Retry with adjusted parameters';

for (const p of TRANSIENT) {
  if (p.test(error)) { severity = 'transient'; suggestion = 'Retry — likely a temporary file/network issue'; break; }
}
for (const p of PERMANENT) {
  if (p.test(error)) { severity = 'permanent'; suggestion = 'Do not retry — fix the root cause first'; break; }
}

if (error.includes('TS') && /\d{4}/.test(error)) {
  severity = 'recoverable';
  suggestion = 'TypeScript error — check the specific error code and fix the source';
}

console.log(JSON.stringify({
  additionalContext: `CHAIN RECOVERY [${severity}]: ${toolName} failed. ${suggestion}. Error: ${String(error).slice(0, 200)}`
}));
