/**
 * Tests for BOX-MS3 — MaterialResolverForProgramsEngine (U-BOX27) + ToolResolverForProgramsEngine (U-BOX28)
 */
import { describe, it, expect } from "vitest";
import { MaterialResolverForProgramsEngine } from "../engines/MaterialResolverForProgramsEngine.js";
import { ToolResolverForProgramsEngine } from "../engines/ToolResolverForProgramsEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaVariable } from "../engines/OkumaOSPParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeProgram(overrides: Partial<OkumaProgram> = {}): OkumaProgram {
  return {
    filename: "TEST-PART.MIN",
    header: "(TEST PART - STEEL - 1030 - 200 BHN)",
    toolSections: [
      {
        label: "NAT01",
        toolCode: "T010101",
        toolNumber: 1,
        offsetNumber: 1,
        comment: "OD ROUGH - CNMG432 - R.015",
        startLine: 5,
        endLine: 15,
        operations: [{ type: "od_rough", line: 8, gcode: "G85", params: {} }],
        speedMode: "css",
        cssValue: 600,
        maxRPM: 2500,
        coolant: true,
      },
      {
        label: "NAT02",
        toolCode: "T020202",
        toolNumber: 2,
        offsetNumber: 2,
        comment: "OD FINISH - VNMG331 - R.008",
        startLine: 16,
        endLine: 25,
        operations: [{ type: "od_finish", line: 18, gcode: "G87", params: {} }],
        speedMode: "css",
        cssValue: 800,
        maxRPM: 3000,
        coolant: true,
      },
    ] as OkumaToolSection[],
    variables: [
      { name: "V1", value: 2.0, comment: "STOCK DIAMETER" },
      { name: "V5", value: 3.5, comment: "PART LENGTH" },
    ] as OkumaVariable[],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 30,
    operations: [],
    safety: { hasG50: true, hasM5: true, hasM30: true },
    rawLines: [
      "(TEST PART - STEEL - 1030 - 200 BHN)",
      "V1 = 2.0     ( STOCK DIAMETER )",
      "V5 = 3.5     ( PART LENGTH )",
      "T010101",
      "G50 S2500",
      "G96 S600 M3",
      "M8",
      "G0 X2.1 Z0.1",
      "G1 X1.875 F0.012",
      "G1 Z-3.5 F0.012",
      "G0 X20 Z20",
      "M1",
      "M9",
      "T020202",
      "G50 S3000",
      "G96 S800 M3",
      "M8",
      "G0 X1.875 Z0.05",
      "G1 Z-3.5 F0.006",
      "G0 X20 Z20",
      "M9",
      "M5",
      "M30",
    ],
    ...overrides,
  };
}

// ============================================================================
// MATERIAL RESOLVER TESTS
// ============================================================================

