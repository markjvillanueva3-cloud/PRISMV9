import { describe, it, expect } from "vitest";
import { buildSfcCalcRequest } from "../components/sfc/buildSfcRequest";
import { MATERIALS } from "../data/materials";
import { MACHINES } from "../data/machines";
import { getOperationById } from "../data/operations";
import type { SfcParams } from "../components/sfc/ParameterPanel";

// Real fixtures (no stubs): a P-steel, a milling op, a VMC with a real spindle ceiling.
const material = MATERIALS[0]!;                          // AISI 1045 (id "1045", hardness 200)
const operation = getOperationById("slot_milling")!;     // a real (nested) OperationType
const params: SfcParams = {
  tool_diameter: 12, number_of_teeth: 4, depth: 2, width: 6,
  tool_material: "Carbide", coolant: "flood",
};
const vmc = MACHINES.find((m) => m.type === "VMC") ?? MACHINES[0]!; // real rpm/power

describe("buildSfcCalcRequest", () => {
  it("maps the core selections to the request body", () => {
    const req = buildSfcCalcRequest(material, operation, params, null);
    expect(req).toMatchObject({
      material: material.id,
      operation: operation.id,
      material_hardness: material.hardness,
      tool_material: "Carbide",
      tool_diameter: 12,
      number_of_teeth: 4,
      depth: 2,
      width: 6,
      coolant: "flood",
    });
  });

  it("includes the selected machine's spindle ceiling + power (THE clamp fix)", () => {
    const req = buildSfcCalcRequest(material, operation, params, vmc);
    expect(vmc.spindleMaxRpm).toBeGreaterThan(0); // fixture must be meaningful
    expect(vmc.spindlePowerKw).toBeGreaterThan(0);
    expect(req.machine_max_rpm).toBe(vmc.spindleMaxRpm);
    expect(req.machine_power_kw).toBe(vmc.spindlePowerKw);
  });

  it("omits machine limits when no machine is selected (engine treats as unclamped)", () => {
    const req = buildSfcCalcRequest(material, operation, params, null);
    expect(req.machine_max_rpm).toBeUndefined();
    expect(req.machine_power_kw).toBeUndefined();
    expect("machine_max_rpm" in req).toBe(false);
  });

  it("omits a non-positive spindle spec rather than sending 0 (a 0 would falsely clamp Vc to ~0)", () => {
    const zeroMachine = { ...vmc, spindleMaxRpm: 0, spindlePowerKw: 0 };
    const req = buildSfcCalcRequest(material, operation, params, zeroMachine);
    expect(req.machine_max_rpm).toBeUndefined();
    expect(req.machine_power_kw).toBeUndefined();
  });

  it("forwards the goal selector when the page provides one", () => {
    expect(buildSfcCalcRequest(material, operation, params, null, "cost").optimize_for).toBe("cost");
    expect(buildSfcCalcRequest(material, operation, params, null, "productivity").optimize_for).toBe("productivity");
    expect(buildSfcCalcRequest(material, operation, params, vmc, "balanced").optimize_for).toBe("balanced");
  });

  it("omits optimize_for when the page passes none (engine applies its default recommendation)", () => {
    const req = buildSfcCalcRequest(material, operation, params, null);
    expect(req.optimize_for).toBeUndefined();
    expect("optimize_for" in req).toBe(false);
  });

  it("forwards the tool coating when the panel selects one (makes the backend coating derate reachable)", () => {
    const req = buildSfcCalcRequest(material, operation, { ...params, coating: "diamond" }, null);
    expect(req.coating).toBe("diamond");
  });

  it("omits coating when uncoated/empty or absent (engine treats as neutral 1.0 -- no derate)", () => {
    const empty = buildSfcCalcRequest(material, operation, { ...params, coating: "" }, null);
    expect(empty.coating).toBeUndefined();
    expect("coating" in empty).toBe(false);
    const absent = buildSfcCalcRequest(material, operation, params, null);
    expect("coating" in absent).toBe(false);
  });
});
