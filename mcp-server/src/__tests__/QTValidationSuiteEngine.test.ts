/**
 * QTValidationSuiteEngine — Tests with real QT3-QT12 golden-standard data
 *
 * These tests parse actual JM Die production programs and validate that
 * the engine correctly extracts tools, operations, extents, and safety blocks.
 * Assertions use REAL values from the QT .hnc files.
 */

import { describe, it, expect } from "vitest";
import {
  QTValidationSuiteEngine,
  type GoldenStandard,
  type QTTestCase,
} from "../engines/QTValidationSuiteEngine.js";

// ============================================================================
// REAL PROGRAM CONTENT — embedded from QT3.hnc and QT10.hnc
// ============================================================================

const QT3_HNC = `%
O1001
(Using G0 which travels along dogleg path.)
(Machine)
(  vendor: Hurco)
(  model: VMX30i)
(  description: Hurco VMX30i)
(T13 D=0.75 CR=0.03 - ZMIN=-1.1875 - face mill)
(T22 D=2. CR=0.015 - ZMIN=-0.0625 - face mill)
N1 G90 G17
N2 M59
N3 G28 G91 Z0.
N4 G90
(2D Contour Rough Pass)
N5 T13 M6
(3 FLUTE)
N6 T22
N7 S2546 M3
N8 G54
N9 M7
N10 G0 X-5.65 Y3.1625
N11 G43 Z0.6 H13
N12 Z0.2
N13 G1 Z-0.1187 F50.
N14 G41 X-5.25 Y2.75 D13 F38.2
N15 X5.25
N16 Y-2.75
N17 X-5.25
N18 Y2.75
N19 G40 X-5.6625 Y3.15
N20 G0 Z0.2
N100 G40 X-5.6625 Y3.15
N101 G0 Z0.6
N102 M9
N103 M62
N104 M5
N105 G28 G91 Z0.
N106 G90
(Face1)
N107 M1
N108 T22 M6
(9 FLUTE)
N109 T13
N110 S1200 M3
N111 G54
N112 M8
N113 G0 X6.35 Y-2.0095
N114 G43 Z0.6 H22
N115 Z0.2
N116 G1 Z-0.0625 F50.
N117 X6.2894 F60.
N177 X-6.25
N178 G0 Z0.6
N179 M9
N180 M62
N181 G28 G91 Z0.
N182 G90
N183 G28 G91 X0. Y0.
N184 G90
N185 M61
N186 M2
E`;

const QT10_HNC = `%
O1001
(Using G0 which travels along dogleg path.)
(T13 D=0.75 CR=0.03 - ZMIN=-0.6875 - face mill)
(T22 D=2. CR=0.015 - ZMIN=-0.0625 - face mill)
N1 G90 G17
N2 M59
N3 G28 G91 Z0.
N4 G90
(2D Contour Rough Pass)
N5 T13 M6
(3 FLUTE)
N6 T22
N7 S2546 M3
N8 G54
N9 M7
N10 G0 X4.4125 Y2.9
N11 G43 Z0.6 H13
N12 Z0.2
N13 G1 Z-0.1146 F50.
N14 G41 X4. Y2.5 D13 F38.2
N15 Y-2.5
N16 X-4.
N17 Y2.5
N18 X4.
N19 G40 X4.4 Y2.9125
N20 G0 Z0.2
N64 G40 X4.4 Y2.9125
N65 G0 Z0.6
N66 M9
N67 M62
N68 M5
N69 G28 G91 Z0.
N70 G90
(Face1)
N71 M1
N72 T22 M6
(9 FLUTE)
N73 T13
N74 S1200 M3
N75 G54
N76 M8
N77 G0 X5.1 Y-1.7318
N78 G43 Z0.6 H22
N79 Z0.2
N80 G1 Z-0.0625 F50.
N81 X5.0394 F60.
N133 X-5.
N134 G0 Z0.6
N135 M9
N136 M62
N137 G28 G91 Z0.
N138 G90
N139 G28 G91 X0. Y0.
N140 G90
N141 M61
N142 M2
E`;

