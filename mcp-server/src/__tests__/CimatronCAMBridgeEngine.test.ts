/**
 * CimatronCAMBridgeEngine Tests
 *
 * Tests for Cimatron CAM data extraction, electrode analysis, mold/die workflows,
 * and PRISM format conversion.
 *
 * @engine CimatronCAMBridgeEngine
 * @shortcode E1201
 * @milestone CAMX-MS15/U01
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cimatronCAMBridgeEngine,
  CimatronCAMBridgeEngine,
  type CimatronProject,
  type CimatronOperation,
  type CimatronTool,
  type CimatronElectrode,
  type CimatronMoldDie,
} from "../engines/CimatronCAMBridgeEngine.js";

describe("CimatronCAMBridgeEngine", () => {
  let engine: CimatronCAMBridgeEngine;

  beforeEach(() => {
    engine = new CimatronCAMBridgeEngine();
  });

  describe("engine metadata", () => {
    it("should have correct CAM system identification", () => {
      expect(engine.camSystem).toBe("Cimatron");
      expect(engine.vendor).toBe("3D Systems");
    });

    it("should support expected file extensions", () => {
      expect(engine.fileExtensions).toContain(".elt");
      expect(engine.fileExtensions).toContain(".nc");
      expect(engine.fileExtensions).toContain(".tap");
    });

    it("should list supported Cimatron versions", () => {
      expect(engine.supportedVersions).toContain("16.0");
      expect(engine.supportedVersions).toContain("15.0");
      expect(engine.supportedVersions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("extract()", () => {
    it("should extract project name from path", () => {
      const result = engine.extract("C:/Projects/MoldA.elt");
      expect(result.success).toBe(true);
      expect(result.project?.projectName).toBe("MoldA");
    });

    it("should handle backslash paths (Windows)", () => {
      const result = engine.extract("C:\\CAM\\Projects\\DieCast.elt");
      expect(result.project?.projectName).toBe("DieCast");
    });

    it("should warn on non-standard file extensions", () => {
      const result = engine.extract("C:/Projects/file.xyz");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("not recognized"))).toBe(true);
    });

    it("should note need for Cimatron API for native extraction", () => {
      const result = engine.extract("C:/Projects/Test.elt");
      expect(result.warnings.some((w) => w.includes("Cimatron API"))).toBe(true);
    });
  });

  describe("importFromJSON()", () => {
    it("should import valid project data", () => {
      const data: Partial<CimatronProject> = {
        projectPath: "C:/Projects/Test.elt",
        version: "16.0",
        projectName: "TestProject",
        operations: [
          {
            id: "op1",
            name: "Roughing",
            type: "volume_milling",
            category: "roughing",
            params: { spindleRpm: 8000, feedRate_mmpm: 2000 },
            status: "calculated",
          },
        ],
        tools: [
          {
            id: "t1",
            toolNumber: 1,
            name: "10mm End Mill",
            type: "end_mill",
            diameter_mm: 10,
            fluteCount: 4,
            material: "carbide",
          },
        ],
      };

      const result = engine.importFromJSON(data);
      expect(result.success).toBe(true);
      expect(result.project).not.toBeNull();
      expect(result.stats.operationCount).toBe(1);
      expect(result.stats.toolCount).toBe(1);
    });

    it("should error on missing required fields", () => {
      const result = engine.importFromJSON({});
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("projectPath"))).toBe(true);
    });

    it("should default missing version with warning", () => {
      const result = engine.importFromJSON({ projectPath: "test.elt" });
      expect(result.warnings.some((w) => w.includes("version"))).toBe(true);
      expect(result.project?.version).toBe("16.0");
    });

    it("should normalize incomplete operations", () => {
      const result = engine.importFromJSON({
        projectPath: "test.elt",
        operations: [{ id: "op1" } as any],
      });

      expect(result.warnings.some((w) => w.includes("type"))).toBe(true);
      expect(result.project?.operations[0].type).toBe("volume_milling");
    });

    it("should validate electrode data when present", () => {
      const result = engine.importFromJSON({
        projectPath: "electrode.elt",
        electrodeDesign: true,
        electrode: {
          electrodeName: "ELEC_1",
          material: "graphite",
          undersize_mm: 0.6, // Too large
          burnType: "roughing",
        },
      });

      expect(result.warnings.some((w) => w.includes("Large undersize"))).toBe(true);
    });
  });

  describe("analyze()", () => {
    const createTestProject = (): CimatronProject => ({
      projectPath: "test.elt",
      version: "16.0",
      projectName: "TestMold",
      operations: [
        {
          id: "op1",
          name: "Volume Roughing",
          type: "volume_milling",
          category: "roughing",
          toolId: "t1",
          params: {
            spindleRpm: 8000,
            feedRate_mmpm: 2000,
            stepDown_mm: 2,
            stepOver_mm: 5,
            stepOver_pct: 50, // High engagement
          },
          status: "calculated",
        },
        {
          id: "op2",
          name: "Geodesic Rough",
          type: "rough_geodesic",
          category: "roughing",
          toolId: "t1",
          params: {
            spindleRpm: 10000,
            feedRate_mmpm: 3000,
            stepDown_mm: 4,
            stepOver_pct: 25, // Still high for HSM
          },
          status: "calculated",
        },
        {
          id: "op3",
          name: "Z-Level Finish",
          type: "z_level_finishing",
          category: "finishing",
          toolId: "t2",
          params: {
            spindleRpm: 12000,
            feedRate_mmpm: 4000,
            stepDown_mm: 0.2,
            stepOver_mm: 0.3,
          },
          status: "calculated",
        },
      ],
      tools: [
        {
          id: "t1",
          toolNumber: 1,
          name: "10mm End Mill",
          type: "end_mill",
          diameter_mm: 10,
          fluteCount: 4,
          material: "carbide",
        },
        {
          id: "t2",
          toolNumber: 2,
          name: "6mm Ball End",
          type: "ball_end",
          diameter_mm: 6,
          cornerRadius_mm: 3,
          fluteCount: 2,
          material: "carbide",
        },
      ],
    });

    it("should analyze operations for optimization opportunities", () => {
      const project = createTestProject();
      const result = engine.analyze(project, { analysisType: "operations" });

      expect(result.success).toBe(true);
      expect(result.analysisType).toBe("operations");
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it("should detect missing rest machining", () => {
      const project = createTestProject();
      const result = engine.analyze(project);

      // Has 2 roughing ops without rest machining
      expect(
        result.findings.some(
          (f) => f.type === "optimization" && f.message.includes("rest machining")
        )
      ).toBe(true);
    });

    it("should flag high radial engagement on HSM operations", () => {
      const project = createTestProject();
      const result = engine.analyze(project);

      // The geodesic rough has 25% stepover, should be flagged
      expect(
        result.findings.some(
          (f) => f.operationId === "op2" && f.message.includes("radial engagement")
        )
      ).toBe(true);
    });

    it("should generate prioritized recommendations", () => {
      const project = createTestProject();
      const result = engine.analyze(project);

      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should be sorted by priority (descending)
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i].priority).toBeLessThanOrEqual(
          result.recommendations[i - 1].priority
        );
      }
    });

    it("should validate physics when enabled", () => {
      const project = createTestProject();
      const result = engine.analyze(project, { validatePhysics: true, materialISOGroup: "P" });

      expect(result.physicsValidation).toBeDefined();
      expect(typeof result.physicsValidation?.maxForce_N).toBe("number");
      expect(typeof result.physicsValidation?.maxPower_kW).toBe("number");
    });

    it("should analyze mold/die complexity", () => {
      const project: CimatronProject = {
        ...createTestProject(),
        moldDie: {
          projectType: "injection_mold",
          cavityCount: 4,
          moldMaterial: "P20",
          moldMaterialISO: "P",
          hardness_hrc: 32,
          hasPartingLine: true,
          hasCoolingChannels: true,
        },
      };

      const result = engine.analyze(project, { analysisType: "mold_workflow" });

      expect(result.moldDieAnalysis).toBeDefined();
      expect(result.moldDieAnalysis?.complexityScore).toBeGreaterThan(50);
      expect(result.moldDieAnalysis?.estimatedMachiningHours).toBeGreaterThan(0);
    });
  });

  describe("analyzeElectrode()", () => {
    it("should verify spark gap against standards - roughing", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_ROUGH",
        material: "graphite",
        graphiteGrade: "EDM-200",
        undersize_mm: 0.25, // Standard roughing
        burnType: "roughing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.sparkGapVerified).toBe(true);
      expect(result.suitable).toBe(true);
    });

    it("should verify spark gap against standards - finishing", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_FINISH",
        material: "graphite",
        graphiteGrade: "EDM-3",
        undersize_mm: 0.05, // Standard finishing
        burnType: "finishing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.sparkGapVerified).toBe(true);
    });

    it("should flag incorrect spark gap", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_BAD",
        material: "graphite",
        undersize_mm: 0.15, // Wrong for finishing
        burnType: "finishing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.sparkGapVerified).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should suggest finer graphite grade for finishing", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_COARSE",
        material: "graphite",
        graphiteGrade: "EDM-200", // Coarse grain for finishing
        undersize_mm: 0.05,
        burnType: "finishing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.suggestions.some((s) => s.includes("finer grain"))).toBe(true);
    });

    it("should warn on insufficient extension surface", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_SHORT",
        material: "graphite",
        undersize_mm: 0.25,
        burnType: "roughing",
        extensionSurface_mm: 1.0, // Too short
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.warnings.some((w) => w.includes("Extension surface"))).toBe(true);
    });

    it("should provide material recommendation", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_TEST",
        material: "graphite",
        undersize_mm: 0.25,
        burnType: "roughing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.materialRecommendation.length).toBeGreaterThan(0);
    });

    it("should suggest graphite over copper for roughing", () => {
      const electrode: CimatronElectrode = {
        electrodeName: "ELEC_COPPER",
        material: "copper",
        undersize_mm: 0.25,
        burnType: "roughing",
      };

      const result = engine.analyzeElectrode(electrode);
      expect(result.suggestions.some((s) => s.includes("graphite for roughing"))).toBe(true);
    });
  });

  describe("generateElectrodeParameters()", () => {
    it("should generate roughing and finishing electrodes", () => {
      const result = engine.generateElectrodeParameters(25, 1.6, "P");

      expect(result.roughingElectrode).toBeDefined();
      expect(result.finishingElectrode).toBeDefined();
      expect(result.roughingElectrode.undersize_mm).toBe(0.25);
      expect(result.finishingElectrode.undersize_mm).toBe(0.05);
    });

    it("should add semi-finishing electrode for deep cavities", () => {
      const result = engine.generateElectrodeParameters(30, 1.6, "P");

      expect(result.semiFinishingElectrode).toBeDefined();
      expect(result.semiFinishingElectrode?.undersize_mm).toBe(0.12);
    });

    it("should add semi-finishing electrode for fine finish requirements", () => {
      const result = engine.generateElectrodeParameters(15, 0.4, "P");

      expect(result.semiFinishingElectrode).toBeDefined();
    });

    it("should estimate total burn time", () => {
      const result = engine.generateElectrodeParameters(20, 1.6, "P");

      expect(result.totalBurnTime_min).toBeGreaterThan(0);
      expect(result.roughingElectrode.estimatedBurnTime_min).toBeGreaterThan(0);
      expect(result.finishingElectrode.estimatedBurnTime_min).toBeGreaterThan(0);
    });

    it("should warn on deep cavities", () => {
      const result = engine.generateElectrodeParameters(60, 1.6, "P");

      expect(result.recommendations.some((r) => r.includes("Deep cavity"))).toBe(true);
    });

    it("should recommend fine-grain graphite for ultra-smooth finish", () => {
      const result = engine.generateElectrodeParameters(20, 0.3, "P");

      expect(result.recommendations.some((r) => r.includes("fine-grain"))).toBe(true);
    });

    it("should adjust burn time estimates for hardened steel", () => {
      const resultP = engine.generateElectrodeParameters(20, 1.6, "P");
      const resultH = engine.generateElectrodeParameters(20, 1.6, "H");

      // Hardened steel should take longer
      expect(resultH.totalBurnTime_min).toBeGreaterThan(resultP.totalBurnTime_min);
    });
  });

  describe("convertToPRISMFormat()", () => {
    it("should convert operations to unified format", () => {
      const project: CimatronProject = {
        projectPath: "test.elt",
        version: "16.0",
        projectName: "Test",
        operations: [
          {
            id: "op1",
            name: "Volume Milling",
            type: "volume_milling",
            category: "roughing",
            toolId: "t1",
            params: {
              spindleRpm: 8000,
              feedRate_mmpm: 2000,
              stepDown_mm: 2,
              stepOver_mm: 5,
              coolant: "flood",
            },
            estimatedCycleTime_min: 45,
            status: "calculated",
          },
        ],
        tools: [
          {
            id: "t1",
            toolNumber: 1,
            name: "10mm End Mill",
            type: "end_mill",
            diameter_mm: 10,
            fluteCount: 4,
            material: "carbide",
          },
        ],
      };

      const result = engine.convertToPRISMFormat(project);

      expect(result.summary.camSystem).toBe("Cimatron");
      expect(result.summary.totalOperations).toBe(1);
      expect(result.summary.totalTools).toBe(1);
      expect(result.operations[0].type).toBe("adaptive_clearing"); // Mapped from volume_milling
      expect(result.operations[0].params.rpm).toBe(8000);
    });

    it("should estimate physics for operations with tools", () => {
      const project: CimatronProject = {
        projectPath: "test.elt",
        version: "16.0",
        projectName: "Test",
        operations: [
          {
            id: "op1",
            name: "Roughing",
            type: "volume_milling",
            category: "roughing",
            toolId: "t1",
            params: {
              spindleRpm: 8000,
              feedRate_mmpm: 2000,
              stepDown_mm: 3,
              stepOver_mm: 4,
            },
            status: "calculated",
          },
        ],
        tools: [
          {
            id: "t1",
            toolNumber: 1,
            name: "10mm End Mill",
            type: "end_mill",
            diameter_mm: 10,
            fluteCount: 4,
            material: "carbide",
          },
        ],
        stock: { type: "bounding_box", isoGroup: "P" },
      };

      const result = engine.convertToPRISMFormat(project);

      expect(result.operations[0].physics).toBeDefined();
      expect(result.operations[0].physics?.estimatedForce_N).toBeGreaterThan(0);
      expect(result.operations[0].physics?.estimatedMRR_mm3min).toBeGreaterThan(0);
    });

    it("should calculate total cycle time in summary", () => {
      const project: CimatronProject = {
        projectPath: "test.elt",
        version: "16.0",
        projectName: "Test",
        operations: [
          {
            id: "op1",
            name: "Op1",
            type: "volume_milling",
            category: "roughing",
            params: {},
            estimatedCycleTime_min: 30,
            status: "calculated",
          },
          {
            id: "op2",
            name: "Op2",
            type: "z_level_finishing",
            category: "finishing",
            params: {},
            estimatedCycleTime_min: 45,
            status: "calculated",
          },
        ],
        tools: [],
      };

      const result = engine.convertToPRISMFormat(project);
      expect(result.summary.estimatedCycleTime_min).toBe(75);
    });
  });

  describe("exportToolLibrary()", () => {
    const testTools: CimatronTool[] = [
      {
        id: "t1",
        toolNumber: 1,
        name: "10mm End Mill",
        type: "end_mill",
        diameter_mm: 10,
        cornerRadius_mm: 0.5,
        fluteLength_mm: 25,
        overallLength_mm: 75,
        fluteCount: 4,
        material: "carbide",
        coating: "TiAlN",
        manufacturer: "Sandvik",
        partNumber: "R216.24-10050",
      },
      {
        id: "t2",
        toolNumber: 2,
        name: "6mm Ball End",
        type: "ball_end",
        diameter_mm: 6,
        cornerRadius_mm: 3,
        fluteCount: 2,
        material: "carbide",
      },
    ];

    it("should export to XML format", () => {
      const result = engine.exportToolLibrary(testTools, "xml");

      expect(result.format).toBe("xml");
      expect(result.filename).toBe("cimatron_tools.xml");
      expect(result.content).toContain('<?xml version="1.0"');
      expect(result.content).toContain("<CimatronToolLibrary>");
      expect(result.content).toContain("<Number>1</Number>");
      expect(result.content).toContain("<Diameter>10</Diameter>");
      expect(result.content).toContain("10mm End Mill");
    });

    it("should export to CSV format", () => {
      const result = engine.exportToolLibrary(testTools, "csv");

      expect(result.format).toBe("csv");
      expect(result.filename).toBe("cimatron_tools.csv");
      expect(result.content).toContain("ToolNumber,Name,Type");
      expect(result.content).toContain('1,"10mm End Mill",end_mill,10');
    });

    it("should escape XML special characters", () => {
      const toolsWithSpecialChars: CimatronTool[] = [
        {
          id: "t1",
          toolNumber: 1,
          name: 'Test <Tool> "Special" & Chars',
          type: "end_mill",
          diameter_mm: 10,
          fluteCount: 4,
          material: "carbide",
        },
      ];

      const result = engine.exportToolLibrary(toolsWithSpecialChars, "xml");
      expect(result.content).toContain("&lt;Tool&gt;");
      expect(result.content).toContain("&amp;");
      expect(result.content).toContain("&quot;");
    });
  });

  describe("listOperationTypes()", () => {
    it("should list all supported operation types", () => {
      const types = engine.listOperationTypes();

      expect(types.length).toBeGreaterThan(20);
      expect(types.some((t) => t.type === "volume_milling")).toBe(true);
      expect(types.some((t) => t.type === "electrode_roughing")).toBe(true);
      expect(types.some((t) => t.type === "5axis_finishing")).toBe(true);
    });

    it("should include mold/die relevance ratings", () => {
      const types = engine.listOperationTypes();

      const volumeMilling = types.find((t) => t.type === "volume_milling");
      expect(volumeMilling?.moldDieRelevance).toBe("high");

      const engraving = types.find((t) => t.type === "engraving");
      expect(engraving?.moldDieRelevance).toBe("low");
    });

    it("should categorize operations correctly", () => {
      const types = engine.listOperationTypes();

      const roughingOps = types.filter((t) => t.category === "roughing");
      const finishingOps = types.filter((t) => t.category === "finishing");
      const electrodeOps = types.filter((t) => t.category === "electrode");
      const fiveAxisOps = types.filter((t) => t.category === "5_axis");

      expect(roughingOps.length).toBeGreaterThanOrEqual(4);
      expect(finishingOps.length).toBeGreaterThanOrEqual(6);
      expect(electrodeOps.length).toBeGreaterThanOrEqual(3);
      expect(fiveAxisOps.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(cimatronCAMBridgeEngine).toBeDefined();
      expect(cimatronCAMBridgeEngine).toBeInstanceOf(CimatronCAMBridgeEngine);
    });

    it("singleton should have same methods as class", () => {
      expect(typeof cimatronCAMBridgeEngine.extract).toBe("function");
      expect(typeof cimatronCAMBridgeEngine.analyze).toBe("function");
      expect(typeof cimatronCAMBridgeEngine.analyzeElectrode).toBe("function");
      expect(typeof cimatronCAMBridgeEngine.convertToPRISMFormat).toBe("function");
    });
  });

  describe("JM Die relevance - cold heading die workflows", () => {
    it("should handle hardened tool steel material (H group)", () => {
      const project: CimatronProject = {
        projectPath: "cold_heading_die.elt",
        version: "16.0",
        projectName: "ColdHeadingDie",
        moldDie: {
          projectType: "forging_die",
          moldMaterial: "D2",
          moldMaterialISO: "H",
          hardness_hrc: 58,
        },
        operations: [
          {
            id: "op1",
            name: "Hard Milling Finish",
            type: "z_level_finishing",
            category: "finishing",
            toolId: "t1",
            params: {
              spindleRpm: 15000,
              feedRate_mmpm: 1500,
              stepDown_mm: 0.1,
              stepOver_mm: 0.15,
            },
            status: "calculated",
          },
        ],
        tools: [
          {
            id: "t1",
            toolNumber: 1,
            name: "4mm Ball CBN",
            type: "ball_end",
            diameter_mm: 4,
            cornerRadius_mm: 2,
            fluteCount: 2,
            material: "cbn",
          },
        ],
      };

      const result = engine.analyze(project, { validatePhysics: true });

      // Should calculate with H-group Kienzle constants
      expect(result.physicsValidation).toBeDefined();
      expect(result.moldDieAnalysis).toBeDefined();
      // Hardened material increases complexity
      expect(result.moldDieAnalysis?.complexityScore).toBeGreaterThan(60);
    });

    it("should generate appropriate electrodes for carbide dies", () => {
      // JM Die works with carbide dies which require copper electrodes
      const result = engine.generateElectrodeParameters(15, 0.8, "H", {
        holderType: "erowa",
      });

      expect(result.recommendations.some((r) => r.includes("Hardened steel"))).toBe(true);
    });
  });
});
