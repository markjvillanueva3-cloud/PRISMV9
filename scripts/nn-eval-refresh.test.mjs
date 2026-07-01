// scripts/nn-eval-refresh.test.mjs
// Tests for U-NN-EVAL-REFRESH. Run: node --test scripts/nn-eval-refresh.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  readLifecycle,
  findLatestTrained,
  findLatestAny,
  buildLatestCandidate,
  buildDegradedMarker,
  refresh,
  writeOutput,
} = await import("./nn-eval-refresh.mjs");

function makeTempLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nn-eval-refresh-test-"));
  return path.join(dir, "retrain-lifecycle.jsonl");
}

function writeLedger(p, entries) {
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(p, lines);
}

function entry(opts) {
  return {
    schemaVersion: 1,
    ts: opts.ts || "2026-05-27T00:00:00.000Z",
    action: opts.action || "skip",
    ok: opts.ok ?? true,
    trained: opts.trained ?? false,
    trainExitCode: opts.trainExitCode ?? null,
    assessment: opts.assessment ?? null,
    promote: opts.promote ?? null,
    promoted: opts.promoted ?? false,
    drift: opts.drift ?? null,
    fingerprint: opts.fingerprint ?? null,
    errors: opts.errors ?? [],
  };
}

// ─── readLifecycle ─────────────────────────────────────────────────────────
test("readLifecycle: returns empty array when file missing", () => {
  const p = path.join(os.tmpdir(), `nonexistent-${process.pid}-${Date.now()}.jsonl`);
  assert.deepEqual(readLifecycle(p), []);
});

test("readLifecycle: parses valid JSONL lines + skips corrupt", () => {
  const p = makeTempLedger();
  fs.writeFileSync(
    p,
    JSON.stringify(entry({ ts: "2026-01-01T00:00:00.000Z" })) + "\n" +
    "not-json\n" +
    JSON.stringify(entry({ ts: "2026-02-01T00:00:00.000Z" })) + "\n",
  );
  const out = readLifecycle(p);
  assert.equal(out.length, 2);
  assert.equal(out[0].ts, "2026-01-01T00:00:00.000Z");
  assert.equal(out[1].ts, "2026-02-01T00:00:00.000Z");
});

// ─── findLatestTrained ─────────────────────────────────────────────────────
test("findLatestTrained: returns null when no trained entry", () => {
  const entries = [entry({ action: "skip", trained: false }), entry({ action: "skip", trained: false })];
  assert.equal(findLatestTrained(entries), null);
});

test("findLatestTrained: returns null on empty array or non-array", () => {
  assert.equal(findLatestTrained([]), null);
  assert.equal(findLatestTrained(null), null);
  assert.equal(findLatestTrained(undefined), null);
});

test("findLatestTrained: returns the MOST RECENT trained:true entry", () => {
  const entries = [
    entry({ ts: "2026-01-01T00:00:00.000Z", trained: true, action: "retrain" }),
    entry({ ts: "2026-02-01T00:00:00.000Z", trained: false, action: "skip" }),
    entry({ ts: "2026-03-01T00:00:00.000Z", trained: true, action: "retrain" }), // ← this
    entry({ ts: "2026-04-01T00:00:00.000Z", trained: false, action: "skip" }),
  ];
  const got = findLatestTrained(entries);
  assert.equal(got.ts, "2026-03-01T00:00:00.000Z");
});

// ─── findLatestAny ─────────────────────────────────────────────────────────
test("findLatestAny: returns null on empty + last entry otherwise", () => {
  assert.equal(findLatestAny([]), null);
  assert.equal(findLatestAny(null), null);
  const entries = [entry({ ts: "2026-01-01T00:00:00.000Z" }), entry({ ts: "2026-12-31T00:00:00.000Z" })];
  assert.equal(findLatestAny(entries).ts, "2026-12-31T00:00:00.000Z");
});

