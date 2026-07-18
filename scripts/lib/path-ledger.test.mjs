// scripts/lib/path-ledger.test.mjs — WORKING-PATH-CAPTURE-MS0 (alpha, 2026-05-31).
// Hermetic node:test over tmpdir roots + a real-data E2E (record→capture→find→plan→emit).
// The E2E is the "hermetic fakes don't prove wiring" oracle: it drives the FULL chain on disk
// and asserts emitLearningRow's row parses under the SAME shape india's outcome-bus consumers read.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  safePathId, stepsHash, digestArgs, resolveDomain,
  recordStep, readActiveSteps, captureWorkingPath, readWorkingPaths,
  findWorkingPaths, toExecutionPlan, emitLearningRow, DEFAULT_ROOTS,
} from "./path-ledger.mjs";

function freshRoots() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "path-ledger-test-"));
  return {
    activeDir: path.join(dir, "active"),
    workingPaths: path.join(dir, "working-paths.jsonl"),
    outcomeBus: path.join(dir, "outcome-bus.jsonl"),
  };
}
const FIXED = "2026-05-31T00:00:00.000Z";

test("safePathId accepts safe ids, rejects traversal/separators/empty", () => {
  assert.equal(safePathId("alpha-da9a-feat1"), "alpha-da9a-feat1");
  assert.equal(safePathId("../escape"), null);
  assert.equal(safePathId("a/b"), null);
  assert.equal(safePathId(".."), null);
  assert.equal(safePathId(""), null);
  assert.equal(safePathId(null), null);
});

test("stepsHash is deterministic AND order-sensitive", () => {
  const a = [{ action: "x", argsDigest: "1" }, { action: "y", argsDigest: "2" }];
  const b = [{ action: "y", argsDigest: "2" }, { action: "x", argsDigest: "1" }];
  assert.equal(stepsHash(a), stepsHash(a));
  assert.notEqual(stepsHash(a), stepsHash(b), "reordering changes the hash");
  assert.equal(stepsHash([]).length, 16);
});

test("digestArgs is stable + bounded", () => {
  assert.equal(digestArgs({ a: 1 }), digestArgs({ a: 1 }));
  assert.equal(digestArgs(null), "");
  assert.equal(digestArgs("x").length, 16);
});

test("resolveDomain maps known slots + falls back for unknown", () => {
  assert.equal(resolveDomain("delta"), "cad");
  assert.equal(resolveDomain("india"), "ai-training");
  assert.equal(resolveDomain("kilo"), "cam");
  assert.equal(resolveDomain("zzz"), "zzz-unknown");
  assert.equal(resolveDomain(""), "unknown");
});

test("recordStep appends ordered steps; bad input → ok:false", () => {
  const roots = freshRoots();
  assert.equal(recordStep("../bad", { action: "x" }, { roots }).ok, false);
  assert.equal(recordStep("p1", { noAction: true }, { roots }).ok, false);
  const r0 = recordStep("p1", { action: "open_step", args: { file: "a.step" } }, { roots, now: FIXED });
  assert.equal(r0.ok, true); assert.equal(r0.seq, 0);
  const r1 = recordStep("p1", { action: "recognize_features", argsDigest: "feat" }, { roots, now: FIXED });
  assert.equal(r1.seq, 1);
  const steps = readActiveSteps("p1", { roots });
  assert.equal(steps.length, 2);
  assert.deepEqual(steps.map((s) => s.action), ["open_step", "recognize_features"]);
});

test("PRISM_PATH_LEDGER_DISABLE makes recordStep/capture/emit no-ops", () => {
  const roots = freshRoots();
  process.env.PRISM_PATH_LEDGER_DISABLE = "1";
  try {
    assert.equal(recordStep("p", { action: "x" }, { roots }).ok, false);
    assert.equal(captureWorkingPath("p", { domain: "cad", goalType: "g", outcome: { success: true } }, { roots, steps: [{ seq: 0, action: "x" }] }).captured, false);
    assert.equal(emitLearningRow({ workingPathId: "w", working: true }, { roots }).emitted, false);
  } finally { delete process.env.PRISM_PATH_LEDGER_DISABLE; }
  assert.equal(fs.existsSync(roots.workingPaths), false);
});

