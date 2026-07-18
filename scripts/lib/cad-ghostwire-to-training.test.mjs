/**
 * Tests for cad-ghostwire-to-training.mjs (U-DELTA-GHOSTWIRE-CONVERTER, slot:delta).
 * Run: node scripts/lib/cad-ghostwire-to-training.test.mjs   (node:test auto-runs on exit)
 *
 * R9: every assert encodes WHY -- the trust gate (confirmed-only) is the load-bearing behavior;
 * a test that passed when a pending guess produced a pair would be worthless. Reference values
 * are the REAL ledger shape (verified 2026-06-28). Happy + 4 failure modes + 3 adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ghostwireToTrainingPair,
  convertGhostwireText,
  dedupPairs,
} from "./cad-ghostwire-to-training.mjs";

// Real ledger row shape (from state/shared/ghost-wire-outcomes.jsonl).
const confirmedRow = {
  ghostId: "ghost.unwired.AcousticEmissionMonitoringEngine",
  engineName: "AcousticEmissionMonitoringEngine",
  proposedWiring: "prism_dev",
  confidence: 0.7,
  reason: "dev/build/telemetry keyword",
  dispatcherFile: "devDispatcher.ts",
  validation: { status: "confirmed", reason: "engine-referenced", daysOpen: 1 },
};
const pendingRow = {
  ghostId: "ghost.unwired.AbstractionHierarchyEngine",
  engineName: "AbstractionHierarchyEngine",
  proposedWiring: "prism_intelligence",
  confidence: 0.68,
  reason: "abstract/cognitive intelligence keyword",
  validation: { status: "pending", reason: "no-reference-yet", daysOpen: 0 },
};

// ---- ghostwireToTrainingPair: happy paths ----
test("happy: confirmed row with reason -> instruction names engine, output = wiring -- reason", () => {
  const p = ghostwireToTrainingPair(confirmedRow);
  assert.ok(p, "a confirmed, fully-formed row MUST produce a pair");
  assert.match(p.instruction, /AcousticEmissionMonitoringEngine/, "instruction must carry the engine subject");
  assert.match(p.instruction, /prism_\* MCP dispatcher/, "instruction must ask the wiring question");
  assert.equal(p.output, "prism_dev -- dev/build/telemetry keyword", "output = confirmed dispatcher + rationale");
});

test("happy: confirmed row WITHOUT reason -> output is the bare wiring (no ' -- ' suffix)", () => {
  const { reason, ...noReason } = confirmedRow;
  const p = ghostwireToTrainingPair(noReason);
  assert.ok(p);
  assert.equal(p.output, "prism_dev", "no reason => output is just the dispatcher, not a dangling separator");
});

test("happy: missing engineName falls back to ghostId as the subject", () => {
  const p = ghostwireToTrainingPair({ ...confirmedRow, engineName: undefined });
  assert.ok(p, "ghostId is a valid subject fallback");
  assert.match(p.instruction, /ghost\.unwired\.AcousticEmissionMonitoringEngine/);
});

// ---- failure modes (the TRUST GATE -- the reason this converter exists) ----
test("failure 1 (TRUST GATE): a pending row must NEVER produce a pair (unvalidated guess)", () => {
  assert.equal(ghostwireToTrainingPair(pendingRow), null,
    "training on a pending proposal would teach the GNN's unconfirmed guess as truth");
});

test("failure 2: confirmed but missing proposedWiring -> null (no label)", () => {
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, proposedWiring: undefined }), null);
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, proposedWiring: "   " }), null, "whitespace-only wiring is no label");
});

test("failure 3: confirmed but no engineName AND no ghostId -> null (no subject)", () => {
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, engineName: "  ", ghostId: "" }), null);
});

test("failure 4: validation status other than 'confirmed' (e.g. 'validated' typo) -> null", () => {
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, validation: { status: "validated" } }), null,
    "only the exact 'confirmed' status clears the gate; near-misses must not leak");
});

// ---- adversarial inputs ----
test("adversarial: null / non-object / array / number never throw and return null", () => {
  for (const bad of [null, undefined, "string", 123, [], NaN, Infinity, () => {}]) {
    assert.equal(ghostwireToTrainingPair(bad), null, `bad input ${String(bad)} must be null, not a throw`);
  }
});

test("adversarial: validation null / non-object / numeric status -> null (no crash)", () => {
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, validation: null }), null);
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, validation: "confirmed" }), null, "status must live on validation.status, not be the validation value");
  assert.equal(ghostwireToTrainingPair({ ...confirmedRow, validation: { status: 1 } }), null);
});

test("adversarial: an oversize reason is truncated to maxChars (no unbounded output)", () => {
  const p = ghostwireToTrainingPair({ ...confirmedRow, reason: "x".repeat(5000) });
  assert.ok(p);
  assert.ok(p.output.length <= 600, `output ${p.output.length} must be capped at 600`);
});

// ---- convertGhostwireText: streaming + honest counts ----
test("convert: mixed JSONL yields exact {rows, invalid, pending, confirmed, skipped} counts", () => {
  const text = [
    JSON.stringify(confirmedRow),                                  // -> confirmed + 1 pair
    JSON.stringify(pendingRow),                                    // -> pending, skipped
    JSON.stringify({ ...confirmedRow, proposedWiring: undefined }),// -> confirmed but unlearnable, skipped
    "{not valid json",                                             // -> invalid
    "   ",                                                         // -> blank, ignored
  ].join("\n");
  const r = convertGhostwireText(text);
  assert.equal(r.rows.length, 1, "exactly one emitted pair");
  assert.equal(r.invalid, 1, "one unparseable line");
  assert.equal(r.pending, 1, "one pending row (counted, never emitted)");
  assert.equal(r.confirmed, 2, "two confirmed rows (one learnable, one missing-wiring)");
  assert.equal(r.skipped, 2, "skipped = pending(1) + confirmed-but-unlearnable(1)");
});

test("convert: empty / whitespace text -> all-zero, no throw", () => {
  for (const t of ["", "   \n  \n", null, undefined]) {
    const r = convertGhostwireText(t);
    assert.deepEqual(r, { rows: [], invalid: 0, skipped: 0, pending: 0, confirmed: 0 });
  }
});

// ---- dedupPairs ----
test("dedup: identical (instruction,output) collapses; distinct preserved", () => {
  const a = ghostwireToTrainingPair(confirmedRow);
  const b = ghostwireToTrainingPair({ ...confirmedRow, engineName: "OtherEngine" });
  const { rows, duplicates } = dedupPairs([a, { ...a }, b]);
  assert.equal(rows.length, 2, "the two distinct engines survive");
  assert.equal(duplicates, 1, "the exact-duplicate confirmed pair collapses");
});
