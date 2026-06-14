// scripts/lib/cnc-ground-truth-lib.test.mjs
//
// U-TDP06 — tests for the CNC-derived ground-truth pure core.
// Reference values are derived from real JM Die .MIN structure and from
// hand-verified canonical G-code patterns. The final test proves a CNC GT
// record grades correctly through the actual U-TDP04 benchmark presence path
// (the integration seam that round-1 scrutiny flagged as a P0).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectUnits,
  tokenizeNc,
  evidenceFromNcOps,
  inferPartClassFromNcPath,
  analyzeNcResult,
  buildGtRecordFromNc,
  createBatchSummary,
  groupRecordsByPartClass,
  summarizeBatch,
  CNC_FILENAME_HEURISTICS,
} from "./cnc-ground-truth-lib.mjs";
import { compareExtractionToGroundTruth } from "./ocr-benchmark-lib.mjs";

// A faithful slice of JM DIE/CNC LATHE/9007405.MIN — inch lathe, G96 CSS,
// a G1 feed cut, NO canned cycle, "STEEL INCH" + "TIME=HH:MM" header comments.
const REAL_LATHE = [
  "G140",
  "(PROGRAM NAME - 9007405)",
  "(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)",
  "(MATERIAL - STEEL INCH - 1030 - 200 BHN)",
  "G0 X20. Z30.",
  "G50 S800",
  "G97 S558 M3 M42",
  "T010101",
  "G96 S200",
  "G95 G1 X-.0313 F.005",
  "G0 X10. Z10.",
  "M02",
].join("\n");

// ---------- detectUnits ----------
test("detectUnits: explicit G21 → metric, G20 → inch", () => {
  assert.equal(detectUnits("G21 G90\nG1 X1"), "metric");
  assert.equal(detectUnits("%\nG20 G90"), "inch");
});

test("detectUnits: G210 must NOT match G21 (boundary guard)", () => {
  assert.equal(detectUnits("G210 X1 Y2"), "unknown");
});

test("detectUnits: bare 'MM' in a timestamp comment is NOT a metric signal (real 9007405 regression)", () => {
  // header has "TIME=HH:MM" and "STEEL INCH" — must resolve to inch, not metric
  assert.equal(detectUnits(REAL_LATHE), "inch");
});

test("detectUnits: INCH word wins, METRIC word fallback, unknown otherwise", () => {
  assert.equal(detectUnits("(STEEL INCH)\nG1 X1"), "inch");
  assert.equal(detectUnits("(METRIC PART)\nG1 X1"), "metric");
  assert.equal(detectUnits("G1 X1 Z2"), "unknown");
});

test("detectUnits: null/empty/non-string → unknown", () => {
  assert.equal(detectUnits(null), "unknown");
  assert.equal(detectUnits(""), "unknown");
  assert.equal(detectUnits(42), "unknown");
  assert.equal(detectUnits({}), "unknown"); // a malformed batch row (content not a string)
  assert.equal(detectUnits([]), "unknown");
});

// ---------- tokenizeNc ----------
test("tokenizeNc: strips paren and semicolon comments", () => {
  const ops = tokenizeNc("(setup) G1 X1. ; trailing\nG0 Z5.");
  assert.equal(ops.length, 2);
  assert.deepEqual(ops[0].g, [1]);
  assert.equal(ops[0].words.X, 1);
});

test("tokenizeNc: Math.trunc collapses decimal sub-cycle G83.1 → 83, G84.2 → 84", () => {
  const ops = tokenizeNc("G83.1 Z-5 R2\nG84.2 Z-3");
  assert.ok(ops[0].g.includes(83), "G83.1 must register as family 83");
  assert.ok(ops[1].g.includes(84), "G84.2 must register as family 84");
});

test("tokenizeNc: CRLF line endings + >512-char line truncation", () => {
  const ops = tokenizeNc("G1 X1.\r\nG0 Z2.");
  assert.equal(ops.length, 2);
  const long = "G1 " + "X1. ".repeat(400); // >512 chars
  const o = tokenizeNc(long);
  assert.equal(o.length, 1); // no crash, truncated
});

test("tokenizeNc: bare letter with no digits is dropped; M-only line has hasGWord=false", () => {
  const ops = tokenizeNc("X Y\nM30");
  assert.equal(ops[0].hasGWord, false);
  assert.equal(Number.isFinite(ops[0].words.X), false);
  assert.equal(ops[1].hasGWord, false);
  assert.deepEqual(ops[1].m, [30]);
});

