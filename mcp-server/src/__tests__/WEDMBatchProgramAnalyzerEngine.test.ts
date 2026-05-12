/**
 * WEDMBatchProgramAnalyzerEngine — Unit Tests
 *
 * Tests batch analysis of Wire EDM programs from JM Die archive.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  WEDMBatchProgramAnalyzerEngine,
  wedmBatchProgramAnalyzerEngine,
  WEDMProgramAnalysis,
  WEDMBatchAnalysisResult,
} from "../engines/WEDMBatchProgramAnalyzerEngine.js";

// Use system temp directory for test files
const TEMP_DIR = os.tmpdir();

// Test fixtures: real program content from JM Die archive
const MITSUBISHI_PROGRAM_CONTENT = `%
L001
(05/24/22)

H175 = 0.0000

H1 =.0085 + H175
H2 =.0064 + H175
H3 =.0058 + H175
H4 =.0053 + H175

N5 G90
N10 M91 (Adaptive Control Off)
N15 G92 X0.0 Y0.0
N20 G1 X0. Y0. F25.0
N25 M20 (Thread Wire)
N30 M78 M78 (Fill Tank)
N35 M80 (Water On)
N40 M82 (Wire On)
N45 M84 (Power On)
N50 E1221 H1 F.12 (PASS=1)
N55 M90 (Adaptive Control On)
N60 G42 G1 X-.20265 Y.117
N65 X-.13799 Y.229
N70 G2 X-.12933 Y.234 I.00866 J-.005
N75 G1 X.12933
N80 G2 X.13799 Y.229 I0. J-.01
N85 G1 X.26731 Y.005
N90 G2 Y-.005 I-.00866 J-.005
N95 G1 X.13799 Y-.229
N100 G40 X-.17533 Y.12432
N105 E1222 H2 F.24 (PASS=2)
N110 G42 G1 X-.20265 Y.117
N115 X-.13799 Y.229
N120 G40 X-.17533 Y.12432
N125 E1223 H3 F.21 (PASS=3)
N130 G41 G1 X-.19265 Y.13432
N135 G40 X-.18533 Y.107
N140 E1224 H4 F.2 (PASS=4)
N145 G42 G1 X-.20265 Y.117
N150 G40 X-.17533 Y.12432
N155 M85 M83 M81 (Power/Wire/Fluid - Off)
N160 M21 (Cut Wire)
N165 M58 (Drain Tank)
N170 M02
%
`;

const TAPER_PROGRAM_CONTENT = `%
L001
(TAPER PROGRAM)

H175 = 0.0000
H1 =0. + H175

N5 G90
N10 M91 (Adaptive Control Off)
N15 G92 X0.0 Y0.0
N20 M20 (Thread Wire)
N25 M78 M78 (Fill Tank)
N30 M80 (Water On)
N35 M82 (Wire On)
N40 M84 (Power On)
N45 E2821 H1 F.16 (PASS=1)
N50 M90 (Adaptive Control On)
N55 G1 X-.11614 Y.0754 U-.04786 V0.
N60 G1 X-.13934 Y.0754 U0. V0.
N65 G1 X-.23207 Y.07478 U0. V0.
N70 G1 X-.25341 Y.06589 U0. V0.
N75 M85 M83 M81 (Power/Wire/Fluid - Off)
N80 M21 (Cut Wire)
N85 M58 (Drain Tank)
N90 M02
%
`;

const MINIMAL_PROGRAM_CONTENT = `%
G92 X0.0 Y0.0
E1221 H1 F.12
G42 G1 X1.0 Y1.0
G1 X2.0
G40
M02
%
`;

const LATHE_PROGRAM_CONTENT = `$QUILL-312.MIN%
G50 S800
NAT12               (OD ROUGH INSERT - R.032)
G0 X20. Z20.
T121212
G97 S800 M3
G0 X1.25 Z-.05 M8
G96 S200
G1 X1.128 F.01
Z0 A315 F.003
X.2 F.005
G0 X20. Z20.
M01
M2
%
`;

describe("WEDMBatchProgramAnalyzerEngine", () => {
  let engine: WEDMBatchProgramAnalyzerEngine;

  beforeEach(() => {
    engine = new WEDMBatchProgramAnalyzerEngine();
  });

  describe("Program Detection", () => {
    it("should identify Mitsubishi Wire EDM programs", () => {
      // Create temp file
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-wedm.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis).not.toBeNull();
        expect(analysis?.dialect).toBe("mitsubishi");
        expect(analysis?.eCodes).toContain("E1221");
        expect(analysis?.eCodes).toContain("E1222");
        expect(analysis?.eCodes).toContain("E1223");
        expect(analysis?.eCodes).toContain("E1224");
        expect(analysis?.passCount).toBeGreaterThanOrEqual(4);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should identify taper programs with U/V axis", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-taper.NC");
      fs.writeFileSync(tempPath, TAPER_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis).not.toBeNull();
        expect(analysis?.hasTaper).toBe(true);
        expect(analysis?.eCodes).toContain("E2821");
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should reject non-Wire EDM programs (lathe)", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-lathe.MIN");
      fs.writeFileSync(tempPath, LATHE_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        // Should return null for lathe programs
        expect(analysis).toBeNull();
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Code Extraction", () => {
    it("should extract E-codes correctly", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-ecodes.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.eCodes).toHaveLength(4);
        expect(analysis?.eCodes).toEqual(
          expect.arrayContaining(["E1221", "E1222", "E1223", "E1224"])
        );
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should extract H-register declarations", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-hregs.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.hRegisters).toHaveProperty("1");
        expect(analysis?.hRegisters).toHaveProperty("2");
        expect(analysis?.hRegisters).toHaveProperty("175");
        expect(analysis?.hRegisters[175]).toBe(0);
        expect(analysis?.hRegisters[1]).toBeCloseTo(0.0085, 4);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should extract M-codes for wire control", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-mcodes.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.mCodes).toContain("M20"); // Thread wire
        expect(analysis?.mCodes).toContain("M21"); // Cut wire
        expect(analysis?.mCodes).toContain("M78"); // Fill tank
        expect(analysis?.mCodes).toContain("M58"); // Drain tank
        expect(analysis?.mCodes).toContain("M90"); // Adaptive control on
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should extract feed rates", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-feeds.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.feedRates).toContain(0.12);
        expect(analysis?.feedRates).toContain(0.24);
        expect(analysis?.feedRates).toContain(0.21);
        expect(analysis?.feedRates).toContain(0.2);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should extract G-codes", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-gcodes.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.gCodes).toContain("G90");
        expect(analysis?.gCodes).toContain("G92");
        expect(analysis?.gCodes).toContain("G1");
        expect(analysis?.gCodes).toContain("G2");
        expect(analysis?.gCodes).toContain("G42");
        expect(analysis?.gCodes).toContain("G40");
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Quality Scoring", () => {
    it("should score complete programs highly", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-quality.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.qualityScore).toBeGreaterThanOrEqual(50);
        expect(analysis?.completenessScore).toBeGreaterThanOrEqual(50);
        expect(analysis?.safetyScore).toBeGreaterThanOrEqual(50);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should score minimal programs lower", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-minimal.NC");
      fs.writeFileSync(tempPath, MINIMAL_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.qualityScore).toBeLessThan(70);
        expect(analysis?.warnings.length).toBeGreaterThan(0);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Feature Detection", () => {
    it("should detect adaptive control", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-adaptive.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.hasAdaptiveControl).toBe(true);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should detect tank management", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-tank.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.hasTankManagement).toBe(true);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should detect multi-pass programs", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-multipass.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.hasMultiPass).toBe(true);
        expect(analysis?.passCount).toBeGreaterThanOrEqual(4);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Thickness Estimation", () => {
    it("should estimate thickness from E-code groups", () => {
      // E12xx = thin material
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-thickness.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.estimatedThicknessCategory).toBe("thin");
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should estimate medium thickness for E28xx codes", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-thick.NC");
      fs.writeFileSync(tempPath, TAPER_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.estimatedThicknessCategory).toBe("medium");
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Wire Break Risk", () => {
    it("should assess wire break risk", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-risk.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(["low", "medium", "high"]).toContain(analysis?.wireBreakRiskLevel);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should rate programs without adaptive control as higher risk", () => {
      const noAdaptive = MINIMAL_PROGRAM_CONTENT;
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-norisk.NC");
      fs.writeFileSync(tempPath, noAdaptive);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        // Programs without M90 should have elevated risk
        expect(["medium", "high"]).toContain(analysis?.wireBreakRiskLevel);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Complexity Scoring", () => {
    it("should calculate complexity based on program features", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-complex.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        expect(analysis?.complexityScore).toBeGreaterThan(0);
        expect(analysis?.complexityScore).toBeLessThanOrEqual(100);
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should score taper programs as more complex", () => {
      const standardPath = path.join(TEMP_DIR, "prism-wedm-test-standard.NC");
      const taperPath = path.join(TEMP_DIR, "prism-wedm-test-taper2.NC");

      fs.writeFileSync(standardPath, MINIMAL_PROGRAM_CONTENT);
      fs.writeFileSync(taperPath, TAPER_PROGRAM_CONTENT);

      try {
        const standardAnalysis = engine.analyzeProgram(standardPath);
        const taperAnalysis = engine.analyzeProgram(taperPath);

        // Taper should be more complex
        expect(taperAnalysis?.complexityScore).toBeGreaterThan(
          standardAnalysis?.complexityScore || 0
        );
      } finally {
        fs.unlinkSync(standardPath);
        fs.unlinkSync(taperPath);
      }
    });
  });

  describe("Batch Processing", () => {
    it("should batch analyze programs with limit", () => {
      // This test uses the actual JM Die archive if available
      const archivePath = "H:/PRISM/JM DIE/WIRE EDM";

      if (fs.existsSync(archivePath)) {
        const result = engine.batchAnalyze(5); // Limit to 5 programs for speed

        expect(result.totalFilesScanned).toBeGreaterThan(0);
        expect(result.schemaVersion).toBe("1.0.0");
        expect(result.statistics).toBeDefined();
        expect(result.customerProfiles).toBeDefined();
      } else {
        // Skip if archive not available
        console.log("JM Die archive not available, skipping batch test");
        expect(true).toBe(true);
      }
    });
  });

  describe("Statistics Calculation", () => {
    it("should calculate E-code frequency distribution", () => {
      const archivePath = "H:/PRISM/JM DIE/WIRE EDM";

      if (fs.existsSync(archivePath)) {
        const result = engine.batchAnalyze(10);

        expect(result.statistics.eCodeFrequency).toBeDefined();
        expect(result.statistics.topECodes).toBeInstanceOf(Array);
      } else {
        expect(true).toBe(true);
      }
    });

    it("should calculate pass count distribution", () => {
      const archivePath = "H:/PRISM/JM DIE/WIRE EDM";

      if (fs.existsSync(archivePath)) {
        const result = engine.batchAnalyze(10);

        expect(result.statistics.passCountDistribution).toBeDefined();
        expect(result.statistics.averagePassCount).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe("Training Data Generation", () => {
    it("should generate training data from analyzed programs", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-training.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        if (analysis) {
          const trainingData = engine.generateTrainingData([analysis]);

          expect(trainingData.totalSamples).toBe(1);
          expect(trainingData.samples[0].features).toBeDefined();
          expect(trainingData.samples[0].labels).toBeDefined();
          expect(trainingData.featureSchema).toBeDefined();
          expect(trainingData.labelSchema).toBeDefined();
        }
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should include correct feature fields in training data", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-features.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = engine.analyzeProgram(tempPath);
        if (analysis) {
          const trainingData = engine.generateTrainingData([analysis]);
          const sample = trainingData.samples[0];

          expect(sample.features.passCount).toBeGreaterThan(0);
          expect(sample.features.eCodePrimary).toMatch(/^E\d{4}$/);
          expect(typeof sample.features.hasTaper).toBe("boolean");
          expect(typeof sample.features.hasAdaptiveControl).toBe("boolean");
          expect(sample.features.lineCount).toBeGreaterThan(0);
        }
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Customer Profile Building", () => {
    it("should extract customer name from file path", () => {
      const tempDir = path.join(TEMP_DIR, "prism-wedm-test-ACME");
      const tempFile = path.join(tempDir, "test.NC");

      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(tempFile, MITSUBISHI_PROGRAM_CONTENT);

      try {
        // Note: Customer extraction depends on path structure
        // This test validates the engine handles various paths
        const analysis = engine.analyzeProgram(tempFile);
        expect(analysis?.customerName).toBeDefined();
      } finally {
        fs.unlinkSync(tempFile);
        fs.rmdirSync(tempDir);
      }
    });
  });

  describe("Static Helpers", () => {
    it("should provide static analyzeFile method", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-static.NC");
      fs.writeFileSync(tempPath, MITSUBISHI_PROGRAM_CONTENT);

      try {
        const analysis = WEDMBatchProgramAnalyzerEngine.analyzeFile(tempPath);
        expect(analysis).not.toBeNull();
        expect(analysis?.dialect).toBe("mitsubishi");
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty files gracefully", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-empty.NC");
      fs.writeFileSync(tempPath, "");

      try {
        const analysis = engine.analyzeProgram(tempPath);
        // Empty files should be rejected (not Wire EDM)
        expect(analysis).toBeNull();
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should handle malformed G-code gracefully", () => {
      const tempPath = path.join(TEMP_DIR, "prism-wedm-test-malformed.NC");
      fs.writeFileSync(tempPath, "This is not valid G-code\nJust some text\n%");

      try {
        const analysis = engine.analyzeProgram(tempPath);
        // Invalid content should be rejected
        expect(analysis).toBeNull();
      } finally {
        fs.unlinkSync(tempPath);
      }
    });

    it("should handle non-existent files", () => {
      const result = engine.analyzeProgram("/nonexistent/path/file.NC");
      expect(result).toBeNull();
    });
  });
});

describe("wedmBatchProgramAnalyzerEngine singleton", () => {
  it("should export a singleton instance", () => {
    expect(wedmBatchProgramAnalyzerEngine).toBeInstanceOf(
      WEDMBatchProgramAnalyzerEngine
    );
  });

  it("should have harvestAllPrograms method", () => {
    expect(typeof wedmBatchProgramAnalyzerEngine.harvestAllPrograms).toBe(
      "function"
    );
  });

  it("should have batchAnalyze method", () => {
    expect(typeof wedmBatchProgramAnalyzerEngine.batchAnalyze).toBe("function");
  });
});
