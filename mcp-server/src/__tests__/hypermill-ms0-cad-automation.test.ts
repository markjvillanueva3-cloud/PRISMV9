/**
 * HM-REV-MS0: HyperCAD-S CAD Automation + Mock Layer — Tests
 *
 * CRITICAL TEST RULE: All assertions use specific expected values — NOT toBeTruthy().
 *
 * Tests verify:
 *   U-HMR01: HyperCADSAutomationEngine — import/heal/analyze/automate scripts
 *   U-HMR02: PrintToHyperCADSBridge — STEP + material → chained import+heal script
 *   U-HMR03: HyperCADSStockModelEngine — bounding_box/offset_solid/cylinder + hook
 *   U-HMR04: FeatureToStrategyBridgeEngine — feature types → strategy cycles
 *   U-HMR05: HyperCADSMockLayer — deterministic fixtures, interface shape matching
 *
 * HM-REV-MS0 / U-HMR01–U-HMR05
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperCADSAutomationEngine,
  hyperCADSAutomationEngine,
} from "../engines/HyperCADSAutomationEngine.js";
import {
  PrintToHyperCADSBridge,
  printToHyperCADSBridge,
} from "../engines/PrintToHyperCADSBridge.js";
import {
  HyperCADSStockModelEngine,
  hyperCADSStockModelEngine,
  DEFAULT_STOCK_ALLOWANCE_MM,
  registerHyperCADSHooks,
} from "../engines/HyperCADSStockModelEngine.js";
import {
  FeatureToStrategyBridgeEngine,
  featureToStrategyBridgeEngine,
} from "../engines/FeatureToStrategyBridgeEngine.js";
import {
  HyperCADSMockLayer,
  hyperCADSMockLayer,
} from "../engines/HyperCADSMockLayer.js";

// ============================================================================
// U-HMR01: HyperCADSAutomationEngine
// ============================================================================

describe("HyperCADSAutomationEngine (E1160)", () => {
  const engine = new HyperCADSAutomationEngine();

  describe("generateImportScript", () => {
    it("generates valid Python import script with hm.ImportCadFile AC API call", () => {
      const result = engine.generateImportScript({
        file_path: "C:/parts/fixture_block.stp",
        format: "STEP",
        tolerance_mm: 0.01,
        part_name: "fixture_block",
        set_as_workpiece: true,
      });
      expect(result.script).toContain("import hm");
      expect(result.script).toContain("hm.ImportCadFile(");
      expect(result.script).toContain('Format="STEP"');
      expect(result.script).toContain('Tolerance=0.01');
      expect(result.script).toContain('PartName="fixture_block"');
      expect(result.script).toContain('hm.SetWorkpiece(PartName="fixture_block")');
      expect(result.operations).toContain("hyperCADS_import");
      expect(result.line_count).toBeGreaterThan(10);
    });

    it("generates coordinate system setup lines when cs provided", () => {
      const result = engine.generateImportScript({
        file_path: "C:/parts/bracket.stp",
        coordinate_system: {
          origin_offset: [10, 20, 5],
          x_axis: [1, 0, 0],
          y_axis: [0, 1, 0],
        },
      });
      expect(result.script).toContain("hm.SetCoordinateSystemOffset(");
      expect(result.script).toContain("X=10");
      expect(result.script).toContain("hm.SetCoordinateSystemAxes(");
      expect(result.operations).toEqual(["hyperCADS_import"]);
    });

    it("auto-detects STEP format from .step extension", () => {
      const result = engine.generateImportScript({ file_path: "D:/jobs/part.step" });
      expect(result.script).toContain('Format="STEP"');
    });

    it("auto-detects IGES format from .igs extension", () => {
      const result = engine.generateImportScript({ file_path: "D:/jobs/surface.igs" });
      expect(result.script).toContain('Format="IGES"');
    });
  });

  describe("generateHealScript", () => {
    it("generates valid Python heal script with hm.HealGeometry and hm.StitchSurfaces", () => {
      const result = engine.generateHealScript({
        body_name: "imported_part",
        stitch_tolerance_mm: 0.01,
        heal_tolerance_mm: 0.05,
        align_normals: true,
        remove_duplicates: true,
      });
      expect(result.script).toContain("import hm");
      expect(result.script).toContain("hm.StitchSurfaces(");
      expect(result.script).toContain("hm.HealGeometry(");
      expect(result.script).toContain("Tolerance=0.01");
      expect(result.script).toContain("AlignNormals=True");
      expect(result.operations).toContain("hyperCADS_heal");
    });

    it("adds fill holes block when fill_holes_diameter_mm provided", () => {
      const result = engine.generateHealScript({
        fill_holes_diameter_mm: 2.0,
      });
      expect(result.script).toContain("hm.FillSmallHoles(");
      expect(result.script).toContain("MaxDiameter=2");
    });

    it("warns when stitch tolerance > 0.5mm", () => {
      const result = engine.generateHealScript({ stitch_tolerance_mm: 0.8 });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("stitch_tolerance_mm > 0.5mm");
    });
  });

  describe("generateAnalyzeScript", () => {
    it("generates valid Python analysis script with draft angle and wall thickness calls", () => {
      const result = engine.generateAnalyzeScript({
        body_name: "test_body",
        draft_angle_deg: 3.0,
        detect_undercuts: true,
        min_wall_thickness_mm: 1.5,
        tool_direction: [0, 0, 1],
      });
      expect(result.script).toContain("hm.AnalyzeDraftAngle(");
      expect(result.script).toContain("MinDraftAngle=3");
      expect(result.script).toContain("hm.AnalyzeUndercuts(");
      expect(result.script).toContain("hm.AnalyzeWallThickness(");
      expect(result.script).toContain("MinThickness=1.5");
      expect(result.operations).toContain("hyperCADS_analyze");
    });
  });

  describe("generateAutomationScript", () => {
    it("includes import + heal blocks in full automation sequence", () => {
      const result = engine.generateAutomationScript({
        import_params: {
          file_path: "C:/parts/turbine_blade.stp",
          part_name: "turbine_blade",
          set_as_workpiece: true,
        },
        heal: true,
        analyze: false,
      });
      expect(result.script).toContain("hm.ImportCadFile(");
      expect(result.script).toContain("hm.HealGeometry(");
      expect(result.operations).toContain("hyperCADS_import");
      expect(result.operations).toContain("hyperCADS_heal");
      expect(result.operations).not.toContain("hyperCADS_analyze");
    });

    it("includes all 3 operations when analyze=true", () => {
      const result = engine.generateAutomationScript({
        import_params: { file_path: "C:/parts/mold_cavity.stp" },
        heal: true,
        analyze: true,
      });
      expect(result.operations).toContain("hyperCADS_import");
      expect(result.operations).toContain("hyperCADS_heal");
      expect(result.operations).toContain("hyperCADS_analyze");
    });
  });
});

// ============================================================================
// U-HMR02: PrintToHyperCADSBridge
// ============================================================================

describe("PrintToHyperCADSBridge (E1161)", () => {
  const bridge = new PrintToHyperCADSBridge();

  it("generates chained import+heal script from STEP path and material", () => {
    const result = bridge.buildBridgeScript({
      step_file_path: "C:/cad/shaft_assembly.stp",
      material: "316L",
      set_as_workpiece: true,
      run_heal: true,
    });
    expect(result.script).toContain("hm.ImportCadFile(");
    expect(result.script).toContain("hm.HealGeometry(");
    expect(result.operations).toContain("hyperCADS_import");
    expect(result.operations).toContain("hyperCADS_heal");
    expect(result.line_count).toBeGreaterThan(15);
  });

  it("resolves 316L stainless to ISO M group with kc1.1 = 2100", () => {
    const result = bridge.buildBridgeScript({
      step_file_path: "C:/cad/part.stp",
      material: "316L",
    });
    expect(result.material_iso_group).toBe("M");
    expect(result.material_kc1_1).toBe(2100);
  });

  it("warns on non-.stp/.step file extension", () => {
    const result = bridge.buildBridgeScript({
      step_file_path: "C:/cad/file.dxf",
      material: "P",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain(".stp or .step");
  });

  it("extracts part name from file path stem", () => {
    const result = bridge.buildBridgeScript({
      step_file_path: "C:/cad/motor_housing.stp",
      material: "K",
    });
    expect(result.part_name).toBe("motor_housing");
  });

  it("validate() returns false for non-STEP file", () => {
    const v = bridge.validate("C:/cad/drawing.dxf", "316L");
    expect(v.valid).toBe(false);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("validate() returns true for valid STEP + known material", () => {
    const v = bridge.validate("C:/cad/part.step", "7075");
    expect(v.valid).toBe(true);
    expect(v.material_iso_group).toBe("N");
  });
});

// ============================================================================
// U-HMR03: HyperCADSStockModelEngine + DEFAULT_STOCK_ALLOWANCE_MM
// ============================================================================

describe("HyperCADSStockModelEngine (E1162)", () => {
  const engine = new HyperCADSStockModelEngine();

  it("DEFAULT_STOCK_ALLOWANCE_MM is exactly 2.0mm", () => {
    expect(DEFAULT_STOCK_ALLOWANCE_MM).toBe(2.0);
  });

  describe("bounding_box mode", () => {
    it("generates bounding box script with correct offset call", () => {
      const result = engine.generateStockScript({
        mode: "bounding_box",
        body_name: "part_body",
        offset_mm: 2.0,
        stock_name: "stock_bbox",
      });
      expect(result.script).toContain("hm.CreateBoxStock(");
      expect(result.script).toContain("hm.GetBodyBoundingBox(");
      expect(result.mode).toBe("bounding_box");
      expect(result.allowance_mm).toBe(2.0);
      expect(result.stock_name).toBe("stock_bbox");
      expect(result.mock_mode).toBe(false);
    });

    it("defaults to DEFAULT_STOCK_ALLOWANCE_MM = 2.0mm when offset_mm omitted", () => {
      const result = engine.generateStockScript({
        mode: "bounding_box",
        body_name: "part",
      });
      expect(result.allowance_mm).toBe(DEFAULT_STOCK_ALLOWANCE_MM);
      expect(result.allowance_mm).toBe(2.0);
    });
  });

  describe("offset_solid mode", () => {
    it("generates offset solid script with axial and radial allowances", () => {
      const result = engine.generateStockScript({
        mode: "offset_solid",
        body_name: "mold_core",
        axial_allowance_mm: 3.0,
        radial_allowance_mm: 2.5,
        stock_name: "mold_stock",
      });
      expect(result.script).toContain("hm.CreateOffsetSolidStock(");
      expect(result.script).toContain("AxialAllowance=3");
      expect(result.script).toContain("RadialAllowance=2.5");
      expect(result.mode).toBe("offset_solid");
      expect(result.stock_name).toBe("mold_stock");
    });

    it("defaults axial and radial allowance to 2.0mm when omitted", () => {
      const result = engine.generateStockScript({ mode: "offset_solid" });
      expect(result.script).toContain(`AxialAllowance=${DEFAULT_STOCK_ALLOWANCE_MM}`);
      expect(result.script).toContain(`RadialAllowance=${DEFAULT_STOCK_ALLOWANCE_MM}`);
    });

    it("warns when axial_allowance_mm > 10mm", () => {
      const result = engine.generateStockScript({
        mode: "offset_solid",
        axial_allowance_mm: 15,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("axial_allowance_mm > 10mm");
    });
  });

  describe("cylinder mode", () => {
    it("generates cylinder stock script with correct OD and length", () => {
      const result = engine.generateStockScript({
        mode: "cylinder",
        od_mm: 50.0,
        length_mm: 120.0,
        axis: "Z",
        stock_name: "bar_stock",
      });
      expect(result.script).toContain("hm.CreateCylinderStock(");
      expect(result.script).toContain("Diameter=50");
      expect(result.script).toContain("Length=120");
      expect(result.script).toContain('Axis="Z"');
      expect(result.mode).toBe("cylinder");
      expect(result.stock_name).toBe("bar_stock");
    });

    it("adds material assignment when material provided", () => {
      const result = engine.generateStockScript({
        mode: "cylinder",
        od_mm: 80,
        length_mm: 200,
        material: "Inconel 718",
      });
      expect(result.script).toContain('hm.AssignStockMaterial(');
      expect(result.script).toContain('"Inconel 718"');
    });
  });

  it("registerHyperCADSHooks does not throw", () => {
    expect(() => registerHyperCADSHooks()).not.toThrow();
  });
});

// ============================================================================
// U-HMR04: FeatureToStrategyBridgeEngine
// ============================================================================

describe("FeatureToStrategyBridgeEngine (E1163)", () => {
  const bridge = new FeatureToStrategyBridgeEngine();

  it("maps pocket feature to a pocket_2d cycle (Pocket Milling or Optimised Roughing)", () => {
    const rec = bridge.mapFeature({
      type: "pocket",
      depth_mm: 15,
      width_mm: 30,
      material_group: "P",
    });
    // HyperMillStrategyEngine may return "Optimised Roughing" (priority 12) over "Pocket Milling" (priority 10)
    expect(["Pocket Milling", "Optimised Roughing"]).toContain(rec.cycle_name);
    expect(rec.hypermill_geometry_type).toBe("pocket_2d");
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.rationale).toContain("pocket");
  });

  it("maps pocket feature with finishing goal to Pocket Milling cycle", () => {
    const rec = bridge.mapFeature({
      type: "pocket",
      depth_mm: 1.5,   // shallow → finishing goal
      width_mm: 30,
      previously_roughed: true,
      part_tolerance_mm: 0.02,  // tight → finishing
      material_group: "P",
    });
    expect(rec.cycle_name).toBe("Pocket Milling");
    expect(rec.operation_goal).toBe("finishing");
  });

  it("maps freeform feature to a freeform_3d geometry type strategy", () => {
    const rec = bridge.mapFeature({
      type: "freeform",
      surface_area_mm2: 5000,
      draft_angle_deg: 2,
      material_group: "M",
    });
    // freeform_3d maps to one of the known 3D cycles (Optimised Roughing is highest priority)
    expect(rec.hypermill_geometry_type).toBe("freeform_3d");
    expect(rec.cycle_name.length).toBeGreaterThan(3);
    expect(rec.confidence).toBeGreaterThan(0);
    // Verify it's a known 3D cycle
    const known3DCycles = [
      "Optimised Roughing", "Z Level Finishing", "Equidistant Finishing",
      "Parallel Finishing", "Profile Finishing", "Automatic Rest Machining",
      "Arbitrary Stock Roughing",
    ];
    expect(known3DCycles).toContain(rec.cycle_name);
  });

  it("maps hole feature to pocket_2d geometry type", () => {
    const rec = bridge.mapFeature({
      type: "hole",
      depth_mm: 20,
      width_mm: 10,
    });
    expect(rec.hypermill_geometry_type).toBe("pocket_2d");
    expect(rec.operation_goal).toBeDefined();
  });

  it("maps boss feature to contour_2d geometry type", () => {
    const rec = bridge.mapFeature({ type: "boss", depth_mm: 8, width_mm: 25 });
    expect(rec.hypermill_geometry_type).toBe("contour_2d");
  });

  it("selects finishing goal when previously_roughed = true", () => {
    const rec = bridge.mapFeature({
      type: "pocket",
      depth_mm: 10,
      width_mm: 20,
      previously_roughed: true,
      part_tolerance_mm: 0.05,
    });
    expect(rec.operation_goal).toBe("finishing");
  });

  it("selects roughing goal for deep features (depth/width > 2)", () => {
    const rec = bridge.mapFeature({
      type: "slot",
      depth_mm: 50,
      width_mm: 10,   // depth/width = 5 → roughing
    });
    expect(rec.operation_goal).toBe("roughing");
  });

  it("processFeatures returns correct count and recommendations", () => {
    const output = bridge.processFeatures({
      features: [
        { type: "pocket",   depth_mm: 15, width_mm: 30 },
        { type: "hole",     depth_mm: 20, width_mm: 10 },
        { type: "freeform", surface_area_mm2: 3000 },
        { type: "boss",     depth_mm: 5, width_mm: 25 },
      ],
      default_material_group: "K",
    });
    expect(output.feature_count).toBe(4);
    expect(output.recommendations).toHaveLength(4);
    // First feature is pocket_2d — highest priority 3D roughing or pocket milling cycle
    expect(["Pocket Milling", "Optimised Roughing"]).toContain(output.recommendations[0].cycle_name);
    // All recommendations have valid cycle names
    for (const rec of output.recommendations) {
      expect(rec.cycle_name.length).toBeGreaterThan(3);
      expect(rec.confidence).toBeGreaterThan(0);
    }
  });

  it("getSupportedFeatureTypes returns at least 10 types", () => {
    const types = bridge.getSupportedFeatureTypes();
    expect(types.length).toBeGreaterThanOrEqual(10);
    expect(types).toContain("pocket");
    expect(types).toContain("hole");
    expect(types).toContain("freeform");
    expect(types).toContain("groove");
  });

  it("rationale string contains feature type and cycle name", () => {
    const rec = bridge.mapFeature({ type: "groove", depth_mm: 5, width_mm: 8 });
    expect(rec.rationale).toContain("groove");
    expect(rec.rationale).toContain(rec.cycle_name);
  });

  it("suggested_sequence for deep feature is roughing → finishing", () => {
    const rec = bridge.mapFeature({
      type: "pocket",
      depth_mm: 30,
      width_mm: 20,
      part_tolerance_mm: 0.05,
    });
    expect(rec.suggested_sequence[0]).toBe("roughing");
    expect(rec.suggested_sequence).toContain("finishing");
  });
});

// ============================================================================
// U-HMR05: HyperCADSMockLayer
// ============================================================================

describe("HyperCADSMockLayer (E1164)", () => {
  const mock = new HyperCADSMockLayer();

  beforeEach(() => {
    mock.resetCallCount();
  });

  it("isMockActive() returns false when HYPERMILL_MOCK not set", () => {
    // In test environment HYPERMILL_MOCK is not set to 'true'
    const original = process.env["HYPERMILL_MOCK"];
    delete process.env["HYPERMILL_MOCK"];
    expect(mock.isMockActive()).toBe(false);
    if (original !== undefined) process.env["HYPERMILL_MOCK"] = original;
  });

  it("getMockImportResponse returns 5 features", () => {
    const resp = mock.getMockImportResponse();
    expect(resp.features).toHaveLength(5);
    expect(resp.features[0].type).toBe("pocket");
    expect(resp.face_count).toBe(128);
    expect(resp.edge_count).toBe(256);
  });

  it("getMockImportResponse bounding box is 100 × 80 × 40mm", () => {
    const resp = mock.getMockImportResponse();
    expect(resp.bounding_box.x).toBe(100.0);
    expect(resp.bounding_box.y).toBe(80.0);
    expect(resp.bounding_box.z).toBe(40.0);
  });

  it("getMockHealResponse has status 'ok' and 0 remaining open edges", () => {
    const resp = mock.getMockHealResponse();
    expect(resp.status).toBe("ok");
    expect(resp.remaining_open_edges).toBe(0);
    expect(resp.edges_stitched).toBe(12);
    expect(resp.faces_healed).toBe(4);
  });

  it("getMockAnalyzeResponse has realistic draft analysis values", () => {
    const resp = mock.getMockAnalyzeResponse();
    expect(resp.draft_analysis.ok_faces).toBe(118);
    expect(resp.draft_analysis.problem_faces).toBe(10);
    expect(resp.draft_analysis.threshold_deg).toBe(3.0);
    expect(resp.undercut_analysis.undercut_count).toBe(2);
  });

  it("getMockStockModelResponse has allowance_mm = DEFAULT_STOCK_ALLOWANCE_MM = 2.0", () => {
    const resp = mock.getMockStockModelResponse();
    expect(resp.allowance_mm).toBe(DEFAULT_STOCK_ALLOWANCE_MM);
    expect(resp.allowance_mm).toBe(2.0);
    expect(resp.set_as_active).toBe(true);
  });

  it("getMockStockModelResponse bounding box accounts for 2mm allowance on all sides", () => {
    const resp = mock.getMockStockModelResponse();
    // Original part: 100×80×40, stock adds 2*2.0 = 4mm per dimension
    expect(resp.bounding_box.x).toBe(104.0);
    expect(resp.bounding_box.y).toBe(84.0);
    expect(resp.bounding_box.z).toBe(44.0);
  });

  it("getMockScriptResult returns CADSScriptResult interface with script and operations", () => {
    const result = mock.getMockScriptResult("hyperCADS_import");
    expect(result.script).toContain("MOCK MODE");
    expect(result.operations).toContain("hyperCADS_import");
    expect(result.mock_mode).toBe(true);
    expect(result.line_count).toBe(6);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("MOCK MODE");
  });

  it("getMockFeatures returns 5 features matching import response shape", () => {
    const features = mock.getMockFeatures();
    expect(features).toHaveLength(5);
    expect(features[0]).toHaveProperty("type");
    expect(features[0]).toHaveProperty("depth_mm");
    expect(features[0]).toHaveProperty("width_mm");
    expect(features[0]).toHaveProperty("feature_id");
  });

  it("getAllMockResponses returns all 4 response types with correct keys", () => {
    const all = mock.getAllMockResponses();
    expect(all).toHaveProperty("import");
    expect(all).toHaveProperty("heal");
    expect(all).toHaveProperty("analyze");
    expect(all).toHaveProperty("stock");
    expect(all.import.body_name).toBe("mock_imported_part");
    expect(all.heal.status).toBe("ok");
    expect(all.analyze.wall_thickness.min_thickness_mm).toBe(1.2);
    expect(all.stock.allowance_mm).toBe(2.0);
  });

  it("call count increments with each mock call", () => {
    mock.getMockImportResponse();
    mock.getMockHealResponse();
    mock.getMockAnalyzeResponse();
    expect(mock.getCallCount()).toBe(3);
  });

  it("resetCallCount() resets to 0", () => {
    mock.getMockImportResponse();
    mock.resetCallCount();
    expect(mock.getCallCount()).toBe(0);
  });

  it("all 4 operations work without USB key (no real hyperCAD-S needed)", () => {
    // Verify mock layer provides all 4 required responses
    const importResp  = mock.getMockImportResponse("C:/test/part.stp");
    const healResp    = mock.getMockHealResponse("test_body");
    const analyzeResp = mock.getMockAnalyzeResponse("test_body");
    const stockResp   = mock.getMockStockModelResponse("offset_solid");

    expect(importResp.file_path).toBe("C:/test/part.stp");
    expect(healResp.body_name).toBe("test_body");
    expect(analyzeResp.body_name).toBe("test_body");
    expect(stockResp.mode).toBe("offset_solid");
  });
});
