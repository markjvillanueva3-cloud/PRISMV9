/**
 * Tests for cad-primitive-emit.mjs (slot:delta, U-CAD-PRIMITIVE-EMIT). Deterministic (no Ollama).
 * Reference-value asserts (R9): the emitted code must be dimensionally EXACT (radius = D/2, dims in mm) and
 * must PASS the same codeInvalidReason units-bug guard the LLM path fails 41% of the time -- proving the
 * deterministic path cannot produce the 25.4x-undersize bug.
 *   run: node --test scripts/lib/cad-primitive-emit.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { emitPrimitiveCode, parseTubeRequest, parseConeRequest, parseSquareTubeRequest } from "./cad-primitive-emit.mjs";
import { codeInvalidReason } from "../cad-text-to-cadquery.mjs";

test("emitPrimitiveCode: metric cylinder -> circle(D/2).extrude(L), NO /25.4, passes the units guard", () => {
  const r = emitPrimitiveCode("a 44.5 mm diameter cylinder 12.7 mm long");
  assert.ok(r, "recognized as a primitive");
  assert.equal(r.shape, "cylinder");
  assert.match(r.code, /circle\(22\.25\)\.extrude\(12\.7\)/, "radius = D/2 = 22.25, length 12.7");
  assert.ok(!/\/\s*(?:IN|25\.4)/.test(r.code), "NO division by 25.4 (the LLM bug)");
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: true }), null, "emitted code passes the units-bug guard the LLM fails");
});

test("emitPrimitiveCode: metric cube + rect block -> box(A,B,C)", () => {
  assert.match(emitPrimitiveCode("a 50 mm cube").code, /box\(50, 50, 50\)/);
  assert.match(emitPrimitiveCode("a 101.6 mm by 49.91 mm by 7.75 mm rectangular block").code, /box\(101\.6, 49\.91, 7\.75\)/);
});

test("emitPrimitiveCode: INCH request -> dims ALREADY converted to mm (no units bug either way)", () => {
  const r = emitPrimitiveCode("a 2 inch cube");
  assert.match(r.code, /box\(50\.8, 50\.8, 50\.8\)/, "2 inch = 50.8 mm, emitted directly");
  assert.ok(!/[*/]\s*IN\b/.test(r.code), "no IN conversion in emitted code (parseRequestPrint already resolved units)");
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
});

test("emitPrimitiveCode: disc -> circle(D/2).extrude(thickness)", () => {
  assert.match(emitPrimitiveCode("a disc 30mm diameter 5mm thick").code, /circle\(15\)\.extrude\(5\)/);
});

test("parseTubeRequest: inch bushing (OD/bore/long) + metric tube -> mm; guards", () => {
  const t = parseTubeRequest("a bushing: 0.75 inch outer diameter, 0.375 inch bore, 1 inch long");
  assert.ok(Math.abs(t.odMm - 19.05) < 1e-6, "0.75 inch OD -> 19.05 mm");
  assert.ok(Math.abs(t.idMm - 9.525) < 1e-6, "0.375 inch bore -> 9.525 mm");
  assert.ok(Math.abs(t.lenMm - 25.4) < 1e-6, "1 inch long -> 25.4 mm");
  assert.deepEqual(parseTubeRequest("a tube 40mm OD 25mm ID 15mm long"), { odMm: 40, idMm: 25, lenMm: 15 });
  assert.equal(parseTubeRequest("a 50mm cube"), null, "not a tube");
  assert.equal(parseTubeRequest("a bushing 20mm OD"), null, "incomplete (no ID/length)");
  assert.equal(parseTubeRequest("a tube 20mm OD 30mm ID 10mm long"), null, "OD must exceed ID");
});

test("parseConeRequest: both corpus phrasings ('over length' + 'tall') -> base/top/height mm", () => {
  const a = parseConeRequest("a tapered plug: 1.0 inch diameter at base tapering to 0.5 inch diameter over 2 inch length");
  assert.ok(Math.abs(a.baseMm - 25.4) < 1e-6 && Math.abs(a.topMm - 12.7) < 1e-6 && Math.abs(a.heightMm - 50.8) < 1e-6, "1.0/0.5/2 inch -> 25.4/12.7/50.8 mm");
  const b = parseConeRequest("a truncated cone: 1.5 inch diameter base tapering to 0.75 inch diameter 1 inch tall");
  assert.ok(Math.abs(b.baseMm - 38.1) < 1e-6 && Math.abs(b.topMm - 19.05) < 1e-6 && Math.abs(b.heightMm - 25.4) < 1e-6);
  assert.equal(parseConeRequest("a 50mm cube"), null, "not a cone");
  assert.equal(parseConeRequest("a tapered plug base 1 inch"), null, "incomplete (no top/height)");
});

