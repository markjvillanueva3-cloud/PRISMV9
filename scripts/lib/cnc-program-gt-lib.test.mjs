// scripts/lib/cnc-program-gt-lib.test.mjs
// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
// Fixtures are REAL G-code excerpts (T-11BT-27-250-GR5.MIN, an Okuma lathe program) — R9: reference
// values, not stubs. INCH convention (JM), values × 25.4 → mm.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyProgramAxis, extractProgramGT, dimMatchesProgram, scorePartAgainstProgram,
  isParsableNcText, clusterDiameters, programGtReliability,
  CONTOUR_FRACTION_THRESHOLD, MIN_FEED_MOVES_FOR_CLASS, INCH_TO_MM,
  fractionToDecimal, extractDiameterToken, parseToolComment,
  extractMillHoleDiameters, extractMillBoreDiameters, extractMillProgramGT,
} from "./cnc-program-gt-lib.mjs";

// Real excerpt from H:\PRISM\JM DIE\CNC LATHE\OMG\CNC#1#2#3\CUSTOMERS\OPTIMAS\T-11BT-27-250-GR5.MIN
const LATHE_MIN = `$WAFER-ID-PRO.MIN%
NAT01  (OD AND FACE RGH.032R)
G0 X20 Z20
T010101
G50 S1500
G97 S1030 M3
G0 G96 X.95 Z.005 S338 M8
G1 X-.04 F.0088
G0 Z.03 X.895
G85 NTURN D.07 U.005 W.0 F.024
NTURN G81
G0 X.879 Z.01
G1 Z.0 F.0088
G1 Z-.878 F.0088
G80
G0 X20 Z20`;

// A realistic lathe turning pass: G1 FEED moves cut the OD steps (.500, .375) over length; G0 rapids
// position at X20/Z20 (safe) + X.9 (approach). Only the FEED diameters are part geometry (P0-3 fix).
const LATHE_FEED = `O0001 (TURN OD STEPS)
G50 S2000
G97 S1200 M3
G0 X20 Z20
G0 X.9 Z.05
G1 X.5 Z0 F.005
G1 Z-.75 F.008
G1 X.375 Z-.75
G1 Z-1.25 F.008
G0 X20 Z20
M30`;

// A mill program (has Y axis, no G96/G50/turning cycle) — must NOT be read as a lathe diameter.
const MILL_NC = `O1234
G0 X1.5 Y2.0 Z0.1
G1 Z-0.25 F10
G1 X3.0 Y2.0
G0 Z1.0
M30`;

test("classifyProgramAxis: lathe via G96/G50/turn-cycle; mill via Y-axis+no-CSS; unknown otherwise", () => {
  assert.equal(classifyProgramAxis(LATHE_MIN), "lathe");          // has G96 + G50 + NTURN
  assert.equal(classifyProgramAxis(MILL_NC), "mill");             // has Y, no G96/turn
  assert.equal(classifyProgramAxis("G04 X1\nM30"), "unknown");     // no axis/turn/mill signal
  assert.equal(classifyProgramAxis("G96 S400\nNTURN", { ext: ".min" }), "lathe"); // turn signal
});

test("classifyProgramAxis P0: a Hurco MILL .hnc (G17/Y/end-mill) is NOT scored as lathe (the 9102741 bug)", () => {
  // The real defect: .hnc ext + a G81 DRILLING cycle (not turning) force-classed a mill as lathe →
  // 1214 fake feature diameters from XY positions. Now: mill veto (G17/Y/end-mill) wins, G81 ignored.
  const millHnc = "%\nN1 G17 G90\nM06 T1 (1/2 END MILL)\nG0 X1.0 Y2.0\nG81 X1.0 Y2.0 Z-.5 R.1 F10\nG0 Z2\nM30";
  assert.equal(classifyProgramAxis(millHnc, { ext: ".hnc" }), "mill", "G17+Y+end-mill vetoes lathe even on .hnc with G81");
  // a lathe .hnc WITH a real turning signal still classifies lathe
  assert.equal(classifyProgramAxis("G96 S300 M3\nG71 P10 Q20", { ext: ".hnc" }), "lathe");
  // G81 alone (drilling) is NOT a turning signal
  assert.equal(classifyProgramAxis("G81 X0 Z-.2 R.1 F.01"), "unknown", "G81 drilling ≠ turning cycle");
});

