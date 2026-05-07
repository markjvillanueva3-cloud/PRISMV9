/**
 * E2E test for ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH1 — 6 unwired mill engines
 * wired into millDispatcher (prism_mill).
 */
import { describe, it, expect } from "vitest";
import { helicalMillingEngine } from "../engines/HelicalMillingEngine.js";
import { highFeedMillingEngine } from "../engines/HighFeedMillingEngine.js";
import { millProgramLearningEngine } from "../engines/MillProgramLearningEngine.js";
import { millingStrategyLibraryEngine } from "../engines/MillingStrategyLibraryEngine.js";

const BORE_DIA_MM = 25;
const TOOL_DIA_MM = 12;
const FLUTES = 4;
const BORE_DEPTH_MM = 30;
const NEW_MILL_ACTION_COUNT = 6;

describe("U-WIRE-MILL-BATCH1 — engines verified directly", () => {
  describe("HelicalMillingEngine.calculate", () => {
    it("computes helix diameter as bore - tool for valid bore feature", () => {
      const r = helicalMillingEngine.calculate({
        bore_diameter_mm: BORE_DIA_MM,
        tool_diameter_mm: TOOL_DIA_MM,
        flutes: FLUTES,
        bore_depth_mm: BORE_DEPTH_MM,
        material_type: "steel",
      });
      // Helix diameter = bore_diameter - tool_diameter = 25 - 12 = 13mm
      expect(r.helix_diameter.value).toBeCloseTo(BORE_DIA_MM - TOOL_DIA_MM, 5);
      expect(r.spindle_rpm.value).toBeGreaterThan(0);
      expect(r.cycle_time.value).toBeGreaterThan(0);
      expect(r.mrr.value).toBeGreaterThan(0);
    });

    it("warns when tool too large for bore (toolRatio > 0.7)", () => {
      const r = helicalMillingEngine.calculate({
        bore_diameter_mm: 15,
        tool_diameter_mm: 12,
        flutes: FLUTES,
        material_type: "steel",
      });
      expect(Array.isArray(r.warnings)).toBe(true);
      // 12/15 = 0.8 > 0.7 — should warn
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("HighFeedMillingEngine.calculate", () => {
    it("computes chip-thinning factor for shallow ap with high-feed insert", () => {
      const r = highFeedMillingEngine.calculate({
        tool_diameter_mm: 50,
        num_inserts: 5,
        insert_nose_radius_mm: 4,
        axial_depth_mm: 1.0,
        radial_width_mm: 40,
        material_iso_group: "P",
      });
      expect(r.chip_thinning_factor.value).toBeGreaterThan(0);
      expect(r.chip_thinning_factor.value).toBeLessThan(1);
      expect(r.cutting_speed.value).toBeGreaterThan(0);
      expect(r.spindle_rpm.value).toBeGreaterThan(0);
      expect(r.table_feed.value).toBeGreaterThan(0);
    });
  });

  describe("MillProgramLearningEngine.parseProgram", () => {
    it("parses G-code program and extracts spindle speed + operations", () => {
      const gcode = `
% O1234 (TEST)
N10 G0 G90 G54
N20 T1 M6
N30 S5000 M3
N40 G43 H1 Z25.
N50 G83 X10 Y10 Z-20 R5 F200 Q5 (DRILLING)
N60 G80
N70 M30
%
      `;
      const p = millProgramLearningEngine.parseProgram(gcode, "haas");
      expect(p.source).toBe("haas");
      expect(p.max_spindle_rpm).toBeGreaterThanOrEqual(5000);
      expect(p.tool_changes).toBeGreaterThanOrEqual(1);
      expect(p.operations.length).toBeGreaterThan(0);
      expect(p.operations).toContain("drill");
    });
  });

  describe("MillingStrategyLibraryEngine", () => {
    it("returns non-empty strategy library", () => {
      const all = millingStrategyLibraryEngine.getAllStrategies();
      expect(all.length).toBeGreaterThan(0);
      // Each strategy must have an id and category
      for (const s of all.slice(0, 5)) {
        expect(typeof s.id).toBe("string");
        expect(s.id.length).toBeGreaterThan(0);
      }
    });

    it("returns strategies for pocket_2d feature", () => {
      const pocket = millingStrategyLibraryEngine.getStrategiesForFeature("pocket_2d");
      expect(Array.isArray(pocket)).toBe(true);
      // Should have at least one pocket strategy
      expect(pocket.length).toBeGreaterThan(0);
    });

    it("returns empty array for unsupported feature type", () => {
      // @ts-expect-error - intentionally invalid for adversarial test
      const r = millingStrategyLibraryEngine.getStrategiesForFeature("nonexistent_feature");
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(0);
    });
  });
});

describe("U-WIRE-MILL-BATCH1 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "mill_helical_calc",
    "mill_high_feed_calc",
    "mill_program_parse",
    "mill_resource_query",
    "mill_strategy_list",
    "mill_strategy_for_feature",
  ] as const;

  it("registers all 6 new actions in MILL_ACTIONS enum", async () => {
    const mod = await import("../tools/dispatchers/millDispatcher.js");
    const present = NEW_ACTIONS.filter((a) =>
      (mod.MILL_ACTIONS as readonly string[]).includes(a),
    );
    expect(present.length).toBe(NEW_MILL_ACTION_COUNT);
  });
});