test("captureWorkingPath promotes a succeeded trajectory; re-capture dedups + bumps captureCount", () => {
  const roots = freshRoots();
  recordStep("p2", { action: "open_step", argsDigest: "a" }, { roots });
  recordStep("p2", { action: "make_solid", argsDigest: "b" }, { roots });
  const c1 = captureWorkingPath("p2", { domain: "cad", goalType: "trilobe", goal: "electrode", outcome: { success: true }, score: 0.9, sessionId: "s1" }, { roots });
  assert.equal(c1.captured, true); assert.equal(c1.deduped, false);
  let rows = readWorkingPaths({ roots });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].working, true);
  assert.equal(rows[0].stepsCount, 2);
  assert.equal(rows[0].captureCount, 1);
  // identical re-capture → dedup, not a new row
  const c2 = captureWorkingPath("p2", { domain: "cad", goalType: "trilobe", outcome: { success: true } }, { roots });
  assert.equal(c2.captured, true); assert.equal(c2.deduped, true);
  rows = readWorkingPaths({ roots });
  assert.equal(rows.length, 1, "no duplicate row");
  assert.equal(rows[0].captureCount, 2);
});

test("captureWorkingPath with no steps → captured:false; negative outcome → working:false", () => {
  const roots = freshRoots();
  assert.equal(captureWorkingPath("nope", { domain: "cad" }, { roots }).captured, false);
  const c = captureWorkingPath("pn", { domain: "cam", goalType: "pocket", outcome: { success: false } }, { roots, steps: [{ seq: 0, action: "fail" }] });
  assert.equal(c.captured, true);
  assert.equal(readWorkingPaths({ roots })[0].working, false);
});

test("findWorkingPaths filters by domain+goalType, excludes negatives by default", () => {
  const roots = freshRoots();
  captureWorkingPath("a", { domain: "cad", goalType: "g1", outcome: { success: true }, score: 0.5 }, { roots, steps: [{ seq: 0, action: "x" }] });
  captureWorkingPath("b", { domain: "cad", goalType: "g1", outcome: { success: true }, score: 0.9 }, { roots, steps: [{ seq: 0, action: "y" }] });
  captureWorkingPath("c", { domain: "cad", goalType: "g1", outcome: { success: false } }, { roots, steps: [{ seq: 0, action: "z" }] });
  captureWorkingPath("d", { domain: "cam", goalType: "g1", outcome: { success: true } }, { roots, steps: [{ seq: 0, action: "w" }] });
  const found = findWorkingPaths("cad", "g1", { roots });
  assert.equal(found.length, 2, "2 positive cad/g1 paths (negative excluded, cam excluded)");
  assert.equal(found[0].score, 0.9, "sorted best-first by score");
  const withNeg = findWorkingPaths("cad", "g1", { roots, includeNegative: true });
  assert.equal(withNeg.length, 3);
});

test("findWorkingPaths ranks by kNN cosine when an embed fn is injected (acceleration lever)", () => {
  const roots = freshRoots();
  captureWorkingPath("a", { domain: "cad", goalType: "g", goal: "round hole", outcome: { success: true } }, { roots, steps: [{ seq: 0, action: "x" }] });
  captureWorkingPath("b", { domain: "cad", goalType: "g", goal: "square pocket", outcome: { success: true } }, { roots, steps: [{ seq: 0, action: "y" }] });
  // toy embedder: 2-d by keyword presence
  const embed = (t) => [/round|hole/i.test(t) ? 1 : 0, /square|pocket/i.test(t) ? 1 : 0];
  const found = findWorkingPaths("cad", "g", { roots, embed, query: "drill a round hole", topK: 2 });
  assert.equal(found[0].goal, "round hole", "nearest-by-meaning ranked first");
  assert.ok(found[0].similarity > found[1].similarity);
});

test("toExecutionPlan preserves order, params, count, origin", () => {
  const wp = { workingPathId: "cad::trilobe::abc", domain: "cad", goalType: "trilobe",
    steps: [{ seq: 0, action: "open_step", argsDigest: "a" }, { seq: 1, action: "make_solid", argsDigest: "b" }] };
  const plan = toExecutionPlan(wp);
  assert.equal(plan.origin, "path-ledger");
  assert.equal(plan.domain, "cad");
  assert.equal(plan.source_working_path, "cad::trilobe::abc");
  assert.equal(plan.total_steps, 2);
  assert.deepEqual(plan.steps.map((s) => s.action), ["open_step", "make_solid"]);
  assert.equal(toExecutionPlan({}).total_steps, 0, "empty WP → empty plan, no throw");
});

