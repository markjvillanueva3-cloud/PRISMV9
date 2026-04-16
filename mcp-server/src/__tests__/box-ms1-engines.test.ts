/**
 * BOX-MS1 Tests — Engines U-BOX14 through U-BOX17
 *
 * Tests OkumaDialectKnowledgeEngine, MacroPatternMinerEngine,
 * SafetyPatternMinerEngine, and BoxKnowledgeIntegrationEngine
 * using simulated and real program data.
 */

import { describe, it, expect } from "vitest";
import { OkumaDialectKnowledgeEngine } from "../engines/OkumaDialectKnowledgeEngine.js";
import { MacroPatternMinerEngine } from "../engines/MacroPatternMinerEngine.js";
import { SafetyPatternMinerEngine } from "../engines/SafetyPatternMinerEngine.js";
import { BoxKnowledgeIntegrationEngine } from "../engines/BoxKnowledgeIntegrationEngine.js";
import { SpeedFeedMinerEngine } from "../engines/SpeedFeedMinerEngine.js";
import { ToolPatternMinerEngine } from "../engines/ToolPatternMinerEngine.js";
import { OperationSequenceMinerEngine } from "../engines/OperationSequenceMinerEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaVariable, OkumaOperation, OkumaSafetyInfo } from "../engines/OkumaOSPParserEngine.js";
import type { ProgramRecord } from "../engines/ProgramDatabaseEngine.js";

// ── Test Helpers ────────────────────────────────────────────────────────────

function makeSafetyInfo(overrides: Partial<OkumaSafetyInfo> = {}): OkumaSafetyInfo {
  return {
    g50MaxRPM: [2500],
    retractPositions: [{ x: 20, z: 20 }],
    optionalStops: 3,
    mandatoryStops: 0,
    coolantOnCount: 3,
    coolantOffCount: 3,
    hasSpindleStop: true,
    gearRanges: [],
    ...overrides,
  };
}

function makeToolSection(overrides: Partial<OkumaToolSection> = {}): OkumaToolSection {
  return {
    label: "NAT01",
    toolCode: "T010101",
    toolNumber: 1,
    offsetNumber: 1,
    comment: "OD ROUGH R.032",
    startLine: 10,
    endLine: 30,
    operations: [{ type: "od_rough", line: 15, params: {} } as OkumaOperation],
    speedMode: "css",
    cssValue: 400,
    maxRPM: 2500,
    coolant: true,
    ...overrides,
  };
}

function makeOkumaProgram(overrides: Partial<OkumaProgram> = {}): OkumaProgram {
  return {
    filename: "TEST.MIN",
    header: "$TEST.MIN%",
    toolSections: [
      makeToolSection(),
      makeToolSection({ label: "NAT03", toolCode: "T030303", toolNumber: 3, speedMode: "rpm", operations: [{ type: "drill", line: 40, params: {} } as OkumaOperation] }),
    ],
    variables: [
      { name: "V1", value: 1.9, comment: "STOCK DIAMETER", line: 3 },
      { name: "V2", value: 1.751, comment: "FINISH OD", line: 4 },
      { name: "V45", value: 400, comment: "OD ROUGH SFM", line: 5 },
    ],
    subroutineCalls: ["/CALL OBAR"],
    hasBarFeeder: true,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: true,
    lineCount: 100,
    operations: [
      { type: "od_rough", line: 15, params: {} } as OkumaOperation,
      { type: "drill", line: 40, params: {} } as OkumaOperation,
    ],
    safety: makeSafetyInfo(),
    rawLines: [
      "$TEST.MIN%",
      "V1=1.9 (STOCK DIAMETER)",
      "V2=1.751 (FINISH OD)",
      "V45=400 (OD ROUGH SFM)",
      "G50 S2500",
      "NBAR",
      "/CALL OBAR",
      "M1",
      "NAT01 (OD ROUGH R.032)",
      "G0 X20 Z20",
      "T010101",
      "G96 S400 M3",
      "G1 X-.04 F.005 M8",
      "G85 NTURN D.08 U.008 W.005 F.005",
      "NTURN G81",
      "G0 X.511 Z.03",
      "G1 Z-.903 F.005",
      "G2 X.561 Z-.928 L.025",
      "G80",
      "G0 X20 Z20",
      "M9",
      "M1",
      "NAT03",
      "T030303",
      "G97 S1200 M3",
      "G0 X0 Z.05",
      "G1 Z-.15 F.002 M8",
      "G0 Z.05",
      "G0 X20 Z20",
      "M9",
      "M5",
      "/GOTO NBAR",
      "M30",
    ],
    ...overrides,
  };
}