test("clusterDiameters: collapses a roughing ramp within tol, keeps genuinely distinct ODs (P1)", () => {
  // a .250-stock → .180-final roughing ramp in ~.003 steps, plus a separate .500 OD shoulder.
  const ramp = [0.18, 0.183, 0.186, 0.189, 0.192, 0.5, 0.503];
  const reps = clusterDiameters(ramp, 0.03);
  // the .18-.192 ramp collapses to ~1 rep; .5/.503 collapses to 1 — so ~2 callout-class dims, not 7
  assert.ok(reps.length <= 3, `clustered ${reps.length} ≤ 3 (was 7 raw)`);
  assert.ok(reps.includes(0.5) || reps.includes(0.503), "the .5 OD shoulder survives as its own feature");
  // adversarial: empty / non-array never throws
  assert.deepEqual(clusterDiameters([]), []);
  assert.deepEqual(clusterDiameters(null), []);
});

test("isParsableNcText: rejects binary + CAM/CAD source exts, accepts posted NC text (P0-1 binary guard)", () => {
  // a real-NC ext + clean text → ok
  assert.equal(isParsableNcText("G0 X1 Z1\nG1 Z-.5", { ext: ".min" }).ok, true);
  // .mcx-8 (Mastercam binary source) → rejected on extension (the 110206 garbage-coords bug)
  assert.equal(isParsableNcText("anything", { ext: ".mcx-8" }).ok, false);
  // CAD sources rejected
  assert.equal(isParsableNcText("x", { ext: ".step" }).ok, false);
  assert.equal(isParsableNcText("x", { ext: ".ipt" }).ok, false);
  // unknown ext rejected (not in allowlist)
  assert.equal(isParsableNcText("G1 X1", { ext: ".bin" }).ok, false);
  // binary CONTENT (control bytes) rejected even with a good ext / no ext
  const binary = "G1\x00\x01\x02\x03\x04\x05\x06\x07\x08PK\x03\x04" + "\x00".repeat(200);
  assert.equal(isParsableNcText(binary, { ext: ".nc" }).ok, false, "high non-printable ratio → binary");
  assert.equal(isParsableNcText(binary).ok, false);
  // empty rejected
  assert.equal(isParsableNcText("").ok, false);
});

test("extractProgramGT: FEED-move diameters are GT, RAPID positions excluded (P0-3/P1-1 fix)", () => {
  const gt = extractProgramGT(LATHE_FEED, { ext: ".nc" });
  assert.equal(gt.axis, "lathe");
  // feed diameters = distinct |X| on G1 lines: .5 and .375 (X.9 is a G0 approach → excluded; X20 rapid → excluded)
  assert.deepEqual(gt.featureDiametersIn, [0.375, 0.5], "only G1-feed diameters, sorted");
  assert.equal(gt.maxDiameterIn, 0.5, "max FEED diameter = .5in (X.9 rapid + X20 retract excluded)");
  // overall length from FEED Z: 0 (max) to -1.25 (min) = 1.25in
  assert.ok(Math.abs(gt.lengthIn - 1.25) < 1e-6, `length ${gt.lengthIn} = 1.25in (feed Z 0 to -1.25)`);
  // callout-class GT = feature diameters + length
  assert.ok(gt.calloutDimsIn.includes(0.5) && gt.calloutDimsIn.includes(0.375) && gt.calloutDimsIn.includes(1.25));
  // toolpath points is context only (all coords), NOT the recall denominator
  assert.ok(gt.nToolpathPoints > gt.featureDiametersIn.length);
});

test("extractProgramGT: a RAPID-only X (G0 X.879) is NOT a feature diameter (the false-GT class)", () => {
  // T-11BT real pattern: the OD is approached by G0 X.879 then cut by a canned cycle — the bare G0
  // X.879 must NOT mint a .879 feature diameter (it's positioning). Only an actual G1 cut would.
  const gt = extractProgramGT("G50 S1\nG0 X.879 Z.01\nG1 Z-.5 F.005", { ext: ".min" });
  assert.ok(!gt.featureDiametersIn.includes(0.879), "G0 X.879 (rapid) is not a feature diameter");
  // the G1 Z move still gives a length
  assert.ok(gt.lengthIn != null);
});

