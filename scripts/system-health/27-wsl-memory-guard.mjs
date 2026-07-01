#!/usr/bin/env node
/**
 * PRISM System Health 27 - WSL memory-cap guard  (module: 27-wsl-memory-guard.mjs)
 * =====================================================================
 * Self-id token for the installer sanity check: wsl-memory-guard / parseWslConfigCap.
 * (install-wsl-memory-guard-task.ps1 greps the first 120 lines for BOTH tokens to
 *  confirm it's installing the right script before registering the scheduled task —
 *  the literal 'wsl-memory-guard' otherwise first appears at the run-as-main guard
 *  near EOF, outside that window, so the install legitimately refused. golf 2026-06-08.)
 * THE recurring "API limit error" root cause (diagnosed 2026-06-08): WSL2
 * runs with its `.wslconfig` memory cap NOT enforced — `vmmemWSL` balloons
 * far past `memory=16GB` (observed 96.9 GB committed) because a `wsl --shutdown`
 * was never run to make the config take effect. When host commit nears 100%,
 * outbound HTTPS/API calls + the MCP server fail allocation → surfaces as
 * "API limit" / ECONNREFUSED. This guard detects the overrun and (opt-in)
 * reclaims it.
 *
 * Reads the REAL cap from C:/Users/<user>/.wslconfig (single source of truth —
 * not a hardcoded 16). Reports:
 *   exit 0  - healthy   (vmmemWSL commit <= cap * overrunFactor)
 *   exit 1  - watch     (cap honored but WS climbing)
 *   exit 2  - overrun   (commit > cap * overrunFactor → cap NOT enforced)
 *
 * Sibling of 03-commit-pressure-check.mjs (whole-host commit). This one is
 * WSL-specific because WSL is the dominant, recurring offender.
 *
 * CLI flags:
 *   --json              machine-readable
 *   --quiet             verdict line only
 *   --overrun-factor N  commit>cap*N ⇒ overrun (default 1.5)
 *   --enforce           on overrun, run `wsl --shutdown` to apply the cap.
 *                       GATED: refuses if a docker build/compose appears active
 *                       (checks `docker ps` for running containers) unless --force.
 *   --force             allow --enforce even with active containers (logged).
 *
 * Default (no --enforce) is ADVISE-ONLY: never disrupts a running WSL.
 * Intended runners: standalone CLI, /startup probe, or a PRISM scheduled task
 * (advise mode) that surfaces the overrun before it becomes acute.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const optVal = (n, def) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};

const OVERRUN_FACTOR = optVal('--overrun-factor', 1.5);
const JSON_OUT = flag('--json');
const QUIET = flag('--quiet');
const ENFORCE = flag('--enforce');
const FORCE = flag('--force');

function ps(cmd) {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return '';
  }
}

// ── 1. Parse the configured cap from .wslconfig text (PURE — exported for tests) ─
// Returns cap in GB, or null if no uncommented `memory=` line. Units: GB|MB|KB|B
// (bare number = bytes, per WSL's own .wslconfig spec). First match wins.
export function parseWslConfigCap(text) {
  if (typeof text !== 'string' || !text) return null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#') || line.startsWith(';')) continue;
    const m = line.match(/^memory\s*=\s*([\d.]+)\s*(gb|mb|kb|b)?/i);
    if (m) {
      const n = parseFloat(m[1]);
      if (!Number.isFinite(n)) return null;
      const unit = (m[2] || 'b').toLowerCase();
      return unit === 'gb' ? n : unit === 'mb' ? n / 1024 : unit === 'kb' ? n / 1024 / 1024 : n / 1024 ** 3;
    }
  }
  return null;
}

// ── Status classifier (PURE — exported for tests) ──────────────────────────────
// Decides {status, exitCode, capEnforced} from measured state. Single source of
// the overrun/watch/healthy decision so the CLI and tests can't drift.
export function classify({ running, capGB, commitGB, overrunFactor }) {
  if (!running) return { status: 'wsl-down', exitCode: 0, capEnforced: null };
  if (capGB == null) return { status: 'no-cap-config', exitCode: 1, capEnforced: null };
  const capEnforced = commitGB <= capGB * overrunFactor;
  if (!capEnforced) return { status: 'overrun', exitCode: 2, capEnforced: false };
  if (commitGB > capGB) return { status: 'watch', exitCode: 1, capEnforced: true };
  return { status: 'healthy', exitCode: 0, capEnforced: true };
}

// ── Read the configured cap from disk (I/O shell over the pure parser) ─────────
function readWslConfigCapGB() {
  const path = join(homedir(), '.wslconfig');
  if (!existsSync(path)) return { capGB: null, path, present: false };
  let text = '';
  try { text = readFileSync(path, 'utf8'); } catch { return { capGB: null, path, present: false }; }
  return { capGB: parseWslConfigCap(text), path, present: true };
}

// ── 2. Measure vmmemWSL (WS = resident, commit = reserved) ─────────────────────
function readVmmem() {
  const out = ps(
    "$w = Get-Process vmmemWSL -ErrorAction SilentlyContinue; " +
    "if ($w) { '{0} {1}' -f [math]::Round($w.WorkingSet64/1GB,2), [math]::Round($w.PrivateMemorySize64/1GB,2) } else { 'NONE' }"
  ).trim();
  if (out === 'NONE' || !out) return { running: false, wsGB: 0, commitGB: 0 };
  const [wsGB, commitGB] = out.split(/\s+/).map(Number);
  return { running: true, wsGB, commitGB };
}

// ── 3. Is a docker build/run active? (gate for --enforce) ──────────────────────
function dockerActive() {
  const out = ps("try { (docker ps -q 2>$null | Measure-Object).Count } catch { 0 }").trim();
  const n = Number(out);
  return Number.isFinite(n) && n > 0;
}

// ── CLI entry — only runs when executed directly, NOT when imported by a test ──
function runCli() {
const { capGB, path: cfgPath, present } = readWslConfigCapGB();
const vm = readVmmem();

// Single source of truth for the verdict (also unit-tested).
const { status, exitCode, capEnforced } = classify({
  running: vm.running,
  capGB,
  commitGB: vm.commitGB,
  overrunFactor: OVERRUN_FACTOR,
});

// ── 4. Enforcement (opt-in, gated) ─────────────────────────────────────────────
let enforced = false;
let enforceSkippedReason = null;
if (ENFORCE && status === 'overrun') {
  const active = dockerActive();
  if (active && !FORCE) {
    enforceSkippedReason = 'docker containers running — refusing wsl --shutdown without --force';
  } else {
    // wsl --shutdown: stops all distros; they auto-restart on next use WITH the cap.
    ps('wsl --shutdown');
    enforced = true;
  }
}

const result = {
  status,
  wsl_running: vm.running,
  config_present: present,
  config_path: cfgPath,
  cap_gb: capGB,
  vmmem_ws_gb: vm.wsGB,
  vmmem_commit_gb: vm.commitGB,
  cap_enforced: capEnforced,
  overrun_factor: OVERRUN_FACTOR,
  enforced,
  enforce_skipped_reason: enforceSkippedReason,
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  const colour = exitCode === 2 ? '\x1b[31m' : exitCode === 1 ? '\x1b[33m' : '\x1b[32m';
  const reset = '\x1b[0m';
  if (!QUIET) process.stdout.write('=== PRISM WSL Memory Guard ===\n');
  if (status === 'wsl-down') {
    process.stdout.write(`${colour}[WSL-DOWN]${reset} vmmemWSL not running — nothing to guard\n`);
  } else if (status === 'no-cap-config') {
    process.stdout.write(`${colour}[NO-CAP]${reset} no memory= in ${cfgPath} — WSL is UNBOUNDED. Add a [wsl2] memory cap.\n`);
  } else {
    process.stdout.write(
      `${colour}[${status.toUpperCase()}]${reset} vmmemWSL commit ${vm.commitGB} GB ` +
      `(WS ${vm.wsGB} GB) vs cap ${capGB} GB ` +
      `${capEnforced ? '(cap honored)' : '(cap NOT enforced — ' + Math.round(vm.commitGB / capGB) + 'x over)'}\n`
    );
  }
  if (!QUIET && status === 'overrun') {
    if (enforced) {
      process.stdout.write(`\n${colour}ENFORCED:${reset} ran 'wsl --shutdown' — WSL restarts with the ${capGB} GB cap on next use.\n`);
    } else if (enforceSkippedReason) {
      process.stdout.write(`\n${colour}ENFORCE SKIPPED:${reset} ${enforceSkippedReason}\n`);
    } else {
      process.stdout.write(
        `\n${colour}ACTION:${reset} cap is NOT being enforced. To reclaim ~${Math.round(vm.commitGB - capGB)} GB:\n` +
        `  wsl --shutdown          (kills Docker + WSL briefly; auto-restarts WITH the ${capGB} GB cap)\n` +
        `  # or re-run this script with --enforce (gated on no active docker build)\n`
      );
    }
  }
}

process.exit(exitCode);
} // end runCli

// Only execute the CLI when run directly (`node 27-wsl-memory-guard.mjs`),
// never when imported by the test (which would run powershell + process.exit).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runCli();
}
