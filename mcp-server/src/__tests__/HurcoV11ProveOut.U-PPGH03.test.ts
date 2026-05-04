/**
 * HurcoV11 prove-out mode — PPG-HARDEN/U-PPGH03.
 *
 * Targeted unit-tests for the sync-path prove-out system on
 * `HurcoV11MillMasterPostEngine.generateProgram`. The 4 stale assertions
 * in the wider untracked HurcoV11MillMasterPostEngine.test.ts file
 * (lines 421-455) tested an API that had never been built. This unit
 * ships the API and proves it through 24 focused cases.
 *
 * Contract (extracted from the stale tests + operator UX intent):
 *   cfg.prove_out = {
 *     enabled: boolean,
 *     feed_factor?: number = 0.5,         // clamped to [0, 1]
 *     add_optional_stops?: boolean = true, // emit M01 between ops
 *   }
 *   result.prove_out_mode === true|false
 *   result.feed_optimizations[i] gets a PROVE-OUT entry per op
 *   M01 (OPTIONAL STOP - PROVE OUT) emitted between ops, never before
 *   the first op or after the last.
 *
 * Coverage spec (per comprehensive-build hook):
 *  • Happy path — default 0.5 factor, custom factor, M01 emission.
 *  • ≥3 failure modes — undefined / { enabled: false } / empty ops.
 *  • ≥2 adversarial inputs — NaN / ±Infinity / out-of-range / non-numeric.
 *  • Variability floor — prove-out flows through to G-code F-words,
 *    block_annotations, feed_optimizations[], and cycle time across
 *    multiple op counts (1, 2, 3 ops) and combos (with/without
 *    aggressiveness).
 *
 * Stays narrow on purpose: U-PPGH04 (Kienzle-bounded feed cap) and
 * U-PPGH05 (setup sheet + postSingle) are still pending; the wider
 * untracked test file remains uncommitted.
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  PROVE_OUT_DEFAULT_FEED_FACTOR,
  PROVE_OUT_FEED_FACTOR_MIN,
  PROVE_OUT_FEED_FACTOR_MAX,
  PROVE_OUT_LABEL,
  PROVE_OUT_LEVEL_SENTINEL,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

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

const linesMatching = (gcode: string[], pattern: RegExp): string[] =>
  gcode.filter((l) => pattern.test(l));

const headerLines = (gcode: string[]): string[] =>
  linesMatching(gcode, /^\(PROVE-OUT MODE:/);

const aggressivenessHeaderLines = (gcode: string[]): string[] =>
  linesMatching(gcode, /^\(AGGRESSIVENESS:/);

describe("HurcoV11 prove-out — exported constants are stable", () => {
  it("PROVE_OUT_DEFAULT_FEED_FACTOR is 0.5 (half-feed default)", () => {
    expect(PROVE_OUT_DEFAULT_FEED_FACTOR).toBe(0.5);
  });

  it("PROVE_OUT_FEED_FACTOR_MIN/MAX are [0, 1]", () => {
    expect(PROVE_OUT_FEED_FACTOR_MIN).toBe(0);
    expect(PROVE_OUT_FEED_FACTOR_MAX).toBe(1);
  });

  it("PROVE_OUT_LEVEL_SENTINEL is 0 (off the L1..L5 aggressiveness scale)", () => {
    expect(PROVE_OUT_LEVEL_SENTINEL).toBe(0);
  });

  it("PROVE_OUT_LABEL is 'PROVE-OUT'", () => {
    expect(PROVE_OUT_LABEL).toBe("PROVE-OUT");
  });
});

describe("HurcoV11 prove-out — happy path (matches stale-test contract)", () => {
  it("default prove-out feed_factor 0.5 halves feed (1000 → 500)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true }, optimize_feeds: false },
    );
    expect(result.prove_out_mode).toBe(true);
    expect(result.feed_optimizations).toHaveLength(1);
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(500);
    expect(result.feed_optimizations[0].original_feed_mm_min).toBe(1000);
  });

  it("custom feed_factor 0.3 honored (1000 → 300)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: 0.3 }, optimize_feeds: false },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(300);
  });

  it("custom feed_factor 0.1 honored at the conservative end (1000 → 100)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: 0.1 } },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(100);
    expect(result.feed_optimizations[0].multiplier).toBeCloseTo(0.1, 5);
  });

  it("emits exactly one M01 between two ops (none before first op)", () => {
    const ops = [makeOp({ tool_number: 1 }), makeOp({ tool_number: 2 })];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true },
    });
    const m01s = linesMatching(result.gcode, /^M01 \(OPTIONAL STOP - PROVE OUT\)/);
    expect(m01s.length).toBe(1);
  });

  it("emits exactly N-1 M01s for N ops (3 ops → 2 stops)", () => {
    const ops = [
      makeOp({ tool_number: 1 }),
      makeOp({ tool_number: 2 }),
      makeOp({ tool_number: 3 }),
    ];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true },
    });
    const m01s = linesMatching(result.gcode, /^M01 \(OPTIONAL STOP - PROVE OUT\)/);
    expect(m01s.length).toBe(2);
  });

  it("single op produces zero M01 (none before, none after only op)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ tool_number: 1 })],
      { prove_out: { enabled: true } },
    );
    const m01s = linesMatching(result.gcode, /^M01 /);
    expect(m01s.length).toBe(0);
  });

  it("add_optional_stops: false suppresses M01 even with prove-out enabled", () => {
    const ops = [makeOp({ tool_number: 1 }), makeOp({ tool_number: 2 })];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true, add_optional_stops: false },
    });
    expect(linesMatching(result.gcode, /OPTIONAL STOP/).length).toBe(0);
  });

  it("add_optional_stops: false still applies feed reduction", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, add_optional_stops: false } },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(500);
  });
});

describe("HurcoV11 prove-out — header line emission", () => {
  it("emits prove-out header when enabled with stops on", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      { prove_out: { enabled: true } },
    );
    const headers = headerLines(result.gcode);
    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatch(/feed_factor=0\.50/);
    expect(headers[0]).toMatch(/optional_stops=ON/);
  });

  it("header reflects custom feed_factor (formatted to 2dp)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      { prove_out: { enabled: true, feed_factor: 0.25 } },
    );
    expect(headerLines(result.gcode)[0]).toMatch(/feed_factor=0\.25/);
  });

  it("header shows optional_stops=OFF when stops suppressed", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      { prove_out: { enabled: true, add_optional_stops: false } },
    );
    expect(headerLines(result.gcode)[0]).toMatch(/optional_stops=OFF/);
  });

  it("no prove-out header when caller omits prove_out", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], {});
    expect(headerLines(result.gcode)).toHaveLength(0);
    expect(result.prove_out_mode).toBe(false);
  });
});

describe("HurcoV11 prove-out — adversarial input normalization", () => {
  it("NaN feed_factor falls back to default 0.5", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: NaN } },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(500);
    expect(result.feed_optimizations[0].multiplier).toBe(0.5);
  });

  it("feed_factor below 0 clamps to 0 (zero-feed prove-out)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: -0.5 } },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(0);
    expect(result.feed_optimizations[0].multiplier).toBe(0);
  });

  it("feed_factor above 1 clamps to 1 (no-reduction)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: 5 } },
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(1000);
    expect(result.feed_optimizations[0].multiplier).toBe(1);
  });

  it("Infinity feed_factor clamps to 1", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: Infinity } },
    );
    expect(result.feed_optimizations[0].multiplier).toBe(1);
  });

  it("-Infinity feed_factor clamps to 0", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: -Infinity } },
    );
    expect(result.feed_optimizations[0].multiplier).toBe(0);
  });
});

describe("HurcoV11 prove-out — off / no-op behavior (failure modes)", () => {
  it("prove_out undefined → prove_out_mode is false, no header, no M01", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp(), makeOp({ tool_number: 2 })],
      {},
    );
    expect(result.prove_out_mode).toBe(false);
    expect(headerLines(result.gcode)).toHaveLength(0);
    expect(linesMatching(result.gcode, /OPTIONAL STOP/)).toHaveLength(0);
    expect(result.feed_optimizations).toHaveLength(0);
  });

  it("prove_out: { enabled: false } is a strict no-op", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp(), makeOp({ tool_number: 2 })],
      { prove_out: { enabled: false } },
    );
    expect(result.prove_out_mode).toBe(false);
    expect(headerLines(result.gcode)).toHaveLength(0);
    expect(linesMatching(result.gcode, /OPTIONAL STOP/)).toHaveLength(0);
    expect(result.feed_optimizations).toHaveLength(0);
  });

  it("empty operations array with prove-out enabled → no errors, no M01", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([], {
      prove_out: { enabled: true },
    });
    expect(result.prove_out_mode).toBe(true);
    expect(result.feed_optimizations).toHaveLength(0);
    expect(linesMatching(result.gcode, /OPTIONAL STOP/)).toHaveLength(0);
    // Header is still emitted at program top — confirms config was honored
    expect(headerLines(result.gcode)).toHaveLength(1);
  });
});

describe("HurcoV11 prove-out — feed_optimizations entry shape", () => {
  it("entry uses PROVE-OUT label and level sentinel 0", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 800 })],
      { prove_out: { enabled: true, feed_factor: 0.4 } },
    );
    const entry = result.feed_optimizations[0];
    expect(entry.label).toBe(PROVE_OUT_LABEL);
    expect(entry.level).toBe(PROVE_OUT_LEVEL_SENTINEL);
    expect(entry.original_feed_mm_min).toBe(800);
    expect(entry.optimized_feed_mm_min).toBe(320); // 800 × 0.4
  });

  it("block_id matches Nxxx labelled-block scheme (N100, N110, ...)", () => {
    const ops = [
      makeOp({ tool_number: 1 }),
      makeOp({ tool_number: 2 }),
      makeOp({ tool_number: 3 }),
    ];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true },
    });
    expect(result.feed_optimizations.map((f) => f.block_id)).toEqual([
      "N100",
      "N110",
      "N120",
    ]);
  });
});

describe("HurcoV11 prove-out — block_annotations reflect post-multiplier feed", () => {
  it("block_annotations.emitted.F_mmpm shows reduced feed (sidecar contract)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000, spindle_rpm: 6000, tool_flutes: 4 })],
      { prove_out: { enabled: true, feed_factor: 0.5 } },
    );
    const ann = result.block_annotations[0];
    expect(ann.emitted.F_mmpm).toBe(500); // post-multiplier
    // fpt should reflect the post-multiplier feed too: 500 / (6000 × 4)
    expect(ann.emitted.fpt_mm).toBeCloseTo(500 / (6000 * 4), 6);
    // physics_basis stays kienzle (no constants inlined)
    expect(ann.physics_basis).toBe("kienzle");
    expect(ann.source_constants).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^CANONICAL_KIENZLE\./),
        expect.stringMatching(/^CANONICAL_TAYLOR\./),
      ]),
    );
  });

  it("G-code F-word on labelled block reflects reduced feed", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: 0.5 } },
    );
    const labelled = linesMatching(result.gcode, /^N100 S\d+ M03 F\d+/);
    expect(labelled).toHaveLength(1);
    expect(labelled[0]).toMatch(/F500/);
  });
});

describe("HurcoV11 prove-out — composes with other config knobs", () => {
  it("prove-out OVERRIDES aggressiveness when both are set (operator caution wins)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      {
        aggressiveness: 5, // L5 MAX = 1.1× would push feed to 1100
        prove_out: { enabled: true }, // 0.5× wins → 500
      },
    );
    expect(result.feed_optimizations).toHaveLength(1); // only one entry, not both
    expect(result.feed_optimizations[0].label).toBe(PROVE_OUT_LABEL);
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(500);
    // No aggressiveness header when prove-out wins
    expect(aggressivenessHeaderLines(result.gcode)).toHaveLength(0);
    expect(headerLines(result.gcode)).toHaveLength(1);
    // aggressiveness_applied is still recorded (so telemetry can see what
    // the operator dialed) but the multiplier didn't actually fire
    expect(result.aggressiveness_applied).toBe(5);
  });

  it("estimated_cycle_min increases with reduced feed (slower cut → longer time)", () => {
    // Long path so feed-rate difference dominates the fixed toolChangeTime
    // overhead (0.15 min) that would otherwise mask the prove-out effect
    // after the engine's 0.1-min rounding.
    const longPath = makeOp({
      feed_mm_min: 1000,
      coordinates: [
        { x: 0,    y: 0,    z: 5,  type: "rapid" },
        { x: 5000, y: 0,    z: -3, type: "linear" },
        { x: 5000, y: 5000, z: -3, type: "linear" },
        { x: 0,    y: 5000, z: -3, type: "linear" },
        { x: 0,    y: 0,    z: -3, type: "linear" },
      ],
    });
    const baseline = hurcoV11MillMasterPostEngine.generateProgram([longPath], {});
    const proveOut = hurcoV11MillMasterPostEngine.generateProgram([longPath], {
      prove_out: { enabled: true, feed_factor: 0.5 },
    });
    expect(proveOut.estimated_cycle_min).toBeGreaterThan(baseline.estimated_cycle_min);
  });

  it("tools_used is unaffected by prove-out (tool list, not feed list)", () => {
    const ops = [
      makeOp({ tool_number: 1 }),
      makeOp({ tool_number: 5 }),
      makeOp({ tool_number: 3 }),
    ];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true },
    });
    expect(result.tools_used).toEqual([1, 3, 5]);
  });
});
