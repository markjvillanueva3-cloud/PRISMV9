/**
 * sfcMachineBridge.test.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
 *
 * Proves the flat->nested machine bridge + its contract against the REAL pre-machine-completeness-gate:
 * the bug (flat SFC payload false-blocks), the fix (bridged spec passes), and NO WEAKENING (a genuinely
 * incomplete payload still blocks). Found via the live e2e visual pass -- the SFC default JM preset
 * (machine_max_rpm 8100, machine_power_kw 22.4) was blocked by INCOMPLETE MACHINE DATA because the gate
 * reads nested machine.spindle.* but the SFC sends flat machine_max_rpm/machine_power_kw.
 */
import { describe, it, expect } from "vitest";
import { buildSfcMachinePackage, applySfcMachineBridge, SFC_BRIDGE_ACTIONS } from "../utils/sfcMachineBridge.js";
import { preMachineCompletenessGate, machineValidationHooks } from "../hooks/MachineValidationHooks.js";
import type { HookContext } from "../engines/HookExecutor.js";

function ctx(data: Record<string, unknown>): HookContext {
  return { operation: "sf_orchestrate", target: { type: "calculation", id: "sf_orchestrate", data }, metadata: {} } as HookContext;
}

describe("buildSfcMachinePackage", () => {
  it("bridges a flat snake_case machine spec -> the exact nested spindle.* shape the hooks read", () => {
    expect(buildSfcMachinePackage({ machine_max_rpm: 8100, machine_power_kw: 22.4 }))
      .toEqual({ spindle: { max_rpm: 8100, power_kw: 22.4, power_continuous_kw: 22.4 } });
  });

  it("reads the camelCase aliases that normalizeParams adds", () => {
    expect(buildSfcMachinePackage({ machineMaxRpm: 12000, machinePowerKw: 15 }))
      .toEqual({ spindle: { max_rpm: 12000, power_kw: 15, power_continuous_kw: 15 } });
  });

  it("bridges only the present field of a partial spec (rpm only -> no invented power)", () => {
    expect(buildSfcMachinePackage({ machine_max_rpm: 8100 })).toEqual({ spindle: { max_rpm: 8100 } });
  });

  it("yields NO package for an absent/non-positive spec (the gate must still block)", () => {
    expect(buildSfcMachinePackage({})).toBe(undefined);
    expect(buildSfcMachinePackage({ machine_max_rpm: 0, machine_power_kw: -5 })).toBe(undefined);
    expect(buildSfcMachinePackage({ material: "1045", tool_diameter: 12 })).toBe(undefined);
  });
});

describe("SFC machine-bridge unblocks the completeness gate (the fix's contract, real gate)", () => {
  it("REGRESSION ANCHOR: a flat-only SFC payload FALSE-BLOCKS the real gate (the bug)", () => {
    const r = preMachineCompletenessGate.handler(ctx({ machine_max_rpm: 8100, machine_power_kw: 22.4 }));
    expect(r.blocked).toBe(true);
  });

  it("FIX: bridging the flat spec into params.machine lets the real gate PASS the present, sane spec", () => {
    const flat = { machine_max_rpm: 8100, machine_power_kw: 22.4 };
    const r = preMachineCompletenessGate.handler(ctx({ ...flat, machine: buildSfcMachinePackage(flat) }));
    expect(r.blocked).toBe(false);
  });

  it("NO WEAKENING: a genuinely-incomplete payload (no machine spec) STILL blocks the real gate", () => {
    const r = preMachineCompletenessGate.handler(ctx({ material: "1045", tool_diameter: 12 }));
    expect(r.blocked).toBe(true);
  });
});

