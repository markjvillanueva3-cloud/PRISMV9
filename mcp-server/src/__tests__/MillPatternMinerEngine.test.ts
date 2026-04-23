/**
 * MillPatternMinerEngine tests — P4-U14-PATMINE
 *
 * Covers:
 *   - mineHaas / mineHurco / mineRokuRoku public surfaces
 *   - mineAll merging + dedup of canned cycles + coolant
 *   - Chip load extraction per controller (Hurco: feed/(rpm*flutes), Roku: feed/rpm)
 *   - Canned cycle frequency counting + param averaging
 *   - HSM profile extraction (G187 Haas, AICC/HPCC/SSS Roku-Roku)
 *   - Coolant code detection from rawLines (multi-code lines)
 *   - Plunge + pocket strategy extraction from op.type
 *   - Top-20 pattern sorting + cap
 *   - getEngagementPatterns aggregation
 *   - Adversarial inputs (zero rpm, negative feed, empty rawLines, unknown g_codes)
 *   - Dispatcher wiring round-trip via millActionSchemas.safeParse
 */

import { describe, expect, it } from "vitest";
import type {
  HaasProgram,
  HaasToolSection,
  HaasOperation,
} from "../engines/HaasParserEngine.js";
import type {
  HurcoProgram,
  HurcoToolSection,
  HurcoOperation,
} from "../engines/HurcoParserEngine.js";
import type {
  RokuRokuProgram,
  RokuRokuToolSection,
  RokuRokuOperation,
} from "../engines/RokuRokuParserEngine.js";
import { millPatternMinerEngine } from "../engines/MillPatternMinerEngine.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const MAX_TOP_PATTERNS = 20;
const CANONICAL_SUBSET_COUNT = 3;

// ---------------------------------------------------------------------------
// Builders for minimal valid parser outputs
// ---------------------------------------------------------------------------

function makeHaas(overrides: Partial<HaasProgram> = {}): HaasProgram {
  return {
    filename: "haas.nc",
    o_number: null,
    program_comment: null,
    toolSections: [],
    macroVariables: [],
    subCalls: [],
    operations: [],
    safety: {
      has_safe_start: false,
      has_tool_length_comp: false,
      has_program_end: false,
      has_spindle_stop: false,
      has_coolant_off: false,
      g28_home: false,
      g53_machine_coord: false,
      safe_z_clearance: null,
      warnings: [],
    },
    lineCount: 0,
    hasProbing: false,
    hasMacros: false,
    hasCutterComp: false,
    hasG187Smoothing: false,
    rawLines: [],
    ...overrides,
  };
}

function makeHaasSection(overrides: Partial<HaasToolSection> = {}): HaasToolSection {
  return {
    tool_number: 1,
    tool_comment: null,
    offset_number: 1,
    start_line: 0,
    end_line: 10,
    has_tlc: false,
    has_cutter_comp: false,
    spindle_rpm: null,
    css_mode: false,
    coolant: null,
    operations: [],
    ...overrides,
  };
}

function makeHaasOp(overrides: Partial<HaasOperation> = {}): HaasOperation {
  return {
    type: "rapid",
    g_code: "G00",
    line_number: 1,
    params: {},
    ...overrides,
  };
}

function makeHurco(overrides: Partial<HurcoProgram> = {}): HurcoProgram {
  return {
    filename: "hurco.prg",
    program_name: null,
    mode: "gcode",
    part_setup: null,
    toolSections: [],
    operations: [],
    safety: {
      has_safe_start: false,
      has_tool_length_comp: false,
      has_program_end: false,
      has_coolant_control: false,
      has_spindle_stop: false,
      warnings: [],
    },
    lineCount: 0,
    hasConversational: false,
    hasGCode: false,
    hasProbing: false,
    hasRotaryAxis: false,
    rawLines: [],
    ...overrides,
  };
}

function makeHurcoSection(overrides: Partial<HurcoToolSection> = {}): HurcoToolSection {
  return {
    tool_number: 1,
    tool_description: null,
    diameter: null,
    flute_count: null,
    start_line: 0,
    end_line: 10,
    spindle_rpm: null,
    feed_rate: null,
    operations: [],
    ...overrides,
  };
}