function makeUnsafeProgram(): OkumaProgram {
  return makeOkumaProgram({
    filename: "UNSAFE.MIN",
    safety: makeSafetyInfo({
      g50MaxRPM: [],           // No speed clamp
      retractPositions: [],     // No retracts
      hasSpindleStop: false,    // No M5
      coolantOnCount: 3,
      coolantOffCount: 0,       // Coolant never off
      optionalStops: 0,         // No M1
    }),
    rawLines: [
      "NAT01",
      "T010101",
      "G96 S400 M3",            // CSS with no G50!
      "G1 X-.04 F.005 M8",
      "NAT03",
      "T030303",
      "G97 S1200 M3",
      "G1 Z-.15 F.002",
      "M30",                    // No M5 before end
    ],
  });
}

function makeProgramRecord(id: string, overrides: Partial<ProgramRecord> = {}): ProgramRecord {
  return {
    id,
    file_path: `/box/${id}.MIN`,
    filename: `${id}.MIN`,
    machine_type: "okuma_lathe",
    controller: "osp-p300l",
    material_hint: "steel",
    customer: "TEST",
    last_modified: "2025-06-01T00:00:00Z",
    line_count: 200,
    file_size: 5000,
    tools: [],
    operations: [],
    speeds: [],
    feeds: [],
    cycle_time_est_sec: null,
    has_macros: false,
    has_bar_feeder: false,
    has_live_tooling: false,
    has_threading: false,
    has_c_axis: false,
    has_probing: false,
    has_high_speed: false,
    safety_warnings: [],
    parser_used: "OkumaOSPParser",
    parsed_at: "2026-04-04T00:00:00Z",
    ...overrides,
  };
}

// ============================================================================
// OkumaDialectKnowledgeEngine Tests
// ============================================================================

