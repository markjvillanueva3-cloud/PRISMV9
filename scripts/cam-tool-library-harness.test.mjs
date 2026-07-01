#!/usr/bin/env node
/**
 * cam-tool-library-harness.test.mjs -- tests for the CAM tool-library emit+validate harness.
 * Run: node scripts/cam-tool-library-harness.test.mjs   (node:test auto-runs on exit)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  validateFusionContent, validateHypermillContent, validateMastercamContent,
  splitSqlValues, parseCsvLine, runHarness,
} from "./cam-tool-library-harness.mjs";
import { MASTERCAM_TOOL_COLUMNS, emitLibraries } from "./emit-brand-tool-libraries.mjs";

// ## Fusion validator
test("validateFusionContent: valid / bad-json / missing-DC / wrong-version", () => {
  assert.equal(validateFusionContent(JSON.stringify({ version: 2, data: [{ geometry: { DC: 6 } }] })).ok, true);
  assert.equal(validateFusionContent("{not json").ok, false);
  assert.equal(validateFusionContent(JSON.stringify({ version: 2, data: [{ geometry: {} }] })).ok, false);
  assert.equal(validateFusionContent(JSON.stringify({ version: 1, data: [] })).ok, false);
  assert.equal(validateFusionContent(JSON.stringify({ version: 2, data: [{ geometry: { DC: 6 } }, { geometry: { DC: 3 } }] })).tools, 2);
});

// ## splitSqlValues
test("splitSqlValues: top-level comma split respecting string literals", () => {
  assert.deepEqual(splitSqlValues("1, 2, 'a'"), ["1", "2", "'a'"]);
  assert.equal(splitSqlValues("1, 'a, b', 3").length, 3);       // comma inside string not split
  assert.equal(splitSqlValues("1, 'O''Brien', 3").length, 3);   // escaped quote inside string
});

// ## hyperMILL validator
test("validateHypermillContent: arity + DDL + quoted commas", () => {
  const GC = "INSERT OR IGNORE INTO GeometryClasses (id, name) VALUES (2, 'Endmill');\n"; // declare type 2
  const good = "CREATE TABLE IF NOT EXISTS Tools (x);\n" + GC + "INSERT INTO Tools (c) VALUES (1, 2, 'EM', 'EM', 1, 1, 1, 50.0, 6.0, 10.0, 6.0, 0.0, 4);";
  assert.equal(validateHypermillContent(good).ok, true);
  assert.equal(validateHypermillContent(good).tools, 1);
  assert.equal(validateHypermillContent("CREATE TABLE IF NOT EXISTS Tools (x);\n" + GC + "INSERT INTO Tools (a) VALUES (1, 2, 3);").ok, false); // arity
  assert.equal(validateHypermillContent("INSERT INTO Tools (c) VALUES (1);").ok, false); // no DDL
  const commaName = "CREATE TABLE IF NOT EXISTS Tools (x);\n" + GC + "INSERT INTO Tools (c) VALUES (1, 2, 'EM, 1/2', 'x', 1, 1, 1, 0.0, 6.0, 0.0, 0.0, 0.0, 4);";
  assert.equal(validateHypermillContent(commaName).ok, true); // comma in name keeps 13 arity
  // FK coverage: a tool_type_id with no GeometryClasses declaration is flagged (the thread-mill bug)
  const undeclared = "CREATE TABLE IF NOT EXISTS Tools (x);\nINSERT INTO Tools (c) VALUES (1, 15, 'TM', 'TM', 1, 1, 1, 50.0, 6.0, 10.0, 6.0, 0.0, 4);";
  assert.equal(validateHypermillContent(undeclared).ok, false); // type 15 not declared -> FK would fail
});

// ## CSV
test("parseCsvLine: quoted commas + escaped quotes", () => {
  assert.deepEqual(parseCsvLine("1,EM,6"), ["1", "EM", "6"]);
  assert.deepEqual(parseCsvLine('1,"EM, 1/2",6'), ["1", "EM, 1/2", "6"]);
  assert.deepEqual(parseCsvLine('1,"a""b",6'), ["1", 'a"b', "6"]);
});
test("validateMastercamContent: header + arity + dia + quoted comma", () => {
  const hdr = MASTERCAM_TOOL_COLUMNS.join(",");
  assert.equal(validateMastercamContent(`${hdr}\n1,EM,End Mill,Helical,EM,mm,6,0,10,50,4,6`).ok, true);
  assert.equal(validateMastercamContent(`${hdr}\n1,EM`).ok, false);                                  // arity
  assert.equal(validateMastercamContent(`${hdr}\n1,EM,End Mill,Helical,EM,mm,0,0,10,50,4,6`).ok, false); // dia 0
  assert.equal(validateMastercamContent(`${hdr}\n1,"EM, 1/2",End Mill,Helical,EM,mm,6,0,10,50,4,6`).ok, true);
  assert.equal(validateMastercamContent("wrong,header").ok, false);                                  // header
});

// ## runHarness -- hermetic emit + validate
test("runHarness: emits + validates all 3 formats, allValid", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-"));
  try {
    const catalogRecords = [
      { id: "EM1", brand: "Helical", category: "solid_mill", diameter_mm: 6, shank_mm: 6, flute_len_mm: 12, oal_mm: 50, corner_radius_mm: 0, num_flutes: 4, unit_source: "mm", geometry_plausible: true },
      { id: "DR1", brand: "Guhring", category: "drill", diameter_mm: 5, oal_mm: 60, num_flutes: 2, unit_source: "mm", geometry_plausible: true },
    ];
    // runHarness builds its own catalog from disk; here we emit with an injected catalog first,
    // then run the harness in validate-only mode over the pre-emitted files.
    for (const format of ["fusion", "hypermill", "mastercam"]) {
      emitLibraries({ catalog: { records: catalogRecords }, format, outDir: dir });
    }
    const report = runHarness({ outDir: dir, emit: false });
    assert.equal(report.allValid, true);
    assert.equal(report.formats.fusion.totalTools, 2);
    assert.equal(report.formats.hypermill.totalTools, 2);
    assert.equal(report.formats.mastercam.totalTools, 2);
    assert.equal(report.formats.fusion.failures.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("runHarness: validate-only catches a corrupt file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-bad-"));
  try {
    fs.mkdirSync(path.join(dir, "fusion"), { recursive: true });
    fs.writeFileSync(path.join(dir, "fusion", "PRISM_BAD.tools"), "{ not valid json");
    const report = runHarness({ outDir: dir, formats: ["fusion"], emit: false });
    assert.equal(report.allValid, false);
    assert.equal(report.formats.fusion.failures.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
