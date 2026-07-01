/**
 * U-QP-TIME-BUGS (charlie 2026-06-12) — fail-on-revert guard for the
 * GCodeTimeEstimatorEngine arc-as-chord undercount (G7). This engine is LIVE
 * (wired into the print-to-quote PipelineSummary via U-GCODE-TO-CYCLE-FOR-PRINT-
 * PIPELINE), so the undercount directly biased quoted cycle time low on any part
 * with arcs.
 *
 * The old code summed the straight-line chord for G02/G03; a circular arc is
 * always LONGER than its chord, so cut time was undercounted. These tests use
 * hand-computed arc geometry that only the true-arc-length code reproduces.
 */
import { describe, it, expect } from "vitest";
import { gCodeTimeEstimatorEngine } from "../engines/GCodeTimeEstimatorEngine.js";

const FEED = 1000; // mm/min -> a 1mm move takes 1/1000*60 = 0.06 s

describe("GCodeTimeEstimatorEngine — true arc length for G02/G03 (U-QP-TIME-BUGS)", () => {
  // Quarter circle, radius 10, CCW (G3), (10,0) -> (0,10), center (0,0) via I-10 J0.
  // Arc length = r * (pi/2) = 10 * 1.570796 = 15.70796 mm.
  // Straight-line chord = sqrt(10^2 + 10^2) = 14.14214 mm (the OLD undercount).
  // time_in_cut = arc / FEED * 60 = 15.70796 / 1000 * 60 = 0.942478 s.
  // OLD chord time = 14.14214 / 1000 * 60 = 0.848528 s.
  const QUARTER_G3 = `%
O0010
G21 G90
G0 X10 Y0
G3 X0 Y10 I-10 J0 F1000
M30
%`;

  it("IJK quarter arc: time uses ARC length (~0.9425 s), not chord (~0.8485 s)", () => {
    const r = gCodeTimeEstimatorEngine.analyze(QUARTER_G3, { dialect: "fanuc_mill" });
    expect(r.ok).toBe(true);
    expect(r.time_in_cut_s).toBeCloseTo(0.9425, 2); // OLD chord code -> 0.8485, FAILS this
    expect(r.time_in_cut_s).toBeGreaterThan(0.90);   // chord 0.8485 < 0.90 -> FAILS on revert
  });

  it("arc time strictly EXCEEDS the equivalent straight chord time (geometric invariant)", () => {
    const arc = gCodeTimeEstimatorEngine.analyze(QUARTER_G3, { dialect: "fanuc_mill" });
    // Same endpoints as a straight G1 cut = the chord the old code charged for.
    const CHORD_G1 = `%
O0011
G21 G90
G0 X10 Y0
G1 X0 Y10 F1000
M30
%`;
    const chord = gCodeTimeEstimatorEngine.analyze(CHORD_G1, { dialect: "fanuc_mill" });
    expect(arc.time_in_cut_s).toBeGreaterThan(chord.time_in_cut_s);
  });

  // R-radius form, minor arc, same quarter geometry: R = +10.
  it("R-radius minor arc matches the IJK arc length (~0.9425 s)", () => {
    const R_FORM = `%
O0012
G21 G90
G0 X10 Y0
G3 X0 Y10 R10 F1000
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(R_FORM, { dialect: "fanuc_mill" });
    expect(r.time_in_cut_s).toBeCloseTo(0.9425, 2);
  });

  it("inch (G20) arc converts I/J to mm before length (radius 2in=50.8mm quarter arc)", () => {
    // Quarter CCW arc radius 2 inch -> arc = 50.8 * pi/2 = 79.7965 mm.
    // In G20 the feed F50 ALSO converts: 50 in/min = 1270 mm/min.
    // time = 79.7965 / 1270 * 60 = 3.7699 s (engine rounds to 3.77).
    // OLD chord code: sqrt(2)*50.8 = 71.8420 mm / 1270 * 60 = 3.3941 s -> undercount (3.39).
    const INCH_ARC = `%
O0013
G20 G90
G0 X2 Y0
G3 X0 Y2 I-2 J0 F50
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(INCH_ARC, { dialect: "fanuc_mill" });
    expect(r.time_in_cut_s).toBeCloseTo(3.77, 2); // OLD chord -> 3.39, FAILS on revert
    expect(r.time_in_cut_s).toBeGreaterThan(3.5);  // chord 3.39 < 3.5 -> FAILS on revert
  });

  it("G18 XZ-plane arc (lathe, I/K offsets): uses arc length not chord", () => {
    // Quarter CCW arc radius 10 in XZ plane, (X10,Z0) -> (X0,Z10), center (0,0) via I-10 K0.
    // arc = 10*pi/2 = 15.70796 mm -> 0.9425 s; chord sqrt(200)=14.142 -> 0.8485 s old.
    const XZ_ARC = `%
O0015
G21 G90
G0 X10 Z0
G3 X0 Z10 I-10 K0 F1000
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(XZ_ARC, { dialect: "mazak_lathe" });
    expect(r.time_in_cut_s).toBeCloseTo(0.9425, 2); // chord 0.8485 FAILS on revert
    expect(r.time_in_cut_s).toBeGreaterThan(0.90);
  });

  it("helical arc (XY arc + Z descent): length = sqrt(arc^2 + dz^2), exceeds planar arc alone", () => {
    // Quarter XY arc r=10 (15.70796mm planar) PLUS Z 0->-15 helical.
    // helix = sqrt(15.70796^2 + 15^2) = sqrt(246.74 + 225) = sqrt(471.74) = 21.7196 mm.
    // time = 21.7196 / 1000 * 60 = 1.30318 s. Planar-only would be 0.9425 s.
    const HELIX = `%
O0016
G21 G90
G0 X10 Y0 Z0
G3 X0 Y10 Z-15 I-10 J0 F1000
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(HELIX, { dialect: "fanuc_mill" });
    expect(r.time_in_cut_s).toBeCloseTo(1.3032, 2); // ignores helical Z -> 0.9425, FAILS
    expect(r.time_in_cut_s).toBeGreaterThan(1.0);    // planar-only 0.9425 < 1.0 -> FAILS
  });

  it("over-specified arc (endpoint off the I/J circle) never undercounts the chord (invariant clamp)", () => {
    // Endpoint X9.9 Y0.1 does NOT lie on the r=10 circle from I-10 J0 -> sweep is tiny;
    // radius*sweep would be < the 3D chord. The Math.max(chord,...) clamp guarantees >= chord.
    const BAD_ARC = `%
O0017
G21 G90
G0 X10 Y0
G3 X9.9 Y0.1 I-10 J0 F1000
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(BAD_ARC, { dialect: "fanuc_mill" });
    const chordMm = Math.sqrt(0.1 * 0.1 + 0.1 * 0.1); // 0.141421 mm
    const chordTime = (chordMm / 1000) * 60;           // 0.008485 s
    expect(r.time_in_cut_s).toBeGreaterThanOrEqual(Math.round(chordTime * 100) / 100);
  });

  it("graceful fallback: a G2 with no I/J/K/R degrades to chord (never throws, never 0 for a real move)", () => {
    const NO_ARC_PARAMS = `%
O0014
G21 G90
G0 X10 Y0
G2 X0 Y10 F1000
M30
%`;
    const r = gCodeTimeEstimatorEngine.analyze(NO_ARC_PARAMS, { dialect: "fanuc_mill" });
    // chord sqrt(200)=14.142mm -> 0.8485s (prior behavior preserved when no arc info)
    expect(r.time_in_cut_s).toBeCloseTo(0.8485, 2);
  });
});
