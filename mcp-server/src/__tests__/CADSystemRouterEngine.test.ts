/**
 * Tests for CADSystemRouterEngine
 * @see src/engines/CADSystemRouterEngine.ts
 * @see U-CAD-FIDX-ORCH-01 (unified router across all 5 CAD plan↔execution bridges)
 */

import { describe, it, expect } from "vitest";
import {
  CADSystemRouterEngine,
  SUPPORTED_CAD_SYSTEMS,
  CAD_FILE_EXTENSION_MAP,
  type CADSystemId,
} from "../engines/CADSystemRouterEngine.js";

// ============================================================================
// SECTION 1 — listSupportedSystems(): taxonomy snapshot
// ============================================================================

describe("CADSystemRouterEngine.listSupportedSystems()", () => {
  it("ships exactly 6 supported systems in the canonical priority order (Esprit closes 6/6)", () => {
    const out = CADSystemRouterEngine.listSupportedSystems();
    expect(out.systems).toEqual([
      "fusion360",
      "inventor",
      "mastercam",
      "hypercad",
      "solidworks",
      "esprit",
    ]);
  });

  it("exposes the file-extension map with the documented vendor extensions including Esprit", () => {
    const out = CADSystemRouterEngine.listSupportedSystems();
    expect(out.extensions["f3d"]).toBe("fusion360");
    expect(out.extensions["ipt"]).toBe("inventor");
    expect(out.extensions["iam"]).toBe("inventor");
    expect(out.extensions["idw"]).toBe("inventor");
    expect(out.extensions["mcam"]).toBe("mastercam");
    expect(out.extensions["hcsm"]).toBe("hypercad");
    expect(out.extensions["sldprt"]).toBe("solidworks");
    expect(out.extensions["sldasm"]).toBe("solidworks");
    expect(out.extensions["slddrw"]).toBe("solidworks");
    expect(out.extensions["esprit"]).toBe("esprit");
    expect(out.extensions["esp"]).toBe("esprit");
    expect(out.extensions["escx"]).toBe("esprit");
  });

  it("freezes the extension map (Object.freeze guard)", () => {
    expect(Object.isFrozen(CAD_FILE_EXTENSION_MAP)).toBe(true);
  });
});

// ============================================================================
// SECTION 2 — detectSystem(): routing resolution
// ============================================================================

describe("CADSystemRouterEngine.detectSystem()", () => {
  it("resolves an explicit sourceSystem hint (case-insensitive)", () => {
    expect(CADSystemRouterEngine.detectSystem({ sourceSystem: "fusion360" })).toBe("fusion360");
    expect(CADSystemRouterEngine.detectSystem({ sourceSystem: "FUSION360" })).toBe("fusion360");
    expect(CADSystemRouterEngine.detectSystem({ sourceSystem: "  inventor  " })).toBe("inventor");
  });

  it("returns null for an unsupported sourceSystem hint", () => {
    expect(CADSystemRouterEngine.detectSystem({ sourceSystem: "freecad" })).toBeNull();
    expect(CADSystemRouterEngine.detectSystem({ sourceSystem: "" })).toBeNull();
  });

  it("resolves system from a Fusion 360 file extension (.f3d)", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "/jobs/part.f3d" })).toBe("fusion360");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "BIG_PART.F3D" })).toBe("fusion360");
  });

  it("resolves system from Inventor extensions (.ipt / .iam / .idw / .ipn)", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "shaft.ipt" })).toBe("inventor");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "gearbox.iam" })).toBe("inventor");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "fab.idw" })).toBe("inventor");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "anim.ipn" })).toBe("inventor");
  });

  it("resolves system from Mastercam (.mcam)", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "job001.mcam" })).toBe("mastercam");
  });

  it("resolves system from HyperCAD-S (.hcsm / .hcss)", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "model.hcsm" })).toBe("hypercad");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "sketch.hcss" })).toBe("hypercad");
  });

  it("resolves system from SolidWorks extensions (.sldprt / .sldasm / .slddrw)", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "bracket.sldprt" })).toBe("solidworks");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "assy.sldasm" })).toBe("solidworks");
    expect(CADSystemRouterEngine.detectSystem({ filePath: "drawing.slddrw" })).toBe("solidworks");
  });

  it("returns null for an unknown extension", () => {
    expect(CADSystemRouterEngine.detectSystem({ filePath: "file.unknown" })).toBeNull();
    expect(CADSystemRouterEngine.detectSystem({ filePath: "file" })).toBeNull();
    expect(CADSystemRouterEngine.detectSystem({ filePath: "file." })).toBeNull();
  });

  it("returns null when neither sourceSystem nor filePath is provided", () => {
    expect(CADSystemRouterEngine.detectSystem({})).toBeNull();
  });

  it("prefers explicit sourceSystem hint over filePath extension when both supplied", () => {
    expect(
      CADSystemRouterEngine.detectSystem({ sourceSystem: "solidworks", filePath: "x.f3d" }),
    ).toBe("solidworks");
  });
});

