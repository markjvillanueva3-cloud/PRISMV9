#!/usr/bin/env node
/**
 * Tests for post-golden-drift-cron.mjs (U-PP-GOLDEN-NC-CRON, slot:echo).
 * Pure drift logic + the injected-runner cron path (hermetic -- no child processes spawned).
 * Run: node scripts/post-golden-drift-cron.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decideDriftVerdict,
  detectGoldenDrift,
  formatDriftAlert,
  runDriftCron,
  runVerifierGate,
  runGoldenSnapshotGate,
  DRIFT_EXIT,
  GOLDEN_SNAPSHOT_TESTS,
} from './post-golden-drift-cron.mjs';

const okGate = (name) => () => ({ name, ok: true, detail: 'clean' });
const badGate = (name) => () => ({ name, ok: false, detail: 'DRIFTED' });

describe('decideDriftVerdict', () => {
  it('all gates ok -> clean verdict', () => {
    const v = decideDriftVerdict([{ name: 'a', ok: true }, { name: 'b', ok: true }]);
    assert.equal(v.ok, true);
    assert.deepEqual(v.failed, []);
  });
  it('any gate failing -> dirty verdict naming the failed gate', () => {
    const v = decideDriftVerdict([{ name: 'a', ok: true }, { name: 'b', ok: false }]);
    assert.equal(v.ok, false);
    assert.deepEqual(v.failed, ['b']);
  });
  it('a missing/undefined gate counts as failed (never silently passes)', () => {
    const v = decideDriftVerdict([{ name: 'a', ok: true }, undefined]);
    assert.equal(v.ok, false);
    assert.deepEqual(v.failed, ['unknown']);
  });
  it('non-array input -> clean empty (defensive)', () => {
    assert.equal(decideDriftVerdict(null).ok, true);
  });
});

describe('detectGoldenDrift', () => {
  it('prev clean + curr dirty -> NEW drift', () => {
    const prev = { ok: true, gates: [{ name: 'g', ok: true }] };
    const curr = { ok: false, gates: [{ name: 'g', ok: false }] };
    const d = detectGoldenDrift(prev, curr);
    assert.equal(d.drifted, true);
    assert.deepEqual(d.newFailures, ['g']);
  });
  it('prev ALREADY failing + still failing same gate -> NOT a new drift (no alert spam)', () => {
    const prev = { ok: false, gates: [{ name: 'g', ok: false }] };
    const curr = { ok: false, gates: [{ name: 'g', ok: false }] };
    const d = detectGoldenDrift(prev, curr);
    assert.equal(d.drifted, false);
    assert.deepEqual(d.newFailures, []);
  });
  it('no prior history + curr dirty -> drift (first-ever-failing surfaces)', () => {
    const d = detectGoldenDrift(null, { ok: false, gates: [{ name: 'g', ok: false }] });
    assert.equal(d.drifted, true);
  });
  it('prev clean + curr clean -> no drift', () => {
    const d = detectGoldenDrift({ ok: true, gates: [] }, { ok: true, gates: [{ name: 'g', ok: true }] });
    assert.equal(d.drifted, false);
  });
  it('one gate stays-failed but a DIFFERENT gate newly fails -> drift on the new one only', () => {
    const prev = { ok: false, gates: [{ name: 'a', ok: false }, { name: 'b', ok: true }] };
    const curr = { ok: false, gates: [{ name: 'a', ok: false }, { name: 'b', ok: false }] };
    const d = detectGoldenDrift(prev, curr);
    assert.equal(d.drifted, true);
    assert.deepEqual(d.newFailures, ['b']);
  });
});

describe('formatDriftAlert', () => {
  it('names the failing gates + carries a re-run command', () => {
    const alert = formatDriftAlert('2026-06-28T00:00:00Z', { newFailures: ['golden-snapshots'] }, { failed: ['golden-snapshots'] });
    assert.match(alert, /post-golden-drift-cron: DRIFT/);
    assert.match(alert, /golden-snapshots/);
    assert.match(alert, /verify-jm-fleet-coverage\.ts/);
  });
});

describe('runDriftCron (injected runners -- hermetic)', () => {
  it('all gates pass -> clean verdict, history appended, NO chat alert', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pgdc-'));
    const historyPath = join(dir, 'history.jsonl');
    const chatDir = join(dir, 'chat');
    mkdirSync(chatDir);
    const chatPath = join(chatDir, 'AGENT_CHAT.md');
    try {
      const { verdict, drift } = runDriftCron({
        stamp: '2026-06-28T01:00:00Z',
        gateRunners: [okGate('fleet-coverage-verifier'), okGate('golden-snapshots')],
        historyPath,
        chatPath,
      });
      assert.equal(verdict.ok, true);
      assert.equal(drift.drifted, false);
      const hist = readFileSync(historyPath, 'utf8').trim().split('\n');
      assert.equal(hist.length, 1);
      assert.equal(JSON.parse(hist[0]).verdict.ok, true);
      assert.equal(existsSync(chatPath), false, 'no alert file on clean run');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('PLANTED DRIFT: a gate fails -> dirty verdict + AGENT_CHAT alert written (the loss function)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pgdc-'));
    const historyPath = join(dir, 'history.jsonl');
    const chatDir = join(dir, 'chat');
    mkdirSync(chatDir);
    const chatPath = join(chatDir, 'AGENT_CHAT.md');
    try {
      const { verdict, drift } = runDriftCron({
        stamp: '2026-06-28T02:00:00Z',
        gateRunners: [okGate('fleet-coverage-verifier'), badGate('golden-snapshots')],
        historyPath,
        chatPath,
      });
      assert.equal(verdict.ok, false);
      assert.deepEqual(verdict.failed, ['golden-snapshots']);
      assert.equal(drift.drifted, true);
      assert.ok(existsSync(chatPath), 'alert file written on drift');
      assert.match(readFileSync(chatPath, 'utf8'), /DRIFT -- JM master-post NC emit changed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('drift that PERSISTS across two runs alerts ONCE (no spam)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pgdc-'));
    const historyPath = join(dir, 'history.jsonl');
    const chatDir = join(dir, 'chat');
    mkdirSync(chatDir);
    const chatPath = join(chatDir, 'AGENT_CHAT.md');
    try {
      const runners = [okGate('fleet-coverage-verifier'), badGate('golden-snapshots')];
      const r1 = runDriftCron({ stamp: 't1', gateRunners: runners, historyPath, chatPath });
      assert.equal(r1.drift.drifted, true); // first failing run = new drift
      const r2 = runDriftCron({ stamp: 't2', gateRunners: runners, historyPath, chatPath });
      assert.equal(r2.drift.drifted, false); // still failing same gate = no new alert
      // history has 2 rows; chat has exactly 1 alert line
      assert.equal(readFileSync(historyPath, 'utf8').trim().split('\n').length, 2);
      assert.equal(readFileSync(chatPath, 'utf8').trim().split('\n').filter(Boolean).length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('gate runners -- launch failure vs real exit (R12 distinction)', () => {
  it('spawn status:null (launch failure) -> gate ok:false + "FAILED TO LAUNCH" (NOT emit drift)', () => {
    const nullSpawn = () => ({ status: null, error: { code: 'ENOENT' }, stdout: '', stderr: '' });
    const gv = runVerifierGate(nullSpawn);
    assert.equal(gv.ok, false);
    assert.match(gv.detail, /FAILED TO LAUNCH/);
    assert.match(gv.detail, /ENOENT/);
    const gg = runGoldenSnapshotGate(nullSpawn);
    assert.equal(gg.ok, false);
    assert.match(gg.detail, /FAILED TO LAUNCH/);
  });
  it('spawn status:0 with the clean banner -> ok:true + clean label', () => {
    const okSpawn = () => ({ status: 0, stdout: 'ALL 20 FLEET-COVERAGE CHECKS PERFECT', stderr: '' });
    const gv = runVerifierGate(okSpawn);
    assert.equal(gv.ok, true);
    assert.match(gv.detail, /PERFECT/);
  });
  it('non-zero exit carrying the clean banner -> ok:false + exit code (no contradictory clean label)', () => {
    const failSpawn = () => ({ status: 1, stdout: 'ALL 20 FLEET-COVERAGE CHECKS PERFECT', stderr: '' });
    const gv = runVerifierGate(failSpawn);
    assert.equal(gv.ok, false);
    assert.match(gv.detail, /exit 1/);
    assert.doesNotMatch(gv.detail, /PERFECT/);
  });
});

describe('contract constants', () => {
  it('DRIFT_EXIT is a non-zero exit so a scheduled task / CI run goes red on drift', () => {
    assert.equal(DRIFT_EXIT, 3);
    assert.notEqual(DRIFT_EXIT, 0);
  });
  it('golden snapshot test list is non-empty and targets the deterministic post engines', () => {
    assert.ok(GOLDEN_SNAPSHOT_TESTS.length >= 2);
    assert.ok(GOLDEN_SNAPSHOT_TESTS.every((t) => t.endsWith('.golden.test.ts')));
  });
});
