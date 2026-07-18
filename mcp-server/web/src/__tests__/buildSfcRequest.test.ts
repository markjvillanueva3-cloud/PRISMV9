import { describe, it, expect } from "vitest";
import { buildSfcCalcRequest, applyToolToParams } from "../components/sfc/buildSfcRequest";
import { MATERIALS } from "../data/materials";
import { MACHINES } from "../data/machines";
import { getOperationById } from "../data/operations";
import type { SfcParams } from "../components/sfc/ParameterPanel";
import { TOOLS } from "../data/tools";

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

  it("forwards the selected tool's rated ceilings (catalog maxRpm/maxDoc -> tool_max_rpm/tool_max_doc)", () => {
    const t = TOOLS[0]!; // 12mm 4-flute carbide endmill: maxRpm 20000, maxDoc 36
    const req = buildSfcCalcRequest(material, operation, params, null, undefined, t);
    expect(req.tool_max_rpm).toBe(t.maxRpm);
    expect(req.tool_max_doc).toBe(t.maxDoc);
  });

  it("omits tool limits when no tool is selected (engine treats as unclamped)", () => {
    const req = buildSfcCalcRequest(material, operation, params, null);
    expect("tool_max_rpm" in req).toBe(false);
    expect("tool_max_doc" in req).toBe(false);
  });

  it("omits a non-positive tool rating rather than sending 0/negative (a 0 would falsely clamp)", () => {
    const badTool = { ...TOOLS[0]!, maxRpm: 0, maxDoc: -5 };
    const req = buildSfcCalcRequest(material, operation, params, null, undefined, badTool);
    expect("tool_max_rpm" in req).toBe(false);
    expect("tool_max_doc" in req).toBe(false);
  });

  it("omits coating when uncoated/empty or absent (engine treats as neutral 1.0 -- no derate)", () => {
    const empty = buildSfcCalcRequest(material, operation, { ...params, coating: "" }, null);
    expect(empty.coating).toBeUndefined();
    expect("coating" in empty).toBe(false);
    const absent = buildSfcCalcRequest(material, operation, params, null);
    expect("coating" in absent).toBe(false);
  });
});

describe("applyToolToParams (tool selection -> panel params, the coating-wire fix)", () => {
  // Real catalog tools (no stubs); find-by-coating so an index reorder can't silently pass.
  const tialn = TOOLS.find((t) => t.coating === "TiAlN")!; // 12mm 4FL carbide endmill
  const dlc = TOOLS.find((t) => t.coating === "DLC")!;     // 8mm 3FL carbide endmill

  it("copies the selected tool's coating into the panel params (was DROPPED -> coated tool ran as uncoated)", () => {
    expect(tialn.coating).toBe("TiAlN"); // fixture sanity
    const next = applyToolToParams(params, tialn);
    expect(next.coating).toBe("TiAlN"); // hits a real backend derate cell (normalizeCoatingKey)
  });

  it("carries the coating end-to-end so the backend derate is reachable (tool -> params -> request)", () => {
    const req = buildSfcCalcRequest(material, operation, applyToolToParams(params, tialn), null);
    expect(req.coating).toBe("TiAlN");
    const dlcReq = buildSfcCalcRequest(material, operation, applyToolToParams(params, dlc), null);
    expect(dlcReq.coating).toBe("DLC");
  });

  it("also maps geometry + substrate (diameter, flute count, tool material)", () => {
    const next = applyToolToParams(params, tialn);
    expect(next.tool_diameter).toBe(tialn.diameter);
    expect(next.number_of_teeth).toBe(tialn.fluteCount);
    expect(next.tool_material).toBe(tialn.substrate);
  });

  it("preserves the operator's other panel selections (cut geometry + coolant not clobbered)", () => {
    const custom: SfcParams = { ...params, depth: 3.5, width: 8, coolant: "mist" };
    const next = applyToolToParams(custom, dlc);
    expect(next.depth).toBe(3.5);
    expect(next.width).toBe(8);
    expect(next.coolant).toBe("mist");
  });
});