test("tokenizeNc: null/empty → []", () => {
  assert.deepEqual(tokenizeNc(null), []);
  assert.deepEqual(tokenizeNc(""), []);
});

test("tokenizeNc: unterminated paren comment does not swallow a following real cycle", () => {
  // /\([^)]*\)/g needs a closing ) — an unterminated "(comment" is left as
  // stray letters; they must not form G/M words nor drop the next op.
  const ops = tokenizeNc("(unterminated comment\nG83 Z-1 R2 F1");
  const { kinds } = evidenceFromNcOps(ops);
  assert.ok(kinds.includes("central_oil_hole"), "drill op after an unterminated paren still parses");
});

// ---------- evidenceFromNcOps ----------
test("evidenceFromNcOps: each drilling cycle → central_oil_hole", () => {
  for (const g of ["G81", "G82", "G83", "G84", "G74", "G85", "G86", "G89", "G73"]) {
    const { kinds } = evidenceFromNcOps(tokenizeNc(`G21\n${g} Z-5. R2. F100`));
    assert.ok(kinds.includes("central_oil_hole"), `${g} → central_oil_hole`);
  }
});

test("evidenceFromNcOps: 3+ holes via modal canned-cycle repeat → cross_drilled_relief_holes", () => {
  const nc = "G21 G90\nG81 X10 Y10 Z-5 R2 F100\nX20 Y20\nX30 Y30\nG80\nM30";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(kinds.includes("central_oil_hole"));
  assert.ok(kinds.includes("cross_drilled_relief_holes"));
});

test("evidenceFromNcOps: 3+ holes via repeated-G form also → cross_drilled_relief_holes", () => {
  const nc = "G21\nG81 X10 Y10 Z-5 R2 F100\nG81 X20 Y20\nG81 X30 Y30\nG80";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(kinds.includes("cross_drilled_relief_holes"));
});

test("evidenceFromNcOps: 2 holes does NOT trip cross_drilled (threshold = 3)", () => {
  const nc = "G21\nG83 X10 Y10 Z-5 R2 F100\nX20 Y20\nG80";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(kinds.includes("central_oil_hole"));
  assert.ok(!kinds.includes("cross_drilled_relief_holes"));
});

test("evidenceFromNcOps: G80 ends the modal-repeat run (bare XY after G80 is not a hole)", () => {
  const nc = "G21\nG81 X10 Y10 Z-5 R2 F100\nX20 Y20\nG80\nX99 Y99\nX98 Y98\nX97 Y97";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  // 2 holes only (G81 + 1 modal repeat); the post-G80 XY lines are not holes
  assert.ok(!kinds.includes("cross_drilled_relief_holes"));
});

test("evidenceFromNcOps: explicit G0 motion ends the modal-repeat run", () => {
  const nc = "G21\nG83 X10 Y10 Z-5 R2 F100\nG0 Z50.\nX20 Y20\nX30 Y30";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(!kinds.includes("cross_drilled_relief_holes"), "G0 ends the run → only 1 hole");
});

test("evidenceFromNcOps: stepped_revolved_axis requires G96-confirmed lathe + cutting", () => {
  // G96 + G1 feed cut → yes
  let r = evidenceFromNcOps(tokenizeNc("G96 S180 M3\nG1 X1. Z-2. F.01"));
  assert.ok(r.kinds.includes("stepped_revolved_axis"));
  // G96 + Fanuc turning cycle → yes
  r = evidenceFromNcOps(tokenizeNc("G96 S180\nG71 P10 Q20 U.02 F.012\nN10 G0 X1.\nN20 X2."));
  assert.ok(r.kinds.includes("stepped_revolved_axis"));
  // G96 present but only positioning (no feed, no cycle) → no
  r = evidenceFromNcOps(tokenizeNc("G96 S180\nG0 X1. Z2."));
  assert.ok(!r.kinds.includes("stepped_revolved_axis"));
});

test("evidenceFromNcOps: lathe turning cycle G71 WITHOUT G96 must NOT emit stepped_revolved_axis (design boundary)", () => {
  // G71 alone is not a lathe discriminator — only G96 confirms a lathe. This
  // is the exact over-trigger class round-1 scrutiny flagged (mill G70/G71 =
  // inch/metric units words on a milling control).
  const nc = "G21\nG71 P10 Q20 U.02 F.012\nG0 X1.\nG1 X2. F.01\nM30";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(!kinds.includes("stepped_revolved_axis"), "G71 without G96 is not a turned axis");
});