test("extractProgramGT: parenthesized comments do NOT feed the coordinate parser", () => {
  const gt = extractProgramGT("(DIM X.999 IN COMMENT)\nG1 X.5 Z-.5 F.005", {});
  assert.ok(!gt.featureDiametersIn.includes(0.999), "comment .999 not parsed");
  assert.ok(gt.featureDiametersIn.includes(0.5), "real G1 X.5 parsed as a feature diameter");
});

test("extractProgramGT: mill program returns axis=mill (caller treats non-lathe GT as low-confidence)", () => {
  const gt = extractProgramGT(MILL_NC, { ext: ".nc" });
  assert.equal(gt.axis, "mill");
  assert.ok(gt.nToolpathPoints > 0);
});

test("dimMatchesProgram: an OCR'd mm dim matches a program inch coord within tolerance", () => {
  // .879in = 22.3266mm. An OCR read of 22.33mm should match (relErr tiny).
  const m = dimMatchesProgram(22.33, [0.879, 0.5], { relTol: 0.02 });
  assert.equal(m.matched, true);
  assert.ok(Math.abs(m.programMm - 0.879 * INCH_TO_MM) < 1e-3);
  // a spurious 99mm dim matches nothing
  assert.equal(dimMatchesProgram(99, [0.879, 0.5], { relTol: 0.02 }).matched, false);
  // adversarial: NaN/0/empty never throw
  assert.equal(dimMatchesProgram(NaN, [0.5]).matched, false);
  assert.equal(dimMatchesProgram(10, []).matched, false);
});

test("scorePartAgainstProgram: recall over CALLOUT-class GT (feature dias+length), NOT toolpath points", () => {
  const gt = extractProgramGT(LATHE_FEED, { ext: ".nc" }); // calloutDimsIn = [.375, .5, 1.25]
  // OCR read 2 of the 3 callout dims (.5in=12.7mm, 1.25in=31.75mm) + one spurious (99mm)
  const score = scorePartAgainstProgram([12.7, 31.75, 99.0], gt, { relTol: 0.02 });
  assert.equal(score.gtCount, 3, "callout-class GT = 3 dims (.375, .5, 1.25), NOT the toolpath count");
  assert.equal(score.gtMatched, 2, "2 of 3 callout dims corroborated");
  assert.ok(Math.abs(score.recall - 0.6667) < 1e-3, "recall = 2/3 over CALLOUT dims (not ~8% over toolpath)");
  assert.equal(score.ocrMatched, 2, "2 of 3 OCR dims matched (99mm spurious)");
  assert.ok(score.precision < 1, "precision < 1 because 99mm is spurious");
  // toolpathPoints surfaced separately as context, NOT the denominator
  assert.ok(score.toolpathPoints > score.gtCount, "toolpath points >> callout GT count");
});

test("scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)", () => {
  const gt = extractProgramGT(LATHE_FEED, { ext: ".nc" });
  const s = scorePartAgainstProgram([], gt);
  assert.equal(s.ocrMatched, 0); assert.equal(s.gtMatched, 0);
  assert.equal(s.recall, 0); assert.equal(s.precision, 0);
  // adversarial nulls
  assert.equal(scorePartAgainstProgram(null, null).gtCount, 0);
});

// A real CONTOUR excerpt from T-11BT-27-250-GR5.MIN: a G3 radius-form finish pass that sweeps the OD
// down a convex radius (I/K arc-center offsets) through many distinct diameters a print dimensions with a
// single R + endpoints. This is the part whose program-diameter GT (14-27 "callouts") was the recall
// artifact -- it MUST classify as 'contour' / not-reliable so validate excludes it from callout-recall.
const CONTOUR_RADIUS = `O0002 (RADIUS FORM)
G50 S1500
G96 S1030 M3
G0 X.9 Z.05
G1 X.4436 Z-.005 F.005
G1 X.1829 Z-.0073
G1 X.1794 Z.0927
G1 X.4438 Z-.0113
G3 X.4431 Z-.0121 I-.2054 K.1064
G1 X.1791 Z-.0144
G1 X.1756 Z.0856
G3 X.4354 Z-.0192 I-.2054 K.1064
G1 X.185 Z-.0213
G3 X.427 Z-.0262 I-.2054 K.1064
G1 X.185 Z-.0284
G0 X20 Z20
M30`;

