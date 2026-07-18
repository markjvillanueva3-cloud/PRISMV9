// Hermetic tests for U-LATHE-AB-VERSION-LOCATOR
// Design memo: reference_lathe_ab_version_locator_design_2026_05_27
//
// Pair "A" (original) + "B" (operator-upgraded) JM-Die program files for training-signal extraction.
// Pure-functional helpers (parsePath / detectVersionTag / pairAB) tested hermetically with synthetic paths.
//
// Run: node --test scripts/lib/lathe-ab-version-locator.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsePath,
  detectVersionTag,
  groupByPart,
  pairAB,
  classifyPairType
} from "./lathe-ab-version-locator.mjs";

const SYNTHETIC_PATHS = [
  "JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234.MIN",
  "JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234_REV2.MIN",
  "JM DIE/CNC LATHE/ALCOA/PART-5678/PART-5678.MIN",
  "JM DIE/CNC LATHE/ALCOA/PART-5678/PART-5678-B.MIN",
  "JM DIE/CNC LATHE/ITW/PART-9999/PART-9999.MIN",  // no B-version
  "JM DIE/CNC LATHE/SFS/PART-AAA/v1/PART-AAA.MIN",
  "JM DIE/CNC LATHE/SFS/PART-AAA/v2/PART-AAA.MIN"
];

describe("parsePath — extract (customer, part_num_canonical, version_tag)", () => {
  it("simple file: PART-1234.MIN under ALCOA", () => {
    const p = parsePath("JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234.MIN");
    assert.equal(p.customer, "ALCOA");
    assert.equal(p.part_num_canonical, "PART-1234");
    assert.equal(p.version_tag, "A_original");
  });

  it("REV-suffixed: PART-1234_REV2.MIN", () => {
    const p = parsePath("JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234_REV2.MIN");
    assert.equal(p.customer, "ALCOA");
    assert.equal(p.part_num_canonical, "PART-1234");
    assert.equal(p.version_tag, "B_upgraded");
    assert.equal(p.version_suffix, "_REV2");
  });

  it("dash-B suffix: PART-5678-B.MIN", () => {
    const p = parsePath("JM DIE/CNC LATHE/ALCOA/PART-5678/PART-5678-B.MIN");
    assert.equal(p.part_num_canonical, "PART-5678");
    assert.equal(p.version_tag, "B_upgraded");
    assert.equal(p.version_suffix, "-B");
  });

  it("sibling folder v2/: SFS/PART-AAA/v2/PART-AAA.MIN", () => {
    const p = parsePath("JM DIE/CNC LATHE/SFS/PART-AAA/v2/PART-AAA.MIN");
    assert.equal(p.customer, "SFS");
    assert.equal(p.part_num_canonical, "PART-AAA");
    assert.equal(p.version_tag, "B_upgraded");
  });

  it("sibling folder v1/: classified as A_original", () => {
    const p = parsePath("JM DIE/CNC LATHE/SFS/PART-AAA/v1/PART-AAA.MIN");
    assert.equal(p.version_tag, "A_original");
  });
});

describe("detectVersionTag — regex classifier", () => {
  it("returns A_original for bare filename", () => {
    assert.equal(detectVersionTag("PART-1234.MIN"), "A_original");
  });

  it("returns B_upgraded for _REV2 suffix", () => {
    assert.equal(detectVersionTag("PART-1234_REV2.MIN"), "B_upgraded");
  });

  it("returns B_upgraded for -B suffix", () => {
    assert.equal(detectVersionTag("PART-5678-B.MIN"), "B_upgraded");
  });

  it("returns B_upgraded for -NEW / -UPDATED suffixes", () => {
    assert.equal(detectVersionTag("foo-NEW.MIN"), "B_upgraded");
    assert.equal(detectVersionTag("foo-UPDATED.MIN"), "B_upgraded");
  });

  it("returns B_upgraded for _v2 suffix", () => {
    assert.equal(detectVersionTag("foo_v2.MIN"), "B_upgraded");
  });
});

