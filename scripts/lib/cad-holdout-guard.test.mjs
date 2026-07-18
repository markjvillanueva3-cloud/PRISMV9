#!/usr/bin/env node
/**
 * Tests for cad-holdout-guard.mjs (U-DELTA-HOLDOUT-SPLITS keystone).
 * node:test. Run: node scripts/lib/cad-holdout-guard.test.mjs
 *
 * R9: every assertion encodes WHY -- the guard must THROW on a real leak (incl. the
 * Windows casing/separator leak vector), splits must be DETERMINISTIC + stratified, and
 * counts must never be over-claimed. Happy + >=3 failure + >=2 adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizePath, itemPath, buildHoldoutSet, isHeldOut, assertNoLeak,
  stableHash, summarizeStrata, freezeStratifiedHoldout, loadHoldout,
  isNonPartGeometry, contentDedupKey, dedupeByContentKey,
} from "./cad-holdout-guard.mjs";

// ---- synthetic corpus: 10 die + 6 general + 4 shaft = 20 (known reference) ----
function corpus() {
  const mk = (cls, i) => ({ abs_path: `H:/prism/corpus/${cls}/part-${i}.step`, part_class: cls, ext: ".step" });
  const e = [];
  for (let i = 0; i < 10; i++) e.push(mk("die", i));
  for (let i = 0; i < 6; i++) e.push(mk("general", i));
  for (let i = 0; i < 4; i++) e.push(mk("shaft", i));
  return e;
}

// ---------- normalizePath ----------
test("normalizePath: backslash->slash, lowercase, trailing-slash, dup-slash", () => {
  assert.equal(normalizePath("H:\\PRISM\\A.step"), "h:/prism/a.step");
  assert.equal(normalizePath("H:/prism//a.step/"), "h:/prism/a.step");
  assert.equal(normalizePath("  H:/PRISM/a.STEP  "), "h:/prism/a.step");
  assert.equal(normalizePath(null), "");
  assert.equal(normalizePath(42), "");
});

// ---------- itemPath ----------
test("itemPath: string passthrough, object key, missing -> ''", () => {
  assert.equal(itemPath("a/b.step"), "a/b.step");
  assert.equal(itemPath({ abs_path: "x/y.step" }), "x/y.step");
  assert.equal(itemPath({ rel_path: "x" }, "rel_path"), "x");
  assert.equal(itemPath({ nope: 1 }), "");
  assert.equal(itemPath(null), "");
});

// ---------- buildHoldoutSet / isHeldOut ----------
test("buildHoldoutSet dedups + normalizes; isHeldOut matches across casing/separator", () => {
  const set = buildHoldoutSet(["H:/prism/a.step", "H:\\PRISM\\a.step", { abs_path: "H:/prism/b.step" }]);
  assert.equal(set.size, 2, "the two casings of a.step collapse to one");
  assert.ok(isHeldOut("h:/prism/a.step", set));
  assert.ok(isHeldOut("H:\\PRISM\\A.STEP", set), "Windows casing+separator variant still detected (the leak vector)");
  assert.ok(!isHeldOut("H:/prism/c.step", set));
  assert.ok(!isHeldOut("x", "notaset"));
});

// ---------- assertNoLeak: HAPPY ----------
test("assertNoLeak: clean train set returns [] and does not throw", () => {
  const holdout = buildHoldoutSet(["H:/prism/h1.step", "H:/prism/h2.step"]);
  const leaks = assertNoLeak(["H:/prism/t1.step", "H:/prism/t2.step"], holdout);
  assert.deepEqual(leaks, []);
});

// ---------- assertNoLeak: FAILURE 1 -- real leak THROWS (the keystone) ----------
test("assertNoLeak: a train item also in holdout THROWS (fail-loud)", () => {
  const holdout = buildHoldoutSet(["H:/prism/h1.step", "H:/prism/shared.step"]);
  assert.throws(
    () => assertNoLeak(["H:/prism/t1.step", "H:/prism/shared.step"], holdout),
    /TRAIN\/TEST LEAK/,
  );
});

// ---------- assertNoLeak: FAILURE 2 -- casing/separator leak still caught ----------
test("assertNoLeak: leak hidden behind casing/separator difference still THROWS", () => {
  const holdout = buildHoldoutSet(["H:/prism/shared.step"]);
  // training references the SAME part via a backslash + uppercase path -- a real Windows leak
  assert.throws(
    () => assertNoLeak([{ abs_path: "H:\\PRISM\\SHARED.step" }], holdout),
    /TRAIN\/TEST LEAK: 1 /,
  );
});

// ---------- assertNoLeak: FAILURE 3 -- non-throwing mode reports leaks ----------
test("assertNoLeak: throwOnLeak:false returns the (deduped) leaking paths", () => {
  const holdout = buildHoldoutSet(["H:/prism/x.step"]);
  const leaks = assertNoLeak(
    ["H:/prism/x.step", "H:\\prism\\x.step", "H:/prism/ok.step"],
    holdout,
    { throwOnLeak: false },
  );
  assert.deepEqual(leaks, ["h:/prism/x.step"], "the two casings dedup to one leak entry");
});

// ---------- stableHash: deterministic ----------
test("stableHash: deterministic + sensitive to input", () => {
  assert.equal(stableHash("H:/prism/a.step"), stableHash("H:/prism/a.step"));
  assert.notEqual(stableHash("a"), stableHash("b"));
  assert.ok(Number.isInteger(stableHash("x")) && stableHash("x") >= 0);
});

// ---------- summarizeStrata ----------
test("summarizeStrata: counts per class", () => {
  assert.deepEqual(summarizeStrata(corpus()), { die: 10, general: 6, shaft: 4 });
  assert.deepEqual(summarizeStrata([{ part_class: "a" }, { nope: 1 }]), { a: 1, "(unknown)": 1 });
});

// ---------- freezeStratifiedHoldout: HAPPY + proportional reference ----------
test("freezeStratifiedHoldout: n=10 of 20 -> proportional die5/general3/shaft2", () => {
  const r = freezeStratifiedHoldout(corpus(), { n: 10 });
  assert.equal(r.actual, 10);
  assert.equal(r.requested, 10);
  assert.equal(r.total, 20);
  assert.deepEqual(r.strata, { die: 5, general: 3, shaft: 2 }, "proportional allocation 10/6/4 -> 5/3/2");
  assert.equal(r.held.length, 10);
  // every held entry is a real corpus entry
  for (const h of r.held) assert.ok(h.abs_path && h.part_class);
});

// ---------- freezeStratifiedHoldout: DETERMINISM (R9 keystone) ----------
test("freezeStratifiedHoldout: same input -> byte-identical split (reproducible, no Math.random)", () => {
  const a = freezeStratifiedHoldout(corpus(), { n: 7 });
  const b = freezeStratifiedHoldout(corpus(), { n: 7 });
  const pa = a.held.map((e) => e.abs_path).sort();
  const pb = b.held.map((e) => e.abs_path).sort();
  assert.deepEqual(pa, pb, "the held set must be identical across runs or leak-auditing is impossible");
});

// ---------- freezeStratifiedHoldout: held set is leak-clean against the remainder ----------
test("freezeStratifiedHoldout: remainder(train) has NO leak vs held; held-vs-held THROWS", () => {
  const all = corpus();
  const r = freezeStratifiedHoldout(all, { n: 8 });
  const holdoutSet = buildHoldoutSet(r.held);
  const heldPaths = new Set(r.held.map((e) => normalizePath(e.abs_path)));
  const train = all.filter((e) => !heldPaths.has(normalizePath(e.abs_path)));
  assert.equal(train.length, all.length - r.actual);
  assert.deepEqual(assertNoLeak(train, holdoutSet), [], "the training remainder must be leak-free by construction");
  assert.throws(() => assertNoLeak(r.held, holdoutSet), /TRAIN\/TEST LEAK/, "held items fed as train MUST trip the guard");
});

// ---------- freezeStratifiedHoldout: FAILURE -- n > total never over-claims ----------
test("freezeStratifiedHoldout: n>total returns total, never fabricates entries", () => {
  const r = freezeStratifiedHoldout(corpus(), { n: 999 });
  assert.equal(r.actual, 20);
  assert.equal(r.requested, 999);
  assert.equal(r.held.length, 20, "actual count == real available, not the requested 999 (R12 no over-claim)");
});

// ---------- freezeStratifiedHoldout: PER-STRATUM FLOOR -- rare class not dropped ----------
test("freezeStratifiedHoldout: floor guarantees a rare class >=1 (pure proportional would drop it)", () => {
  const entries = [];
  for (let i = 0; i < 100; i++) entries.push({ abs_path: `H:/p/g/${i}.step`, part_class: "general" });
  entries.push({ abs_path: "H:/p/rare/0.step", part_class: "rare" });
  // n=5 >= 2 strata -> floor; pure proportional would give rare 5*1/101 ~ 0.05 -> floor 0 -> dropped.
  const r = freezeStratifiedHoldout(entries, { n: 5 });
  assert.equal(r.actual, 5);
  assert.equal(r.strata.rare, 1, "rare class MUST be covered by the per-stratum floor");
  assert.equal(r.strata.general, 4);
});

// ---------- freezeStratifiedHoldout: n < number-of-strata -> largest strata covered ----------
test("freezeStratifiedHoldout: n < strata-count gives 1 each to the n LARGEST strata", () => {
  const entries = [
    ...Array.from({ length: 5 }, (_, i) => ({ abs_path: `H:/p/a/${i}.step`, part_class: "big" })),
    ...Array.from({ length: 3 }, (_, i) => ({ abs_path: `H:/p/b/${i}.step`, part_class: "mid" })),
    { abs_path: "H:/p/c/0.step", part_class: "small" },
  ];
  const r = freezeStratifiedHoldout(entries, { n: 2 }); // 2 < 3 strata -> full coverage impossible
  assert.equal(r.actual, 2);
  assert.deepEqual(r.strata, { big: 1, mid: 1 }, "the 2 largest strata covered; smallest dropped (documented limit)");
});

// ---------- freezeStratifiedHoldout: FAILURE -- empty / bad n throw ----------
test("freezeStratifiedHoldout: empty entries + non-positive n THROW", () => {
  assert.throws(() => freezeStratifiedHoldout([], { n: 5 }), /no entries with a usable path/);
  assert.throws(() => freezeStratifiedHoldout(corpus(), { n: 0 }), /n must be a positive number/);
  assert.throws(() => freezeStratifiedHoldout(corpus(), { n: NaN }), /n must be a positive number/);
  assert.throws(() => freezeStratifiedHoldout("notarray", { n: 5 }), /entries must be an array/);
});

// ---------- freezeStratifiedHoldout: ADVERSARIAL -- pathless + classless entries ----------
test("freezeStratifiedHoldout: skips pathless entries, buckets classless as (unknown)", () => {
  const messy = [
    { abs_path: "H:/p/a.step", part_class: "die" },
    { abs_path: "H:/p/b.step" },          // no class -> (unknown)
    { part_class: "die" },                 // no path -> skipped entirely
    { abs_path: "", part_class: "die" },  // empty path -> skipped
  ];
  const r = freezeStratifiedHoldout(messy, { n: 10 });
  assert.equal(r.total, 2, "only the 2 entries WITH a path are eligible");
  assert.equal(r.actual, 2);
  assert.ok(r.strata.die === 1 && r.strata["(unknown)"] === 1);
});

// ---------- loadHoldout: round-trip + fail-loud ----------
test("loadHoldout: reads {held:[...]} + bare array; THROWS on corrupt/missing-array/missing-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "cad-holdout-test-"));
  try {
    const good = join(dir, "geom.json");
    writeFileSync(good, JSON.stringify({ held: [{ abs_path: "H:/p/a.step" }, { abs_path: "H:/p/b.step" }] }), "utf8");
    const loaded = loadHoldout(good);
    assert.equal(loaded.count, 2);
    assert.ok(loaded.set.has("h:/p/a.step"));

    const bare = join(dir, "bare.json");
    writeFileSync(bare, JSON.stringify(["H:/p/c.step"]), "utf8");
    assert.equal(loadHoldout(bare).count, 1, "a bare top-level array is also accepted");

    const corrupt = join(dir, "corrupt.json");
    writeFileSync(corrupt, "{not json", "utf8");
    assert.throws(() => loadHoldout(corrupt), /not valid JSON/, "corrupt manifest fails loud (never silent empty set)");

    const noarr = join(dir, "noarr.json");
    writeFileSync(noarr, JSON.stringify({ foo: 1 }), "utf8");
    assert.throws(() => loadHoldout(noarr), /no array of entries/);

    assert.throws(() => loadHoldout(join(dir, "missing.json")), /cannot read holdout manifest/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- loadHoldout: empty + null fail loud (silent-guard-disable prevention) ----------
test("loadHoldout: empty holdout THROWS (guard would be silently off); allowEmpty bypasses; null manifest fails loud", () => {
  const dir = mkdtempSync(join(tmpdir(), "cad-holdout-empty-"));
  try {
    const empty = join(dir, "empty.json");
    writeFileSync(empty, JSON.stringify({ held: [] }), "utf8");
    assert.throws(() => loadHoldout(empty), /silently disables the leak guard/,
      "an empty holdout must fail loud -- it would let every train item pass the leak guard");
    assert.equal(loadHoldout(empty, "abs_path", true).count, 0, "allowEmpty=true returns the empty set without throwing");

    const nul = join(dir, "null.json");
    writeFileSync(nul, "null", "utf8");
    assert.throws(() => loadHoldout(nul), /no array of entries/,
      "null top-level fails loud with the descriptive message, not a raw TypeError");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- U-CAD-HOLDOUT-PARTPURITY: non-part exclusion + content-dedup (2026-06-29, slot:delta) ----------
test("isNonPartGeometry: excludes machine/holder/post/tooling models; keeps real parts", () => {
  // the ACTUAL contaminants found in geom-50.json (machine tools, posts, holders, tooling DB)
  assert.equal(isNonPartGeometry("H:/prism/Resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/HAAS/HAAS VF-2.step"), true);
  assert.equal(isNonPartGeometry("H:/prism/Resources/POSTS AND MACHINES/MULTUS B250II W.stp"), true);
  assert.equal(isNonPartGeometry("H:/prism/Resources/TOOL_HOLDER_CAD_FILES/BATCH 2/bcv50-hmc_750-4.stp"), true);
  assert.equal(isNonPartGeometry("H:/prism/JM DIE/OKUMA/hyperCAD-S/Tool Database/Tooling/Command Holders/igs/H4Y5A0750.igs"), true);
  // real PARTS must be KEPT (false)
  assert.equal(isNonPartGeometry("H:/prism/JM DIE/ROKU-ROKU/L09 v3.3 XHD POINTING DIE.stp"), false);
  assert.equal(isNonPartGeometry("H:/prism/Resources/CAD FILES/blisk.stp"), false);
  assert.equal(isNonPartGeometry("H:/prism/cad-engine/exports/bracket.step"), false);
  assert.equal(isNonPartGeometry(""), false);
  assert.equal(isNonPartGeometry(null), false);
});

test("contentDedupKey: normalized basename collapses the SAME part at mirror dirs", () => {
  // the real geom-50 duplicate: PSV-30381A-32 appears under Resources/ AND BOX/ (different dirs, same part)
  const a = "H:/prism/Resources/PART MODELS FOR LEARNING ENGINE/BATCH 1/PSV-30381A-32 - MACHINE 5.step";
  const b = "H:/prism/BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/PSV-30381A-32 - MACHINE 5.step";
  assert.equal(contentDedupKey({ abs_path: a }), contentDedupKey({ abs_path: b }), "same basename at different dirs -> same key");
  assert.equal(contentDedupKey({ abs_path: a }), "psv-30381a-32 - machine 5.step");
  assert.notEqual(contentDedupKey({ abs_path: "H:/p/a.step" }), contentDedupKey({ abs_path: "H:/p/b.step" }), "distinct basenames -> distinct keys");
  assert.equal(contentDedupKey({}), "", "no path -> empty key");
});

test("dedupeByContentKey: collapses mirror-path twins, deterministic survivor (input-order-independent), keeps distinct", () => {
  const a = { abs_path: "H:/prism/Resources/x/pd1083.stp", part_class: "general", ext: ".stp" };
  const b = { abs_path: "H:/prism/BOX/x/pd1083.stp", part_class: "general", ext: ".stp" }; // basename-twin of a
  const c = { abs_path: "H:/prism/y/unique.stp", part_class: "die", ext: ".stp" };
  const out = dedupeByContentKey([a, b, c]);
  assert.equal(out.length, 2, "the two pd1083 twins collapse to one; unique survives");
  const out2 = dedupeByContentKey([b, a, c]); // reversed input
  const surv = (set) => set.find((e) => contentDedupKey(e) === "pd1083.stp").abs_path;
  assert.equal(surv(out), surv(out2), "survivor is deterministic (stableHash order), not insertion-order-dependent");
  assert.equal(dedupeByContentKey([{ part_class: "die" }, c]).length, 1, "pathless entries dropped");
  assert.deepEqual(dedupeByContentKey("notarray"), [], "non-array -> []");
});
