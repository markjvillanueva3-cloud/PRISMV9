/**
 * MachineEnvelopeGuardEngine.test.ts (slot:oscar 2026-06-27)
 *
 * Real-behavior coverage for the machine-limit guard that every machining pipeline calls before G-code
 * output. Tests the safety-critical check() clamp/block/warn logic (RPM clamp, feed clamp, XYZ travel BLOCK,
 * power WARN), the checkBatch() aggregate, and fromMachineData() field normalization -- including the
 * U-MACHDB-07 variant-keyed power resolution (spindle.power_kW / continuousHp now reach max_power_kW so the
 * power guard actually has a limit to enforce; pre-fix they resolved to undefined = no limit). Assertions are
 * concrete reference values that encode WHY each branch matters for a safety guard (a clamp must reduce to the
 * exact limit; an out-of-travel move must BLOCK not clamp; an over-power cut must WARN not silently pass).
 */
import { describe, it, expect } from "vitest";
import { machineEnvelopeGuardEngine } from "../engines/MachineEnvelopeGuardEngine.js";

const e = machineEnvelopeGuardEngine;
const ENV = {
  max_rpm: 12000,
  min_rpm: 100,
  max_power_kW: 22,
  max_feed_mm_min: 10000,
  rapid_rate_mm_min: 30000,
  work_volume: { x_mm: 500, y_mm: 400, z_mm: 400 },
};

