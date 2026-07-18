// scripts/lib/cad-correction-to-fix-ledger.test.mjs
// Tests for U-CAD-CAPTURE-LOOP: correction-loop ledger -> fix-ledger rows (the capture stage).
// Reference values are the REAL die correction ledger (state/shared/cad-correction-loop-live-ledger.json).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { correctionLedgerToFixRows, fixRowKey, dedupAgainst } from "./cad-correction-to-fix-ledger.mjs";

// Faithful slice of the real die correction-loop ledger.
const DIE_LEDGER = {
  ts: "2026-06-03T20:52:47.016Z",
  part: "die",
  docPrefix: "PRISM-DELTA-CLIVE-1780519967016-",
  sourceFile: "cad-prototype-die-2026-05-19.json",
  cycle: {
    ok: true,
    before: { verdict: "partial", scorePct: 60, requiredCount: 5,
      matched: ["central_oil_hole", "stepped_revolved_axis", "working_tip_taper"],
      missing: ["bevel_face_chamfer", "cross_drilled_relief_holes"] },
    after: { verdict: "match", scorePct: 100, requiredCount: 5,
      matched: ["central_oil_hole", "bevel_face_chamfer", "stepped_revolved_axis", "working_tip_taper", "cross_drilled_relief_holes"],
      missing: [] },
    corrections: [
      { kind: "bevel_face_chamfer", buildable: true, op: { kind: "chamfer-edge", distanceMm: 1, edgeCount: 1 } },
      { kind: "cross_drilled_relief_holes", buildable: true, op: { kind: "radial-hole", radiusMm: 1.5, axis: "perpendicular" } },
    ],
  },
};

describe("correctionLedgerToFixRows", () => {
  it("HAPPY: die ledger -> one trainsCadGen row per before.missing feature, op-enriched", () => {
    const rows = correctionLedgerToFixRows(DIE_LEDGER);
    assert.equal(rows.length, 2);
    const bevel = rows.find((r) => r.field === "bevel_face_chamfer");
    assert.ok(bevel);
    assert.equal(bevel.part, "die");
    assert.equal(bevel.domain, "cad");
    assert.equal(bevel.kind, "missing-feature");
    assert.equal(bevel.wrong, "absent");
    assert.equal(bevel.trainsCadGen, true);
    assert.equal(bevel.trainsPrintReader, false);
    assert.equal(bevel.ts, DIE_LEDGER.ts);          // deterministic ts (from the ledger, not Date.now)
    assert.equal(bevel.cycleId, DIE_LEDGER.docPrefix);
    // note carries the FIX OP + the verified after-cycle outcome (the rich signal)
    assert.match(bevel.note, /chamfer-edge \(1mm, x1\)/);
    assert.match(bevel.note, /achieved match \(score 100%\)/);
    const relief = rows.find((r) => r.field === "cross_drilled_relief_holes");
    assert.match(relief.note, /radial-hole \(r1\.5mm, perpendicular\)/);
  });

  it("source defaults to the ledger sourceFile; opts.source overrides (additive provenance)", () => {
    assert.equal(correctionLedgerToFixRows(DIE_LEDGER)[0].source, "cad-prototype-die-2026-05-19.json");
    assert.equal(correctionLedgerToFixRows(DIE_LEDGER, { source: "cad-correction-loop-live-ledger.json" })[0].source, "cad-correction-loop-live-ledger.json");
  });

  it("still-missing feature (not in after.matched) is marked 'still missing after cycle'", () => {
    const partial = { ...DIE_LEDGER, cycle: { ...DIE_LEDGER.cycle, after: { verdict: "partial", scorePct: 80, matched: ["central_oil_hole"], missing: ["bevel_face_chamfer"] } } };
    const rows = correctionLedgerToFixRows(partial);
    const bevel = rows.find((r) => r.field === "bevel_face_chamfer");
    assert.match(bevel.note, /still missing after cycle \(score 80%\)/);
  });

  it("FAILURE: no part -> []", () => {
    assert.deepEqual(correctionLedgerToFixRows({ cycle: DIE_LEDGER.cycle }), []);
  });
  it("FAILURE: empty before.missing -> [] (a clean match cycle adds nothing)", () => {
    assert.deepEqual(correctionLedgerToFixRows({ part: "die", cycle: { before: { missing: [] } } }), []);
  });
  it("adversarial: null / non-object / missing cycle -> [] (never throws)", () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(correctionLedgerToFixRows(null), []);
      assert.deepEqual(correctionLedgerToFixRows(42), []);
      assert.deepEqual(correctionLedgerToFixRows({ part: "die" }), []);
    });
  });
  it("adversarial: non-string entries in missing[] are skipped", () => {
    const weird = { part: "die", cycle: { before: { missing: [null, "", "good_feature", 7] }, after: { matched: [] } } };
    const rows = correctionLedgerToFixRows(weird);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].field, "good_feature");
  });
});

describe("fixRowKey + dedupAgainst", () => {
  it("key is part+field+kind+source; dedups against existing keys AND within the batch", () => {
    const rows = correctionLedgerToFixRows(DIE_LEDGER, { source: "L" });
    const k0 = fixRowKey(rows[0]);
    assert.equal(k0, "die|bevel_face_chamfer|missing-feature|L");
    // existing already has the first row's key -> only the second survives
    const fresh = dedupAgainst(rows, [k0]);
    assert.equal(fresh.length, 1);
    assert.equal(fresh[0].field, "cross_drilled_relief_holes");
    // duplicate rows within the batch collapse
    assert.equal(dedupAgainst([rows[0], rows[0]], []).length, 1);
  });
  it("idempotency: a second harvest of the same rows yields 0 new", () => {
    const rows = correctionLedgerToFixRows(DIE_LEDGER, { source: "L" });
    const keys = rows.map(fixRowKey);
    assert.equal(dedupAgainst(rows, keys).length, 0);
  });
});
