/**
 * machine-envelope-guard-power-resolve.test.ts (U-MACHDB-07, slot:oscar 2026-06-27)
 *
 * Consumer round-trip test (R9 "test through the consumer, not the singleton") for the safety-adjacent
 * power-limit guard wire. MachineEnvelopeGuardEngine.fromMachineData is a PUBLIC pure transform
 * (Record<string,any> -> MachineEnvelope), so we can prove end-to-end that a variant-keyed spindle power
 * now reaches max_power_kW (the limit the guard enforces). Before U-MACHDB-07 the guard read only
 * machine.max_power_kW / machine.power_kW (top-level) / machine.spindle.power_continuous, so a machine
 * storing power under spindle.power_kW or spindle.continuousHp resolved to UNDEFINED -- the guard saw no
 * power limit and silently passed it. These assertions FAIL on the pre-fix code, so they encode the fix's
 * intent. The explicit-override regression cases prove the wire is a strict superset (top-level overrides
 * still win, canonical key unchanged, no fabricated default per R12 -- a power guard must never invent a limit).
 */
import { describe, it, expect } from "vitest";
import { machineEnvelopeGuardEngine } from "../engines/MachineEnvelopeGuardEngine.js";

describe("MachineEnvelopeGuardEngine.fromMachineData -- variant-keyed power reaches the power-limit guard (U-MACHDB-07)", () => {
  it("resolves a spindle.power_kW-only machine to max_power_kW (was UNDEFINED pre-fix -- guard saw no limit)", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ spindle: { power_kW: 18.5 } });
    expect(env.max_power_kW).toBe(18.5);
  });

  it("resolves an hp-keyed machine via hp->kW: spindle.continuousHp 40 -> 29.828 kW", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ spindle: { continuousHp: 40 } });
    expect(env.max_power_kW).toBeCloseTo(29.828, 3);
  });

  it("still honors an explicit top-level max_power_kW override above the spindle resolver (regression)", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ max_power_kW: 22, spindle: { power_kW: 99 } });
    expect(env.max_power_kW).toBe(22);
  });

  it("still honors top-level power_kW above the spindle resolver (regression)", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ power_kW: 30, spindle: { power_continuous: 11 } });
    expect(env.max_power_kW).toBe(30);
  });

  it("resolves the canonical spindle.power_continuous key unchanged (regression)", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ spindle: { power_continuous: 15 } });
    expect(env.max_power_kW).toBe(15);
  });

  it("leaves max_power_kW undefined when no power key is present -- never fabricates a limit (R12 safety)", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ spindle: { max_rpm: 12000 } });
    expect(env.max_power_kW).toBeUndefined();
  });

  it("does not crash on a machine with no spindle object", () => {
    const env = machineEnvelopeGuardEngine.fromMachineData({ max_rpm: 8000 });
    expect(env.max_power_kW).toBeUndefined();
  });
});
