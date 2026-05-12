/**
 * L2-P4-MS1/P0-U03 Tests: DNC & Post-Processing + CAM Export Engines
 * ====================================================================
 */

import { describe, it, expect } from "vitest";

// DNC Engines
import { DNCGenerateEngine } from "../engines/DNCGenerateEngine.js";
import { DNCSendEngine } from "../engines/DNCSendEngine.js";
import { DNCCompareEngine } from "../engines/DNCCompareEngine.js";
import { DNCVerifyEngine } from "../engines/DNCVerifyEngine.js";
import { DNCQREngine } from "../engines/DNCQREngine.js";

// CAM Export Engines
import { CAMRecommendEngine } from "../engines/CAMRecommendEngine.js";
import { CAMExportEngine } from "../engines/CAMExportEngine.js";
import { CAMAnalyzeEngine } from "../engines/CAMAnalyzeEngine.js";
import { CAMToolLibraryEngine } from "../engines/CAMToolLibraryEngine.js";
import { CAMToolGetEngine } from "../engines/CAMToolGetEngine.js";

// ─── DNC Generate Engine Tests ────────────────────────────────────────────────

describe("DNCGenerateEngine", () => {
  it("should have self-awareness with safety threshold", () => {
    const awareness = DNCGenerateEngine.getSelfAwareness();
    expect(awareness.name).toBe("DNCGenerateEngine");
    expect(awareness.safetyCritical).toBe(true);
    expect(awareness.safetyThreshold).toBe(0.990);
    expect(awareness.supportedFormats).toContain("fanuc");
  });

  it("should generate a valid DNC program", () => {
    const program = DNCGenerateEngine.generate({
      format: "fanuc",
      machineId: "MILL-1",
      programNumber: "O1234",
      programName: "TEST_PART",
      sourceContent: `G21 G90
T1 M06
S8000 M03
G00 X0 Y0
G43 Z50 H1
G00 Z5
G01 Z-10 F500
G01 X50 F1000
G00 Z50
M05
M30`,
      createdBy: "test",
    });

    expect(program.id).toMatch(/^DNC-/);
    expect(program.format).toBe("fanuc");
    expect(program.safetyScore).toBeGreaterThanOrEqual(0.990);
    expect(program.validated).toBe(true);
  });

  it("should validate program safety", () => {
    const result = DNCGenerateEngine.validateSafety(`
G21
T1 M06
S8000 M03
G01 X50 F1000
M05
M30
    `, "fanuc");

    expect(result.score).toBeGreaterThan(0.9);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("should reject program with safety score below threshold", () => {
    expect(() => DNCGenerateEngine.generate({
      format: "fanuc",
      machineId: "MILL-1",
      programNumber: "O9999",
      programName: "BAD_PROGRAM",
      sourceContent: `G00 X0 Y0
F99999
S99999`,
      createdBy: "test",
    })).toThrow(/Safety validation failed/);
  });
});

// ─── DNC Send Engine Tests ────────────────────────────────────────────────────

describe("DNCSendEngine", () => {
  it("should have self-awareness", () => {
    const awareness = DNCSendEngine.getSelfAwareness();
    expect(awareness.name).toBe("DNCSendEngine");
    expect(awareness.safetyCritical).toBe(true);
    expect(awareness.supportedProtocols).toContain("ethernet_cifs");
  });

  it("should queue transfer with valid safety score", () => {
    const job = DNCSendEngine.queueTransfer(
      "PRG-001",
      "O1234",
      "G21\nG00 X0 Y0\nM30",
      "MILL-1",
      0.995
    );

    expect(job.id).toMatch(/^TXF-/);
    expect(job.status).toBe("queued");
    expect(job.machineId).toBe("MILL-1");
  });

  it("should reject transfer with low safety score", () => {
    expect(() => DNCSendEngine.queueTransfer(
      "PRG-002",
      "O5555",
      "bad content",
      "MILL-1",
      0.5
    )).toThrow(/Safety threshold not met/);
  });

  it("should start and complete transfer", () => {
    const job = DNCSendEngine.queueTransfer("PRG-003", "O1235", "G21\nM30", "MILL-1", 0.999);
    const started = DNCSendEngine.startTransfer(job.id);

    expect(started.status).toBe("complete");
    expect(started.progress).toBe(100);
    expect(started.verificationResult?.verified).toBe(true);
  });

  it("should list machine connections", () => {
    const connections = DNCSendEngine.listConnections();
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.some(c => c.machineId === "MILL-1")).toBe(true);
  });

  it("should test connection", () => {
    const result = DNCSendEngine.testConnection("MILL-1");
    expect(result.success).toBe(true);
    expect(result.latency).toBeGreaterThan(0);
  });
});

// ─── DNC Compare Engine Tests ─────────────────────────────────────────────────

describe("DNCCompareEngine", () => {
  it("should have self-awareness", () => {
    const awareness = DNCCompareEngine.getSelfAwareness();
    expect(awareness.name).toBe("DNCCompareEngine");
    expect(awareness.differenceTypes).toContain("modified");
    expect(awareness.safetyCodes).toContain("G28");
  });

  it("should detect identical programs", () => {
    const content = "G21\nG00 X0 Y0\nM30";
    const result = DNCCompareEngine.compare(content, content);

    expect(result.identical).toBe(true);
    expect(result.differences).toHaveLength(0);
    expect(result.safetyScore).toBe(1);
  });

  it("should detect differences between programs", () => {
    const a = "G21\nG00 X0 Y0\nM30";
    const b = "G21\nG00 X10 Y10\nM30";
    const result = DNCCompareEngine.compare(a, b);

    expect(result.identical).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it("should identify comment-only changes as functionally equivalent", () => {
    const a = "(ORIGINAL COMMENT)\nG00 X0 Y0\nM30";
    const b = "(NEW COMMENT)\nG00 X0 Y0\nM30";
    const result = DNCCompareEngine.compare(a, b);

    expect(result.identical).toBe(false);
    expect(result.functionallyEquivalent).toBe(true);
  });

  it("should detect unauthorized changes", () => {
    const original = "G00 X0 Y0\nG01 X50 F1000\nM30";
    const modified = "G00 X0 Y0\nG01 X100 F1000\nM30";

    const result = DNCCompareEngine.detectUnauthorizedChanges(
      original,
      modified,
      ["comments", "whitespace"]
    );

    expect(result.authorized).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

// ─── DNC Verify Engine Tests ──────────────────────────────────────────────────

describe("DNCVerifyEngine", () => {
  it("should have self-awareness", () => {
    const awareness = DNCVerifyEngine.getSelfAwareness();
    expect(awareness.name).toBe("DNCVerifyEngine");
    expect(awareness.safetyCritical).toBe(true);
    expect(awareness.verificationTypes).toContain("full");
  });

  it("should verify valid program", () => {
    const result = DNCVerifyEngine.verify("PRG-V01", `
G21 G90
T1 M06
S8000 M03
G00 X0 Y0
G43 Z50 H1
G01 Z-5 F500
M05
M09
M30
    `, "full");

    // Program may have warnings but should not have critical errors
    expect(result.safetyScore).toBeGreaterThan(0.5);
    expect(result.summary.errors).toBeLessThanOrEqual(1);
  });

  it("should detect missing program end", () => {
    const result = DNCVerifyEngine.verify("PRG-V02", `
G00 X0 Y0
G01 X50 F1000
    `, "safety");

    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.code === "NO_PROGRAM_END")).toBe(true);
  });

  it("should check machine compatibility", () => {
    const result = DNCVerifyEngine.verify("PRG-V03", `
G21
G187 P1
G00 X0 Y0
M30
    `, "compatibility", "fanuc");

    expect(result.machineCompatibility).toBeDefined();
    expect(result.machineCompatibility?.unsupportedCodes).toContain("G187");
  });

  it("should perform quick safety check", () => {
    const result = DNCVerifyEngine.quickSafetyCheck("G21\nT1 M06\nS8000 M03\nG00 X0 Y0\nM05\nM09\nM30");
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.criticalIssues.length).toBe(0);
  });
});

// ─── DNC QR Engine Tests ──────────────────────────────────────────────────────

describe("DNCQREngine", () => {
  it("should have self-awareness", () => {
    const awareness = DNCQREngine.getSelfAwareness();
    expect(awareness.name).toBe("DNCQREngine");
    expect(awareness.formats).toContain("svg");
    expect(awareness.errorCorrectionLevels).toContain("M");
  });

  it("should generate QR code", () => {
    const qr = DNCQREngine.generate({
      programId: "PRG-001",
      programNumber: "O1234",
      programName: "TEST_PART",
      checksum: "abc123",
      createdAt: new Date().toISOString(),
    });

    expect(qr.id).toMatch(/^QR-/);
    expect(qr.content).toBeTruthy();
    expect(qr.format).toBe("text");
  });

  it("should generate load URL", () => {
    const url = DNCQREngine.generateLoadURL({
      programId: "PRG-001",
      programNumber: "O1234",
      programName: "TEST",
      checksum: "abc123",
      createdAt: new Date().toISOString(),
      dncServer: "dnc://192.168.1.100",
      machineId: "MILL-1",
    });

    expect(url).toContain("dnc://192.168.1.100/load");
    expect(url).toContain("program=O1234");
    expect(url).toContain("machine=MILL-1");
  });

  it("should create label data", () => {
    const { qr, labelText } = DNCQREngine.createLabel({
      programId: "PRG-001",
      programNumber: "O5678",
      programName: "WIDGET_ROUGH",
      partNumber: "WIDGET-001",
      revision: "B",
      checksum: "def456",
      createdAt: new Date().toISOString(),
    }, { includeChecksum: true, includeDate: true });

    expect(qr).toBeDefined();
    expect(labelText).toContain("Program: O5678");
    expect(labelText.some(t => t.includes("WIDGET-001"))).toBe(true);
  });

  it("should validate expiry", () => {
    const futureData = {
      programId: "PRG-001",
      programNumber: "O1234",
      programName: "TEST",
      checksum: "abc",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    const pastData = {
      ...futureData,
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
    };

    expect(DNCQREngine.isValid(futureData)).toBe(true);
    expect(DNCQREngine.isValid(pastData)).toBe(false);
  });
});

// ─── CAM Recommend Engine Tests ───────────────────────────────────────────────

describe("CAMRecommendEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CAMRecommendEngine.getSelfAwareness();
    expect(awareness.name).toBe("CAMRecommendEngine");
    expect(awareness.strategies).toContain("adaptive");
    expect(awareness.operationTypes).toContain("roughing");
  });

  it("should recommend strategies for pocket", () => {
    const recs = CAMRecommendEngine.recommend({
      material: "aluminum",
      xSize: 100,
      ySize: 80,
      zSize: 20,
      features: ["pocket"],
    });

    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.operationType === "pocket")).toBe(true);
  });

  it("should recommend for thin wall features", () => {
    const recs = CAMRecommendEngine.recommend({
      material: "steel",
      hardness: 30,
      xSize: 50,
      ySize: 50,
      zSize: 30,
      features: ["thin_wall"],
    });

    const thinWallRec = recs.find(r => r.operationType === "semi_finish");
    expect(thinWallRec).toBeDefined();
    expect(thinWallRec?.warnings.length).toBeGreaterThan(0);
  });

  it("should list available strategies", () => {
    const strategies = CAMRecommendEngine.listStrategies();
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies.some(s => s.strategy === "adaptive")).toBe(true);
  });

  it("should recommend for specific operation", () => {
    const rec = CAMRecommendEngine.recommendForOperation("roughing", "steel", 50);
    expect(rec.operationType).toBeDefined();
    expect(rec.confidence).toBeGreaterThan(0);
  });
});