describe("MaterialResolverForProgramsEngine", () => {
  const engine = new MaterialResolverForProgramsEngine();

  describe("resolve() — comment parsing", () => {
    it("resolves material from explicit header comment", () => {
      const result = engine.resolve({ program: makeProgram() });
      expect(result.iso_group).toBe("P"); // Steel = ISO P
      expect(result.name).toContain("steel");
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.source).toContain("comment");
    });

    it("resolves aluminum from comment", () => {
      const prog = makeProgram({
        header: "(MATERIAL - 6061 ALUMINUM)",
        rawLines: ["(MATERIAL - 6061 ALUMINUM)", "T010101", "G96 S1000 M3"],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("N");
      expect(result.name).toContain("Aluminum");
    });

    it("resolves stainless from comment", () => {
      const prog = makeProgram({
        header: "(304 STAINLESS STEEL)",
        rawLines: ["(304 STAINLESS STEEL)", "T010101", "G96 S200 M3"],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("M");
    });

    it("resolves cast iron from comment", () => {
      const prog = makeProgram({
        header: "(GRAY IRON CASTING)",
        rawLines: ["(GRAY IRON CASTING)", "T010101", "G96 S400 M3"],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("K");
    });

    it("extracts hardness from BHN notation", () => {
      const result = engine.resolve({ program: makeProgram() });
      expect(result.hardness_hb).toBe(200);
    });

    it("extracts hardness from HRC notation", () => {
      const prog = makeProgram({
        header: "(HARDENED 4340 - 55 HRC)",
        rawLines: ["(HARDENED 4340 - 55 HRC)", "T010101", "G96 S100 M3"],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("H");
      expect(result.hardness_hb).toBeGreaterThan(400); // HRC 55 → HB ~550
    });
  });

  describe("resolve() — SFM inference", () => {
    it("infers aluminum from high SFM values", () => {
      const prog = makeProgram({
        header: null,
        rawLines: ["T010101", "G96 S1000 M3", "G1 X1.0 F0.010"],
        toolSections: [{
          label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
          comment: "", startLine: 1, endLine: 3,
          operations: [], speedMode: "css", cssValue: 1000, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("N");
      expect(result.source).toContain("sfm");
    });

    it("infers steel from moderate SFM values", () => {
      const prog = makeProgram({
        header: null,
        rawLines: ["T010101", "G96 S400 M3", "G1 X1.0 F0.012"],
        toolSections: [{
          label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
          comment: "", startLine: 1, endLine: 3,
          operations: [], speedMode: "css", cssValue: 400, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolve({ program: prog });
      // 400 SFM could be low-carbon steel or cast iron
      expect(["P", "K"]).toContain(result.iso_group);
    });
  });

  describe("resolve() — defaults", () => {
    it("defaults to P (steel) when no clues found", () => {
      const prog = makeProgram({
        header: null,
        rawLines: ["T010101", "G97 S1500 M3", "G1 X1.0 F0.012"],
        toolSections: [{
          label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
          comment: "", startLine: 1, endLine: 3,
          operations: [], speedMode: "rpm", rpmValue: 1500, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolve({ program: prog });
      expect(result.iso_group).toBe("P");
      expect(result.confidence).toBeLessThan(0.5); // Low confidence
    });
  });

  describe("resolve() — Kienzle constants", () => {
    it("provides valid Kienzle kc1.1 for resolved material", () => {
      const result = engine.resolve({ program: makeProgram() });
      expect(result.kc1_1).toBe(1800); // P group canonical
      expect(result.mc).toBe(0.25);
    });

    it("provides valid Taylor constants", () => {
      const result = engine.resolve({ program: makeProgram() });
      expect(result.taylor_C).toBe(350);
      expect(result.taylor_n).toBe(0.25);
    });
  });

  describe("resolve() — customer folder", () => {
    it("resolves from customer name containing material keyword", () => {
      const prog = makeProgram({
        header: null,
        rawLines: ["T010101", "G97 S1500 M3"],
        toolSections: [{
          label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
          comment: "", startLine: 1, endLine: 2,
          operations: [], speedMode: "rpm", rpmValue: 1500, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolve({
        program: prog,
        customer_name: "ACME BRASS FITTINGS",
      });
      expect(result.iso_group).toBe("N"); // Brass = non-ferrous
    });
  });
});

// ============================================================================
// TOOL RESOLVER TESTS
// ============================================================================

describe("ToolResolverForProgramsEngine", () => {
  const engine = new ToolResolverForProgramsEngine();

  describe("resolveAll() — comment parsing", () => {
    it("resolves tool type and nose radius from comment", () => {
      const result = engine.resolveAll({ program: makeProgram() });
      expect(result.tools).toHaveLength(2);

      const t1 = result.tools[0];
      expect(t1.station).toBe(1);
      expect(t1.tool_type).toBe("od_roughing");
      expect(t1.nose_radius_mm).toBeCloseTo(0.381, 2); // 0.015" = 0.381mm
      expect(t1.confidence).toBeGreaterThanOrEqual(0.6);

      const t2 = result.tools[1];
      expect(t2.station).toBe(2);
      expect(t2.tool_type).toBe("od_finishing");
    });

    it("parses ISO insert code from comment", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
          comment: "CNMG120408 OD ROUGH",
          startLine: 1, endLine: 10,
          operations: [{ type: "od_rough", line: 3, gcode: "G85", params: {} }],
          speedMode: "css", cssValue: 600, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].insert_shape).toBe("C");
      expect(result.tools[0].nose_radius_mm).toBeCloseTo(0.8, 1); // 08 code = 0.8mm
    });
  });

  describe("resolveAll() — operation inference", () => {
    it("infers tool type from operation type", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T070707", toolNumber: 7, offsetNumber: 7,
          comment: "",
          startLine: 1, endLine: 10,
          operations: [{ type: "bore", line: 3, gcode: "G85", params: {} }],
          speedMode: "css", cssValue: 400, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].tool_type).toBe("boring_bar");
    });

    it("infers drill from peck_drill operation", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T050505", toolNumber: 5, offsetNumber: 5,
          comment: "1/2 DRILL",
          startLine: 1, endLine: 10,
          operations: [{ type: "peck_drill", line: 3, gcode: "G74", params: {} }],
          speedMode: "css", cssValue: 300, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].tool_type).toBe("peck_drill");
      expect(result.tools[0].diameter_mm).toBeCloseTo(12.7, 0); // 1/2" = 12.7mm
    });
  });

  describe("resolveAll() — station conventions", () => {
    it("uses station conventions when no other info", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T110000", toolNumber: 11, offsetNumber: 0,
          comment: "",
          startLine: 1, endLine: 10,
          operations: [],
          speedMode: "css", cssValue: 200, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].tool_type).toBe("groove");
    });
  });

  describe("resolveAll() — keyword matching", () => {
    it("detects cutoff from comment keyword", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T120000", toolNumber: 12, offsetNumber: 0,
          comment: "CUT OFF",
          startLine: 1, endLine: 5,
          operations: [],
          speedMode: "css", cssValue: 200, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].tool_type).toBe("cutoff");
    });

    it("detects threading from comment keyword", () => {
      const prog = makeProgram({
        toolSections: [{
          label: "NAT01", toolCode: "T090909", toolNumber: 9, offsetNumber: 9,
          comment: "THREAD 1/2-13 UNC",
          startLine: 1, endLine: 5,
          operations: [],
          speedMode: "css", cssValue: 200, coolant: true,
        }] as OkumaToolSection[],
      });
      const result = engine.resolveAll({ program: prog });
      expect(result.tools[0].tool_type).toBe("thread_external");
    });
  });

  describe("resolveSingle()", () => {
    it("resolves a single tool by station", () => {
      const result = engine.resolveSingle(makeProgram(), 2);
      expect(result).not.toBeNull();
      expect(result!.station).toBe(2);
      expect(result!.tool_type).toBe("od_finishing");
    });

    it("returns null for non-existent station", () => {
      const result = engine.resolveSingle(makeProgram(), 99);
      expect(result).toBeNull();
    });
  });

  describe("resolveAll() — summary", () => {
    it("produces correct summary counts", () => {
      const result = engine.resolveAll({ program: makeProgram() });
      expect(result.summary.total_tools).toBe(2);
      expect(result.summary.high_confidence).toBeGreaterThanOrEqual(1);
      expect(result.summary.unresolved).toBe(0);
    });
  });
});
