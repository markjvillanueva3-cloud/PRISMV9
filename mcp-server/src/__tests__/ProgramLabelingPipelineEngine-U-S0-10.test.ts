/**
 * ProgramLabelingPipelineEngine Tests
 *
 * Validates the program labeling pipeline for JM DIE training data extraction.
 * Tests label extraction, dialect detection, machine type inference, and batch processing.
 *
 * @unit PP-DATA-MS0/U-S0-10
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { programLabelingPipelineEngine } from "../engines/ProgramLabelingPipelineEngine.js";

const TEST_DATA_DIR = "H:/PRISM/mcp-server/src/__tests__/fixtures/gcode";
const TEST_LABELS_FILE = "H:/PRISM/mcp-server/src/__tests__/fixtures/test-labels.json";

describe("ProgramLabelingPipelineEngine", () => {
  beforeEach(() => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test labels file
    try {
      fs.unlinkSync(TEST_LABELS_FILE);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("labelProgram", () => {
    it("should label an Okuma lathe program with G140", () => {
      // Create test program with Okuma dialect markers
      // Note: hasDollarHeader requires format $NAME.MIN% (full .MIN extension)
      // Note: Tool detection uses T######  format (6 digits) or NAT## format
      const testProgram = `
$TEST.MIN%
(LATHE PROGRAM - D2 TOOL STEEL)
G140
G50 S3000
NAT01 (OD ROUGHING)
G96 S500 M03
G00 X50.0 Z2.0
G01 Z0 F0.25
G01 X-1.0
G00 X100.0 Z50.0
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-okuma-lathe.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.filePath).toBe(testFile);
      expect(label.fileName).toBe("test-okuma-lathe.MIN");
      expect(label.gcodeDialect?.hasG140).toBe(true);
      expect(label.gcodeDialect?.hasDollarHeader).toBe(true);
      expect(label.materialHint).toContain("D2");
      expect(label.materialGroup).toBe("H");
      expect(label.toolCount).toBeGreaterThanOrEqual(1);
      expect(label.labelConfidence).toBeGreaterThan(0.3);
      expect(label.labelSource).toBe("auto");

      fs.unlinkSync(testFile);
    });

    it("should detect Mastercam comments", () => {
      const testProgram = `
%
O0001 (TEST PROGRAM)
(MCX FILE - STEEL_PART_V2.MCX-8)
(POST DEV - IN-HOUSE SOLUTIONS)
G90 G54
G00 X0 Y0
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-mastercam.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.gcodeDialect?.hasMastercamComments).toBe(true);
      expect(label.gcodeDialect?.hasInHousePost).toBe(true);

      fs.unlinkSync(testFile);
    });

    it("should detect machine type from content", () => {
      const testProgram = `
%
O1234 (MULTUS B300 PART)
(MACHINE: OKUMA MULTUS B300)
G140
T0101
G96 S400 M03
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-multus.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.machineType).toBe("Multus");
      expect(label.machineCategory).toBe("mill-turn");

      fs.unlinkSync(testFile);
    });

    it("should extract feed and spindle speed ranges", () => {
      const testProgram = `
%
O0001
G90 G54
T01 M06
S1200 M03
G00 X0 Y0
G01 Z-10 F100
G01 X50 F200
S2400
G01 Y50 F50
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-speeds-feeds.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.spindleSpeedRange?.min).toBeLessThanOrEqual(1200);
      expect(label.spindleSpeedRange?.max).toBeGreaterThanOrEqual(2400);
      expect(label.feedRateRange?.min).toBeLessThanOrEqual(50);
      expect(label.feedRateRange?.max).toBeGreaterThanOrEqual(200);

      fs.unlinkSync(testFile);
    });

    it("should detect threading operations", () => {
      const testProgram = `
%
O2000 (THREADING TEST)
G140
T0303 (THREAD TOOL)
G97 S1000 M03
G00 X25.0 Z5.0
G71 P2.0 Q1.5 F2.0
G00 X100.0 Z50.0
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-threading.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.hasThreading).toBe(true);

      fs.unlinkSync(testFile);
    });

    it("should handle empty files gracefully", () => {
      const testFile = path.join(TEST_DATA_DIR, "test-empty.nc");
      fs.writeFileSync(testFile, "");

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.lineCount).toBe(1); // Empty file has 1 line
      expect(label.labelConfidence).toBeLessThan(0.3);

      fs.unlinkSync(testFile);
    });

    it("should detect canned cycles (G85/G87)", () => {
      const testProgram = `
%
O3000 (CANNED CYCLE TEST)
G140
T0505
G96 S300 M03
G85 X30 Z-20 R2 F0.1
G87 X35 Z-25 R2 F0.08
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-canned.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.hasCannedCycles).toBe(true);
      expect(label.gcodeDialect?.hasOkumaCycles).toBe(true);

      fs.unlinkSync(testFile);
    });

    it("should extract customer from path", () => {
      // Customer extraction requires "CNC LATHE/CUSTOMER_NAME/" path pattern
      const cncLatheDir = path.join(TEST_DATA_DIR, "CNC LATHE");
      const customerDir = path.join(cncLatheDir, "ALCOA");
      fs.mkdirSync(customerDir, { recursive: true });

      const testFile = path.join(customerDir, "part001.MIN");
      fs.writeFileSync(testFile, "%\nO0001\nM30");

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.customer).toBe("ALCOA");

      fs.unlinkSync(testFile);
      fs.rmdirSync(customerDir);
      fs.rmdirSync(cncLatheDir);
    });

    it("should detect subprogram usage", () => {
      // Subprogram detection uses CALL/GOTO patterns (Okuma style)
      const testProgram = `
$MAIN.MIN%
G140
T0101
G96 S500 M03
CALL OSUB1
CALL OSUB2
GOTO NEND
G00 X100 Z50
NEND
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-subprograms.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.hasSubprograms).toBe(true);

      fs.unlinkSync(testFile);
    });

    it("should detect NAT labels (Okuma automatic tool select)", () => {
      const testProgram = `
$PART%
G140
NAT01 (OD ROUGH)
G96 S500 M03
G00 X50 Z2
NAT02 (OD FINISH)
G96 S600 M03
G00 X48 Z2
M30
`;
      const testFile = path.join(TEST_DATA_DIR, "test-nat.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.gcodeDialect?.hasNATLabels).toBe(true);

      fs.unlinkSync(testFile);
    });
  });

  describe("getStats", () => {
    it("should return null for non-existent labels file", () => {
      const stats = programLabelingPipelineEngine.getStats("/nonexistent/path.json");
      expect(stats).toBeNull();
    });

    it("should calculate statistics from labels file", () => {
      // Create a mock labels file
      const labelsData = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: TEST_DATA_DIR,
        stats: {
          totalFiles: 3,
          labeledFiles: 3,
          unlabeledFiles: 0,
          byMachineType: { "LB300": 2, "Multus": 1 },
          byController: { "OSP-P300": 3 },
          byMaterial: { "H": 2, "P": 1 },
          byConfidence: { high: 2, medium: 1, low: 0 },
          averageToolCount: 3.5,
          averageLineCount: 45,
          withThreading: 1,
          withCannedCycles: 2,
          withSubprograms: 1,
          processingTimeMs: 125,
        },
        labels: [
          { filePath: "/test1.MIN", fileName: "test1.MIN", labelConfidence: 0.8, machineType: "LB300", labelSource: "auto", labeledAt: new Date().toISOString() },
          { filePath: "/test2.MIN", fileName: "test2.MIN", labelConfidence: 0.75, machineType: "LB300", labelSource: "auto", labeledAt: new Date().toISOString() },
          { filePath: "/test3.MIN", fileName: "test3.MIN", labelConfidence: 0.5, machineType: "Multus", labelSource: "auto", labeledAt: new Date().toISOString() },
        ],
      };

      fs.writeFileSync(TEST_LABELS_FILE, JSON.stringify(labelsData, null, 2));

      const stats = programLabelingPipelineEngine.getStats(TEST_LABELS_FILE);

      expect(stats).not.toBeNull();
      expect(stats?.totalFiles).toBe(3);
      expect(stats?.labeledFiles).toBe(3);
      expect(stats?.byMachineType["LB300"]).toBe(2);
    });
  });

  describe("exportTrainingData", () => {
    it("should export to CSV format", () => {
      const labelsData = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: TEST_DATA_DIR,
        stats: { totalFiles: 1 } as any,
        labels: [
          {
            filePath: "/test.MIN",
            fileName: "test.MIN",
            machineType: "LB300",
            machineCategory: "lathe",
            controllerFamily: "OSP-P300",
            materialHint: "D2 Tool Steel",
            materialGroup: "H",
            toolCount: 3,
            lineCount: 50,
            hasThreading: false,
            hasCannedCycles: true,
            hasSubprograms: false,
            labelConfidence: 0.85,
            labelSource: "auto",
            labeledAt: new Date().toISOString(),
          },
        ],
      };

      fs.writeFileSync(TEST_LABELS_FILE, JSON.stringify(labelsData, null, 2));

      const csv = programLabelingPipelineEngine.exportTrainingData(TEST_LABELS_FILE, "csv");

      expect(csv).toContain("filePath");
      expect(csv).toContain("machineType");
      expect(csv).toContain("LB300");
      expect(csv).toContain("D2 Tool Steel");
    });

    it("should export to JSONL format", () => {
      const labelsData = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: TEST_DATA_DIR,
        stats: { totalFiles: 2 } as any,
        labels: [
          { filePath: "/a.MIN", fileName: "a.MIN", labelConfidence: 0.8, labelSource: "auto", labeledAt: new Date().toISOString() },
          { filePath: "/b.MIN", fileName: "b.MIN", labelConfidence: 0.7, labelSource: "auto", labeledAt: new Date().toISOString() },
        ],
      };

      fs.writeFileSync(TEST_LABELS_FILE, JSON.stringify(labelsData, null, 2));

      const jsonl = programLabelingPipelineEngine.exportTrainingData(TEST_LABELS_FILE, "jsonl");

      // JSONL should have one JSON object per line
      const lines = jsonl.trim().split("\n");
      expect(lines.length).toBe(2);
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[1])).not.toThrow();
    });

    it("should export to parquet-ready JSON format", () => {
      const labelsData = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: TEST_DATA_DIR,
        stats: { totalFiles: 1 } as any,
        labels: [
          {
            filePath: "/test.MIN",
            fileName: "test.MIN",
            gcodeDialect: { hasG140: true, hasNATLabels: false },
            labelConfidence: 0.8,
            labelSource: "auto",
            labeledAt: new Date().toISOString(),
          },
        ],
      };

      fs.writeFileSync(TEST_LABELS_FILE, JSON.stringify(labelsData, null, 2));

      const parquetReady = programLabelingPipelineEngine.exportTrainingData(TEST_LABELS_FILE, "parquet-ready");
      const records = JSON.parse(parquetReady);

      // parquet-ready format flattens dialect features
      expect(Array.isArray(records)).toBe(true);
      expect(records[0]).toHaveProperty("dialect_g140");
      expect(records[0].dialect_g140).toBe(true);
    });
  });

  describe("Material detection", () => {
    it("should detect D2 tool steel", () => {
      const testProgram = "(MATERIAL: D2 TOOL STEEL - 60 HRC)\nG90\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-d2.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.materialHint).toContain("D2");
      expect(label.materialGroup).toBe("H");

      fs.unlinkSync(testFile);
    });

    it("should detect aluminum", () => {
      const testProgram = "(MATERIAL: 6061-T6 ALUMINUM)\nG90\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-aluminum.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.materialHint).toContain("Aluminum");
      expect(label.materialGroup).toBe("N");

      fs.unlinkSync(testFile);
    });

    it("should detect stainless steel as M group", () => {
      const testProgram = "(MATERIAL: 304 STAINLESS STEEL)\nG90\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-stainless.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.materialHint).toContain("Stainless");
      expect(label.materialGroup).toBe("M");

      fs.unlinkSync(testFile);
    });

    it("should detect titanium as S group", () => {
      const testProgram = "(MATERIAL: TI-6AL-4V TITANIUM)\nG90\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-titanium.nc");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.materialHint).toContain("Titanium");
      expect(label.materialGroup).toBe("S");

      fs.unlinkSync(testFile);
    });
  });

  describe("Controller detection", () => {
    it("should detect OSP-P300 controller", () => {
      const testProgram = "(CONTROLLER: OSP-P300)\nG140\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-osp-p300.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.controllerFamily).toBe("OSP-P300");
      expect(label.controllerVersion).toBe("P300");

      fs.unlinkSync(testFile);
    });

    it("should detect OSP-P500 controller", () => {
      const testProgram = "(CONTROLLER: OKUMA OSP-P500)\nG140\nM30";
      const testFile = path.join(TEST_DATA_DIR, "test-osp-p500.MIN");
      fs.writeFileSync(testFile, testProgram);

      const label = programLabelingPipelineEngine.labelProgram(testFile);

      expect(label.controllerFamily).toBe("OSP-P500");

      fs.unlinkSync(testFile);
    });
  });

  describe("Confidence calculation", () => {
    it("should give higher confidence with more features detected", () => {
      const richProgram = `
$RICH_PROGRAM%
(MATERIAL: D2 TOOL STEEL)
(CONTROLLER: OSP-P300)
(MACHINE: LB300)
G140
T0101
NAT01
G96 S500 M03
G85 X30 Z-20 R2 F0.1
M30
`;
      const poorProgram = "G90\nM30";

      const richFile = path.join(TEST_DATA_DIR, "test-rich.MIN");
      const poorFile = path.join(TEST_DATA_DIR, "test-poor.nc");
      fs.writeFileSync(richFile, richProgram);
      fs.writeFileSync(poorFile, poorProgram);

      const richLabel = programLabelingPipelineEngine.labelProgram(richFile);
      const poorLabel = programLabelingPipelineEngine.labelProgram(poorFile);

      expect(richLabel.labelConfidence).toBeGreaterThan(poorLabel.labelConfidence);
      expect(richLabel.labelConfidence).toBeGreaterThan(0.6);
      expect(poorLabel.labelConfidence).toBeLessThan(0.3);

      fs.unlinkSync(richFile);
      fs.unlinkSync(poorFile);
    });
  });
});
