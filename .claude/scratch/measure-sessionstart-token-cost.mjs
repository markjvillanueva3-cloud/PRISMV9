#!/usr/bin/env node
// Measures the bytes-of-context each SessionStart hook injects.
// Methodology:
//   1. Read settings.json SessionStart chain.
//   2. For each hook, spawn it with a synthetic SessionStart payload.
//   3. Parse stdout as JSON (if valid) and sum bytes of additionalContext + systemMessage.
//   4. Rank by emitted size (≈token cost, 1 token ≈ 4 chars in English ASCII).
//
// Token estimate is rough — exact tokens depend on tokenizer, but byte-rank is preserved.

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const HOOK_TIMEOUT_MS = 8000;
const TOKEN_CHARS_RATIO = 4; // English ASCII heuristic
const ROOT = 'H:/prism';

const settings = JSON.parse(fs.readFileSync(ROOT + '/.claude/settings.json', 'utf8'));
const ssBlocks = settings.hooks?.SessionStart || [];
const payload = JSON.stringify({
  session_id: 'token-cost-probe',
  source: 'startup',
  hook_event_name: 'SessionStart',
});
const HOOK_RX = /\.claude[\/\\]hooks[\/\\][\w-]+\.mjs/;

const results = [];
const seen = new Set();
for (const block of ssBlocks) {
  for (const h of block.hooks || []) {
    const cmd = h.command || '';
    const mat = cmd.match(HOOK_RX);
    if (!mat) continue;
    const rel = mat[0].split('\\').join('/');
    if (seen.has(rel)) continue;
    seen.add(rel);
    const p = ROOT + '/' + rel;
    if (!fs.existsSync(p)) { results.push({ rel, status: 'missing', stdoutBytes: 0, addCtxBytes: 0, sysMsgBytes: 0, est_tokens: 0 }); continue; }

    const r = spawnSync(process.execPath, [p], { timeout: HOOK_TIMEOUT_MS, encoding: 'utf8', input: payload });
    const out = r.stdout || '';
    let addCtx = '';
    let sysMsg = '';
    try {
      const obj = JSON.parse(out);
      addCtx = obj?.hookSpecificOutput?.additionalContext || obj?.additionalContext || '';
      sysMsg = obj?.systemMessage || obj?.hookSpecificOutput?.systemMessage || '';
    } catch { /* hook may print raw text or be silent */ }
    const total = (typeof addCtx === 'string' ? addCtx.length : 0) + (typeof sysMsg === 'string' ? sysMsg.length : 0);
    results.push({
      rel,
      status: r.status === 0 ? 'ok' : (r.signal ? `signal:${r.signal}` : `code:${r.status}`),
      stdoutBytes: out.length,
      addCtxBytes: typeof addCtx === 'string' ? addCtx.length : 0,
      sysMsgBytes: typeof sysMsg === 'string' ? sysMsg.length : 0,
      est_tokens: Math.round(total / TOKEN_CHARS_RATIO),
      timeMs: r.status === null ? 'timeout' : 'ok',
    });
  }
}

results.sort((a, b) => (b.addCtxBytes + b.sysMsgBytes) - (a.addCtxBytes + a.sysMsgBytes));
const totalBytes = results.reduce((s, r) => s + r.addCtxBytes + r.sysMsgBytes, 0);
const totalTokens = Math.round(totalBytes / TOKEN_CHARS_RATIO);
console.log(JSON.stringify({
  totalHooks: results.length,
  totalContextBytes: totalBytes,
  estimatedTokens: totalTokens,
  top15: results.slice(0, 15),
  zeroEmit: results.filter(r => r.addCtxBytes + r.sysMsgBytes === 0).map(r => r.rel),
}, null, 2));
