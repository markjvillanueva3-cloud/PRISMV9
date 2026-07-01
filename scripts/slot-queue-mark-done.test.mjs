#!/usr/bin/env node
/**
 * Tests for the picker entry-done blocker fix:
 *   - entryCompleted() predicate in slot-queue.mjs (the load-bearing logic)
 *   - slot-queue-mark-done.mjs CLI (atomic stamp, idempotency, scoping)
 * Real-value assertions; the mark-done CLI is driven against a temp fixture
 * via PRISM_SLOT_QUEUE_PATH. Run: node --test scripts/slot-queue-mark-done.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { entryCompleted } from "./slot-queue.mjs";

const MARK = path.resolve("scripts/slot-queue-mark-done.mjs");

function runMark(queuePath, extraArgs) {
  try {
    const out = execFileSync(process.execPath, [MARK, ...extraArgs], {
      env: { ...process.env, PRISM_SLOT_QUEUE_PATH: queuePath },
      encoding: "utf8",
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

function tmpQueue(obj) {
  const p = path.join(os.tmpdir(), `slotq-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

// ── entryCompleted predicate ──────────────────────────────────────────────

test("entryCompleted: completed_at set → done", () => {
  assert.equal(entryCompleted({ completed_at: "2026-05-17T00:00:00Z" }), true);
});

test("entryCompleted: status terminal (case-insensitive) → done", () => {
  assert.equal(entryCompleted({ status: "shipped" }), true);
  assert.equal(entryCompleted({ status: "Completed" }), true);
  assert.equal(entryCompleted({ status: "DONE" }), true);
  assert.equal(entryCompleted({ status: "  done  " }), true);
});

test("entryCompleted: pending/in-progress/unknown → NOT done", () => {
  assert.equal(entryCompleted({ status: "pending" }), false);
  assert.equal(entryCompleted({ status: "building" }), false);
  assert.equal(entryCompleted({ status: "" }), false);
  assert.equal(entryCompleted({}), false);
});

test("entryCompleted: malformed input never throws, returns false", () => {
  assert.equal(entryCompleted(null), false);
  assert.equal(entryCompleted(undefined), false);
  assert.equal(entryCompleted("string"), false);
  assert.equal(entryCompleted(42), false);
  assert.equal(entryCompleted({ status: 123 }), false); // non-string status
});

test("entryCompleted: empty completed_at string is NOT done", () => {
  // "" is falsy → must not count as done (a half-written stamp must not skip).
  assert.equal(entryCompleted({ completed_at: "" }), false);
});

// ── mark-done CLI ─────────────────────────────────────────────────────────

test("mark-done: dry-run reports match, writes nothing", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-FOO", status: "pending" }] } });
  const before = fs.readFileSync(p, "utf8");
  const r = runMark(p, ["--unit-id", "U-FOO", "--dry-run"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /"matched": 1/);
  assert.match(r.out, /"stamped": 1/);
  assert.match(r.out, /"mode": "dry-run"/);
  assert.equal(fs.readFileSync(p, "utf8"), before, "dry-run must not mutate the file");
  fs.unlinkSync(p);
});

test("mark-done: apply stamps completed_at + completed_by atomically", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-BAR", status: "pending" }] } });
  const r = runMark(p, ["--unit-id", "U-BAR", "--by", "claude-test", "--apply"]);
  assert.equal(r.code, 0);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const e = j.queues.lima[0];
  assert.ok(e.completed_at, "completed_at must be set");
  assert.equal(e.completed_by, "claude-test");
  // The patched picker predicate must now treat it done.
  assert.equal(entryCompleted(e), true);
  fs.unlinkSync(p);
});

test("mark-done: case-insensitive unit-id match", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-CaseTest" }] } });
  const r = runMark(p, ["--unit-id", "u-casetest", "--apply"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /"stamped": 1/);
  fs.unlinkSync(p);
});

test("mark-done: idempotent — second apply skips already-done (alreadyDone)", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-IDEM", status: "pending" }] } });
  runMark(p, ["--unit-id", "U-IDEM", "--apply"]);
  const firstStamp = JSON.parse(fs.readFileSync(p, "utf8")).queues.lima[0].completed_at;
  const r2 = runMark(p, ["--unit-id", "U-IDEM", "--apply"]);
  assert.equal(r2.code, 0);
  assert.match(r2.out, /"alreadyDone": 1/);
  assert.match(r2.out, /"stamped": 0/);
  const secondStamp = JSON.parse(fs.readFileSync(p, "utf8")).queues.lima[0].completed_at;
  assert.equal(firstStamp, secondStamp, "idempotent run must not re-stamp/alter timestamp");
  fs.unlinkSync(p);
});

test("mark-done: --force re-stamps an already-done entry", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-F", completed_at: "2000-01-01T00:00:00Z" }] } });
  const r = runMark(p, ["--unit-id", "U-F", "--force", "--apply"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /"stamped": 1/);
  const ts = JSON.parse(fs.readFileSync(p, "utf8")).queues.lima[0].completed_at;
  assert.notEqual(ts, "2000-01-01T00:00:00Z", "--force must overwrite the old timestamp");
  fs.unlinkSync(p);
});

test("mark-done: --slot scopes to one slot only", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-DUP" }], mike: [{ unit_id: "U-DUP" }] } });
  const r = runMark(p, ["--unit-id", "U-DUP", "--slot", "lima", "--apply"]);
  assert.equal(r.code, 0);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.ok(j.queues.lima[0].completed_at, "lima entry stamped");
  assert.ok(!j.queues.mike[0].completed_at, "mike entry must be untouched (scoped)");
  fs.unlinkSync(p);
});

test("mark-done: zero match is idempotent success (exit 0), not an error", () => {
  const p = tmpQueue({ queues: { lima: [{ unit_id: "U-OTHER" }] } });
  const r = runMark(p, ["--unit-id", "U-NOPE", "--apply"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /"matched": 0/);
  assert.match(r.out, /nothing to stamp/);
  fs.unlinkSync(p);
});

test("mark-done: unknown arg and missing --unit-id are arg errors (exit 2)", () => {
  const p = tmpQueue({ queues: { lima: [] } });
  assert.equal(runMark(p, ["--bogus"]).code, 2);
  assert.equal(runMark(p, ["--apply"]).code, 2); // no --unit-id
  fs.unlinkSync(p);
});