test("evidenceFromNcOps: realistic lathe emits all 3 defensible kinds together", () => {
  // G96 lathe + a peck-drilled bolt pattern (3+ holes) + a turning feed cut.
  const nc = [
    "G96 S180 M3",
    "G83 X10 Z-20 R2 Q3 F.01",
    "X20",
    "X30",
    "G80",
    "G1 X1.0 Z-5.0 F.012",
  ].join("\n");
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(kinds.includes("central_oil_hole"));
  assert.ok(kinds.includes("cross_drilled_relief_holes"));
  assert.ok(kinds.includes("stepped_revolved_axis"));
});

test("evidenceFromNcOps: mill G73 peck (NO G96) → holes, NEVER stepped_revolved_axis", () => {
  const nc = "G21 G90\nT1 M6\nG0 X10 Y10\nG73 Z-20. R2. Q3. F100\nX30 Y10\nX50 Y10\nG80\nM30";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.ok(kinds.includes("central_oil_hole"));
  assert.ok(kinds.includes("cross_drilled_relief_holes"));
  assert.ok(!kinds.includes("stepped_revolved_axis"), "mill peck must not be a turned axis");
});

test("evidenceFromNcOps: pure mill contour, no cycle, no G96 → no features", () => {
  const nc = "%\nG20 G90\nT2 M6\nG0 X0 Y0\nG1 Z-1. F10\nG1 X5. Y5. F20\nG2 X8. Y8. R3.\nM30";
  const { kinds } = evidenceFromNcOps(tokenizeNc(nc));
  assert.deepEqual(kinds, []);
});

test("evidenceFromNcOps: counts M98 subprogram calls", () => {
  const r = evidenceFromNcOps(tokenizeNc("G96 S1\nM98 P1000\nM98 P1001\nG1 X1. Z-2. F.01"));
  assert.equal(r.subprogramCalls, 2);
});

test("evidenceFromNcOps: null/empty input → consistent {kinds:[], subprogramCalls:0}", () => {
  assert.deepEqual(evidenceFromNcOps(null), { kinds: [], subprogramCalls: 0 });
  assert.deepEqual(evidenceFromNcOps([]), { kinds: [], subprogramCalls: 0 });
});

// ---------- inferPartClassFromNcPath ----------
test("inferPartClassFromNcPath: every heuristic token maps; tokens identical to cad sibling", () => {
  for (const h of CNC_FILENAME_HEURISTICS) {
    assert.equal(inferPartClassFromNcPath(`/x/${h.needle}_001.nc`), h.part_class);
  }
});

test("inferPartClassFromNcPath: fallback default + null", () => {
  assert.equal(inferPartClassFromNcPath("/x/unknown.nc"), "general");
  assert.equal(inferPartClassFromNcPath("/x/unknown.nc", { default: "misc" }), "misc");
  assert.equal(inferPartClassFromNcPath(null), "general");
});

// ---------- buildGtRecordFromNc ----------
test("buildGtRecordFromNc: real 9007405 lathe → stepped_revolved_axis, presence_only, inch", () => {
  const r = buildGtRecordFromNc({ file_path: "JM DIE/CNC LATHE/9007405.MIN", content: REAL_LATHE });
  assert.ok(r);
  assert.equal(r.cnc_source, "JM DIE/CNC LATHE/9007405.MIN");
  assert.deepEqual(r.dimensions, [{ kind: "stepped_revolved_axis", presence_only: true }]);
  assert.equal(r.derivation.units, "inch");
  assert.equal(r.derivation.source, "cnc-ground-truth-lib");
  assert.equal(r.derivation.subprogram_calls, 0);
});

test("buildGtRecordFromNc: EVERY dimension is presence_only:true with no nominal key", () => {
  const nc = "G21\nG83 X1 Y1 Z-5 R2 F100\nX2 Y2\nX3 Y3\nG80";
  const r = buildGtRecordFromNc({ file_path: "die_x.nc", content: nc });
  assert.ok(r.dimensions.length >= 1);
  for (const d of r.dimensions) {
    assert.equal(d.presence_only, true);
    assert.ok(!("nominal" in d) && !("nominal_mm" in d), "no nominal field on presence GT");
  }
  assert.equal(r.part_class, "die");
});