// ============================================================================
// SECTION 3 — planAndRender(): per-system routing
// ============================================================================

describe("CADSystemRouterEngine.planAndRender() — per-system routing", () => {
  it("routes fusion360 to renderPythonScript via Fusion360CADFunctionIndexEngine", async () => {
    const r = await CADSystemRouterEngine.planAndRender({
      system: "fusion360",
      moduleId: "sketch_operations",
      operationId: "LINE",
      params: { startPoint: "P1", endPoint: "P2" },
    });
    expect(r.system).toBe("fusion360");
    if (r.system !== "fusion360") throw new Error("type narrow failed");
    expect(r.python_api).toBe("sketch.sketchCurves.sketchLines.addByTwoPoints");
    expect(r.python_script).toContain("def run(_context: str):");
    expect(r.python_script).toContain("sketch.sketchCurves.sketchLines.addByTwoPoints(");
    expect(r.python_script).toContain('startPoint="P1"');
    expect(r.python_script).toContain('endPoint="P2"');
  });

  it("routes inventor to InventorCADExecutionBridge with iLogic snippet output", async () => {
    const r = await CADSystemRouterEngine.planAndRender({
      system: "inventor",
      moduleId: "part_operations",
      operationId: "EXTRUDE",
      params: { Profile: "S1", Termination: "distance", "Boolean Op": "join" },
    });
    expect(r.system).toBe("inventor");
    if (r.system !== "inventor") throw new Error("type narrow failed");
    expect(r.ilogic_snippet).toContain(
      "Dim oCompDef As ComponentDefinition = oDoc.ComponentDefinition",
    );
    expect(r.ilogic_snippet).toContain("oCompDef.Features.ExtrudeFeatures.AddByDistanceExtent(");
  });

  it("routes mastercam to MastercamCADExecutionBridge with C# scaffold output", async () => {
    const r = await CADSystemRouterEngine.planAndRender({
      system: "mastercam",
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
    });
    expect(r.system).toBe("mastercam");
    if (r.system !== "mastercam") throw new Error("type narrow failed");
    expect(r.csharp_scaffold).toContain("public class GeneratedAddin : Mastercam.App.NETHook");
    expect(r.csharp_scaffold).toContain(
      "var result = Mastercam.Curves.LineCreator.CreateByEndpoints(",
    );
  });

  it("routes hypercad to HyperCADCADExecutionBridge with macro output", async () => {
    const r = await CADSystemRouterEngine.planAndRender({
      system: "hypercad",
      moduleId: "sketch_operations",
      operationId: "RECTANGLE",
      params: { "Sketch Plane": "Top", "Corner 1": "0,0", "Corner 2": "50,25" },
    });
    expect(r.system).toBe("hypercad");
    if (r.system !== "hypercad") throw new Error("type narrow failed");
    expect(r.macro_scaffold).toContain("@SKETCH.RECTANGLE.CREATE");
    expect(r.macro_scaffold).toContain("EXEC");
  });

  it("routes solidworks to SolidWorksCADExecutionBridge with VBA output", async () => {
    const r = await CADSystemRouterEngine.planAndRender({
      system: "solidworks",
      moduleId: "part_operations",
      operationId: "EXTRUDE_BOSS",
      params: { Sketch: "Sketch1", Depth: 25 },
    });
    expect(r.system).toBe("solidworks");
    if (r.system !== "solidworks") throw new Error("type narrow failed");
    expect(r.vba_macro).toContain("Sub main()");
    expect(r.vba_macro).toContain("Set swApp = Application.SldWorks");
    expect(r.vba_macro).toContain("Set feature = swFeatureMgr.FeatureExtrusion3(");
  });

  it("throws on an unsupported system id", async () => {
    await expect(
      CADSystemRouterEngine.planAndRender({
        system: "freecad" as unknown as CADSystemId,
        moduleId: "part_operations",
        operationId: "EXTRUDE",
        params: {},
      }),
    ).rejects.toThrow(/unsupported system/);
  });

  it("propagates fusion360 catalog-not-found error", async () => {
    await expect(
      CADSystemRouterEngine.planAndRender({
        system: "fusion360",
        moduleId: "sketch_operations",
        operationId: "BOGUS_NEVER_EXISTS",
        params: {},
      }),
    ).rejects.toThrow(/fusion360 operation not found/);
  });

  it("propagates downstream-bridge missing-required errors verbatim", async () => {
    await expect(
      CADSystemRouterEngine.planAndRender({
        system: "solidworks",
        moduleId: "part_operations",
        operationId: "EXTRUDE_BOSS",
        params: {},
      }),
    ).rejects.toThrow(/missing required parameters.*Sketch/);
  });
});