function makeHurcoOp(overrides: Partial<HurcoOperation> = {}): HurcoOperation {
  return {
    type: "rapid",
    mode: "gcode",
    g_code: "G00",
    line_number: 1,
    params: {},
    ...overrides,
  };
}

function makeRoku(overrides: Partial<RokuRokuProgram> = {}): RokuRokuProgram {
  return {
    filename: "roku.nc",
    program_number: null,
    program_comment: null,
    toolSections: [],
    operations: [],
    highSpeedSettings: {
      aicc_enabled: false,
      aicc_tolerance: null,
      hpcc_enabled: false,
      sss_enabled: false,
      g08_enabled: false,
      smooth_mode: null,
      nano_smoothing: false,
    },
    safety: {
      has_safe_start: false,
      has_tool_length_comp: false,
      has_program_end: false,
      has_spindle_stop: false,
      has_coolant_off: false,
      has_tool_break_check: false,
      warnings: [],
    },
    lineCount: 0,
    hasHPCC: false,
    hasAICC: false,
    hasSSS: false,
    hasNanoSmoothing: false,
    hasTCPC: false,
    hasToolBreakDetect: false,
    hasMirrorImage: false,
    maxRPM: 0,
    minToolDia: null,
    rawLines: [],
    ...overrides,
  };
}

function makeRokuSection(overrides: Partial<RokuRokuToolSection> = {}): RokuRokuToolSection {
  return {
    tool_number: 1,
    tool_comment: null,
    diameter_mm: null,
    start_line: 0,
    end_line: 10,
    spindle_rpm: 0,
    feed_rate: null,
    high_speed_mode: null,
    operations: [],
    ...overrides,
  };
}