describe("bridged SFC payload passes the WHOLE machine-validation hook suite (no sibling false-block)", () => {
  const flat = { material: "1045", iso_group: "P", tool_diameter: 12, flutes: 4, machine_max_rpm: 8100, machine_power_kw: 22.4 };

  it("all machine-validation hooks pass for a complete bridged SFC payload (siblings now validate, not skip)", async () => {
    const data = { ...flat, machine: buildSfcMachinePackage(flat) };
    for (const hook of machineValidationHooks) {
      const r = (await Promise.resolve(hook.handler(ctx(data)))) as { blocked?: boolean; message?: string };
      expect(r.blocked, `hook ${hook.id} unexpectedly blocked: ${r.message ?? ""}`).toBe(false);
    }
  });

  it("WITHOUT the bridge, the completeness gate is the suite member that blocks the flat payload (bridge is load-bearing)", async () => {
    const blockers: string[] = [];
    for (const hook of machineValidationHooks) {
      const r = (await Promise.resolve(hook.handler(ctx({ ...flat })))) as { blocked?: boolean };
      if (r.blocked === true) blockers.push(hook.id);
    }
    expect(blockers).toContain("pre-machine-completeness-gate");
  });
});

describe("applySfcMachineBridge -- shared calc + product SFC wiring (U-OSC-SFC-PRODUCT-BRIDGE)", () => {
  // The EXACT flat shape web/src/components/sfc/buildSfcRequest.ts posts to POST /api/v1/sfc/calculate
  // -> prism_product:sfc_calculate. machine_max_rpm/machine_power_kw are the JM default preset.
  const webFlat = (): Record<string, unknown> => ({
    material: "1045", operation: "slot", material_hardness: 170,
    tool_material: "carbide", tool_diameter: 10, number_of_teeth: 4,
    depth: 5, width: 10, coolant: "flood",
    machine_max_rpm: 8100, machine_power_kw: 22.4, optimize_for: "balanced",
  });

  it("SFC_BRIDGE_ACTIONS covers the web product action AND the calc actions (both SFC paths)", () => {
    expect(SFC_BRIDGE_ACTIONS.has("sfc_calculate")).toBe(true); // the SFC web page's action
    expect(SFC_BRIDGE_ACTIONS.has("sf_orchestrate")).toBe(true); // prism_calc path
    expect(SFC_BRIDGE_ACTIONS.has("sf_quick")).toBe(true);
  });

  it("FIX: bridges the flat web sfc_calculate payload so the REAL completeness gate PASSES (was the live false-block)", () => {
    const p = webFlat();
    expect(applySfcMachineBridge("sfc_calculate", p)).toBe(true);
    expect(p.machine).toEqual({ spindle: { max_rpm: 8100, power_kw: 22.4, power_continuous_kw: 22.4 } });
    // REGRESSION ANCHOR: same flat payload UNBRIDGED blocks the real gate; BRIDGED it passes.
    expect(preMachineCompletenessGate.handler(ctx(webFlat())).blocked).toBe(true);
    expect(preMachineCompletenessGate.handler(ctx(p)).blocked).toBe(false);
  });

  it("calc path preserved by the refactor: sf_orchestrate still bridges the flat spec", () => {
    const p: Record<string, unknown> = { machine_max_rpm: 12000, machine_power_kw: 15 };
    expect(applySfcMachineBridge("sf_orchestrate", p)).toBe(true);
    expect(p.machine).toEqual({ spindle: { max_rpm: 12000, power_kw: 15, power_continuous_kw: 15 } });
  });

  it("NO-OP for a non-SFC action (must not touch ppg/shop/unrelated product dispatch)", () => {
    const p = webFlat();
    expect(applySfcMachineBridge("ppg_validate", p)).toBe(false);
    expect(p.machine).toBeUndefined();
  });

  it("NEVER overwrites an explicit nested machine the caller already supplied", () => {
    const explicit = { spindle: { max_rpm: 9999, power_kw: 30 } };
    const p: Record<string, unknown> = { ...webFlat(), machine: explicit };
    expect(applySfcMachineBridge("sfc_calculate", p)).toBe(false);
    expect(p.machine).toBe(explicit);
  });

  it("NO WEAKENING: a flat SFC payload with NO machine spec stays unbridged -> the gate STILL blocks", () => {
    const p: Record<string, unknown> = { material: "1045", operation: "slot", tool_diameter: 10 };
    expect(applySfcMachineBridge("sfc_calculate", p)).toBe(false);
    expect(p.machine).toBeUndefined();
    expect(preMachineCompletenessGate.handler(ctx(p)).blocked).toBe(true);
  });
});