const Q1_NC = `%
O01001 (Q1)
(Using G0 which travels along dogleg path.)
(T1 D=0.75 CR=0. - ZMIN=-0.25 - flat end mill)
N10 G90 G17
N15 G20
(MACRO CALL OUTS)
#1=5/2-1 (X LOCATION BEFORE RADIUS START)
#2=5/2 (HALF OF X LENGTH)
#3=-3/2 (HALF OF Y LENGTH)
#4=-5/2 (HALF OF X LENGTH)
#5=3/2-1 (Y HALF MINUS RADIUS)
#6=1 (RADIUS SIZE)
#7=-5/2 (HALF OF X LENGTH)
#8=3/2 (HALF OF Y LENGTH)
#9=-5/2-.4 (HALF OF X LENGTH PLUS CLEARANCE)
#10=3/2+.4125 (HALF OF Y PLUS CLEARANCE)
#11=1 (RADIUS SIZE)
#12=-5/2-.4125 (HALF OF X PLUS CLEARANCE)
#13=3/2+.4 (HALF OF Y PLUS CLEARANCE)
(2D Contour1)
N20 T1 M6
(.0056 ROC)
N25 S7926 M3
N30 G54
N35 M8
N40 G187 P3
N45 G0 X#9 Y#10
N50 G43 Z0.6 H1
N55 G0 Z0.2
N60 G1 Z-0.25 F50.
N65 G41 X#4 Y#8 D1 F41.
N70 X#1
N75 G2 X#2 Y#5 R#11
N80 G1 Y#3
N85 X#4
N90 Y#2
N95 G40 X#12 Y#13
N100 G0 Z0.6
N105 M5
N110 M9
N115 X0.
N120 M30
%`;

// ============================================================================
// TESTS — parseGoldenStandard
// ============================================================================

