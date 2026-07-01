#!/usr/bin/env node
/**
 * Post-processor GOLDEN-NC DRIFT cron (U-PP-GOLDEN-NC-CRON, 2026-06-28, slot:echo).
 *
 * The operator's "engineered loops, harnesses, crons" deliverable for the post-processor
 * closed loop. Runs the EXISTING post-processor drift gates on a schedule (zero Claude
 * tokens), appends a timestamped verdict to a history JSONL, and on DRIFT (a previously
 * clean gate now failing) appends a one-line alert to AGENT_CHAT so the fleet sees a JM
 * master-post emit regression the moment it lands.
 *
 * It does NOT reimplement drift detection -- it COMPOSES the two proven gates (R8):
 *   1. fleet-coverage verifier  (scripts/verify-jm-fleet-coverage.ts) -- regenerates every JM
 *      machine's Track-PRISM NC and checks dialect-lint(0 ERR) + structural(100%) + accurate
 *      header + live-tool/5-axis/high-speed markers. Exit 0 = clean, 3 = drift.
 *   2. golden snapshots         (MillMasterPosts.golden + OkumaB250Lathe golden vitest) --
 *      byte-lock the FULL emitted program; ANY change to deterministic emit logic fails.
 *
 * The LOSS FUNCTION (roadmap U-PP-GOLDEN-NC-CRON): "a planted drift fails the run." Any gate
 * non-zero -> this cron exits non-zero (DRIFT_EXIT) so a scheduled-task failure / CI red surfaces
 * the regression. Mirrors quoting-train-cycle + launch-readiness-cron.
 *
 * Wire: scripts/install-post-golden-drift-cron.ps1 (daily Windows task). Run manually:
 *   node scripts/post-golden-drift-cron.mjs            (human-readable)
 *   node scripts/post-golden-drift-cron.mjs --json     (machine-readable verdict)
 *
 * Pure drift logic (decideDriftVerdict / detectGoldenDrift / formatDriftAlert) is exported +
 * unit-tested; the child-process gate runners are injectable for hermetic tests.
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const MCP = join(REPO_ROOT, 'mcp-server');
const HISTORY = join(REPO_ROOT, 'state/shared/post-training/golden-drift-history.jsonl');
const CHAT = join(REPO_ROOT, 'state/shared/AGENT_CHAT.md');

/** Exit code emitted when any gate drifts (so a scheduled-task / CI run goes red). */
export const DRIFT_EXIT = 3;
/** The golden-snapshot test files the cron byte-locks (relative to mcp-server). */
export const GOLDEN_SNAPSHOT_TESTS = [
  'src/__tests__/MillMasterPosts.golden.test.ts',
  'src/__tests__/OkumaB250LatheMasterPostEngine.golden.test.ts',
];

/**
 * Pure: collapse a list of gate results into an overall verdict.
 * A gate is `{ name, ok, detail }`. Verdict is clean iff EVERY gate is ok.
 */
export function decideDriftVerdict(gates) {
  const list = Array.isArray(gates) ? gates : [];
  const failed = list.filter((g) => !g || g.ok !== true).map((g) => (g && g.name) || 'unknown');
  return { ok: failed.length === 0, failed, gates: list };
}

/**
 * Pure: did `curr` DRIFT vs `prev`? A drift is overall clean->dirty OR any gate that was
 * passing before (or has no prior record) now failing. A gate ALREADY failing and still
 * failing is NOT a new drift (no alert spam). Mirrors launch-readiness-cron.detectDrift.
 */
export function detectGoldenDrift(prev, curr) {
  const prevGates = (prev && prev.gates) || [];
  const newFailures = (curr.gates || [])
    .filter((g) => !g || g.ok !== true)
    .filter((g) => {
      const before = prevGates.find((p) => p && p.name === (g && g.name));
      return !before || before.ok === true;
    })
    .map((g) => (g && g.name) || 'unknown');
  const overallDrifted = prev ? prev.ok === true && curr.ok === false : curr.ok === false;
  return { drifted: overallDrifted || newFailures.length > 0, newFailures };
}

/** Pure: a one-line AGENT_CHAT alert for a drift. */
export function formatDriftAlert(stamp, drift, curr) {
  const names = drift.newFailures.length ? drift.newFailures.join(', ') : (curr.failed || []).join(', ');
  return `- [${stamp}] post-golden-drift-cron: DRIFT -- JM master-post NC emit changed; failing gate(s): ${names || 'unknown'}. Re-run: npx tsx scripts/verify-jm-fleet-coverage.ts && (cd mcp-server && npx vitest run ${GOLDEN_SNAPSHOT_TESTS.join(' ')})`;
}

