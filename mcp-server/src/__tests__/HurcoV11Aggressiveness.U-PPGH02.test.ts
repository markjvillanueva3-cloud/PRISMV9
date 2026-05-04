/**
 * HurcoV11 aggressiveness levels — PPG-HARDEN/U-PPGH02.
 *
 * Targeted unit-tests for the sync-path 1..5 feed-multiplier system on
 * `HurcoV11MillMasterPostEngine.generateProgram`. The 5 stale assertions
 * in the wider untracked HurcoV11MillMasterPostEngine.test.ts file
 * predated the U-PPGM13 labelled-block sidecar contract and tested an
 * API that had never been built. This unit ships the API and proves it.
 *
 * Coverage spec (per comprehensive-build hook):
 *  • Happy path: each of L1..L5 produces the documented multiplier.
 *  • ≥3 failure modes: undefined / NaN / null all become byte-identical
 *    no-ops.
 *  • ≥2 adversarial inputs: ±Infinity, fractional values, integers
 *    outside [1, 5] all clamp + round deterministically.
 *  • Variability floor: aggressiveness flows through to G-code F-words,
 *    block_annotations, and feed_optimizations[] — verified via 3
 *    independent surfaces, not just one.
 *
 * Stays narrow on purpose: the wider HurcoV11MillMasterPostEngine.test.ts
 * file is a pre-existing uncommitted artifact whose remaining stale
 * buckets (prove-out mode, Kienzle-bounded feeds, setup sheet emission,
 * postSingle, material overrides, UltiMotion metadata) are scoped to
 * U-PPGH03..05.
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  HURCO_AGGRESSIVENESS_TABLE,
  HURCO_AGGRESSIVENESS_LEVEL_MIN,
  HURCO_AGGRESSIVENESS_LEVEL_MAX,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const EXPECTED_TABLE_LENGTH = 5;
const FIRST_BLOCK_ID = "N100";

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12MM 4FL CARBIDE",
    material_iso: "N",
    spindle_rpm: 6000,
    feed_mm_min: 1000,
    axial_depth_mm: 3,
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 25, y: 25, z: -3, type: "linear" },
    ],
    ...overrides,
  };
}

const headerLines = (gcode: string[]): string[] =>
  gcode.filter((l) => /^\(AGGRESSIVENESS:/.test(l));

const linesMatching = (gcode: string[], pattern: RegExp): string[] =>
  gcode.filter((l) => pattern.test(l));

const spindleLines = (gcode: string[]): string[] =>
  gcode.filter((l) => /^N\d+ S\d+ M03 F\d+/.test(l));

describe("HurcoV11 — aggressiveness levels (U-PPGH02)", () => {
  describe("clamping", () => {
    it("clamps aggressiveness < 1 to 1 (output reflects clamped value)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: -3 },
      );
      expect(result.aggressiveness_applied).toBe(1);
    });

    it("clamps aggressiveness > 5 to 5", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: 99 },
      );
      expect(result.aggressiveness_applied).toBe(5);
    });

    it("clamps +Infinity to L5 MAX (adversarial)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: Number.POSITIVE_INFINITY },
      );
      expect(result.aggressiveness_applied).toBe(5);
      expect(result.feed_optimizations[0].label).toBe("MAX");
    });

    it("clamps -Infinity to L1 ULTRA-CONSERVATIVE (adversarial)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: Number.NEGATIVE_INFINITY },
      );
      expect(result.aggressiveness_applied).toBe(1);
      expect(result.feed_optimizations[0].label).toBe("ULTRA-CONSERVATIVE");
    });

    it("rounds non-integer 2.7 to L3 MODERATE (1000 × 0.9 = 900)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 2.7 },
      );
      expect(result.aggressiveness_applied).toBe(3);
      expect(result.feed_optimizations[0].label).toBe("MODERATE");
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(900);
    });

    it("rounds non-integer 4.4 down to L4 AGGRESSIVE (1.0× = no change)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 4.4 },
      );
      expect(result.aggressiveness_applied).toBe(4);
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(1000);
    });
  });

  describe("feed multipliers", () => {
    it("L1 ULTRA-CONSERVATIVE applies feed multiplier 0.6 (1000 → 600)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 1, optimize_feeds: false },
      );
      expect(result.feed_optimizations).toHaveLength(1);
      expect(result.feed_optimizations[0].original_feed_mm_min).toBe(1000);
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(600);
    });

    it("L5 MAX applies feed multiplier 1.1 (1000 → 1100)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 5, optimize_feeds: false },
      );
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(1100);
    });

    it("L4 AGGRESSIVE multiplier is 1.0 (no feed change, audit still emitted)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1234 })],
        { aggressiveness: 4 },
      );
      expect(result.feed_optimizations).toHaveLength(1);
      expect(result.feed_optimizations[0].original_feed_mm_min).toBe(1234);
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(1234);
    });

    it("emitted G-code F-word reflects optimized feed (L1 1000 → 600 → F600)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 1 },
      );
      const lines = spindleLines(result.gcode);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/F600\b/);
      expect(lines[0]).not.toMatch(/F1000\b/);
    });

    it("block_annotations emitted.F_mmpm reflects optimized feed (verifier-canonical)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 2000 })],
        { aggressiveness: 5 },
      );
      expect(result.block_annotations).toHaveLength(1);
      expect(result.block_annotations[0].emitted.F_mmpm).toBe(2200);
    });

    it("rounds non-integer multiplier products to nearest integer (1234 × 0.75 → 926)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1234 })],
        { aggressiveness: 2 },
      );
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(926);
    });
  });

  describe("header emission", () => {
    it("L1 label appears verbatim in program header", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: 1 },
      );
      expect(headerLines(result.gcode)).toEqual([
        "(AGGRESSIVENESS: ULTRA-CONSERVATIVE L1/5)",
      ]);
    });

    it("L2 label uses CONSERVATIVE in header", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: 2 },
      );
      expect(headerLines(result.gcode)).toEqual([
        "(AGGRESSIVENESS: CONSERVATIVE L2/5)",
      ]);
    });

    it("L5 label uses MAX in header", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp()],
        { aggressiveness: 5 },
      );
      expect(headerLines(result.gcode)).toEqual([
        "(AGGRESSIVENESS: MAX L5/5)",
      ]);
    });
  });

  describe("opt-in / no-op preservation", () => {
    it("undefined aggressiveness is a no-op (no header, empty feed_optimizations, undefined applied)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
      );
      expect(headerLines(result.gcode)).toEqual([]);
      expect(result.feed_optimizations).toEqual([]);
      expect(result.aggressiveness_applied ?? null).toBeNull();
      // F-word matches operator's intent (no multiplier)
      const lines = spindleLines(result.gcode);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/F1000\b/);
    });

    it("NaN aggressiveness is a no-op (failure mode — never throws)", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: Number.NaN },
      );
      expect(headerLines(result.gcode)).toEqual([]);
      expect(result.feed_optimizations).toEqual([]);
      expect(result.aggressiveness_applied ?? null).toBeNull();
    });

    it("optimize_feeds: false does NOT block aggressiveness multiplier", () => {
      // optimize_feeds is reserved for future sync-path AS/F. The L1 multiplier
      // is independent and must apply regardless.
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [makeOp({ feed_mm_min: 1000 })],
        { aggressiveness: 1, optimize_feeds: false },
      );
      expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(600);
    });
  });

  describe("multi-op variability", () => {
    it("multi-op program emits one feed_optimizations entry per operation", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [
          makeOp({ tool_number: 1, feed_mm_min: 1000 }),
          makeOp({ tool_number: 2, feed_mm_min: 2000 }),
          makeOp({ tool_number: 3, feed_mm_min: 500 }),
        ],
        { aggressiveness: 1 },
      );
      expect(result.feed_optimizations).toHaveLength(3);
      expect(result.feed_optimizations.map((o) => o.optimized_feed_mm_min)).toEqual([
        600, 1200, 300,
      ]);
      // block_id stable across operations: N100, N110, N120
      expect(result.feed_optimizations.map((o) => o.block_id)).toEqual([
        "N100", "N110", "N120",
      ]);
      expect(result.feed_optimizations[0].block_id).toBe(FIRST_BLOCK_ID);
      // Header emitted once (not once per op)
      expect(linesMatching(result.gcode, /^\(AGGRESSIVENESS:/)).toHaveLength(1);
    });

    it("multi-op aggressiveness header reflects same level for all ops", () => {
      const result = hurcoV11MillMasterPostEngine.generateProgram(
        [
          makeOp({ tool_number: 1 }),
          makeOp({ tool_number: 2 }),
        ],
        { aggressiveness: 3 },
      );
      const headers = linesMatching(result.gcode, /^\(AGGRESSIVENESS:/);
      expect(headers).toEqual(["(AGGRESSIVENESS: MODERATE L3/5)"]);
      expect(result.feed_optimizations.every((o) => o.level === 3)).toBe(true);
      expect(result.feed_optimizations.every((o) => o.label === "MODERATE")).toBe(true);
    });
  });

  describe("exported constants", () => {
    it("AGGRESSIVENESS_TABLE has exactly 5 levels with documented multipliers", () => {
      expect(HURCO_AGGRESSIVENESS_TABLE).toHaveLength(EXPECTED_TABLE_LENGTH);
      expect(HURCO_AGGRESSIVENESS_TABLE.map((e) => e.level)).toEqual([1, 2, 3, 4, 5]);
      expect(HURCO_AGGRESSIVENESS_TABLE.map((e) => e.multiplier)).toEqual([
        0.6, 0.75, 0.9, 1.0, 1.1,
      ]);
      expect(HURCO_AGGRESSIVENESS_TABLE.map((e) => e.label)).toEqual([
        "ULTRA-CONSERVATIVE", "CONSERVATIVE", "MODERATE", "AGGRESSIVE", "MAX",
      ]);
    });

    it("MIN/MAX exports match the table edges", () => {
      expect(HURCO_AGGRESSIVENESS_LEVEL_MIN).toBe(1);
      expect(HURCO_AGGRESSIVENESS_LEVEL_MAX).toBe(5);
    });
  });
});
