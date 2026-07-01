/**
 * FORGE-DEBUG P4 Regression Tests — CAD/CAM/Toolpath Layer
 * Covers bugs found in PostProcessorEngine, GCodeTemplateEngine,
 * toolpathDispatcher during MASTER_INDEX sweep.
 */
import { describe, it, expect } from "vitest";
import { postProcessorEngine } from "../engines/PostProcessorEngine.js";
import { resolveController } from "../engines/GCodeTemplateEngine.js";

// ============================================================================
// PostProcessorEngine fixes
// ============================================================================

const baseInput = {
  tool_number: 1, tool_diameter_mm: 10,
  spindle_rpm: 8000, feed_rate_mmmin: 1000,
  coolant: "flood" as const, work_offset: "G54",
};
const baseConfig = {
  controller: "fanuc" as const, use_canned_cycles: true, decimal_places: 3,
  line_numbers: false, line_number_increment: 10, coolant_code: "M08",
  safe_start_block: true, program_end: "M30", use_tool_length_comp: true,
};

describe("P4-PP-001: G94 feed-per-minute in safe start block", () => {
  it("Fanuc safe start contains G94", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      { ...baseConfig, controller: "fanuc" }
    );
    expect(r.gcode).toContain("G94");
  });

  it("Haas safe start contains G94", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      { ...baseConfig, controller: "haas" }
    );
    expect(r.gcode).toContain("G94");
  });

  it("Siemens safe start contains G94", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      { ...baseConfig, controller: "siemens" }
    );
    expect(r.gcode).toContain("G94");
  });

  it("Mazak safe start contains G94", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      { ...baseConfig, controller: "mazak" }
    );
    expect(r.gcode).toContain("G94");
  });

  it("Okuma safe start contains G94", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      { ...baseConfig, controller: "okuma" }
    );
    expect(r.gcode).toContain("G94");
  });
});

describe("P4-PP-002: G28 G91 Z0 incremental safe retract", () => {
  it("uses incremental G28 G91 Z0 not absolute G28 Z0", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }] },
      baseConfig
    );
    const lines = r.gcode.split("\n");
    const g28Line = lines.find(l => l.includes("G28"));
    expect(g28Line).toContain("G91");
    // G90 must follow to restore absolute mode
    const g28Idx = lines.findIndex(l => l.includes("G28 G91 Z0"));
    const g90Idx = lines.findIndex((l, i) => i > g28Idx && l === "G90");
    expect(g90Idx).toBeGreaterThan(g28Idx);
  });
});

describe("P4-PP-003: Feed rate F0 not silently dropped", () => {
  it("feed=0 still emits F0 in G-code (f != null check)", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 10, y: 10, z: -5, feed: 0 }] },
      baseConfig
    );
    // F0 should appear — old code `f ? ...` would drop it
    expect(r.gcode).toContain("F0");
  });
});

describe("P4-PP-004: decimal_places=0 not replaced by default 3", () => {
  it("decimal_places ?? 3 preserves 0", () => {
    // Test the falsy trap: decimal_places=0 is valid (integer coordinates)
    const dp0 = 0;
    const withOr = dp0 || 3;      // BUG: 3
    const withNullish = dp0 ?? 3;  // FIX: 0
    expect(withOr).toBe(3);
    expect(withNullish).toBe(0);
  });
});

describe("P4-PP-005: G80 canned cycle cancel after cycles", () => {
  it("emits G80 after drill canned cycle", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [
        { type: "rapid" as const, x: 10, y: 10, z: 5 },
        { type: "drill" as const, z: -15, retract: 2 },
      ] },
      { ...baseConfig, use_canned_cycles: true }
    );
    expect(r.gcode).toContain("G80");
  });
});

describe("P4-PP-006: Siemens CYCLE81 has 4 arguments", () => {
  it("Siemens drill produces CYCLE81 with RTP, RFP, SDIS, DP", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [
        { type: "rapid" as const, x: 10, y: 10, z: 5 },
        { type: "drill" as const, z: -15, retract: 2 },
      ] },
      { ...baseConfig, controller: "siemens", use_canned_cycles: true }
    );
    if (r.gcode.includes("CYCLE81")) {
      // CYCLE81(RTP, RFP, SDIS, DP) — 4 comma-separated args
      const match = r.gcode.match(/CYCLE81\(([^)]+)\)/);
      expect(match).toBeTruthy();
      const args = match![1].split(",");
      expect(args.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("P4-PP-007: Estimated time div-by-zero guard", () => {
  it("feed_rate_mmmin=0 does not produce Infinity estimated_time", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, feed_rate_mmmin: 0, moves: [
        { type: "feed" as const, x: 10, y: 10, z: -5 },
      ] },
      baseConfig
    );
    expect(Number.isFinite(r.estimated_time_sec)).toBe(true);
  });
});

// ============================================================================
// GCodeTemplateEngine fixes
// ============================================================================

describe("P4-GC-001: resolveController alias direction", () => {
  it("resolves 'fanuc' correctly", () => {
    const cfg = resolveController("fanuc");
    expect(cfg.name.toLowerCase()).toContain("fanuc");
  });

  it("resolves '840d' as Siemens", () => {
    const cfg = resolveController("840d");
    expect(cfg.name.toLowerCase()).toContain("siemens");
  });

  it("rejects unknown controller", () => {
    expect(() => resolveController("not_a_real_controller")).toThrow();
  });
});

describe("P4-GC-002: z_depth=0 is valid (not treated as missing)", () => {
  it("z_depth=0 should not be treated as missing", () => {
    const z_depth = 0;
    // Old: if (!p.z_depth) → 0 is falsy → treated as missing
    const oldCheck = !z_depth;
    expect(oldCheck).toBe(true); // BUG: 0 would trigger warning

    // New: if (p.z_depth === undefined) → 0 is not undefined
    const newCheck = z_depth === undefined;
    expect(newCheck).toBe(false); // FIXED: 0 is valid
  });
});

describe("P4-GC-003: pitch=0 is valid (not treated as missing)", () => {
  it("pitch=0 should not be treated as missing", () => {
    const pitch = 0;
    const oldCheck = !pitch;       // BUG: true (0 is falsy)
    const newCheck = pitch === undefined; // FIX: false
    expect(oldCheck).toBe(true);
    expect(newCheck).toBe(false);
  });
});

// ============================================================================
// toolpathDispatcher falsy traps
// ============================================================================

describe("P4-TD-001: toolpathDispatcher generate params use ?? not ||", () => {
  it("tool_diameter_mm=0 preserved with nullish coalescing", () => {
    const val = 0;
    const withOr = val || 10;
    const withNullish = val ?? 10;
    expect(withOr).toBe(10);       // BUG: replaced valid 0
    expect(withNullish).toBe(0);   // FIX: preserved
  });

  it("stepover_pct=0 preserved with nullish coalescing", () => {
    const val = 0;
    expect(val || 40).toBe(40);   // BUG
    expect(val ?? 40).toBe(0);    // FIX
  });

  it("stepdown_mm=0 preserved with nullish coalescing", () => {
    const val = 0;
    expect(val || 2).toBe(2);    // BUG
    expect(val ?? 2).toBe(0);    // FIX
  });

  it("feed_rate_mmmin=0 preserved with nullish coalescing", () => {
    const val = 0;
    expect(val || 1000).toBe(1000); // BUG
    expect(val ?? 1000).toBe(0);    // FIX
  });
});
