// scripts/build-ocr-gold-verify-package.test.mjs
// Real reference-value tests for the OCR GOLD-verification packager pure core.
// Run: node --test scripts/build-ocr-gold-verify-package.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readTrainset, csvCell, buildDimRecords, buildGdtRecords, renderCsv, renderReadme } from "./build-ocr-gold-verify-package.mjs";

const row = (image, page, labels) => JSON.stringify({ key: image, page, part: `${image}#p${page}`, image, n_models: 2, labels, source: "ensemble-distillation" });
const lbl = (type, mm, tier = "silver") => ({ type, value_mm: mm, corroboration: 2, n_models: 2, agreement_fraction: 1, agreement_confidence: 0.99, tier, expected_accuracy: 0.8, trainable: true });

test("readTrainset: parses jsonl, skips malformed lines, non-string safe", () => {
  const txt = row("a.pdf", 0, [lbl("linear", 25.4)]) + "\n{bad json\n\n" + row("b.pdf", 1, [lbl("diameter", 6.35)]);
  const rows = readTrainset(txt);
  assert.equal(rows.length, 2, "2 good rows; the malformed + blank lines skipped");
  assert.deepEqual(readTrainset(null), []);
  assert.deepEqual(readTrainset(undefined), []);
});

test("csvCell: escapes quotes, commas, newlines per RFC-4180", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('he said "hi"'), '"he said ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(0.248), "0.248");
});

test("buildDimRecords: one row per dim, INCH derived from mm, sorted by print/page/dim", () => {
  const rows = readTrainset(
    row("z/Z.pdf", 1, [lbl("linear", 25.4)]) + "\n" +
    row("a/A.pdf", 0, [lbl("diameter", 6.2992), lbl("linear", 31.75)])
  );
  const { header, records, distinctPrints, dimCount } = buildDimRecords(rows);
  assert.ok(header.includes("value_inch") && header.includes("CORRECT_Y_N"));
  assert.equal(dimCount, 3, "1 dim + 2 dims = 3 records");
  assert.equal(distinctPrints.length, 2);
  // sorted: A.pdf (a/) before Z.pdf (z/); within A.pdf dim_no 1 then 2
  assert.equal(records[0][0], "A.pdf");
  assert.equal(records[0][2], 1, "dim_no 1 first");
  // INCH conversion: 6.2992mm / 25.4 = 0.248"
  assert.equal(records[0][4], 0.248, "value_inch = value_mm/25.4, 4dp");
  assert.equal(records[0][5], 6.2992, "value_mm preserved");
  assert.equal(records[2][0], "Z.pdf", "Z sorts last");
  // operator columns blank by construction
  assert.equal(records[0][9], "", "CORRECT_Y_N empty");
  assert.equal(records[0][10], "", "correct-value empty");
});

test("buildDimRecords: non-numeric value_mm yields blank inch (no NaN); missing labels safe", () => {
  const rows = readTrainset(
    row("x.pdf", 0, [{ type: "linear", tier: "silver" }]) + "\n" + // no value_mm
    JSON.stringify({ image: "y.pdf", page: 0 }) // no labels array
  );
  const { records, dimCount } = buildDimRecords(rows);
  assert.equal(dimCount, 1, "only the labelled row produces a record");
  assert.equal(records[0][4], "", "blank inch, not NaN");
  assert.equal(records[0][5], "", "blank mm");
  assert.deepEqual(buildDimRecords(null).records, []);
});

test("renderCsv: header + records, CRLF line endings (Excel-friendly)", () => {
  const { header, records } = buildDimRecords(readTrainset(row("p.pdf", 0, [lbl("linear", 25.4)])));
  const csv = renderCsv(header, records);
  assert.match(csv, /^print,page,dim_no,/, "header first");
  assert.ok(csv.includes("\r\n"), "CRLF endings");
  assert.match(csv, /p\.pdf,0,1,linear,1,25\.4,silver/, "the dim row (1 inch = 25.4mm)");
});

test("renderReadme: states the task, inch-first guidance, and the GOLD-promotion outcome", () => {
  const md = renderReadme({ dimCount: 383, printCount: 27, generatedAt: "2026-06-16T00:00:00Z" });
  assert.match(md, /383 dimensions from 27 prints/);
  assert.match(md, /value_inch is what PRISM read/);
  assert.match(md, /CORRECT_Y_N/);
  assert.match(md, /become GOLD/);
});

// --- buildGdtRecords (U-XRAY-GDT-GOLD-VERIFY: operator-confirm gate for GD&T frames) ---

const gdtRow = (image, page, gdtLabels) => JSON.stringify({ key: image, page, image, n_models: 2, labels: [], gdt_labels: gdtLabels, source: "ensemble-distillation" });
const gdtLbl = (symbol, fcf, tier = "silver") => ({ symbol, fcf_text: fcf, tier, agreement_fraction: 1, corroboration: 2, n_models: 2, calibration_basis: "dimension-agreement", trainable: true });

test("buildGdtRecords: one row per GD&T frame, captures symbol + fcf_text, sorted by print/page/no", () => {
  const rows = readTrainset(
    gdtRow("z/Z.pdf", 1, [gdtLbl("flatness", "flatness 0.05")]) + "\n" +
    gdtRow("a/A.pdf", 0, [gdtLbl("position", "position 0.1mm MMC [A|B]"), gdtLbl("runout", "runout 0.02 [A]")])
  );
  const { header, records, distinctPrints, gdtCount } = buildGdtRecords(rows);
  assert.ok(header.includes("fcf_text") && header.includes("CORRECT_Y_N") && header.includes("CORRECT_fcf_if_wrong"));
  assert.equal(gdtCount, 3, "1 + 2 frames = 3 records");
  assert.equal(distinctPrints.length, 2);
  assert.equal(records[0][0], "A.pdf", "A sorts before Z");
  assert.equal(records[0][3], "position", "symbol");
  assert.equal(records[0][4], "position 0.1mm MMC [A|B]", "fcf_text ground truth");
  assert.equal(records[0][8], "dimension-agreement", "calibration_basis surfaced (R12 honesty)");
  assert.equal(records[0][9], "", "CORRECT_Y_N blank by construction");
  assert.equal(records[0][10], "", "CORRECT_fcf_if_wrong blank");
  assert.equal(records[2][0], "Z.pdf", "Z sorts last");
});

test("buildGdtRecords: rows without gdt_labels are skipped; non-array gdt_labels safe; null rows -> []", () => {
  const rows = readTrainset(
    gdtRow("x.pdf", 0, [gdtLbl("position", "position 0.1 [A]")]) + "\n" +
    row("y.pdf", 0, [lbl("linear", 25.4)]) + "\n" +                 // dim-only row, no gdt_labels
    JSON.stringify({ image: "w.pdf", page: 0, gdt_labels: "notarray" })
  );
  const { records, gdtCount } = buildGdtRecords(rows);
  assert.equal(gdtCount, 1, "only the row with gdt_labels yields a record");
  assert.equal(records[0][3], "position");
  assert.deepEqual(buildGdtRecords(null).records, []);
});

test("renderReadme: surfaces the GD&T frame count + the VERIFY-gdt.csv flow", () => {
  const md = renderReadme({ dimCount: 10, gdtCount: 4, printCount: 3, generatedAt: "2026-06-23T00:00:00Z" });
  assert.match(md, /VERIFY-gdt\.csv lists 4 GD&T frame/);
  assert.match(md, /CORRECT_fcf_if_wrong/);
});
