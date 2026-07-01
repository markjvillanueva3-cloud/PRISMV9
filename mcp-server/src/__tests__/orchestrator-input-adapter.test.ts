/**
 * orchestrator-input-adapter -- SFC CONVERGENCE P1 (slot:oscar).
 *
 * Tests the pure OrchestratorInput -> UltimateSpeedFeedInput translation that the operator-approved
 * convergence will use inside SpeedFeedOrchestratorEngine.compute(). Verifies the 1:1 physics-field
 * passthrough, the two transforms (coolant_type case-normalize, optimize_for "cost"->"balanced"),
 * the dropping of orchestrator-only fields, and that the adapted input is actually engine-consumable
 * (round-trips through ultimateSpeedFeedEngine.calculate() to a valid result).
 */
import { describe, it, expect } from "vitest";
import {
  orchestratorToUltimateInput,
  mapCoolant,
  mapOptimizeFor,
} from "../engines/lib/orchestrator-input-adapter.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("mapCoolant (orchestrator coolant_type -> engine coolant)", () => {
  it("normalizes case: MQL -> mql, FLOOD -> flood", () => {
    expect(mapCoolant("MQL")).toBe("mql");
    expect(mapCoolant("FLOOD")).toBe("flood");
  });
  it("passes valid keys through (cryogenic / through_tool / dry / mist)", () => {
    expect(mapCoolant("cryogenic")).toBe("cryogenic");
    expect(mapCoolant("through_tool")).toBe("through_tool");
    expect(mapCoolant("dry")).toBe("dry");
    expect(mapCoolant("mist")).toBe("mist");
  });
  it("unknown coolant -> undefined (engine infers); empty / undefined -> undefined", () => {
    expect(mapCoolant("plasma") === undefined).toBe(true);
    expect(mapCoolant("") === undefined).toBe(true);
    expect(mapCoolant(undefined) === undefined).toBe(true);
  });
});

describe("mapOptimizeFor (orchestrator optimize_for -> engine optimize_for)", () => {
  it("'cost' (orchestrator-only objective) maps to 'balanced' (engine has no cost objective)", () => {
    expect(mapOptimizeFor("cost")).toBe("balanced");
  });
  it("shared objectives pass through unchanged", () => {
    expect(mapOptimizeFor("tool_life")).toBe("tool_life");
    expect(mapOptimizeFor("productivity")).toBe("productivity");
    expect(mapOptimizeFor("surface_finish")).toBe("surface_finish");
    expect(mapOptimizeFor("balanced")).toBe("balanced");
  });
  it("undefined -> undefined", () => {
    expect(mapOptimizeFor(undefined) === undefined).toBe(true);
  });
});

const ORCH = {
  material: "steel", iso_group: "P", hardness_hb: 220, tool_diameter_mm: 10, flutes: 4,
  tool_material: "carbide", tool_coating: "TiAlN", corner_radius_mm: 0.5, tool_stickout_mm: 30,
  operation: "milling", cut_type: "roughing", strategy: "adaptive", axial_depth_mm: 3, radial_depth_mm: 5,
  machine_power_kw: 15, machine_max_rpm: 12000, machine_max_torque_nm: 100, machine_rigidity: "high",
  coolant_type: "MQL", optimize_for: "cost",
  // orchestrator-only fields that must NOT leak into the engine input:
  machine_name: "Haas VF2", tool_grade: "IC928", cam_strategy: "Dynamic Milling",
  calibration_overrides: { kc1_1_factor: 1.1 },
} as const;

describe("orchestratorToUltimateInput (CONVERGENCE P1 adapter)", () => {
  it("maps the physics-relevant fields 1:1", () => {
    const o = orchestratorToUltimateInput(ORCH as never);
    expect(o.material).toBe("steel");
    expect(o.iso_group).toBe("P");
    expect(o.hardness_hb).toBe(220);
    expect(o.tool_diameter_mm).toBe(10);
    expect(o.flutes).toBe(4);
    expect(o.tool_material).toBe("carbide");
    expect(o.operation).toBe("milling");
    expect(o.cut_type).toBe("roughing");
    expect(o.axial_depth_mm).toBe(3);
    expect(o.radial_depth_mm).toBe(5);
    expect(o.machine_power_kw).toBe(15);
    expect(o.machine_max_rpm).toBe(12000);
    expect(o.machine_max_torque_nm).toBe(100);
    expect(o.machine_rigidity).toBe("high");
  });

  it("applies the coolant + optimize_for transforms", () => {
    const o = orchestratorToUltimateInput(ORCH as never);
    expect(o.coolant).toBe("mql");           // MQL -> mql
    expect(o.optimize_for).toBe("balanced");  // cost -> balanced
  });

  it("does NOT leak orchestrator-only fields into the engine input", () => {
    const o = orchestratorToUltimateInput(ORCH as never) as Record<string, unknown>;
    expect("machine_name" in o).toBe(false);
    expect("tool_grade" in o).toBe(false);
    expect("cam_strategy" in o).toBe(false);
    expect("calibration_overrides" in o).toBe(false);
  });

  it("ROUND-TRIP: the adapted input is engine-consumable -> a valid calc (positive Vc/force, no NaN)", () => {
    const o = orchestratorToUltimateInput(ORCH as never);
    const r = ultimateSpeedFeedEngine.calculate(o as never);
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
    expect(Number.isFinite(r.tool_life.life_minutes.value)).toBe(true);
    expect(r.resolved.iso_group).toBe("P");
  });
});
