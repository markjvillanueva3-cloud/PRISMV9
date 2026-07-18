/**
 * U-BPA-LORA-PAIRS (slot:india) -- tests the ledger -> LoRATrainingPair[] builder:
 * maps ONLY trustworthy rows (operator_correction + outcome_record accurate:true
 * with a populated extraction), EXCLUDES failure-telemetry (accurate:false,
 * extraction:null) and unconfirmed (accurate:null), with tier filtering, fail-soft,
 * and a LIVE-ledger smoke. Run: node scripts/lib/blueprint-lora-pair-builder.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eventToPair,
  buildLoRAPairsFromLedger,
  resolveLoRATrainingPairs,
  LORA_TIERS,
} from "./blueprint-lora-pair-builder.mjs";

const REC = (o) => JSON.stringify(o);
const OPCORR = {
  type: "operator_correction", ts: "2026-06-18T19:35:11.664Z",
  payload: {
    pdf_path: "/p.pdf", drawing: "C-001 R1", part: "ALIGNMENT PIN", part_class: "pin_revolve",
    failure_mode: "missed_secondary_diameter", extracted_wrong: { body_dia_in: 0.4988 },
    operator_truth: { body_dia_in: 0.4998, tip_dia_in: 0.4988 }, lesson: "bind every callout to its axial zone",
  },
};
const FAILURE = { type: "outcome_record", ts: "2026-05-18T20:06:41.466Z", payload: { pdf_path: "/f.pdf", extract_status: "failed", extraction: null, accurate: false } };
const UNCONFIRMED = { type: "outcome_record", ts: "2026-06-24T00:00:00.000Z", payload: { pdf_path: "/u.pdf", accurate: null, extraction: { regions: [{ value: "1.0" }] } } };
const CONFIRMED = { type: "outcome_record", ts: "2026-06-24T01:00:00.000Z", payload: { pdf_path: "/c.pdf", accurate: true, part_class: "general", extraction: { customer: "ALCOA", partNumber: "X1", pdfPath: "/c.pdf", regions: [{ value: "2.0" }], confidenceFloor: "normal" } } };

const FIXTURE = [REC(OPCORR), REC(FAILURE), REC(UNCONFIRMED), REC(CONFIRMED)].join("\n");

test("operator_correction maps to a LoRATrainingPair (operator_verified) with the confirmed truth", () => {
  const m = eventToPair(OPCORR, 0);
  assert.ok(m, "operator_correction is trainable");
  assert.equal(m.tier, "operator_verified");
  assert.equal(m.pair.partNumber, "C-001 R1");
  assert.equal(m.pair.pdfPath, "/p.pdf");
  assert.equal(m.pair.extractionType, "pin_revolve");
  assert.equal(m.pair.groundTruthValue, JSON.stringify(OPCORR.payload.operator_truth));
  assert.ok(m.pair.context.includes("bind every callout"));
  assert.ok(typeof m.pair.pairId === "string" && m.pair.pairId.length > 0);
});

test("failure-telemetry (accurate:false, extraction:null) and unconfirmed (accurate:null) are NOT trainable", () => {
  assert.equal(eventToPair(FAILURE, 1), null);
  assert.equal(eventToPair(UNCONFIRMED, 2), null);
});

test("outcome_record with accurate:true + populated extraction maps (forward-compat confirmed path)", () => {
  const m = eventToPair(CONFIRMED, 3);
  assert.ok(m);
  assert.equal(m.tier, "operator_verified");
  assert.equal(m.pair.customer, "ALCOA");
  assert.equal(m.pair.partNumber, "X1");
  assert.equal(m.pair.groundTruthValue, JSON.stringify(CONFIRMED.payload.extraction.regions));
});

test("buildLoRAPairsFromLedger(operator_verified) returns ONLY the trainable rows (2 of 4)", () => {
  const pairs = buildLoRAPairsFromLedger({ readImpl: () => FIXTURE, tier: "operator_verified" });
  assert.equal(pairs.length, 2); // OPCORR + CONFIRMED; FAILURE + UNCONFIRMED excluded
  for (const p of pairs) {
    assert.ok(p.groundTruthValue.length > 0);
    assert.ok(typeof p.pairId === "string" && p.pairId.length > 0);
  }
});

test("tier filter: a tier with no rows returns [] (ensemble_consensus / single_backend today)", () => {
  assert.equal(buildLoRAPairsFromLedger({ readImpl: () => FIXTURE, tier: "ensemble_consensus" }).length, 0);
  assert.equal(buildLoRAPairsFromLedger({ readImpl: () => FIXTURE, tier: "single_backend" }).length, 0);
  assert.ok(LORA_TIERS.includes("operator_verified"));
});

test("fail-soft: missing/unreadable ledger -> []", () => {
  assert.deepEqual(buildLoRAPairsFromLedger({ eventsFile: "Z:/no/such.jsonl" }), []);
  assert.deepEqual(buildLoRAPairsFromLedger({ readImpl: () => { throw new Error("EACCES"); } }), []);
  assert.deepEqual(buildLoRAPairsFromLedger({ readImpl: () => "" }), []);
});

test("LIVE ledger: every produced pair has valid LoRATrainingPair shape", () => {
  const live = buildLoRAPairsFromLedger(); // reads DEFAULT_EVENTS_FILE
  assert.ok(Array.isArray(live));
  for (const p of live) {
    for (const k of ["pairId", "customer", "partNumber", "pdfPath", "extractionType", "groundTruthValue", "context"]) {
      assert.equal(typeof p[k], "string", `pair.${k} is a string`);
    }
    assert.ok(p.groundTruthValue.length > 0, "live pair carries a non-empty groundTruthValue");
  }
});

// ── U-BPA-LORA-PAIRS-WIRE: resolveLoRATrainingPairs (the prepare-set wiring) ──
// The decision that closes predictions->outcomes->RETRAIN: caller-supplied
// non-empty pairs win; an absent/empty/non-array value defaults from the ledger.
const CALLER_PAIRS = [
  { pairId: "caller:1", customer: "", partNumber: "P1", pdfPath: "/x.pdf", extractionType: "diameter", groundTruthValue: ".500", context: "ctx" },
];

test("happy: caller-supplied NON-EMPTY precomputedPairs win (source=caller, ledger untouched)", () => {
  let built = 0;
  const r = resolveLoRATrainingPairs({
    precomputedPairs: CALLER_PAIRS,
    tier: "operator_verified",
    buildImpl: () => { built += 1; return [{ pairId: "ledger:x" }]; },
  });
  assert.equal(r.source, "caller");
  assert.deepEqual(r.pairs, CALLER_PAIRS);
  assert.equal(built, 0, "builder MUST NOT run when the caller supplies pairs");
});

test("ledger default: no precomputedPairs -> builder runs at the requested tier (source=ledger)", () => {
  const r = resolveLoRATrainingPairs({
    tier: "operator_verified",
    buildImpl: (o) => { assert.equal(o.tier, "operator_verified"); return buildLoRAPairsFromLedger({ readImpl: () => FIXTURE, tier: o.tier }); },
  });
  assert.equal(r.source, "ledger");
  assert.equal(r.pairs.length, 2); // OPCORR + CONFIRMED from the fixture
  assert.equal(r.pairs[0].groundTruthValue, JSON.stringify(OPCORR.payload.operator_truth));
});

test("failure 1: EMPTY precomputedPairs[] falls back to the ledger (an empty array is not an override)", () => {
  const r = resolveLoRATrainingPairs({ precomputedPairs: [], tier: "operator_verified", buildImpl: () => [{ pairId: "l:1" }] });
  assert.equal(r.source, "ledger");
  assert.equal(r.pairs.length, 1);
});

test("failure 2: undefined precomputedPairs falls back to the ledger", () => {
  const r = resolveLoRATrainingPairs({ tier: "operator_verified", buildImpl: () => [{ pairId: "l:2" }] });
  assert.equal(r.source, "ledger");
  assert.equal(r.pairs.length, 1);
});

test("failure 3: a non-array precomputedPairs (object/string) falls back to the ledger", () => {
  for (const bad of [{ pairId: "not-an-array" }, "P1", 42, null]) {
    const r = resolveLoRATrainingPairs({ precomputedPairs: bad, tier: "operator_verified", buildImpl: () => [{ pairId: "l" }] });
    assert.equal(r.source, "ledger", `non-array ${JSON.stringify(bad)} must not be treated as an override`);
    assert.equal(r.pairs.length, 1);
  }
});

test("adversarial 1: builder returns a non-array (null/undefined/number) -> pairs coerced to [] (never crashes prepareTrainingSet)", () => {
  for (const bad of [null, undefined, 7, { length: 3 }]) {
    const r = resolveLoRATrainingPairs({ tier: "operator_verified", buildImpl: () => bad });
    assert.equal(r.source, "ledger");
    assert.deepEqual(r.pairs, [], `builder => ${JSON.stringify(bad)} yields []`);
  }
});

test("adversarial 2: an unknown tier still resolves via the builder (builder clamps it) and never throws", () => {
  // No buildImpl injected -> real builder reads the live ledger; an unknown tier
  // must not throw, just return a (possibly empty) array with source=ledger.
  const r = resolveLoRATrainingPairs({ tier: "NOT_A_TIER" });
  assert.equal(r.source, "ledger");
  assert.ok(Array.isArray(r.pairs));
});

test("default opts: resolveLoRATrainingPairs() with no args is safe (ledger, array result)", () => {
  const r = resolveLoRATrainingPairs();
  assert.equal(r.source, "ledger");
  assert.ok(Array.isArray(r.pairs));
});

test("empty signal: a ledger default with 0 pairs flags empty:true (R12 loud signal)", () => {
  const r = resolveLoRATrainingPairs({ tier: "ensemble_consensus", buildImpl: () => [] });
  assert.equal(r.source, "ledger");
  assert.equal(r.pairs.length, 0);
  assert.equal(r.empty, true, "a 0-pair ledger default MUST be flagged empty, never silently succeed");
});

test("empty signal: a ledger default WITH pairs is empty:false", () => {
  const r = resolveLoRATrainingPairs({ tier: "operator_verified", buildImpl: () => [{ pairId: "l" }] });
  assert.equal(r.source, "ledger");
  assert.equal(r.empty, false);
});

test("empty signal: caller-supplied pairs are NEVER flagged empty (the caller chose them)", () => {
  const r = resolveLoRATrainingPairs({ precomputedPairs: CALLER_PAIRS, tier: "operator_verified", buildImpl: () => [] });
  assert.equal(r.source, "caller");
  assert.equal(r.empty, false);
});
