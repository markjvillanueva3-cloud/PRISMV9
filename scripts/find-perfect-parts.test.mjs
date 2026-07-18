// scripts/find-perfect-parts.test.mjs
// Tests the perfect-part classification (a part with print + CAD + CNC program). classifyJoinRecord +
// isCleanPerfect are the single source of the "perfect" rule — both the summary counts and the emitted
// part list flow through them. A wrong verdict either (a) flags a part as complete when a leg is
// missing (sends a broken chain to the trainer) or (b) drops a genuine complete part. Each test encodes
// WHY against the verified v6-join shape: programs[] carry kind:cad vs kind:program; relations is a
// map (has_nc_program/has_geometry_model/...); match_confidence is a STRING (exact/loose/ambiguous);
// bare-numeric PNs over-match (the count caps drop them).

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyJoinRecord, isCleanPerfect } from "./find-perfect-parts.mjs";

test("perfect triple via programs[] kinds: bp + kind:cad + kind:program", () => {
  const c = classifyJoinRecord({
    part_number: "T-11BT-27-250-GR5",
    blueprints: [{ filename: "scan.pdf" }],
    programs: [
      { kind: "cad", filename: "T-11BT-27-250-Gr5.stp" },
      { kind: "program", filename: "T-11BT-27-250-GR5.MIN" },
    ],
    match_confidence: "exact",
  });
  assert.equal(c.perfect, true);
  assert.equal(c.nbp, 1); assert.equal(c.nCad, 1); assert.equal(c.nNc, 1);
  assert.equal(c.hasNeutralStep, true, ".stp is a neutral CAD model");
});

test("perfect triple via the relations map (no kind tags, but has_geometry_model + has_nc_program)", () => {
  const c = classifyJoinRecord({
    part_number: "X",
    blueprints: [{ filename: "p.pdf" }],
    programs: [],
    relations: { has_geometry_model: 1, has_nc_program: 2 },
  });
  assert.equal(c.perfect, true, "relations alone can complete the chain");
  assert.equal(c.hasNeutralStep, false, "no kind:cad entry to inspect → no neutral-STEP signal");
});

test("NOT perfect — missing a leg (the whole point: don't send a broken chain to the trainer)", () => {
  // no CAD
  assert.equal(classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "program", filename: "a.MIN" }] }).perfect, false);
  // no NC program
  assert.equal(classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad", filename: "a.ipt" }] }).perfect, false);
  // no blueprint
  assert.equal(classifyJoinRecord({ blueprints: [], programs: [{ kind: "cad" }, { kind: "program" }] }).perfect, false);
});

test("hasNeutralStep only for vendor-neutral geometry (.stp/.step/.igs/.iges), NOT .ipt/.sldprt", () => {
  const neutral = classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad", filename: "a.STEP" }, { kind: "program" }] });
  assert.equal(neutral.hasNeutralStep, true);
  const inventorOnly = classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad", filename: "a.ipt" }, { kind: "program" }] });
  assert.equal(inventorOnly.perfect, true);
  assert.equal(inventorOnly.hasNeutralStep, false, ".ipt is Inventor-proprietary, not neutral");
});

test("isCleanPerfect: exact-confidence + sane counts pass; loose/ambiguous or over-matched fail", () => {
  const ok = classifyJoinRecord({ blueprints: [{}, {}], programs: [{ kind: "cad" }, { kind: "program" }], match_confidence: "exact" });
  assert.equal(isCleanPerfect(ok), true);
  // loose confidence rejected by default (exact)
  const loose = classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad" }, { kind: "program" }], match_confidence: "loose" });
  assert.equal(isCleanPerfect(loose), false);
  assert.equal(isCleanPerfect(loose, { confidence: "any" }), true, "--confidence any accepts it");
});

test("isCleanPerfect: PN-collision (957 blueprints) is dropped by the count cap — the bare-numeric over-match", () => {
  const collision = classifyJoinRecord({
    part_number: "24000",
    blueprints: Array.from({ length: 957 }, () => ({})),
    programs: [{ kind: "cad" }, { kind: "program" }],
    match_confidence: "exact",
  });
  assert.equal(collision.perfect, true, "it IS technically a triple…");
  assert.equal(isCleanPerfect(collision), false, "…but 957 blueprints = PN-normalization collision, dropped by maxBp");
});

test("isCleanPerfect: neutralStepOnly gate", () => {
  const ipt = classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad", filename: "a.ipt" }, { kind: "program" }], match_confidence: "exact" });
  assert.equal(isCleanPerfect(ipt, { neutralStepOnly: true }), false);
  const stp = classifyJoinRecord({ blueprints: [{}], programs: [{ kind: "cad", filename: "a.stp" }, { kind: "program" }], match_confidence: "exact" });
  assert.equal(isCleanPerfect(stp, { neutralStepOnly: true }), true);
});

test("adversarial: malformed/empty records never throw, classify as not-perfect", () => {
  assert.equal(classifyJoinRecord(null).perfect, false);
  assert.equal(classifyJoinRecord({}).perfect, false);
  assert.equal(classifyJoinRecord({ blueprints: "not-an-array", programs: 5 }).perfect, false);
  assert.equal(isCleanPerfect(classifyJoinRecord(null)), false);
});
