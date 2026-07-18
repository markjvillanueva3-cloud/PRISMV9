/**
 * Tests for sfc-accuracy-audit-lib.mjs.
 * Reference rows are the REAL corpus samples (mill #6416334, lathe #4495957)
 * read off disk during the build, plus hand-built defect rows that pin each
 * invariant. Run: `node scripts/lib/sfc-accuracy-audit-lib.test.mjs`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditRow,
  measureRow,
  SEVERITY,
  createReport,
  recordRow,
  finalizeReport,
  streamAllRows,
  sampleOf,
} from "./sfc-accuracy-audit-lib.mjs";

const checks = (vs) => vs.map((v) => v.check).sort();
const has = (vs, check) => vs.some((v) => v.check === check);

// --- Real corpus rows (verified clean) -----------------------------------
const REAL_MILL = {
  fp: "3ca722eea653ab19", idx: 6416334,
  in: { m: "vmc-3axis-std", mat: "1045", iso: "P", op: "milling", cut: "roughing", td: 16, fl: 3, tmat: "carbide" },
  out: { vc: 90.8, rpm: 1806, fz: 0.0862, vf: 467, ap: 16, ae: 8, mrr: 59.8, pkw: 6.94, trq: 36.7, fN: 4583, life: 232, Ra: 0.58, defl: 25.9, conf: 0.613, sz: "stable", pch: 0, lim: ["deflection_mm:critical"], safe: false, eng: 2 },
  err: null,
};
const REAL_LATHE = {
  fp: "1e9c7b24c1a09f1d", idx: 4495957,
  in: { m: "lathe-2axis-economy", mat: "316", iso: "M", op: "boring", cut: "semi_finishing", td: 10, fl: 1, tmat: "carbide" },
  out: { vc: 9.4, rpm: 300, fz: 0.039, vf: 12, ap: 10, ae: 1.5, mrr: 0.2, pkw: 0.26, trq: 8.4, fN: 1685, life: 9999, Ra: 0.47, defl: 411.8, conf: 0.505, sz: "stable", pch: 0, lim: ["deflection_mm:critical", "workholding_force:critical"], safe: false, eng: 2 },
  err: null,
};

test("happy: real mill row produces zero violations", () => {
  assert.deepEqual(auditRow(REAL_MILL, { domain: "mill" }), []);
});

test("happy: real lathe row -- only the life saturation sentinel (INFO), no defects", () => {
  const vs = auditRow(REAL_LATHE, { domain: "lathe" });
  assert.equal(vs.length, 1);
  assert.equal(vs[0].check, "life_sentinel");
  assert.equal(vs[0].severity, SEVERITY.INFO);
});

test("feed identity holds for the real rows to within rounding tolerance", () => {
  // mill: 1806*0.0862*3 = 467.0 == vf ; lathe: 300*0.039*1 = 11.7 ~= 12
  assert.ok(!has(auditRow(REAL_MILL, { domain: "mill" }), "feed_inconsistent"));
  assert.ok(!has(auditRow(REAL_LATHE, { domain: "lathe" }), "feed_inconsistent"));
});

// --- Failure mode 1: silent non-finite calc (null field, err==null) -------
test("null_numeric: a required field nulled by the writer (NaN/Inf calc) is CRITICAL", () => {
  const row = { ...REAL_MILL, out: { ...REAL_MILL.out, fN: null } };
  const vs = auditRow(row, { domain: "mill" });
  assert.ok(has(vs, "null_numeric"));
  assert.equal(vs.find((v) => v.check === "null_numeric").severity, SEVERITY.CRITICAL);
});

// --- Failure mode 2: negative physical quantity ---------------------------
test("neg_physical: a negative force is impossible -> CRITICAL", () => {
  const vs = auditRow({ ...REAL_MILL, out: { ...REAL_MILL.out, fN: -4583 } }, { domain: "mill" });
  assert.ok(has(vs, "neg_physical"));
});

// --- Failure mode 3: feed-rate formula bug (the core SFC identity) ---------
test("feed_inconsistent: vf that is not rpm*fz*flutes -> CRITICAL", () => {
  // 1000 * 0.1 * 4 = 400, but row claims 800 (a 2x / dropped-half-flutes bug).
  const row = { in: { fl: 4 }, out: { rpm: 1000, fz: 0.1, vf: 800, vc: 50, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, ap: 1, ae: 1, trq: 1, defl: 1, conf: 0.5, safe: true, lim: [] }, err: null };
  const vs = auditRow(row, { domain: "mill" });
  assert.ok(has(vs, "feed_inconsistent"), `expected feed_inconsistent, got ${checks(vs)}`);
});

test("feed identity tolerates rounding at high rpm*flutes (pins the rounding term)", () => {
  // 20000 rpm, fz STORED as 0.0001 (4dp) -> true fz in [0.00005,0.00015] -> true
  // vf in [8,24]. So vf=21 vs exact-product 16.0 (dev 5.0) is a legit rounding
  // artifact, NOT a bug. tol with the rounding term ~9.96 absorbs it; WITHOUT
  // the rpm*fl rounding term tol would be only ~1.96 and 5.0 would false-flag.
  // This row therefore FAILS if FEED_TOL_ROUNDING_PER_RPMFL is set to 0.
  const row = { in: { fl: 8 }, out: { rpm: 20000, fz: 0.0001, vf: 21, vc: 100, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, defl: 1, ap: 1, ae: 1, trq: 1, conf: 0.5, safe: true, lim: [] }, err: null };
  assert.ok(!has(auditRow(row, { domain: "mill" }), "feed_inconsistent"));
});

// --- Failure mode 4: safety self-contradiction ----------------------------
test("safe_with_critical_limit: safe=true while a :critical limit is present -> CRITICAL", () => {
  const row = { ...REAL_MILL, out: { ...REAL_MILL.out, safe: true, lim: ["deflection_mm:critical"] } };
  const vs = auditRow(row, { domain: "mill" });
  assert.ok(has(vs, "safe_with_critical_limit"));
});

test("vc_rpm_inconsistent_mill (mill only): vc that is not pi*D*n/1000 -> WARN", () => {
  // td 16, rpm 1806 -> 90.78 expected; claim 200 (way off).
  const row = { in: { td: 16, fl: 3 }, out: { vc: 200, rpm: 1806, fz: 0.0862, vf: 467, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, ap: 1, ae: 1, trq: 1, defl: 1, conf: 0.5, safe: true, lim: [] }, err: null };
  assert.ok(has(auditRow(row, { domain: "mill" }), "vc_rpm_inconsistent_mill"));
  // Same row under lathe domain must NOT flag vc_rpm (workpiece-diameter basis).
  assert.ok(!has(auditRow(row, { domain: "lathe" }), "vc_rpm_inconsistent_mill"));
});

// --- Adversarial 1: degenerate empty output -------------------------------
test("adversarial: err==null with an empty out -> one null_numeric per required field", () => {
  const vs = auditRow({ in: {}, out: {}, err: null }, { domain: "mill" });
  const nulls = vs.filter((v) => v.check === "null_numeric");
  assert.equal(nulls.length, 12); // vc, fz, ap, ae, mrr, pkw, trq, fN, life, Ra, defl, conf
});

// --- Adversarial 2: malformed / missing structures ------------------------
test("adversarial: null row -> malformed_row CRITICAL", () => {
  const vs = auditRow(null);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].check, "malformed_row");
});

test("adversarial: err==null but out absent -> missing_out CRITICAL", () => {
  const vs = auditRow({ in: {}, out: undefined, err: null });
  assert.ok(has(vs, "missing_out"));
});

test("err rows: tracked as INFO by normalized class; no numeric checks run", () => {
  const vs = auditRow({ in: {}, out: null, err: "Cannot read property 'x' of undefined at line 42" });
  assert.equal(vs.length, 1);
  assert.equal(vs[0].check, "err");
  assert.equal(vs[0].severity, SEVERITY.INFO);
  assert.ok(/line N/.test(vs[0].detail)); // digits normalized to N
});

test("zero_speed_safe is CRITICAL; zero_speed_unsafe is WARN", () => {
  const safeZero = auditRow({ in: { fl: 2 }, out: { rpm: 0, vc: 0, fz: 0.05, vf: 0, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, ap: 1, ae: 1, trq: 1, defl: 1, conf: 0.5, safe: true, lim: [] }, err: null }, { domain: "mill" });
  assert.ok(has(safeZero, "zero_speed_safe"));
  const unsafeZero = auditRow({ in: { fl: 2 }, out: { rpm: 0, vc: 0, fz: 0.05, vf: 0, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, ap: 1, ae: 1, trq: 1, defl: 1, conf: 0.5, safe: false, lim: ["spindle:critical"] }, err: null }, { domain: "mill" });
  assert.ok(has(unsafeZero, "zero_speed_unsafe"));
  assert.ok(!has(unsafeZero, "zero_speed_safe"));
});

test("conf_range + unsafe_no_limit are WARN", () => {
  const vs = auditRow({ in: { fl: 3 }, out: { vc: 90, rpm: 1806, fz: 0.0862, vf: 467, mrr: 1, pkw: 1, fN: 1, life: 1, Ra: 1, ap: 1, ae: 1, trq: 1, defl: 1, conf: 1.5, safe: false, lim: [] }, err: null }, { domain: "mill" });
  assert.ok(has(vs, "conf_range"));
  assert.ok(has(vs, "unsafe_no_limit"));
});

// --- Aggregation + grading ------------------------------------------------
test("recordRow + finalizeReport: clean corpus grades PASS", () => {
  const r = createReport();
  recordRow(r, "mill", REAL_MILL);
  recordRow(r, "lathe", REAL_LATHE);
  finalizeReport(r);
  assert.equal(r.totals.rows, 2);
  assert.equal(r.totals.critical, 0);
  assert.equal(r.grade, "PASS");
  assert.equal(r.byDomain.lathe.info, 1); // life sentinel
});

test("finalizeReport grades FAIL when any critical check trips", () => {
  const r = createReport();
  recordRow(r, "mill", { ...REAL_MILL, out: { ...REAL_MILL.out, fN: -1 } });
  finalizeReport(r);
  assert.equal(r.grade, "FAIL");
  assert.ok(r.criticalCheckCount >= 1);
});

test("sample retention is bounded by sampleLimit", () => {
  const r = createReport({ sampleLimit: 2 });
  for (let i = 0; i < 5; i++) recordRow(r, "mill", { ...REAL_MILL, idx: i, out: { ...REAL_MILL.out, fN: -1 } });
  assert.equal(r.byCheck.neg_physical.count, 5);
  assert.equal(r.byCheck.neg_physical.samples.length, 2);
});

// --- Streaming reader -----------------------------------------------------
test("streamAllRows yields all valid rows (incl err/null), skips torn lines, honors maxRows", async () => {
  const root = await mkdtemp(join(tmpdir(), "sfc-audit-"));
  const millDir = join(root, "mill");
  await mkdir(millDir, { recursive: true });
  // chunk A: 2 clean rows + 1 torn line
  await writeFile(join(millDir, "chunk-w0-000000000000.jsonl"),
    JSON.stringify(REAL_MILL) + "\n" + JSON.stringify({ ...REAL_MILL, idx: 2 }) + "\n" + '{"fp":"x","idx":3,trunc' + "\n");
  // chunk B: 1 err row (must still be yielded -- the audit needs it)
  await writeFile(join(millDir, "chunk-w0-000000000100.jsonl"),
    JSON.stringify({ fp: "e", idx: 4, in: {}, out: null, err: "boom" }) + "\n");
  let parseErrors = 0;
  const rows = [];
  for await (const { cell, domain } of streamAllRows([{ dir: millDir, domain: "mill" }], { onParseError: () => parseErrors++ })) {
    rows.push({ idx: cell.idx, domain, err: cell.err });
  }
  assert.equal(rows.length, 3); // 2 clean + 1 err; torn line skipped
  assert.equal(parseErrors, 1);
  assert.ok(rows.some((x) => x.err === "boom"));

  // maxRows cap
  const capped = [];
  for await (const x of streamAllRows([{ dir: millDir, domain: "mill" }], { maxRows: 1 })) capped.push(x);
  assert.equal(capped.length, 1);

  await rm(root, { recursive: true, force: true });
});

test("streamAllRows: missing domain dir is non-fatal (empty coverage, no throw)", async () => {
  const rows = [];
  for await (const x of streamAllRows([{ dir: join(tmpdir(), "does-not-exist-sfc-audit"), domain: "mill" }])) rows.push(x);
  assert.equal(rows.length, 0);
});

test("measureRow: real rows have near-zero feed deviation; vc only on mill", () => {
  const m = measureRow(REAL_MILL, { domain: "mill" });
  assert.ok(m.feedRelErr != null && m.feedRelErr < 0.001, `mill feed dev ${m.feedRelErr}`); // 1806*0.0862*3 == 467 exactly, vf=467>=15
  assert.ok(m.vcRelErr != null && m.vcRelErr < 0.01, `mill vc dev ${m.vcRelErr}`);
  const l = measureRow(REAL_LATHE, { domain: "lathe" });
  assert.equal(l.vcRelErr, null); // vc identity not measured for lathe (workpiece dia)
  assert.equal(l.feedRelErr, null); // vf=12 is below the meaningful-margin floor (15 mm/min)
});

test("measureRow: feed margin floor suppresses the inflated ratio at tiny feeds", () => {
  // rpm 300, fz 0.039, fl 1 -> expected 11.7; vf=14 (dev ~16% of 14) BUT below the
  // 15 mm/min floor, so it is not reported as a margin (sub-mm absolute, rounding/clamp).
  const tiny = measureRow({ in: { fl: 1 }, out: { rpm: 300, fz: 0.039, vf: 14 } }, { domain: "lathe" });
  assert.equal(tiny.feedRelErr, null);
  // The SAME shape scaled to a real feed (rpm 4000) clears the floor and reports the deviation.
  const big = measureRow({ in: { fl: 1 }, out: { rpm: 4000, fz: 0.039, vf: 180 } }, { domain: "lathe" });
  assert.ok(big.feedRelErr != null && big.feedRelErr > 0.1); // 180 vs 156 -> ~13%
});

test("measureRow: a 2x feed bug yields a large feed relative error", () => {
  const m = measureRow({ in: { fl: 4 }, out: { rpm: 1000, fz: 0.1, vf: 800 } }, { domain: "mill" });
  assert.ok(m.feedRelErr > 0.4); // |800-400|/800 = 0.5
});

test("measureRow: err rows and missing inputs measure null", () => {
  assert.deepEqual(measureRow({ err: "boom", out: null }), { feedRelErr: null, vcRelErr: null });
  assert.deepEqual(measureRow(null), { feedRelErr: null, vcRelErr: null });
});

test("recordRow tracks the worst-case accuracy margin", () => {
  const r = createReport();
  recordRow(r, "mill", REAL_MILL); // ~0 feed dev
  recordRow(r, "mill", { in: { fl: 4 }, idx: 99, out: { rpm: 1000, fz: 0.1, vf: 800, vc: 50, ap: 1, ae: 1, mrr: 1, pkw: 1, trq: 1, fN: 1, life: 1, Ra: 1, defl: 1, conf: 0.5, safe: true, lim: [] } });
  assert.ok(r.stats.maxFeedRelErr.value > 0.4);
  assert.equal(r.stats.maxFeedRelErr.sample.idx, 99);
});

test("sampleOf produces a bounded slice with the violation attached", () => {
  const v = { check: "neg_physical", severity: SEVERITY.CRITICAL, detail: "fN=-1 < 0" };
  const s = sampleOf(REAL_MILL, "mill", v);
  assert.equal(s.check, "neg_physical");
  assert.equal(s.in.mat, "1045");
  assert.equal(s.out.fN, REAL_MILL.out.fN);
});