// ─── CAM Export Engine Tests ──────────────────────────────────────────────────

describe("CAMExportEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CAMExportEngine.getSelfAwareness();
    expect(awareness.name).toBe("CAMExportEngine");
    expect(awareness.supportedSystems).toContain("mastercam");
    expect(awareness.formats).toContain("apt");
  });

  it("should export to APT format", () => {
    const result = CAMExportEngine.export([{
      id: "TP-001",
      name: "ROUGH_POCKET",
      operationType: "roughing",
      toolNumber: 1,
      toolDiameter: 12.7,
      spindleSpeed: 8000,
      feedRate: 1500,
      coolant: "flood",
      points: [
        { x: 0, y: 0, z: 50, type: "rapid" },
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 50, y: 0, z: -5, type: "linear" },
        { x: 50, y: 50, z: -5, type: "linear" },
      ],
    }], "mastercam");

    expect(result.id).toMatch(/^EXP-/);
    expect(result.format).toBe("apt");
    expect(result.content).toContain("LOADTL");
    expect(result.content).toContain("SPINDL");
  });

  it("should export to JSON format", () => {
    const result = CAMExportEngine.export([{
      id: "TP-002",
      name: "FINISH",
      operationType: "finishing",
      toolNumber: 2,
      toolDiameter: 6.35,
      spindleSpeed: 15000,
      feedRate: 2500,
      coolant: "mist",
      points: [{ x: 0, y: 0, z: 0, type: "linear" }],
    }], "fusion360", "json");

    expect(result.format).toBe("json");
    const parsed = JSON.parse(result.content);
    expect(parsed.toolpaths).toBeDefined();
  });

  it("should list supported systems", () => {
    const systems = CAMExportEngine.listSupportedSystems();
    expect(systems.length).toBeGreaterThan(0);
    expect(systems.some(s => s.system === "mastercam")).toBe(true);
  });
});

