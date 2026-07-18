// scripts/lib/sfc-material-infer.test.mjs
//
// Tests the ISO-group inference heuristic over realistic JM path/name strings.
// Run: `node scripts/lib/sfc-material-infer.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { inferIsoGroup, DEFAULT_ISO } from "./sfc-material-infer.mjs";

test("specific steel grade -> P (high confidence)", () => {
  const r = inferIsoGroup("H:/PRISM/JM DIE/CNC LATHE/4140 PARTS/shaft.min");
  assert.equal(r.iso, "P");
  assert.equal(r.confidence, "high");
  assert.equal(r.matched, "4140");
});

test("tool-steel grade + hardened -> H", () => {
  assert.equal(inferIsoGroup("A2 DIE BLOCK.nc").iso, "H");
  assert.equal(inferIsoGroup("punch TOOL STEEL HARDENED.min").iso, "H");
  assert.equal(inferIsoGroup("D2 cavity HRC58.nc").iso, "H");
});

test("stainless -> M, aluminum -> N, titanium -> S, cast iron -> K", () => {
  assert.equal(inferIsoGroup("STAINLESS 304 fitting.min").iso, "M");
  assert.equal(inferIsoGroup("6061 ALUMINUM plate.nc").iso, "N");
  assert.equal(inferIsoGroup("TITANIUM 6AL bracket.min").iso, "S");
  assert.equal(inferIsoGroup("GRAY IRON housing.nc").iso, "K");
});

test("priority: superalloy + hardened before generic steel word", () => {
  // 'INCONEL 718 STEEL FIXTURE' must resolve S (superalloy), not P (generic steel)
  assert.equal(inferIsoGroup("INCONEL 718 STEEL FIXTURE.min").iso, "S");
});

test("PRECISION: bare collision numbers do NOT false-match non-P (live-run fix)", () => {
  // 625/718 are part/program numbers in a die shop, not Inconel -> must NOT be S.
  assert.equal(inferIsoGroup("A210356HK CNC PROGRAM 718").iso, "P");
  assert.equal(inferIsoGroup("PART 625 OP10").iso, "P");
  // 2024 is a year, not aluminum.
  assert.equal(inferIsoGroup("REV 2024-03 SHAFT").iso, "P");
  // bare 304 without the stainless word stays default (P), not M.
  assert.equal(inferIsoGroup("FIXTURE 304 LOC").iso, "P");
  // but the WORD still resolves: 'INCONEL 718' -> S, 'STAINLESS 304' -> M.
  assert.equal(inferIsoGroup("INCONEL 718 ROTOR").iso, "S");
  assert.equal(inferIsoGroup("304 STAINLESS PLATE").iso, "M");
});

test("generic steel word -> P medium; nothing -> P default", () => {
  const mild = inferIsoGroup("MILD STEEL FLATBAR.min");
  assert.equal(mild.iso, "P");
  assert.equal(mild.confidence, "medium");

  const none = inferIsoGroup("BASEBALL BAT REPLACEMENT.min");
  assert.equal(none.iso, DEFAULT_ISO);
  assert.equal(none.confidence, "default");
  assert.equal(none.matched, null);

  assert.equal(inferIsoGroup("").confidence, "default");
  assert.equal(inferIsoGroup(null).iso, "P");
});
