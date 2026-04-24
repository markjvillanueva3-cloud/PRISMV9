/**
 * FiveAxisCADTemplateEngine tests
 * Covers hook registration + dispatch, parameter extraction from CAD models,
 * parameter grouping + constraints, template storage, event logging, and
 * processCADEvent end-to-end with a default hook.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  FiveAxisCADTemplateEngine,
  type CADEvent,
  type CADFeature,
  type CADModel,
  type CADTemplateHook,
} from "../engines/FiveAxisCADTemplateEngine.js";

const EXPECTED_DEFAULT_HOOKS = 3;

function makeBBox(l = 100, w = 80, h = 50) {
  return { min_x: 0, max_x: l, min_y: 0, max_y: w, min_z: 0, max_z: h };
}

function makeFeature(overrides: Partial<CADFeature> = {}): CADFeature {
  return {
    id: "F1",
    name: "main_pocket",
    type: "freeform_surface",
    dimensions: {
      length_mm: 40,
      width_mm: 30,
      depth_mm: 15,
      fillet_radius_mm: 3,
    },
    surface_area_mm2: 1200,
    volume_mm3: 18000,
    tolerance_class: "fine",
    surface_finish_target_um: 0.8,
    ...overrides,
  };
}

function makeModel(overrides: Partial<CADModel> = {}): CADModel {
  return {
    id: "M_TEST",
    name: "Test Part",
    format: "prism",
    created_at: "2024-01-01T00:00:00Z",
    modified_at: "2024-01-01T00:00:00Z",
    version: 1,
    bounding_box: makeBBox(),
    features: [makeFeature()],
    parameters: [],
    part_number: "B-1000",
    customer_id: "ITW",
    ...overrides,
  };
}

function makeEvent(type: CADEvent["type"] = "model_created"): CADEvent {
  return {
    type,
    timestamp: "2024-01-01T00:00:00Z",
    model_id: "M_TEST",
    model_name: "Test Part",
    source: "prism_cad",
  };
}

describe("FiveAxisCADTemplateEngine hook registry", () => {
  beforeEach(() => {
    FiveAxisCADTemplateEngine.clearAll();
  });

  it("starts with zero hooks after clearAll()", () => {
    expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toEqual([]);
  });

  it("registerHook adds a hook retrievable by getRegisteredHooks()", () => {
    const hook: CADTemplateHook = {
      id: "H1", name: "Hook One", event_types: ["model_created"],
      priority: 10, enabled: true, handler: async () => null,
    };
    FiveAxisCADTemplateEngine.registerHook(hook);
    const all = FiveAxisCADTemplateEngine.getRegisteredHooks();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("H1");
  });

  it("unregisterHook returns true when removing a known id, false for unknown", () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H1", name: "H", event_types: ["model_created"],
      priority: 10, enabled: true, handler: async () => null,
    });
    expect(FiveAxisCADTemplateEngine.unregisterHook("H1")).toBe(true);
    expect(FiveAxisCADTemplateEngine.unregisterHook("not_a_hook")).toBe(false);
    expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toEqual([]);
  });

  it("getRegisteredHooks returns hooks sorted by priority ascending", () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_HIGH", name: "high", event_types: ["model_created"],
      priority: 50, enabled: true, handler: async () => null,
    });
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_LOW", name: "low", event_types: ["model_created"],
      priority: 5, enabled: true, handler: async () => null,
    });
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_MID", name: "mid", event_types: ["model_created"],
      priority: 20, enabled: true, handler: async () => null,
    });
    const sorted = FiveAxisCADTemplateEngine.getRegisteredHooks();
    expect(sorted.map(h => h.id)).toEqual(["H_LOW", "H_MID", "H_HIGH"]);
  });

  it("registerDefaultHooks registers exactly 3 PRISM hooks", () => {
    FiveAxisCADTemplateEngine.registerDefaultHooks();
    const all = FiveAxisCADTemplateEngine.getRegisteredHooks();
    expect(all).toHaveLength(EXPECTED_DEFAULT_HOOKS);
    const ids = all.map(h => h.id);
    expect(ids).toContain("prism_model_created");
    expect(ids).toContain("prism_model_finalized");
    expect(ids).toContain("prism_feature_modified");
  });
});

describe("FiveAxisCADTemplateEngine.extractFeatureParameters", () => {
  it("emits linear parameters for each non-zero dimensional field", () => {
    const params = FiveAxisCADTemplateEngine.extractFeatureParameters(makeFeature());
    const ids = params.map(p => p.id);
    expect(ids).toContain("main_pocket_length");
    expect(ids).toContain("main_pocket_width");
    expect(ids).toContain("main_pocket_depth");
    expect(ids).toContain("main_pocket_fillet_radius");
  });

  it("attaches a tolerance parameter when feature.tolerance_class is set", () => {
    const params = FiveAxisCADTemplateEngine.extractFeatureParameters(
      makeFeature({ tolerance_class: "fine" }),
    );
    const tol = params.find(p => p.type === "tolerance");
    expect(tol?.value).toBe("fine");
    expect(tol?.allowed_values).toEqual(["fine", "medium", "coarse"]);
  });

  it("attaches a surface_finish parameter with Ra units when target is set", () => {
    const params = FiveAxisCADTemplateEngine.extractFeatureParameters(
      makeFeature({ surface_finish_target_um: 0.8 }),
    );
    const sf = params.find(p => p.id.endsWith("_surface_finish"));
    expect(sf?.value).toBe(0.8);
    expect(sf?.unit).toBe("Ra um");
  });

  it("does not emit parameters for omitted optional dimensions", () => {
    const minimal = makeFeature({
      dimensions: { length_mm: 10, width_mm: 0, depth_mm: 0 },
      tolerance_class: undefined,
      surface_finish_target_um: undefined,
    });
    const params = FiveAxisCADTemplateEngine.extractFeatureParameters(minimal);
    const ids = params.map(p => p.id);
    expect(ids).toContain("main_pocket_length");
    expect(ids).not.toContain("main_pocket_width");
    expect(ids).not.toContain("main_pocket_depth");
    expect(ids).not.toContain("main_pocket_fillet_radius");
    expect(ids).not.toContain("main_pocket_tolerance");
  });
});

describe("FiveAxisCADTemplateEngine.extractParameters", () => {
  it("emits the three envelope parameters with values matching the bounding box deltas", () => {
    const model = makeModel({ bounding_box: makeBBox(120, 60, 25), features: [] });
    const params = FiveAxisCADTemplateEngine.extractParameters(model);
    const byId = new Map(params.map(p => [p.id, p]));
    expect(byId.get("overall_length")?.value).toBe(120);
    expect(byId.get("overall_width")?.value).toBe(60);
    expect(byId.get("overall_height")?.value).toBe(25);
  });

  it("flags all envelope parameters as affects_strategy=true", () => {
    const params = FiveAxisCADTemplateEngine.extractParameters(makeModel());
    for (const id of ["overall_length", "overall_width", "overall_height"]) {
      const p = params.find(param => param.id === id);
      expect(p?.affects_strategy).toBe(true);
    }
  });

  it("adds a material_iso_group parameter when model.material is assigned", () => {
    const params = FiveAxisCADTemplateEngine.extractParameters(makeModel({
      material: {
        name: "P20", iso_group: "P", kc11_mpa: 2200, mc: 0.25,
        density_kg_m3: 7850, thermal_conductivity_w_mk: 35, specific_heat_j_kgk: 460,
      },
    }));
    const mat = params.find(p => p.id === "material_iso_group");
    expect(mat?.value).toBe("P");
    expect(mat?.allowed_values).toEqual(["P", "M", "K", "N", "S", "H"]);
  });

  it("omits material_iso_group when model.material is missing", () => {
    const params = FiveAxisCADTemplateEngine.extractParameters(makeModel());
    expect(params.find(p => p.id === "material_iso_group")).toEqual(undefined);
  });
});

describe("FiveAxisCADTemplateEngine.createParameterGroups", () => {
  it("groups parameters by category and places Envelope first (not collapsed)", () => {
    const model = makeModel();
    const params = FiveAxisCADTemplateEngine.extractParameters(model);
    const groups = FiveAxisCADTemplateEngine.createParameterGroups(params);
    const envelope = groups.find(g => g.name === "Envelope");
    expect(envelope?.collapsed_by_default).toBe(false);
    expect(envelope?.parameters).toContain("overall_length");
  });

  it("marks non-Envelope / non-Material categories as collapsed_by_default=true", () => {
    const params = FiveAxisCADTemplateEngine.extractParameters(makeModel());
    const groups = FiveAxisCADTemplateEngine.createParameterGroups(params);
    const pocket = groups.find(g => g.name === "main_pocket");
    expect(pocket?.collapsed_by_default).toBe(true);
  });

  it("emits the same number of groups as there are distinct categories in the input", () => {
    const params = FiveAxisCADTemplateEngine.extractParameters(makeModel());
    const groups = FiveAxisCADTemplateEngine.createParameterGroups(params);
    const expectedCategories = new Set(params.map(p => p.category));
    expect(groups).toHaveLength(expectedCategories.size);
  });
});

describe("FiveAxisCADTemplateEngine.generateConstraints", () => {
  it("emits a fillet-size-limit inequality constraint for each fillet radius parameter", () => {
    const model = makeModel();
    const params = FiveAxisCADTemplateEngine.extractParameters(model);
    const constraints = FiveAxisCADTemplateEngine.generateConstraints(params, model);
    const filletConstraint = constraints.find(c => c.id.includes("fillet_radius_max"));
    expect(filletConstraint?.type).toBe("inequality");
    expect(filletConstraint?.error_message).toContain("less than half");
  });

  it("emits no fillet constraints when no features have fillet_radius_mm set", () => {
    const model = makeModel({
      features: [makeFeature({
        dimensions: { length_mm: 40, width_mm: 30, depth_mm: 15 }, // no fillet
      })],
    });
    const params = FiveAxisCADTemplateEngine.extractParameters(model);
    const constraints = FiveAxisCADTemplateEngine.generateConstraints(params, model);
    expect(constraints.find(c => c.id.includes("fillet_radius_max"))).toEqual(undefined);
  });
});

describe("FiveAxisCADTemplateEngine.processCADEvent", () => {
  beforeEach(() => {
    FiveAxisCADTemplateEngine.clearAll();
  });

  it("returns one result per enabled hook matching the event type", async () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_ACTIVE", name: "Active", event_types: ["model_created"],
      priority: 10, enabled: true, handler: async () => null,
    });
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_DISABLED", name: "Disabled", event_types: ["model_created"],
      priority: 20, enabled: false, handler: async () => null,
    });
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_WRONG_TYPE", name: "Wrong", event_types: ["feature_added"],
      priority: 30, enabled: true, handler: async () => null,
    });
    const results = await FiveAxisCADTemplateEngine.processCADEvent(makeEvent("model_created"), makeModel());
    expect(results).toHaveLength(1);
    expect(results[0].hook_id).toBe("H_ACTIVE");
    expect(results[0].success).toBe(true);
  });

  it("captures handler-thrown errors as success=false with a reason string", async () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_THROWS", name: "Throws", event_types: ["model_created"],
      priority: 10, enabled: true,
      handler: async () => { throw new Error("synthetic handler failure"); },
    });
    const results = await FiveAxisCADTemplateEngine.processCADEvent(makeEvent(), makeModel());
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("synthetic handler failure");
    expect(results[0].template_generated).toBe(false);
  });

  it("skips a hook whose filter returns false", async () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H_FILTERED", name: "Filtered", event_types: ["model_created"],
      priority: 10, enabled: true,
      filter: () => false,
      handler: async () => null,
    });
    const results = await FiveAxisCADTemplateEngine.processCADEvent(makeEvent(), makeModel());
    expect(results).toEqual([]);
  });

  it("appends the event to the event log", async () => {
    FiveAxisCADTemplateEngine.clearEventLog();
    expect(FiveAxisCADTemplateEngine.getEventLog()).toEqual([]);
    await FiveAxisCADTemplateEngine.processCADEvent(makeEvent(), makeModel());
    const logged = FiveAxisCADTemplateEngine.getEventLog();
    expect(logged).toHaveLength(1);
    expect(logged[0].type).toBe("model_created");
  });
});

describe("FiveAxisCADTemplateEngine template storage", () => {
  beforeEach(() => {
    FiveAxisCADTemplateEngine.clearAll();
  });

  it("getTemplate returns undefined for unknown ids", () => {
    expect(FiveAxisCADTemplateEngine.getTemplate("nonexistent") === undefined).toBe(true);
  });

  it("getAllTemplates is empty on a freshly cleared engine", () => {
    expect(FiveAxisCADTemplateEngine.getAllTemplates()).toEqual([]);
  });

  it("findTemplateForModel returns undefined when no templates contain the model id", () => {
    expect(FiveAxisCADTemplateEngine.findTemplateForModel("M_TEST") === undefined).toBe(true);
  });

  it("getVariants returns [] for unknown template ids", () => {
    expect(FiveAxisCADTemplateEngine.getVariants("not_a_template")).toEqual([]);
  });

  it("clearEventLog empties the event log independently of hooks and templates", async () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H1", name: "h1", event_types: ["model_created"],
      priority: 10, enabled: true, handler: async () => null,
    });
    await FiveAxisCADTemplateEngine.processCADEvent(makeEvent(), makeModel());
    expect(FiveAxisCADTemplateEngine.getEventLog().length).toBeGreaterThan(0);
    FiveAxisCADTemplateEngine.clearEventLog();
    expect(FiveAxisCADTemplateEngine.getEventLog()).toEqual([]);
    // Hook remains after clearEventLog
    expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toHaveLength(1);
  });

  it("clearAll wipes hooks, templates, variants, and the event log together", async () => {
    FiveAxisCADTemplateEngine.registerHook({
      id: "H1", name: "h1", event_types: ["model_created"],
      priority: 10, enabled: true, handler: async () => null,
    });
    await FiveAxisCADTemplateEngine.processCADEvent(makeEvent(), makeModel());
    FiveAxisCADTemplateEngine.clearAll();
    expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toEqual([]);
    expect(FiveAxisCADTemplateEngine.getAllTemplates()).toEqual([]);
    expect(FiveAxisCADTemplateEngine.getEventLog()).toEqual([]);
  });
});
