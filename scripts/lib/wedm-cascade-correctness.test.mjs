/**
 * Tests for the WEDM cascade-correctness harness (Regimen #3 load-bearing eval).
 * node --test scripts/lib/wedm-cascade-correctness.test.mjs
 *
 * Reference cascade: JM Die FA-10S E12xx standard 4-pass —
 *   H1 0.0085 (rough) > H2 0.0064 > H3 0.0058 > H4 0.0053 in;
 *   feeds 0.12 < 0.24 > 0.21 > 0.20 ipm (non-monotone feed is CORRECT).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseScheduleText,
  checkMonotonicCascade,
  gradeAgainstExpected,
  checkCascade,
} from "./wedm-cascade-correctness.mjs";

const STD_4PASS_TEXT = [
  "Family E12xx_standard_4pass (4-pass):",
  "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0.0085 in",
  "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0.0064 in",
  "Pass 3 (skim): E1250, 0.21 ipm, H3 offset 0.0058 in",
  "Pass 4 (skim): E1260, 0.20 ipm, H4 offset 0.0053 in",
].join("\n");

const STD_EXPECTED = [
  { pass_number: 1, e_code: "E1230", offset_inches: 0.0085, feed_ipm: 0.12 },
  { pass_number: 2, e_code: "E1240", offset_inches: 0.0064, feed_ipm: 0.24 },
  { pass_number: 3, e_code: "E1250", offset_inches: 0.0058, feed_ipm: 0.21 },
  { pass_number: 4, e_code: "E1260", offset_inches: 0.0053, feed_ipm: 0.20 },
];

// A real FA-10S taper (UV) program: E28xx family, ALL H-offsets 0 (taper handled in UV).
const TAPER_TEXT = [
  "Toolpath type: taper_uv (family E28xx_taper_5pass).",
  "Pass 1 (rough): E2821, 4.06 ipm, H1 offset 0 in",
  "Pass 2 (skim): E2822, 5.84 ipm, H2 offset 0 in",
  "Pass 3 (skim): E2823, 6.6 ipm, H3 offset 0 in",
  "Pass 4 (skim): E2824, 7.62 ipm, H4 offset 0 in",
].join("\n");

// A degenerate 2-axis (E12xx) schedule with all-zero offsets and NO taper marker —
// must STILL fail (offsets don't strictly decrease); proves auto-detect is not a blanket pass.
const TWOAXIS_ALLZERO = [
  "Family E12xx_standard_4pass (4-pass):",
  "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0 in",
  "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0 in",
].join("\n");

test("checkCascade — auto-detects taper from the E28xx family when no taper flag is passed (grading-gap fix)", () => {
  const r = checkCascade(TAPER_TEXT); // no opts.taper — the model-generation case
  assert.equal(r.taper_resolved, true);
  assert.equal(r.valid, true, "violations: " + JSON.stringify(r.violations));
});

test("checkCascade — a 2-axis all-zero schedule with NO taper marker STILL fails (not a blanket pass)", () => {
  const r = checkCascade(TWOAXIS_ALLZERO); // E12xx, no taper marker
  assert.equal(r.taper_resolved, false);
  assert.equal(r.valid, false);
  assert.ok(r.violations.some((v) => v.rule === "monotonic_decrease_AP003"));
});

test("checkCascade — explicit taper:false WINS over auto-detect (back-compat)", () => {
  const r = checkCascade(TAPER_TEXT, { taper: false }); // caller forces 2-axis grading
  assert.equal(r.taper_resolved, false);
  assert.equal(r.valid, false); // all-zero E28 offsets now read as a monotonicity violation
});

test("checkCascade — explicit taper:true still applies the taper-zero rule", () => {
  const r = checkCascade(TAPER_TEXT, { taper: true });
  assert.equal(r.valid, true);
});

test("checkCascade — a taper schedule with a wrongly NON-zero offset fails taper_zero even when auto-detected", () => {
  const bad = TAPER_TEXT.replace("H2 offset 0 in", "H2 offset 0.003 in");
  const r = checkCascade(bad);
  assert.equal(r.taper_resolved, true);
  assert.equal(r.valid, false);
  assert.ok(r.violations.some((v) => v.rule === "taper_zero"));
});

test("parseScheduleText — extracts pass/type/E-code/feed/H/offset from shop format", () => {
  const p = parseScheduleText(STD_4PASS_TEXT);
  assert.equal(p.length, 4);
  assert.deepEqual(p[0], { pass_number: 1, type: "rough", e_code: "E1230", feed_ipm: 0.12, h_register: "H1", offset_inches: 0.0085 });
  assert.equal(p[3].offset_inches, 0.0053);
  assert.equal(p[1].type, "skim");
});

test("parseScheduleText — per-pass verbose format + operator-set feed => null", () => {
  const txt = [
    "Pass 1 (rough): E-code E1230, feed 0.12 ipm (3.05 mm/min), H1 wire offset 0.0085 in (0.2159 mm).",
    "Pass 4 (skim): E2825, operator-set feed, H4 wire offset 0.0052 in.",
  ].join("\n");
  const p = parseScheduleText(txt);
  assert.equal(p.length, 2);
  assert.equal(p[0].e_code, "E1230");
  assert.equal(p[0].offset_inches, 0.0085); // the mm value is NOT mistaken for inches
  assert.equal(p[1].feed_ipm, null); // operator-set => null, not invented
});

test("parseScheduleText — empty/null/non-schedule text => []", () => {
  assert.deepEqual(parseScheduleText(""), []);
  assert.deepEqual(parseScheduleText(null), []);
  assert.deepEqual(parseScheduleText("just some prose with no pass lines"), []);
});

test("checkMonotonicCascade — valid strictly-decreasing cascade is clean", () => {
  const viol = checkMonotonicCascade(parseScheduleText(STD_4PASS_TEXT));
  assert.deepEqual(viol, []);
});

test("checkMonotonicCascade — AP003: a non-decreasing offset is flagged", () => {
  // pass 3 offset RISES above pass 2 -> AP003 (wire re-cuts / leaves stock)
  const broken = [
    { pass_number: 1, offset_inches: 0.0085 },
    { pass_number: 2, offset_inches: 0.0064 },
    { pass_number: 3, offset_inches: 0.0070 }, // > prev 0.0064 — illegal
    { pass_number: 4, offset_inches: 0.0053 },
  ];
  const viol = checkMonotonicCascade(broken);
  assert.equal(viol.length, 1);
  assert.equal(viol[0].rule, "monotonic_decrease_AP003");
  assert.equal(viol[0].pass, 3);
});

test("checkMonotonicCascade — equal adjacent offsets also fail (must be STRICT)", () => {
  const flat = [{ pass_number: 1, offset_inches: 0.006 }, { pass_number: 2, offset_inches: 0.006 }];
  assert.equal(checkMonotonicCascade(flat).length, 1);
});

test("checkMonotonicCascade — taper: all-zero H passes, non-zero flagged", () => {
  const taperOk = [{ pass_number: 1, offset_inches: 0 }, { pass_number: 2, offset_inches: 0 }];
  assert.deepEqual(checkMonotonicCascade(taperOk, { taper: true }), []);
  const taperBad = [{ pass_number: 1, offset_inches: 0 }, { pass_number: 2, offset_inches: 0.0009 }];
  const viol = checkMonotonicCascade(taperBad, { taper: true });
  assert.equal(viol.length, 1);
  assert.equal(viol[0].rule, "taper_zero");
});

test("checkMonotonicCascade — empty passes => empty violation", () => {
  assert.equal(checkMonotonicCascade([]).length, 1);
  assert.equal(checkMonotonicCascade([])[0].rule, "empty");
});

test("gradeAgainstExpected — exact oracle match is clean", () => {
  assert.deepEqual(gradeAgainstExpected(parseScheduleText(STD_4PASS_TEXT), STD_EXPECTED), []);
});

test("gradeAgainstExpected — E-code / feed / offset mismatches each flagged", () => {
  const wrong = parseScheduleText(STD_4PASS_TEXT).map((p) => ({ ...p }));
  wrong[0].e_code = "E9999"; // wrong family code
  wrong[1].feed_ipm = 0.50;  // wrong feed (>0.001 tol)
  wrong[2].offset_inches = 0.0070; // wrong offset (>tol)
  const viol = gradeAgainstExpected(wrong, STD_EXPECTED);
  const rules = viol.map((x) => x.rule).sort();
  assert.deepEqual(rules, ["e_code", "feed", "offset"]);
});

test("gradeAgainstExpected — pass_count mismatch flagged; operator-set feed not penalized", () => {
  const short = parseScheduleText(STD_4PASS_TEXT).slice(0, 3);
  assert.ok(gradeAgainstExpected(short, STD_EXPECTED).some((x) => x.rule === "pass_count"));
  // expected feed null (operator-set) must not penalize a present emitted feed
  const exp = STD_EXPECTED.map((e, i) => (i === 3 ? { ...e, feed_ipm: null } : e));
  assert.deepEqual(gradeAgainstExpected(parseScheduleText(STD_4PASS_TEXT), exp), []);
});

test("checkCascade — composes parse + monotonic + oracle; valid schedule => valid:true", () => {
  const r = checkCascade(STD_4PASS_TEXT, { expected: STD_EXPECTED });
  assert.equal(r.valid, true);
  assert.equal(r.checked, 4);
  assert.deepEqual(r.violations, []);
});

test("checkCascade — a single AP003 in the battery => FAIL (load-bearing gate)", () => {
  const broken = STD_4PASS_TEXT.replace("H3 offset 0.0058 in", "H3 offset 0.0070 in");
  const r = checkCascade(broken, { expected: STD_EXPECTED });
  assert.equal(r.valid, false);
  assert.ok(r.violations.some((x) => x.rule === "monotonic_decrease_AP003"));
});
