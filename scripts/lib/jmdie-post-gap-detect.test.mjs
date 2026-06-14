#!/usr/bin/env node
/**
 * jmdie-post-gap-detect.test.mjs — vitest-style tests via node:test.
 *
 * Runs against the pure detection lib. NO I/O — every fixture is inline so the
 * test is hermetic + deterministic (no dependence on the H: drive's .cps corpus).
 *
 * Spec: FEATURE-GAP-AUDIT-MS0 / U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ENHANCEMENT_MARKERS,
  CORPUS_THRESHOLD,
  CONTROLLER_FAMILIES,
  detectMarkers,
  inferFamily,
  buildProfile,
  computeCorpusGaps,
  computePostGaps,
  buildGapReport,
} from "./jmdie-post-gap-detect.mjs";

// =============================================================================
// Drift guards — these protect the verbatim mirror of the engine.
// =============================================================================
describe("drift guards", () => {
  it("ENHANCEMENT_MARKERS has exactly 15 entries (engine verbatim)", () => {
    assert.equal(ENHANCEMENT_MARKERS.length, 15);
  });

  it("ENHANCEMENT_MARKERS is frozen (immutable)", () => {
    assert.ok(Object.isFrozen(ENHANCEMENT_MARKERS));
  });

  it("CORPUS_THRESHOLD is 0.5 (engine verbatim)", () => {
    assert.equal(CORPUS_THRESHOLD, 0.5);
  });

  it("every marker has at least one regex pattern", () => {
    for (const m of ENHANCEMENT_MARKERS) {
      assert.ok(Array.isArray(m.patterns));
      assert.ok(m.patterns.length >= 1);
      for (const p of m.patterns) {
        assert.ok(p instanceof RegExp);
      }
    }
  });

  it("marker IDs are all snake_case strings", () => {
    for (const m of ENHANCEMENT_MARKERS) {
      assert.match(m.id, /^[a-z][a-z0-9_]*$/);
    }
  });
});

// =============================================================================
// detectMarkers
// =============================================================================
describe("detectMarkers", () => {
  it("returns all-false for empty string", () => {
    const out = detectMarkers("");
    assert.equal(Object.keys(out).length, 15);
    for (const v of Object.values(out)) assert.equal(v, false);
  });

  it("returns all-false for non-string input (null/number)", () => {
    const a = detectMarkers(null);
    const b = detectMarkers(42);
    for (const v of Object.values(a)) assert.equal(v, false);
    for (const v of Object.values(b)) assert.equal(v, false);
  });

  it("detects imachining marker (case-insensitive)", () => {
    const out = detectMarkers("// uses iMachining variable feed");
    assert.equal(out.imachining_variable_feed, true);
    assert.equal(out.ai_enhanced, false);
  });

  it("detects sidecar marker", () => {
    const out = detectMarkers("emits sidecar JSON export");
    assert.equal(out.sidecar_json_export, true);
  });

  it("detects prism_physics_integration via word-boundary PRISM", () => {
    // \bprism\b — should hit "PRISM " not "prismatic"
    const hit = detectMarkers("PRISM physics enabled");
    const miss = detectMarkers("prismatic surfaces");
    assert.equal(hit.prism_physics_integration, true);
    assert.equal(miss.prism_physics_integration, false);
  });

  it("detects multiple distinct markers in one body", () => {
    const out = detectMarkers(
      "iMachining + chip-thinning + adaptive feed + rigid tap + look-ahead",
    );
    assert.equal(out.imachining_variable_feed, true);
    assert.equal(out.chip_thinning_compensation, true);
    assert.equal(out.adaptive_feed_control, true);
    assert.equal(out.rigid_tapping, true);
    assert.equal(out.lookahead_optimization, true);
  });

  it("does not falsely-positive when no markers present", () => {
    const out = detectMarkers("plain G-code with no enhancements at all");
    assert.equal(Object.values(out).filter(Boolean).length, 0);
  });
});

// =============================================================================
// inferFamily
// =============================================================================
describe("inferFamily", () => {
  it("matches family from filename (case-insensitive)", () => {
    assert.equal(inferFamily("Haas-Vf2.cps", ""), "haas");
    assert.equal(inferFamily("HURCO_VM30i.cps", ""), "hurco");
    assert.equal(inferFamily("okuma-m460v.cps", ""), "okuma");
    assert.equal(inferFamily("ROKU-ROKU-SE.cps", ""), "roku-roku");
  });

  it("falls back to content scan when filename lacks family token", () => {
    assert.equal(inferFamily("post.cps", "Designed for Hurco WinMax"), "hurco");
  });

  it("returns 'unknown' when neither filename nor content matches", () => {
    assert.equal(inferFamily("post.cps", "Fanuc generic"), "unknown");
  });

  it("returns 'unknown' for null/undefined inputs", () => {
    assert.equal(inferFamily(null, null), "unknown");
    assert.equal(inferFamily(undefined, undefined), "unknown");
  });

  it("CONTROLLER_FAMILIES is the canonical 4-entry list", () => {
    assert.deepEqual([...CONTROLLER_FAMILIES], ["haas", "hurco", "okuma", "roku-roku"]);
  });
});

// =============================================================================
// buildProfile
// =============================================================================
describe("buildProfile", () => {
  it("assembles family + markers + count from a single .cps", () => {
    const p = buildProfile({
      file: "Haas-VF2.cps",
      content: "iMachining and sidecar JSON",
    });
    assert.equal(p.file, "Haas-VF2.cps");
    assert.equal(p.family, "haas");
    assert.equal(p.markers.imachining_variable_feed, true);
    assert.equal(p.markers.sidecar_json_export, true);
    assert.equal(p.markers.rigid_tapping, false);
    assert.equal(p.enhancementCount, 2);
  });

  it("handles a no-marker .cps cleanly", () => {
    const p = buildProfile({ file: "X.cps", content: "plain G-code" });
    assert.equal(p.enhancementCount, 0);
    assert.equal(p.family, "unknown");
  });
});

// =============================================================================
// computeCorpusGaps
// =============================================================================
describe("computeCorpusGaps", () => {
  // Fixture: 4 profiles; only 1 carries sidecar (25% coverage); only 1 carries
  // physics_data_integration; everyone carries rigid_tapping (100% coverage).
  const fixture = () => [
    buildProfile({ file: "A.cps", content: "rigid tap + sidecar" }),
    buildProfile({ file: "B.cps", content: "rigid tap" }),
    buildProfile({ file: "C.cps", content: "rigid tap" }),
    buildProfile({ file: "D.cps", content: "rigid tap" }),
  ];

  it("returns [] for empty profile list", () => {
    assert.deepEqual(computeCorpusGaps([]), []);
  });

  it("returns [] for non-array input (fail-soft)", () => {
    assert.deepEqual(computeCorpusGaps(null), []);
    assert.deepEqual(computeCorpusGaps(undefined), []);
  });

  it("flags sidecar at 25% < threshold as a corpus gap", () => {
    const gaps = computeCorpusGaps(fixture());
    const sidecar = gaps.find((g) => g.enhancement === "sidecar_json_export");
    assert.ok(sidecar, "sidecar gap should be reported");
    assert.equal(sidecar.coverage, 0.25);
    assert.deepEqual(sidecar.presentIn, ["A.cps"]);
    assert.deepEqual(sidecar.absentFrom, ["B.cps", "C.cps", "D.cps"]);
  });

  it("does NOT flag rigid_tapping at 100% as a corpus gap", () => {
    const gaps = computeCorpusGaps(fixture());
    const rigid = gaps.find((g) => g.enhancement === "rigid_tapping");
    assert.equal(rigid, undefined);
  });

  it("returns gaps sorted ascending by coverage", () => {
    const gaps = computeCorpusGaps(fixture());
    for (let i = 1; i < gaps.length; i++) {
      assert.ok(gaps[i - 1].coverage <= gaps[i].coverage);
    }
  });

  it("presentIn and absentFrom are sorted (deterministic)", () => {
    const gaps = computeCorpusGaps(fixture());
    for (const g of gaps) {
      const s = (a, b) => a.localeCompare(b);
      assert.deepEqual([...g.presentIn].sort(s), g.presentIn);
      assert.deepEqual([...g.absentFrom].sort(s), g.absentFrom);
    }
  });

  it("handles a single-profile corpus (everything missing is a gap)", () => {
    const one = [buildProfile({ file: "L.cps", content: "iMachining only" })];
    const gaps = computeCorpusGaps(one);
    const imach = gaps.find((g) => g.enhancement === "imachining_variable_feed");
    assert.equal(imach, undefined); // 1/1 = 100% coverage, not a gap
    const sidecar = gaps.find((g) => g.enhancement === "sidecar_json_export");
    assert.ok(sidecar);
    assert.equal(sidecar.coverage, 0);
  });
});

// =============================================================================
// computePostGaps
// =============================================================================
describe("computePostGaps", () => {
  it("returns [] for empty profile list", () => {
    assert.deepEqual(computePostGaps([]), []);
  });

  it("emits one entry per profile", () => {
    const ps = [
      buildProfile({ file: "A.cps", content: "iMachining" }),
      buildProfile({ file: "B.cps", content: "" }),
    ];
    const out = computePostGaps(ps);
    assert.equal(out.length, 2);
  });

  it("single-post family has empty missingFamilyPatterns (1/1 = 100%)", () => {
    const ps = [buildProfile({ file: "lonely.haas.cps", content: "" })];
    const out = computePostGaps(ps);
    assert.equal(out[0].family, "haas");
    assert.deepEqual(out[0].missingFamilyPatterns, []);
  });

  it("flags lagging post: family at 50% sidecar, lagger missing it", () => {
    // 4 hurco posts: 2 carry sidecar (50%), 2 don't. 50% >= CORPUS_THRESHOLD,
    // so the 2 that lack it are flagged as "lagging the family".
    const ps = [
      buildProfile({ file: "hurco-1.cps", content: "sidecar" }),
      buildProfile({ file: "hurco-2.cps", content: "sidecar" }),
      buildProfile({ file: "hurco-3.cps", content: "" }),
      buildProfile({ file: "hurco-4.cps", content: "" }),
    ];
    const out = computePostGaps(ps);
    const lag3 = out.find((g) => g.file === "hurco-3.cps");
    const lag4 = out.find((g) => g.file === "hurco-4.cps");
    assert.ok(lag3.missingFamilyPatterns.includes("sidecar_json_export"));
    assert.ok(lag4.missingFamilyPatterns.includes("sidecar_json_export"));

    const lead1 = out.find((g) => g.file === "hurco-1.cps");
    assert.equal(lead1.missingFamilyPatterns.includes("sidecar_json_export"), false);
  });

  it("valueScore = enhancementCount / 15, in [0,1]", () => {
    const ps = [
      buildProfile({ file: "max.cps", content: "iMachining sidecar rigid tap" }),
    ];
    const out = computePostGaps(ps);
    assert.equal(out[0].enhancementCount, 3);
    assert.ok(Math.abs(out[0].valueScore - 3 / 15) < 1e-9);
    assert.ok(out[0].valueScore >= 0 && out[0].valueScore <= 1);
  });

  it("missingFamilyPatterns is sorted (deterministic)", () => {
    const ps = [
      buildProfile({ file: "hurco-a.cps", content: "imachining sidecar adaptive feed" }),
      buildProfile({ file: "hurco-b.cps", content: "" }),
    ];
    const out = computePostGaps(ps);
    const b = out.find((p) => p.file === "hurco-b.cps");
    assert.deepEqual([...b.missingFamilyPatterns].sort(), b.missingFamilyPatterns);
  });

  it("results sorted by family asc, file asc", () => {
    const ps = [
      buildProfile({ file: "z.cps", content: "" }),
      buildProfile({ file: "haas-1.cps", content: "" }),
      buildProfile({ file: "okuma-1.cps", content: "" }),
      buildProfile({ file: "okuma-0.cps", content: "" }),
    ];
    const out = computePostGaps(ps);
    assert.equal(out[0].family, "haas");
    assert.equal(out[1].family, "okuma");
    assert.equal(out[1].file, "okuma-0.cps");
    assert.equal(out[2].file, "okuma-1.cps");
    assert.equal(out[3].family, "unknown");
  });
});

// =============================================================================
// buildGapReport (top-level integration)
// =============================================================================
describe("buildGapReport", () => {
  it("assembles schemaVersion + profileCount + nested structures", () => {
    const ps = [
      buildProfile({ file: "a.cps", content: "iMachining" }),
      buildProfile({ file: "hurco-b.cps", content: "rigid tap" }),
    ];
    const r = buildGapReport(ps);
    assert.equal(r.schemaVersion, "1.0.0");
    assert.equal(r.profileCount, 2);
    assert.ok(Array.isArray(r.postGaps));
    assert.ok(Array.isArray(r.corpusWideGaps));
    assert.equal(r.familyCounts.unknown, 1);
    assert.equal(r.familyCounts.hurco, 1);
  });

  it("empty profile list yields profileCount 0 + empty arrays", () => {
    const r = buildGapReport([]);
    assert.equal(r.profileCount, 0);
    assert.deepEqual(r.postGaps, []);
    assert.deepEqual(r.corpusWideGaps, []);
    assert.deepEqual(r.familyCounts, {});
  });

  it("output is deterministic — calling twice yields equal JSON", () => {
    const ps = [
      buildProfile({ file: "a.cps", content: "imachining" }),
      buildProfile({ file: "b.cps", content: "sidecar" }),
      buildProfile({ file: "c.cps", content: "" }),
    ];
    const a = buildGapReport(ps);
    const b = buildGapReport(ps);
    assert.deepEqual(a, b);
  });
});
