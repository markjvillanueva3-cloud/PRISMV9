#!/usr/bin/env node
/**
 * Tests for cad-geom-eval-runner-lib.mjs (U-DELTA-GEOM-EVAL-RUNNER, geometry modality).
 * node:test. Run: node --test scripts/lib/cad-geom-eval-runner-lib.test.mjs
 *
 * R9: covers the runner-bridge failure modes named in the unit spec -- stale/missing dist fail-loud
 * (the 25.4x trap), arg parsing (mode exclusivity), FULL-path-keyed predictions-dir mapping with
 * ambiguity THROW (stem-collision denominator lesson), perturbation direction (coords scale up ->
 * bbox grows by exactly the fraction), weakened-gate audit, and the self-test verdict logic.
 * Happy + >=3 failure + >=2 adversarial. Hermetic: fs is injected, no dist import, no real files.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  assertDistFresh, parseGeomArgs, heldEntriesOf, predsFromJsonMap, predsFromDir,
  splitSelfTestSets, perturbStepContent, weakenedGateWarnings, buildGeomReport, selfTestVerdict,
  SELFTEST_PARSEABLE_EXTS, SELFTEST_PERTURBABLE_EXTS,
} from "./cad-geom-eval-runner-lib.mjs";

/* ---------- assertDistFresh (fail-loud .mjs/TS bridge precondition) ---------- */

const statOf = (table) => (p) => {
  if (!(p in table)) { const e = new Error(`ENOENT: ${p}`); e.code = "ENOENT"; throw e; }
  return { mtimeMs: table[p] };
};

test("assertDistFresh: dist newer than src -> ok; equal mtime -> ok (rebuild in same tick)", () => {
  const pairs = [{ src: "a.ts", dist: "a.js" }];
  assert.deepEqual(assertDistFresh(pairs, statOf({ "a.ts": 100, "a.js": 200 })), { checked: 1 });
  assert.deepEqual(assertDistFresh(pairs, statOf({ "a.ts": 100, "a.js": 100 })), { checked: 1 });
});

test("assertDistFresh: STALE dist (older than src) -> THROWS naming both files + rebuild cmd + 25.4x", () => {
  assert.throws(
    () => assertDistFresh([{ src: "h.ts", dist: "h.js" }], statOf({ "h.ts": 500, "h.js": 100 })),
    (err) => {
      assert.match(err.message, /STALE dist/);
      assert.match(err.message, /h\.js/);
      assert.match(err.message, /h\.ts/);
      assert.match(err.message, /25\.4x/);
      assert.match(err.message, /npm run build:incremental/); // NOT build:fast -- esbuild never regenerates per-file dist/engines/*.js
      return true;
    },
  );
});

test("assertDistFresh: missing dist -> THROWS with rebuild cmd; missing src -> THROWS; empty pairs -> THROWS", () => {
  assert.throws(
    () => assertDistFresh([{ src: "s.ts", dist: "gone.js" }], statOf({ "s.ts": 1 })),
    /compiled dist missing: gone\.js/,
  );
  assert.throws(
    () => assertDistFresh([{ src: "gone.ts", dist: "d.js" }], statOf({ "d.js": 1 })),
    /harness source missing/,
  );
  assert.throws(() => assertDistFresh([], statOf({})), /no src\/dist pairs/);
});

test("assertDistFresh: SECOND pair stale is still caught (checks every pair, not just the first)", () => {
  assert.throws(
    () => assertDistFresh(
      [{ src: "a.ts", dist: "a.js" }, { src: "b.ts", dist: "b.js" }],
      statOf({ "a.ts": 1, "a.js": 2, "b.ts": 900, "b.js": 100 }),
    ),
    /b\.js/,
  );
});

/* ---------- parseGeomArgs ---------- */

test("parseGeomArgs: predictions mode happy path + gate flags + json", () => {
  const r = parseGeomArgs(["--split", "geom-50.json", "--predictions", "p.json", "--min-pass-fraction", "0.95", "--json"]);
  assert.equal(r.ok, true);
  assert.equal(r.opts.split, "geom-50.json");
  assert.equal(r.opts.predictions, "p.json");
  assert.equal(r.opts.minPassFraction, 0.95);
  assert.equal(r.opts.json, true);
  assert.equal(r.opts.selfTest, false);
});

