#!/usr/bin/env node
// tier: T3
// galaxy-completeness-advisory.mjs — Stop hook (ADVISORY, GALAXY-KIT-MS0, slot:bravo 2026-05-29).
// Runs scripts/galaxy-verify.mjs <bound-slot> at session end; if any canonical-kit check FAILs,
// emits a one-line systemMessage pointing at /galaxy-verify-<slot>. Never blocks (continue:true).
// NOT YET WIRED — golf (Stop-chain owner) wires into settings.json Stop[] and should first add an
// edit-gate (fire only when a galaxy doc file was touched) + per-slot throttle to avoid Stop noise.
// Dependency-free + fail-soft so an unwired/mis-wired state can never break Stop.
// Knob: PRISM_GALAXY_COMPLETENESS_ADVISORY_DISABLE=1.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SPAWN_TIMEOUT_MS = 5000;
const REPO = process.env.PRISM_REPO || 'H:/prism';

if (process.env.PRISM_GALAXY_COMPLETENESS_ADVISORY_DISABLE === '1') process.exit(0);

let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }

let slot = null;
try {
  const sid = payload.session_id || '';
  const slots = (JSON.parse(readFileSync(`${REPO}/state/shared/chat-slots.json`, 'utf8')).slots) || {};
  for (const [name, st] of Object.entries(slots)) {
    if (st && st.chatId && sid && (st.chatId === sid || sid.includes(String(st.chatId).replace(/^claude-/, '')))) { slot = name; break; }
  }
} catch { process.exit(0); }
if (!slot) process.exit(0);

let stdout = '';
try {
  const r = spawnSync(process.execPath, [`${REPO}/scripts/galaxy-verify.mjs`, slot], { encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, windowsHide: true });
  stdout = r.stdout || '';
} catch { process.exit(0); }

const m = stdout.match(/FAIL \((\d+)\)/);
if (!m) process.exit(0); // PASS or unmapped -> silent

process.stdout.write(JSON.stringify({
  continue: true,
  systemMessage: `🪐 galaxy-completeness: the ${slot} galaxy has ${m[1]} unmet kit check(s). Run /galaxy-verify-${slot} (node H:/prism/scripts/galaxy-verify.mjs ${slot}) for backfill targets — see state/shared/specs/GALAXY-CANONICAL-KIT-2026-05-29.md. (advisory; mute: PRISM_GALAXY_COMPLETENESS_ADVISORY_DISABLE=1)`,
}));
process.exit(0);
