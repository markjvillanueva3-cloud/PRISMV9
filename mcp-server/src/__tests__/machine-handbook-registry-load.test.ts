/**
 * machine-handbook-registry-load.test.ts — DB-COVERAGE-GAPFILL-MS0 / U-MACH02
 *
 * Regression test for the silent-degradation bug: the 8 shipped machine
 * handbooks all carried `null` on optional fields (e.g. coolant_specs
 * filtration_um, concentration_pct_min), which Zod `.optional()` REJECTS
 * (it accepts an absent key, not an explicit null). Every such handbook
 * failed `MachineHandbookSchema.parse` and was silently dropped by init()'s
 * try/catch — degrading the registry to loading 0 of 8 handbooks while every
 * downstream consumer (SpeedFeedOrchestrator, MachineCapabilityIntelligence,
 * SVI, FeedRateOptimization) silently got nothing for those machines.
 *
 * Fix: `stripNullLeaves` normalizes null → absent before validation. This
 * test locks the fix:
 *   1. the registry loads the full corpus (>= 11: 8 resurrected + 3 JM mills)
 *   2. previously-dead handbooks resolve AND retain their rich content
 *      (alarm codes, parts book) — proving resurrection, not empty shells
 *   3. stripNullLeaves itself is lossless for non-null data and drops nulls
 *
 * R9: each assertion fails if the bug regresses (a null re-creeps in, or the
 * preprocess is removed) — none is satisfiable by a stub.
 */
import { describe, it, expect } from "vitest";
import {
  machineHandbookRegistry,
  stripNullLeaves,
} from "../engines/MachineHandbookRegistryEngine.js";

describe("MachineHandbookRegistry load — null-leaf resurrection (U-MACH02)", () => {
  it("loads the full handbook corpus (>= 11 = 8 resurrected + 3 JM mills)", () => {
    // Pre-fix this was 3 (only the null-free JM mills); the 8 legacy handbooks
    // were silently skipped. Anything < 11 means a handbook is failing to load.
    expect(machineHandbookRegistry.size).toBeGreaterThanOrEqual(11);
  });

  it("previously-dead handbooks now resolve by id", () => {
    // okuma-mu-5000v was the richest (and a confirmed member of the skip list).
    const mu = machineHandbookRegistry.get("okuma-mu-5000v");
    expect(mu?.id).toBe("okuma-mu-5000v");
    expect(mu?.manufacturer).toBe("Okuma");
  });

  it("resurrected handbooks retain their rich service-manual content (not empty shells)", () => {
    // The okuma-mu-5000v handbook carries real alarm codes + a parts book +
    // a torque curve. If the strip had been lossy (or the file loaded as a
    // shell), these would be empty. This proves the resurrection is faithful.
    const mu = machineHandbookRegistry.get("okuma-mu-5000v")!;
    expect(mu.alarm_codes.length).toBeGreaterThanOrEqual(10);
    expect(mu.parts_book.length).toBeGreaterThanOrEqual(5);
    expect((mu.spindle_specs?.torque_curve?.length ?? 0)).toBeGreaterThanOrEqual(5);
    // A real OEM part number survives (legacy 0.95/manual-tier data is preserved).
    const hasOemPart = mu.parts_book.some((p) => p.oem_part_number.startsWith("E"));
    expect(hasOemPart).toBe(true);
  });

  it("the legacy corpus covers multiple manufacturers (Okuma + at least 2 others)", () => {
    const stats = machineHandbookRegistry.stats();
    const manufacturers = Object.keys(stats.by_manufacturer);
    expect(manufacturers).toContain("Okuma");
    // The legacy corpus includes DMG, Doosan, Makino, Mazak, Roku-Roku.
    expect(manufacturers.length).toBeGreaterThanOrEqual(4);
  });

  describe("stripNullLeaves", () => {
    it("drops null-valued keys at every depth while preserving real data", () => {
      const input = {
        a: 1,
        b: null,
        c: { d: null, e: 2, f: { g: null, h: "keep" } },
        arr: [{ i: null, j: 3 }, { k: 4 }],
        zero: 0,
        falsy: false,
        empty: "",
      };
      const out = stripNullLeaves(input);
      expect(out).toEqual({
        a: 1,
        c: { e: 2, f: { h: "keep" } },
        arr: [{ j: 3 }, { k: 4 }],
        zero: 0,
        falsy: false,
        empty: "",
      });
    });

    it("is a no-op for data that contains no nulls", () => {
      const clean = { x: 1, y: { z: [2, 3] }, s: "ok" };
      expect(stripNullLeaves(clean)).toEqual(clean);
    });

    it("preserves primitives and arrays at the top level", () => {
      expect(stripNullLeaves(42)).toBe(42);
      expect(stripNullLeaves("str")).toBe("str");
      expect(stripNullLeaves([1, null, 2])).toEqual([1, null, 2]); // null array ELEMENTS are not properties — kept
    });
  });
});