test("programGtReliability: a STEPPED part (lands+faces) is GT-reliable (low contour fraction)", () => {
  // LATHE_FEED = plunge/face/land turning of two OD steps -- the diameters ARE print callouts.
  const r = programGtReliability(LATHE_FEED);
  assert.equal(r.gtClass, "stepped", `stepped (contourFraction=${r.contourFraction})`);
  assert.equal(r.gtReliable, true);
  assert.ok(r.contourFraction <= CONTOUR_FRACTION_THRESHOLD, `contourFraction ${r.contourFraction} <= ${CONTOUR_FRACTION_THRESHOLD}`);
  assert.ok(r.landMoves >= 1 && r.faceMoves >= 1, "has both a land and a face move");
  assert.ok(r.feedMoves >= 4, "feedMoves counted");
});

test("programGtReliability: a CONTOUR/RADIUS part (G3 arc sweep) is NOT GT-reliable (high contour fraction)", () => {
  // The real T-11BT radius-form artifact: arc + diagonal moves dominate -> program diameters are a swept
  // contour, NOT print callouts. MUST be classed 'contour' so it's excluded from the honest recall.
  const r = programGtReliability(CONTOUR_RADIUS);
  assert.equal(r.gtClass, "contour", `contour (contourFraction=${r.contourFraction})`);
  assert.equal(r.gtReliable, false, "contour parts are excluded from callout-recall");
  assert.ok(r.contourFraction > CONTOUR_FRACTION_THRESHOLD, `contourFraction ${r.contourFraction} > ${CONTOUR_FRACTION_THRESHOLD}`);
  assert.ok(r.arcMoves >= 3, "the G3 arc moves are counted");
  assert.ok(r.contourMoves >= r.arcMoves, "arcs are a subset of contour moves (diagonal G1 also count)");
});

test("programGtReliability: too-few feed moves -> 'insufficient', still reliable (tiny program = simple part)", () => {
  const r = programGtReliability("G50 S1\nG0 X.9 Z.05\nG1 X.5 Z0 F.005\nG1 Z-.5 F.008\nG0 X20 Z20");
  assert.equal(r.feedMoves, 2, "2 feed moves (< MIN_FEED_MOVES_FOR_CLASS)");
  assert.ok(r.feedMoves < MIN_FEED_MOVES_FOR_CLASS);
  assert.equal(r.gtClass, "insufficient");
  assert.equal(r.gtReliable, true, "insufficient defaults reliable (caller still scores small parts)");
  // adversarial: empty / null never throw
  assert.equal(programGtReliability("").gtClass, "insufficient");
  assert.equal(programGtReliability(null).feedMoves, 0);
});

test("programGtReliability: contourThreshold knob flips the classification deterministically", () => {
  // LATHE_FEED has contourFraction 0.25 (1 diagonal of 4 feed moves) -- a clean mid-band part to flip.
  const base = programGtReliability(LATHE_FEED);
  assert.equal(base.gtClass, "stepped", `default 0.5 -> stepped (fraction=${base.contourFraction})`);
  // lower the threshold BELOW the part's 0.25 fraction -> now classed contour (knob honored, not hardcoded)
  const lo = programGtReliability(LATHE_FEED, { contourThreshold: 0.1 });
  assert.equal(lo.gtClass, "contour", "threshold 0.1 (< 0.25) reclassifies the stepped part as contour");
  // raise it ABOVE the fraction -> stepped again
  const hi = programGtReliability(LATHE_FEED, { contourThreshold: 0.5 });
  assert.equal(hi.gtClass, "stepped", "threshold 0.5 (> 0.25) keeps it stepped");
  // a PURE-contour part (fraction 1.0) stays contour at any threshold < 1
  assert.equal(programGtReliability(CONTOUR_RADIUS).contourFraction, 1, "CONTOUR_RADIUS is all diagonal/arc");
});

test("extractProgramGT: surfaces gt-reliability fields (additive, back-compat) -- stepped part is reliable", () => {
  const gt = extractProgramGT(LATHE_FEED, { ext: ".nc" });
  // existing contract untouched
  assert.deepEqual(gt.featureDiametersIn, [0.375, 0.5]);
  assert.ok(gt.calloutDimsIn.includes(0.5) && gt.calloutDimsIn.includes(1.25));
  // new fields
  assert.equal(gt.gtClass, "stepped");
  assert.equal(gt.gtReliable, true);
  assert.ok(gt.contourFraction <= CONTOUR_FRACTION_THRESHOLD);
  assert.ok(gt.moveProfile && gt.moveProfile.feedMoves > 0, "moveProfile counts surfaced for transparency");
});

