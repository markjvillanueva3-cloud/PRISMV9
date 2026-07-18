import { describe, it, expect } from "vitest";
import {
  tribalCorpusOrchestratorEngine as eng,
  TribalCorpusOrchestratorEngine,
  type OrchestratorInput,
} from "../engines/TribalCorpusOrchestratorEngine.js";

describe("TribalCorpusOrchestratorEngine", () => {
  it("exports singleton with route()", () => {
    expect(eng).toBeInstanceOf(TribalCorpusOrchestratorEngine);
    expect(typeof eng.route).toBe("function");
  });

  it("throws when neither process_category nor hints provided", async () => {
    await expect(eng.route({ child_params: {} } as OrchestratorInput))
      .rejects.toThrow(/provide process_category OR.*machine_type_hint.*operation_hint/);
  });

  it("throws on missing child_params", async () => {
    await expect(eng.route({ process_category: "operator_general" } as unknown as OrchestratorInput))
      .rejects.toThrow(/child_params required/);
  });

  it("explicit process_category=sinker_edm → routes to sinker", async () => {
    const r = await eng.route({
      process_category: "sinker_edm",
      child_params: {
        operation: "roughing",
        electrode_material: "graphite",
        workpiece_material: "tool_steel_hardened",
        dielectric: "kerosene",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("sinker_edm");
    expect(r.routing_reason).toMatch(/explicit/);
    expect(r.routed_action_name).toBe("sinker_edm_tribal_surface");
  });

  it("explicit process_category=laser_cut → routes to laser", async () => {
    const r = await eng.route({
      process_category: "laser_cut",
      child_params: {
        operation: "thin_sheet_cut",
        laser_source: "fiber_1um",
        material: "mild_steel",
        assist_gas: "oxygen",
        material_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("laser_cut");
    expect(r.routed_action_name).toBe("laser_cutting_tribal_surface");
  });

  it("explicit process_category=waterjet → routes to waterjet", async () => {
    const r = await eng.route({
      process_category: "waterjet",
      child_params: {
        operation: "thin_sheet_cut",
        material: "mild_steel",
        abrasive: "garnet_80_mesh",
        pressure_class: "standard_60ksi",
        material_thickness_mm: 6,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("waterjet");
    expect(r.routed_action_name).toBe("waterjet_cutting_tribal_surface");
  });

  it("explicit process_category=grinding → routes to grinding", async () => {
    const r = await eng.route({
      process_category: "grinding",
      child_params: {
        operation: "surface_grind",
        wheel: "aluminum_oxide_tough",
        workpiece: "soft_steel",
        coolant: "flood_water_soluble",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("grinding");
    expect(r.routed_action_name).toBe("grinding_tribal_surface");
  });

  it("explicit process_category=welding → routes to welding", async () => {
    const r = await eng.route({
      process_category: "welding",
      child_params: {
        process: "gtaw_tig",
        base_metal: "mild_steel",
        shield_gas: "argon_100",
        base_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("welding");
    expect(r.routed_action_name).toBe("welding_tribal_surface");
  });

  it("explicit process_category=additive → routes to additive", async () => {
    const r = await eng.route({
      process_category: "additive",
      child_params: {
        process: "fdm_fff",
        material: "pla",
        layer_height: "standard_100um",
        build_height_mm: 50,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("additive");
    expect(r.routed_action_name).toBe("additive_mfg_tribal_surface");
  });

  it("explicit process_category=operator_general → routes to coaching", async () => {
    const r = await eng.route({
      process_category: "operator_general",
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("operator_general");
    expect(r.routed_action_name).toBe("operator_coaching_tips");
  });

  it("infers laser from operation_hint 'fiber laser cut'", async () => {
    const r = await eng.route({
      operation_hint: "fiber laser cut",
      child_params: {
        operation: "thin_sheet_cut",
        laser_source: "fiber_1um",
        material: "mild_steel",
        assist_gas: "oxygen",
        material_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("laser_cut");
    expect(r.routing_reason).toMatch(/keyword match/);
  });

  it("infers waterjet from machine_type_hint 'OMAX waterjet'", async () => {
    const r = await eng.route({
      machine_type_hint: "OMAX waterjet",
      child_params: {
        operation: "thin_sheet_cut",
        material: "mild_steel",
        abrasive: "garnet_80_mesh",
        pressure_class: "standard_60ksi",
        material_thickness_mm: 6,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("waterjet");
  });

  it("infers welding from operation_hint 'TIG weld'", async () => {
    const r = await eng.route({
      operation_hint: "TIG weld",
      child_params: {
        process: "gtaw_tig",
        base_metal: "mild_steel",
        shield_gas: "argon_100",
        base_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("welding");
  });

  it("infers additive from operation_hint 'DMLS print'", async () => {
    const r = await eng.route({
      operation_hint: "DMLS print",
      child_params: {
        process: "dmls_slm",
        material: "stainless_316L",
        layer_height: "standard_100um",
        build_height_mm: 50,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("additive");
  });

  it("infers grinding from machine_type_hint 'Studer cylindrical grinder'", async () => {
    const r = await eng.route({
      machine_type_hint: "Studer cylindrical grinder",
      child_params: {
        operation: "cylindrical_grind",
        wheel: "aluminum_oxide_tough",
        workpiece: "soft_steel",
        coolant: "flood_water_soluble",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("grinding");
  });

  it("infers sinker_edm from machine_type_hint 'sinker EDM die-sink'", async () => {
    const r = await eng.route({
      machine_type_hint: "sinker EDM die-sink",
      child_params: {
        operation: "roughing",
        electrode_material: "graphite",
        workpiece_material: "tool_steel_hardened",
        dielectric: "kerosene",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("sinker_edm");
  });

  it("falls back to operator_general from mill hint", async () => {
    const r = await eng.route({
      machine_type_hint: "mill",
      operation_hint: "drilling stainless",
      child_params: {
        machine_type: "mill",
        operation: "drilling",
        material: "stainless",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("operator_general");
  });

  it("specific-process keyword beats operator_general on ties (laser+mill → laser)", async () => {
    const r = await eng.route({
      machine_type_hint: "5-axis mill with fiber laser head",
      operation_hint: "laser etch",
      child_params: {
        operation: "etching_marking",
        laser_source: "fiber_1um",
        material: "mild_steel",
        assist_gas: "nitrogen",
        material_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("laser_cut");
  });

  it("falls back to operator_general when no keyword matches", async () => {
    const r = await eng.route({
      machine_type_hint: "unknown-process-xyz",
      operation_hint: "something-else",
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.routed_to).toBe("operator_general");
    expect(r.routing_reason).toMatch(/no specific-process keyword|defaulting to operator_general/);
  });

  it("child result carries through with array top_tips + populated action priority (laser)", async () => {
    const r = await eng.route({
      process_category: "laser_cut",
      child_params: {
        operation: "thin_sheet_cut",
        laser_source: "fiber_1um",
        material: "mild_steel",
        assist_gas: "oxygen",
        material_thickness_mm: 3,
        operator_skill_level: "intermediate",
      },
    });
    const child = r.child_result as {
      top_tips: Array<{ tip: string; source: string; confidence: number; match_score: number }>;
      recommended_action_priority: { value: string; unit: string; source: string };
    };
    expect(Array.isArray(child.top_tips)).toBe(true);
    expect(child.top_tips.length).toBeGreaterThan(0);
    expect(typeof child.top_tips[0].tip).toBe("string");
    expect(child.top_tips[0].confidence).toBeGreaterThan(0);
    expect(child.recommended_action_priority.value).toMatch(/ADVISORY|GUIDED|URGENT|ELEVATED/);
    expect(child.recommended_action_priority.unit).toBe("priority tier");
  });

  it("forwards top_n knob to child via child_params", async () => {
    const r = await eng.route({
      process_category: "operator_general",
      top_n: 2,
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
      },
    });
    const child = r.child_result as { top_tips: unknown[] };
    expect(child.top_tips.length).toBeLessThanOrEqual(2);
  });

  it("forwards min_confidence knob to child via child_params", async () => {
    const r = await eng.route({
      process_category: "operator_general",
      min_confidence: 0.95,
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
        top_n: 100,
      },
    });
    const child = r.child_result as { top_tips: Array<{ confidence: number }> };
    child.top_tips.forEach(t => expect(t.confidence).toBeGreaterThanOrEqual(0.95));
  });

  it("explicit child_params top_n NOT overridden by orchestrator top_n", async () => {
    const r = await eng.route({
      process_category: "operator_general",
      top_n: 5,
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
        top_n: 1,  // explicit child param wins
      },
    });
    const child = r.child_result as { top_tips: unknown[] };
    expect(child.top_tips.length).toBeLessThanOrEqual(1);
  });

  it("source cites the 7-corpus septet", async () => {
    const r = await eng.route({
      process_category: "operator_general",
      child_params: {
        machine_type: "mill",
        operation: "milling_rough",
        material: "steel",
        operator_skill_level: "intermediate",
      },
    });
    expect(r.source).toMatch(/7-corpus tribal septet|OperatorCoaching.*SinkerEDM.*LaserCutting.*Waterjet.*Grinding.*Welding.*AdditiveMfg/s);
  });

  it("child-engine validation errors propagate through orchestrator", async () => {
    await expect(eng.route({
      process_category: "laser_cut",
      child_params: {}, // missing required fields → child throws
    })).rejects.toThrow(/laser_cut.*failed|operation \+ laser_source/);
  });

  it("all 7 categories are routable via explicit dispatch (parallel)", async () => {
    const allCategories: Array<{ cat: string; params: Record<string, unknown> }> = [
      { cat: "operator_general", params: { machine_type: "mill", operation: "milling_rough", material: "steel", operator_skill_level: "intermediate" } },
      { cat: "sinker_edm", params: { operation: "roughing", electrode_material: "graphite", workpiece_material: "tool_steel_hardened", dielectric: "kerosene", operator_skill_level: "intermediate" } },
      { cat: "laser_cut", params: { operation: "thin_sheet_cut", laser_source: "fiber_1um", material: "mild_steel", assist_gas: "oxygen", material_thickness_mm: 3, operator_skill_level: "intermediate" } },
      { cat: "waterjet", params: { operation: "thin_sheet_cut", material: "mild_steel", abrasive: "garnet_80_mesh", pressure_class: "standard_60ksi", material_thickness_mm: 6, operator_skill_level: "intermediate" } },
      { cat: "grinding", params: { operation: "surface_grind", wheel: "aluminum_oxide_tough", workpiece: "soft_steel", coolant: "flood_water_soluble", operator_skill_level: "intermediate" } },
      { cat: "welding", params: { process: "gtaw_tig", base_metal: "mild_steel", shield_gas: "argon_100", base_thickness_mm: 3, operator_skill_level: "intermediate" } },
      { cat: "additive", params: { process: "fdm_fff", material: "pla", layer_height: "standard_100um", build_height_mm: 50, operator_skill_level: "intermediate" } },
    ];
    const results = await Promise.all(
      allCategories.map(({ cat, params }) =>
        eng.route({ process_category: cat as never, child_params: params })
      )
    );
    results.forEach((r, i) => {
      expect(r.routed_to).toBe(allCategories[i].cat);
      // Verify the child returned a non-empty top_tips array (real result, not stub)
      const child = r.child_result as { top_tips: Array<{ tip: string }> };
      expect(Array.isArray(child.top_tips)).toBe(true);
      expect(child.top_tips.length).toBeGreaterThan(0);
      expect(typeof child.top_tips[0].tip).toBe("string");
    });
  });
});
