/**
 * pp_feed_speed_scale wire test —
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PP-SCALER (2026-05-21, slot:juliett).
 *
 * Validates PPFeedSpeedScalerEngine.scale() — pure G-code F/S text rewriter.
 * Tests use concrete reference G-code samples and assert byte-level invariants
 * against the engine's documented behavior: uniform scaling, max/min clamping,
 * range filtering, rapid-skip, paren-comment + ;-tail preservation.
 */
import { describe, it, expect } from "vitest";
import { ppFeedSpeedScalerEngine } from "../engines/PPFeedSpeedScalerEngine.js";

describe("pp_feed_speed_scale wire — PPFeedSpeedScalerEngine.scale()", () => {
  it("uniform feed_factor=0.5 halves F-words on cutting moves, S unchanged when speed_factor omitted", () => {
    const gcode = ["G1 X10 Y0 F1200 S8000", "G1 X20 F600", "G1 X30 F2400"].join("\n");
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("F600 S8000"); // 1200 * 0.5 = 600
    expect(r.text).toContain("F300");        //  600 * 0.5 = 300
    expect(r.text).toContain("F1200");       // 2400 * 0.5 = 1200
    expect(r.feeds_scaled).toBe(3);
    expect(r.speeds_scaled).toBe(0); // S unchanged (factor=1 default)
  });

  it("speed_factor=2 doubles S, with S=12000 clamped to max_speed=10000 (reason:clamped_max)", () => {
    const gcode = "M3 S6000\nG1 X10 F500";
    const r = ppFeedSpeedScalerEngine.scale(gcode, { speed_factor: 2, max_speed: 10000 });
    expect(r.text).toContain("S10000"); // 6000*2=12000 clamped to 10000
    expect(r.speeds_clamped).toBe(1);
    const sChange = r.changes.find((c) => c.letter === "S");
    expect(sChange?.reason).toBe("clamped_max");
    expect(sChange?.new_value).toBe(10000);
  });

  it("skip_rapid_feeds default-true: F on G0 block is NOT scaled (reason:skipped_rapid)", () => {
    // F-on-rapid is a controller-specific feed-mode preset on some controllers
    // (Fanuc G94/G95 etc.) and should never get the trial-cut 0.5x treatment.
    const gcode = "G0 X0 Y0 F5000\nG1 X10 F1000";
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("F5000"); // unchanged on G0
    expect(r.text).toContain("F500");  // 1000*0.5 = 500 on G1
    expect(r.feeds_skipped).toBe(1);
    expect(r.feeds_scaled).toBe(1);
  });

  it("skip_rapid_feeds=false: F on G0 IS scaled when caller opts in", () => {
    const r = ppFeedSpeedScalerEngine.scale(
      "G0 X0 Y0 F5000\nG1 X10 F1000",
      { feed_factor: 0.5, skip_rapid_feeds: false },
    );
    expect(r.text).toContain("F2500"); // 5000*0.5 on G0 (no skip)
    expect(r.text).toContain("F500");
    expect(r.feeds_skipped).toBe(0);
    expect(r.feeds_scaled).toBe(2);
  });

  it("range filter: feeds outside [range_min, range_max] are unchanged (reason:out_of_range)", () => {
    // Only scale F in [800, 2000]. F300 and F3000 should be untouched.
    const gcode = "G1 X1 F300\nG1 X2 F1000\nG1 X3 F3000";
    const r = ppFeedSpeedScalerEngine.scale(gcode, {
      feed_factor: 0.5,
      feed_range_min: 800,
      feed_range_max: 2000,
    });
    expect(r.text).toContain("F300");  // < range_min, untouched
    expect(r.text).toContain("F500");  // 1000 * 0.5 (in range)
    expect(r.text).toContain("F3000"); // > range_max, untouched
    expect(r.feeds_scaled).toBe(1);
    const outOfRange = r.changes.filter((c) => c.reason === "out_of_range");
    expect(outOfRange.length).toBe(2);
  });

  it("paren-comment preservation: F inside (...) is NEVER rewritten", () => {
    // Critical invariant — F-values quoted inside paren-comments must survive
    // verbatim. Otherwise a 0.5x trial-cut would silently rewrite the operator's
    // documentation of the original speed.
    const gcode = "G1 X10 F1000 (was F2000 in original prog)";
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("F500");                  // real F scaled
    expect(r.text).toContain("(was F2000 in original prog)"); // paren untouched
  });

  it("semicolon-tail comment preservation: F after ; is NEVER rewritten", () => {
    const gcode = "G1 X10 F1000 ; baseline F2500 from setup sheet";
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("F500");
    expect(r.text).toContain("; baseline F2500 from setup sheet");
  });

  it("modal G1 carries across blocks: blocks WITHOUT explicit motion inherit prior G1 and ARE scaled", () => {
    // G91.1, "Y2 F800", "Y3 F1200" use the modal G1 from line 1. The engine
    // tracks currentMotion via the per-line motionMatch — but only updates
    // when a G-code is present, so the inherited G1 persists. Verify scaling
    // applies on these inheriting blocks (NOT skipped as rapid).
    const gcode = ["G1 X1 F1000", "Y2 F800", "Y3 F1200"].join("\n");
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("F500"); // 1000*0.5
    expect(r.text).toContain("F400"); // 800*0.5
    expect(r.text).toContain("F600"); // 1200*0.5
    expect(r.feeds_scaled).toBe(3);
    expect(r.feeds_skipped).toBe(0);
  });

  it("adversarial: empty G-code yields empty changes, zero scaled, no crash", () => {
    const r = ppFeedSpeedScalerEngine.scale("", { feed_factor: 0.5 });
    expect(r.text).toBe("");
    expect(r.total_lines).toBe(1); // single empty line from split
    expect(r.feeds_scaled).toBe(0);
    expect(r.changes.length).toBe(0);
  });

  it("adversarial: feed_factor=0 emits a warning (probably unintended)", () => {
    const r = ppFeedSpeedScalerEngine.scale("G1 X1 F1000", { feed_factor: 0 });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0].toLowerCase()).toContain("feed_factor=0");
  });

  it("adversarial: non-F/S letter words (X/Y/Z/A/B/I/J/K/R) are NEVER touched", () => {
    const gcode = "G1 X100.5 Y-50.25 Z-2 F1000 R5";
    const r = ppFeedSpeedScalerEngine.scale(gcode, { feed_factor: 0.5 });
    expect(r.text).toContain("X100.5");
    expect(r.text).toContain("Y-50.25");
    expect(r.text).toContain("Z-2");
    expect(r.text).toContain("R5");
    expect(r.text).toContain("F500");
  });

  it("min_feed clamp: F50 with feed_factor=0.5 → 25, clamped UP to min_feed=100 (reason:clamped_min)", () => {
    const r = ppFeedSpeedScalerEngine.scale(
      "G1 X1 F50",
      { feed_factor: 0.5, min_feed: 100 },
    );
    expect(r.text).toContain("F100");
    expect(r.feeds_clamped).toBe(1);
    const fChange = r.changes.find((c) => c.letter === "F");
    expect(fChange?.reason).toBe("clamped_min");
  });

  it("round_decimals=0 produces integer F output", () => {
    // 1000 * 0.333 = 333.0 — verify the round-to-integer formatter.
    const r = ppFeedSpeedScalerEngine.scale(
      "G1 X1 F1000",
      { feed_factor: 0.333, round_decimals: 0 },
    );
    expect(r.text).toMatch(/F333\b/);
    expect(r.text).not.toContain("F333.");
  });

  it("returns the complete documented result contract (10 fields)", () => {
    const r = ppFeedSpeedScalerEngine.scale("G1 X1 F1000", { feed_factor: 0.5 });
    expect(typeof r.text).toBe("string");
    expect(typeof r.total_lines).toBe("number");
    expect(typeof r.total_bytes).toBe("number");
    expect(Array.isArray(r.changes)).toBe(true);
    expect(typeof r.feeds_scaled).toBe("number");
    expect(typeof r.speeds_scaled).toBe("number");
    expect(typeof r.feeds_clamped).toBe("number");
    expect(typeof r.speeds_clamped).toBe("number");
    expect(typeof r.feeds_skipped).toBe("number");
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