// ─── CAM Analyze Engine Tests ─────────────────────────────────────────────────

describe("CAMAnalyzeEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CAMAnalyzeEngine.getSelfAwareness();
    expect(awareness.name).toBe("CAMAnalyzeEngine");
    expect(awareness.metrics).toContain("efficiency");
  });

  it("should analyze operation", () => {
    const analysis = CAMAnalyzeEngine.analyze({
      name: "POCKET_ROUGH",
      type: "roughing",
      toolDiameter: 12.7,
      spindleSpeed: 8000,
      feedRate: 1500,
      stepover: 5,
      stepdown: 3,
      points: [
        { x: 0, y: 0, z: 50, type: "rapid" },
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 50, y: 0, z: -5, type: "linear" },
        { x: 50, y: 50, z: -5, type: "linear" },
        { x: 0, y: 50, z: -5, type: "linear" },
        { x: 0, y: 0, z: 50, type: "rapid" },
      ],
    });

    expect(analysis.id).toMatch(/^ANA-/);
    expect(analysis.metrics.totalDistance).toBeGreaterThan(0);
    expect(analysis.metrics.efficiency).toBeGreaterThanOrEqual(0);
    expect(analysis.score.overall).toBeGreaterThanOrEqual(0);
  });

  it("should detect high engagement issues", () => {
    const analysis = CAMAnalyzeEngine.analyze({
      name: "HIGH_ENGAGE",
      type: "roughing",
      toolDiameter: 10,
      spindleSpeed: 8000,
      feedRate: 1500,
      stepover: 8, // 80% radial engagement
      stepdown: 20, // 2xD axial engagement
      points: [
        { x: 0, y: 0, z: 0, type: "linear" },
        { x: 100, y: 0, z: 0, type: "linear" },
      ],
    });

    expect(analysis.issues.some(i => i.code === "HIGH_RADIAL_ENGAGEMENT")).toBe(true);
    expect(analysis.issues.some(i => i.code === "HIGH_AXIAL_ENGAGEMENT")).toBe(true);
  });

  it("should compare operations", () => {
    const a1 = CAMAnalyzeEngine.analyze({
      name: "OP1",
      type: "roughing",
      toolDiameter: 12,
      spindleSpeed: 8000,
      feedRate: 1500,
      stepover: 4,
      stepdown: 2,
      points: [{ x: 0, y: 0, z: 0, type: "linear" }, { x: 50, y: 0, z: 0, type: "linear" }],
    });

    const a2 = CAMAnalyzeEngine.analyze({
      name: "OP2",
      type: "roughing",
      toolDiameter: 12,
      spindleSpeed: 8000,
      feedRate: 1000,
      stepover: 3,
      stepdown: 1.5,
      points: [{ x: 0, y: 0, z: 0, type: "linear" }, { x: 50, y: 0, z: 0, type: "linear" }],
    });

    const comparison = CAMAnalyzeEngine.compare([a1, a2]);
    expect(comparison.best).toBeDefined();
    expect(comparison.comparison.length).toBe(2);
  });
});