// ─── buildLatestCandidate ──────────────────────────────────────────────────
test("buildLatestCandidate: preserves trained fields + adds envelope metadata", () => {
  const trained = entry({
    ts: "2026-05-25T20:57:52.208Z",
    action: "retrain",
    trained: true,
    trainExitCode: 0,
    assessment: { auroc: 0.6129, brier: 0.2 },
    promote: { wouldPromote: false, reason: "below-threshold" },
    promoted: false,
    drift: { retrain: true, reason: "feature-source change" },
    fingerprint: { nodeCount: 291840 },
  });
  const env = buildLatestCandidate(trained);
  assert.equal(env.schemaVersion, 1);
  assert.match(env.refreshedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(env.source, "retrain-lifecycle.jsonl");
  assert.equal(env.ts, "2026-05-25T20:57:52.208Z");
  assert.equal(env.trained, true);
  assert.equal(env.assessment.auroc, 0.6129);
  assert.equal(env.promote.wouldPromote, false);
  assert.equal(env.promoted, false);
  assert.equal(env.drift.retrain, true);
  assert.equal(env.fingerprint.nodeCount, 291840);
  assert.ok(env.note);
});

// ─── buildDegradedMarker ───────────────────────────────────────────────────
test("buildDegradedMarker: reason='empty-lifecycle-ledger' when no entries", () => {
  const env = buildDegradedMarker(null);
  assert.equal(env.degraded, true);
  assert.equal(env.reason, "empty-lifecycle-ledger");
  assert.equal(env.lastEntry, null);
});

test("buildDegradedMarker: reason='no-trained-entry' when only skip entries", () => {
  const lastSkip = entry({ ts: "2026-05-27T18:00:00.000Z", action: "skip", trained: false, drift: { retrain: false } });
  const env = buildDegradedMarker(lastSkip);
  assert.equal(env.degraded, true);
  assert.equal(env.reason, "no-trained-entry-in-lifecycle");
  assert.equal(env.lastEntry.ts, "2026-05-27T18:00:00.000Z");
  assert.equal(env.lastEntry.action, "skip");
  assert.equal(env.lastEntry.trained, false);
});

// ─── refresh (top-level) ────────────────────────────────────────────────────
test("refresh: returns degraded marker when ledger missing", () => {
  const env = refresh(path.join(os.tmpdir(), `nonexistent-${process.pid}-${Date.now()}.jsonl`));
  assert.equal(env.degraded, true);
  assert.equal(env.reason, "empty-lifecycle-ledger");
});

test("refresh: returns trained envelope when trained entries exist", () => {
  const p = makeTempLedger();
  writeLedger(p, [
    entry({ ts: "2026-01-01T00:00:00.000Z", action: "skip", trained: false }),
    entry({ ts: "2026-05-25T20:57:52.208Z", action: "retrain", trained: true, assessment: { auroc: 0.6129 } }),
    entry({ ts: "2026-05-26T06:00:00.000Z", action: "skip", trained: false }), // newer skip — shouldn't shadow trained
  ]);
  const env = refresh(p);
  assert.equal(env.degraded, undefined);
  assert.equal(env.trained, true);
  assert.equal(env.ts, "2026-05-25T20:57:52.208Z");
  assert.equal(env.assessment.auroc, 0.6129);
});

test("refresh: degraded path when only skip entries", () => {
  const p = makeTempLedger();
  writeLedger(p, [
    entry({ ts: "2026-05-26T06:00:00.000Z", action: "skip", trained: false }),
    entry({ ts: "2026-05-27T06:00:00.000Z", action: "skip", trained: false }),
  ]);
  const env = refresh(p);
  assert.equal(env.degraded, true);
  assert.equal(env.lastEntry.ts, "2026-05-27T06:00:00.000Z");
});

// ─── writeOutput ───────────────────────────────────────────────────────────
test("writeOutput: creates parent dir + writes JSON file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nn-eval-out-"));
  const out = path.join(dir, "nested", "latest-candidate.json");
  const env = { schemaVersion: 1, test: true };
  const written = writeOutput(env, out);
  assert.equal(written, out);
  assert.ok(fs.existsSync(out));
  const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(parsed.test, true);
  assert.equal(parsed.schemaVersion, 1);
});

// ─── end-to-end ─────────────────────────────────────────────────────────────
test("end-to-end: realistic lifecycle → trained envelope written to disk", () => {
  const p = makeTempLedger();
  writeLedger(p, [
    entry({ ts: "2026-05-22T00:00:00.000Z", action: "retrain", trained: true, assessment: { auroc: 0.5, brier: 0.35 } }),
    entry({ ts: "2026-05-25T20:57:52.208Z", action: "retrain", trained: true, assessment: { auroc: 0.6129, brier: 0.21 }, fingerprint: { nodeCount: 291840 } }),
    entry({ ts: "2026-05-26T06:00:00.000Z", action: "skip", trained: false, drift: { retrain: false, reason: "no drift" } }),
    entry({ ts: "2026-05-27T18:00:00.000Z", action: "skip", trained: false, drift: { retrain: false, reason: "no drift" } }),
  ]);
  const env = refresh(p);
  // Should pick the 0.6129 entry, not the older 0.5 one + not be shadowed by skips
  assert.equal(env.trained, true);
  assert.equal(env.ts, "2026-05-25T20:57:52.208Z");
  assert.equal(env.assessment.auroc, 0.6129);
  assert.equal(env.fingerprint.nodeCount, 291840);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nn-eval-e2e-"));
  const outPath = path.join(dir, "latest-candidate.json");
  writeOutput(env, outPath);
  const onDisk = JSON.parse(fs.readFileSync(outPath, "utf8"));
  assert.equal(onDisk.assessment.auroc, 0.6129);
});