test("extractProgramGT: a contour/radius program is flagged gtReliable=false (the recall-artifact guard)", () => {
  const gt = extractProgramGT(CONTOUR_RADIUS, { ext: ".min" });
  assert.equal(gt.axis, "lathe");                 // G96 + arc turning
  assert.equal(gt.gtClass, "contour");
  assert.equal(gt.gtReliable, false, "contour part excluded from honest callout-recall aggregate");
  // the raw feature diameters STILL exist (transparency) -- we don't delete them, we flag the part
  assert.ok(gt.featureDiametersIn.length > 4, "raw swept diameters still surfaced for inspection");
});

test("INCH_TO_MM is the canonical 25.4 (JM STEP is inch -- never silently treat program values as mm)", () => {
  assert.equal(INCH_TO_MM, 25.4);
});

// -- MILL ground-truth (U-XRAY-MILL-PROGRAM-GT) -- hole/bore feature diameters as callout-class GT --

// A realistic JM mill drilled/reamed/c'bored bracket. Tool comments name each HOLE diameter (the print
// callout). It also carries a TAP DRILL (.201 for 1/4-20 -- the print dimensions the THREAD, not .201)
// and a .375 END MILL (the cutter, not a hole) -- BOTH must be EXCLUDED from GT.
const MILL_DRILL = `O2050 (BRACKET MILL)
N1 G17 G90 G0 X0 Y0
M6 T1 (.250 DRILL THRU)
G81 X1.0 Y1.0 Z-.5 R.1 F10
X2.0 Y1.0
M6 T2 (1/2 REAM)
G85 X1.0 Y1.0 Z-.5 R.1 F8
M6 T3 (.531 C'BORE FOR 1/4-20 SHCS)
G82 X1.0 Y1.0 Z-.25 R.1 F6
M6 T4 (.201 TAP DRILL 1/4-20)
G81 X3.0 Y1.0 Z-.6 R.1 F10
M6 T5 (.375 END MILL)
G1 X4 Y2 F20
M30`;

// A circular pocket BORED by a full-circle G3: from (1,1) with I-.375 J0 the tool sweeps a closed circle
// of radius .375 -> diameter .750 (a real dia the print dimensions). The diagonal G1 lead-in is NOT a circle.
const MILL_BORE = `O3000 (BORE A POCKET)
G17 G90
G0 X1.0 Y1.0 Z.1
G1 Z-.25 F10
G3 X1.0 Y1.0 I-.375 J0 F20
G1 X2.0 Y2.0 I.1 J.1
G0 Z1
M30`;

test("fractionToDecimal: simple, mixed, non-fraction, adversarial", () => {
  assert.equal(fractionToDecimal("1/2"), 0.5);
  assert.equal(fractionToDecimal("27/64"), 0.421875);
  assert.equal(fractionToDecimal("3/8"), 0.375);
  assert.equal(fractionToDecimal("1-1/4"), 1.25);     // mixed with dash
  assert.equal(fractionToDecimal("1 1/4"), 1.25);     // mixed with space
  assert.equal(fractionToDecimal(".250"), null);      // a decimal is not this fn's job
  assert.equal(fractionToDecimal("5"), null);
  assert.equal(fractionToDecimal("1/0"), null);       // zero denominator -> null, never Infinity
  assert.equal(fractionToDecimal(""), null);
  assert.equal(fractionToDecimal(null), null);
});

test("extractDiameterToken: decimal wins, fraction fallback, angle/integer rejected, bounded", () => {
  assert.equal(extractDiameterToken(".250 DRILL"), 0.25);
  assert.equal(extractDiameterToken("0.5 REAM"), 0.5);
  assert.equal(extractDiameterToken("1/2 REAM"), 0.5);          // fractional fallback
  assert.equal(extractDiameterToken("82 DEG CSK .375"), 0.375); // the angle 82 has no decimal point -> skipped
  assert.equal(extractDiameterToken("DRILL"), null);            // no value
  assert.equal(extractDiameterToken("T5 DRILL"), null);         // a bare tool number is not a diameter
  assert.equal(extractDiameterToken("99.0 DIA"), null);         // > DIAMETER_MAX_IN (6in) -> rejected, not a real tool
  assert.equal(extractDiameterToken(""), null);
});

