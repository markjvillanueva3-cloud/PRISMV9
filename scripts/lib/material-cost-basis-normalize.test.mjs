/**
 * Tests for material-cost-basis-normalize (U-QP-COST-BASIS-NORMALIZE, charlie 2026-06-12).
 * Real reference values from the live JM AP ledger + the cross-form correctness
 * invariant (block $/in3 == round $/in3 for the same grade). Run: node --test <file>.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeGrade,
  extractGrade,
  stripGradeTokens,
  parseInchValue,
  isFreightRow,
  normalizeRow,
  median,
  iqr,
  aggregateByGrade,
} from "./material-cost-basis-normalize.mjs";

const CLI = fileURLToPath(new URL("../material-cost-basis-normalize.mjs", import.meta.url));

const close = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

// ---- parseInchValue ----
test("parseInchValue: decimal / whole / fraction / mixed", () => {
  assert.equal(parseInchValue("1.375"), 1.375);
  assert.equal(parseInchValue("2"), 2);
  assert.equal(parseInchValue("3/4"), 0.75);
  assert.equal(parseInchValue("1-1/4"), 1.25);
  assert.equal(parseInchValue("1-5/8"), 1.625);
  assert.equal(parseInchValue("1 1/4"), 1.25); // space-separated mixed
});
test("parseInchValue: adversarial -> NaN", () => {
  assert.ok(Number.isNaN(parseInchValue("abc")));
  assert.ok(Number.isNaN(parseInchValue("1/0"))); // div-by-zero
  assert.ok(Number.isNaN(parseInchValue("")));
  assert.ok(Number.isNaN(parseInchValue(null)));
  assert.ok(Number.isNaN(parseInchValue(1.5))); // non-string
});

// ---- normalizeGrade / extractGrade ----
test("normalizeGrade: dash/case normalization", () => {
  assert.equal(normalizeGrade("H-13"), "H13");
  assert.equal(normalizeGrade("h13"), "H13");
  assert.equal(normalizeGrade("D-2"), "D2");
  assert.equal(normalizeGrade("CPM-1V"), "CPM1V");
  assert.equal(normalizeGrade("ZZ9"), null);
  assert.equal(normalizeGrade(null), null);
});
test("extractGrade: from real descriptions", () => {
  assert.equal(extractGrade("H13 1.375 X 4 X 24 ACTION METALS STEEL"), "H13");
  assert.equal(extractGrade("1LNG 1-5/8 RD D-2 DCF ALRO STEEL STEEL"), "D2");
  assert.equal(extractGrade("3 PC 3/4 RD H-13 DCF ALRO STEEL"), "H13");
  assert.equal(extractGrade("GRAY IRON CLASS 40 2.500 X 24 ACTION"), "GRAYIRON");
  assert.equal(extractGrade("MISC SHOP SUPPLIES NO GRADE"), null);
  assert.equal(extractGrade(""), null);
});

// ---- isFreightRow ----
test("isFreightRow", () => {
  assert.equal(isFreightRow("FREIGHT ALRO STEEL MISC."), true);
  assert.equal(isFreightRow("H13 1.375 X 4 X 24"), false);
  assert.equal(isFreightRow(null), false);
});

// ---- normalizeRow: BLOCK (primary) ----
test("normalizeRow block: H13 1.375x4x24 -> $1.193/in3 (line_amount)", () => {
  const r = normalizeRow({
    description: "H13 1.375 X 4 X 24 ACTION METALS STEEL",
    qty: 1, unit_cost: 157.5, line_amount: 157.5, is_credit: false, category: "material",
  });
  assert.equal(r.resolved, true);
  assert.equal(r.grade, "H13");
  assert.equal(r.form, "block");
  assert.ok(close(r.in3, 132), `in3=${r.in3}`);
  assert.ok(close(r.usd_per_in3, 157.5 / 132), `perIn3=${r.usd_per_in3}`); // 1.1932
});
test("normalizeRow block: single finished block (qty=1) uses line_amount", () => {
  // O1 0.5x2x16 = 16 in3, qty 1, line_amount 51 -> $3.1875/in3
  const r = normalizeRow({
    description: "O1 0.500 X 2 X 16 ACTION METALS STEEL",
    qty: 1, unit_cost: 51, line_amount: 51, is_credit: false, category: "material",
  });
  assert.equal(r.resolved, true);
  assert.ok(close(r.in3, 16), `in3=${r.in3}`);
  assert.ok(close(r.usd_per_in3, 51 / 16), `perIn3=${r.usd_per_in3}`); // 3.1875
});
test("normalizeRow block: leading-dot decimal .500 -> 0.5 (NOT 500)", () => {
  // ".500 X 2.375 X 144" qty 1: a thin 12ft plate. vol = 0.5*2.375*144 = 171 in3.
  const r = normalizeRow({
    description: "H13 .500 X 2.375 X 144 ALRO STEEL", qty: 1, line_amount: 324.6, category: "material",
  });
  assert.equal(r.resolved, true);
  assert.ok(close(r.in3, 171), `in3=${r.in3}`); // was 171000 with the leading-dot bug
  assert.ok(close(r.usd_per_in3, 324.6 / 171), `perIn3=${r.usd_per_in3}`); // ~1.898
});
test("normalizeRow block: qty>1 is ambiguous (bar stock) -> unresolved", () => {
  // ALRO "0.625 x 4 x 144 qty 105" is bulk bar, NOT 105 finished blocks.
  const r = normalizeRow({
    description: "H13 0.625 x 4 x 144 ALRO STEEL", qty: 105, line_amount: 509.95, category: "material",
  });
  assert.equal(r.resolved, false);
  assert.equal(r.reason, "block-qty-gt-1-ambiguous");
});
test("normalizeRow block: falls back to unit_cost when line_amount absent (qty=1)", () => {
  const r = normalizeRow({
    description: "A2 1 X 2 X 4 STEEL", qty: 1, unit_cost: 10, line_amount: 0, category: "material",
  });
  assert.equal(r.resolved, true);
  // vol = 1*2*4 = 8; usd = 10 -> 1.25
  assert.ok(close(r.usd_per_in3, 10 / 8), `perIn3=${r.usd_per_in3}`);
});

// ---- normalizeRow: ROUND (corroboration) ----
test("normalizeRow round: 1-1/4 RD H13 $1.46/in -> $1.19/in3 (cross-form invariant)", () => {
  const r = normalizeRow({
    description: "1-1/4 RD H-13 DCF ALRO STEEL STEEL",
    qty: 202, unit_cost: 1.46, line_amount: 294.92, is_credit: false, category: "material",
  });
  assert.equal(r.resolved, true);
  assert.equal(r.grade, "H13");
  assert.equal(r.form, "round");
  const expected = 1.46 / (Math.PI * 0.625 ** 2); // 1.1897
  assert.ok(close(r.usd_per_in3, expected), `perIn3=${r.usd_per_in3}`);
  // THE INVARIANT: round H13 == block H13 within 5%.
  const blockH13 = 157.5 / 132;
  assert.ok(Math.abs(r.usd_per_in3 - blockH13) / blockH13 < 0.05, "block vs round agree");
});
test("normalizeRow round: PC marker -> unresolved (length unknown)", () => {
  const r = normalizeRow({
    description: "3 PC 3/4 RD H-13 DCF ALRO STEEL", qty: 3, unit_cost: 31.91, category: "material",
  });
  assert.equal(r.resolved, false);
  assert.equal(r.reason, "round-piece-count-length-unknown");
});

// ---- normalizeRow: exclusions / failure modes ----
test("normalizeRow: exclusions are conservative, never guessed", () => {
  assert.equal(normalizeRow({ category: "material", is_credit: true, description: "H13 1 X 1 X 1" }).reason, "credit");
  assert.equal(normalizeRow({ category: "overhead-utility", description: "H13 1 X 1 X 1" }).reason, "not-material");
  assert.equal(normalizeRow({ category: "material", description: "FREIGHT ALRO STEEL" }).reason, "freight-mislabel");
  assert.equal(normalizeRow({ category: "material", description: "MISC SUPPLIES" }).reason, "no-grade");
  assert.equal(normalizeRow({ category: "material", description: "H13 SHOP STOCK NO DIMS" }).reason, "no-form");
  assert.equal(normalizeRow(null).reason, "non-object-row");
});
test("normalizeRow: adversarial numerics never produce a bad number", () => {
  // NaN/Infinity qty -> count defaults to 1 (block), still finite result
  const r1 = normalizeRow({ category: "material", description: "D2 2 X 2 X 2 STEEL", qty: NaN, line_amount: 80 });
  assert.equal(r1.resolved, true);
  assert.ok(close(r1.usd_per_in3, 80 / 8));
  // zero/negative usd -> unresolved
  const r2 = normalizeRow({ category: "material", description: "D2 2 X 2 X 2 STEEL", qty: 1, line_amount: 0, unit_cost: -5 });
  assert.equal(r2.resolved, false);
  // Infinity dim cannot happen (parse caps to numeric) but bad token -> unparseable
  const r3 = normalizeRow({ category: "material", description: "D2 X X X STEEL", qty: 1, line_amount: 10 });
  assert.equal(r3.resolved, false);
});

// ---- median / iqr ----
test("median + iqr", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.ok(Number.isNaN(median([])));
  const q = iqr([1, 2, 3, 4, 5]);
  assert.ok(close(q.p25, 2) && close(q.p75, 4) && close(q.iqr, 2));
});

// ---- aggregateByGrade ----
test("aggregateByGrade: per-grade primary + cross-form agreement", () => {
  const rows = [
    { description: "H13 1.375 X 4 X 24 ACTION", qty: 1, line_amount: 157.5, category: "material" },
    { description: "H13 2 X 2 X 6 ACTION", qty: 1, line_amount: 28.6, category: "material" }, // 24in3 -> 1.19
    { description: "H13 1 X 1 X 1 ACTION", qty: 1, line_amount: 1.19, category: "material" },
    { description: "1-1/4 RD H-13 DCF", qty: 202, unit_cost: 1.46, category: "material" }, // round ~1.19
    { description: "FREIGHT ALRO", category: "material" },
    { description: "MISC", category: "material", is_credit: true },
  ];
  const out = aggregateByGrade(rows);
  assert.ok(out.grades.H13, "H13 present");
  assert.equal(out.grades.H13.block_n, 3);
  assert.equal(out.grades.H13.round_n, 1);
  assert.equal(out.grades.H13.confidence, "high"); // >=3 block rows
  // CONSUMABLE primary is block-only:
  assert.ok(close(out.grades.H13.usd_per_in3, 1.19, 0.05), `primary=${out.grades.H13.usd_per_in3}`);
  // round is advisory-only, present but not the primary:
  assert.ok(out.grades.H13.round_advisory_median > 0, "round advisory present");
  assert.ok(out.grades.H13.finished_vs_raw_gap_pct != null, "regime gap reported");
  // summary
  assert.equal(out.summary.resolved, 4);
  assert.equal(out.summary.total_rows, 6);
  assert.equal(out.summary.consumable_grade_count, 1); // H13 has block rows
  assert.ok(out.summary.unresolved_reasons["freight-mislabel"] === 1);
  assert.ok(out.summary.unresolved_reasons["credit"] === 1);
});
test("aggregateByGrade: round-ONLY grade is NOT consumable (usd_per_in3 null)", () => {
  const rows = [{ description: "5/8 RD D-2 DCF", qty: 49, unit_cost: 1.93, category: "material" }];
  const out = aggregateByGrade(rows);
  assert.equal(out.grades.D2.confidence, "none"); // no finished-block rows
  assert.equal(out.grades.D2.usd_per_in3, null);  // NOT consumable
  assert.equal(out.grades.D2.block_n, 0);
  assert.equal(out.grades.D2.round_n, 1);
  assert.ok(out.grades.D2.round_advisory_median > 0); // advisory still recorded
  assert.equal(out.summary.consumable_grade_count, 0);
});
test("aggregateByGrade: empty input is safe", () => {
  const out = aggregateByGrade([]);
  assert.equal(out.summary.resolved, 0);
  assert.equal(out.summary.grade_count, 0);
  assert.equal(out.summary.resolved_pct, 0);
});

// ---- P0 fail-on-revert: grade-digit bleed (scrutiny arm A) ----
test("stripGradeTokens: removes grade so its digits cannot fuse into dim[0]", () => {
  assert.equal(stripGradeTokens("H13 3/4 X 4 X 24").trim(), "3/4 X 4 X 24");
  assert.equal(stripGradeTokens("4140 3/4 X 4 X 24").trim(), "3/4 X 4 X 24");
  assert.equal(stripGradeTokens(null), "");
});
test("normalizeRow: grade digits do NOT bleed into first dimension (P0)", () => {
  // "H13 3/4 X 4 X 24" -> dim[0] must be 0.75, NOT 13.75 (the "13"+"3/4" fusion bug)
  const r = normalizeRow({ description: "H13 3/4 X 4 X 24 STEEL", qty: 1, line_amount: 100, category: "material" });
  assert.equal(r.resolved, true);
  assert.equal(r.dims[0], 0.75, `dim[0]=${r.dims[0]} (bleed bug would give 13.75)`);
  assert.ok(close(r.in3, 0.75 * 4 * 24), `in3=${r.in3}`); // 72
  // all-digit grade 4140 must not bleed either (4140.75 bug)
  const r2 = normalizeRow({ description: "4140 3/4 X 2 X 2 STEEL", qty: 1, line_amount: 10, category: "material" });
  assert.equal(r2.dims[0], 0.75, `dim[0]=${r2.dims[0]} (bleed bug would give 4140.75)`);
});

// ---- qty<=0 guard (scrutiny arm B P1-B) ----
test("normalizeRow: qty=0 / negative is a data error -> unresolved", () => {
  assert.equal(normalizeRow({ description: "H13 1 X 2 X 4", qty: 0, line_amount: 10, category: "material" }).reason, "block-qty-nonpositive");
  assert.equal(normalizeRow({ description: "H13 1 X 2 X 4", qty: -5, line_amount: 10, category: "material" }).reason, "block-qty-nonpositive");
  // qty===1 still resolves
  assert.equal(normalizeRow({ description: "H13 1 X 2 X 4", qty: 1, line_amount: 10, category: "material" }).resolved, true);
});

// ---- robustness (scrutiny arm B P1-A / P2-A / P2-B) ----
test("aggregateByGrade(null/undefined) returns safe empty, never throws", () => {
  for (const bad of [null, undefined, 42, "x", {}]) {
    const out = aggregateByGrade(bad);
    assert.equal(out.summary.total_rows, 0);
    assert.equal(out.summary.consumable_grade_count, 0);
    assert.deepEqual(out.grades, {});
  }
});
test("normalizeGrade(GRAYIRON) round-trips (extractGrade output is recognizable)", () => {
  assert.equal(normalizeGrade("GRAYIRON"), "GRAYIRON");
  assert.equal(extractGrade("GRAY IRON CLASS 40 2 X 2 X 2"), "GRAYIRON");
});
test("is_credit must be strictly true; string 'false' is NOT a credit", () => {
  const r = normalizeRow({ description: "H13 1 X 1 X 1", qty: 1, line_amount: 5, is_credit: "false", category: "material" });
  assert.equal(r.resolved, true, "string 'false' wrongly excluded a real row");
  assert.equal(normalizeRow({ description: "H13 1 X 1 X 1", qty: 1, line_amount: 5, is_credit: true, category: "material" }).reason, "credit");
});
test("aggregateByGrade: resolved_pct is one-decimal percent", () => {
  // 1 resolved of 3 rows -> 33.3%
  const out = aggregateByGrade([
    { description: "H13 1 X 1 X 1", qty: 1, line_amount: 1, category: "material" },
    { description: "FREIGHT", category: "material" },
    { description: "MISC NO GRADE", category: "material" },
  ]);
  assert.equal(out.summary.resolved, 1);
  assert.equal(out.summary.resolved_pct, 33.3);
});

// ---- CLI subprocess oracle (recurring PRISM lesson: pure-core needs a real E2E) ----
test("CLI: writes artifact from a fixture ledger (exit 0) + exits 2 on missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "cbtest-"));
  try {
    const ledger = join(dir, "ledger.jsonl");
    const out = join(dir, "out.json");
    writeFileSync(ledger, [
      JSON.stringify({ description: "H13 1.375 X 4 X 24 ACTION", qty: 1, line_amount: 157.5, category: "material" }),
      JSON.stringify({ description: "FREIGHT ALRO", category: "material" }),
      "not json",
    ].join("\n"));
    const stdout = execFileSync(process.execPath, [CLI, `--ledger=${ledger}`, `--out=${out}`, "--json"], { encoding: "utf8" });
    const artifact = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(artifact.schemaVersion, "1.0.0");
    assert.equal(artifact.summary.resolved, 1);
    assert.equal(artifact.parse_errors, 1); // the "not json" line
    assert.ok(close(artifact.grades.H13.usd_per_in3, 157.5 / 132), `H13=${artifact.grades.H13.usd_per_in3}`);
    assert.ok(stdout.includes("H13"));
    // missing ledger -> exit 2
    let exit = 0;
    try { execFileSync(process.execPath, [CLI, `--ledger=${join(dir, "nope.jsonl")}`, "--no-write"], { stdio: "pipe" }); }
    catch (e) { exit = e.status; }
    assert.equal(exit, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
