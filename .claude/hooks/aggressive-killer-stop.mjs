#!/usr/bin/env node
// tier: T4
/**
 * aggressive-killer-stop.mjs - Stop hook wrapper around 06-aggressive-killer.mjs.
 *
 * Why a wrapper: the killer is a standalone tool (also runs from the CLI for
 * emergency cleanup). Hooks need stdout to be a valid {continue:true,...} JSON
 * frame. This wrapper invokes the killer in --json mode, swallows the result,
 * and emits a hook-shaped frame with a brief systemMessage.
 *
 * When this fires: every Stop event. Cost: ~2-3s on a system with no stuck
 * processes (just enumerates and exits). When something IS stuck, kills run
 * fast (taskkill /F is millisecond-class).
 *
 * Coupling: paired with commit-pressure-stop-gate.mjs. This hook runs FIRST
 * (so the gate sees the post-cleanup pressure level), giving the system a
 * chance to self-heal before the gate ever blocks.
 *
 * Disable: env PRISM_AGGRESSIVE_KILLER=0
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const KILLER = 'H:/prism/scripts/system-health/06-aggressive-killer.mjs';
const LLAMA_REAPER = 'H:/prism/scripts/system-health/reap-llama-server-orphans.mjs';
const TIMEOUT_MS = 12_000;
const LLAMA_TIMEOUT_MS = 10_000; // the reaper self-bounds its PS enum at ~8s; keep the outer bound tight

function drainStdin() {
  try { readFileSync(0, 'utf8'); } catch { /* no stdin is fine */ }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

drainStdin();

if (process.env.PRISM_AGGRESSIVE_KILLER === '0') emit({ continue: true });

// Best-effort: run a killer in --json mode, parse, never throw (a cleanup failure must never block Stop).
function runJson(script, extraArgs = [], timeoutMs = TIMEOUT_MS) {
  try {
    const out = execFileSync(process.execPath, [script, '--json', ...extraArgs], {
      timeout: timeoutMs, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return out ? JSON.parse(out) : null;
  } catch { return null; }
}

// 1) stuck node/bash/git/ps reaper.
const result = runJson(KILLER);

// 2) leaked Ollama llama-server orphan reaper (--apply: this Stop-time path IS the auto-relief). The
//    reaper is conservative -- it only kills a same-model-blob dup older than 300s and always keeps the
//    newest, never a single-instance/different-model server -- so unconditional --apply is safe. It closes
//    the gap that fired a 97.4%-commit crash gate (a model reload left an orphaned llama-server holding
//    ~22GB that the node/bash/git/ps reaper above does not target). Off-switch: PRISM_LLAMA_ORPHAN_REAPER=0.
const llama = process.env.PRISM_LLAMA_ORPHAN_REAPER === '0' ? null : runJson(LLAMA_REAPER, ['--apply'], LLAMA_TIMEOUT_MS);

const killed = result?.killed || null;
const killerTotal = killed ? (killed.bash || 0) + (killed.git || 0) + (killed.node || 0) + (killed.ps || 0) : 0;
const llamaReaped = llama?.reaped || 0;

if (killerTotal === 0 && llamaReaped === 0) emit({ continue: true });

const parts = [];
if (killerTotal > 0) {
  const before = result.before?.pct?.toFixed?.(1) ?? '?';
  const after = result.after?.pct?.toFixed?.(1) ?? '?';
  parts.push(
    `aggressive-killer: reaped ${killerTotal} stuck procs ` +
    `(bash:${killed.bash} git:${killed.git} node:${killed.node} ps:${killed.ps}) ` +
    `freed ~${result.freed_mb || 0} MB; commit ${before}% -> ${after}%`
  );
}
if (llamaReaped > 0) {
  const lb = llama.before?.pct?.toFixed?.(1) ?? '?';
  const la = llama.after?.pct?.toFixed?.(1) ?? '?';
  parts.push(`llama-orphan-reaper: reaped ${llamaReaped} leaked llama-server orphan(s); commit ${lb}% -> ${la}%`);
}
emit({ continue: true, systemMessage: parts.join(' | ') });
