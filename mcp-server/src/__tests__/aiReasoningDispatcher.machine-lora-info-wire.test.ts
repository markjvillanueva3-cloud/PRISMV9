/**
 * aiReasoningDispatcher machine_lora_base_info wiring (U-MACHINE-LORA-INFO-WIRE).
 *
 * Dark-facade fix: the case probed machineLoRABase.getInfo()/.info -- neither
 * existed on the factory object (only buildDatasetHelper/createCadence) -> always
 * "method not callable". Added the real getInfo(): pure introspection of the
 * shared LoRA foundation. Routed through executeAIReasoningAction (bare payload
 * -> {success, data:result}; the test asserts r.data is the info, not r.data.data).
 *
 * R9: asserts the returned defaults EQUAL the canonical DEFAULT_SPLIT/DEFAULT_CADENCE
 * (so the test fails if getInfo ever diverges from canon) and that they are COPIES
 * (mutating the result cannot corrupt the module-level canon).
 */
import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { DEFAULT_SPLIT, DEFAULT_CADENCE } from "../engines/MachineLoRABaseEngine.js";

type AnyAction = Parameters<typeof executeAIReasoningAction>[0];

type BaseInfo = {
  engine: string;
  version: string;
  helpers: string[];
  defaults: { split: typeof DEFAULT_SPLIT; cadence: typeof DEFAULT_CADENCE };
  machineTypes: string[];
  cadence: { intervals: string[]; triggers: string[]; runStatuses: string[] };
};

describe("aiReasoningDispatcher machine_lora_base_info -- dark-action fix (real getInfo)", () => {
  it("returns the real foundation introspection, NOT 'method not callable'", async () => {
    const r = await executeAIReasoningAction("machine_lora_base_info" as AnyAction, {});
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as BaseInfo;
    expect(d.engine).toBe("MachineLoRABaseEngine");
    expect(d.helpers).toContain("buildDatasetHelper");
    expect(d.helpers).toContain("createCadence");
    // the 8 CAM-ML-CLOSEDLOOP machine-type pipelines that compose on this base
    expect(d.machineTypes).toHaveLength(8);
    expect(d.machineTypes).toEqual(expect.arrayContaining(["milling", "wedm", "grinding"]));
    expect(d.cadence.intervals).toContain("on-demand");
    expect(d.cadence.triggers).toContain("data-drift");
  });

  it("surfaces the CANONICAL defaults (equal to DEFAULT_SPLIT/DEFAULT_CADENCE) as defensive copies", async () => {
    const r = await executeAIReasoningAction("machine_lora_base_info" as AnyAction, {});
    const d = r.data as BaseInfo;
    expect(d.defaults.split).toEqual(DEFAULT_SPLIT);
    expect(d.defaults.cadence).toEqual(DEFAULT_CADENCE);
    // copies, not the canonical references -> a consumer mutating the result is harmless
    expect(d.defaults.split).not.toBe(DEFAULT_SPLIT);
    expect(d.defaults.cadence).not.toBe(DEFAULT_CADENCE);
    // sanity: the split ratios are a valid distribution
    const { trainRatio, valRatio, testRatio } = d.defaults.split;
    expect(trainRatio + valRatio + testRatio).toBeCloseTo(1, 6);
  });

  it("is pure: ignores params and is deterministic across calls", async () => {
    const a = await executeAIReasoningAction("machine_lora_base_info" as AnyAction, { junk: "ignored", machineType: "milling" });
    const b = await executeAIReasoningAction("machine_lora_base_info" as AnyAction, {});
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(a.data).toEqual(b.data); // no input dependence -> identical introspection
  });
});