/**
 * Default child-process runner (injectable for tests). Returns { status, stdout, stderr }.
 * `shell: true` is REQUIRED on Windows so `npx`/`vitest`/`tsx` resolve via their `.cmd` shims
 * (a bare spawnSync('npx', ...) returns status:null = ENOENT). status:null means the gate
 * FAILED TO LAUNCH (infra error) -- which is still a non-ok gate (fail-loud, R12), but the
 * detail must say so rather than masquerade as emit drift.
 */
function defaultSpawn(cmd, args, opts) {
  return spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, shell: true, ...opts });
}

/** Map a spawn result to a gate detail, distinguishing a launch failure from a real exit. */
function gateDetail(r, cleanMatch, cleanLabel) {
  if (r.status === null || r.status === undefined) {
    return `FAILED TO LAUNCH (${r.error ? r.error.code || r.error.message : 'no exit code'})`;
  }
  // Only show the clean-label on a genuinely clean exit; a non-zero exit that happens to
  // carry the clean marker in stdout must still report the failing exit code (not a
  // contradictory "ALL N PERFECT" on a failed gate).
  return r.status === 0 && cleanMatch ? cleanLabel : `exit ${r.status}`;
}

/** Gate 1: the fleet-coverage verifier (regen + lint + structural + header + markers). */
export function runVerifierGate(spawn = defaultSpawn) {
  const r = spawn('npx', ['tsx', join(REPO_ROOT, 'scripts/verify-jm-fleet-coverage.ts')], { cwd: REPO_ROOT });
  const out = `${r.stdout || ''}`;
  const m = out.match(/ALL (\d+) FLEET-COVERAGE CHECKS PERFECT/);
  return {
    name: 'fleet-coverage-verifier',
    ok: r.status === 0,
    detail: gateDetail(r, m, m ? m[0].slice(0, 80) : null),
  };
}

/** Gate 2: the golden byte-lock snapshots (deterministic emit drift). */
export function runGoldenSnapshotGate(spawn = defaultSpawn) {
  const r = spawn('npx', ['vitest', 'run', ...GOLDEN_SNAPSHOT_TESTS], { cwd: MCP });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/Tests\s+(\d+)\s+passed/);
  return {
    name: 'golden-snapshots',
    ok: r.status === 0,
    detail: gateDetail(r, m, m ? `${m[1]} golden tests passed` : null),
  };
}

/** Read the most recent verdict from the history JSONL (for drift comparison). */
function readLastHistory(historyPath = HISTORY) {
  if (!existsSync(historyPath)) return null;
  const lines = readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]).verdict || null;
  } catch {
    return null; // fail-soft: a corrupt last line never crashes the cron
  }
}

/**
 * Run the cron: execute both gates, compute the verdict, append history, alert on NEW drift.
 * Returns { verdict, drift, stamp }. Gate runners are injectable so tests stay hermetic.
 */
export function runDriftCron({
  stamp = new Date().toISOString(),
  gateRunners = [runVerifierGate, runGoldenSnapshotGate],
  spawn = defaultSpawn,
  historyPath = HISTORY,
  chatPath = CHAT,
  write = true,
} = {}) {
  const gates = gateRunners.map((g) => g(spawn));
  const verdict = decideDriftVerdict(gates);
  const prev = write ? readLastHistory(historyPath) : null;
  const drift = detectGoldenDrift(prev, verdict);

  if (write) {
    mkdirSync(dirname(historyPath), { recursive: true });
    appendFileSync(
      historyPath,
      JSON.stringify({ schemaVersion: '1.0.0', stamp, verdict, drift }) + '\n',
      'utf8',
    );
    if (drift.drifted) {
      try {
        mkdirSync(dirname(chatPath), { recursive: true }); // self-heal the dir like the history path
        appendFileSync(chatPath, formatDriftAlert(stamp, drift, verdict) + '\n', 'utf8');
      } catch {
        /* AGENT_CHAT alert is best-effort; never fail the gate on an alert-write error */
      }
    }
  }
  return { verdict, drift, stamp };
}

// ---- CLI ----
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const json = process.argv.includes('--json');
  const { verdict, drift, stamp } = runDriftCron();
  if (json) {
    console.log(JSON.stringify({ stamp, verdict, drift }, null, 2));
  } else {
    console.log(`post-golden-drift-cron @ ${stamp}`);
    for (const g of verdict.gates) console.log(`  ${g.ok ? 'OK' : 'XX'} ${g.name}: ${g.detail}`);
    console.log(
      verdict.ok
        ? `CLEAN -- all ${verdict.gates.length} post-processor drift gates pass (no JM master-post NC emit regression).`
        : `DRIFT -- failing gate(s): ${verdict.failed.join(', ')}${drift.drifted ? ' (NEW regression -- AGENT_CHAT alerted)' : ' (already-failing, no new alert)'}`,
    );
  }
  process.exit(verdict.ok ? 0 : DRIFT_EXIT);
}