test("parseGeomArgs: self-test defaults (perturb 10%, limit 0=all); missing --split flagged", () => {
  const r = parseGeomArgs(["--split", "s.json", "--self-test"]);
  assert.equal(r.ok, true);
  assert.equal(r.opts.perturbPct, 10);
  assert.equal(r.opts.limit, 0);
  const bad = parseGeomArgs(["--self-test"]);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("--split")));
});

test("parseGeomArgs: no mode -> error; two modes -> mutually-exclusive error; bad numbers -> error", () => {
  const none = parseGeomArgs(["--split", "s.json"]);
  assert.equal(none.ok, false);
  assert.ok(none.errors.some((e) => e.includes("choose a mode")));
  const both = parseGeomArgs(["--split", "s.json", "--predictions", "p.json", "--self-test"]);
  assert.equal(both.ok, false);
  assert.ok(both.errors.some((e) => e.includes("mutually exclusive")));
  const nan = parseGeomArgs(["--split", "s.json", "--self-test", "--perturb-pct", "abc"]);
  assert.equal(nan.ok, false);
  const neg = parseGeomArgs(["--split", "s.json", "--self-test", "--perturb-pct", "-5"]);
  assert.equal(neg.ok, false);
});

/* ---------- predictions shaping (FULL-path denominator) ---------- */

test("predsFromJsonMap: passes a valid map through; THROWS on array / non-string value", () => {
  assert.deepEqual(predsFromJsonMap({ "H:/a.step": "p/a.step" }), { "H:/a.step": "p/a.step" });
  assert.throws(() => predsFromJsonMap(["x"]), /JSON object/);
  assert.throws(() => predsFromJsonMap({ "H:/a.step": 42 }), /not a file path string/);
  assert.throws(() => predsFromJsonMap(null), /JSON object/);
});

test("predsFromDir: maps by basename (case-insensitive) but KEYS by full held abs_path; unmatched dir files surfaced", () => {
  const held = [{ abs_path: "H:/x/Blisk.stp" }, { abs_path: "H:/y/bracket.step" }];
  const { predByPath, unmatchedDirFiles } = predsFromDir(held, ["blisk.stp", "stray.step"], "P:/preds");
  assert.deepEqual(Object.keys(predByPath), ["H:/x/Blisk.stp"]); // full path key, NOT the stem
  assert.equal(predByPath["H:/x/Blisk.stp"], path.join("P:/preds", "blisk.stp"));
  assert.deepEqual(unmatchedDirFiles, ["stray.step"]);
});

test("predsFromDir: a dir file matching 2+ held parts sharing a basename THROWS (stem ambiguity is fail-loud, never silent)", () => {
  const held = [{ abs_path: "H:/a/PD1083.step" }, { abs_path: "H:/b/PD1083.step" }];
  assert.throws(() => predsFromDir(held, ["PD1083.step"], "P:/preds"), /ambiguous/);
  // ...but two held parts sharing a basename with NO matching dir file is fine (they just go unpredicted)
  const r = predsFromDir(held, ["other.step"], "P:/preds");
  assert.deepEqual(r.predByPath, {});
});

/* ---------- self-test partitioning ---------- */

test("splitSelfTestSets: parseable+existing -> identity; STEP subset -> perturbable; .x_b -> unsupported; absent -> missingFiles", () => {
  const held = [
    { abs_path: "H:/a.step" }, { abs_path: "H:/b.igs" }, { abs_path: "H:/c.x_b" }, { abs_path: "H:/gone.stp" },
  ];
  const exists = (p) => p !== "H:/gone.stp";
  const r = splitSelfTestSets(held, exists);
  assert.deepEqual(r.identity, ["H:/a.step", "H:/b.igs"]);
  assert.deepEqual(r.perturbable, ["H:/a.step"]); // IGES is identity-only, never perturbed
  assert.deepEqual(r.unsupported, ["H:/c.x_b"]);
  assert.deepEqual(r.missingFiles, ["H:/gone.stp"]);
  assert.ok(SELFTEST_PARSEABLE_EXTS.includes(".step") && !SELFTEST_PARSEABLE_EXTS.includes(".x_b"));
  assert.ok(!SELFTEST_PERTURBABLE_EXTS.includes(".igs"));
});