test("buildGtRecordFromNc: null on bad input / empty content / no features", () => {
  assert.equal(buildGtRecordFromNc(null), null);
  assert.equal(buildGtRecordFromNc({ file_path: "x.nc", content: "" }), null);
  assert.equal(buildGtRecordFromNc({ file_path: "x.nc", content: "\x00\x01 garbage" }), null);
  assert.equal(buildGtRecordFromNc({ content: "G81 Z-1" }), null); // missing file_path
});

// ---------- groupRecordsByPartClass ----------
test("groupRecordsByPartClass: groups, schemaVersion 1, source cnc-derived", () => {
  const recs = [
    { part_class: "die", pdf_path: "a", cnc_source: "a", dimensions: [], derivation: {} },
    { part_class: "die", pdf_path: "b", cnc_source: "b", dimensions: [], derivation: {} },
    { part_class: "shaft", pdf_path: "c", cnc_source: "c", dimensions: [], derivation: {} },
  ];
  const g = groupRecordsByPartClass(recs);
  const die = g.find((x) => x.part_class === "die");
  assert.equal(die.prints.length, 2);
  assert.equal(die.schemaVersion, 1);
  assert.equal(die.source, "cnc-derived");
  assert.equal(g.find((x) => x.part_class === "shaft").prints.length, 1);
});

test("groupRecordsByPartClass: non-array / malformed entries safe", () => {
  assert.deepEqual(groupRecordsByPartClass(null), []);
  assert.deepEqual(groupRecordsByPartClass([null, { foo: 1 }]), []);
});

// ---------- summarizeBatch ----------
test("summarizeBatch: tallies parsed / gt_produced / no_features / byUnits / byPartClass", () => {
  const batch = [
    { file_path: "die_a.nc", content: "G21\nG83 X1 Z-5 R2 F1\nX2\nX3\nG80" },
    { file_path: "plate_b.nc", content: "G20\nG0 X0 Y0\nM30" }, // no features
    { file_path: "shaft_c.nc", content: "G96 S1\nG1 X1. Z-2. F.01" },
  ];
  const s = summarizeBatch(batch);
  assert.equal(s.total, 3);
  assert.equal(s.parsed, 3);
  assert.equal(s.gt_produced, 2);
  assert.equal(s.no_features, 1);
  assert.equal(s.byUnits.metric, 1);
  assert.equal(s.byUnits.inch, 1);
  assert.equal(s.byUnits.unknown, 1);
  assert.equal(s.byPartClass.die, 1);
  assert.equal(s.byPartClass.shaft, 1);
});

test("summarizeBatch: non-array safe", () => {
  const s = summarizeBatch(null);
  assert.equal(s.total, 0);
  assert.equal(s.parsed, 0);
});

// ---------- INTEGRATION: CNC GT grades through the real U-TDP04 benchmark ----------
test("integration: a CNC presence GT record scores tp>0 via ocr-benchmark presence path", () => {
  const gt = buildGtRecordFromNc({ file_path: "JM DIE/CNC LATHE/9007405.MIN", content: REAL_LATHE });
  // An extractor that found the same feature kind:
  const extracted = { dimensions: [{ kind: "stepped_revolved_axis" }] };
  const cmp = compareExtractionToGroundTruth(extracted, gt);
  assert.ok(cmp.tp >= 1, "presence-only GT must yield a true positive on a kind match");
  assert.equal(cmp.fn, 0, "matched kind must not be a false negative");
});

test("integration: CNC GT with a MISSED kind scores as a false negative (R12, no silent pass)", () => {
  const gt = buildGtRecordFromNc({
    file_path: "die_holes.nc",
    content: "G21\nG83 X1 Z-5 R2 F1\nX2\nX3\nG80",
  });
  const cmp = compareExtractionToGroundTruth({ dimensions: [] }, gt);
  assert.equal(cmp.tp, 0);
  assert.ok(cmp.fn >= 1, "an empty extraction against real GT must surface false negatives");
});

// ---------- analyzeNcResult (single-pass streaming primitive) ----------
test("analyzeNcResult: feature-bearing lathe → record + parsed + units + hasFeatures", () => {
  // Neutral path (no heuristic token) → part class falls back to 'general'.
  const a = analyzeNcResult({ file_path: "corpus/lathe/9007405.MIN", content: REAL_LATHE });
  assert.equal(a.parsed, true);
  assert.equal(a.hasFeatures, true);
  assert.equal(a.units, "inch");
  assert.equal(a.partClass, "general");
  assert.ok(a.record && a.record.dimensions.some((d) => d.kind === "stepped_revolved_axis"));
  assert.equal(a.record.part_class, a.partClass, "record.part_class mirrors analysis.partClass");
});