function makeRokuOp(overrides: Partial<RokuRokuOperation> = {}): RokuRokuOperation {
  return {
    type: "rapid",
    g_code: "G00",
    line_number: 1,
    params: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mineHaas
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.mineHaas", () => {
  it("returns zero totals for empty program list", () => {
    const mineResult = millPatternMinerEngine.mineHaas([]);
    expect(mineResult.total_programs).toBe(0);
    expect(mineResult.total_tools).toBe(0);
    expect(mineResult.total_operations).toBe(0);
    expect(mineResult.chip_load_samples).toEqual([]);
    expect(mineResult.canned_cycles).toEqual([]);
    expect(mineResult.coolant_patterns).toEqual([]);
    expect(mineResult.hsm_profiles).toEqual([]);
    expect(mineResult.top_patterns).toEqual([]);
  });

  it("counts programs, tools, and operations correctly", () => {
    const section = makeHaasSection({
      operations: [makeHaasOp(), makeHaasOp(), makeHaasOp()],
    });
    const parsed = makeHaas({ toolSections: [section, makeHaasSection()] });
    const mineResult = millPatternMinerEngine.mineHaas([
      { filename: "a.nc", parsed },
      { filename: "b.nc", parsed: makeHaas() },
    ]);
    expect(mineResult.total_programs).toBe(2);
    expect(mineResult.total_tools).toBe(2);
    expect(mineResult.total_operations).toBe(3);
  });

  it("extracts chip load samples only when rpm > 0 and feed > 0", () => {
    const section = makeHaasSection({
      tool_number: 5,
      tool_comment: "1/2 END MILL",
      spindle_rpm: 5000,
      operations: [
        makeHaasOp({ params: { F: 500 } }),
        makeHaasOp({ params: { F: 600 } }),
        makeHaasOp({ params: {} }),
        makeHaasOp({ params: { F: 0 } }),
      ],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(2);
    expect(mineResult.chip_load_samples[0].rpm).toBe(5000);
    expect(mineResult.chip_load_samples[0].feed_rate).toBe(500);
    expect(mineResult.chip_load_samples[0].chip_load).toBeNull();
    expect(mineResult.chip_load_samples[0].tool_number).toBe(5);
    expect(mineResult.chip_load_samples[0].tool_desc).toBe("1/2 END MILL");
    expect(mineResult.chip_load_samples[1].feed_rate).toBe(600);
  });

  it("skips chip load extraction when section rpm is zero or null", () => {
    const section = makeHaasSection({
      spindle_rpm: 0,
      operations: [makeHaasOp({ params: { F: 500 } })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(0);
  });

  it("aggregates canned cycle frequency and averages parameters", () => {
    const section = makeHaasSection({
      operations: [
        makeHaasOp({ g_code: "G81", params: { Z: -5, R: 2 } }),
        makeHaasOp({ g_code: "G81", params: { Z: -7, R: 2 } }),
        makeHaasOp({ g_code: "G83", params: { Z: -10, Q: 1 } }),
      ],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    const g81 = mineResult.canned_cycles.find(c => c.g_code === "G81");
    const g83 = mineResult.canned_cycles.find(c => c.g_code === "G83");
    expect(g81?.frequency).toBe(2);
    expect(g81?.description).toBe("spot drill / center drill");
    expect(g81?.avg_params.Z).toBeCloseTo(-6, 5);
    expect(g81?.avg_params.R).toBeCloseTo(2, 5);
    expect(g83?.frequency).toBe(1);
    expect(g83?.description).toBe("deep hole peck drill");
  });

  it("ignores operations with non-canned g_codes", () => {
    const section = makeHaasSection({
      operations: [
        makeHaasOp({ g_code: "G00" }),
        makeHaasOp({ g_code: "G01" }),
        makeHaasOp({ g_code: "ZZZ" }),
      ],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.canned_cycles).toHaveLength(0);
  });

  it("emits a G187 HSM profile with max_rpm across tool sections", () => {
    const parsed = makeHaas({
      hasG187Smoothing: true,
      toolSections: [
        makeHaasSection({ spindle_rpm: 8000 }),
        makeHaasSection({ spindle_rpm: 12000 }),
        makeHaasSection({ spindle_rpm: null }),
      ],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.hsm_profiles).toHaveLength(1);
    expect(mineResult.hsm_profiles[0].controller).toBe("haas");
    expect(mineResult.hsm_profiles[0].smoothing_mode).toBe("G187");
    expect(mineResult.hsm_profiles[0].max_rpm).toBe(12000);
    expect(mineResult.hsm_profiles[0].aicc_enabled).toBe(false);
  });

  it("omits HSM profile when G187 smoothing flag is off", () => {
    const parsed = makeHaas({ hasG187Smoothing: false });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.hsm_profiles).toHaveLength(0);
  });

  it("counts coolant codes per matching rawLine", () => {
    const parsed = makeHaas({
      rawLines: ["M08", "M08", "M09", "M07 M08", "T1 M06"],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    const m08 = mineResult.coolant_patterns.find(c => c.code === "M08");
    const m07 = mineResult.coolant_patterns.find(c => c.code === "M07");
    const m09 = mineResult.coolant_patterns.find(c => c.code === "M09");
    expect(m08?.frequency).toBe(3);
    expect(m08?.type).toBe("flood");
    expect(m07?.frequency).toBe(1);
    expect(m07?.type).toBe("mist");
    expect(m09?.frequency).toBe(1);
    expect(m09?.type).toBe("off");
  });

  it("extracts plunge strategies from operation types", () => {
    const parsed = makeHaas({
      operations: [
        makeHaasOp({ type: "drill" }),
        makeHaasOp({ type: "drill" }),
        makeHaasOp({ type: "helix" }),
        makeHaasOp({ type: "ramp_entry" }),
        makeHaasOp({ type: "boring" }),
        makeHaasOp({ type: "face_mill" }),
      ],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    const direct = mineResult.plunge_strategies.find(p => p.type === "direct");
    const helix = mineResult.plunge_strategies.find(p => p.type === "helix");
    const ramp = mineResult.plunge_strategies.find(p => p.type === "ramp");
    const bore = mineResult.plunge_strategies.find(p => p.type === "bore");
    expect(direct?.frequency).toBe(2);
    expect(helix?.frequency).toBe(1);
    expect(ramp?.frequency).toBe(1);
    expect(bore?.frequency).toBe(1);
  });

  it("extracts pocket strategies and tracks unique filenames", () => {
    const ops = [
      makeHaasOp({ type: "pocket", g_code: "G01" }),
      makeHaasOp({ type: "trochoidal", g_code: "G02" }),
      makeHaasOp({ type: "adaptive_clearing", g_code: "G01" }),
      makeHaasOp({ type: "peel_mill", g_code: "G01" }),
    ];
    const mineResult = millPatternMinerEngine.mineHaas([
      { filename: "a.nc", parsed: makeHaas({ operations: ops }) },
      { filename: "b.nc", parsed: makeHaas({ operations: ops }) },
    ]);
    const standard = mineResult.pocket_strategies.find(p => p.type === "standard");
    const troch = mineResult.pocket_strategies.find(p => p.type === "trochoidal");
    const adaptive = mineResult.pocket_strategies.find(p => p.type === "adaptive");
    const peel = mineResult.pocket_strategies.find(p => p.type === "peel_mill");
    expect(standard?.frequency).toBe(2);
    expect(standard?.programs).toEqual(["a.nc", "b.nc"]);
    expect(troch?.frequency).toBe(2);
    expect(adaptive?.frequency).toBe(2);
    expect(peel?.frequency).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// mineHurco
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.mineHurco", () => {
  it("returns zero totals for empty program list", () => {
    const mineResult = millPatternMinerEngine.mineHurco([]);
    expect(mineResult.total_programs).toBe(0);
    expect(mineResult.chip_load_samples).toEqual([]);
  });

  it("computes chip load from feed_rate / (rpm * flute_count)", () => {
    const section = makeHurcoSection({
      tool_number: 3,
      tool_description: "1/4 END MILL",
      diameter: 6.35,
      flute_count: 4,
      spindle_rpm: 5000,
      feed_rate: 500,
      operations: [makeHurcoOp({ type: "rough_mill" })],
    });
    const parsed = makeHurco({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHurco([{ filename: "h.prg", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(1);
    const sample = mineResult.chip_load_samples[0];
    expect(sample.chip_load).toBeCloseTo(500 / (5000 * 4), 8);
    expect(sample.diameter_mm).toBe(6.35);
    expect(sample.flute_count).toBe(4);
    expect(sample.operation).toBe("rough_mill");
    expect(sample.tool_desc).toBe("1/4 END MILL");
  });

  it("returns null chip_load when flute_count is missing", () => {
    const section = makeHurcoSection({
      diameter: 10,
      flute_count: null,
      spindle_rpm: 4000,
      feed_rate: 400,
      operations: [makeHurcoOp()],
    });
    const parsed = makeHurco({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHurco([{ filename: "h.prg", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(1);
    expect(mineResult.chip_load_samples[0].chip_load).toBeNull();
    expect(mineResult.chip_load_samples[0].feed_rate).toBe(400);
  });

  it("skips chip load when feed_rate is zero or null", () => {
    const parsed = makeHurco({
      toolSections: [
        makeHurcoSection({ spindle_rpm: 5000, feed_rate: 0 }),
        makeHurcoSection({ spindle_rpm: 5000, feed_rate: null }),
      ],
    });
    const mineResult = millPatternMinerEngine.mineHurco([{ filename: "h.prg", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(0);
  });

  it("extracts canned cycles from tool section operations", () => {
    const section = makeHurcoSection({
      operations: [
        makeHurcoOp({ g_code: "G84", params: { Z: -10 } }),
        makeHurcoOp({ g_code: "G84", params: { Z: -12 } }),
        makeHurcoOp({ g_code: null }),
        makeHurcoOp({ g_code: "G00" }),
      ],
    });
    const parsed = makeHurco({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHurco([{ filename: "h.prg", parsed }]);
    const g84 = mineResult.canned_cycles.find(c => c.g_code === "G84");
    expect(g84?.frequency).toBe(2);
    expect(g84?.avg_params.Z).toBeCloseTo(-11, 5);
    expect(g84?.description).toBe("tapping");
  });

  it("detects coolant codes from rawLines", () => {
    const parsed = makeHurco({ rawLines: ["M08", "M88", "M08"] });
    const mineResult = millPatternMinerEngine.mineHurco([{ filename: "h.prg", parsed }]);
    const m08 = mineResult.coolant_patterns.find(c => c.code === "M08");
    const m88 = mineResult.coolant_patterns.find(c => c.code === "M88");
    expect(m08?.frequency).toBe(2);
    expect(m88?.type).toBe("through_tool");
    expect(m88?.frequency).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// mineRokuRoku
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.mineRokuRoku", () => {
  it("returns zero totals for empty program list", () => {
    const mineResult = millPatternMinerEngine.mineRokuRoku([]);
    expect(mineResult.total_programs).toBe(0);
    expect(mineResult.hsm_profiles).toEqual([]);
  });

  it("computes chip load as feed_rate / spindle_rpm when diameter present", () => {
    const section = makeRokuSection({
      spindle_rpm: 20000,
      feed_rate: 800,
      diameter_mm: 1.0,
      operations: [makeRokuOp({ type: "micro_finish" })],
    });
    const parsed = makeRoku({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(1);
    expect(mineResult.chip_load_samples[0].chip_load).toBeCloseTo(800 / 20000, 8);
    expect(mineResult.chip_load_samples[0].operation).toBe("micro_finish");
    expect(mineResult.chip_load_samples[0].feed_rate).toBe(800);
  });

  it("returns null chip_load when diameter_mm is missing", () => {
    const section = makeRokuSection({
      spindle_rpm: 20000,
      feed_rate: 800,
      diameter_mm: null,
    });
    const parsed = makeRoku({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.chip_load_samples[0].chip_load).toBeNull();
  });

  it("emits HPCC HSM profile with G05_P10000 label", () => {
    const parsed = makeRoku({
      hasHPCC: true,
      maxRPM: 30000,
      minToolDia: 0.5,
    });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.hsm_profiles).toHaveLength(1);
    expect(mineResult.hsm_profiles[0].smoothing_mode).toBe("G05_P10000");
    expect(mineResult.hsm_profiles[0].hpcc_enabled).toBe(true);
    expect(mineResult.hsm_profiles[0].max_rpm).toBe(30000);
    expect(mineResult.hsm_profiles[0].min_tool_dia_mm).toBe(0.5);
  });

  it("emits AICC HSM profile when only AICC is set", () => {
    const parsed = makeRoku({ hasAICC: true, maxRPM: 40000 });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.hsm_profiles[0].smoothing_mode).toBe("G05.1_Q1");
    expect(mineResult.hsm_profiles[0].aicc_enabled).toBe(true);
    expect(mineResult.hsm_profiles[0].hpcc_enabled).toBe(false);
  });

  it("emits SSS HSM profile when only SSS is set", () => {
    const parsed = makeRoku({ hasSSS: true, maxRPM: 50000 });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.hsm_profiles[0].smoothing_mode).toBe("SSS");
    expect(mineResult.hsm_profiles[0].sss_enabled).toBe(true);
  });

  it("emits nano HSM profile when only nano smoothing is set", () => {
    const parsed = makeRoku({ hasNanoSmoothing: true, maxRPM: 60000 });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.hsm_profiles[0].smoothing_mode).toBe("nano");
  });

  it("skips HSM profile when no high-speed flags are set", () => {
    const parsed = makeRoku();
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.hsm_profiles).toHaveLength(0);
  });

  it("extracts rpm/diameter data points only when both are positive", () => {
    const parsed = makeRoku({
      toolSections: [
        makeRokuSection({ spindle_rpm: 24000, diameter_mm: 2.0 }),
        makeRokuSection({ spindle_rpm: 0, diameter_mm: 3.0 }),
        makeRokuSection({ spindle_rpm: 30000, diameter_mm: 0 }),
        makeRokuSection({ spindle_rpm: 30000, diameter_mm: null }),
        makeRokuSection({ spindle_rpm: 40000, diameter_mm: 1.0 }),
      ],
    });
    const mineResult = millPatternMinerEngine.mineRokuRoku([{ filename: "r.nc", parsed }]);
    expect(mineResult.rpm_diameter_data).toHaveLength(2);
    expect(mineResult.rpm_diameter_data[0]).toEqual({ rpm: 24000, diameter_mm: 2.0, program: "r.nc" });
    expect(mineResult.rpm_diameter_data[1]).toEqual({ rpm: 40000, diameter_mm: 1.0, program: "r.nc" });
  });
});

// ---------------------------------------------------------------------------
// mineAll — merge + dedup across CANONICAL_SUBSET_COUNT controllers
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.mineAll", () => {
  it("partitions by controller and sums totals across all three families", () => {
    const mineResult = millPatternMinerEngine.mineAll([
      { filename: "a.nc", controller: "haas", parsed: makeHaas({ toolSections: [makeHaasSection()] }) },
      { filename: "b.prg", controller: "hurco", parsed: makeHurco({ toolSections: [makeHurcoSection(), makeHurcoSection()] }) },
      { filename: "c.nc", controller: "rokuroku", parsed: makeRoku({ toolSections: [makeRokuSection()] }) },
    ]);
    expect(mineResult.total_programs).toBe(CANONICAL_SUBSET_COUNT);
    expect(mineResult.total_tools).toBe(4);
  });

  it("deduplicates canned cycles across controllers by g_code", () => {
    const haas = makeHaas({
      toolSections: [makeHaasSection({ operations: [makeHaasOp({ g_code: "G81" })] })],
    });
    const roku = makeRoku({
      toolSections: [makeRokuSection({ operations: [makeRokuOp({ g_code: "G81" })] })],
    });
    const mineResult = millPatternMinerEngine.mineAll([
      { filename: "a.nc", controller: "haas", parsed: haas },
      { filename: "b.nc", controller: "rokuroku", parsed: roku },
    ]);
    const g81 = mineResult.canned_cycles.filter(c => c.g_code === "G81");
    expect(g81).toHaveLength(1);
    expect(g81[0].frequency).toBe(2);
    expect(g81[0].programs).toEqual(["a.nc", "b.nc"]);
  });

  it("deduplicates coolant patterns across controllers by code", () => {
    const haas = makeHaas({ rawLines: ["M08", "M08"] });
    const hurco = makeHurco({ rawLines: ["M08", "M09"] });
    const mineResult = millPatternMinerEngine.mineAll([
      { filename: "a.nc", controller: "haas", parsed: haas },
      { filename: "b.prg", controller: "hurco", parsed: hurco },
    ]);
    const m08 = mineResult.coolant_patterns.filter(c => c.code === "M08");
    expect(m08).toHaveLength(1);
    expect(m08[0].frequency).toBe(3);
    expect(m08[0].programs).toEqual(["a.nc", "b.prg"]);
  });

  it("handles controller partitions with no members", () => {
    const mineResult = millPatternMinerEngine.mineAll([
      { filename: "a.nc", controller: "haas", parsed: makeHaas() },
    ]);
    expect(mineResult.total_programs).toBe(1);
    expect(mineResult.coolant_patterns).toEqual([]);
  });

  it("returns empty merged result when input list is empty", () => {
    const mineResult = millPatternMinerEngine.mineAll([]);
    expect(mineResult.total_programs).toBe(0);
    expect(mineResult.canned_cycles).toEqual([]);
    expect(mineResult.top_patterns).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// _computeTopPatterns — sort + slice
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.top_patterns", () => {
  it("sorts patterns by frequency descending with highest-frequency entry first", () => {
    const section = makeHaasSection({
      operations: [
        makeHaasOp({ g_code: "G81" }),
        makeHaasOp({ g_code: "G81" }),
        makeHaasOp({ g_code: "G81" }),
        makeHaasOp({ g_code: "G83" }),
      ],
    });
    const parsed = makeHaas({
      toolSections: [section],
      operations: [
        makeHaasOp({ type: "pocket", g_code: "G01" }),
        makeHaasOp({ type: "pocket", g_code: "G01" }),
      ],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.top_patterns.length).toBeGreaterThan(0);
    for (let i = 1; i < mineResult.top_patterns.length; i++) {
      expect(mineResult.top_patterns[i - 1].frequency).toBeGreaterThanOrEqual(mineResult.top_patterns[i].frequency);
    }
    expect(mineResult.top_patterns[0].pattern_type).toBe("canned_cycle");
    expect(mineResult.top_patterns[0].g_code).toBe("G81");
    expect(mineResult.top_patterns[0].frequency).toBe(3);
  });

  it("caps top_patterns at MAX_TOP_PATTERNS entries", () => {
    const allCanned = ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"];
    const section = makeHaasSection({
      operations: allCanned.map(g => makeHaasOp({ g_code: g })),
    });
    const parsed = makeHaas({
      toolSections: [section],
      operations: [
        makeHaasOp({ type: "pocket" }),
        makeHaasOp({ type: "trochoidal" }),
        makeHaasOp({ type: "adaptive" }),
        makeHaasOp({ type: "peel_mill" }),
      ],
      rawLines: ["M08", "M07", "M09", "M88", "M51"],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.top_patterns.length).toBeLessThanOrEqual(MAX_TOP_PATTERNS);
    expect(mineResult.canned_cycles.length).toBe(allCanned.length);
  });
});

// ---------------------------------------------------------------------------
// getEngagementPatterns
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine.getEngagementPatterns", () => {
  it("returns empty array when no pocket strategies have step_over_pct", () => {
    const parsed = makeHaas({
      operations: [makeHaasOp({ type: "pocket" })],
    });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.pocket_strategies).toHaveLength(1);
    expect(mineResult.pocket_strategies[0].step_over_pct).toBeNull();
    const patterns = millPatternMinerEngine.getEngagementPatterns(mineResult);
    expect(patterns).toEqual([]);
  });

  it("aggregates step_over and doc ranges from populated pocket strategies", () => {
    const baseResult = millPatternMinerEngine.mineHaas([]);
    baseResult.pocket_strategies.push(
      { type: "standard", g_code: "G01", frequency: 2, step_over_pct: 40, doc_mm: 1.5, programs: ["a"] },
      { type: "adaptive", g_code: "G01", frequency: 5, step_over_pct: 10, doc_mm: 4.0, programs: ["b"] },
      { type: "trochoidal", g_code: "G01", frequency: 3, step_over_pct: 15, doc_mm: 3.0, programs: ["c"] },
    );
    const patterns = millPatternMinerEngine.getEngagementPatterns(baseResult);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].stepOverRange.min).toBe(10);
    expect(patterns[0].stepOverRange.max).toBe(40);
    expect(patterns[0].stepOverRange.avg).toBeCloseTo((40 + 10 + 15) / CANONICAL_SUBSET_COUNT, 5);
    expect(patterns[0].docRange.min).toBe(1.5);
    expect(patterns[0].docRange.max).toBe(4.0);
    expect(patterns[0].frequency).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

describe("MillPatternMinerEngine adversarial inputs", () => {
  it("handles negative spindle_rpm by skipping chip load extraction", () => {
    const section = makeHaasSection({
      spindle_rpm: -1000,
      operations: [makeHaasOp({ params: { F: 500 } })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(0);
  });

  it("handles negative Haas feed F by skipping chip load extraction", () => {
    const section = makeHaasSection({
      spindle_rpm: 5000,
      operations: [makeHaasOp({ params: { F: -250 } })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.chip_load_samples).toHaveLength(0);
  });

  it("handles NaN F parameter as a NaN-feed sample (no crash)", () => {
    const section = makeHaasSection({
      spindle_rpm: 5000,
      operations: [makeHaasOp({ params: { F: Number.NaN } })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    // Number(NaN) is NaN. Engine guard `feed <= 0` is false for NaN and `feed == null` is false,
    // so the sample goes through with feed_rate=NaN. Either 0 or 1 sample is acceptable;
    // what we verify is no throw and, when present, feed_rate is NaN.
    expect(mineResult.chip_load_samples.length).toBeLessThanOrEqual(1);
    if (mineResult.chip_load_samples.length === 1) {
      expect(Number.isNaN(mineResult.chip_load_samples[0].feed_rate)).toBe(true);
    }
  });

  it("ignores unknown g_codes gracefully without throwing", () => {
    const section = makeHaasSection({
      operations: [makeHaasOp({ g_code: "GXX" }), makeHaasOp({ g_code: "" })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    expect(() => millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }])).not.toThrow();
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.canned_cycles).toHaveLength(0);
  });

  it("does not double-add the same program to a pocket strategy's programs list", () => {
    const ops = [makeHaasOp({ type: "pocket", g_code: "G01" })];
    const parsed = makeHaas({ operations: [...ops, ...ops, ...ops] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "same.nc", parsed }]);
    const pocket = mineResult.pocket_strategies.find(p => p.type === "standard");
    expect(pocket?.programs).toEqual(["same.nc"]);
    expect(pocket?.frequency).toBe(3);
  });

  it("does not double-add the same program to a canned cycle's programs list", () => {
    const section = makeHaasSection({
      operations: [makeHaasOp({ g_code: "G81" }), makeHaasOp({ g_code: "G81" })],
    });
    const parsed = makeHaas({ toolSections: [section] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "same.nc", parsed }]);
    const g81 = mineResult.canned_cycles.find(c => c.g_code === "G81");
    expect(g81?.programs).toEqual(["same.nc"]);
    expect(g81?.frequency).toBe(2);
  });

  it("survives empty rawLines without producing coolant output", () => {
    const parsed = makeHaas({ rawLines: [] });
    const mineResult = millPatternMinerEngine.mineHaas([{ filename: "a.nc", parsed }]);
    expect(mineResult.coolant_patterns).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Dispatcher wiring — round-trip through the Zod schema registry
// ---------------------------------------------------------------------------

describe("millDispatcher mill_pattern_mine schema", () => {
  const schema = MILL_ACTION_SCHEMAS.mill_pattern_mine!;

  it("accepts op=mine_haas with empty programs array", () => {
    const parsed = schema.safeParse({ op: "mine_haas", programs: [] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("mine_haas");
      expect(parsed.data.programs).toEqual([]);
    }
  });

  it("accepts op=mine_hurco with valid programs array", () => {
    const parsed = schema.safeParse({
      op: "mine_hurco",
      programs: [{ filename: "h.prg", parsed: makeHurco() }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("mine_hurco");
      expect(Array.isArray(parsed.data.programs)).toBe(true);
    }
  });

  it("accepts op=mine_rokuroku with valid programs array", () => {
    const parsed = schema.safeParse({
      op: "mine_rokuroku",
      programs: [{ filename: "r.nc", parsed: makeRoku() }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("mine_rokuroku");
    }
  });

  it("accepts op=mine_all with controller-tagged programs", () => {
    const parsed = schema.safeParse({
      op: "mine_all",
      programs: [
        { filename: "a.nc", controller: "haas", parsed: makeHaas() },
        { filename: "b.nc", controller: "rokuroku", parsed: makeRoku() },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("mine_all");
    }
  });

  it("accepts op=engagement_patterns with a result object", () => {
    const parsed = schema.safeParse({
      op: "engagement_patterns",
      result: millPatternMinerEngine.mineHaas([]),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("engagement_patterns");
    }
  });

  it("rejects an unknown op value", () => {
    const parsed = schema.safeParse({ op: "mine_unknown" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects a missing op field", () => {
    const parsed = schema.safeParse({ programs: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.path.includes("op"))).toBe(true);
    }
  });

  it("rejects non-array programs field", () => {
    const parsed = schema.safeParse({ op: "mine_haas", programs: "not-an-array" });
    expect(parsed.success).toBe(false);
  });
});
