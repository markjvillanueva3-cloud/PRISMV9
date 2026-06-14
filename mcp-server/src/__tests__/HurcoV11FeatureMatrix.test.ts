/**
 * HurcoV11FeatureMatrix — concrete arithmetic + emission assertions per
 * feature axis of the upgraded Hurco V11 master post (WinMax V11 family,
 * canonical for JM Die VMX24 and VM30i). Every assertion computes an
 * expected value or matches an exact emitted symbol.
 *
 * Closes user directive 2026-05-24 (slot:echo absorbing india):
 *   assess whether the post processor utilizes everything available.
 *
 * @milestone HURCO-VM30I-SCENARIOS-MS0
 */

import { describe, expect, it } from "vitest";
import {
  HurcoV11MillMasterPostEngine,
  PROVE_OUT_DEFAULT_FEED_FACTOR,
  HURCO_AGGRESSIVENESS_TABLE,
  PROVE_OUT_LABEL,
  type HurcoPostConfig,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const PROG = 5000;
const T14 = 14;
const D12 = 12;
const RPM = 5000;
const FEED = 800;

const baseOp = (over: Partial<MillOperation> = {}): MillOperation => ({
  operation_type: "face",
  tool_number: T14,
  tool_diameter_mm: D12,
  tool_flutes: 4,
  tool_description: "12mm 4FL CARBIDE",
  material_iso: "N",
  spindle_rpm: RPM,
  feed_mm_min: FEED,
  axial_depth_mm: 0.5,
  radial_depth_mm: 8,
  coolant: "flood",
  coordinates: [
    { x: -30, y: -30, z: 5, type: "rapid" },
    { x: -30, y: -30, z: -0.5, type: "linear" },
    { x: 30, y: -30, z: -0.5, type: "linear" },
    { x: 30, y: 30, z: -0.5, type: "linear" },
    { x: -30, y: 30, z: -0.5, type: "linear" },
    { x: -30, y: -30, z: 5, type: "rapid" },
  ],
  ...over,
});

const baseCfg = (over: Partial<HurcoPostConfig> = {}): HurcoPostConfig => ({
  program_number: PROG,
  program_comment: "TEST",
  coolant_mode: "flood",
  work_offset: 54,
  units: "metric",
  safe_z_mm: 25,
  ...over,
});

const engine = new HurcoV11MillMasterPostEngine();

describe("prove_out feed arithmetic", () => {
  it("feed_factor=0.5 reduces 800 mm/min to exactly 400 mm/min", () => {
    const r = engine.generateProgram([baseOp()], baseCfg({ prove_out: { enabled: true, feed_factor: 0.5 } }));
    const audit = r.feed_optimizations.find(o => o.label === PROVE_OUT_LABEL)!;
    expect(audit.optimized_feed_mm_min).toBeCloseTo(400, 1);
    expect(audit.original_feed_mm_min).toBeCloseTo(800, 6);
    expect(audit.multiplier).toBeCloseTo(0.5, 6);
    expect(r.prove_out_mode).toBe(true);
  });

  it("feed_factor=0.3 reduces 800 mm/min to exactly 240 mm/min", () => {
    const r = engine.generateProgram([baseOp()], baseCfg({ prove_out: { enabled: true, feed_factor: 0.3 } }));
    const audit = r.feed_optimizations.find(o => o.label === PROVE_OUT_LABEL)!;
    expect(audit.optimized_feed_mm_min).toBeCloseTo(240, 1);
  });
});

describe("aggressiveness multiplier table", () => {
  it("L1 (ULTRA-CONSERVATIVE) multiplier equals 0.6 -> 800 * 0.6 = 480 mm/min", () => {
    const r = engine.generateProgram([baseOp()], baseCfg({ aggressiveness: 1 }));
    expect(r.aggressiveness_applied).toBe(1);
    const entry = HURCO_AGGRESSIVENESS_TABLE.find(e => e.level === 1)!;
    expect(entry.multiplier).toBeCloseTo(0.6, 6);
    const audit = r.feed_optimizations.find(o => o.label === entry.label)!;
    expect(audit.optimized_feed_mm_min).toBeCloseTo(480, 1);
  });

  it("L5 (MAX) multiplier equals 1.1 -> 800 * 1.1 = 880 mm/min", () => {
    const r = engine.generateProgram([baseOp()], baseCfg({ aggressiveness: 5 }));
    expect(r.aggressiveness_applied).toBe(5);
    const entry = HURCO_AGGRESSIVENESS_TABLE.find(e => e.level === 5)!;
    expect(entry.multiplier).toBeCloseTo(1.1, 6);
    const audit = r.feed_optimizations.find(o => o.label === entry.label)!;
    expect(audit.optimized_feed_mm_min).toBeCloseTo(880, 1);
  });
});

describe("prove_out OVERRIDES aggressiveness (doctrine R12)", () => {
  it("L5 + prove_out{factor:0.5} on 800 mm/min op yields 400 mm/min (not 880)", () => {
    const r = engine.generateProgram(
      [baseOp()],
      baseCfg({
        aggressiveness: 5,
        prove_out: { enabled: true, feed_factor: PROVE_OUT_DEFAULT_FEED_FACTOR },
      }),
    );
    const proveOut = r.feed_optimizations.find(o => o.label === PROVE_OUT_LABEL)!;
    expect(proveOut.optimized_feed_mm_min).toBeCloseTo(400, 1);
    const max = Math.max(...r.feed_optimizations.map(o => o.multiplier));
    expect(max).toBeLessThanOrEqual(1.0);
  });
});

describe("Kienzle-bounded reducer (max_cutting_force_N)", () => {
  it("steel @ 2400 mm/min + 4mm DOC + 12mm WOC vs 500N ceiling -> feed reduced below 2400", () => {
    const r = engine.generateProgram(
      [baseOp({ material_iso: "P", feed_mm_min: 2400, axial_depth_mm: 4, radial_depth_mm: 12 })],
      baseCfg({ optimize_feeds: true, max_cutting_force_N: 500 }),
    );
    const kienzleAudit = r.feed_optimizations.find(o => /Kienzle|Fc/i.test(o.reason ?? ""));
    const physicsFail = (r.physics_checks ?? []).find(c => !c.passed && /force|Fc/i.test(c.check));
    const reducedFeed = kienzleAudit?.optimized_feed_mm_min ?? Infinity;
    const reductionFlag = reducedFeed < 2400;
    const physicsFlag = physicsFail?.passed === false;
    expect(reductionFlag || physicsFlag).toBe(true);
  });
});

describe("controller emission — exact G-code symbols", () => {
  it("metric units emits G21 and NOT G20", () => {
    const p = engine.generateProgram([baseOp()], baseCfg({ units: "metric" })).gcode.join("\n");
    expect(p).toMatch(/\bG21\b/);
    expect(p).not.toMatch(/\bG20\b/);
  });

  it("inch units emits G20 and NOT G21", () => {
    const p = engine.generateProgram([baseOp()], baseCfg({ units: "inch" })).gcode.join("\n");
    expect(p).toMatch(/\bG20\b/);
    expect(p).not.toMatch(/\bG21\b/);
  });

  it("work_offset=57 emits G57 verbatim in program body", () => {
    const p = engine.generateProgram([baseOp()], baseCfg({ work_offset: 57 })).gcode.join("\n");
    expect(p).toMatch(/\bG57\b/);
  });

  it("program ends with M30 on the last non-percent line (Hurco canonical)", () => {
    const r = engine.generateProgram([baseOp()], baseCfg({ program_number: 5099 }));
    const realLines = r.gcode.filter(l => !/^\s*%\s*$/.test(l) && l.trim().length > 0);
    expect(realLines[realLines.length - 1]).toMatch(/M30\b/);
  });

  it("program number 5099 emits the literal `O5099` header line", () => {
    const p = engine.generateProgram([baseOp()], baseCfg({ program_number: 5099 })).gcode.join("\n");
    expect(p).toMatch(/O5099\b/);
  });
});

describe("structured input precedence + R12 fail-loud", () => {
  it("MillTool.description 'JM-DIE-T14...' overrides flat tool_description 'FLAT (FLAT)'", () => {
    const r = engine.generateProgram(
      [baseOp({
        tool_description: "FLAT (FLAT)",
        tool: {
          number: T14,
          diameter_mm: D12,
          flutes: 4,
          description: "JM-DIE-T14 12mm 4FL CARBIDE TiAlN STICKOUT=30",
          coating: "TiAlN",
          stickout_mm: 30,
        },
      })],
      baseCfg(),
    );
    expect(r.gcode.join("\n")).toMatch(/JM-DIE-T14/);
  });

  it("Kienzle override kc1_1=99999 (above safe ceiling 6000) throws", () => {
    expect(() => engine.generateProgram(
      [baseOp({ material: { iso_group: "P", kc1_1: 99999, mc: 0.5 } })],
      baseCfg(),
    )).toThrow(/kc1_1|mc|range|out of|iso_group|material/i);
  });
});

describe("setup sheet emission", () => {
  it("default emits setup_sheet with T14 entry diameter equal to op tool_diameter_mm (12)", () => {
    const r = engine.generateProgram([baseOp()], baseCfg());
    const t14 = r.setup_sheet?.tools.find(t => t.number === T14);
    expect(t14?.diameter_mm).toBeCloseTo(12, 6);
  });
});

describe("coolant emission", () => {
  it("coolant_mode='flood' emits M08 (or M8) somewhere in program", () => {
    const p = engine.generateProgram([baseOp()], baseCfg({ coolant_mode: "flood" })).gcode.join("\n");
    expect(p).toMatch(/\bM0?8\b/);
  });
});

describe("3-op chain integrity", () => {
  it("[face T14, drill T7, contour T21] -> tools_used array equals [14,7,21] (or contains all 3)", () => {
    const face = baseOp({ operation_type: "face", tool_number: 14, tool_diameter_mm: 12, feed_mm_min: 800 });
    const drill = baseOp({ operation_type: "drill", tool_number: 7, tool_diameter_mm: 6.35, feed_mm_min: 300 });
    const contour = baseOp({ operation_type: "contour", tool_number: 21, tool_diameter_mm: 8, feed_mm_min: 500 });
    const r = engine.generateProgram([face, drill, contour], baseCfg({ program_number: 5015 }));
    expect(r.tools_used.sort((a, b) => a - b)).toEqual([7, 14, 21]);
  });
});

describe("canonical constant pins", () => {
  it("PROVE_OUT_DEFAULT_FEED_FACTOR equals 0.5 (operator-safety default)", () => {
    expect(PROVE_OUT_DEFAULT_FEED_FACTOR).toBeCloseTo(0.5, 6);
  });

  it("HURCO_AGGRESSIVENESS_TABLE first/last entry: L1=0.6, L5=1.1, monotone-increasing", () => {
    const sorted = [...HURCO_AGGRESSIVENESS_TABLE].sort((a, b) => a.level - b.level);
    expect(sorted[0].multiplier).toBeCloseTo(0.6, 6);
    expect(sorted[sorted.length - 1].multiplier).toBeCloseTo(1.1, 6);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].multiplier).toBeGreaterThanOrEqual(sorted[i - 1].multiplier);
    }
  });
});