test("emitPrimitiveCode: truncated cone -> makeCone(baseR, topR, height); passes units guard", () => {
  const r = emitPrimitiveCode("a truncated cone: 1.5 inch diameter base tapering to 0.75 inch diameter 1 inch tall");
  assert.ok(r, "recognized"); assert.equal(r.shape, "cone");
  assert.match(r.code, /makeCone\(19\.05, 9\.525, 25\.4\)/, "baseR 19.05, topR 9.525, height 25.4");
  assert.equal(codeInvalidReason(r.code), null);
});

test("emitPrimitiveCode: bushing/tube -> concentric circle(OD/2).circle(ID/2).extrude(L), passes units guard", () => {
  const r = emitPrimitiveCode("a bushing: 0.75 inch outer diameter, 0.375 inch bore, 1 inch long");
  assert.ok(r, "recognized as a tube");
  assert.equal(r.shape, "tube");
  assert.match(r.code, /circle\(9\.525\)\.circle\(4\.7625\)\.extrude\(25\.4\)/, "OD/2=9.525, ID/2=4.7625, len=25.4");
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null, "no units bug in the emitted tube");
});

test("emitPrimitiveCode: flat washer (ID/OD/thick) -> annulus, NOT deferred by the 'flat' word", () => {
  // a flat washer IS a tube/annulus; "washer" was missing from the keyword gate, and "flat" must NOT be a
  // feature-defer word (it is an adjective here, not a machined flat)
  const r = emitPrimitiveCode("a flat washer: 0.375 inch inner diameter, 0.875 inch outer diameter, 0.0625 inch thick");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "tube");
  // OD 0.875in=22.225 -> r11.1125; ID 0.375in=9.525 -> r4.7625; thick 0.0625in=1.5875
  assert.match(r.code, /circle\(11\.1125\)\.circle\(4\.7625\)\.extrude\(1\.5875\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
});

test("parseSquareTubeRequest + emit: hollow square tube -> rect(o,o).rect(i,i).extrude(L), inner=outer-2*wall", () => {
  const t = parseSquareTubeRequest("a square tube: 1.5 inch square outside with 0.25 inch wall thickness, 3 inch long");
  assert.ok(Math.abs(t.outer - 38.1) < 1e-6 && Math.abs(t.inner - 25.4) < 1e-6 && Math.abs(t.len - 76.2) < 1e-6, "outer 38.1, inner=38.1-2*6.35=25.4, len 76.2");
  const r = emitPrimitiveCode("a square tube: 1.5 inch square outside with 0.25 inch wall thickness, 3 inch long");
  assert.equal(r.shape, "square-tube");
  assert.match(r.code, /rect\(38\.1, 38\.1\)\.rect\(25\.4, 25\.4\)\.extrude\(76\.2\)/);
  assert.equal(parseSquareTubeRequest("a 50mm cube"), null, "not a square tube");
  assert.equal(parseSquareTubeRequest("a 1 inch square plate 0.5 inch thick"), null, "square plate, no wall -> not a tube");
});

test("emitPrimitiveCode: non-primitive / complex / empty -> null (caller falls back to the LLM)", () => {
  assert.equal(emitPrimitiveCode("a mounting bracket with 4 holes and a fillet"), null);
  assert.equal(emitPrimitiveCode(""), null);
  assert.equal(emitPrimitiveCode("a turbine blisk with 48 blades"), null);
});

test("emitPrimitiveCode: a primitive WITH a feature -> null (never silently drops the feature, R12)", () => {
  assert.equal(emitPrimitiveCode("a 50 mm cube with a 10 mm hole"), null, "hole feature -> LLM, not a plain box");
  assert.equal(emitPrimitiveCode("a 44.5 mm diameter cylinder 12.7 mm long with a 6 mm bore"), null, "bore -> LLM");
  assert.equal(emitPrimitiveCode("a 50 mm cube with a fillet"), null, "fillet -> LLM");
  // a TUBE with a feature (keyed bushing) must NOT draw as a plain tube -- would silently drop the keyway (R12)
  assert.equal(emitPrimitiveCode("a keyed bushing: 1 inch outer diameter, 0.5 inch bore, 1 inch long, with a 0.125 inch wide by 0.0625 inch deep keyway in the bore"), null, "keyed bushing -> defer (feature-emit draws the bore keyway), not a plain tube");
  // but the PLAIN forms still emit
  assert.ok(emitPrimitiveCode("a 50 mm cube"), "plain cube still emits");
  assert.ok(emitPrimitiveCode("a 44.5 mm diameter cylinder 12.7 mm long"), "plain cylinder still emits");
  assert.ok(emitPrimitiveCode("a bushing: 0.75 inch outer diameter, 0.375 inch bore, 1 inch long"), "plain tube (no feature) still emits");
});
