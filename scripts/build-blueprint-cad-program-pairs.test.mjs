// Tests for build-blueprint-cad-program-pairs.mjs (U-PSGB-XRAY training spine).
// Run: node --test scripts/build-blueprint-cad-program-pairs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePN, candidatePNs, isCadFile, indexCadByPN } from "./build-blueprint-cad-program-pairs.mjs";

test("normalizePN — uppercases + strips non-alphanumeric", () => {
  assert.equal(normalizePN("221-178 737"), "221178737");
  assert.equal(normalizePN("ab_12.cd"), "AB12CD");
});
test("normalizePN — null/undefined/number safe", () => {
  assert.equal(normalizePN(null), "");
  assert.equal(normalizePN(undefined), "");
  assert.equal(normalizePN(221178737), "221178737");
});
test("candidatePNs — full normalized stem (>=5) + digit runs", () => {
  const c = candidatePNs("221178737_rev_b");
  assert.ok(c.includes("221178737"));
});
test("candidatePNs — extracts the PN from a descriptive filename", () => {
  const c = candidatePNs("PART 221178737 PUNCH");
  assert.ok(c.includes("221178737"));
});
test("candidatePNs — extracts a 4-digit PN (14,394 v6 PNs are 4-digit)", () => {
  // The corpus mass is 4-digit; the prior >=5 floor missed all of them.
  assert.ok(candidatePNs("1005 HAMMERHOB").includes("1005"), "leading 4-digit PN in descriptive name");
  assert.ok(candidatePNs("3016").includes("3016"), "bare 4-digit stem (norm len 4 < 5 → only the digit-run carries it)");
  assert.ok(candidatePNs("ANDERSON 1588-750-03-1").includes("1588"), "4-digit PN embedded with customer prefix + rev suffix");
});
test("candidatePNs — 3-digit runs are deliberately NOT extracted (noise floor)", () => {
  // 3-digit numbers appear as revs/dates everywhere → would inject false matches.
  assert.deepEqual(candidatePNs("123"), [], "bare 3-digit yields no candidate");
  assert.ok(!candidatePNs("REV 250 SHEET").includes("250"), "3-digit run not extracted from descriptive name");
});
test("candidatePNs — short stems yield no spurious full-stem candidate", () => {
  // 'ab' normalizes to 'AB' (len 2 < 5) → not added; no digit run → empty
  assert.deepEqual(candidatePNs("ab"), []);
});
test("isCadFile — recognizes CAD extensions, rejects programs", () => {
  for (const e of ["step", "STP", ".ipt", "dxf", "dwg", "iam", "sldprt", "f3d"]) assert.equal(isCadFile(e), true, e);
  for (const e of ["min", "nc", "cyc", "mcx", "pdf", "txt", ""]) assert.equal(isCadFile(e), false, e);
});
test("indexCadByPN — joins CAD files to known PNs only", () => {
  const known = new Set(["221178737", "999000111"]);
  const files = [
    { stem: "221178737_rev_b", ext: "ipt", path: "p1", customer: "ITW" },
    { stem: "221178737", ext: "dxf", path: "p2" },
    { stem: "unknown_part_55555", ext: "stp", path: "p3" }, // PN not in known set → skipped
    { stem: "221178737", ext: "min", path: "p4" },          // program ext → not CAD → skipped
    { stem: "999000111-DRAWING", ext: "idw", path: "p5" },
  ];
  const idx = indexCadByPN(files, known);
  assert.equal(idx.get("221178737").length, 2);            // ipt + dxf (min excluded)
  assert.equal(idx.get("999000111").length, 1);            // idw
  assert.equal(idx.has("55555"), false);                    // unknown PN never indexed
});
test("indexCadByPN — matches 4-digit PNs and records matched_via", () => {
  const known = new Set(["1005", "3016"]);
  const files = [
    { stem: "1005 HAMMERHOB", ext: "ipt", path: "cadA", customer: "FORGO" }, // 4-digit leading PN
    { stem: "3016", ext: "step", path: "cadB" },                              // bare 4-digit
    { stem: "REV 250 SHEET", ext: "dxf", path: "cadC" },                      // 3-digit only → no match
  ];
  const idx = indexCadByPN(files, known);
  assert.equal(idx.get("1005").length, 1);
  assert.equal(idx.get("1005")[0].matched_via, "1005");    // auditable join key
  assert.equal(idx.get("3016").length, 1);
  assert.equal(idx.has("250"), false);                      // 3-digit run never extracted
});
test("indexCadByPN — empty inputs never throw", () => {
  assert.equal(indexCadByPN([], new Set()).size, 0);
});
