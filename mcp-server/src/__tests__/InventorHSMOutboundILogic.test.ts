/**
 * InventorHSMPluginAdapterEngine outbound iLogic tests — U-CAM87-HSM
 * ===================================================================
 * Verifies PRISM → Inventor HSM envelope builders produce valid iLogic
 * VB.NET rule text + parameter bundles that the HSM plugin replays via
 * Inventor's iLogic engine.
 *
 * These tests are deterministic: no live Inventor instance is touched.
 * Round-4 B2-NEW fix — closes HSM outbound-builder symmetry gap.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InventorHSMPluginAdapterEngine } from "../engines/InventorHSMPluginAdapterEngine.js";

describe("InventorHSMPluginAdapterEngine outbound iLogic — envelope structure", () => {
  beforeEach(() => {
    InventorHSMPluginAdapterEngine.__resetOutboundIlogicId();
  });

  it("buildSetupCreateEnvelope returns com-ilogic protocol + HSM.Setup.Create", () => {
    const env = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "proj1",
      setup_name: "Setup 1",
      wcs: { origin: { x: 0, y: 0, z: 0 } },
      stock_mode: "box",
      stock_dimensions: { x: 100, y: 80, z: 20 },
    });
    expect(env.protocol).toBe("com-ilogic");
    expect(env.method).toBe("HSM.Setup.Create");
    expect(env.ilogic_rule).toContain("Sub Main()");
    expect(env.ilogic_rule).toContain("End Sub");
    expect(env.ilogic_rule).toContain("hsm.Setups.Add");
  });

  it("buildSetupCreateEnvelope throws without setup_name", () => {
    expect(() =>
      InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
        project_id: "p",
        setup_name: "",
        wcs: { origin: { x: 0, y: 0, z: 0 } },
        stock_mode: "box",
      })
    ).toThrow(/setup_name/);
  });

  it("buildOperationCreateEnvelope accepts all 11 strategy enum values", () => {
    const strategies = [
      "adaptive_clearing",
      "pocket_2d",
      "contour_2d",
      "parallel_3d",
      "scallop_3d",
      "pencil_3d",
      "drill",
      "bore",
      "thread_mill",
      "imachining_2d",
      "imachining_3d",
    ] as const;
    for (const strategy of strategies) {
      const env = InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        setup_id: "s1",
        strategy,
        tool_id: "T1",
        geometry_refs: ["face1"],
        parameters: { spindle_speed: 10000, cutting_feedrate: 2500 },
      });
      expect(env.method).toBe("HSM.Operation.Create");
      expect(env.params.strategy).toBe(strategy);
      expect(env.ilogic_rule).toContain(`setup.Operations.Add("${strategy}")`);
    }
  });

  it("buildOperationCreateEnvelope enforces required params", () => {
    const valid = {
      project_id: "p",
      setup_id: "s",
      strategy: "adaptive_clearing" as const,
      tool_id: "T1",
      geometry_refs: ["f1"],
      parameters: { spindle_speed: 5000, cutting_feedrate: 1000 },
    };
    expect(() =>
      InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, tool_id: "" })
    ).toThrow(/tool_id/);
    expect(() =>
      InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, geometry_refs: [] })
    ).toThrow(/geometry_ref/);
    expect(() =>
      InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_speed: 0, cutting_feedrate: 1000 },
      })
    ).toThrow(/spindle_speed/);
    expect(() =>
      InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_speed: 5000, cutting_feedrate: 0 },
      })
    ).toThrow(/cutting_feedrate/);
  });

  it("buildToolLibraryAddEnvelope generates ToolLibrary.Add rule with tool metadata", () => {
    const env = InventorHSMPluginAdapterEngine.buildToolLibraryAddEnvelope({
      project_id: "p",
      tool: {
        tool_id: "T5",
        tool_type: "endmill",
        diameter_mm: 6,
        flutes: 4,
        corner_radius_mm: 0.5,
        material: "carbide",
      },
    });
    expect(env.method).toBe("HSM.ToolLibrary.Add");
    expect(env.ilogic_rule).toContain(`hsm.ToolLibrary.Add("T5", "endmill")`);
    expect(env.ilogic_rule).toContain("tool.Diameter = 6");
    expect(env.ilogic_rule).toContain("tool.Flutes = 4");
    expect(env.ilogic_rule).toContain("tool.CornerRadius = 0.5");
  });

  it("buildToolLibraryAddEnvelope validates tool_id + diameter", () => {
    expect(() =>
      InventorHSMPluginAdapterEngine.buildToolLibraryAddEnvelope({
        project_id: "p",
        tool: { tool_id: "", tool_type: "endmill", diameter_mm: 6, material: "carbide" },
      })
    ).toThrow(/tool_id/);
    expect(() =>
      InventorHSMPluginAdapterEngine.buildToolLibraryAddEnvelope({
        project_id: "p",
        tool: { tool_id: "T1", tool_type: "endmill", diameter_mm: 0, material: "carbide" },
      })
    ).toThrow(/diameter_mm/);
  });

  it("buildStockSetupEnvelope emits Stock.Update rule with dimensions", () => {
    const env = InventorHSMPluginAdapterEngine.buildStockSetupEnvelope({
      project_id: "p",
      setup_id: "s1",
      stock: {
        mode: "cylinder",
        cylinder: { diameter: 80, length: 200 },
        material_id: "4140",
        hardness_hrc: 35,
      },
    });
    expect(env.method).toBe("HSM.Stock.Update");
    expect(env.ilogic_rule).toContain("CylinderDiameter = 80");
    expect(env.ilogic_rule).toContain("HardnessHRC = 35");
  });

  it("buildPostProcessEnvelope requires both paths + escapes Windows backslashes", () => {
    expect(() =>
      InventorHSMPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        setup_id: "s",
        post_cps_path: "",
        output_nc_path: "out.nc",
        target_machine_id: "VMC-01",
      })
    ).toThrow(/post_cps_path/);
    expect(() =>
      InventorHSMPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        setup_id: "s",
        post_cps_path: "hurco.cps",
        output_nc_path: "",
        target_machine_id: "VMC-01",
      })
    ).toThrow(/output_nc_path/);

    const env = InventorHSMPluginAdapterEngine.buildPostProcessEnvelope({
      project_id: "p",
      setup_id: "s1",
      post_cps_path: "H:\\posts\\hurco.cps",
      output_nc_path: "H:\\out\\part.nc",
      target_machine_id: "VMC-01",
    });
    expect(env.ilogic_rule).toContain("PostProcessor.Load");
    // Windows backslashes escaped in VB string literal
    expect(env.ilogic_rule).toContain("H:\\\\posts\\\\hurco.cps");
  });
});

describe("InventorHSMPluginAdapterEngine outbound iLogic — id sequencing", () => {
  beforeEach(() => {
    InventorHSMPluginAdapterEngine.__resetOutboundIlogicId();
  });

  it("ids are monotonically increasing across envelope builds", () => {
    const a = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      wcs: { origin: { x: 0, y: 0, z: 0 } },
      stock_mode: "box",
    });
    const b = InventorHSMPluginAdapterEngine.buildToolLibraryAddEnvelope({
      project_id: "p",
      tool: { tool_id: "T1", tool_type: "endmill", diameter_mm: 6, material: "carbide" },
    });
    expect(b.id).toBeGreaterThan(a.id);
  });

  it("__resetOutboundIlogicId rewinds counter", () => {
    const first = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      wcs: { origin: { x: 0, y: 0, z: 0 } },
      stock_mode: "box",
    });
    InventorHSMPluginAdapterEngine.__resetOutboundIlogicId();
    const second = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      wcs: { origin: { x: 0, y: 0, z: 0 } },
      stock_mode: "box",
    });
    expect(second.id).toBe(first.id);
  });
});

describe("InventorHSMPluginAdapterEngine — iLogic rule safety (injection hardening)", () => {
  beforeEach(() => {
    InventorHSMPluginAdapterEngine.__resetOutboundIlogicId();
  });

  it("escapes embedded double-quotes in setup_name to prevent VB string injection", () => {
    const env = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: 'evil"; Shell("calc.exe"); "',
      wcs: { origin: { x: 0, y: 0, z: 0 } },
      stock_mode: "box",
    });
    // The raw rule should contain escaped quote sequences, not a raw injection
    expect(env.ilogic_rule).toContain('evil\\"');
    expect(env.ilogic_rule).not.toContain('evil"; Shell');
  });
});