/* ---------- perturbation (direction + no-op fail-loud) ---------- */

const MINI_STEP = [
  "ISO-10303-21;",
  "#10=CARTESIAN_POINT('',(0.,0.,0.));",
  "#11=CARTESIAN_POINT('',(10.,20.,-30.));",
  "#12=CARTESIAN_POINT('origin',(1.5E+1,2.0,3.25));",
  "#20=ADVANCED_FACE('',(#5),#6,.T.);",
  "END-ISO-10303-21;",
].join("\n");

// The engine's own triplet regex shape -- what its bbox extractor will see in the perturbed content.
const TRIPLET_RE = /CARTESIAN_POINT\s*\([^)]*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)/gi;
function bboxMaxAbs(content) {
  let m = 0;
  for (const t of content.matchAll(TRIPLET_RE)) {
    for (const c of [t[1], t[2], t[3]]) m = Math.max(m, Math.abs(parseFloat(c)));
  }
  return m;
}

test("perturbStepContent: +10% scales EVERY coordinate by exactly 1.1 (bbox direction: grows), topology lines untouched", () => {
  const { content, pointsPerturbed } = perturbStepContent(MINI_STEP, 0.10);
  assert.equal(pointsPerturbed, 3);
  // direction: the extreme coordinate grew by exactly the fraction (what the engine's bbox will measure)
  assert.ok(Math.abs(bboxMaxAbs(content) - bboxMaxAbs(MINI_STEP) * 1.1) < 1e-9);
  // per-point check incl. negative + exponent forms
  const pts = [...content.matchAll(TRIPLET_RE)].map((t) => [t[1], t[2], t[3]].map(Number));
  assert.deepEqual(pts[0], [0, 0, 0]);
  assert.ok(Math.abs(pts[1][2] - (-33)) < 1e-9); // -30 * 1.1
  assert.ok(Math.abs(pts[2][0] - 16.5) < 1e-9);  // 1.5E+1 * 1.1
  // non-point entities byte-identical (topology Jaccard must stay 1 for GRADED degradation)
  assert.ok(content.includes("#20=ADVANCED_FACE('',(#5),#6,.T.);"));
  // still parseable STEP envelope
  assert.ok(content.startsWith("ISO-10303-21;"));
});

test("perturbStepContent: no CARTESIAN_POINT -> THROWS (a no-op perturbation would fake the degradation proof)", () => {
  assert.throws(() => perturbStepContent("ISO-10303-21;\n#1=PLANE('',#2);", 0.1), /no-op/);
  assert.throws(() => perturbStepContent("", 0.1), /empty content/);
  assert.throws(() => perturbStepContent(MINI_STEP, 0), /bad fraction/);
});

test("perturbStepContent: negative fraction shrinks (graded in the other direction) -- still counted", () => {
  const { content, pointsPerturbed } = perturbStepContent(MINI_STEP, -0.5);
  assert.equal(pointsPerturbed, 3);
  assert.ok(Math.abs(bboxMaxAbs(content) - bboxMaxAbs(MINI_STEP) * 0.5) < 1e-9);
});

/* ---------- weakened-gate audit + report shape ---------- */

const DEFAULTS = { minPassFraction: 0.9, minMeanTopology: 0.9, minCoverage: 0.5 };

test("weakenedGateWarnings: below-default floors flagged; at/above default or unset -> silent", () => {
  assert.deepEqual(weakenedGateWarnings({}, DEFAULTS), []);
  assert.deepEqual(weakenedGateWarnings({ minPassFraction: 0.9, minCoverage: 0.8 }, DEFAULTS), []);
  const w = weakenedGateWarnings({ minPassFraction: 0.5, minMeanTopology: 0.1, minCoverage: 0.1 }, DEFAULTS);
  assert.equal(w.length, 3);
  assert.ok(w[0].includes("0.5") && w[0].includes("0.9"));
});