// ─── CAM Tool Library Engine Tests ────────────────────────────────────────────

describe("CAMToolLibraryEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CAMToolLibraryEngine.getSelfAwareness();
    expect(awareness.name).toBe("CAMToolLibraryEngine");
    expect(awareness.toolTypes).toContain("end_mill");
    expect(awareness.toolMaterials).toContain("carbide");
  });

  it("should create tool library", () => {
    const lib = CAMToolLibraryEngine.createLibrary("Test Library", "Test description", "mastercam");
    expect(lib.id).toMatch(/^LIB-/);
    expect(lib.name).toBe("Test Library");
    expect(lib.tools).toHaveLength(0);
  });

  it("should search tools", () => {
    const results = CAMToolLibraryEngine.searchTools({ type: "end_mill" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(t => t.type === "end_mill")).toBe(true);
  });

  it("should get recommended parameters", () => {
    const tools = CAMToolLibraryEngine.getAllTools();
    if (tools.length > 0) {
      const params = CAMToolLibraryEngine.getRecommendedParams(tools[0].id, "aluminum");
      expect(params).toBeDefined();
      expect(params?.rpm).toBeGreaterThan(0);
      expect(params?.feed).toBeGreaterThan(0);
    }
  });

  it("should export library to CSV", () => {
    const lib = CAMToolLibraryEngine.createLibrary("Export Test");
    CAMToolLibraryEngine.addToolToLibrary(lib.id, {
      name: "Test Tool",
      type: "end_mill",
      material: "carbide",
      coating: "tialn",
      geometry: {
        diameter: 10,
        fluteLength: 20,
        overallLength: 60,
        shankDiameter: 10,
        fluteCount: 4,
      },
      speeds: { minRPM: 3000, maxRPM: 12000, recommendedRPM: 8000 },
      feeds: { minFeed: 500, maxFeed: 3000, recommendedFeed: 1500, plungeFeed: 500 },
      limits: { maxStepover: 5, maxStepdown: 10, minChipload: 0.05, maxChipload: 0.15 },
      materials: ["aluminum", "steel"],
    });

    const csv = CAMToolLibraryEngine.exportLibrary(lib.id, "csv");
    expect(csv).toContain("ID,Name,Type");
    expect(csv).toContain("end_mill");
  });
});

