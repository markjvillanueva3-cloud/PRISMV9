/**
 * U-QP-CANNED-CYCLES (charlie 2026-06-12) -- verify CycleTimeEstimatorEngine now
 * models mill drilling/boring/tapping canned cycles (G73/G81-G89) instead of
 * mis-typing them as a single motion. (G74/G76 are intentionally NOT modeled --
 * on a lathe they mean left-hand-tap / threading; that is a separate dialect.)
 * Before this unit, a canned-cycle line fed
 * through as one rapid/linear move (or "other"), so the feed-drill time, peck
 * retracts, dwell, and every MODAL REPEAT hole were silently lost -> cycle time
 * (and therefore the quote) was undercounted on every drilled part.
 *
 * Reference values: a G81 R2 Z-10 F100 hole feeds R->Z = |2-(-10)| = 12 mm at
 * 100 mm/min = 12/100*60 = 7.2 s (plus small S-curve accel overhead). Assertions
 * are invariants that FAIL under the old single-move behavior (which charged ~0
 * cutting time for the drill).
 */
import { describe, it, expect } from "vitest";
import { cycleTimeEstimatorEngine } from "../engines/CycleTimeEstimatorEngine.js";

const CFG = { controller: "haas" as const, machine_profile: "haas_vf2" };

describe("CycleTimeEstimatorEngine -- canned cycles (U-QP-CANNED-CYCLES)", () => {
  it("G81 drill: feed-drill time appears as cutting_time (~7.2 s for R2 Z-10 F100)", () => {
    const PROG = `%
O0001
G21 G90 G98
T1 M06
G0 X10 Y10 Z25
S2000 M03
G81 X10 Y10 Z-10 R2 F100
G80
M30
%`;
    const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, CFG);
    // Old code mis-typed the G81 as a single move -> ~0 cutting time. The drill
    // feed (12mm @ 100mm/min = 7.2s) must now show as cutting_time.
    expect(r.cutting_time).toBeGreaterThan(7.0);
    expect(r.cutting_time).toBeLessThan(8.5); // 7.2s + small S-curve overhead, one hole only
    expect(r.total_seconds).toBeGreaterThan(7.2);
  });

  it("modal repeat: 3 holes drill ~3x the cutting time of 1 hole", () => {
    const ONE = `%
G21 G90 G98
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
G80
M30
%`;
    const THREE = `%
G21 G90 G98
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
X20 Y0
X40 Y0
G80
M30
%`;
    const one = cycleTimeEstimatorEngine.estimateFromGCode(ONE, CFG);
    const three = cycleTimeEstimatorEngine.estimateFromGCode(THREE, CFG);
    // Each modal X/Y line repeats the drill -> ~3x the feed-drill cutting time.
    // Old code treated X20/X40 as plain rapids -> NO extra drill time (ratio ~1).
    const ratio = three.cutting_time / one.cutting_time;
    expect(ratio).toBeGreaterThan(2.7);
    expect(ratio).toBeLessThan(3.3);
  });

  it("G83 peck adds retract overhead -> more drill distance/time than plain G81 (same depth)", () => {
    const DRILL = `%
G21 G90 G99
G0 X0 Y0 Z25
G81 X0 Y0 Z-20 R2 F100
G80
M30
%`;
    const PECK = `%
G21 G90 G99
G0 X0 Y0 Z25
G83 X0 Y0 Z-20 R2 Q5 F100
G80
M30
%`;
    const drill = cycleTimeEstimatorEngine.estimateFromGCode(DRILL, CFG);
    const peck = cycleTimeEstimatorEngine.estimateFromGCode(PECK, CFG);
    // Peck (Q5 over 22mm depth -> ~5 pecks) re-feeds half-Q each peck -> longer path.
    expect(peck.cutting_time).toBeGreaterThan(drill.cutting_time);
  });

  it("G84 tap retracts at FEED (not rapid) -> tap retract adds cutting time vs G81 rapid retract", () => {
    const TAP = `%
G21 G90 G99
G0 X0 Y0 Z25
G84 X0 Y0 Z-10 R2 F100
G80
M30
%`;
    const r = cycleTimeEstimatorEngine.estimateFromGCode(TAP, CFG);
    // Tap = feed down (12mm) + feed up (12mm) = 24mm @ 100mm/min = ~14.4s cutting.
    // A drill of the same depth retracts at RAPID, so tap cutting_time ~2x drill.
    expect(r.cutting_time).toBeGreaterThan(13.5);
    expect(r.cutting_time).toBeLessThan(16.0);
  });

  it("G82 dwell adds dwell_time (engine P>=100ms->seconds heuristic, shared with G04)", () => {
    const PROG = `%
G21 G90 G99
G0 X0 Y0 Z25
G82 X0 Y0 Z-5 R2 P500 F100
G80
M30
%`;
    const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, CFG);
    // P500 >= 100 -> 500ms = 0.5s dwell (controller-aware dwell units are a
    // separate engine-wide follow-up; canned P reuses the G04 heuristic).
    expect(r.dwell_time).toBeCloseTo(0.5, 2);
  });

  it("G73 high-speed peck is modeled (more cutting time than a plain G81 of equal depth)", () => {
    const DRILL = `%
G21 G90 G99
G0 X0 Y0 Z25
G81 X0 Y0 Z-20 R2 F100
G80
M30
%`;
    const PECK73 = `%
G21 G90 G99
G0 X0 Y0 Z25
G73 X0 Y0 Z-20 R2 Q5 F100
G80
M30
%`;
    const drill = cycleTimeEstimatorEngine.estimateFromGCode(DRILL, CFG);
    const peck73 = cycleTimeEstimatorEngine.estimateFromGCode(PECK73, CFG);
    // G73 was previously unmodeled (fell through -> ~0 cutting). Now it pecks.
    expect(peck73.cutting_time).toBeGreaterThan(drill.cutting_time);
  });

  it("G85 bore feeds OUT (retract at feed) -> more cutting time than a G81 rapid-retract of equal depth", () => {
    const DRILL = `%
G21 G90 G99
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
G80
M30
%`;
    const BORE85 = `%
G21 G90 G99
G0 X0 Y0 Z25
G85 X0 Y0 Z-10 R2 F100
G80
M30
%`;
    const drill = cycleTimeEstimatorEngine.estimateFromGCode(DRILL, CFG);
    const bore85 = cycleTimeEstimatorEngine.estimateFromGCode(BORE85, CFG);
    // G85 feeds out (12mm feed-out added) vs G81 rapid out -> ~2x drill cutting.
    expect(bore85.cutting_time).toBeGreaterThan(drill.cutting_time * 1.8);
  });

  it("G98 retract-to-initial costs more rapid time than G99 retract-to-R (initial 25 > R 2)", () => {
    const G98P = `%
G21 G90 G98
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
X20 Y0
G80
M30
%`;
    const G99P = `%
G21 G90 G99
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
X20 Y0
G80
M30
%`;
    const g98 = cycleTimeEstimatorEngine.estimateFromGCode(G98P, CFG);
    const g99 = cycleTimeEstimatorEngine.estimateFromGCode(G99P, CFG);
    // G98 retracts to Z25 each hole then must re-plunge to R2 next hole -> more rapid travel.
    expect(g98.rapid_time).toBeGreaterThan(g99.rapid_time);
    // Cutting (the drill feed) is identical regardless of retract mode.
    expect(g98.cutting_time).toBeCloseTo(g99.cutting_time, 2);
  });

  it("G80 cancel: a G0 move after cancel is rapid, not a drill (no spurious cutting time)", () => {
    const PROG = `%
G21 G90 G99
G0 X0 Y0 Z25
G81 X0 Y0 Z-10 R2 F100
G80
G0 X50 Y50 Z25
M30
%`;
    const r = cycleTimeEstimatorEngine.estimateFromGCode(PROG, CFG);
    // Only the single G81 hole contributes cutting time (~7.2s); the post-G80 G0
    // is a rapid. If cancel failed, the G0 would be mis-drilled -> cutting too high.
    expect(r.cutting_time).toBeGreaterThan(7.0);
    expect(r.cutting_time).toBeLessThan(8.5);
  });
});