test("buildGeomReport: dim-family shape -- gate/aggregate/scored/heldTotal/coverage + COUNTS (not arrays) + modality tag", () => {
  const result = {
    aggregate: { scored: 2, passed: 2, passFraction: 1, meanPassRate: 1, meanTopologySimilarity: 1 },
    scored: 2, heldTotal: 4,
    missingPrediction: ["a", "b"], compareErrors: [], nonHeldPredictions: ["z"],
  };
  const gate = { pass: false, reasons: ["x"], passFraction: 1, meanTopologySimilarity: 1, coverage: 0.5 };
  const rep = buildGeomReport(result, gate, { phase: "identity" });
  assert.equal(rep.modality, "geometry");
  assert.equal(rep.missingPrediction, 2);
  assert.equal(rep.nonHeldPredictions, 1);
  assert.equal(rep.coverage, 0.5);
  assert.equal(rep.phase, "identity");
  assert.equal(rep.heldTotal, 4);
});

/* ---------- self-test verdict ---------- */

const mkReport = (pass, passFraction, meanPassRate, compareErrors = 0) => ({
  gate: { pass }, aggregate: { passFraction, meanPassRate }, compareErrors,
});

test("selfTestVerdict: identity perfect + perturbed degraded-and-failing -> ok", () => {
  const v = selfTestVerdict(mkReport(true, 1, 1), mkReport(false, 0, 0.5));
  assert.equal(v.ok, true);
  assert.deepEqual(v.reasons, []);
});

test("selfTestVerdict: LIMITED smoke skips ONLY the identity-gate requirement (coverage floor unmeetable on a cap); full run does not", () => {
  // identity gate FAILS on coverage (capped run) but scoring is perfect -> ok when limited, not ok when full
  const idCapped = mkReport(false, 1, 1);
  const pert = mkReport(false, 0, 0.5);
  assert.equal(selfTestVerdict(idCapped, pert, { limited: true }).ok, true);
  assert.equal(selfTestVerdict(idCapped, pert).ok, false);
  // limited does NOT excuse imperfect identity scoring or compare errors
  assert.equal(selfTestVerdict(mkReport(false, 0.9, 1), pert, { limited: true }).ok, false);
  assert.equal(selfTestVerdict(mkReport(false, 1, 1, 2), pert, { limited: true }).ok, false);
});

test("selfTestVerdict: each broken direction is a named reason (identity fail; no degradation; perturbed passing)", () => {
  assert.ok(selfTestVerdict(mkReport(false, 1, 1), mkReport(false, 0, 0.5)).reasons.some((r) => r.includes("identity phase gate FAILED")));
  assert.ok(selfTestVerdict(mkReport(true, 0.9, 1), mkReport(false, 0, 0.5)).reasons.some((r) => r.includes("!== 1")));
  // ADVERSARIAL: perturbed scores IDENTICAL to identity (perturbation invisible to the comparator) -> not ok
  assert.ok(selfTestVerdict(mkReport(true, 1, 1), mkReport(false, 1, 1)).reasons.some((r) => r.includes("no graded degradation") || r.includes("not <")));
  // ADVERSARIAL: perturbed gate passes -> not ok even if metrics dipped
  assert.ok(selfTestVerdict(mkReport(true, 1, 1), mkReport(true, 0.5, 0.7)).reasons.some((r) => r.includes("PASSED")));
  // null-safety: garbage never throws
  assert.equal(selfTestVerdict(null, null).ok, false);
});

/* ---------- heldEntriesOf ---------- */

test("heldEntriesOf: split object .held, bare array, or garbage -> []", () => {
  assert.deepEqual(heldEntriesOf({ held: [{ abs_path: "a" }] }), [{ abs_path: "a" }]);
  assert.deepEqual(heldEntriesOf([{ abs_path: "b" }]), [{ abs_path: "b" }]);
  assert.deepEqual(heldEntriesOf(null), []);
  assert.deepEqual(heldEntriesOf({ held: "nope" }), []);
});