test("emitLearningRow appends an outcome-bus-schema row (india parity) + additive fields", () => {
  const roots = freshRoots();
  const wp = { workingPathId: "cad::trilobe::abc", domain: "cad", goalType: "trilobe", working: true, stepsCount: 3, score: 0.9, sourceSession: "s1" };
  const r = emitLearningRow(wp, { roots, slot: "delta", sessionId: "s1", now: FIXED });
  assert.equal(r.emitted, true);
  const lines = fs.readFileSync(roots.outcomeBus, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0]);
  // outcome-bus parity (fields outcome-bus-auto-tap.mjs writes + consumers read):
  for (const k of ["ts", "source", "session_id", "slot", "domain", "tool", "success", "hint", "task", "previously_failed"]) {
    assert.ok(k in row, `row has outcome-bus field '${k}'`);
  }
  assert.equal(row.source, "path-ledger");
  assert.equal(row.domain, "cad");
  assert.equal(row.success, true);
  assert.equal(row.tool, "WorkingPath");
  // additive path-ledger fields
  assert.equal(row.working_path_id, "cad::trilobe::abc");
  assert.equal(row.steps_count, 3);
});

test("fail-soft: corrupt/missing working-paths → findWorkingPaths returns [] (never throws)", () => {
  const roots = freshRoots();
  assert.deepEqual(findWorkingPaths("cad", "g", { roots }), [], "missing file → []");
  fs.mkdirSync(path.dirname(roots.workingPaths), { recursive: true });
  fs.writeFileSync(roots.workingPaths, "not json\n{also bad\n");
  assert.deepEqual(findWorkingPaths("cad", "g", { roots }), [], "corrupt lines skipped → []");
});

test("DEFAULT_ROOTS point under state/shared/path-ledger and outcome-bus", () => {
  assert.ok(DEFAULT_ROOTS.activeDir.includes("path-ledger"));
  assert.ok(DEFAULT_ROOTS.workingPaths.endsWith("working-paths.jsonl"));
  assert.ok(DEFAULT_ROOTS.outcomeBus.endsWith("outcome-bus.jsonl"));
});

test("E2E real-fs chain: record → capture → find → toExecutionPlan → emitLearningRow", () => {
  const roots = freshRoots();
  // 1. plot the path (delta autonomous CAD trajectory)
  recordStep("e2e", { action: "parse_step", args: { file: "trilobe.step" } }, { roots });
  recordStep("e2e", { action: "recognize_features", argsDigest: "trilobe-3lobe" }, { roots });
  recordStep("e2e", { action: "emit_solid", argsDigest: "multi-prism" }, { roots });
  // 2. goal achieved → capture the working path
  const cap = captureWorkingPath("e2e", { domain: "cad", goalType: "electrode-trilobe", goal: "JM trilobe electrode", outcome: { success: true }, score: 1, sessionId: "da9aacf5" }, { roots });
  assert.equal(cap.captured, true);
  // 3. a later goal of the same type retrieves the proven path
  const found = findWorkingPaths("cad", "electrode-trilobe", { roots });
  assert.equal(found.length, 1);
  assert.equal(found[0].workingPathId, cap.workingPathId);
  // 4. adapt to an autonomous ExecutionPlan
  const plan = toExecutionPlan(found[0]);
  assert.equal(plan.total_steps, 3);
  assert.deepEqual(plan.steps.map((s) => s.action), ["parse_step", "recognize_features", "emit_solid"]);
  // 5. feed the learning system (india's outcome bus)
  const emit = emitLearningRow(found[0], { roots, slot: "delta", sessionId: "da9aacf5" });
  assert.equal(emit.emitted, true);
  const busRow = JSON.parse(fs.readFileSync(roots.outcomeBus, "utf8").trim());
  assert.equal(busRow.domain, "cad");
  assert.equal(busRow.success, true);
  assert.equal(busRow.working_path_id, cap.workingPathId);
});