describe("groupByPart + pairAB — pairing", () => {
  it("groups files by (customer, part_num_canonical)", () => {
    const parsed = SYNTHETIC_PATHS.map(parsePath);
    const groups = groupByPart(parsed);
    assert.equal(groups["ALCOA::PART-1234"].length, 2);
    assert.equal(groups["ALCOA::PART-5678"].length, 2);
    assert.equal(groups["ITW::PART-9999"].length, 1);
    assert.equal(groups["SFS::PART-AAA"].length, 2);
  });

  it("pairs A and B versions within a group", () => {
    const parsed = SYNTHETIC_PATHS.map(parsePath);
    const groups = groupByPart(parsed);
    const pairs = pairAB(groups);
    assert.equal(pairs.length, 3, "ALCOA-PART-1234 + ALCOA-PART-5678 + SFS-PART-AAA");
    for (const p of pairs) {
      assert.equal(p.a.version_tag, "A_original");
      assert.equal(p.b.version_tag, "B_upgraded");
    }
  });

  it("skips singletons (no B-version) — emits to unpaired list", () => {
    const parsed = SYNTHETIC_PATHS.map(parsePath);
    const groups = groupByPart(parsed);
    const pairs = pairAB(groups);
    const unpaired = pairs.filter(p => p.unpaired_part_num === "PART-9999");
    assert.equal(unpaired.length, 0, "pairAB returns only paired records by default");
  });

  it("pairAB({includeUnpaired:true}) emits singletons with reason", () => {
    const parsed = SYNTHETIC_PATHS.map(parsePath);
    const groups = groupByPart(parsed);
    const all = pairAB(groups, { includeUnpaired: true });
    const unpaired = all.filter(p => p.unpaired);
    assert.ok(unpaired.length >= 1);
    assert.ok(unpaired.some(p => /PART-9999/.test(p.unpaired_part_num || "")));
  });
});

describe("parsePath + pairAB — PRISM_UPGRADED folder (iter200 ALCOA real-data finding)", () => {
  it("PRISM_UPGRADED folder segment classifies file as B_upgraded", () => {
    const a = parsePath("JM DIE/CNC LATHE/ALCOA/A0137471.MIN");
    const b = parsePath("JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc");
    assert.equal(a.version_tag, "A_original");
    assert.equal(b.version_tag, "B_upgraded", "PRISM_UPGRADED folder must classify as B");
  });

  it("ALCOA A0137471 source + Okuma_LB-3000EX upgrade forms a pair", () => {
    const parsed = [
      parsePath("JM DIE/CNC LATHE/ALCOA/A0137471.MIN"),
      parsePath("JM DIE/CNC LATHE/ALCOA/PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc")
    ];
    const pairs = pairAB(groupByPart(parsed));
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].customer, "ALCOA");
    assert.equal(pairs[0].a.version_tag, "A_original");
    assert.equal(pairs[0].b.version_tag, "B_upgraded");
  });

  it("dash variant PRISM-UPGRADED also classifies as B", () => {
    const p = parsePath("JM DIE/CNC LATHE/ITW/PRISM-UPGRADED/Okuma_LB-3000EX/X.nc");
    assert.equal(p.version_tag, "B_upgraded");
  });
});

describe("parsePath + pairAB — explicit -A markers (iter165 ACME real-data finding)", () => {
  it("canonical name strips -A (so A and B versions share group key)", () => {
    const a = parsePath("JM DIE/CNC LATHE/ACME/11-10715-0-A.MIN");
    const b = parsePath("JM DIE/CNC LATHE/ACME/11-10715-0-B.MIN");
    assert.equal(a.part_num_canonical, b.part_num_canonical, "A and B must share canonical");
    assert.equal(a.version_tag, "A_original");
    assert.equal(b.version_tag, "B_upgraded");
  });

  it("ACME-style -A/-B in source folder forms a pair", () => {
    const parsed = [
      parsePath("JM DIE/CNC LATHE/ACME/11-10715-0-A.MIN"),
      parsePath("JM DIE/CNC LATHE/ACME/11-10715-0-B.MIN")
    ];
    const pairs = pairAB(groupByPart(parsed));
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].a.version_tag, "A_original");
    assert.equal(pairs[0].b.version_tag, "B_upgraded");
    assert.equal(pairs[0].customer, "ACME");
  });

  it("bare PART-1234.MIN (no marker) still canonicalizes to PART-1234", () => {
    const p = parsePath("JM DIE/CNC LATHE/ITW/PART-1234.MIN");
    assert.equal(p.part_num_canonical, "PART-1234");
    assert.equal(p.version_tag, "A_original");
  });
});

