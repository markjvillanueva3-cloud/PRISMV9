/**
 * ProgramLabelingPipelineEngine Tests — PP-DATA-MS0
 *
 * Tests the data labeling pipeline for JM DIE CNC programs.
 * Validates extraction of machine types, controllers, materials,
 * and G-code dialect markers from real program samples.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ProgramLabelingPipelineEngine,
  ProgramLabel,
  GCodeDialect,
} from "../../engines/ProgramLabelingPipelineEngine.js";
import * as fs from "fs";
import * as path from "path";

describe("ProgramLabelingPipelineEngine", () => {
  let engine: ProgramLabelingPipelineEngine;

  beforeEach(() => {
    engine = new ProgramLabelingPipelineEngine();
  });

  describe("labelProgram", () => {
    // Create temp test files for isolated testing
    const TEST_DIR = path.join(process.cwd(), "test-temp-labeling");
    const TEST_FILE = path.join(TEST_DIR, "test-program.MIN");

    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
    });

    it("should extract Okuma lathe dialect markers from G140 program", () => {
      const content = `G140
NSTRT
(PROGRAM NAME - TEST001)
(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)
(MCX FILE - C:\\USERS\\CNC LATHE\\BOX SYNC\\CNC LATHE\\TEST.MCX-8)
(MATERIAL - STEEL INCH - 1030 - 200 BHN)
G0 X20. Z30.
G50 S800
NAT01
T010101 G97 S558 M3 M42
G96 S200
G95 G1 X-.0313 F.005
M02
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.fileName).toBe("test-program.MIN");
      expect(label.gcodeDialect?.hasG140).toBe(true);
      expect(label.gcodeDialect?.hasNATLabels).toBe(true);
      expect(label.gcodeDialect?.hasMastercamComments).toBe(true);
      expect(label.materialHint).toContain("1030");
      expect(label.materialGroup).toBe("P");
      expect(label.machineCategory).toBe("lathe");
      expect(label.lineCount).toBeGreaterThan(0);
      expect(label.labelConfidence).toBeGreaterThan(0);
    });

    it("should extract tool count from T###### patterns", () => {
      const content = `G140
NAT01
T010101 G97 S500 M3
G0 X20 Z20
NAT02
T020202 G97 S600 M3
G0 X20 Z20
NAT05
T050505 G97 S700 M3
G0 X20 Z20
NAT11
T111111 G97 S800 M3
M02
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      // Should detect tools 1, 2, 5, 11
      expect(label.toolCount).toBe(4);
    });

    it("should detect Okuma canned cycles G85/G87", () => {
      const content = `$TEST.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
G50 S1000
NAT01
T010101 G97 S804 M3 M42
G0 X.95 Z0. M8
G85 NR001 U.01 W.005 D.03 F.005
NR001 G81
G87 NR001
M2
%
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.gcodeDialect?.hasDollarHeader).toBe(true);
      expect(label.gcodeDialect?.hasClearKeyword).toBe(true);
      expect(label.gcodeDialect?.hasOkumaCycles).toBe(true);
      expect(label.hasCannedCycles).toBe(true);
    });

    it("should detect threading cycles G71", () => {
      const content = `G140
NAT06    (THREAD 3 - 16)
T060606
G0 X20 Z20
G97 S300 M3
G0 X2.85 Z.050
G71 X3.01 Z-.74 B60 D.003 U.001 H.070 F1. J16 M33 M73
G0 Z.050
M02
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.hasThreading).toBe(true);
      expect(label.gcodeDialect?.hasOkumaCycles).toBe(true);
    });

    it("should detect subprogram calls", () => {
      const content = `G140
NBAR
/CALL OBAR
M1
NAT01
T010101
G0 X20 Z20
/GOTO NBAR
M2
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.hasSubprograms).toBe(true);
    });

    it("should extract spindle speed range", () => {
      const content = `G140
G50 S800
NAT01
T010101 G97 S558 M3
G96 S200
NAT02
T020202 G97 S1000 M3
G96 S450
M02
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.spindleSpeedRange).toBeDefined();
      expect(label.spindleSpeedRange?.min).toBeLessThanOrEqual(200);
      expect(label.spindleSpeedRange?.max).toBeGreaterThanOrEqual(800);
    });

    it("should extract feed rate range", () => {
      const content = `G140
NAT01
T010101
G95 G1 X-.0313 F.005
G1 Z-.100 F.002
G1 X.936 F.009
M02
`;
      fs.writeFileSync(TEST_FILE, content, "utf-8");

      const label = engine.labelProgram(TEST_FILE);

      expect(label.feedRateRange).toBeDefined();
      expect(label.feedRateRange?.min).toBeLessThanOrEqual(0.002);
      expect(label.feedRateRange?.max).toBeGreaterThanOrEqual(0.005);
    });

    it("should detect material hints in comments", () => {
      // Test D2 tool steel detection
      const contentD2 = `G140
(D2 TOOL STEEL HARDENED)
NAT01
T010101
M02
`;
      fs.writeFileSync(TEST_FILE, contentD2, "utf-8");

      const labelD2 = engine.labelProgram(TEST_FILE);
      expect(labelD2.materialHint).toContain("D2");
      expect(labelD2.materialGroup).toBe("H");

      // Test carbide detection
      const contentCarbide = `G140
NAT07   (CARBIDE BORING BAR 1/2 WITH .015R.)
T070707
M02
`;
      fs.writeFileSync(TEST_FILE, contentCarbide, "utf-8");

      const labelCarbide = engine.labelProgram(TEST_FILE);
      expect(labelCarbide.materialHint).toContain("Carbide");
    });

    it("should calculate confidence based on extracted features", () => {
      // Program with many features should have high confidence
      const richContent = `$RICH-TEST.MIN%
G140
(PROGRAM NAME - RICH-TEST)
(MCX FILE - C:\\USERS\\CNC LATHE\\TEST.MCX-8)
(MATERIAL - STEEL INCH - 4140 - 280 BHN)
CLEAR
DEF WORK
END
G50 S1000
NAT01
T010101 G97 S800 M3
G85 NR001 D.03 F.005
NR001 G81
G87 NR001
M02
%
`;
      fs.writeFileSync(TEST_FILE, richContent, "utf-8");
      const richLabel = engine.labelProgram(TEST_FILE);

      // Program with few features should have low confidence
      const sparseContent = `G0 X10 Z10
G1 X5 F0.5
M30
`;
      fs.writeFileSync(TEST_FILE, sparseContent, "utf-8");
      const sparseLabel = engine.labelProgram(TEST_FILE);

      expect(richLabel.labelConfidence).toBeGreaterThan(sparseLabel.labelConfidence);
      expect(richLabel.labelConfidence).toBeGreaterThan(0.5);
    });

    // Cleanup
    afterEach(() => {
      try {
        if (fs.existsSync(TEST_FILE)) {
          fs.unlinkSync(TEST_FILE);
        }
        if (fs.existsSync(TEST_DIR)) {
          fs.rmdirSync(TEST_DIR);
        }
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe("dialect detection", () => {
    const TEST_DIR = path.join(process.cwd(), "test-temp-labeling-dialect");
    const TEST_FILE = path.join(TEST_DIR, "dialect-test.MIN");

    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
    });

    it("should detect G140 Okuma lathe initialization", () => {
      fs.writeFileSync(TEST_FILE, "G140\nG0 X10 Z10\nM02", "utf-8");
      const label = engine.labelProgram(TEST_FILE);
      expect(label.gcodeDialect?.hasG140).toBe(true);
      expect(label.gcodeDialect?.hasG141).toBe(false);
    });

    it("should detect G141 Okuma mill initialization", () => {
      fs.writeFileSync(TEST_FILE, "G141\nG0 X10 Y10 Z10\nM02", "utf-8");
      const label = engine.labelProgram(TEST_FILE);
      expect(label.gcodeDialect?.hasG141).toBe(true);
      expect(label.gcodeDialect?.hasG140).toBe(false);
    });

    it("should detect dollar-sign program header", () => {
      fs.writeFileSync(TEST_FILE, "$MY-PROGRAM.MIN%\nG140\nM02\n%", "utf-8");
      const label = engine.labelProgram(TEST_FILE);
      expect(label.gcodeDialect?.hasDollarHeader).toBe(true);
    });

    it("should detect CLEAR/DEF WORK keywords", () => {
      fs.writeFileSync(TEST_FILE, "CLEAR\nDEF WORK\nPS LC\nEND\nG0 X10\nM02", "utf-8");
      const label = engine.labelProgram(TEST_FILE);
      expect(label.gcodeDialect?.hasClearKeyword).toBe(true);
    });

    it("should detect in-house post processor marker", () => {
      fs.writeFileSync(TEST_FILE, "G140\n(POST DEV - IN-HOUSE SOLUTIONS)\nM02", "utf-8");
      const label = engine.labelProgram(TEST_FILE);
      expect(label.gcodeDialect?.hasInHousePost).toBe(true);
    });

    afterEach(() => {
      try {
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
        if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR);
      } catch {
        // Ignore
      }
    });
  });

  describe("customer extraction", () => {
    const TEST_BASE = path.join(process.cwd(), "test-temp-customers");

    beforeEach(() => {
      const customerDir = path.join(TEST_BASE, "CNC LATHE", "ALCOA");
      if (!fs.existsSync(customerDir)) {
        fs.mkdirSync(customerDir, { recursive: true });
      }
    });

    it("should extract customer name from CNC LATHE path", () => {
      const customerDir = path.join(TEST_BASE, "CNC LATHE", "ALCOA");
      const testFile = path.join(customerDir, "test.MIN");
      fs.writeFileSync(testFile, "G140\nM02", "utf-8");

      const label = engine.labelProgram(testFile);
      expect(label.customer).toBe("ALCOA");
    });

    afterEach(() => {
      try {
        fs.rmSync(TEST_BASE, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });
  });

  describe("export formats", () => {
    const TEST_DIR = path.join(process.cwd(), "test-temp-export");
    const LABELS_FILE = path.join(TEST_DIR, "test-labels.json");

    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      // Create a test labels file
      const testLabels = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: "/test",
        stats: {
          totalFiles: 2,
          labeledFiles: 2,
          unlabeledFiles: 0,
          byMachineType: { lathe: 2 },
          byController: { "OSP-P300": 2 },
          byMaterial: { P: 1 },
          byConfidence: { high: 1, medium: 1, low: 0 },
          averageToolCount: 3,
          averageLineCount: 50,
          withThreading: 1,
          withCannedCycles: 2,
          withSubprograms: 0,
          processingTimeMs: 100,
        },
        labels: [
          {
            filePath: "/test/prog1.MIN",
            fileName: "prog1.MIN",
            customer: "ACME",
            machineType: "LB300",
            machineCategory: "lathe",
            controllerFamily: "OSP-P300",
            materialHint: "4140 Steel",
            materialGroup: "P",
            toolCount: 4,
            lineCount: 60,
            hasThreading: true,
            hasCannedCycles: true,
            hasSubprograms: false,
            labelConfidence: 0.85,
            labelSource: "auto",
            labeledAt: new Date().toISOString(),
            gcodeDialect: {
              hasG140: true,
              hasG141: false,
              hasClearKeyword: true,
              hasNATLabels: true,
              hasDollarHeader: true,
              hasOkumaCycles: true,
              hasMastercamComments: true,
              hasInHousePost: false,
            },
          },
          {
            filePath: "/test/prog2.MIN",
            fileName: "prog2.MIN",
            machineCategory: "lathe",
            controllerFamily: "OSP-P300",
            toolCount: 2,
            lineCount: 40,
            hasCannedCycles: true,
            labelConfidence: 0.45,
            labelSource: "auto",
            labeledAt: new Date().toISOString(),
          },
        ],
      };

      fs.writeFileSync(LABELS_FILE, JSON.stringify(testLabels), "utf-8");
    });

    it("should export to CSV format", () => {
      const csv = engine.exportTrainingData(LABELS_FILE, "csv");

      expect(csv).toContain("filePath,fileName,customer");
      expect(csv).toContain("prog1.MIN");
      expect(csv).toContain("ACME");
      expect(csv).toContain("LB300");
      expect(csv).toContain("0.85");
    });

    it("should export to JSONL format", () => {
      const jsonl = engine.exportTrainingData(LABELS_FILE, "jsonl");
      const lines = jsonl.split("\n").filter((l) => l.trim());

      expect(lines.length).toBe(2);

      const first = JSON.parse(lines[0]);
      expect(first.fileName).toBe("prog1.MIN");
      expect(first.labelConfidence).toBe(0.85);
    });

    it("should export to parquet-ready format", () => {
      const parquetReady = engine.exportTrainingData(LABELS_FILE, "parquet-ready");
      const records = JSON.parse(parquetReady);

      expect(records).toHaveLength(2);
      expect(records[0].file_name).toBe("prog1.MIN");
      expect(records[0].dialect_g140).toBe(true);
      expect(records[0].dialect_okuma_cycles).toBe(true);
    });

    afterEach(() => {
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });
  });

  describe("statistics calculation", () => {
    it("should calculate correct confidence buckets", () => {
      const TEST_DIR = path.join(process.cwd(), "test-temp-stats");
      const LABELS_FILE = path.join(TEST_DIR, "stats-labels.json");

      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }

      const testLabels = {
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        rootPath: "/test",
        stats: {
          totalFiles: 3,
          labeledFiles: 3,
          unlabeledFiles: 0,
          byMachineType: {},
          byController: {},
          byMaterial: {},
          byConfidence: { high: 1, medium: 1, low: 1 },
          averageToolCount: 0,
          averageLineCount: 0,
          withThreading: 0,
          withCannedCycles: 0,
          withSubprograms: 0,
          processingTimeMs: 50,
        },
        labels: [
          { filePath: "/a", fileName: "a", labelConfidence: 0.8, labelSource: "auto", labeledAt: "" },
          { filePath: "/b", fileName: "b", labelConfidence: 0.5, labelSource: "auto", labeledAt: "" },
          { filePath: "/c", fileName: "c", labelConfidence: 0.2, labelSource: "auto", labeledAt: "" },
        ],
      };

      fs.writeFileSync(LABELS_FILE, JSON.stringify(testLabels), "utf-8");

      const stats = engine.getStats(LABELS_FILE);

      expect(stats).toBeDefined();
      expect(stats?.byConfidence.high).toBe(1);   // >= 0.7
      expect(stats?.byConfidence.medium).toBe(1); // 0.4 - 0.7
      expect(stats?.byConfidence.low).toBe(1);    // < 0.4

      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe("edge cases", () => {
    const TEST_DIR = path.join(process.cwd(), "test-temp-edge");
    const TEST_FILE = path.join(TEST_DIR, "edge-test.MIN");

    beforeEach(() => {
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
      }
    });

    it("should handle empty file", () => {
      fs.writeFileSync(TEST_FILE, "", "utf-8");
      const label = engine.labelProgram(TEST_FILE);

      expect(label.fileName).toBe("edge-test.MIN");
      expect(label.lineCount).toBe(1); // Empty string splits to [""]
      expect(label.labelConfidence).toBe(0);
    });

    it("should handle file with only comments", () => {
      fs.writeFileSync(TEST_FILE, "(This is a comment)\n(Another comment)\n", "utf-8");
      const label = engine.labelProgram(TEST_FILE);

      expect(label.lineCount).toBe(3);
      expect(label.toolCount).toBe(0);
    });

    it("should handle file with invalid G-code", () => {
      fs.writeFileSync(TEST_FILE, "INVALID CODE\nNOT G-CODE\nRANDOM TEXT\n", "utf-8");
      const label = engine.labelProgram(TEST_FILE);

      expect(label.labelConfidence).toBe(0);
      expect(label.toolCount).toBe(0);
    });

    it("should handle Windows line endings", () => {
      fs.writeFileSync(TEST_FILE, "G140\r\nNAT01\r\nT010101\r\nM02\r\n", "utf-8");
      const label = engine.labelProgram(TEST_FILE);

      expect(label.gcodeDialect?.hasG140).toBe(true);
      expect(label.gcodeDialect?.hasNATLabels).toBe(true);
      expect(label.toolCount).toBe(1);
    });

    afterEach(() => {
      try {
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
        if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR);
      } catch {
        // Ignore
      }
    });
  });
});