describe("MachineEnvelopeGuardEngine.check -- machine-limit clamp/block/warn safety enforcement", () => {
  it("clamps spindle_rpm above max DOWN to max_rpm (not blocked)", () => {
    const r = e.check({ spindle_rpm: 20000 }, ENV);
    expect(r.clamped.spindle_rpm).toBe(12000);
    expect(r.passed).toBe(false);
    expect(r.blocked).toBe(false);
    expect(r.violations[0].parameter).toBe("spindle_rpm");
    expect(r.violations[0].action).toBe("clamped");
  });

  it("clamps a nonzero spindle_rpm below min UP to min_rpm", () => {
    const r = e.check({ spindle_rpm: 50 }, ENV);
    expect(r.clamped.spindle_rpm).toBe(100);
  });

  it("does not touch spindle_rpm within [min,max]", () => {
    const r = e.check({ spindle_rpm: 8000 }, ENV);
    expect(r.clamped.spindle_rpm).toBe(8000);
    expect(r.passed).toBe(true);
  });

  it("clamps cutting feed above max_feed_mm_min", () => {
    const r = e.check({ feed_mm_min: 15000 }, ENV);
    expect(r.clamped.feed_mm_min).toBe(10000);
  });

  it("uses the RAPID limit (not the cutting limit) when is_rapid is set", () => {
    const within = e.check({ feed_mm_min: 25000, is_rapid: true }, ENV);
    expect(within.clamped.feed_mm_min).toBe(25000); // 25000 < 30000 rapid -> unchanged
    const over = e.check({ feed_mm_min: 35000, is_rapid: true }, ENV);
    expect(over.clamped.feed_mm_min).toBe(30000);
  });

  it("BLOCKS (not clamps) an X position beyond +/- travel", () => {
    const r = e.check({ x: 600 }, ENV);
    expect(r.blocked).toBe(true);
    expect(r.violations.some((v: any) => v.parameter === "x_position" && v.action === "blocked")).toBe(true);
  });

  it("BLOCKS a negative Z beyond travel via abs()", () => {
    const r = e.check({ z: -450 }, ENV);
    expect(r.blocked).toBe(true);
  });

  it("allows positions inside the work volume (no block)", () => {
    const r = e.check({ x: 200, y: -150, z: 300 }, ENV);
    expect(r.blocked).toBe(false);
  });

  it("WARNS (does NOT block) when cutting power exceeds max_power_kW -- over-power is advisory, over-travel is fatal", () => {
    const r = e.check({ power_kW: 30 }, ENV);
    expect(r.blocked).toBe(false);
    expect(r.violations.some((v: any) => v.parameter === "power_kW" && v.action === "warned")).toBe(true);
  });

  it("passes a fully in-envelope parameter set with zero violations", () => {
    const r = e.check({ spindle_rpm: 6000, feed_mm_min: 5000, x: 100, y: 100, z: 100, power_kW: 10 }, ENV);
    expect(r.passed).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it("does not enforce a limit that is absent from the envelope (no max_power_kW -> power never warns)", () => {
    const r = e.check({ power_kW: 999 }, { max_rpm: 12000 });
    expect(r.violations.some((v: any) => v.parameter === "power_kW")).toBe(false);
  });
});

describe("MachineEnvelopeGuardEngine.checkBatch -- aggregate enforcement", () => {
  it("summarizes violations across blocks and clamps each block in place", () => {
    const blocks: any[] = [{ spindle_rpm: 20000 }, { spindle_rpm: 6000 }];
    const res = e.checkBatch(blocks, ENV);
    expect(res.total_blocks).toBe(2);
    expect(res.blocks_clamped).toBe(1);
    expect(blocks[0].spindle_rpm).toBe(12000); // mutated to the clamped value
    expect(blocks[1].spindle_rpm).toBe(6000);
  });

  it("counts blocked blocks separately from clamped ones", () => {
    const res = e.checkBatch([{ x: 999 }, { spindle_rpm: 20000 }], ENV);
    expect(res.blocks_blocked).toBe(1);
    expect(res.blocks_clamped).toBe(2); // both produced violations
  });
});

describe("MachineEnvelopeGuardEngine.fromMachineData -- registry->envelope normalization + U-MACHDB-07 power", () => {
  it("resolves a variant spindle.power_kW key to max_power_kW (was undefined pre-U-MACHDB-07)", () => {
    expect(e.fromMachineData({ spindle: { power_kW: 18.5 } }).max_power_kW).toBe(18.5);
  });

  it("converts spindle.continuousHp via hp->kW (40 hp = 29.828 kW)", () => {
    expect(e.fromMachineData({ spindle: { continuousHp: 40 } }).max_power_kW).toBeCloseTo(29.828, 3);
  });

  it("leaves max_power_kW undefined when no power key is present (a guard must not invent a limit)", () => {
    expect(e.fromMachineData({ spindle: { max_rpm: 12000 } }).max_power_kW).toBeUndefined();
  });

  it("normalizes envelope travels into work_volume", () => {
    const env = e.fromMachineData({ envelope: { x_travel: 800, y_travel: 600, z_travel: 500 } });
    expect(env.work_volume).toEqual({ x_mm: 800, y_mm: 600, z_mm: 500 });
  });
});

describe("MachineEnvelopeGuardEngine.fromMachineData -- U-MACHDB-08 variant-keyed RPM resolution", () => {
  it("resolves spindle.ratedRpm to max_rpm (was undefined pre-fix -> no over-speed clamp)", () => {
    expect(e.fromMachineData({ spindle: { ratedRpm: 8000 } }).max_rpm).toBe(8000);
  });

  it("resolves spindle.max_speed to max_rpm (a 24k HSM spindle keyed under max_speed)", () => {
    expect(e.fromMachineData({ spindle: { max_speed: 24000 } }).max_rpm).toBe(24000);
  });

  it("keeps the canonical spindle.max_rpm winning over a variant key", () => {
    expect(e.fromMachineData({ spindle: { max_rpm: 12000, ratedRpm: 8000 } }).max_rpm).toBe(12000);
  });

  it("keeps the top-level max_rpm precedence over the spindle (existing behavior preserved)", () => {
    expect(e.fromMachineData({ max_rpm: 9000, spindle: { ratedRpm: 8000 } }).max_rpm).toBe(9000);
  });

  it("resolves spindle.minRpm to min_rpm (was the 50 default pre-fix)", () => {
    expect(e.fromMachineData({ spindle: { minRpm: 150 } }).min_rpm).toBe(150);
  });

  it("keeps the 50 min_rpm default when no min key is present", () => {
    expect(e.fromMachineData({ spindle: {} }).min_rpm).toBe(50);
  });

  it("END-TO-END: a ratedRpm-keyed machine now CLAMPS an over-speed command (the safety payoff)", () => {
    // pre-fix env.max_rpm was undefined -> check() applied no RPM limit -> 20000 passed through (over-speed).
    const env = e.fromMachineData({ spindle: { ratedRpm: 8000 } });
    const r = e.check({ spindle_rpm: 20000 }, env);
    expect(r.clamped.spindle_rpm).toBe(8000);
    expect(r.passed).toBe(false);
  });
});