describe("R12 fail-loud", () => {
  it("parsePath returns sentinel for malformed input", () => {
    const p = parsePath("");
    assert.equal(p.parse_error, true);
  });

  it("groupByPart skips parse-error records (does not crash)", () => {
    const parsed = [parsePath(""), parsePath("JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234.MIN")];
    const groups = groupByPart(parsed);
    assert.equal(Object.keys(groups).length, 1);
  });
});

describe("classifyPairType — 3-class pair classifier (iter275 extract from scanner)", () => {
  it("classifies PRISM_UPGRADED b-path as prism_upgraded", () => {
    const t = classifyPairType("H:/JM DIE/ACME/PRISM_UPGRADED/Okuma/A-1.nc");
    assert.equal(t, "prism_upgraded");
  });

  it("classifies non-PRISM_UPGRADED b-path as human_revision", () => {
    const t = classifyPairType("H:/JM DIE/ACME/A-1234-B-CADET.MIN");
    assert.equal(t, "human_revision");
  });

  it("classifies empty A-source as empty_source regardless of b-path", () => {
    const emptyA = "\n\n\n\n";
    const t = classifyPairType("H:/JM DIE/X/PRISM_UPGRADED/Okuma/A.nc", emptyA);
    assert.equal(t, "empty_source");
  });

  it("classifies comment-only A-source as empty_source (skips parenthesized lines)", () => {
    const commentOnlyA = "(M03 spindle on)\n(G0 X20 Z20)\n(end of header)\n\n";
    const t = classifyPairType("H:/X/PRISM_UPGRADED/Okuma/A.nc", commentOnlyA);
    assert.equal(t, "empty_source");
  });

  it("real A-source with 10+ code lines is classified by b-path (not empty)", () => {
    const realA = Array(15).fill("G0 X10 Z5").join("\n");
    const t = classifyPairType("H:/X/PRISM_UPGRADED/Okuma/A.nc", realA);
    assert.equal(t, "prism_upgraded");
  });

  it("respects custom minLines threshold", () => {
    const aText = Array(8).fill("G0 X10").join("\n");
    assert.equal(classifyPairType("X/PRISM_UPGRADED/y.nc", aText, { minLines: 10 }), "empty_source");
    assert.equal(classifyPairType("X/PRISM_UPGRADED/y.nc", aText, { minLines: 5 }), "prism_upgraded");
  });

  it("handles null/non-string aText gracefully (no empty_source check)", () => {
    assert.equal(classifyPairType("X/PRISM_UPGRADED/y.nc", null), "prism_upgraded");
    assert.equal(classifyPairType("X/PRISM_UPGRADED/y.nc"), "prism_upgraded");
  });
});

describe("pairAB — base-name-matched B-version preference (iter281 regression)", () => {
  it("prefers <part>.nc over <part>-B.nc when both exist in PRISM_UPGRADED", () => {
    const aPath = "JM DIE/CNC LATHE/SFS/S072448.MIN";
    const bCanonical = "JM DIE/CNC LATHE/SFS/PRISM_UPGRADED/Okuma_GENOS_L200E-M/S072448.NC";
    const bSuffixed = "JM DIE/CNC LATHE/SFS/PRISM_UPGRADED/Okuma_GENOS_L200E-M/S072448-B.NC";
    const parsed = [parsePath(aPath), parsePath(bCanonical), parsePath(bSuffixed)];
    const groups = groupByPart(parsed);
    const pairs = pairAB(groups);
    assert.equal(pairs.length, 1, "exactly one pair");
    assert.equal(pairs[0].b.filename_has_b_suffix, false, "must pick the base-name-matched B (filename_has_b_suffix=false)");
    assert.ok(pairs[0].b.full_path.endsWith("S072448.NC"), "B path must be canonical S072448.NC, not S072448-B.NC");
    assert.equal(pairs[0].b_count, 2, "b_count tracks total B candidates seen");
  });

  it("falls back to suffixed B if no canonical exists", () => {
    const aPath = "JM DIE/CNC LATHE/X/PART-1.MIN";
    const bSuffixed = "JM DIE/CNC LATHE/X/PRISM_UPGRADED/Okuma/PART-1-B.NC";
    const parsed = [parsePath(aPath), parsePath(bSuffixed)];
    const groups = groupByPart(parsed);
    const pairs = pairAB(groups);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].b.filename_has_b_suffix, true, "fallback to suffixed B");
  });
});
