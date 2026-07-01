#!/usr/bin/env node
/**
 * units-guard.test.mjs — tests the fleet-wide units-first guard. Run: node --test scripts/units-guard.test.mjs
 * Covers detection across NC/STEP/explicit sources, the unknown→STOP path, the 25.4x mismatch guard,
 * conversion round-trips, the kilo scale-anomaly scenario, and adversarial inputs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MM_PER_INCH, mmToInch, inchToMm, normUnits, detectUnits, requireUnits, assertUnitsMatch, convert, scaleAnomaly,
} from "./lib/units-guard.mjs";

test("detectUnits: NC G20=inch, G21=mm (variability: real program headers)", () => {
  assert.equal(detectUnits("O1001\nG20 G17 G90 G94 G54\nT1 M06").units, "inch");
  assert.equal(detectUnits("O1\nG21 G17 G90\nT1 M06").units, "mm");
  assert.equal(detectUnits("G71 G90").units, "mm");
  assert.equal(detectUnits("G70 G90").units, "inch");
});

test("detectUnits: STEP CONVERSION_BASED_UNIT 0.0254=inch, SI MILLI METRE=mm", () => {
  assert.equal(detectUnits("... CONVERSION_BASED_UNIT('INCH',LENGTH_MEASURE(0.0254)) ...").units, "inch");
  assert.equal(detectUnits("#10=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );").units, "mm");
});

test("detectUnits: STEP with SI .METRE. base AND CONVERSION_BASED_UNIT('INCH') = INCH (real Kurt-DX6 case)", () => {
  // a STEP can carry SI metre base lines yet drive geometry in inch via CONVERSION_BASED_UNIT —
  // the inch conversion wins (this exact pattern wrongly read as 'mm' before the fix).
  const step = "#52 =( LENGTH_UNIT ( ) NAMED_UNIT ( * ) SI_UNIT ( $, .METRE. ) );\n#94 =( CONVERSION_BASED_UNIT ( 'INCH', #33324 ) LENGTH_UNIT ( ) NAMED_UNIT ( #42222 ) );";
  const r = detectUnits(step);
  assert.equal(r.units, "inch", `Kurt-DX6 STEP must read inch, got ${r.units} (${r.evidence})`);
  assert.equal(r.confidence, 1);
  // and a pure-metre STEP (no inch conversion) still reads mm
  assert.equal(detectUnits("#52 =( LENGTH_UNIT ( ) NAMED_UNIT ( * ) SI_UNIT ( $, .METRE. ) );").units, "mm");
});

test("detectUnits: explicit object field (Fusion tool library 'unit')", () => {
  assert.equal(detectUnits({ unit: "inches" }).units, "inch");
  assert.equal(detectUnits({ units: "millimeters" }).units, "mm");
  assert.equal(detectUnits({ units: "mm" }).confidence, 1);
});

test("detectUnits: NO evidence → unknown (the STOP path, failure mode)", () => {
  const r = detectUnits("X1.0 Y2.0 Z-0.3 F30");  // moves but no unit declaration
  assert.equal(r.units, "unknown");
  assert.equal(r.confidence, 0);
});

test("requireUnits: throws when units can't be determined (enforces check-first)", () => {
  assert.throws(() => requireUnits("no units here"), /UNITS UNKNOWN/);
  assert.equal(requireUnits("G20").units, "inch"); // resolvable → returns
});

test("assertUnitsMatch: passes on match, THROWS with 25.4x warning on mismatch (the kilo guard)", () => {
  assert.equal(assertUnitsMatch("inch", "inch"), true);
  assert.equal(assertUnitsMatch("inch", "in"), true);   // normalized
  assert.throws(() => assertUnitsMatch("inch", "mm", "tool table"), /MISMATCH.*25\.4x/s);
});

test("convert + round-trip: 1in=25.4mm, 25.4mm=1in, same-units no-op", () => {
  assert.equal(inchToMm(1), 25.4);
  assert.equal(mmToInch(25.4), 1);
  assert.equal(convert(0.5, "inch", "mm"), 12.7);
  assert.ok(Math.abs(convert(convert(0.5, "inch", "mm"), "mm", "inch") - 0.5) < 1e-12);
  assert.equal(convert(3, "mm", "mm"), 3);
  assert.equal(MM_PER_INCH, 25.4);
});

test("scaleAnomaly: catches the kilo mistake — an inch tool dia treated as mm (and vice-versa)", () => {
  // 0.5" end mill is fine as inch; flagged if declared mm-but-tiny? 0.5mm is a valid micro tool, so use a clearer case:
  assert.equal(scaleAnomaly(0.5, "inch", "toolDiameter").anomaly, false);   // 1/2" EM — fine
  // 12.7 "inch" tool dia = absurd (would be a 12.7 inch cutter); 12.7mm is plausible → flag + suggest mm
  const a = scaleAnomaly(12.7, "inch", "toolDiameter");
  assert.equal(a.anomaly, true);
  assert.equal(a.suggestUnits, "mm");
  // a 50-unit holder in an inch job is absurd (50") but 50mm is normal → flag
  assert.equal(scaleAnomaly(50, "inch", "holderDiameter").anomaly, true);
  assert.equal(scaleAnomaly(50, "mm", "holderDiameter").anomaly, false);
});

test("normUnits: maps the many spellings to inch|mm", () => {
  for (const s of ["inch", "in", "inches", "imperial", '"']) assert.equal(normUnits(s), "inch");
  for (const s of ["mm", "millimeter", "millimetre", "metric"]) assert.equal(normUnits(s), "mm");
});

test("adversarial: null/number/garbage/empty never throw in detect/scaleAnomaly", () => {
  for (const s of [null, undefined, "", "   ", 12345, "\x00%%%", [], {}]) {
    const r = detectUnits(s);
    assert.ok(["inch", "mm", "unknown"].includes(r.units), `got ${r.units} for ${JSON.stringify(s)}`);
  }
  for (const v of [NaN, Infinity, 0, -5, "x"]) {
    assert.doesNotThrow(() => scaleAnomaly(v, "inch", "toolDiameter"));
  }
  assert.throws(() => convert(1, "inch", "furlong"), /unknown 'to' units/);
});