// ============================================================================
// SECTION 4 — findOperationAcrossSystems(): cross-system catalog search
// ============================================================================

describe("CADSystemRouterEngine.findOperationAcrossSystems()", () => {
  it("finds 'CIRCLE' across multiple systems (sketch primitive — common to several CAD systems)", async () => {
    const matches = await CADSystemRouterEngine.findOperationAcrossSystems("CIRCLE");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const systemsHit = new Set(matches.map((m) => m.system));
    expect(systemsHit.size).toBeGreaterThanOrEqual(2);
    for (const m of matches) {
      expect(SUPPORTED_CAD_SYSTEMS).toContain(m.system);
      expect(m.operation_id).toBe("CIRCLE");
      expect(typeof m.params_count).toBe("number");
    }
  });

  it("finds 'EXTRUDE_BOSS' (SolidWorks-specific — single match in part_operations)", async () => {
    const matches = await CADSystemRouterEngine.findOperationAcrossSystems("EXTRUDE_BOSS");
    const swMatches = matches.filter((m) => m.system === "solidworks");
    expect(swMatches.length).toBe(1);
    expect(swMatches[0].module_id).toBe("part_operations");
    expect(swMatches[0].category).toBe("Part_Sweep_Boss");
  });

  it("returns an empty array for a non-existent operation id", async () => {
    const matches = await CADSystemRouterEngine.findOperationAcrossSystems(
      "OP_THAT_NEVER_EXISTS_ANYWHERE",
    );
    expect(matches).toEqual([]);
  });

  it("throws when operationId is empty", async () => {
    await expect(CADSystemRouterEngine.findOperationAcrossSystems("")).rejects.toThrow(
      /operationId required/,
    );
  });
});

// ============================================================================
// SECTION 5 — listCapabilitiesAcrossSystems(): aggregate matrix
// ============================================================================

describe("CADSystemRouterEngine.listCapabilitiesAcrossSystems()", () => {
  it("returns 6 system snapshots in canonical order (Esprit closes 6/6)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    expect(matrix.systems.map((s) => s.system)).toEqual([
      "fusion360",
      "inventor",
      "mastercam",
      "hypercad",
      "solidworks",
      "esprit",
    ]);
  });

  it("each system snapshot has total_modules > 0 and total_operations > 0 (every shipped catalog has content)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    for (const sys of matrix.systems) {
      expect(sys.total_modules).toBeGreaterThan(0);
      expect(sys.total_operations).toBeGreaterThan(0);
      expect(sys.total_parameters).toBeGreaterThan(0);
    }
  });

  it("aggregate totals match the per-system sums (no drift)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    const sumModules = matrix.systems.reduce((a, s) => a + s.total_modules, 0);
    const sumOps = matrix.systems.reduce((a, s) => a + s.total_operations, 0);
    const sumParams = matrix.systems.reduce((a, s) => a + s.total_parameters, 0);
    expect(matrix.totals.total_modules).toBe(sumModules);
    expect(matrix.totals.total_operations).toBe(sumOps);
    expect(matrix.totals.total_parameters).toBe(sumParams);
  });

  it("solidworks reports 8 modules / 178 operations / 1184 parameters (CAD-FIDX-SW-08 closure proof)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    const sw = matrix.systems.find((s) => s.system === "solidworks");
    expect(sw?.system).toBe("solidworks");
    expect(sw?.total_modules).toBe(8);
    expect(sw?.total_operations).toBe(178);
    expect(sw?.total_parameters).toBe(1184);
  });

  it("aggregate parameter total matches the sum of all 5 catalogs (>= 4900, sealed COMPLETE)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    expect(matrix.totals.total_parameters).toBeGreaterThanOrEqual(4900);
  });

  it("aggregate module total is 44 (5 systems × 8 modules + Esprit's 4 sections, all sealed COMPLETE)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    // 5 sealed CAD systems each ship 8 modules = 40, plus Esprit's 4 sections
    // (milling / turning / mill_turn / swiss) which are exposed as modules via
    // the makeEspritRouterAdapter — total 44.
    expect(matrix.totals.total_modules).toBe(44);
  });

  it("esprit reports 4 modules (sections) / >= 18 operations / >= 200 parameters (CAD-FIDX-ESP-INT-01 closure proof)", async () => {
    const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
    const esprit = matrix.systems.find((s) => s.system === "esprit");
    expect(esprit?.system).toBe("esprit");
    expect(esprit?.total_modules).toBe(4);
    expect(esprit?.total_operations).toBeGreaterThanOrEqual(18);
    expect(esprit?.total_parameters).toBeGreaterThanOrEqual(200);
  });
});