test("parseToolComment: hole features emit a diameter; tap-drill + end-mill SUPPRESS it (R12 GT precision)", () => {
  assert.deepEqual(parseToolComment(".250 DRILL THRU"), { kind: "drill", diameterIn: 0.25 });
  assert.deepEqual(parseToolComment("1/2 REAM"), { kind: "ream", diameterIn: 0.5 });
  assert.deepEqual(parseToolComment(".750 BORE"), { kind: "bore", diameterIn: 0.75 });
  assert.deepEqual(parseToolComment(".531 C'BORE FOR 1/4-20 SHCS"), { kind: "cbore", diameterIn: 0.531 }); // thread ctx does NOT suppress a c'bore
  assert.deepEqual(parseToolComment("82 DEG CSK .375"), { kind: "csk", diameterIn: 0.375 });
  assert.deepEqual(parseToolComment(".625 SPOT FACE"), { kind: "spot", diameterIn: 0.625 });
  // a bare SPOT is a spot DRILL (center mark), NOT a print-dimensioned dia -- excluded (live: ALL STAR.NC)
  assert.deepEqual(parseToolComment("T1|.25 SPOT|H1|D1|TOOL DIA. - .25"), { kind: null, diameterIn: null });
  // SUPPRESSED classes -- the print does not carry these values:
  assert.deepEqual(parseToolComment(".201 TAP DRILL 1/4-20"), { kind: "tap", diameterIn: null }); // tap drill != print dia
  assert.deepEqual(parseToolComment(".375 END MILL"), { kind: "mill-tool", diameterIn: null });
  assert.deepEqual(parseToolComment(".500 BALL NOSE"), { kind: "mill-tool", diameterIn: null });
  assert.deepEqual(parseToolComment("FACE MILL"), { kind: "mill-tool", diameterIn: null });
  // no recognizable feature
  assert.deepEqual(parseToolComment("COOLANT ON"), { kind: null, diameterIn: null });
  assert.deepEqual(parseToolComment(""), { kind: null, diameterIn: null });
});

test("extractMillHoleDiameters: distinct hole dia across comments; tap-drill + end-mill excluded", () => {
  const dias = extractMillHoleDiameters(MILL_DRILL);
  // .250 DRILL, 1/2 REAM (.5), .531 C'BORE -> present; .201 TAP DRILL + .375 END MILL -> absent
  assert.deepEqual(dias, [0.25, 0.5, 0.531], "only the three real hole diameters, sorted");
  assert.ok(!dias.includes(0.201), "tap-drill diameter excluded (print dimensions the thread)");
  assert.ok(!dias.includes(0.375), "end-mill diameter excluded (a cutter, not a hole)");
  // adversarial: no comments / empty -> []
  assert.deepEqual(extractMillHoleDiameters("G0 X1 Y1\nM30"), []);
  assert.deepEqual(extractMillHoleDiameters(""), []);
});

test("extractMillBoreDiameters: a FULL-CIRCLE G3 yields 2*radius; a partial arc does NOT", () => {
  const bores = extractMillBoreDiameters(MILL_BORE);
  assert.deepEqual(bores, [0.75], "closed circle radius .375 -> dia .750; the diagonal G1 lead-in is not a bore");
  // a single non-closing arc (contour corner) mints no bore
  assert.deepEqual(extractMillBoreDiameters("G0 X0 Y0\nG3 X1 Y1 I.5 J0 F10\nM30"), [], "endpoint != start -> not a circle");
  // helical bore: X/Y close while Z ramps -> still a bore
  const heli = "G0 X2 Y2 Z.1\nG3 X2 Y2 Z-.5 I-.25 J0 F10\nM30";
  assert.deepEqual(extractMillBoreDiameters(heli), [0.5], "helical full-circle (Z ramp) dia = 2*.25 = .5");
  assert.deepEqual(extractMillBoreDiameters(""), []);
});

