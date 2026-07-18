/**
 * Tests for cad-feature-emit.mjs (slot:delta, U-CAD-FEATURE-EMIT). Deterministic (no Ollama).
 * Reference-value + intent asserts (R9): the box+hole algorithm draws a CENTERED THROUGH-hole (the drafting
 * default) with the hole axis = the thinnest dim; it bails (null) on anything it cannot draw UNAMBIGUOUSLY
 * (multi-hole/pattern, other features, explicit off-center location, or a hole that does not fit).
 *   run: node --test scripts/lib/cad-feature-emit.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { emitFeatureCode } from "./cad-feature-emit.mjs";
import { codeInvalidReason } from "../cad-text-to-cadquery.mjs";

test("emitFeatureCode: box + centered through-hole (thru thinnest dim); passes the units guard", () => {
  const r = emitFeatureCode("a 50 mm by 30 mm by 20 mm plate with a 10 mm hole");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "box-hole");
  // box(L,W,H) sorted desc -> 50,30,20; hole through Z (20=thinnest), centered
  assert.match(r.code, /box\(50, 30, 20\)\.faces\(">Z"\)\.workplane\(\)\.hole\(10\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: true }), null, "emitted code has no units bug");
});

test("emitFeatureCode: inch hole request -> dims already mm; 'diameter' optional", () => {
  const r = emitFeatureCode("a 1.0 inch cube with a 0.25 inch diameter through hole");
  assert.match(r.code, /box\(25\.4, 25\.4, 25\.4\)\.faces\(">Z"\)\.workplane\(\)\.hole\(6\.35\)/, "0.25 in -> 6.35 mm hole");
});

test("emitFeatureCode: bails (null) on ambiguous / multi / other-feature / no-fit cases (R12)", () => {
  assert.equal(emitFeatureCode("a 50 mm cube"), null, "no hole -> not this algorithm");
  assert.equal(emitFeatureCode("a 50x30x20 plate with 4 holes"), null, "multi-hole -> a later pattern algorithm");
  assert.equal(emitFeatureCode("a 50x30x20 plate with a 10mm hole on a bolt circle"), null, "pattern -> later");
  assert.equal(emitFeatureCode("a 50x30x20 plate with a 10mm hole and a fillet"), null, "second feature -> LLM");
  assert.equal(emitFeatureCode("a 50x30x20 plate with a 10mm hole in the corner"), null, "explicit off-center -> not the centered default");
  assert.equal(emitFeatureCode("a 30 mm by 20 mm by 10 mm plate with a 40 mm hole"), null, "hole bigger than the face -> impossible part");
});

test("emitFeatureCode #2: round part + CENTER hole -> washer/annulus (concentric by convention)", () => {
  const r = emitFeatureCode("a 1.5 inch diameter disc 0.25 inch thick with a 0.75 inch hole");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "round-hole");
  // OD 1.5in=38.1 -> r 19.05; hole 0.75in=19.05 -> r 9.525; thick 0.25in=6.35
  assert.match(r.code, /circle\(19\.05\)\.circle\(9\.525\)\.extrude\(6\.35\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
  // metric cylinder + center hole
  assert.match(emitFeatureCode("a 40 mm diameter cylinder 10 mm long with a 12 mm center hole").code, /circle\(20\)\.circle\(6\)\.extrude\(10\)/);
});

test("emitFeatureCode #2: CROSS/radial hole is NOT concentric -> null (defer); OD must exceed the hole", () => {
  assert.equal(emitFeatureCode("a 40 mm diameter shaft 60 mm long with a 8 mm cross hole"), null, "cross hole -> not the center default");
  assert.equal(emitFeatureCode("a 40 mm diameter shaft 60 mm long with a 8 mm radial hole"), null);
  // (a hole >= OD would be nonsensical; parseRequestPrint + the OD>ID guard reject it)
});

test("emitFeatureCode #3: flanged/stepped shaft -> two concentric stacked cylinders (flange base + shaft)", () => {
  const r = emitFeatureCode("a 1.0 inch diameter flange 0.25 inch thick on a 0.5 inch diameter shaft 1.0 inch long");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "stepped-shaft");
  // flange 1.0in=25.4 -> r 12.7 x thick 0.25=6.35; shaft 0.5in=12.7 -> r 6.35 x long 1.0=25.4; larger dia = flange
  assert.match(r.code, /circle\(12\.7\)\.extrude\(6\.35\)\.faces\(">Z"\)\.workplane\(\)\.circle\(6\.35\)\.extrude\(25\.4\)/);
  assert.equal(codeInvalidReason(r.code), null);
});

test("emitFeatureCode #3: a flange WITH a hole/other-feature, or a non-flange -> null (keep it a plain 2-step)", () => {
  assert.equal(emitFeatureCode("a flanged shaft with a center hole"), null, "flange + hole -> deferred");
  assert.equal(emitFeatureCode("a 50 mm cube"), null, "not a flange/step");
  assert.equal(emitFeatureCode("a stepped shaft with a keyway"), null, "second feature -> LLM");
});

test("emitFeatureCode #5: counterbored cylinder (die button) -> circle.extrude.cboreHole; concentric", () => {
  const r = emitFeatureCode("a boss: a 1.5 inch diameter cylinder 1 inch tall with a 0.5 inch diameter bore counterbored to 0.75 inch diameter 0.375 inch deep");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "counterbore");
  // OD 1.5in=38.1 -> r19.05 x 1in=25.4 tall; bore 0.5in=12.7; cbore 0.75in=19.05 x 0.375in=9.525 deep
  assert.match(r.code, /circle\(19\.05\)\.extrude\(25\.4\)\.faces\(">Z"\)\.workplane\(\)\.cboreHole\(12\.7, 19\.05, 9\.525\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null, "no units bug");
  // metric counterbore too
  assert.match(emitFeatureCode("a boss: a 40 mm diameter cylinder 20 mm tall with a 10 mm diameter bore counterbored to 18 mm diameter 6 mm deep").code,
    /circle\(20\)\.extrude\(20\)\.faces\(">Z"\)\.workplane\(\)\.cboreHole\(10, 18, 6\)/);
});

test("emitFeatureCode #5: bails on geometrically-impossible counterbore / non-counterbore (R12)", () => {
  // cbore dia must EXCEED the bore dia (a counterbore is a wider recess); reversed -> null
  assert.equal(emitFeatureCode("a boss: a 1 inch diameter cylinder 1 inch tall with a 0.75 inch diameter bore counterbored to 0.5 inch diameter 0.25 inch deep"), null, "cbore <= bore -> impossible");
  // cbore depth must be less than the cylinder height (can't recess deeper than the part)
  assert.equal(emitFeatureCode("a boss: a 1 inch diameter cylinder 0.25 inch tall with a 0.3 inch diameter bore counterbored to 0.6 inch diameter 0.5 inch deep"), null, "cbore deeper than the part -> impossible");
  assert.equal(emitFeatureCode("a 50 mm cube"), null, "no counterbore -> not this algorithm");
});

test("emitFeatureCode #6: block + 45deg chamfer on top edges -> box.faces('>Z').edges().chamfer", () => {
  const r = emitFeatureCode("a 1.5 inch by 1.5 inch by 0.5 inch block with a 0.0625 inch by 45 degree chamfer on all four top edges");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "chamfer-box");
  // 1.5/1.5/0.5in -> 38.1/38.1/12.7; chamfer 0.0625in -> 1.5875; "four top edges" must NOT trip MULTI (four)
  assert.match(r.code, /box\(38\.1, 38\.1, 12\.7\)\.faces\(">Z"\)\.edges\(\)\.chamfer\(1\.5875\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null, "no units bug");
});

test("emitFeatureCode #6: dowel pin / punch (no 'cylinder' word) + chamfer both ends -> %CIRCLE chamfer", () => {
  // "dowel pin" has NO shape word parseRequestPrint knows -> the direct cyl fallback must fire
  const r = emitFeatureCode("a dowel pin: 0.250 inch diameter, 1.5 inch long, with 0.02 inch chamfers on both ends");
  assert.ok(r, "dowel pin recognized via cyl fallback");
  assert.equal(r.shape, "chamfer-cyl");
  // 0.25in dia -> r 3.175; 1.5in long -> 38.1; 0.02in chamfer -> 0.508; both ends via %CIRCLE
  assert.match(r.code, /circle\(3\.175\)\.extrude\(38\.1\)\.edges\("%CIRCLE"\)\.chamfer\(0\.508\)/);
  // explicit-cylinder phrasing also works
  assert.match(emitFeatureCode("a punch blank: a 0.25 inch diameter cylinder 1.5 inch long with a 0.03 inch chamfer on each end").code,
    /circle\(3\.175\)\.extrude\(38\.1\)\.edges\("%CIRCLE"\)\.chamfer\(0\.762\)/);
});

test("emitFeatureCode #6: bails on 2-feature / oversized / non-chamfer (R12)", () => {
  assert.equal(emitFeatureCode("a 50mm cube with a 10mm hole and a 2mm chamfer"), null, "hole + chamfer -> 2 features -> LLM");
  assert.equal(emitFeatureCode("a 20mm by 20mm by 2mm block with a 5mm chamfer on all four top edges"), null, "chamfer deeper than the 2mm thickness -> impossible");
  assert.equal(emitFeatureCode("a 6mm diameter dowel 20mm long with a 4mm chamfer on both ends"), null, "chamfer > radius -> impossible");
  assert.equal(emitFeatureCode("a 50 mm cube"), null, "no chamfer/fillet -> not this algorithm");
});

test("emitFeatureCode #6: fillet variant reuses the same handler (.fillet)", () => {
  const r = emitFeatureCode("a 2 inch by 2 inch by 1 inch block with a 0.125 inch fillet on all four top edges");
  assert.ok(r, "fillet recognized");
  assert.equal(r.shape, "fillet-box");
  assert.match(r.code, /box\(50\.8, 50\.8, 25\.4\)\.faces\(">Z"\)\.edges\(\)\.fillet\(3\.175\)/);
});

test("emitFeatureCode #7: block + centered square pocket -> box.faces('>Z').workplane().rect.cutBlind", () => {
  const r = emitFeatureCode("a 2 inch by 2 inch by 0.75 inch block with a 0.4 inch deep 0.75 inch wide pocket centered on top");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "pocket-box");
  // 2/2/0.75in -> 50.8/50.8/19.05; pocket 0.75in wide -> 19.05 square; 0.4in deep -> 10.16 (cut down = negative)
  assert.match(r.code, /box\(50\.8, 50\.8, 19\.05\)\.faces\(">Z"\)\.workplane\(\)\.rect\(19\.05, 19\.05\)\.cutBlind\(-10\.16\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null, "no units bug");
});

test("emitFeatureCode #7: defers electrode / multi-feature / oversized pocket (R12)", () => {
  // "pocket" as an electrode target (no "deep"+"wide" dims) -> defer
  assert.equal(emitFeatureCode("a sinker EDM electrode for a 0.5 inch square pocket, 1.5 inch tall, with 0.25 inch shank"), null, "electrode -> not a block+pocket");
  // pocket + holes = multi-feature -> defer
  assert.equal(emitFeatureCode("an 80mm x 50mm x 20mm bracket with two 10mm holes and a 30mm x 15mm central pocket 8mm deep"), null, "holes + pocket -> LLM");
  // pocket deeper than the block -> impossible
  assert.equal(emitFeatureCode("a 2 inch by 2 inch by 0.25 inch block with a 0.5 inch deep 0.75 inch wide pocket centered on top"), null, "pocket deeper than the 0.25in thickness -> impossible");
  // pocket wider than the face -> impossible
  assert.equal(emitFeatureCode("a 1 inch by 1 inch by 0.75 inch block with a 0.2 inch deep 2 inch wide pocket centered on top"), null, "pocket wider than the face -> impossible");
});

test("emitFeatureCode #8: pilot punch (stepping down) -> two concentric cylinders, both lengths explicit", () => {
  const r = emitFeatureCode("a pilot punch: a 0.375 inch diameter body 1.5 inch long stepping down to a 0.1875 inch diameter pilot tip 0.25 inch long");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "two-body");
  // body 0.375in=9.525 -> r4.7625 x 1.5in=38.1; tip 0.1875in=4.7625 -> r2.3813 (fmt toFixed(4)) x 0.25in=6.35
  assert.match(r.code, /circle\(4\.7625\)\.extrude\(38\.1\)\.faces\(">Z"\)\.workplane\(\)\.circle\(2\.3813\)\.extrude\(6\.35\)/);
  assert.equal(codeInvalidReason(r.code), null);
});

test("emitFeatureCode #8: die button ('tall overall') -> seg2 len = overall - seg1 (NOT the overall)", () => {
  const r = emitFeatureCode("a die button: a 0.5 inch diameter head 0.25 inch tall on a 0.375 inch diameter body, 0.75 inch tall overall");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "two-body");
  // head 0.5in=12.7 -> r6.35 x 0.25in=6.35; body 0.375in=9.525 -> r4.7625 x (0.75-0.25=0.5in=12.7) -- overall subtracted
  assert.match(r.code, /circle\(6\.35\)\.extrude\(6\.35\)\.faces\(">Z"\)\.workplane\(\)\.circle\(4\.7625\)\.extrude\(12\.7\)/);
});

test("emitFeatureCode #8: defers a stepped/internal BORE (not a plain 2-cylinder) -- and #2 no longer mis-draws it as a washer (R12)", () => {
  // a "stepped bore" is an INTERNAL step (a counterbore-like hole), NOT two external cylinders -> defer, and
  // holeFeature must NOT silently draw it as a simple washer (dropping the second bore step)
  assert.equal(emitFeatureCode("a stepped bore part: 2 inch diameter by 1 inch tall, with a 0.6 inch diameter bore stepping down to a 0.5 inch diameter bore through the rest"), null, "stepped bore -> deferred, never a washer");
  // ball-nose (hemispherical end) is not two plain cylinders -> defer
  assert.equal(emitFeatureCode("a 0.75 inch diameter ball-nose punch blank 2.0 inch long"), null, "ball-nose -> deferred");
});

test("emitFeatureCode #9: shaft + axial keyway -> circle.extrude.cut(box tangent to top OD)", () => {
  const r = emitFeatureCode("a 0.75 inch diameter shaft 3 inch long with a 0.125 inch by 0.0625 inch keyway running the full length");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "shaft-keyway");
  // shaft 0.75in=19.05 -> r9.525 x 3in=76.2; keyway 0.125x0.0625in -> 3.175 wide x 1.5875 deep (2*d=3.175), full length
  assert.match(r.code, /circle\(9\.525\)\.extrude\(76\.2\)\.cut\(cq\.Workplane\("XY"\)\.transformed\(offset=\(0, 9\.525, 0\)\)\.box\(3\.175, 3\.175, 76\.2, centered=\(True, True, False\)\)\)/);
  assert.equal(codeInvalidReason(r.code), null);
});

test("emitFeatureCode #9: plate + centered milled slot -> box.faces('>Z').workplane().slot2D.cutBlind", () => {
  const r = emitFeatureCode("a 2 inch by 2 inch by 0.5 inch plate with a 1 inch long by 0.25 inch wide slot milled 0.25 inch deep, centered");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "plate-slot");
  // plate 2/2/0.5in -> 50.8/50.8/12.7; slot 1in long x 0.25in wide -> slot2D(25.4, 6.35); 0.25in deep -> 6.35
  assert.match(r.code, /box\(50\.8, 50\.8, 12\.7\)\.faces\(">Z"\)\.workplane\(\)\.slot2D\(25\.4, 6\.35\)\.cutBlind\(-6\.35\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
});

test("emitFeatureCode #9: slotFeature defers through-slot / radial slot / oversized keyway (R12)", () => {
  // NOTE: an internal "keyway in the bore" is drawn by #11 (bore-keyway), not deferred -- see that test.
  assert.equal(emitFeatureCode("a rectangular die plate 4.0 inch by 3.0 inch by 1.0 inch with a 1.5 inch by 0.75 inch through slot centered"), null, "through slot -> defer");
  assert.equal(emitFeatureCode("a slotted collar: 1.0 inch outer diameter, 0.5 inch bore, 0.75 inch long, with a 0.125 inch wide radial slot"), null, "radial slot -> defer");
  // keyway wider than the shaft -> impossible
  assert.equal(emitFeatureCode("a 0.25 inch diameter shaft 2 inch long with a 0.5 inch by 0.1 inch keyway running the full length"), null, "keyway wider than the shaft -> impossible");
});

test("emitFeatureCode #10: shaft + circumferential groove -> annular cutter at the given position", () => {
  const r = emitFeatureCode("a 0.75 inch diameter shaft 2.5 inch long with a 0.0938 inch wide by 0.0625 inch deep groove cut around it 0.375 inch from one end");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "shaft-groove");
  // shaft 0.75in=19.05 -> r9.525 x 2.5in=63.5; groove 0.0938w=2.3825, 0.0625d=1.5875 -> floor r7.9375; pos 0.375in=9.525
  assert.match(r.code, /circle\(9\.525\)\.extrude\(63\.5\)\.cut\(cq\.Workplane\("XY"\)\.circle\(10\.525\)\.circle\(7\.9375\)\.extrude\(2\.3825\)\.translate\(\(0, 0, 8\.3337\)\)\)/);
  assert.equal(codeInvalidReason(r.code), null);
});

test("emitFeatureCode #10: v-block + 90deg v-groove -> 45deg triangular-prism cut", () => {
  const r = emitFeatureCode("a v-block: a 2 inch cube with a 90 degree v-groove 0.75 inch deep across the top face");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "v-groove");
  // 2in cube=50.8 -> t=25.4; 90deg V 0.75in=19.05 deep -> corners (+-19.05, 25.4), apex (0, 6.35)
  assert.match(r.code, /box\(50\.8, 50\.8, 50\.8\)\.cut\(cq\.Workplane\("XZ"\)\.polyline\(\[\(-19\.05, 25\.4\), \(19\.05, 25\.4\), \(0, 6\.35\)\]\)\.close\(\)\.extrude\(50\.8, both=True\)\)/);
});

test("emitFeatureCode #10: defers non-90deg v-groove / groove without position / oversized (R12)", () => {
  assert.equal(emitFeatureCode("a v-block: a 2 inch cube with a 60 degree v-groove 0.5 inch deep across the top"), null, "non-90deg V -> width not convention-fixed -> defer");
  assert.equal(emitFeatureCode("a 1 inch diameter shaft 3 inch long with a 0.1 inch wide by 0.05 inch deep groove"), null, "no position -> defer");
  assert.equal(emitFeatureCode("a v-block: a 1 inch cube with a 90 degree v-groove 0.75 inch deep across the top"), null, "V deeper than half the cube -> impossible");
});

test("emitFeatureCode #11: keyed bushing -> tube + keyway cut into the BORE wall", () => {
  const r = emitFeatureCode("a keyed bushing: 1 inch outer diameter, 0.5 inch bore, 1 inch long, with a 0.125 inch wide by 0.0625 inch deep keyway in the bore");
  assert.ok(r, "recognized");
  assert.equal(r.shape, "bore-keyway");
  // OD 1in=25.4 -> r12.7; bore 0.5in=12.7 -> r6.35; keyway 0.125x0.0625in -> 3.175 wide x 1.5875 deep, box tangent to the bore (y=6.35)
  assert.match(r.code, /circle\(12\.7\)\.circle\(6\.35\)\.extrude\(25\.4\)\.cut\(cq\.Workplane\("XY"\)\.transformed\(offset=\(0, 6\.35, 0\)\)\.box\(3\.175, 3\.175, 25\.4, centered=\(True, True, False\)\)\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
});

test("emitFeatureCode #11: defers a radial slot on a collar / a keyway that won't fit the wall (R12)", () => {
  assert.equal(emitFeatureCode("a slotted collar: 1.0 inch outer diameter, 0.5 inch bore, 0.75 inch long, with a 0.125 inch wide radial slot"), null, "radial slot -> different geometry -> defer");
  // keyway depth deeper than the wall (OD-ID)/2 -> impossible
  assert.equal(emitFeatureCode("a keyed bushing: 1 inch outer diameter, 0.875 inch bore, 1 inch long, with a 0.125 inch wide by 0.2 inch deep keyway in the bore"), null, "keyway deeper than the thin wall -> impossible");
});

test("emitFeatureCode #13: shouldered disc / raised boss -> two concentric cylinders (base + boss)", () => {
  const r = emitFeatureCode("a shouldered disc: a 1.5 inch diameter by 0.25 inch thick base with a 0.75 inch diameter by 0.375 inch tall raised boss centered on top");
  assert.ok(r, "recognized (parseRequestPrint drops the boss -> needs the dedicated base+boss parse)");
  assert.equal(r.shape, "shouldered-disc");
  // base 1.5in=38.1 -> r19.05 x 0.25in=6.35; boss 0.75in=19.05 -> r9.525 x 0.375in=9.525
  assert.match(r.code, /circle\(19\.05\)\.extrude\(6\.35\)\.faces\(">Z"\)\.workplane\(\)\.circle\(9\.525\)\.extrude\(9\.525\)/);
  assert.equal(codeInvalidReason(r.code, { requestIsMetric: false }), null);
  // boss must be narrower than the base
  assert.equal(emitFeatureCode("a shouldered disc: a 0.5 inch diameter by 0.25 inch thick base with a 1.0 inch diameter by 0.375 inch tall raised boss on top"), null, "boss wider than base -> not a shouldered disc");
});

test("emitFeatureCode: deterministic (same request -> byte-identical code)", () => {
  const a = emitFeatureCode("a 100mm x 60mm x 12mm plate with a 20mm bore");
  const b = emitFeatureCode("a 100mm x 60mm x 12mm plate with a 20mm bore");
  assert.ok(a && b);
  assert.equal(a.code, b.code);
  assert.match(a.code, /box\(100, 60, 12\).*hole\(20\)/s);
});