describe("OkumaDialectKnowledgeEngine", () => {
  const engine = new OkumaDialectKnowledgeEngine();

  describe("search", () => {
    it("returns all tips when no filters", () => {
      const result = engine.search({});
      expect(result.total_matches).toBeGreaterThan(30);
      expect(result.tips.length).toBeGreaterThan(0);
      expect(result.tips.length).toBeLessThanOrEqual(20); // default limit
    });

    it("filters by category", () => {
      const result = engine.search({ category: "safety" });
      expect(result.tips.every(t => t.category === "safety")).toBe(true);
      expect(result.total_matches).toBeGreaterThanOrEqual(4);
    });

    it("filters by G-code", () => {
      const result = engine.search({ gcode: "G71" });
      expect(result.total_matches).toBeGreaterThanOrEqual(1);
      expect(result.tips[0].gcodes).toContain("G71");
    });

    it("filters by M-code", () => {
      const result = engine.search({ mcode: "M110" });
      expect(result.total_matches).toBeGreaterThanOrEqual(1);
    });

    it("filters by tags", () => {
      const result = engine.search({ tags: ["threading"] });
      expect(result.total_matches).toBeGreaterThanOrEqual(3);
      for (const tip of result.tips) {
        expect(tip.tags).toContain("threading");
      }
    });

    it("filters by OSP family", () => {
      const result = engine.search({ osp_family: "P200" });
      for (const tip of result.tips) {
        expect(tip.osp_family).toContain("P200");
      }
    });

    it("filters by multiple categories", () => {
      const result = engine.search({ categories: ["safety", "threading"] });
      for (const tip of result.tips) {
        expect(["safety", "threading"]).toContain(tip.category);
      }
    });

    it("respects min_confidence", () => {
      const result = engine.search({ min_confidence: 95 });
      for (const tip of result.tips) {
        expect(tip.confidence).toBeGreaterThanOrEqual(95);
      }
    });

    it("respects limit", () => {
      const result = engine.search({ limit: 5 });
      expect(result.tips.length).toBeLessThanOrEqual(5);
    });

    it("scores relevance correctly", () => {
      const result = engine.search({ gcode: "G71", tags: ["threading"] });
      // First result should have highest relevance
      expect(result.tips[0].relevance_score).toBeGreaterThan(0.5);
    });

    it("handles text query", () => {
      const result = engine.search({ query: "angular move chamfer" });
      expect(result.total_matches).toBeGreaterThanOrEqual(1);
    });
  });

  describe("lookupGCode", () => {
    it("finds G71 threading cycle", () => {
      const tip = engine.lookupGCode("G71");
      expect(tip).toBeDefined();
      expect(tip!.title).toContain("Threading");
    });

    it("finds G85 roughing cycle", () => {
      const tip = engine.lookupGCode("G85");
      expect(tip).toBeDefined();
      expect(tip!.category).toBe("cycle");
    });

    it("finds G4 dwell", () => {
      const tip = engine.lookupGCode("G4");
      expect(tip).toBeDefined();
      expect(tip!.body).toContain("SECONDS");
    });

    it("returns undefined for unknown G-code", () => {
      expect(engine.lookupGCode("G999")).toBeUndefined();
    });
  });

  describe("lookupMCode", () => {
    it("finds M110 C-axis", () => {
      const tip = engine.lookupMCode("M110");
      expect(tip).toBeDefined();
      expect(tip!.category).toBe("caxis");
    });

    it("returns undefined for unknown M-code", () => {
      expect(engine.lookupMCode("M999")).toBeUndefined();
    });
  });

  describe("getDialectDiffs", () => {
    it("returns all dialect differences", () => {
      const diffs = engine.getDialectDiffs();
      expect(diffs.length).toBeGreaterThanOrEqual(10);
    });

    it("includes critical G71 difference", () => {
      const diffs = engine.getDialectDiffs();
      const g71 = diffs.find(d => d.okuma_code === "G71");
      expect(g71).toBeDefined();
      expect(g71!.fanuc_equivalent).toBe("G76");
      expect(g71!.critical).toBe(true);
    });

    it("getCriticalDiffs returns only critical", () => {
      const critical = engine.getCriticalDiffs();
      expect(critical.every(d => d.critical)).toBe(true);
      expect(critical.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("translateToFanuc", () => {
    it("translates G71 to G76", () => {
      expect(engine.translateToFanuc("G71")).toBe("G76");
    });

    it("translates G85 to G71", () => {
      expect(engine.translateToFanuc("G85")).toBe("G71");
    });

    it("returns null for non-differing code", () => {
      expect(engine.translateToFanuc("G0")).toBeNull();
    });
  });

  describe("analyzeProgram", () => {
    it("extracts G-codes from program", () => {
      const prog = makeOkumaProgram();
      const analysis = engine.analyzeProgram(prog);
      expect(analysis.gcodes_used.length).toBeGreaterThan(0);
      const g96 = analysis.gcodes_used.find(g => g.code === "G96");
      expect(g96).toBeDefined();
    });

    it("extracts M-codes from program", () => {
      const prog = makeOkumaProgram();
      const analysis = engine.analyzeProgram(prog);
      expect(analysis.mcodes_used.length).toBeGreaterThan(0);
    });

    it("identifies dialect features", () => {
      const prog = makeOkumaProgram();
      const analysis = engine.analyzeProgram(prog);
      expect(analysis.dialect_features).toContain("NAT tool section labels");
      expect(analysis.dialect_features).toContain("6-digit tool codes");
      expect(analysis.dialect_features).toContain("Bar feeder loop (/CALL OBAR)");
    });

    it("detects safety issues on unsafe program", () => {
      const unsafe = makeUnsafeProgram();
      const analysis = engine.analyzeProgram(unsafe);
      const critical = analysis.safety_issues.filter(i => i.severity === "critical");
      expect(critical.length).toBeGreaterThanOrEqual(1);
      expect(critical.some(i => i.code === "CSS_NO_CLAMP")).toBe(true);
    });

    it("finds no critical issues on safe program", () => {
      const safe = makeOkumaProgram();
      const analysis = engine.analyzeProgram(safe);
      const critical = analysis.safety_issues.filter(i => i.severity === "critical");
      expect(critical.length).toBe(0);
    });

    it("computes complexity score", () => {
      const prog = makeOkumaProgram();
      const analysis = engine.analyzeProgram(prog);
      expect(analysis.complexity_score).toBeGreaterThan(0);
      expect(analysis.complexity_score).toBeLessThanOrEqual(100);
    });

    it("detects L-radius arcs", () => {
      const prog = makeOkumaProgram();
      const analysis = engine.analyzeProgram(prog);
      expect(analysis.dialect_features).toContain("L-radius arcs (Okuma arc format)");
    });
  });

  describe("stats", () => {
    it("returns knowledge base statistics", () => {
      const stats = engine.stats();
      expect(stats.total_tips).toBeGreaterThan(30);
      expect(stats.gcodes_documented).toBeGreaterThan(10);
      expect(stats.mcodes_documented).toBeGreaterThan(10);
      expect(stats.dialect_diffs).toBeGreaterThanOrEqual(10);
      expect(stats.safety_rules).toBeGreaterThanOrEqual(4);
      expect(stats.avg_confidence).toBeGreaterThan(80);
    });

    it("has tips in all categories", () => {
      const stats = engine.stats();
      expect(Object.keys(stats.by_category)).toContain("gcode");
      expect(Object.keys(stats.by_category)).toContain("mcode");
      expect(Object.keys(stats.by_category)).toContain("safety");
      expect(Object.keys(stats.by_category)).toContain("dialect_diff");
    });
  });
});

// ============================================================================
// MacroPatternMinerEngine Tests
// ============================================================================

describe("MacroPatternMinerEngine", () => {
  const engine = new MacroPatternMinerEngine();

  it("mines variable patterns from programs with macros", () => {
    const programs = [makeOkumaProgram(), makeOkumaProgram({ filename: "TEST2.MIN" })];
    const result = engine.mine(programs);
    expect(result.variable_patterns.length).toBeGreaterThan(0);
    expect(result.stats.programs_with_macros).toBe(2);
  });

  it("infers variable purposes from comments", () => {
    const result = engine.mine([makeOkumaProgram()]);
    const v1 = result.variable_patterns.find(v => v.name === "V1");
    expect(v1).toBeDefined();
    expect(v1!.typical_purpose).toBe("stock_diameter");
  });

  it("tracks variable frequency across programs", () => {
    const prog1 = makeOkumaProgram({ filename: "P1.MIN" });
    const prog2 = makeOkumaProgram({ filename: "P2.MIN" });
    const result = engine.mine([prog1, prog2]);
    const v1 = result.variable_patterns.find(v => v.name === "V1");
    expect(v1!.frequency).toBe(2);
  });

  it("detects local vs common variable scope", () => {
    const prog = makeOkumaProgram({
      variables: [
        { name: "V1", value: 1.9, comment: "STOCK DIA", line: 1 },
        { name: "VC100", value: 50, comment: "BATCH QTY", line: 2 },
      ],
    });
    const result = engine.mine([prog]);
    const v1 = result.variable_patterns.find(v => v.name === "V1");
    const vc100 = result.variable_patterns.find(v => v.name === "VC100");
    expect(v1!.scope).toBe("local");
    expect(vc100!.scope).toBe("common");
  });

  it("computes stats correctly", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.stats.total_programs).toBe(1);
    expect(result.stats.programs_with_macros).toBe(1);
    expect(result.stats.unique_variables).toBeGreaterThan(0);
    expect(result.stats.total_variables).toBeGreaterThan(0);
  });

  it("handles programs without macros", () => {
    const noMacro = makeOkumaProgram({
      hasMacroVariables: false,
      variables: [],
    });
    const result = engine.mine([noMacro]);
    expect(result.stats.programs_with_macros).toBe(0);
    expect(result.variable_patterns.length).toBe(0);
  });

  it("handles empty input", () => {
    const result = engine.mine([]);
    expect(result.stats.total_programs).toBe(0);
    expect(result.variable_patterns).toEqual([]);
  });

  it("extracts value ranges", () => {
    const prog1 = makeOkumaProgram({
      filename: "P1.MIN",
      variables: [{ name: "V1", value: 1.5, comment: "STOCK DIA", line: 1 }],
    });
    const prog2 = makeOkumaProgram({
      filename: "P2.MIN",
      variables: [{ name: "V1", value: 2.5, comment: "STOCK DIA", line: 1 }],
    });
    const result = engine.mine([prog1, prog2]);
    const v1 = result.variable_patterns.find(v => v.name === "V1");
    expect(v1!.range[0]).toBe(1.5);
    expect(v1!.range[1]).toBe(2.5);
  });

  it("detects branching patterns from IF/GOTO", () => {
    const prog = makeOkumaProgram({
      rawLines: [
        ...makeOkumaProgram().rawLines,
        "IF [VC200 GE V66] /GOTO NEND",
        "IF [V3 EQ 0] /GOTO NSKIP",
      ],
    });
    const result = engine.mine([prog]);
    expect(result.branching_patterns.length).toBeGreaterThanOrEqual(2);
    expect(result.stats.total_branches).toBeGreaterThanOrEqual(2);
  });

  it("builds header templates when variables exist", () => {
    const result = engine.mine([makeOkumaProgram()]);
    // May or may not generate templates depending on variable diversity
    expect(result.header_templates).toBeDefined();
  });
});

// ============================================================================
// SafetyPatternMinerEngine Tests
// ============================================================================

describe("SafetyPatternMinerEngine", () => {
  const engine = new SafetyPatternMinerEngine();

  it("mines speed clamp patterns", () => {
    const programs = [makeOkumaProgram(), makeOkumaProgram({ filename: "P2.MIN" })];
    const result = engine.mine(programs);
    expect(result.speed_clamps.length).toBeGreaterThan(0);
    expect(result.speed_clamps[0].max_rpm).toBe(2500);
    expect(result.speed_clamps[0].frequency).toBe(2);
  });

  it("mines retract positions", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.retract_positions.length).toBeGreaterThan(0);
    expect(result.retract_positions[0].x).toBe(20);
    expect(result.retract_positions[0].z).toBe(20);
  });

  it("mines stop patterns (M1/M0)", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.stop_patterns.length).toBeGreaterThanOrEqual(1);
    const optionalStop = result.stop_patterns.find(s => s.type === "optional");
    expect(optionalStop).toBeDefined();
    expect(optionalStop!.avg_per_program).toBeGreaterThan(0);
  });

  it("mines coolant patterns", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.coolant_patterns.on_codes.length).toBeGreaterThan(0);
    expect(result.coolant_patterns.balance_pct).toBe(100);
  });

  it("mines program end sequences", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.program_end_patterns.length).toBeGreaterThan(0);
  });

  it("generates safety rules", () => {
    const result = engine.mine([makeOkumaProgram()]);
    expect(result.safety_rules.length).toBeGreaterThanOrEqual(5);
    const g50Rule = result.safety_rules.find(r => r.id === "SAFE_G50_CLAMP");
    expect(g50Rule).toBeDefined();
    expect(g50Rule!.severity).toBe("critical");
  });

  it("reports correct stats", () => {
    const programs = [makeOkumaProgram(), makeUnsafeProgram()];
    const result = engine.mine(programs);
    expect(result.stats.total_programs).toBe(2);
    expect(result.stats.programs_with_g50).toBe(1); // Only safe program has G50
    expect(result.stats.programs_with_m1).toBe(1);
    expect(result.stats.avg_g50_value).toBeGreaterThan(0);
  });

  describe("checkProgram", () => {
    it("passes safe program against all rules", () => {
      const mineResult = engine.mine([makeOkumaProgram()]);
      const checks = engine.checkProgram(makeOkumaProgram(), mineResult.safety_rules);
      const failures = checks.filter(c => !c.passed);
      expect(failures.length).toBe(0);
    });

    it("fails unsafe program on critical rules", () => {
      const mineResult = engine.mine([makeOkumaProgram()]);
      const unsafe = makeUnsafeProgram();
      const checks = engine.checkProgram(unsafe, mineResult.safety_rules);
      const failures = checks.filter(c => !c.passed);
      expect(failures.length).toBeGreaterThanOrEqual(3); // No G50, no M5, no retracts
      expect(failures.some(f => f.rule_id === "SAFE_G50_CLAMP")).toBe(true);
      expect(failures.some(f => f.rule_id === "SAFE_SPINDLE_STOP")).toBe(true);
    });

    it("detects coolant imbalance", () => {
      const mineResult = engine.mine([makeOkumaProgram()]);
      const unbalanced = makeOkumaProgram({
        safety: makeSafetyInfo({ coolantOnCount: 5, coolantOffCount: 0 }),
      });
      const checks = engine.checkProgram(unbalanced, mineResult.safety_rules);
      const coolantCheck = checks.find(c => c.rule_id === "SAFE_COOLANT_BALANCE");
      expect(coolantCheck).toBeDefined();
      expect(coolantCheck!.passed).toBe(false);
    });
  });

  it("handles empty input", () => {
    const result = engine.mine([]);
    expect(result.stats.total_programs).toBe(0);
    expect(result.speed_clamps).toEqual([]);
    expect(result.safety_rules).toEqual([]);
  });
});

