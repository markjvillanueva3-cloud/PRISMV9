// cimco-machine-index.test.mjs — real-behavior tests for the CIMCO machine-library indexer.
// Run: node --test scripts/cimco-machine-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildMachineIndex, DEFAULT_CORPUS } from "./cimco-machine-index.mjs";
import { MM_INFERENCE_FLOOR } from "./cimco-control-map.mjs";

test("buildMachineIndex: throws descriptively on an unreadable corpus dir (no silent empty index)", () => {
  assert.throws(() => buildMachineIndex("Z:/no/such/MachineCfg"), /not readable/);
});

const corpusPresent = existsSync(DEFAULT_CORPUS);

test("integration: indexes the full real .mcfg corpus with zero parse errors", (t) => {
  if (!corpusPresent) return t.skip("CIMCO corpus not present on this machine");
  const idx = buildMachineIndex();
  assert.equal(idx.schemaVersion, "1.1.0");
  assert.ok(idx.machineCount >= 80, `expected >=80 machines, got ${idx.machineCount}`);
  assert.equal(idx.errorCount, 0, `parse errors: ${JSON.stringify(idx.errors)}`);
  // CIMCO templates span lathe + mill orientations
  assert.ok((idx.byOrientation.Lathe || 0) >= 1);
  assert.ok((idx.byOrientation.Vertical || 0) >= 1);
});

test("integration: units-first three-way contract at scale — declared vs inferred vs unknown (U-CIMCO-MCFG-UNITS-INFER)", (t) => {
  if (!corpusPresent) return t.skip("CIMCO corpus not present on this machine");
  const idx = buildMachineIndex();
  // Some vendor machine defs (e.g. DMG Mori) omit Header.Unit — they MUST NOT be silently assumed.
  // They are now INFERRED from kinematic magnitude (mm-or-nothing), surfaced honestly (unitsResolved:false).
  assert.ok(idx.unresolvedUnits.length > 0, "expected some not-declared vendor machines to be surfaced");
  // byUnitSource fully partitions the corpus; declared + inferred + unknown == machineCount.
  const src = idx.byUnitSource;
  assert.equal(
    (src.declared || 0) + (src["inferred-magnitude"] || 0) + (src.unknown || 0),
    idx.machineCount,
    `byUnitSource must partition all machines: ${JSON.stringify(src)}`,
  );
  assert.equal(idx.unresolvedUnits.length, idx.unitsInferred.length + idx.unitsUnknown.length,
    "unresolvedUnits must split exactly into inferred + truly-unknown");
  for (const m of idx.machines) {
    assert.ok(["mm", "inch", "unknown"].includes(m.unit), `bad unit '${m.unit}' for ${m.file}`);
    assert.ok(["declared", "inferred-magnitude", "unknown"].includes(m.unitSource), `bad unitSource '${m.unitSource}' for ${m.file}`);
    if (m.unitSource === "declared") {
      assert.equal(m.unitsResolved, true, `${m.file} declared but not resolved`);
      assert.equal(m.unitsInferred, false);
    } else if (m.unitSource === "inferred-magnitude") {
      // INFERRED: a best-guess (only ever mm) — usable but NOT an authoritative resolution.
      assert.equal(m.unit, "mm", `${m.file} inferred must be mm (never inch)`);
      assert.equal(m.unitsResolved, false, `${m.file} inferred must stay unitsResolved:false (honest)`);
      assert.equal(m.unitsInferred, true);
      assert.ok(["high", "medium"].includes(m.inferenceConfidence), `${m.file} inferred needs a confidence`);
      assert.ok(typeof m.maxLinearRange === "number" && m.maxLinearRange > MM_INFERENCE_FLOOR, `${m.file} inferred needs >${MM_INFERENCE_FLOOR} magnitude`);
      assert.ok(m.warnings.some((w) => /units INFERRED/.test(w)), `${m.file} inferred but no INFERRED warning`);
    } else {
      // TRULY UNKNOWN: no declaration AND no usable magnitude — must be flagged, never used blind.
      assert.equal(m.unit, "unknown");
      assert.equal(m.unitsResolved, false);
      assert.ok(m.warnings.some((w) => /units UNRESOLVED/.test(w)), `${m.file} unknown unit but no warning`);
    }
  }
});

test("integration: the 44-file fix — every vendor .mcfg now resolves or infers (zero truly-unknown), and inference NEVER claims inch", (t) => {
  if (!corpusPresent) return t.skip("CIMCO corpus not present on this machine");
  const idx = buildMachineIndex();
  // The whole CIMCO machine library is metric — so post the fix, NO machine is left unit:"unknown".
  assert.equal(idx.unitsUnknown.length, 0, `expected 0 truly-unknown after inference, got: ${JSON.stringify(idx.unitsUnknown)}`);
  assert.ok(idx.unitsInferred.length >= 40, `expected the ~44 undeclared vendor files to be inferred, got ${idx.unitsInferred.length}`);
  // Magnitude can never positively prove inch — so no inferred machine may be labeled inch.
  for (const m of idx.machines) {
    if (m.unitsInferred) assert.notEqual(m.unit, "inch", `${m.file} must never be inferred as inch`);
  }
  // byUnit reflects the all-metric corpus (no lingering "unknown" bucket).
  assert.equal(idx.byUnit.unknown || 0, 0, "no machine should remain in the unknown units bucket");
});

test("integration: every indexed machine carries the core fields consumers depend on", (t) => {
  if (!corpusPresent) return t.skip("CIMCO corpus not present on this machine");
  const idx = buildMachineIndex();
  for (const m of idx.machines) {
    assert.ok(typeof m.file === "string" && m.file.endsWith(".mcfg"));
    assert.ok(typeof m.collisionPairs === "number");
    assert.ok(typeof m.axisCount === "number");
    assert.ok(Array.isArray(m.axes));
    assert.ok(typeof m.hasRevolver === "boolean");
  }
});
