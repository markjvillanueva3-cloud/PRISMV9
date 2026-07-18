#!/usr/bin/env node
/**
 * Launch-readiness CRON job (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * Runs the launch-readiness verifier on a schedule (zero Claude tokens), appends a
 * timestamped result to a history JSONL, and on a REGRESSION (overall PASS->FAIL,
 * or a previously-passing invariant now failing) appends a one-line alert to
 * AGENT_CHAT so the fleet sees launch-quality drift the moment it lands -- not at
 * the next manual reorientation.
 *
 * Wire it with: scripts/install-launch-readiness-cron.ps1 (registers a daily
 * Windows scheduled task). Run manually: node scripts/launch-readiness-cron.mjs
 *
 * Pure drift logic (detectDrift/formatAlert) is exported + unit tested.
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runLaunchReadiness } from './verify-launch-readiness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const HISTORY = join(REPO_ROOT, 'state/shared/dashboards/launch-readiness-history.jsonl');
const CHAT = join(REPO_ROOT, 'state/shared/AGENT_CHAT.md');

/**
 * Pure: did `curr` REGRESS vs `prev`? A regression is overall PASS->FAIL OR any
 * invariant that passed before (or has no prior record) now failing. A check that
 * was ALREADY failing and still fails is NOT a new regression (no alert spam).
 */
export function detectDrift(prev, curr) {
  const prevChecks = (prev && prev.checks) || [];
  const newFailures = (curr.checks || [])
    .filter((c) => !c.pass)
    .filter((c) => {
      const before = prevChecks.find((p) => p.name === c.name);
      return !before || before.pass;
    })
    .map((c) => c.name);
  const overallRegressed = prev ? prev.ok === true && curr.ok === false : curr.ok === false;
  return { regressed: overallRegressed || newFailures.length > 0, newFailures };
}

/** Pure: a one-line AGENT_CHAT alert for a regression. */
export function formatAlert(stamp, drift, curr) {
  const names = drift.newFailures.length ? drift.newFailures.join(', ') : (curr.failing || []).join(', ');
  return `- [${stamp}] launch-readiness-cron: REGRESSION -- ${curr.passed}/${curr.total} launch-gate checks pass; failing: ${names || 'unknown'}. Re-run: node scripts/verify-launch-readiness.mjs`;
}

function readLastHistoryReport() {
  if (!existsSync(HISTORY)) return null;
  const lines = readFileSync(HISTORY, 'utf8').trim().split('\n').filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]).report || null;
  } catch {
    return null;
  }
}

function main() {
  const report = runLaunchReadiness();
  const stamp = new Date().toISOString();
  const prev = readLastHistoryReport();
  const drift = detectDrift(prev, report);

  mkdirSync(dirname(HISTORY), { recursive: true });
  appendFileSync(
    HISTORY,
    JSON.stringify({ stamp, ok: report.ok, passed: report.passed, total: report.total, failing: report.failing, report }) + '\n',
  );

  if (drift.regressed) {
    try {
      appendFileSync(CHAT, formatAlert(stamp, drift, report) + '\n');
    } catch {
      /* AGENT_CHAT append is best-effort; never fail the cron on it */
    }
  }

  process.stdout.write(
    `launch-readiness-cron: ${report.ok ? 'PASS' : 'FAIL'} ${report.passed}/${report.total}` +
      `${drift.regressed ? ' [REGRESSION -> AGENT_CHAT]' : ''}\n`,
  );
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
