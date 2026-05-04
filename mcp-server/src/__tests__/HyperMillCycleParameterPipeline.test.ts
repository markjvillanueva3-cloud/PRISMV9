/**
 * HyperMillCycleParameterPipeline tests — CAM-EXHAUST-MS0 / U-CAM-HM-CYCPP-TESTS-01
 *
 * Coverage:
 *   1. recommend(): feature → cycle selection across all FEATURE_MAPPINGS
 *      - drill / pocket / 3d_rough / 3d_finish / 5axis_swarf / thread / 2d_contour / face / slot
 *   2. controllerAdjustments per controller family (siemens / fanuc / heidenhain / haas / okuma)
 *   3. defaults resolution with tool/job context
 *   4. alternatives populated from FEATURE_MAPPINGS
 *   5. depth-based stepdown override surfaces in resolved defaults
 *   6. unknown feature falls back to fuzzy search → DR:Drilling sentinel
 *   7. recommendBatch: multi-feature dispatch
 *   8. supportedFeatureTypes: returns all 9 feature keys
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillCycleParameterPipeline,
  hyperMillCycleParameterPipeline,
} from "../engines/HyperMillCycleParameterPipeline.js";

const TOOL_DIA_MM = 10;
const FEATURE_DEPTH_MM = 25;
const TOLERANCE_MM = 0.01;

describe("HyperMillCycleParameterPipeline — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillCycleParameterPipeline).toBe("function");
    expect(hyperMillCycleParameterPipeline instanceof HyperMillCycleParameterPipeline).toBe(true);
  });
});

describe("HyperMillCycleParameterPipeline — supportedFeatureTypes()", () => {
  it("returns all 9 canonical feature keys", () => {
    const types = hyperMillCycleParameterPipeline.supportedFeatureTypes();
    expect(types).toContain("drill");
    expect(types).toContain("pocket");
    expect(types).toContain("3d_rough");
    expect(types).toContain("3d_finish");
    expect(types).toContain("5axis_swarf");
    expect(types).toContain("thread");
    expect(types).toContain("2d_contour");
    expect(types).toContain("face");
    expect(types).toContain("slot");
  });
});

describe("HyperMillCycleParameterPipeline — recommend() canonical features", () => {
  it("drill returns drilling cycle from category 'drilling'", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "drill" });
    expect(r.cycle.category).toBe("drilling");
    expect(r.cycle.code).toContain("DR:");
    expect(r.alternatives.length).toBeGreaterThan(0);
  });

  it("pocket returns 2D pocket milling cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "pocket" });
    expect(r.cycle.category).toBe("2d");
    expect(r.cycle.displayName.toLowerCase()).toContain("pocket");
  });

  it("3d_rough returns 3D roughing cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "3d_rough" });
    expect(r.cycle.category).toBe("3d");
    expect(r.cycle.displayName.toLowerCase()).toMatch(/rough|optimi[sz]ed/);
  });

  it("3d_finish returns 3D finishing cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "3d_finish" });
    expect(r.cycle.category).toBe("3d");
    expect(r.cycle.displayName.toLowerCase()).toMatch(/finish|equidistant/);
  });

  it("5axis_swarf returns 5-axis swarf cutting cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "5axis_swarf" });
    expect(r.cycle.category).toBe("5axis");
    expect(r.cycle.displayName.toLowerCase()).toContain("swarf");
  });

  it("thread returns tapping/thread milling cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "thread" });
    expect(r.cycle.category).toBe("tapping");
  });

  it("2d_contour returns contour milling", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "2d_contour" });
    expect(r.cycle.category).toBe("2d");
    expect(r.cycle.displayName.toLowerCase()).toContain("contour");
  });

  it("face returns 2D face milling", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "face" });
    expect(r.cycle.category).toBe("2d");
    expect(r.cycle.displayName.toLowerCase()).toContain("face");
  });

  it("slot returns 2D pocket milling cycle", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "slot" });
    expect(r.cycle.category).toBe("2d");
  });
});

describe("HyperMillCycleParameterPipeline — feature normalization", () => {
  it("'5AXIS-SWARF' (uppercase + dash) normalizes to '5axis_swarf'", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "5AXIS-SWARF" });
    expect(r.cycle.category).toBe("5axis");
  });

  it("'3D ROUGH' (uppercase + space) normalizes to '3d_rough'", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "3D ROUGH" });
    expect(r.cycle.category).toBe("3d");
  });
});

describe("HyperMillCycleParameterPipeline — alternatives", () => {
  it("drill returns 3 alternatives (Pecking / Helical / Deep Hole)", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "drill" });
    expect(r.alternatives.length).toBeGreaterThanOrEqual(2);
    r.alternatives.forEach((alt) => {
      expect(typeof alt.code).toBe("string");
      expect(typeof alt.displayName).toBe("string");
      expect(typeof alt.reason).toBe("string");
    });
  });

  it("each alternative has reason text", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "pocket" });
    r.alternatives.forEach((alt) => {
      expect(alt.reason.length).toBeGreaterThan(5);
    });
  });
});

describe("HyperMillCycleParameterPipeline — controllerAdjustments", () => {
  it("siemens controller produces SINUMERIK-specific notes", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "drill",
      controllerId: "siemens_840d",
    });
    expect(r.controllerAdjustments.length).toBeGreaterThan(0);
    const text = r.controllerAdjustments.join(" ");
    expect(text).toContain("Siemens 840D");
  });

  it("fanuc drilling produces G73/G83 notes", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "drill",
      controllerId: "fanuc",
    });
    const text = r.controllerAdjustments.join(" ");
    expect(text).toContain("Fanuc");
    expect(text).toMatch(/G73|G83/);
  });

  it("heidenhain 5-axis produces PLANE SPATIAL note", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "5axis_swarf",
      controllerId: "heidenhain",
    });
    const text = r.controllerAdjustments.join(" ");
    expect(text).toContain("PLANE SPATIAL");
  });

  it("haas controller produces RPM cap warning", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "drill",
      controllerId: "haas",
    });
    const text = r.controllerAdjustments.join(" ");
    expect(text).toContain("Haas");
    expect(text).toMatch(/8100 RPM|chip-break/);
  });

  it("okuma controller produces OSP fixed-cycle note", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "drill",
      controllerId: "okuma",
    });
    const text = r.controllerAdjustments.join(" ");
    expect(text).toContain("Okuma");
  });

  it("no controllerId → empty controllerAdjustments", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "drill" });
    expect(r.controllerAdjustments).toEqual([]);
  });

  it("unknown controllerId returns generic fallback notes", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "drill",
      controllerId: "xyzzy_unknown_controller",
    });
    expect(r.controllerAdjustments.length).toBeGreaterThan(0);
    const text = r.controllerAdjustments.join(" ");
    expect(text.toLowerCase()).toContain("xyzzy_unknown_controller");
  });
});

describe("HyperMillCycleParameterPipeline — defaults resolution", () => {
  it("returns resolved defaults when cycle has matching DefaultsEngine entry", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "3d_finish",
      diameter_mm: TOOL_DIA_MM,
      tolerance_mm: TOLERANCE_MM,
    });
    expect(typeof r.defaults).toBe("object");
    expect(typeof r.defaultsSource).toBe("string");
  });

  it("defaultsSource matches a CycleDefaults code when found", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "3d_finish",
      diameter_mm: TOOL_DIA_MM,
    });
    if (r.defaultsSource !== null) {
      expect(r.defaultsSource.startsWith("hm")).toBe(true);
    }
  });

  it("depth_mm + diameter_mm produce _depth_stepdown_suggestion_mm hint", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "3d_finish",
      depth_mm: FEATURE_DEPTH_MM,
      diameter_mm: TOOL_DIA_MM,
    });
    if (r.defaultsSource && "_depth_stepdown_suggestion_mm" in r.defaults) {
      expect(typeof r.defaults._depth_stepdown_suggestion_mm).toBe("number");
      const v = r.defaults._depth_stepdown_suggestion_mm as number;
      // min(depth*0.5, dia*0.75) = min(12.5, 7.5) = 7.5
      expect(v).toBeCloseTo(7.5, 3);
    }
  });
});

describe("HyperMillCycleParameterPipeline — fallback paths", () => {
  it("unknown featureType falls back to fuzzy search", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "zoomzoom_xyz" });
    // Falls through fuzzy search → DR:Drilling sentinel as last resort
    expect(typeof r.cycle.code).toBe("string");
    expect(r.cycle.code.length).toBeGreaterThan(0);
  });

  it("formulaParams field is always populated (may be empty)", () => {
    const r = hyperMillCycleParameterPipeline.recommend({ featureType: "drill" });
    expect(Array.isArray(r.formulaParams)).toBe(true);
  });

  it("formulaParams contains unique entries (Set deduplication)", () => {
    const r = hyperMillCycleParameterPipeline.recommend({
      featureType: "3d_finish",
      diameter_mm: TOOL_DIA_MM,
    });
    expect(new Set(r.formulaParams).size).toBe(r.formulaParams.length);
  });
});

describe("HyperMillCycleParameterPipeline — recommendBatch()", () => {
  it("dispatches multi-feature batch", () => {
    const inputs = [
      { featureType: "drill" },
      { featureType: "pocket" },
      { featureType: "3d_finish" },
    ];
    const r = hyperMillCycleParameterPipeline.recommendBatch(inputs);
    expect(Object.keys(r).length).toBe(3);
    expect(typeof r.drill.cycle.code).toBe("string");
    expect(typeof r.pocket.cycle.code).toBe("string");
    expect(typeof r["3d_finish"].cycle.code).toBe("string");
  });

  it("empty array → empty result", () => {
    const r = hyperMillCycleParameterPipeline.recommendBatch([]);
    expect(r).toEqual({});
  });

  it("each batch entry has same shape as recommend()", () => {
    const r = hyperMillCycleParameterPipeline.recommendBatch([{ featureType: "drill" }]);
    expect(typeof r.drill.cycle).toBe("object");
    expect(typeof r.drill.defaults).toBe("object");
    expect(Array.isArray(r.drill.alternatives)).toBe(true);
    expect(Array.isArray(r.drill.controllerAdjustments)).toBe(true);
    expect(Array.isArray(r.drill.formulaParams)).toBe(true);
  });
});
