/**
 * WEDMTier6GeomGateEngine — Comprehensive Tests
 *
 * MS-P3-TIER6A/U-P3-T6A-04
 *
 * Coverage:
 *   - Minimum radius computation (wire_dia + 2·gap)
 *   - Corner validation (pass, warning, hard_block)
 *   - Slot width validation
 *   - Station pitch validation for progressive dies
 *   - Machine envelope checks
 *   - Safety score S(x) computation
 *   - Tribal override behavior
 *   - Edge cases (NaN, Infinity, empty, zero, negative)
 *   - Batch validation
 *   - Wire recommendation for target radius
 */

import { describe, it, expect } from "vitest";
import {
  WEDMTier6GeomGateEngine,
  wedmTier6GeomGateEngine,
  Tier6GeomInput,
  CornerSpec,
  SlotSpec,
  StationSpec,
} from "../engines/WEDMTier6GeomGateEngine.js";

describe("WEDMTier6GeomGateEngine", () => {
  const engine = wedmTier6GeomGateEngine;

  // ════════════════════════════════════════════════════════════════════════════
  // MINIMUM RADIUS COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("computeMinRadius", () => {
    it("computes R_limit = wire_dia + 2·gap for standard 0.25mm wire", () => {
      const r = engine.computeMinRadius(0.25, 0.025);
      expect(r).toBe(0.3); // 0.25 + 2×0.025 = 0.30
    });

    it("computes correctly for 0.20mm fine wire", () => {
      const r = engine.computeMinRadius(0.20, 0.020);
      expect(r).toBeCloseTo(0.24, 10); // 0.20 + 2×0.020 = 0.24
    });

    it("computes correctly for 0.30mm heavy wire", () => {
      const r = engine.computeMinRadius(0.30, 0.030);
      expect(r).toBe(0.36); // 0.30 + 2×0.030 = 0.36
    });

    it("computes correctly for micro wire 0.10mm", () => {
      const r = engine.computeMinRadius(0.10, 0.015);
      expect(r).toBe(0.13); // 0.10 + 2×0.015 = 0.13
    });

    it("handles zero gap (theoretical minimum)", () => {
      const r = engine.computeMinRadius(0.25, 0);
      expect(r).toBe(0.25);
    });
  });

  describe("computeMinSlotWidth", () => {
    it("computes minimum slot width same as min radius", () => {
      const w = engine.computeMinSlotWidth(0.25, 0.025);
      expect(w).toBe(0.3);
    });

    it("scales with wire diameter", () => {
      const w1 = engine.computeMinSlotWidth(0.20, 0.025);
      const w2 = engine.computeMinSlotWidth(0.30, 0.025);
      expect(w1).toBe(0.25);
      expect(w2).toBe(0.35);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CORNER ACHIEVABILITY
  // ════════════════════════════════════════════════════════════════════════════

  describe("isCornerAchievable", () => {
    it("returns true for radius above minimum", () => {
      expect(engine.isCornerAchievable(0.5, 0.25, 0.025)).toBe(true);
    });

    it("returns true for radius exactly at minimum", () => {
      expect(engine.isCornerAchievable(0.3, 0.25, 0.025)).toBe(true);
    });

    it("returns false for radius below minimum", () => {
      expect(engine.isCornerAchievable(0.2, 0.25, 0.025)).toBe(false);
    });

    it("returns false for sharp corner (R=0)", () => {
      expect(engine.isCornerAchievable(0, 0.25, 0.025)).toBe(false);
    });

    it("uses default wire/gap when not specified", () => {
      expect(engine.isCornerAchievable(0.5)).toBe(true);
      expect(engine.isCornerAchievable(0.1)).toBe(false);
    });
  });

  describe("isSlotCuttable", () => {
    it("returns true for wide slot", () => {
      expect(engine.isSlotCuttable(1.0, 0.25, 0.025)).toBe(true);
    });

    it("returns false for narrow slot", () => {
      expect(engine.isSlotCuttable(0.2, 0.25, 0.025)).toBe(false);
    });

    it("returns true at exact minimum width", () => {
      expect(engine.isSlotCuttable(0.3, 0.25, 0.025)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // WIRE RECOMMENDATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("recommendWireForRadius", () => {
    it("recommends 0.30mm wire for 0.35mm radius", () => {
      const wire = engine.recommendWireForRadius(0.35, 0.025);
      expect(wire).toBe(0.30); // 0.35 - 0.05 = 0.30, largest that fits
    });

    it("recommends 0.20mm wire for 0.28mm radius", () => {
      const wire = engine.recommendWireForRadius(0.28, 0.025);
      expect(wire).toBe(0.20);
    });

    it("recommends 0.10mm wire for very small radius", () => {
      const wire = engine.recommendWireForRadius(0.15, 0.015);
      expect(wire).toBe(0.10);
    });

    it("recommends largest fitting wire for large radius", () => {
      const wire = engine.recommendWireForRadius(1.0, 0.025);
      expect(wire).toBe(0.30); // Largest standard size
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FULL VALIDATION - PASSING CASES
  // ════════════════════════════════════════════════════════════════════════════

  describe("validate - passing cases", () => {
    it("passes for valid progressive die geometry", () => {
      const input: Tier6GeomInput = {
        part_id: "PROG-DIE-001",
        thickness_mm: 25,
        part_width_mm: 200,
        part_height_mm: 100,
        corners: [
          { id: "C1", radius_mm: 0.5 },
          { id: "C2", radius_mm: 0.4 },
          { id: "C3", radius_mm: 0.36 }, // Well above 0.30 limit
        ],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.safety_score).toBeGreaterThanOrEqual(0.9);
      expect(result.corners).toHaveLength(3);
      expect(result.corners.every((c) => c.severity === "pass")).toBe(true);
    });

    it("passes with slots above minimum width", () => {
      const input: Tier6GeomInput = {
        part_id: "SLOT-TEST-001",
        thickness_mm: 20,
        part_width_mm: 150,
        part_height_mm: 80,
        slots: [
          { id: "S1", width_mm: 0.5, length_mm: 10 },
          { id: "S2", width_mm: 1.0, length_mm: 15 },
        ],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
      expect(result.slots.every((s) => s.severity === "pass")).toBe(true);
    });

    it("passes with part well within envelope", () => {
      const input: Tier6GeomInput = {
        part_id: "ENVELOPE-OK",
        thickness_mm: 50,
        part_width_mm: 200,
        part_height_mm: 150,
        machine_envelope_x_mm: 500,
        machine_envelope_y_mm: 350,
        machine_envelope_z_mm: 250,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
      expect(result.envelope.every((e) => e.severity === "pass")).toBe(true);
    });

    it("computes correct min_achievable_radius_mm", () => {
      const input: Tier6GeomInput = {
        part_id: "RADIUS-CHECK",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        wire_diameter_mm: 0.25,
        spark_gap_mm: 0.025,
      };

      const result = engine.validate(input);

      expect(result.min_achievable_radius_mm).toBe(0.3);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FULL VALIDATION - WARNING CASES
  // ════════════════════════════════════════════════════════════════════════════

  describe("validate - warning cases", () => {
    it("warns for corner radius close to limit", () => {
      const input: Tier6GeomInput = {
        part_id: "MARGINAL-CORNER",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [
          { id: "C1", radius_mm: 0.32 }, // Just 0.02mm above 0.30 limit
        ],
      };

      const result = engine.validate(input);

      expect(result.corners[0].severity).toBe("warning");
      expect(result.corners[0].margin_mm).toBeLessThan(0.05);
    });

    it("warns for slot width close to limit", () => {
      const input: Tier6GeomInput = {
        part_id: "MARGINAL-SLOT",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        slots: [{ id: "S1", width_mm: 0.32, length_mm: 5 }],
      };

      const result = engine.validate(input);

      expect(result.slots[0].severity).toBe("warning");
    });

    it("warns for part close to envelope edge", () => {
      const input: Tier6GeomInput = {
        part_id: "EDGE-PART",
        thickness_mm: 240,
        part_width_mm: 100,
        part_height_mm: 100,
        machine_envelope_z_mm: 250, // Only 4% margin
      };

      const result = engine.validate(input);

      expect(result.envelope.find((e) => e.dimension === "Z")?.severity).toBe("warning");
    });

    it("tribal override promotes warning to pass", () => {
      const input: Tier6GeomInput = {
        part_id: "TRIBAL-OVERRIDE",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0.32 }],
        tribal_override: true,
      };

      const result = engine.validate(input);

      expect(result.verdict).toBe("pass");
      expect(result.tribal_override_applied).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FULL VALIDATION - HARD BLOCK CASES
  // ════════════════════════════════════════════════════════════════════════════

  describe("validate - hard block cases", () => {
    it("hard blocks for sharp corner (R=0)", () => {
      const input: Tier6GeomInput = {
        part_id: "SHARP-CORNER",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0 }],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("hard_block");
      expect(result.corners[0].severity).toBe("hard_block");
    });

    it("hard blocks for corner below minimum radius", () => {
      const input: Tier6GeomInput = {
        part_id: "SMALL-CORNER",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0.2 }], // Below 0.30 limit
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("hard_block");
      expect(result.error_counts.hard_block).toBeGreaterThan(0);
    });

    it("hard blocks for slot below minimum width", () => {
      const input: Tier6GeomInput = {
        part_id: "NARROW-SLOT",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        slots: [{ id: "S1", width_mm: 0.2, length_mm: 10 }],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("hard_block");
    });

    it("hard blocks for part exceeding envelope", () => {
      const input: Tier6GeomInput = {
        part_id: "OVERSIZE",
        thickness_mm: 300, // Exceeds 250mm Z envelope
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("hard_block");
      expect(result.envelope.find((e) => e.dimension === "Z")?.severity).toBe("hard_block");
    });

    it("tribal override cannot bypass hard block", () => {
      const input: Tier6GeomInput = {
        part_id: "HARD-BLOCK-OVERRIDE",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0 }], // Sharp corner
        tribal_override: true,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("hard_block");
      expect(result.tribal_override_applied).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESSIVE DIE STATION VALIDATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("validate - progressive die stations", () => {
    it("validates station pitch in progressive die mode", () => {
      const input: Tier6GeomInput = {
        part_id: "PROG-DIE-PITCH",
        thickness_mm: 25,
        part_width_mm: 300,
        part_height_mm: 100,
        progressive_die_mode: true,
        station_pitch_mm: 50,
        stations: [
          { station_number: 1, pitch_mm: 50 },
          { station_number: 2, pitch_mm: 50.1 },
          { station_number: 3, pitch_mm: 49.9 },
        ],
      };

      const result = engine.validate(input);

      expect(result.stations).toHaveLength(3);
      expect(result.stations.every((s) => s.severity === "pass")).toBe(true);
    });

    it("warns for station pitch deviation", () => {
      const input: Tier6GeomInput = {
        part_id: "PROG-DIE-DEVIATE",
        thickness_mm: 25,
        part_width_mm: 300,
        part_height_mm: 100,
        progressive_die_mode: true,
        station_pitch_mm: 50,
        stations: [
          { station_number: 1, pitch_mm: 50 },
          { station_number: 2, pitch_mm: 50.4 }, // 0.8% deviation
        ],
      };

      const result = engine.validate(input);

      expect(result.stations[1].severity).toBe("warning");
    });

    it("errors for large station pitch deviation", () => {
      const input: Tier6GeomInput = {
        part_id: "PROG-DIE-ERROR",
        thickness_mm: 25,
        part_width_mm: 300,
        part_height_mm: 100,
        progressive_die_mode: true,
        station_pitch_mm: 50,
        stations: [{ station_number: 1, pitch_mm: 51 }], // 2% deviation
      };

      const result = engine.validate(input);

      expect(result.stations[0].severity).toBe("error");
    });

    it("skips station validation when not in progressive mode", () => {
      const input: Tier6GeomInput = {
        part_id: "NON-PROG",
        thickness_mm: 25,
        part_width_mm: 300,
        part_height_mm: 100,
        progressive_die_mode: false,
        station_pitch_mm: 50,
        stations: [{ station_number: 1, pitch_mm: 60 }], // Would fail if checked
      };

      const result = engine.validate(input);

      expect(result.stations).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SAFETY SCORE COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("safety score computation", () => {
    it("returns 1.0 for perfect geometry", () => {
      const input: Tier6GeomInput = {
        part_id: "PERFECT",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [
          { id: "C1", radius_mm: 1.0 },
          { id: "C2", radius_mm: 1.0 },
        ],
        slots: [{ id: "S1", width_mm: 2.0, length_mm: 10 }],
      };

      const result = engine.validate(input);

      expect(result.safety_score).toBe(1);
    });

    it("reduces score for warnings", () => {
      const input: Tier6GeomInput = {
        part_id: "WARNINGS",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [
          { id: "C1", radius_mm: 0.32 }, // Warning
          { id: "C2", radius_mm: 1.0 }, // Pass
        ],
      };

      const result = engine.validate(input);

      expect(result.safety_score).toBeLessThan(1);
      expect(result.safety_score).toBeGreaterThan(0.8);
    });

    it("score is 0 when all checks fail", () => {
      const input: Tier6GeomInput = {
        part_id: "ALL-FAIL",
        thickness_mm: 300, // Exceeds Z envelope
        part_width_mm: 600, // Exceeds X envelope
        part_height_mm: 400, // Exceeds Y envelope
        machine_envelope_x_mm: 500,
        machine_envelope_y_mm: 350,
        machine_envelope_z_mm: 250,
        corners: [
          { id: "C1", radius_mm: 0 },
          { id: "C2", radius_mm: 0 },
        ],
        slots: [
          { id: "S1", width_mm: 0.1, length_mm: 5 }, // Too narrow
        ],
      };

      const result = engine.validate(input);

      expect(result.safety_score).toBe(0);
      expect(result.error_counts.hard_block).toBeGreaterThanOrEqual(5);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe("recommendations", () => {
    it("recommends increasing corner radii", () => {
      const input: Tier6GeomInput = {
        part_id: "REC-CORNERS",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0.1 }],
      };

      const result = engine.validate(input);

      expect(result.recommendations.some((r) => r.includes("corner"))).toBe(true);
    });

    it("recommends adding fillets to sharp corners", () => {
      const input: Tier6GeomInput = {
        part_id: "REC-FILLETS",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0 }],
      };

      const result = engine.validate(input);

      expect(result.recommendations.some((r) => r.includes("fillet"))).toBe(true);
    });

    it("recommends finer wire for marginal corners", () => {
      const input: Tier6GeomInput = {
        part_id: "REC-WIRE",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [{ id: "C1", radius_mm: 0.32 }],
      };

      const result = engine.validate(input);

      expect(result.recommendations.some((r) => r.includes("wire"))).toBe(true);
    });

    it("recommends reducing part size for envelope violations", () => {
      const input: Tier6GeomInput = {
        part_id: "REC-ENVELOPE",
        thickness_mm: 300,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.recommendations.some((r) => r.includes("Reduce") || r.includes("larger machine"))).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EDGE CASES AND ADVERSARIAL INPUTS
  // ════════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty corners array", () => {
      const input: Tier6GeomInput = {
        part_id: "EMPTY-CORNERS",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
      expect(result.corners).toHaveLength(0);
    });

    it("handles empty slots array", () => {
      const input: Tier6GeomInput = {
        part_id: "EMPTY-SLOTS",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        slots: [],
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
      expect(result.slots).toHaveLength(0);
    });

    it("handles missing optional fields", () => {
      const input: Tier6GeomInput = {
        part_id: "MINIMAL",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(true);
    });

    it("returns invalid result for missing part_id", () => {
      const input = {
        part_id: "",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
      } as Tier6GeomInput;

      const result = engine.validate(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for zero thickness", () => {
      const input: Tier6GeomInput = {
        part_id: "ZERO-THICK",
        thickness_mm: 0,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for negative dimensions", () => {
      const input: Tier6GeomInput = {
        part_id: "NEGATIVE",
        thickness_mm: -20,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for NaN dimensions", () => {
      const input: Tier6GeomInput = {
        part_id: "NAN-TEST",
        thickness_mm: NaN,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for Infinity dimensions", () => {
      const input: Tier6GeomInput = {
        part_id: "INF-TEST",
        thickness_mm: Infinity,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BATCH VALIDATION
  // ════════════════════════════════════════════════════════════════════════════

  describe("validateBatch", () => {
    it("validates multiple parts in batch", () => {
      const parts: Tier6GeomInput[] = [
        {
          part_id: "BATCH-1",
          thickness_mm: 20,
          part_width_mm: 100,
          part_height_mm: 100,
          corners: [{ id: "C1", radius_mm: 0.5 }],
        },
        {
          part_id: "BATCH-2",
          thickness_mm: 25,
          part_width_mm: 150,
          part_height_mm: 120,
          corners: [{ id: "C1", radius_mm: 0.1 }], // Will fail
        },
        {
          part_id: "BATCH-3",
          thickness_mm: 30,
          part_width_mm: 200,
          part_height_mm: 150,
        },
      ];

      const results = engine.validateBatch(parts);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it("handles empty batch", () => {
      const results = engine.validateBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY MESSAGE
  // ════════════════════════════════════════════════════════════════════════════

  describe("summary message", () => {
    it("includes part ID and verdict", () => {
      const input: Tier6GeomInput = {
        part_id: "SUMMARY-TEST",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.summary).toContain("SUMMARY-TEST");
      expect(result.summary).toContain("PASS");
    });

    it("includes issue count for failures", () => {
      const input: Tier6GeomInput = {
        part_id: "ISSUES",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        corners: [
          { id: "C1", radius_mm: 0 },
          { id: "C2", radius_mm: 0 },
        ],
      };

      const result = engine.validate(input);

      expect(result.summary).toContain("issue");
    });

    it("includes S(x) score", () => {
      const input: Tier6GeomInput = {
        part_id: "SCORE-SUMMARY",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
      };

      const result = engine.validate(input);

      expect(result.summary).toContain("S(x)=");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // WIRE DIAMETER VARIATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe("wire diameter variations", () => {
    it("allows smaller corners with finer wire", () => {
      const input: Tier6GeomInput = {
        part_id: "FINE-WIRE",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        wire_diameter_mm: 0.15,
        spark_gap_mm: 0.020,
        corners: [{ id: "C1", radius_mm: 0.2 }], // Would fail with 0.25mm wire
      };

      const result = engine.validate(input);

      // With 0.15mm wire + 0.020 gap, min = 0.19mm
      expect(result.success).toBe(true);
      expect(result.min_achievable_radius_mm).toBe(0.19);
    });

    it("requires larger corners with heavy wire", () => {
      const input: Tier6GeomInput = {
        part_id: "HEAVY-WIRE",
        thickness_mm: 20,
        part_width_mm: 100,
        part_height_mm: 100,
        wire_diameter_mm: 0.30,
        spark_gap_mm: 0.030,
        corners: [{ id: "C1", radius_mm: 0.3 }], // Would pass with 0.25mm wire
      };

      const result = engine.validate(input);

      // With 0.30mm wire + 0.030 gap, min = 0.36mm
      expect(result.success).toBe(false);
      expect(result.min_achievable_radius_mm).toBe(0.36);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SINGLETON EXPORT
  // ════════════════════════════════════════════════════════════════════════════

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(wedmTier6GeomGateEngine).toBeInstanceOf(WEDMTier6GeomGateEngine);
    });

    it("has correct name and version", () => {
      expect(wedmTier6GeomGateEngine.name).toBe("WEDMTier6GeomGateEngine");
      expect(wedmTier6GeomGateEngine.version).toBe("1.0.0");
    });
  });

});
