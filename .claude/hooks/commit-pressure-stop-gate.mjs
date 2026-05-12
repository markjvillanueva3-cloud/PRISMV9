#!/usr/bin/env node
/**
 * commit-pressure-stop-gate.mjs - Proactive memory-pressure gate with self-heal
 * =====================================================================
 * Wired as a Stop hook. Reads commit-used / commit-limit and:
 *   - SOFT WARN at >= 75% (advisory, exits 0)
 *   - HARD WARN at >= 88% (sends notification, still exits 0)
 *   - SELF-HEAL at >= 92% (invoke aggressive killer, re-check)
 *   - BLOCK at >= 96% (only after self-heal failed — forces user to
 *     /compact or close idle chats before more work)
 *
 * Rationale: chats crash when commit hits 100%. With 6 concurrent chats
 * the workload baseline is 90+%, so the gate must self-heal (kill stuck
 * git/bash/node) before blocking. Threshold raised 92→96% so legitimate
 * heavy workloads aren't blocked.
 *
 * Disable per-session by setting env PRISM_PRESSURE_GATE=0.
 * Disable self-heal step by setting env PRISM_PRESSURE_GATE_NO_HEAL=1.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const DISABLED = process.env.PRISM_PRESSURE_GATE === '0';
const NO_HEAL = process.env.PRISM_PRESSURE_GATE_NO_HEAL === '1';
// HS-13 (2026-05-12): wire the self-heal step that the docblock has always
// promised but the code never implemented. Was: HARD(88%)→BLOCK(96%) with
// no intermediate action → chats "froze mid-process" because every Stop
// blocked once commit crept past 96%. Now: at HEAL(92%) run the auto-relief
// script + re-read; only BLOCK if relief failed to bring us below the line.
const RELIEF_SCRIPT = 'H:/prism/scripts/system-health/03-memory-pressure-auto-relief.ps1';
const KILLER_PATH = 'H:/prism/scripts/system-health/06-aggressive-killer.mjs';
const RELIEF_TIMEOUT_MS = 20000;
const SOFT = 75;
const HARD = 88;
const HEAL = 92;
const BLOCK = 96;

function readPressure() {
  try {
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        '$os = Get-CimInstance Win32_OperatingSystem; ' +
          '"$([math]::Round(($os.TotalVirtualMemorySize-$os.FreeVirtualMemory)/1MB,1)) ' +
          '$([math]::Round($os.TotalVirtualMemorySize/1MB,1))"',
      ],
      { encoding: 'utf8', timeout: 5000 }
    );
    const [used, limit] = out.trim().split(/\s+/).map(Number);
    return { used, limit, pct: limit > 0 ? (used / limit) * 100 : 0 };
  } catch {
    return null;
  }
}

const p = readPressure();
if (DISABLED || !p) {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

let pct = Math.round(p.pct * 10) / 10;
let summary = `commit ${p.used}/${p.limit} GB (${pct}%)`;
let healInfo = null;

// HS-13 self-heal: run the auto-relief script when pct >= HEAL.
// If it brings us below BLOCK, let the Stop proceed. Only block if
// relief failed.
if (pct >= HEAL && !NO_HEAL) {
  try {
    let scriptToRun = null;
    if (existsSync(RELIEF_SCRIPT)) scriptToRun = RELIEF_SCRIPT;
    else if (existsSync(KILLER_PATH)) scriptToRun = KILLER_PATH;
    if (scriptToRun) {
      const isPs = scriptToRun.toLowerCase().endsWith('.ps1');
      if (isPs) {
        execFileSync('powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptToRun],
          { encoding: 'utf8', timeout: RELIEF_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] }
        );
      } else {
        execFileSync('node', [scriptToRun],
          { encoding: 'utf8', timeout: RELIEF_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] }
        );
      }
      // Re-read pressure
      const p2 = readPressure();
      if (p2 && p2.limit > 0) {
        const newPct = Math.round((p2.used / p2.limit) * 1000) / 10;
        healInfo = `auto-heal: ${pct}% → ${newPct}%`;
        pct = newPct;
        summary = `commit ${p2.used}/${p2.limit} GB (${pct}%)`;
      }
    } else {
      healInfo = 'auto-heal SKIPPED (no relief script found)';
    }
  } catch (err) {
    healInfo = `auto-heal FAILED: ${err?.message || 'unknown error'}`;
  }
}

if (pct >= BLOCK) {
  process.stdout.write(
    JSON.stringify({
      continue: false,
      stopReason:
        `[CRITICAL MEMORY PRESSURE] ${summary}${healInfo ? ` — ${healInfo}` : ''} — blocking session end to prevent crash cascade. ` +
        `Auto-relief ran but couldn't clear enough headroom. ` +
        `Manual: H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1 (or 06-aggressive-killer.mjs), ` +
        `then /compact this chat, then close idle Claude chats. ` +
        `Override with PRISM_PRESSURE_GATE=0 if you accept the risk.`,
    })
  );
  process.exit(0);
}

if (pct >= HARD) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage:
        `[memory-pressure WARN] ${summary}. New prompts may fail. ` +
        `Consider /compact or running scripts/system-health/02-kill-zombie-tsservers.ps1 before next task.`,
    })
  );
  process.exit(0);
}

if (pct >= SOFT) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage: `[memory-pressure note] ${summary} - watch zone, consider closing idle chats.`,
    })
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ continue: true }));
process.exit(0);
