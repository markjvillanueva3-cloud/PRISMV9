/**
 * extract-lathe-program-ground-truth.test.mjs — vitest suite
 * Locks pure-function contract for the JM Die Mastercam .MIN ground-truth extractor.
 * @unit U-MIKE-LATHE-GROUND-TRUTH-EXTRACT
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  parseONumber,
  parseSpindleMaxCap,
  parseBarStockEnvelope,
  parseExplicitToolListBlock,
  parseTCallsInBody,
  parseOperationLabels,
  detectFeedMode,
  detectWorkPlanes,
  detectSpindleRange,
  detectLiveToolAndCAxis,
  detectCannedCycles,
  extractProgramGroundTruth,
  buildGroundTruth,
} from "./extract-lathe-program-ground-truth.mjs";

// Sample synthetic snippets mirroring the 4 real JM Die programs.
const SAMPLE_CSM_HEADER = `M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
G90 G80
G50 S2500

O1001
(T010101 NR=0.0156 - ZMIN=0.01 - GENERAL TURNING)
(T020202 NR=0.0156 - ZMIN=-1.6556 - GENERAL TURNING)
(T030303 D=1. CR=0. TAPER=90DEG - ZMIN=-0.04 - SPOT DRILL)
(T050505 D=0.57 CR=0. TAPER=130DEG - ZMIN=-1.7779 - DRILL)
(T070707 NR=0.0312 - ZMIN=-1.4513 - BORING TURNING)
(T080808 NR=0.0156 - ZMIN=-1.42 - BORING TURNING)
G90 G80
G50 S2500

(FACE2)
G0 X800. Z400.
G95 G18
N1 T010101
M8
G97 S1163 M3
G96 S755 M3
M9
M1

(FACE5)
N2 T020202
G96 S825 M3
M9

(DRILL1)
N72 M1
N73 T030303
G94 G18
G83 X0. Z-1.5 Q0.2 F0.005
N100 T070707
M1
`;

const SAMPLE_OPTIMAS_HEADER = `NSTRT
/CALL OBAR
M1
NAT01                 (TOOL HOLDER WITH .015R)
G0 X20 Z20
T010101
G50 S2500
G96 S400 M3
G85 NTURN D.06 U.007 W.007 F.012
G80
M1
NAT02 (OD AND FACE FIN. TURN .007R)
T020202
G87 NTURN
M1
NAT04 ( 3/8 FLAT ENDMILL)
T0404
M110
G138
G94 SB=3210 M13
G0 C90.
M147
`;

const SAMPLE_AFI_HEADER = `M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
N10 G50 S1500
N11 G0 X400.
N12 G0 Z400.

(FACE1)
N13 T010101
N14 G90 G95 G18
N15 M8
N16 G97 S894 M3 M42
N17 G0 X3.225 Z0.2569
`;

describe("parseONumber", () => {
  it("extracts O-number when present", () => {
    expect(parseONumber(SAMPLE_CSM_HEADER)).toBe("O1001");
  });
  it("returns null when no O-number", () => {
    expect(parseONumber("M1\nG50 S1500\n")).toBeNull();
  });
});

describe("parseSpindleMaxCap", () => {
  it("CSM clamps spindle at 2500 rpm via G50 S2500", () => {
    expect(parseSpindleMaxCap(SAMPLE_CSM_HEADER)).toBe(2500);
  });
  it("AFI clamps spindle at 1500 rpm", () => {
    expect(parseSpindleMaxCap(SAMPLE_AFI_HEADER)).toBe(1500);
  });
  it("returns null when no G50 present", () => {
    expect(parseSpindleMaxCap("M1\nM3\n")).toBeNull();
  });
});

describe("parseBarStockEnvelope", () => {
  it("parses Mastercam PS LC bar definition", () => {
    const env = parseBarStockEnvelope(SAMPLE_CSM_HEADER);
    expect(env).toEqual({ z_min: -400, x_min: 0, z_max: 400, x_max: 19 });
  });
  it("returns null when no bar definition present (OPTIMAS)", () => {
    expect(parseBarStockEnvelope(SAMPLE_OPTIMAS_HEADER)).toBeNull();
  });
});

describe("parseExplicitToolListBlock", () => {
  it("extracts CSM's 6-tool list with NR / D / TAPER / ZMIN parsed", () => {
    const tools = parseExplicitToolListBlock(SAMPLE_CSM_HEADER);
    expect(tools.length).toBe(6);
    expect(tools[0]).toMatchObject({
      code: "T010101",
      nose_radius_in: 0.0156,
      z_min: 0.01,
      description: "GENERAL TURNING",
    });
    expect(tools[2]).toMatchObject({
      code: "T030303",
      diameter_in: 1.0,
      taper_deg: 90,
      description: "SPOT DRILL",
    });
  });
  it("skips comment lines that are op labels not tool blocks", () => {
    expect(parseExplicitToolListBlock("(FACE2)\n(DRILL1)\n")).toEqual([]);
  });
});

describe("parseTCallsInBody", () => {
  it("captures all unique T codes from CSM body in order", () => {
    const codes = parseTCallsInBody(SAMPLE_CSM_HEADER);
    expect(codes).toContain("T010101");
    expect(codes).toContain("T020202");
    expect(codes).toContain("T030303");
  });
  it("captures OPTIMAS NAT01/NAT02/NAT04 named tool codes", () => {
    const codes = parseTCallsInBody(SAMPLE_OPTIMAS_HEADER);
    expect(codes).toContain("NAT01");
    expect(codes).toContain("NAT02");
    expect(codes).toContain("NAT04");
  });
  it("does not duplicate repeated calls", () => {
    const codes = parseTCallsInBody("T010101\nT010101\nT020202\n");
    expect(codes).toEqual(["T010101", "T020202"]);
  });
});

describe("parseOperationLabels", () => {
  it("extracts (FACE2), (DRILL1) etc — short uppercase labels", () => {
    const ops = parseOperationLabels(SAMPLE_CSM_HEADER);
    expect(ops).toContain("FACE2");
    expect(ops).toContain("DRILL1");
  });
  it("does NOT include tool-list comment lines (they contain =)", () => {
    const ops = parseOperationLabels("(T010101 NR=0.0156 - GENERAL TURNING)\n(FACE2)\n");
    expect(ops).toEqual(["FACE2"]);
  });
});

describe("detectFeedMode", () => {
  it("CSM mixes G94 + G95 → mixed turning + drilling", () => {
    expect(detectFeedMode(SAMPLE_CSM_HEADER)).toBe("G95+G94 (mixed turning + drilling)");
  });
  it("AFI uses G95 only (turning)", () => {
    expect(detectFeedMode(SAMPLE_AFI_HEADER)).toBe("G95");
  });
  it("OPTIMAS uses G94 (live-tool side)", () => {
    expect(detectFeedMode(SAMPLE_OPTIMAS_HEADER)).toBe("G94");
  });
});

describe("detectWorkPlanes", () => {
  it("CSM uses G18 XZ turning plane", () => {
    expect(detectWorkPlanes(SAMPLE_CSM_HEADER)).toContain("G18_XZ_turning");
  });
});

describe("detectSpindleRange", () => {
  it("AFI uses M42 high spindle range", () => {
    expect(detectSpindleRange(SAMPLE_AFI_HEADER)).toContain("M42_high_range");
  });
  it("CSM has no M41/M42 (single-range spindle)", () => {
    expect(detectSpindleRange(SAMPLE_CSM_HEADER)).toEqual([]);
  });
});

describe("detectLiveToolAndCAxis", () => {
  it("OPTIMAS has live tool (M13, M110, M147) + C-axis index (G0 C90.) + G138 polar", () => {
    const flags = detectLiveToolAndCAxis(SAMPLE_OPTIMAS_HEADER);
    expect(flags.live_tool_used).toBe(true);
    expect(flags.has_c_axis_index).toBe(true);
  });
  it("CSM has neither (pure turning)", () => {
    const flags = detectLiveToolAndCAxis(SAMPLE_CSM_HEADER);
    expect(flags.live_tool_used).toBe(false);
    expect(flags.has_c_axis_index).toBe(false);
  });
});

describe("detectCannedCycles", () => {
  it("CSM uses G83 peck-drill", () => {
    const cycles = detectCannedCycles(SAMPLE_CSM_HEADER);
    expect(cycles.some((c) => c.startsWith("G83_"))).toBe(true);
  });
  it("OPTIMAS uses G85+G87 Okuma NTURN cycles", () => {
    const cycles = detectCannedCycles(SAMPLE_OPTIMAS_HEADER);
    expect(cycles.some((c) => c.startsWith("G85_"))).toBe(true);
    expect(cycles.some((c) => c.startsWith("G87_"))).toBe(true);
  });
});

describe("extractProgramGroundTruth", () => {
  it("returns file_not_found error envelope on missing file", () => {
    const r = extractProgramGroundTruth({
      customer: "TEST", part_folder: "X",
      path: "H:/this/does/not/exist/file.MIN",
    });
    expect(r._error).toBe("file_not_found");
  });
});

describe("buildGroundTruth — synthetic 4-program rollup", () => {
  it("emits the full report for the 4 real JM Die originals", () => {
    const report = buildGroundTruth();
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.advisoryOnly).toBe(true);
    expect(report.must_human_verify).toBe(true);
    expect(report.programs).toHaveLength(4);
    // Each customer should be exactly one entry
    const customers = report.programs.map((p) => p.customer);
    expect(customers).toContain("ADDISON FASTENERS");
    expect(customers).toContain("AFI INDUSTRIES INC");
    expect(customers).toContain("CSM");
    expect(customers).toContain("OPTIMAS");
  });

  it("OPTIMAS is the only program with live tooling + C-axis index", () => {
    const report = buildGroundTruth();
    const optimas = report.programs.find((p) => p.customer === "OPTIMAS");
    expect(optimas?.live_tool_used).toBe(true);
    expect(optimas?.has_c_axis_index).toBe(true);
  });

  it("CSM populates the explicit tool-list comment block (6 tools)", () => {
    const report = buildGroundTruth();
    const csm = report.programs.find((p) => p.customer === "CSM");
    expect(csm?.tool_list_explicit.length).toBeGreaterThanOrEqual(6);
  });

  it("ADDISON + AFI + CSM all use Mastercam bar stock envelope; OPTIMAS does not", () => {
    const report = buildGroundTruth();
    const byCustomer = Object.fromEntries(report.programs.map((p) => [p.customer, p]));
    expect(byCustomer["ADDISON FASTENERS"].bar_stock_envelope).not.toBeNull();
    expect(byCustomer["AFI INDUSTRIES INC"].bar_stock_envelope).not.toBeNull();
    expect(byCustomer["CSM"].bar_stock_envelope).not.toBeNull();
    expect(byCustomer["OPTIMAS"].bar_stock_envelope).toBeNull();
  });

  it("summary counts match per-program rollup", () => {
    const report = buildGroundTruth();
    const tool_sum = report.programs.reduce((s, p) => s + (p.tool_count ?? 0), 0);
    expect(report.summary.total_tools_invoked).toBe(tool_sum);
  });
});
