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
const TIMEOUT_MS = 12_000;

function drainStdin() {
  try { readFileSync(0, 'utf8'); } catch { /* no stdin is fine */ }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

drainStdin();

if (process.env.PRISM_AGGRESSIVE_KILLER === '0') emit({ continue: true });

let result = null;
try {
  const out = execFileSync(process.execPath, [KILLER, '--json'], {
    timeout: TIMEOUT_MS,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (out) result = JSON.parse(out);
} catch {
  // Best-effort: never block Stop on cleanup failure.
  emit({ continue: true });
}

if (!result || !result.killed) emit({ continue: true });

const total = (result.killed.bash || 0) + (result.killed.git || 0)
            + (result.killed.node || 0) + (result.killed.ps || 0);

if (total === 0) emit({ continue: true });

const before = result.before?.pct?.toFixed?.(1) ?? '?';
const after = result.after?.pct?.toFixed?.(1) ?? '?';
emit({
  continue: true,
  systemMessage:
    `aggressive-killer: reaped ${total} stuck procs ` +
    `(bash:${result.killed.bash} git:${result.killed.git} ` +
    `node:${result.killed.node} ps:${result.killed.ps}) ` +
    `freed ~${result.freed_mb || 0} MB; commit ${before}% → ${after}%`,
});