test("extractMillProgramGT: mill GT = hole+bore dia, mirrors extractProgramGT shape, gtReliable when found", () => {
  const gt = extractMillProgramGT(MILL_DRILL);
  assert.equal(gt.axis, "mill");
  assert.deepEqual(gt.holeDiametersIn, [0.25, 0.5, 0.531]);
  assert.deepEqual(gt.boreDiametersIn, []);            // MILL_DRILL has no full-circle arc
  assert.deepEqual(gt.calloutDimsIn, [0.25, 0.5, 0.531], "callout denominator = the hole diameters");
  assert.equal(gt.lengthIn, null, "a mill part has no single turned-length axis");
  assert.equal(gt.gtClass, "mill-holes");
  assert.equal(gt.gtReliable, true);
  assert.ok(gt.nToolpathPoints > 0, "X/Y/Z coords counted for context");
  assert.equal(gt.moveProfile.holes, 3);
  // a program with NO hole/bore feature -> not reliable, so the runner skips it (no fake recall=0)
  const empty = extractMillProgramGT("O1\nG0 X1 Y1\nG1 X2 Y2 F10\nM30");
  assert.equal(empty.gtReliable, false);
  assert.equal(empty.gtClass, "mill-no-features");
  assert.deepEqual(empty.calloutDimsIn, []);
});

test("extractMillProgramGT: hole + bore diameters UNION into the callout set", () => {
  const both = `O4000 (DRILL + BORE)
M6 T1 (.250 DRILL)
G81 X1 Y1 Z-.5 R.1 F10
M6 T2 (.500 END MILL)
G0 X3 Y3 Z.1
G1 Z-.25 F10
G3 X3 Y3 I-.375 J0 F20
M30`;
  const gt = extractMillProgramGT(both);
  // .250 from the drill comment + .750 from the full-circle bore; the .500 END MILL is excluded
  assert.deepEqual(gt.calloutDimsIn, [0.25, 0.75]);
  assert.ok(!gt.calloutDimsIn.includes(0.5), "end-mill diameter not in GT");
});

test("parseToolComment P1: a mixed-fraction drill is NOT misread as a thread (live JM 1-15/32 DRILL)", () => {
  // "1-15/32" is a 1.469in drill, NOT a "1-15" thread series -- the dash precedes a fraction slash.
  assert.deepEqual(parseToolComment("1-15/32 DRILL 1.468"), { kind: "drill", diameterIn: 1.468 });
  // a real thread spec still suppresses the tap-drill diameter (the lookahead did not break thread detection)
  assert.deepEqual(parseToolComment(".201 DRILL 1/4-20"), { kind: "tap", diameterIn: null });
  assert.deepEqual(parseToolComment(".213 TAP DRILL 1/4-20 UNC"), { kind: "tap", diameterIn: null });
});

test("extractMillBoreDiameters P1: a runaway arc center is bounded out (no junk diameter in GT)", () => {
  assert.deepEqual(extractMillBoreDiameters("G0 X1 Y1\nG3 X1 Y1 I999999 J0\nM30"), [], "I999999 -> 1999998in junk rejected by BORE_MAX_IN");
  assert.deepEqual(extractMillBoreDiameters("G0 X0 Y0\nG3 X0 Y0 I-.375 J0\nM30"), [0.75], "a real .375-radius bore still yields .75 (bound does not over-clip)");
});

test("extractDiameterToken P2: diameter-vs-depth -- DIA keyword + depth-skip pick the real diameter", () => {
  assert.equal(extractDiameterToken("C'BORE .250 DEEP .531 DIA"), 0.531, "the .531 DIA, not the .250 depth");
  assert.equal(extractDiameterToken("DRILL .500 X .250 DEEP"), 0.5, "the .500 drill, not the .250 depth");
  assert.equal(extractDiameterToken(".375 DIAM REAM"), 0.375);
});

test("scorePartAgainstProgram: a MILL GT flows through the existing scorer unchanged", () => {
  const gt = extractMillProgramGT(MILL_DRILL); // calloutDimsIn = [.25,.5,.531] -> mm 6.35, 12.7, 13.4874
  // OCR read .25in (6.35mm) + .5in (12.7mm) + one spurious 99mm
  const score = scorePartAgainstProgram([6.35, 12.7, 99.0], gt, { relTol: 0.02 });
  assert.equal(score.gtCount, 3, "3 callout-class hole diameters");
  assert.equal(score.gtMatched, 2, "2 of 3 corroborated (.531 missed)");
  assert.ok(Math.abs(score.recall - 0.6667) < 1e-3, "recall = 2/3 over mill hole GT");
  assert.equal(score.ocrMatched, 2, "99mm spurious -> unmatched");
  assert.ok(score.precision < 1);
});