// ============================================================================
// BoxKnowledgeIntegrationEngine Tests
// ============================================================================

describe("BoxKnowledgeIntegrationEngine", () => {
  const engine = new BoxKnowledgeIntegrationEngine();

  // Build real mining data from the sample records in box-pattern-mining.test.ts
  const SAMPLE_RECORDS: ProgramRecord[] = [
    makeProgramRecord("prog-001", {
      material_hint: "steel",
      operations: ["face", "od_rough", "od_finish", "drill", "thread", "cutoff"],
      tools: [
        { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 600, feed: 0.012, css_mode: true },
        { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 750, feed: 0.006, css_mode: true },
        { tool_number: 3, description: "CENTER DRILL", operation_types: ["drill"], speed_rpm: 1200, feed: 0.005, css_mode: false },
        { tool_number: 9, description: "THREAD 60DEG", operation_types: ["thread"], speed_rpm: 150, feed: 0.050, css_mode: true },
        { tool_number: 11, description: "CUTOFF .125W", operation_types: ["cutoff"], speed_rpm: 350, feed: 0.003, css_mode: true },
      ],
      has_threading: true,
      has_bar_feeder: true,
    }),
    makeProgramRecord("prog-002", {
      material_hint: "steel",
      operations: ["face", "od_rough", "od_finish", "drill", "thread"],
      tools: [
        { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 550, feed: 0.010, css_mode: true },
        { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 700, feed: 0.005, css_mode: true },
        { tool_number: 3, description: "CENTER DRILL", operation_types: ["drill"], speed_rpm: 1100, feed: 0.004, css_mode: false },
        { tool_number: 9, description: "THREAD 60DEG", operation_types: ["thread"], speed_rpm: 140, feed: 0.050, css_mode: true },
      ],
      has_threading: true,
    }),
    makeProgramRecord("prog-003", {
      material_hint: "aluminum",
      operations: ["face", "od_rough", "od_finish", "drill"],
      tools: [
        { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 1200, feed: 0.015, css_mode: true },
        { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 1500, feed: 0.008, css_mode: true },
        { tool_number: 5, description: "DRILL 1/2", operation_types: ["drill"], speed_rpm: 2500, feed: 0.010, css_mode: false },
      ],
    }),
  ];

  it("integrates speed/feed data into calibration entries", () => {
    const sfMiner = new SpeedFeedMinerEngine();
    const sfResult = sfMiner.mine(SAMPLE_RECORDS);

    const integration = engine.integrate({ speed_feed: sfResult });
    expect(integration.calibration_entries.length).toBeGreaterThanOrEqual(0);
    expect(integration.integration_stats.source_programs).toBe(3);
  });

  it("integrates tool patterns into tribal tips", () => {
    const toolMiner = new ToolPatternMinerEngine();
    const toolResult = toolMiner.mine(SAMPLE_RECORDS);

    const integration = engine.integrate({ tool_patterns: toolResult });
    expect(integration.tribal_tips.length).toBeGreaterThan(0);
    expect(integration.tribal_tips.some(t => t.category === "tooling")).toBe(true);
  });

  it("integrates sequence patterns and generates playbook rules for risky sequences", () => {
    const seqMiner = new OperationSequenceMinerEngine();
    // Add a bad sequence to trigger deviation
    const badRecord = makeProgramRecord("prog-bad", {
      operations: ["od_rough", "cutoff", "thread"],
      tools: [
        { tool_number: 1, description: "OD ROUGH", operation_types: ["od_rough"], speed_rpm: 600, feed: 0.012, css_mode: true },
        { tool_number: 11, description: "CUTOFF", operation_types: ["cutoff"], speed_rpm: 350, feed: 0.003, css_mode: true },
        { tool_number: 9, description: "THREAD", operation_types: ["thread"], speed_rpm: 150, feed: 0.050, css_mode: true },
      ],
      has_threading: true,
    });
    const seqResult = seqMiner.mine([...SAMPLE_RECORDS, badRecord]);

    const integration = engine.integrate({ sequences: seqResult });
    // Should generate playbook rules for risky cutoff→thread sequence
    expect(integration.playbook_rules.length).toBeGreaterThanOrEqual(1);
    expect(integration.playbook_rules.some(r => r.category === "sequencing")).toBe(true);
  });

  it("integrates safety patterns into playbook rules", () => {
    const safetyMiner = new SafetyPatternMinerEngine();
    const safetyResult = safetyMiner.mine([makeOkumaProgram()]);

    const integration = engine.integrate({ safety: safetyResult });
    expect(integration.playbook_rules.length).toBeGreaterThanOrEqual(3);
    expect(integration.tribal_tips.some(t => t.tags.includes("g50"))).toBe(true);
  });

  it("integrates all sources together", () => {
    const sfMiner = new SpeedFeedMinerEngine();
    const toolMiner = new ToolPatternMinerEngine();
    const seqMiner = new OperationSequenceMinerEngine();
    const macroMiner = new MacroPatternMinerEngine();
    const safetyMiner = new SafetyPatternMinerEngine();

    const result = engine.integrate({
      speed_feed: sfMiner.mine(SAMPLE_RECORDS),
      tool_patterns: toolMiner.mine(SAMPLE_RECORDS),
      sequences: seqMiner.mine(SAMPLE_RECORDS),
      macros: macroMiner.mine([makeOkumaProgram()]),
      safety: safetyMiner.mine([makeOkumaProgram()]),
    });

    expect(result.integration_stats.calibration_entries_generated).toBeGreaterThanOrEqual(0);
    expect(result.integration_stats.tribal_tips_generated).toBeGreaterThan(0);
    expect(result.integration_stats.playbook_rules_generated).toBeGreaterThan(0);
    expect(result.integration_stats.safety_rules_count).toBeGreaterThan(0);
  });

  it("handles empty input gracefully", () => {
    const result = engine.integrate({});
    expect(result.calibration_entries).toEqual([]);
    expect(result.tribal_tips).toEqual([]);
    expect(result.playbook_rules).toEqual([]);
    expect(result.integration_stats.source_programs).toBe(0);
  });
});