test("analyzeNcResult: 'die' substring anywhere in the path drives the heuristic (incl. the 'JM DIE' corpus root)", () => {
  // inferPartClassFromNcPath substring-matches the FULL lowercased path, so a
  // file under the literal 'JM DIE' root infers part_class 'die'. Pinned here
  // so the corpus-root bias is a known, intentional property — not a surprise.
  const a = analyzeNcResult({ file_path: "JM DIE/CNC LATHE/9007405.MIN", content: REAL_LATHE });
  assert.equal(a.partClass, "die");
});

test("analyzeNcResult: parsed-but-featureless → record null, parsed true, hasFeatures false", () => {
  const a = analyzeNcResult({ file_path: "plate_b.nc", content: "G20\nG0 X0 Y0\nM30" });
  assert.equal(a.record, null);
  assert.equal(a.parsed, true);
  assert.equal(a.hasFeatures, false);
  assert.equal(a.units, "inch");
});

test("analyzeNcResult: bad input (no path / empty content / non-object) → parsed false, unknown units", () => {
  for (const bad of [null, undefined, 42, {}, { file_path: 5 }, { file_path: "x.nc" }, { file_path: "x.nc", content: "" }]) {
    const a = analyzeNcResult(bad);
    assert.equal(a.record, null);
    assert.equal(a.parsed, false);
    assert.equal(a.hasFeatures, false);
    assert.equal(a.units, "unknown");
  }
});

test("analyzeNcResult: .record is byte-identical to buildGtRecordFromNc (back-compat parity)", () => {
  const inp = { file_path: "die_x.nc", content: "G21\nG83 X1 Z-5 R2 F1\nX2\nX3\nG80" };
  assert.deepEqual(analyzeNcResult(inp).record, buildGtRecordFromNc(inp));
  // opts.part_class override flows through both paths identically
  assert.deepEqual(
    analyzeNcResult(inp, { part_class: "die" }).record,
    buildGtRecordFromNc(inp, { part_class: "die" }),
  );
});

// ---------- createBatchSummary (streaming accumulator) ----------
test("createBatchSummary: streaming tally equals the legacy summarizeBatch result (regression guard)", () => {
  // The whole point of the streaming refactor: the CLI no longer retains file
  // content. This pins that the incremental accumulator and the array-based
  // summarizeBatch agree EXACTLY — a future revert to a divergent path fails.
  const batch = [
    { file_path: "die_a.nc", content: "G21\nG83 X1 Z-5 R2 F1\nX2\nX3\nG80" },
    { file_path: "plate_b.nc", content: "G20\nG0 X0 Y0\nM30" },
    { file_path: "shaft_c.nc", content: "G96 S1\nG1 X1. Z-2. F.01" },
    { file_path: "bad_d.nc", content: "" }, // unparseable
    null, // malformed entry
  ];
  const acc = createBatchSummary();
  for (const r of batch) acc.add(analyzeNcResult(r));
  assert.deepEqual(acc.result(), summarizeBatch(batch));
});

test("createBatchSummary: empty accumulator + malformed/undefined .add args are safe", () => {
  const acc = createBatchSummary();
  assert.deepEqual(acc.result(), {
    total: 0, parsed: 0, no_features: 0, gt_produced: 0,
    byUnits: { inch: 0, metric: 0, unknown: 0 }, byPartClass: {},
  });
  acc.add(undefined);
  acc.add(null);
  acc.add({ parsed: false });
  const r = acc.result();
  assert.equal(r.total, 3); // every .add() counts toward total
  assert.equal(r.parsed, 0);
});

test("createBatchSummary: featureless parsed file increments no_features + byUnits, not byPartClass", () => {
  const acc = createBatchSummary();
  acc.add(analyzeNcResult({ file_path: "p.nc", content: "G20\nG0 X0 Y0\nM30" }));
  const r = acc.result();
  assert.equal(r.parsed, 1);
  assert.equal(r.no_features, 1);
  assert.equal(r.gt_produced, 0);
  assert.equal(r.byUnits.inch, 1);
  assert.deepEqual(r.byPartClass, {});
});
