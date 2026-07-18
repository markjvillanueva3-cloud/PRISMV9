// cimco-tool-index.test.mjs — real-behavior tests for the CIMCO tool-library indexer.
// Run: node --test scripts/cimco-tool-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { parseTmlib, buildToolIndex, DEFAULT_TOOLLIBS } from "./cimco-tool-index.mjs";

const SAMPLE = `<Library Version="4">
  <Cutter Type="CommonDrill">
    <Parameter Type="ItemNumber">1</Parameter>
    <Parameter Type="Description">1/64 DRILL</Parameter>
    <Parameter Type="ItemUnitSystem">Imperial</Parameter>
    <Parameter Type="FluteDiameter">0.01563</Parameter>
    <Parameter Type="BodyLength">3</Parameter>
    <Parameter Type="TipAngle">140</Parameter>
  </Cutter>
  <Cutter Type="EndMill">
    <Parameter Type="ItemNumber">2</Parameter>
    <Parameter Type="Description">6mm EM</Parameter>
    <Parameter Type="ItemUnitSystem">Metric</Parameter>
    <Parameter Type="FluteDiameter">6</Parameter>
  </Cutter>
</Library>`;

test("parseTmlib: extracts cutters + curated params with numeric coercion", () => {
  const r = parseTmlib(SAMPLE);
  assert.equal(r.libraryVersion, "4");
  assert.equal(r.cutterCount, 2);
  const drill = r.tools[0];
  assert.equal(drill.type, "CommonDrill");
  assert.equal(drill.description, "1/64 DRILL");
  assert.equal(drill.unitSystem, "Imperial");
  assert.equal(drill.fluteDiameter, 0.01563); // numeric, not string
  assert.equal(drill.tipAngle, 140);
  const em = r.tools[1];
  assert.equal(em.type, "EndMill");
  assert.equal(em.unitSystem, "Metric");
  assert.equal(em.fluteDiameter, 6);
  assert.equal(em.tipAngle, null); // absent param → null, not undefined/NaN
});

test("parseTmlib: a library with no cutters yields an empty tool list (no throw)", () => {
  const r = parseTmlib(`<Library Version="4"></Library>`);
  assert.equal(r.cutterCount, 0);
  assert.deepEqual(r.tools, []);
});

const corpusPresent = existsSync(DEFAULT_TOOLLIBS);

test("integration: indexes the real .tmlib corpus with zero parse errors", (t) => {
  if (!corpusPresent) return t.skip("CIMCO ToolLibs corpus not present");
  const idx = buildToolIndex();
  assert.equal(idx.schemaVersion, "1.0.0");
  assert.ok(idx.libraryCount >= 10, `expected >=10 libs, got ${idx.libraryCount}`);
  assert.ok(idx.totalCutters >= 200, `expected >=200 cutters, got ${idx.totalCutters}`);
  assert.equal(idx.errorCount, 0, `parse errors: ${JSON.stringify(idx.errors)}`);
  // CIMCO predefined libs span both unit systems
  assert.ok((idx.byUnitSystem.Imperial || 0) >= 1);
  assert.ok((idx.byUnitSystem.Metric || 0) >= 1);
});

test("integration: every indexed cutter carries a type + units (units-first)", (t) => {
  if (!corpusPresent) return t.skip("CIMCO ToolLibs corpus not present");
  const idx = buildToolIndex();
  for (const lib of idx.libraries) {
    for (const tool of lib.tools) {
      assert.ok(tool.type, `cutter in ${lib.file} missing type`);
      // unitSystem may be null for a malformed cutter — if so it MUST be surfaced in unitsUnresolved
      if (!tool.unitSystem) {
        assert.ok(idx.unitsUnresolved.some((u) => u.file === lib.file), `${lib.file} has unit-less cutter not surfaced`);
      }
    }
  }
});
