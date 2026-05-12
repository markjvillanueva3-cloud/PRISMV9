/**
 * PPFeedSpeedScalerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPFeedSpeedScalerEngine,
  ppFeedSpeedScalerEngine,
} from "../engines/PPFeedSpeedScalerEngine.js";

const SAMPLE = `%
O1001 (FEED TEST)
G90 G21 G17
G54
T1 M6
S2000 M3
M8
G0 X10 Y10 F5000
G0 Z5
G1 Z-1 F200
G1 X50 F300
G1 Y40 F250
G0 Z25
M9
M5
M30
%`;

describe("PPFeedSpeedScalerEngine", () => {
  it("exports singleton", () => {
    expect(ppFeedSpeedScalerEngine).toBeInstanceOf(PPFeedSpeedScalerEngine);
  });

  describe("identity (no scaling)", () => {
    it("returns input unchanged when factor=1 and no clamp", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE);
      // All F-words present, unchanged values
      expect(r.text).toContain("F200");
      expect(r.text).toContain("F300");
      expect(r.text).toContain("F250");
    });

    it("feeds_scaled = 0 for identity", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE);
      expect(r.feeds_scaled).toBe(0);
    });
  });

  describe("uniform feed scale", () => {
    it("halves all feed rates at 0.5 factor", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      expect(r.text).toContain("F100");
      expect(r.text).toContain("F150");
      expect(r.text).toContain("F125");
      expect(r.text).not.toContain("F200");
    });

    it("doubles feeds at 2x factor", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 2 });
      expect(r.text).toContain("F400");
      expect(r.text).toContain("F600");
      expect(r.text).toContain("F500");
    });

    it("convenience scaleFeed() method works", () => {
      const r = ppFeedSpeedScalerEngine.scaleFeed(SAMPLE, 0.5);
      expect(r.text).toContain("F100");
    });

    it("records changes array with original and new values", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      const f200 = r.changes.find(c => c.original_value === 200);
      expect(f200).toBeDefined();
      expect(f200!.new_value).toBe(100);
    });
  });

  describe("uniform speed scale", () => {
    it("halves spindle speeds at 0.5 factor", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { speed_factor: 0.5 });
      expect(r.text).toContain("S1000");
      expect(r.text).not.toContain("S2000");
    });

    it("scaleSpeed() convenience", () => {
      const r = ppFeedSpeedScalerEngine.scaleSpeed(SAMPLE, 1.5);
      expect(r.text).toContain("S3000");
    });

    it("speeds_scaled increments by 1 for single S-word", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { speed_factor: 0.5 });
      expect(r.speeds_scaled).toBeGreaterThanOrEqual(1);
    });
  });

  describe("skip_rapid_feeds", () => {
    it("default=true skips F on G0 blocks", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      // G0 X10 Y10 F5000 → F5000 stays (not scaled) because G0 is a rapid
      expect(r.text).toContain("F5000");
      expect(r.feeds_skipped).toBeGreaterThan(0);
    });

    it("false=scales all F regardless of motion", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 0.5,
        skip_rapid_feeds: false,
      });
      expect(r.text).toContain("F2500"); // 5000 * 0.5
      expect(r.text).not.toContain("F5000");
    });
  });

  describe("max_feed clamp", () => {
    it("clamps scaled feed to max_feed", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 10,  // aggressive upscale
        max_feed: 500,
      });
      // All feeds >= 50 would become >= 500, so all get clamped to 500
      expect(r.text).toContain("F500");
      expect(r.text).not.toContain("F2000");
      expect(r.feeds_clamped).toBeGreaterThan(0);
    });

    it("records reason=clamped_max", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 10,
        max_feed: 500,
      });
      expect(r.changes.some(c => c.reason === "clamped_max")).toBe(true);
    });
  });

  describe("min_feed clamp", () => {
    it("clamps scaled feed to min_feed", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 0.1,  // very low
        min_feed: 50,
      });
      // Feeds like 200*0.1 = 20 → clamped to 50
      expect(r.text).toContain("F50");
    });
  });

  describe("max_speed clamp", () => {
    it("clamps scaled speed to max_speed", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        speed_factor: 10,
        max_speed: 8000,
      });
      // S2000 * 10 = 20000, clamped to 8000
      expect(r.text).toContain("S8000");
      expect(r.speeds_clamped).toBeGreaterThan(0);
    });
  });

  describe("feed range filter", () => {
    it("only scales feeds within [range_min, range_max]", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 2,
        feed_range_min: 200,
        feed_range_max: 250,
      });
      // F200 → 400 (in range)
      // F250 → 500 (in range)
      // F300 → not touched (out of range)
      // F5000 → not touched (skip_rapid + out of range)
      expect(r.text).toContain("F400");
      expect(r.text).toContain("F500");
      expect(r.text).toContain("F300"); // untouched
    });
  });

  describe("clampFeedTo convenience", () => {
    it("clamps without rescaling", () => {
      const r = ppFeedSpeedScalerEngine.clampFeedTo(SAMPLE, 250);
      expect(r.text).toContain("F200"); // below limit, unchanged
      expect(r.text).toContain("F250"); // at limit, unchanged
      expect(r.text).not.toContain("F300"); // above limit → clamped to 250
    });
  });

  describe("change tracking", () => {
    it("each scaled F-word generates a change entry", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, {
        feed_factor: 0.5,
        skip_rapid_feeds: false,
      });
      const fChanges = r.changes.filter(c => c.letter === "F" && c.reason === "scaled");
      expect(fChanges.length).toBeGreaterThanOrEqual(4);
    });

    it("records line_number of each change", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      for (const c of r.changes) {
        expect(c.line_number).toBeGreaterThan(0);
      }
    });
  });

  describe("warnings", () => {
    it("warns on feed_factor=0", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0 });
      expect(r.warnings.some(w => w.includes("feed_factor"))).toBe(true);
    });

    it("warns on speed_factor=0", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { speed_factor: 0 });
      expect(r.warnings.some(w => w.includes("speed_factor"))).toBe(true);
    });
  });

  describe("preservation", () => {
    it("preserves comments", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      expect(r.text).toContain("(FEED TEST)");
    });

    it("preserves program number", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      expect(r.text).toContain("O1001");
    });

    it("preserves M-codes", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      expect(r.text).toContain("M30");
      expect(r.text).toContain("M6");
      expect(r.text).toContain("M3");
    });

    it("preserves axis coordinates", () => {
      const r = ppFeedSpeedScalerEngine.scale(SAMPLE, { feed_factor: 0.5 });
      expect(r.text).toContain("X50");
      expect(r.text).toContain("Y40");
      expect(r.text).toContain("Z-1");
    });
  });

  describe("decimal rounding", () => {
    it("rounds to 4 decimals by default", () => {
      const code = "G1 X10 F333.33333\nM30";
      const r = ppFeedSpeedScalerEngine.scale(code, {
        feed_factor: 0.3333333,
      });
      // 333.33333 * 0.3333333 = 111.111 (approximately, rounded to 4 places)
      // Token should be a clean decimal
      const fMatch = r.text.match(/F(\d+\.?\d*)/);
      expect(fMatch).not.toBeNull();
      const decimals = fMatch![1].split(".")[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(4);
    });

    it("respects custom round_decimals", () => {
      const code = "G1 X10 F333.33333\nM30";
      const r = ppFeedSpeedScalerEngine.scale(code, {
        feed_factor: 0.3333,
        round_decimals: 1,
      });
      const fMatch = r.text.match(/F(\d+\.?\d*)/);
      const decimals = fMatch![1].split(".")[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppFeedSpeedScalerEngine.scale("", { feed_factor: 0.5 });
      expect(r.feeds_scaled).toBe(0);
      expect(r.speeds_scaled).toBe(0);
    });

    it("handles program with no F or S words", () => {
      const code = "G90 G21\nG0 X10 Y10\nM30";
      const r = ppFeedSpeedScalerEngine.scale(code, { feed_factor: 0.5 });
      expect(r.text).toBe(code);
      expect(r.feeds_scaled).toBe(0);
    });

    it("handles F-word inside comment — does not modify", () => {
      const code = "G1 X10 (F200 COMMENT) F300\nM30";
      const r = ppFeedSpeedScalerEngine.scale(code, { feed_factor: 0.5 });
      expect(r.text).toContain("(F200 COMMENT)");
      expect(r.text).toContain("F150"); // 300 * 0.5 only on real F-word
    });

    it("handles negative F values (shouldn't crash)", () => {
      const code = "G1 F-100\nM30";
      const r = ppFeedSpeedScalerEngine.scale(code, { feed_factor: 0.5 });
      expect(r.total_lines).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns identity defaults", () => {
      const opts = ppFeedSpeedScalerEngine.defaultOptions();
      expect(opts.feed_factor).toBe(1);
      expect(opts.speed_factor).toBe(1);
      expect(opts.skip_rapid_feeds).toBe(true);
    });
  });
});