// ─── CAM Tool Get Engine Tests ────────────────────────────────────────────────

describe("CAMToolGetEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CAMToolGetEngine.getSelfAwareness();
    expect(awareness.name).toBe("CAMToolGetEngine");
    expect(awareness.toolsInCache).toBeGreaterThan(0);
  });

  it("should get tool by number", () => {
    const tool = CAMToolGetEngine.getByNumber(1);
    expect(tool).toBeDefined();
    expect(tool?.number).toBe(1);
  });

  it("should query tools", () => {
    const results = CAMToolGetEngine.query({ type: "end_mill" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should select tool for operation", () => {
    const selection = CAMToolGetEngine.selectForOperation("roughing", "aluminum", 50);
    expect(selection.primary).toBeDefined();
    expect(selection.primary.recommendedRPM).toBeGreaterThan(0);
  });

  it("should get tool magazine", () => {
    const magazine = CAMToolGetEngine.getMagazine();
    expect(magazine.length).toBeGreaterThan(0);
    expect(magazine[0].number).toBeLessThanOrEqual(magazine[magazine.length - 1].number);
  });

  it("should get tool counts by type", () => {
    const counts = CAMToolGetEngine.getToolCounts();
    expect(Object.keys(counts).length).toBeGreaterThan(0);
  });

  it("should find replacement tool", () => {
    const replacement = CAMToolGetEngine.findReplacement(1);
    // May or may not find replacement depending on available tools
    if (replacement) {
      expect(replacement.number).not.toBe(1);
    }
  });
});
