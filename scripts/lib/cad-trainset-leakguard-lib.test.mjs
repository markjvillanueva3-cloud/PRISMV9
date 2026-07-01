#!/usr/bin/env node
/**
 * Tests for cad-trainset-leakguard-lib.mjs (U-DELTA-TRAINSET-LEAKGUARD).
 * node:test. Run: node scripts/lib/cad-trainset-leakguard-lib.test.mjs
 *
 * R9: each assertion encodes the documented intent. The holdout fixtures use the REAL geom-50
 * shape ({abs_path, part_class, ext}); the trainset records use the REAL blueprint-training-pairs
 * shape ({part_number, part_number_normalized, cad_files[], program_files[], print_docs[]}).
 * Coverage: happy (clean) + >=3 failure modes (path/stem/id leaks) + >=2 adversarial
 * (cross-modality blisk-in-cad_files, null/garbage records, planted-leak throw).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  pathStem, normIdentity, recordPaths, recordIdentities,
  buildHoldoutGuardIndex, mergeHoldoutGuardIndexes, recordLeak, filterLeakSafe, assertTrainsetNoLeak, newLeakStats,
} from "./cad-trainset-leakguard-lib.mjs";

// Real geom-50-shaped holdout entries.
const GEOM50_SAMPLE = [
  { abs_path: "H:/prism/Resources/CAD FILES/blisk.stp", part_class: "blisk", ext: ".stp" },
  { abs_path: "H:/prism/Resources/CAD FILES/Impeller turbine.stp", part_class: "impeller", ext: ".stp" },
  { abs_path: "H:/prism/JM DIE/parts/10-010-150-2.step", part_class: "die", ext: ".step" },
];

// ---------- pathStem / normIdentity ----------
test("pathStem: lowercases, drops extension, handles case+separators", () => {
  assert.equal(pathStem("H:/prism/Resources/CAD FILES/blisk.stp"), "blisk");
  assert.equal(pathStem("C:\\x\\BLISK.STP"), "blisk");
  assert.equal(pathStem(""), "");
  assert.equal(pathStem(null), "");
});
test("normIdentity: compacts separators so 10-010-150-2 == 10_010_150_2", () => {
  assert.equal(normIdentity("10-010-150-2"), "100101502");
  assert.equal(normIdentity("10_010_150_2"), "100101502");
  assert.equal(normIdentity(" Blisk "), "blisk");
  assert.equal(normIdentity(42), "");
});

// ---------- recordPaths / recordIdentities ----------
test("recordPaths: pulls cad_files/program_files/print_docs + source_path + flat fields", () => {
  const rec = {
    cad_files: [{ path: "a/b/part.step" }, "c/d/loose.stp", { source_path: "e/f/orig.x_b" }],
    program_files: [{ filename: "prog.nc" }],
    print_docs: [{ filename: "Scanned.pdf" }],
    pdf_path: "z/flat.pdf",
    source_path: "s/flat_source.step",
  };
  const ps = recordPaths(rec);
  assert.ok(ps.includes("a/b/part.step"));
  assert.ok(ps.includes("c/d/loose.stp"));
  assert.ok(ps.includes("e/f/orig.x_b"), "source_path on an array item is extracted (fwd-compat)");
  assert.ok(ps.includes("prog.nc"));
  assert.ok(ps.includes("Scanned.pdf"));
  assert.ok(ps.includes("z/flat.pdf"));
  assert.ok(ps.includes("s/flat_source.step"), "flat source_path is extracted (fwd-compat)");
  assert.deepEqual(recordPaths(null), []);
  assert.deepEqual(recordPaths(42), []);
});

test("recordLeak: a held part referenced ONLY via source_path is caught (fwd-compat false-KEEP guard)", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const rec = { part_number: "src", cad_files: [{ source_path: "H:/prism/Resources/CAD FILES/blisk.stp" }] };
  assert.equal(recordLeak(rec, idx).leaked, true);
});
test("recordIdentities: explicit part ids + path stems", () => {
  const ids = recordIdentities({ part_number_normalized: "221178737", cad_files: [{ path: "x/blisk.stp" }] });
  assert.ok(ids.has("221178737"));
  assert.ok(ids.has("blisk"));
});

// ---------- buildHoldoutGuardIndex ----------
test("buildHoldoutGuardIndex: paths + stems + ids from geom-50 entries", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  assert.equal(idx.size, 3);
  assert.ok(idx.paths.has("h:/prism/resources/cad files/blisk.stp"));
  assert.ok(idx.stems.has("blisk"));
  assert.ok(idx.stems.has("impellerturbine"));
  assert.ok(idx.ids.has("100101502")); // 10-010-150-2 stem compacted
  // bare-string entries + non-array safe
  assert.equal(buildHoldoutGuardIndex(["p/q/foo.step"]).stems.has("foo"), true);
  assert.equal(buildHoldoutGuardIndex(null).size, 0);
});

// ---------- mergeHoldoutGuardIndexes: union of N eval splits ----------
test("mergeHoldoutGuardIndexes: unions paths/stems/ids across splits, dedups overlap", () => {
  const a = buildHoldoutGuardIndex([{ abs_path: "H:/p/blisk.stp", part_class: "blisk" }]);
  const b = buildHoldoutGuardIndex([{ abs_path: "H:/p/widget.step", part_number_normalized: "WID9" }]);
  const m = mergeHoldoutGuardIndexes([a, b]);
  assert.ok(m.paths.has("h:/p/blisk.stp") && m.paths.has("h:/p/widget.step"));
  assert.ok(m.stems.has("blisk") && m.stems.has("widget"));
  assert.ok(m.ids.has("wid9"));
  assert.equal(m.size, 2);
  // a record leaking against EITHER split trips the merged index
  assert.equal(recordLeak({ cad_files: [{ path: "x/blisk.STP" }] }, m).leaked, true);
  assert.equal(recordLeak({ part_number_normalized: "WID9" }, m).leaked, true);
  // dedup: merging an index with itself does not duplicate set members
  const dup = mergeHoldoutGuardIndexes([a, a]);
  assert.equal(dup.paths.size, a.paths.size);
  // adversarial: null / non-array / empty
  assert.equal(mergeHoldoutGuardIndexes(null).size, 0);
  assert.equal(mergeHoldoutGuardIndexes([null, a]).paths.has("h:/p/blisk.stp"), true);
});

// ---------- recordLeak: clean (happy path) ----------
test("recordLeak: an unrelated part is NOT a leak", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const clean = { part_number_normalized: "999999", cad_files: [{ path: "x/widget_unrelated.step" }] };
  assert.equal(recordLeak(clean, idx).leaked, false);
});

// ---------- recordLeak: 3 failure modes (path / stem / id) ----------
test("recordLeak: full-path match -> via path", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const rec = { part_number: "p1", cad_files: [{ path: "H:/prism/Resources/CAD FILES/blisk.stp" }] };
  const v = recordLeak(rec, idx);
  assert.equal(v.leaked, true);
  assert.equal(v.via, "path");
});
test("recordLeak: cross-modality stem match (BLISK.STP in a different dir/case) -> via stem", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const rec = { part_number: "p2", cad_files: [{ path: "D:/other/location/BLISK.STP" }] };
  const v = recordLeak(rec, idx);
  assert.equal(v.leaked, true);
  assert.equal(v.via, "stem");
});
test("recordLeak: part-identity match against a part-number-keyed holdout -> via id", () => {
  // a FUTURE same-corpus split keyed by part number (the id arm's reason to exist)
  const idx = buildHoldoutGuardIndex([{ abs_path: "n/a", part_number_normalized: "221178737" }]);
  const rec = { part_number_normalized: "221178737", print_docs: [{ filename: "Scanned.pdf" }] };
  const v = recordLeak(rec, idx);
  assert.equal(v.leaked, true);
  assert.equal(v.via, "id");
});

// ---------- filterLeakSafe: partition + stats + determinism ----------
test("filterLeakSafe: partitions kept vs held-out with stats, deterministic", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const recs = [
    { part_number: "leak1", cad_files: [{ path: "x/blisk.stp" }] },         // stem leak
    { part_number: "clean1", cad_files: [{ path: "x/totally_other.step" }] }, // clean
    { part_number: "leak2", cad_files: [{ path: "H:/prism/Resources/CAD FILES/Impeller turbine.stp" }] }, // path leak
  ];
  const r1 = filterLeakSafe(recs, idx);
  assert.equal(r1.stats.total, 3);
  assert.equal(r1.stats.held_out_excluded, 2);
  assert.equal(r1.stats.kept, 1);
  assert.equal(r1.kept[0].part_number, "clean1");
  // determinism: identical re-run -> identical stats
  const r2 = filterLeakSafe(recs, idx);
  assert.deepEqual(r2.stats, r1.stats);
  // non-array safe
  assert.equal(filterLeakSafe(null, idx).stats.total, 0);
});

// ---------- assertTrainsetNoLeak: fail-loud (R12) ----------
test("assertTrainsetNoLeak: THROWS on a planted leak, lists when throwOnLeak:false", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  const dirty = [{ part_number: "x", cad_files: [{ path: "x/blisk.stp" }] }];
  assert.throws(() => assertTrainsetNoLeak(dirty, idx), /TRAINSET LEAK/);
  const leaks = assertTrainsetNoLeak(dirty, idx, { throwOnLeak: false });
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].via, "stem");
  // a clean kept set never throws and returns []
  const clean = [{ part_number: "y", cad_files: [{ path: "x/unrelated.step" }] }];
  assert.deepEqual(assertTrainsetNoLeak(clean, idx), []);
});

// ---------- adversarial: garbage records never throw, never false-leak ----------
test("adversarial: null/garbage records are safe (not leaked, no throw)", () => {
  const idx = buildHoldoutGuardIndex(GEOM50_SAMPLE);
  assert.equal(recordLeak(null, idx).leaked, false);
  assert.equal(recordLeak(42, idx).leaked, false);
  assert.equal(recordLeak({}, idx).leaked, false);
  assert.equal(recordLeak({ cad_files: "not-an-array" }, idx).leaked, false);
  assert.equal(recordLeak({ part_number: "" }, idx).leaked, false);
  // null index -> never leaks (guard absent)
  assert.equal(recordLeak({ cad_files: [{ path: "x/blisk.stp" }] }, null).leaked, false);
});

// ---------- newLeakStats shape ----------
test("newLeakStats: fresh accumulator shape", () => {
  const s = newLeakStats();
  assert.equal(s.total, 0);
  assert.equal(s.held_out_excluded, 0);
  assert.deepEqual(s.by_via, { path: 0, stem: 0, id: 0 });
});

// ---------- LIVE-DATA (R15 validate-with-numbers, pins the measured 13-leak result) ----------
// Reads the REAL frozen geom-50.json (committed) + records copied VERBATIM from the actual
// leaking rows of blueprint-training-pairs.jsonl (the 2026-06-27 measurement). This pins the
// live-data claim in the lib docstring to an assertion (R9) instead of prose; if geom-50 is
// re-frozen and these parts drop out, this test fails LOUD -> re-validate the split.
test("LIVE geom-50: real same-part leaks are caught (path + stem); unrelated part is clean", () => {
  const manifestPath = new URL("../../state/shared/cad-holdout/geom-50.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok(Array.isArray(manifest.held) && manifest.held.length >= 50, "geom-50 must hold >=50 frozen parts");
  const idx = buildHoldoutGuardIndex(manifest.held);

  // REAL leak via exact full path (held .../OMG INC/pd1083.stp referenced in cad_files[]).
  const pathLeak = { part_number_normalized: "1083",
    cad_files: [{ path: "H:\\PRISM\\JM DIE\\HAAS-HURCO\\OMG INC\\pd1083.stp" }] };
  assert.equal(recordLeak(pathLeak, idx).via, "path");

  // REAL leak via basename stem (held ".3125 HI-PRO CUTTER" as .stp; record references the .ipt).
  const stemLeak = { part_number_normalized: "3125",
    cad_files: [{ path: "H:\\PRISM\\JM DIE\\HAAS-HURCO\\ALLSTAR FASTENERS\\.3125 HI-PRO CUTTER.ipt" }] };
  const sv = recordLeak(stemLeak, idx);
  assert.equal(sv.leaked, true);
  assert.equal(sv.via, "stem");

  // BOUNDED: an unrelated part not in the holdout is clean (the guard is not matching everything).
  const clean = { part_number_normalized: "ZZZ-NOT-HELD-999",
    cad_files: [{ path: "H:/some/unrelated/widget_xyz.step" }] };
  assert.equal(recordLeak(clean, idx).leaked, false);
});