describe("QTValidationSuiteEngine", () => {
  describe("parseGoldenStandard", () => {
    it("extracts 2 tools from QT3 with correct diameters", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      expect(golden.tools).toHaveLength(2);

      const t13 = golden.tools.find(t => t.toolNumber === 13);
      expect(t13).toBeDefined();
      expect(t13!.diameter).toBe(0.75);
      expect(t13!.cornerRadius).toBe(0.03);
      expect(t13!.type).toBe("face_mill");
      expect(t13!.fluteCount).toBe(3);

      const t22 = golden.tools.find(t => t.toolNumber === 22);
      expect(t22).toBeDefined();
      expect(t22!.diameter).toBe(2.0);
      expect(t22!.cornerRadius).toBe(0.015);
      expect(t22!.type).toBe("face_mill");
      expect(t22!.fluteCount).toBe(9);
    });

    it("extracts contour_rough and face operations from QT3", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      expect(golden.operations.length).toBeGreaterThanOrEqual(2);

      const contour = golden.operations.find(o => o.type === "contour_rough");
      expect(contour).toBeDefined();
      expect(contour!.toolNumber).toBe(13);
      expect(contour!.spindleRpm).toBe(2546);

      const face = golden.operations.find(o => o.type === "face");
      expect(face).toBeDefined();
      expect(face!.toolNumber).toBe(22);
      expect(face!.spindleRpm).toBe(1200);
    });

    it("detects safety blocks and program structure in QT3", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      expect(golden.safetyBlockPresent).toBe(true);
      expect(golden.programEndPresent).toBe(true);
      expect(golden.hasToolLengthComp).toBe(true);
      expect(golden.hasCutterComp).toBe(true);
      expect(golden.workOffset).toBe("G54");
      expect(golden.machine).toBe("Hurco VMX30i");
    });

    it("extracts correct extents from QT3 (5.25 x 2.75 cavity + face area)", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      // QT3 contour goes X-5.65..6.35, Y-2.75..3.1625
      expect(golden.extents.xMin).toBeLessThanOrEqual(-5.25);
      expect(golden.extents.xMax).toBeGreaterThanOrEqual(5.25);
      expect(golden.extents.yMin).toBeLessThanOrEqual(-2.75);
      expect(golden.extents.yMax).toBeGreaterThanOrEqual(2.75);
      expect(golden.extents.zMin).toBeLessThanOrEqual(-0.0625);
    });

    it("QT10 has shallower Z depth than QT3", () => {
      const qt3 = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const qt10 = QTValidationSuiteEngine.parseGoldenStandard("QT10", QT10_HNC);
      // QT3: ZMIN=-1.1875, QT10: ZMIN=-0.6875
      expect(qt10.extents.zMin).toBeGreaterThan(qt3.extents.zMin);
    });

    it("QT10 has smaller XY footprint than QT3", () => {
      const qt3 = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const qt10 = QTValidationSuiteEngine.parseGoldenStandard("QT10", QT10_HNC);
      const qt3Width = qt3.extents.xMax - qt3.extents.xMin;
      const qt10Width = qt10.extents.xMax - qt10.extents.xMin;
      expect(qt10Width).toBeLessThan(qt3Width);
    });

    it("detects parametric macros in Q1", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("Q1", Q1_NC);
      expect(golden.hasParametricMacros).toBe(true);
      expect(golden.format).toBe("fanuc_parametric");
    });

    it("Q1 has 1 tool (T1 flat end mill 0.75 dia)", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("Q1", Q1_NC);
      expect(golden.tools).toHaveLength(1);
      expect(golden.tools[0].toolNumber).toBe(1);
      expect(golden.tools[0].diameter).toBe(0.75);
      expect(golden.tools[0].type).toBe("flat_end_mill");
    });

    it("Q1 spindle speed is 7926 RPM", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("Q1", Q1_NC);
      const contour = golden.operations.find(o => o.type !== "unknown");
      expect(contour).toBeDefined();
      expect(contour!.spindleRpm).toBe(7926);
    });

    it("QT3 and QT10 share the same 2-tool setup (T13 + T22)", () => {
      const qt3 = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const qt10 = QTValidationSuiteEngine.parseGoldenStandard("QT10", QT10_HNC);
      const qt3Nums = qt3.tools.map(t => t.toolNumber).sort();
      const qt10Nums = qt10.tools.map(t => t.toolNumber).sort();
      expect(qt3Nums).toEqual(qt10Nums);
    });
  });

  // ==========================================================================
  // TESTS — comparePrograms (self-comparison should score 1.0)
  // ==========================================================================

  describe("comparePrograms", () => {
    it("self-comparison of QT3 scores 1.0", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const result = QTValidationSuiteEngine.comparePrograms(golden, golden);
      expect(result.overallScore).toBe(1);
      expect(result.toolScore).toBe(1);
      expect(result.operationScore).toBe(1);
      expect(result.extentsScore).toBe(1);
      expect(result.safetyScore).toBe(1);
      expect(result.missingTools).toHaveLength(0);
      expect(result.extraTools).toHaveLength(0);
      expect(result.missingOperations).toHaveLength(0);
    });

    it("QT3 vs QT10 scores <1.0 due to different extents", () => {
      const qt3 = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const qt10 = QTValidationSuiteEngine.parseGoldenStandard("QT10", QT10_HNC);
      const result = QTValidationSuiteEngine.comparePrograms(qt3, qt10);
      expect(result.overallScore).toBeLessThan(1);
      expect(result.extentsScore).toBeLessThan(1);
      // Tools should still match since they use the same T13/T22 setup
      expect(result.toolScore).toBe(1);
    });

    it("missing tool penalizes score", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const candidate: GoldenStandard = {
        ...golden,
        tools: golden.tools.filter(t => t.toolNumber !== 22),
      };
      const result = QTValidationSuiteEngine.comparePrograms(golden, candidate);
      expect(result.toolScore).toBeLessThan(1);
      expect(result.missingTools).toContain(22);
    });

    it("extra tool generates warning but does not kill score", () => {
      const golden = QTValidationSuiteEngine.parseGoldenStandard("QT3", QT3_HNC);
      const candidate: GoldenStandard = {
        ...golden,
        tools: [
          ...golden.tools,
          {
            toolNumber: 99,
            diameter: 0.5,
            cornerRadius: 0,
            description: "extra drill",
            fluteCount: 2,
            type: "drill",
          },
        ],
      };
      const result = QTValidationSuiteEngine.comparePrograms(golden, candidate);
      expect(result.extraTools).toContain(99);
      expect(result.warnings.length).toBeGreaterThan(0);
      // Tool score should still be 1.0 since all golden tools are present
      expect(result.toolScore).toBe(1);
    });
  });

  // ==========================================================================
  // TESTS — buildSuite & runSuite
  // ==========================================================================

  describe("buildSuite", () => {
    it("populates golden standards for provided programs", () => {
      const contents = new Map<string, string>();
      contents.set("QT3", QT3_HNC);
      contents.set("QT10", QT10_HNC);
      contents.set("Q1", Q1_NC);

      const suite = QTValidationSuiteEngine.buildSuite(contents);
      const qt3 = suite.find(c => c.id === "QT3");
      expect(qt3?.golden).toBeDefined();
      expect(qt3!.golden!.tools).toHaveLength(2);

      const q1 = suite.find(c => c.id === "Q1");
      expect(q1?.golden).toBeDefined();
      expect(q1!.golden!.hasParametricMacros).toBe(true);

      // Cases without content should have null golden
      const qt5 = suite.find(c => c.id === "QT5");
      expect(qt5?.golden).toBeNull();
    });
  });

  describe("runSuite", () => {
    it("self-comparison suite scores average 1.0", () => {
      const contents = new Map<string, string>();
      contents.set("QT3", QT3_HNC);
      contents.set("QT10", QT10_HNC);

      const golden = QTValidationSuiteEngine.buildSuite(contents);
      const candidate = QTValidationSuiteEngine.buildSuite(contents);

      const result = QTValidationSuiteEngine.runSuite(golden, candidate);
      expect(result.casesWithGolden).toBe(2);
      expect(result.averageScore).toBe(1);
    });
  });

  // ==========================================================================
  // TESTS — getTestCases & getSummary
  // ==========================================================================

  describe("getTestCases", () => {
    it("returns 13 test cases (Q1-Q3 + QT3-QT12)", () => {
      const cases = QTValidationSuiteEngine.getTestCases();
      expect(cases).toHaveLength(13);
      expect(cases.map(c => c.id)).toContain("Q1");
      expect(cases.map(c => c.id)).toContain("QT3");
      expect(cases.map(c => c.id)).toContain("QT12");
    });

    it("all QT cases have .pdf assets", () => {
      const cases = QTValidationSuiteEngine.getTestCases();
      for (const c of cases) {
        expect(c.assets.pdf).toBeTruthy();
      }
    });

    it("QT3-QT12 all have .hnc programs", () => {
      const cases = QTValidationSuiteEngine.getTestCases();
      const qtCases = cases.filter(c => c.id.startsWith("QT"));
      for (const c of qtCases) {
        expect(c.assets.hnc).toBeTruthy();
      }
    });

    it("Q1-Q3 have .nc programs (not .hnc)", () => {
      const cases = QTValidationSuiteEngine.getTestCases();
      const qCases = cases.filter(c => /^Q\d$/.test(c.id));
      for (const c of qCases) {
        expect(c.assets.nc).toBeTruthy();
        expect(c.assets.hnc).toBeNull();
      }
    });
  });

  describe("getSummary", () => {
    it("reports correct asset counts", () => {
      const summary = QTValidationSuiteEngine.getSummary();
      expect(summary.totalCases).toBe(13);
      expect(summary.withPrograms).toBe(13); // all have .hnc or .nc
      expect(summary.withPrints).toBe(13);
      expect(summary.machineTarget).toBe("Hurco VMX30i");
    });
  });
});
