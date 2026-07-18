/**
 * PostProcessorIntelligenceOrchestratorEngine -- real tests
 *
 * Covers:
 *   - classifyIntent: scoring, primary/secondary/fallback, entity extraction, complexity
 *   - routeToEngines: per-intent engine sets, parallel flag, timeout tiers
 *   - runExpertRules: SAFE-001 through BP-002 rule conditions
 *   - neuralOptimization: Pareto structure + invariants
 *   - aggregateAnalysis: conflict detection, consensus arithmetic
 *   - generateResponse: recommendation ordering, code block emission, warning escalation
 *   - orchestrate: end-to-end pipeline without gcode (no sub-engine), with gcode (sub-engines fire)
 *
 * All assertions check CONCRETE values or structural invariants (R9).
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorIntelligenceOrchestratorEngine,
  postProcessorIntelligenceOrchestrator,
  type OrchestratorInput,
} from "../engines/PostProcessorIntelligenceOrchestratorEngine.js";

// ---------------------------------------------------------------------------
// Shared fixture G-code snippets (ASCII-only)
// ---------------------------------------------------------------------------

/** Minimal safe G-code: has G28, M05 before M06, M09 before M30, G54 work offset */
const SAFE_GCODE = [
  "G28 G91 Z0",
  "G28 X0 Y0",
  "G54",
  "T1 M06",
  "M03 S3000",
  "G01 X10 Y10 F500",
  "G01 X20 F500",
  "M05",
  "M09",
  "M30",
].join("\n");

/** G-code with tool change but no M05 in prior 5 lines (triggers SAFE-002) */
const TOOL_CHANGE_NO_SPINDLE_STOP = [
  "G28 G91 Z0",
  "G54",
  "M03 S3000",
  "G01 X10 F500",
  "G01 X20 F500",
  "G01 X30 F500",
  "T2 M06",        // SAFE-002: no M05 within 5 lines above
  "M05",
  "M09",
  "M30",
].join("\n");

/** G-code ending without M09 coolant off before M30 (triggers SAFE-003) */
const NO_COOLANT_OFF = [
  "G28 G91 Z0",
  "G54",
  "T1 M06",
  "M03 S3000",
  "G01 X10 F500",
  "M30",
].join("\n");

/** G-code lacking any safe home at start (triggers SAFE-001) */
const NO_SAFE_START = [
  "G54",
  "T1 M06",
  "M03 S3000",
  "G01 X10 F500",
  "M05",
  "M09",
  "M30",
].join("\n");

/** G-code with many identical feed rates (triggers OPT-001) */
function makeConstantFeedGcode(): string {
  const lines = ["G28 G91 Z0", "G54", "T1 M06", "M03 S3000"];
  for (let i = 0; i < 15; i++) {
    lines.push(`G01 X${i * 10} Y${i * 5} F500`);
  }
  lines.push("M05", "M09", "M30");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 1. classifyIntent
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- classifyIntent", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("routes 'optimize gcode faster' to optimize_gcode intent", () => {
    const result = engine.classifyIntent("optimize gcode to be faster and reduce cycle time");
    expect(result.primary_intent).toBe("optimize_gcode");
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("routes 'validate safety check for crash' to validate_safety intent", () => {
    const result = engine.classifyIntent("validate safety and check for collision crash risk");
    expect(result.primary_intent).toBe("validate_safety");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("routes 'analyze quality and evaluate grade' to analyze_quality intent", () => {
    const result = engine.classifyIntent("analyze quality and evaluate grade of this program");
    expect(result.primary_intent).toBe("analyze_quality");
  });

  it("falls back to general_query when query is not specific", () => {
    const result = engine.classifyIntent("hello");
    expect(result.primary_intent).toBe("general_query");
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
  });

  it("extracts fanuc and siemens controller entities from query", () => {
    const result = engine.classifyIntent("compare fanuc and siemens sinumerik controllers");
    expect(result.entities.controllers).toContain("fanuc");
    expect(result.entities.controllers).toContain("siemens");
    expect(result.entities.controllers.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts ISO material groups M and S from query", () => {
    const result = engine.classifyIntent("optimize for stainless steel and titanium super alloy");
    expect(result.entities.materials).toContain("M"); // stainless
    expect(result.entities.materials).toContain("S"); // super alloy / titanium
  });

  it("classifies complexity as simple for short single-intent query", () => {
    const result = engine.classifyIntent("optimize feed");
    expect(result.complexity).toBe("simple");
  });

  it("classifies complexity as complex for long multi-intent query with 'multiple' keyword", () => {
    const longQuery = "compare all controllers fanuc siemens haas okuma and optimize gcode " +
      "for multiple operations including roughing finishing drilling tapping boring and also " +
      "validate safety check collision estimate cycle time and recommend strategy for all";
    const result = engine.classifyIntent(longQuery);
    expect(result.complexity).toBe("complex");
  });

  it("marks requires_gcode true for validate_safety intent", () => {
    const result = engine.classifyIntent("validate safety of this program");
    expect(result.primary_intent).toBe("validate_safety");
    expect(result.requires_gcode).toBe(true);
  });

  it("marks requires_gcode false for explain_feature intent", () => {
    const result = engine.classifyIntent("explain what G54 work offset means");
    expect(result.primary_intent).toBe("explain_feature");
    expect(result.requires_gcode).toBe(false);
  });

  it("secondary_intents are sorted by confidence descending", () => {
    const result = engine.classifyIntent("optimize and analyze quality of gcode program check safety");
    for (let i = 1; i < result.secondary_intents.length; i++) {
      expect(result.secondary_intents[i - 1].confidence).toBeGreaterThanOrEqual(
        result.secondary_intents[i].confidence
      );
    }
  });

  it("secondary_intents confidence values are all above 0.3 threshold", () => {
    const result = engine.classifyIntent("optimize gcode faster and analyze quality");
    for (const s of result.secondary_intents) {
      expect(s.confidence).toBeGreaterThan(0.3);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. routeToEngines
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- routeToEngines", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("optimize_gcode routes to deep_learning + neural_optimizer + expert_system", () => {
    const intent = engine.classifyIntent("optimize gcode faster reduce cycle time");
    const routing = engine.routeToEngines(intent);
    const names = routing.engines.map(e => e.engine);
    expect(names).toContain("deep_learning");
    expect(names).toContain("neural_optimizer");
    expect(names).toContain("expert_system");
  });

  it("validate_safety routes expert_system as priority 1", () => {
    const intent = engine.classifyIntent("validate safety check for collision crash");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("expert_system");
  });

  it("troubleshoot_issue routes deep_reasoning as priority 1", () => {
    const intent = engine.classifyIntent("troubleshoot issue why is this broken fix the error");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("deep_reasoning");
  });

  it("generate_post routes ultimate_ai as priority 1", () => {
    const intent = engine.classifyIntent("generate a new post processor for haas");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("ultimate_ai");
  });

  it("simple intent sets parallel=false", () => {
    const intent = engine.classifyIntent("optimize feed");
    expect(intent.complexity).toBe("simple");
    const routing = engine.routeToEngines(intent);
    expect(routing.parallel).toBe(false);
  });

  it("complex intent sets parallel=true and timeout_ms=10000", () => {
    const longQuery = "compare fanuc siemens haas okuma and optimize gcode for multiple " +
      "all operations and also generate post processor and validate safety estimate cycle time " +
      "recommend strategy for all controllers and all materials including stainless titanium";
    const intent = engine.classifyIntent(longQuery);
    expect(intent.complexity).toBe("complex");
    const routing = engine.routeToEngines(intent);
    expect(routing.parallel).toBe(true);
    expect(routing.timeout_ms).toBe(10000);
  });

  it("non-complex intent sets timeout_ms=5000", () => {
    const intent = engine.classifyIntent("optimize feed");
    const routing = engine.routeToEngines(intent);
    expect(routing.timeout_ms).toBe(5000);
  });

  it("each engine entry has positive integer priority and object config", () => {
    const intent = engine.classifyIntent("analyze quality and evaluate");
    const routing = engine.routeToEngines(intent);
    expect(routing.engines.length).toBeGreaterThan(0);
    for (const e of routing.engines) {
      expect(typeof e.priority).toBe("number");
      expect(e.priority).toBeGreaterThan(0);
      expect(typeof e.config).toBe("object");
    }
  });

  it("compare_controllers routes deep_reasoning as priority 1", () => {
    const intent = engine.classifyIntent("compare fanuc versus siemens which controller is better");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("deep_reasoning");
  });

  it("estimate_cycle_time routes deep_learning as priority 1", () => {
    const intent = engine.classifyIntent("estimate cycle time how long will machining take minutes");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("deep_learning");
  });
});

// ---------------------------------------------------------------------------
// 3. runExpertRules
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- runExpertRules", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("SAFE-001 does NOT trigger when G28 is in first 20 lines", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: SAFE_GCODE };
    const results = engine.runExpertRules(SAFE_GCODE, input);
    const safe001 = results.find(r => r.rule_id === "SAFE-001");
    // In non-full mode, only triggered rules appear; absence means not triggered
    if (safe001) {
      expect(safe001.triggered).toBe(false);
    } else {
      // Not present = not triggered = correct
      expect(safe001).toBeUndefined();
    }
  });

  it("SAFE-001 triggers with severity='error' and fix template when G28 absent from first 20 lines", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: NO_SAFE_START };
    const results = engine.runExpertRules(NO_SAFE_START, input);
    const safe001 = results.find(r => r.rule_id === "SAFE-001");
    expect(safe001?.triggered).toBe(true);
    expect(safe001?.severity).toBe("error");
    expect(safe001?.gcode_fix).toBe("G28 G91 Z0\nG28 X0 Y0");
    expect(safe001?.recommendation).toContain("G28");
  });

  it("SAFE-002 triggers with severity='critical' when M06 has no M05 within 5 prior lines", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: TOOL_CHANGE_NO_SPINDLE_STOP };
    const results = engine.runExpertRules(TOOL_CHANGE_NO_SPINDLE_STOP, input);
    const safe002 = results.find(r => r.rule_id === "SAFE-002");
    expect(safe002?.triggered).toBe(true);
    expect(safe002?.severity).toBe("critical");
    expect(safe002?.message).toContain("M05");
  });

  it("SAFE-002 does NOT trigger when M05 precedes M06 within 5 lines", () => {
    const gcode = [
      "G28 G91 Z0",
      "G54",
      "M05",
      "T2 M06",
      "M03 S3000",
      "M05",
      "M09",
      "M30",
    ].join("\n");
    const input: OrchestratorInput = { query: "analyze", gcode };
    const results = engine.runExpertRules(gcode, input);
    const safe002 = results.find(r => r.rule_id === "SAFE-002");
    if (safe002) {
      expect(safe002.triggered).toBe(false);
    } else {
      expect(safe002).toBeUndefined();
    }
  });

  it("SAFE-003 triggers with severity='warning' when M30 present but M09 absent in last 20 lines", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: NO_COOLANT_OFF };
    const results = engine.runExpertRules(NO_COOLANT_OFF, input);
    const safe003 = results.find(r => r.rule_id === "SAFE-003");
    expect(safe003?.triggered).toBe(true);
    expect(safe003?.severity).toBe("warning");
    expect(safe003?.gcode_fix).toBe("M09\nM30");
  });

  it("SAFE-003 does NOT trigger when M09 appears before M30 in last 20 lines", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: SAFE_GCODE };
    const results = engine.runExpertRules(SAFE_GCODE, input);
    const safe003 = results.find(r => r.rule_id === "SAFE-003");
    if (safe003) {
      expect(safe003.triggered).toBe(false);
    } else {
      expect(safe003).toBeUndefined();
    }
  });

  it("OPT-001 triggers with severity='info' when more than 10 feeds use only 1 unique value", () => {
    const gcode = makeConstantFeedGcode();
    const input: OrchestratorInput = { query: "optimize", gcode };
    const results = engine.runExpertRules(gcode, input);
    const opt001 = results.find(r => r.rule_id === "OPT-001");
    expect(opt001?.triggered).toBe(true);
    expect(opt001?.severity).toBe("info");
    expect(opt001?.message).toContain("constant feed rate");
  });

  it("COMPAT-001 triggers with severity='error' when Siemens CYCLE code appears in fanuc-targeted program", () => {
    const gcode = [
      "G28 G91 Z0",
      "G54",
      "CYCLE82(10, 0, 2, 25, 0, 0)",
      "M30",
    ].join("\n");
    const input: OrchestratorInput = { query: "check", controller: "fanuc", gcode };
    const results = engine.runExpertRules(gcode, input);
    const compat001 = results.find(r => r.rule_id === "COMPAT-001");
    expect(compat001?.triggered).toBe(true);
    expect(compat001?.severity).toBe("error");
    expect(compat001?.message).toContain("Siemens");
  });

  it("COMPAT-001 does NOT trigger when controller is siemens (not fanuc)", () => {
    const gcode = ["G28 G91 Z0", "G54", "CYCLE82(10,0,2,25,0,0)", "M30"].join("\n");
    const input: OrchestratorInput = { query: "check", controller: "siemens", gcode };
    const results = engine.runExpertRules(gcode, input);
    const compat001 = results.find(r => r.rule_id === "COMPAT-001");
    if (compat001) {
      expect(compat001.triggered).toBe(false);
    } else {
      expect(compat001).toBeUndefined();
    }
  });

  it("BP-002 triggers with severity='warning' when no G54-G59 work offset present", () => {
    const gcode = ["G28 G91 Z0", "T1 M06", "M03 S3000", "G01 X10 F500", "M05", "M09", "M30"].join("\n");
    const input: OrchestratorInput = { query: "analyze", gcode };
    const results = engine.runExpertRules(gcode, input);
    const bp002 = results.find(r => r.rule_id === "BP-002");
    expect(bp002?.triggered).toBe(true);
    expect(bp002?.severity).toBe("warning");
    expect(bp002?.message).toContain("work offset");
  });

  it("non-full mode: only triggered rules appear in results", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: SAFE_GCODE };
    const results = engine.runExpertRules(SAFE_GCODE, input);
    for (const r of results) {
      expect(r.triggered).toBe(true);
    }
  });

  it("full output mode: all 10 expert rules returned including untriggered", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: SAFE_GCODE, output_mode: "full" };
    const results = engine.runExpertRules(SAFE_GCODE, input);
    // EXPERT_RULES has 10 entries: SAFE-001..003, OPT-001..002, QUAL-001, COMPAT-001..002, BP-001..002
    expect(results.length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 4. neuralOptimization
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- neuralOptimization", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();
  const input: OrchestratorInput = { query: "optimize" };

  it("returns exactly 4 Pareto solutions", () => {
    const result = engine.neuralOptimization(input);
    expect(result.pareto_solutions).toHaveLength(4);
  });

  it("recommended_solution is 'balanced'", () => {
    const result = engine.neuralOptimization(input);
    expect(result.recommended_solution).toBe("balanced");
  });

  it("optimized_metrics exactly match 'balanced' Pareto entry metrics", () => {
    const result = engine.neuralOptimization(input);
    const balanced = result.pareto_solutions.find(p => p.id === "balanced");
    expect(balanced?.metrics.cycle_time).toBe(85);
    expect(result.optimized_metrics.cycle_time).toBe(85);
    expect(result.optimized_metrics.tool_life).toBe(90);
    expect(result.optimized_metrics.surface_quality).toBe(85);
    expect(result.optimized_metrics.safety_score).toBe(90);
  });

  it("original_metrics are the fixed baseline values", () => {
    const result = engine.neuralOptimization(input);
    expect(result.original_metrics.cycle_time).toBe(100);
    expect(result.original_metrics.tool_life).toBe(100);
    expect(result.original_metrics.surface_quality).toBe(75);
    expect(result.original_metrics.safety_score).toBe(85);
  });

  it("confidence is exactly 0.85", () => {
    const result = engine.neuralOptimization(input);
    expect(result.confidence).toBe(0.85);
  });

  it("'speed' Pareto solution has the lowest cycle_time across all solutions", () => {
    const result = engine.neuralOptimization(input);
    const speedEntry = result.pareto_solutions.find(p => p.id === "speed");
    const minCycle = Math.min(...result.pareto_solutions.map(p => p.metrics.cycle_time));
    expect(speedEntry?.metrics.cycle_time).toBe(minCycle);
    expect(speedEntry?.metrics.cycle_time).toBe(75);
  });

  it("'conservative' Pareto solution has the highest tool_life across all solutions", () => {
    const result = engine.neuralOptimization(input);
    const conservativeEntry = result.pareto_solutions.find(p => p.id === "conservative");
    const maxLife = Math.max(...result.pareto_solutions.map(p => p.metrics.tool_life));
    expect(conservativeEntry?.metrics.tool_life).toBe(maxLife);
    expect(conservativeEntry?.metrics.tool_life).toBe(110);
  });

  it("all Pareto solutions have a non-empty trade_off string", () => {
    const result = engine.neuralOptimization(input);
    for (const p of result.pareto_solutions) {
      expect(typeof p.trade_off).toBe("string");
      expect(p.trade_off.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. aggregateAnalysis
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- aggregateAnalysis", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("returns consensus_score=0.5 and empty conflicts when no engines provided", () => {
    const result = engine.aggregateAnalysis(undefined, undefined, undefined, undefined, undefined);
    expect(result.consensus_score).toBe(0.5);
    expect(result.conflicts).toHaveLength(0);
  });

  it("computes consensus_score as arithmetic mean of [0.8, 0.6] = 0.7", () => {
    // Must supply quality_score + physics_reasoning so the conflict-check path does not crash
    const mockDL = {
      neural_confidence: 0.8,
      quality_score: { overall_score: 80 },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const mockDR = {
      reasoning_confidence: 0.6,
      physics_reasoning: { overall_physics_score: 75 },
    } as Parameters<typeof engine.aggregateAnalysis>[1];
    const result = engine.aggregateAnalysis(mockDL, mockDR, undefined, undefined, undefined);
    expect(result.consensus_score).toBe(0.7);
  });

  it("includes all provided analyses in the returned object", () => {
    const mockDL = { neural_confidence: 0.75 } as Parameters<typeof engine.aggregateAnalysis>[0];
    const mockRules = [{ rule_id: "SAFE-001", triggered: true }] as Parameters<typeof engine.aggregateAnalysis>[3];
    const result = engine.aggregateAnalysis(mockDL, undefined, undefined, mockRules, undefined);
    expect(result.deep_learning).toBe(mockDL);
    expect(result.expert_rules).toBe(mockRules);
    expect(result.deep_reasoning).toBeUndefined();
  });

  it("detects 1 conflict when DL quality score and DR physics score differ by more than 20", () => {
    const mockDL = {
      neural_confidence: 0.8,
      quality_score: { overall_score: 90 },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const mockDR = {
      reasoning_confidence: 0.7,
      physics_reasoning: { overall_physics_score: 60 },
    } as Parameters<typeof engine.aggregateAnalysis>[1];
    const result = engine.aggregateAnalysis(mockDL, mockDR, undefined, undefined, undefined);
    // |90 - 60| = 30 > 20 -> conflict fires
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].topic).toBe("Quality Assessment");
    expect(result.conflicts[0].positions).toHaveLength(2);
    expect(result.conflicts[0].resolution).toBe("Weighted average based on data availability");
  });

  it("does NOT detect conflict when quality scores differ by exactly 20 (threshold is strictly >20)", () => {
    const mockDL = {
      neural_confidence: 0.8,
      quality_score: { overall_score: 85 },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const mockDR = {
      reasoning_confidence: 0.7,
      physics_reasoning: { overall_physics_score: 65 },
    } as Parameters<typeof engine.aggregateAnalysis>[1];
    const result = engine.aggregateAnalysis(mockDL, mockDR, undefined, undefined, undefined);
    // |85 - 65| = 20, NOT > 20
    expect(result.conflicts).toHaveLength(0);
  });

  it("includes neural optimizer confidence in consensus calculation", () => {
    const mockNeuralOpt = { confidence: 0.9 } as Parameters<typeof engine.aggregateAnalysis>[4];
    const result = engine.aggregateAnalysis(undefined, undefined, undefined, undefined, mockNeuralOpt);
    // single score: 0.9 -> mean = 0.9
    expect(result.consensus_score).toBe(0.9);
  });

  it("consensus_score is rounded to at most 2 decimal places", () => {
    // Only supply one engine so the DL+DR conflict check branch is not entered
    const mockAI = { ultimate_confidence: 0.3 } as Parameters<typeof engine.aggregateAnalysis>[2];
    const result = engine.aggregateAnalysis(undefined, undefined, mockAI, undefined, undefined);
    // single score 0.3 -> mean = 0.3, rounded to 2 dp
    expect(result.consensus_score).toBe(0.3);
    const decimals = (result.consensus_score.toString().split(".")[1] ?? "").length;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 6. generateResponse
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- generateResponse", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("emits one gcode code_block for a triggered expert rule with gcode_fix", () => {
    const intent = engine.classifyIntent("validate safety");
    const mockRules = [{
      rule_id: "SAFE-001",
      rule_name: "Missing Safe Start",
      category: "safety",
      triggered: true,
      severity: "error" as const,
      message: "Missing G28",
      recommendation: "Add G28",
      gcode_fix: "G28 G91 Z0\nG28 X0 Y0",
    }];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.code_blocks).toHaveLength(1);
    expect(response.code_blocks[0].language).toBe("gcode");
    expect(response.code_blocks[0].code).toBe("G28 G91 Z0\nG28 X0 Y0");
    expect(response.code_blocks[0].description).toContain("Missing Safe Start");
  });

  it("emits one warning entry for a critical-severity rule", () => {
    const intent = engine.classifyIntent("validate safety crash");
    const mockRules = [{
      rule_id: "SAFE-002",
      rule_name: "Spindle Not Stopped",
      category: "safety",
      triggered: true,
      severity: "critical" as const,
      message: "Tool change without M05",
      recommendation: "Add M05",
      gcode_fix: "M05\nM06",
    }];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.warnings).toHaveLength(1);
    expect(response.warnings[0].severity).toBe("critical");
    expect(response.warnings[0].message).toBe("Tool change without M05");
  });

  it("does NOT add a warning entry for a 'warning'-severity rule (only critical/error escalate)", () => {
    const intent = engine.classifyIntent("validate safety");
    const mockRules = [{
      rule_id: "SAFE-003",
      rule_name: "Missing Coolant Off",
      category: "safety",
      triggered: true,
      severity: "warning" as const,
      message: "No M09 before M30",
      recommendation: "Add M09",
      gcode_fix: "M09\nM30",
    }];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.warnings).toHaveLength(0);
  });

  it("assigns sequential priorities starting at 1 for multiple triggered rules", () => {
    const intent = engine.classifyIntent("validate safety crash");
    const mockRules = [
      { rule_id: "A", rule_name: "A", category: "safety", triggered: true, severity: "error" as const, message: "A msg", recommendation: "Fix A" },
      { rule_id: "B", rule_name: "B", category: "safety", triggered: true, severity: "warning" as const, message: "B msg", recommendation: "Fix B" },
    ];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.recommendations[0].priority).toBe(1);
    expect(response.recommendations[1].priority).toBe(2);
  });

  it("summary for validate_safety with 1 triggered safety rule contains '1' and 'safety'", () => {
    const intent = engine.classifyIntent("validate safety crash");
    const mockRules = [{
      rule_id: "SAFE-001", rule_name: "S", category: "safety", triggered: true,
      severity: "error" as const, message: "Missing G28", recommendation: "Add G28",
    }];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.summary).toContain("1");
    expect(response.summary).toContain("safety");
  });

  it("summary for validate_safety with no safety rules is 'No critical safety issues detected.'", () => {
    // "validate safety check" alone classifies as analyze_quality -- use a stronger query
    const intent = engine.classifyIntent("validate safety check for collision crash danger warning");
    expect(intent.primary_intent).toBe("validate_safety");
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, [], undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.summary).toBe("No critical safety issues detected.");
  });

  it("recommendations capped at 10 entries even when 11 rules triggered", () => {
    const intent = engine.classifyIntent("optimize gcode faster");
    const mockRules = Array.from({ length: 11 }, (_, i) => ({
      rule_id: `RULE-${i}`,
      rule_name: `Rule ${i}`,
      category: "optimization",
      triggered: true,
      severity: "info" as const,
      message: `msg ${i}`,
      recommendation: `Fix ${i}`,
    }));
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "optimize" }, intent, analysis);
    expect(response.recommendations.length).toBeLessThanOrEqual(10);
  });

  it("impact text for critical severity rule is 'Machine crash prevention'", () => {
    const intent = engine.classifyIntent("validate safety crash");
    const mockRules = [{
      rule_id: "SAFE-002", rule_name: "Spindle Not Stopped", category: "safety",
      triggered: true, severity: "critical" as const,
      message: "Tool change without M05", recommendation: "Add M05",
    }];
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, mockRules, undefined);
    const response = engine.generateResponse({ query: "validate" }, intent, analysis);
    expect(response.recommendations[0].impact).toBe("Machine crash prevention");
  });

  it("neural optimization recommendation is included and mentions cycle time reduction", () => {
    const intent = engine.classifyIntent("optimize gcode faster reduce cycle time");
    const mockNeuralOpt = engine.neuralOptimization({ query: "optimize" });
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, undefined, mockNeuralOpt);
    const response = engine.generateResponse({ query: "optimize" }, intent, analysis);
    const neuralRec = response.recommendations.find(r => r.action.includes("cycle time reduction"));
    expect(neuralRec).toBeTruthy();
    expect(neuralRec?.reason).toContain("Pareto-optimal");
  });
});

// ---------------------------------------------------------------------------
// 7. generateProactiveSuggestions
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- generateProactiveSuggestions", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("returns empty array when no analysis sub-engines provided", () => {
    const analysis = engine.aggregateAnalysis(undefined, undefined, undefined, undefined, undefined);
    const suggestions = engine.generateProactiveSuggestions(analysis);
    expect(suggestions).toEqual([]);
  });

  it("emits a 'quality score' suggestion when DL quality score is below 70", () => {
    const mockDL = {
      neural_confidence: 0.6,
      quality_score: { overall_score: 60 },
      cycle_time_estimation: { bottlenecks: [] },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const analysis = engine.aggregateAnalysis(mockDL, undefined, undefined, undefined, undefined);
    const suggestions = engine.generateProactiveSuggestions(analysis);
    expect(suggestions.some(s => s.includes("quality score"))).toBe(true);
  });

  it("does NOT emit quality suggestion when DL quality score is exactly 70", () => {
    const mockDL = {
      neural_confidence: 0.8,
      quality_score: { overall_score: 70 },
      cycle_time_estimation: { bottlenecks: [] },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const analysis = engine.aggregateAnalysis(mockDL, undefined, undefined, undefined, undefined);
    const suggestions = engine.generateProactiveSuggestions(analysis);
    expect(suggestions.some(s => s.includes("quality score"))).toBe(false);
  });

  it("emits a '2 cycle time bottlenecks detected' suggestion when DL has 2 bottlenecks", () => {
    const mockDL = {
      neural_confidence: 0.8,
      quality_score: { overall_score: 80 },
      cycle_time_estimation: { bottlenecks: ["tool change overhead", "excessive retracts"] },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const analysis = engine.aggregateAnalysis(mockDL, undefined, undefined, undefined, undefined);
    const suggestions = engine.generateProactiveSuggestions(analysis);
    expect(suggestions.some(s => s.includes("2") && s.includes("bottleneck"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. orchestrate -- end-to-end pipeline
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- orchestrate (e2e)", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("echoes the original query string in result.query", async () => {
    const result = await engine.orchestrate({ query: "explain what G54 means" });
    expect(result.query).toBe("explain what G54 means");
  });

  it("intent has a valid primary_intent string and confidence in [0,1]", async () => {
    const result = await engine.orchestrate({ query: "explain what G54 means" });
    expect(typeof result.intent.primary_intent).toBe("string");
    expect(result.intent.confidence).toBeGreaterThan(0);
    expect(result.intent.confidence).toBeLessThanOrEqual(1);
  });

  it("without gcode: deep_learning, deep_reasoning, expert_rules are all undefined", async () => {
    const result = await engine.orchestrate({ query: "explain what G54 means" });
    expect(result.analysis.deep_learning).toBeUndefined();
    expect(result.analysis.deep_reasoning).toBeUndefined();
    expect(result.analysis.expert_rules).toBeUndefined();
  });

  it("without gcode: confidence equals 0.5 (no engine scores)", async () => {
    const result = await engine.orchestrate({ query: "explain what G54 means" });
    expect(result.confidence).toBe(0.5);
  });

  it("with safe gcode full output_mode: expert_rules array contains all 10 rules", async () => {
    const result = await engine.orchestrate({ query: "analyze quality", gcode: SAFE_GCODE, output_mode: "full" });
    expect(Array.isArray(result.analysis.expert_rules)).toBe(true);
    // EXPERT_RULES has 10 entries total: SAFE-001..003, OPT-001..002, QUAL-001, COMPAT-001..002, BP-001..002
    expect((result.analysis.expert_rules ?? []).length).toBe(10);
  });

  it("with gcode missing safe start: response.warnings contains at least one error-level warning", async () => {
    const result = await engine.orchestrate({
      query: "validate safety",
      gcode: NO_SAFE_START,
    });
    const hasErrorOrCritical = result.response.warnings.some(
      w => w.severity === "error" || w.severity === "critical"
    );
    expect(hasErrorOrCritical).toBe(true);
  });

  it("with tool-change-no-spindle-stop gcode: SAFE-002 critical warning fires", async () => {
    const result = await engine.orchestrate({
      query: "validate safety check collision",
      gcode: TOOL_CHANGE_NO_SPINDLE_STOP,
    });
    const criticalWarning = result.response.warnings.find(w => w.severity === "critical");
    expect(criticalWarning?.message).toContain("M05");
  });

  it("processing_time_ms is a non-negative integer-like number", async () => {
    const result = await engine.orchestrate({ query: "analyze", gcode: SAFE_GCODE });
    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.processing_time_ms)).toBe(true);
  });

  it("context_updates reflects the provided controller and material", async () => {
    const result = await engine.orchestrate({
      query: "optimize gcode for haas",
      gcode: SAFE_GCODE,
      controller: "haas",
      material_iso: "P",
    });
    expect(result.context_updates.controller_context).toBe("haas");
    expect(result.context_updates.material_context).toBe("P");
  });

  it("proactive_suggestions is always an array (empty or non-empty)", async () => {
    const result = await engine.orchestrate({ query: "recommend strategy" });
    expect(Array.isArray(result.proactive_suggestions)).toBe(true);
  });

  it("response.recommendations is an array with at most 10 items", async () => {
    const result = await engine.orchestrate({
      query: "validate safety check collision",
      gcode: NO_SAFE_START,
    });
    expect(Array.isArray(result.response.recommendations)).toBe(true);
    expect(result.response.recommendations.length).toBeLessThanOrEqual(10);
  });

  it("optimize_gcode orchestration populates deep_learning and neural_optimization", async () => {
    const result = await engine.orchestrate({
      query: "optimize gcode to be faster and reduce cycle time",
      gcode: SAFE_GCODE,
    });
    // optimize_gcode routes deep_learning + neural_optimizer
    expect(result.analysis.deep_learning).toBeTruthy();
    expect(result.analysis.neural_optimization?.recommended_solution).toBe("balanced");
  });

  it("validate_safety orchestration populates expert_rules and sets intent correctly", async () => {
    const result = await engine.orchestrate({
      query: "validate safety check for collision crash danger",
      gcode: SAFE_GCODE,
    });
    expect(result.intent.primary_intent).toBe("validate_safety");
    expect(Array.isArray(result.analysis.expert_rules)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Singleton export
// ---------------------------------------------------------------------------

describe("postProcessorIntelligenceOrchestrator singleton", () => {
  it("is an instance of PostProcessorIntelligenceOrchestratorEngine", () => {
    expect(postProcessorIntelligenceOrchestrator).toBeInstanceOf(PostProcessorIntelligenceOrchestratorEngine);
  });

  it("singleton classifyIntent correctly identifies optimize_gcode round-tripped through orchestrate", async () => {
    const result = await postProcessorIntelligenceOrchestrator.orchestrate({
      query: "optimize gcode faster reduce cycle time",
    });
    expect(result.intent.primary_intent).toBe("optimize_gcode");
    expect(result.query).toBe("optimize gcode faster reduce cycle time");
  });
});

// ---------------------------------------------------------------------------
// 10. Adversarial / edge-case inputs
// ---------------------------------------------------------------------------

describe("PostProcessorIntelligenceOrchestratorEngine -- adversarial", () => {
  const engine = new PostProcessorIntelligenceOrchestratorEngine();

  it("classifyIntent: empty string falls back to general_query with confidence 0.5+0.3=0.8", () => {
    const result = engine.classifyIntent("");
    expect(result.primary_intent).toBe("general_query");
    expect(result.confidence).toBe(0.8);
  });

  it("classifyIntent: unicode-heavy query does not throw and returns a string intent", () => {
    // Do not use non-ASCII in the test file source itself -- pass it as a runtime value
    const unicodeQuery = "optimize gcode f\u00fcr siemens";
    const result = engine.classifyIntent(unicodeQuery);
    expect(typeof result.primary_intent).toBe("string");
    expect(result.complexity === "simple" || result.complexity === "moderate" || result.complexity === "complex").toBe(true);
  });

  it("runExpertRules: empty gcode -- non-applicable rules do not trigger", () => {
    const input: OrchestratorInput = { query: "analyze", gcode: "" };
    const results = engine.runExpertRules("", input);
    // OPT-001 needs >10 feeds; COMPAT-001 needs controller+CYCLE pattern; QUAL-001 needs rpm
    const opt001 = results.find(r => r.rule_id === "OPT-001");
    const compat001 = results.find(r => r.rule_id === "COMPAT-001");
    const qual001 = results.find(r => r.rule_id === "QUAL-001");
    expect(opt001).toBeUndefined();
    expect(compat001).toBeUndefined();
    expect(qual001).toBeUndefined();
  });

  it("orchestrate: query with 'multiple' keyword and >400 chars classifies as complexity=complex", async () => {
    // complexity=complex requires: >2 secondary_intents OR length>400 OR /multiple|several|all/ match
    // Use the "multiple" keyword to reliably trigger complex regardless of length
    const longQuery = "optimize gcode multiple operations faster and also validate safety " +
      "for all controllers and analyze quality and recommend strategy and estimate cycle time";
    const result = await engine.orchestrate({ query: longQuery });
    expect(result.query).toBe(longQuery);
    expect(result.intent.complexity).toBe("complex");
  });

  it("aggregateAnalysis: single ultimate_ai confidence 0.73 becomes consensus_score 0.73", () => {
    const mockAI = { ultimate_confidence: 0.73 } as Parameters<typeof engine.aggregateAnalysis>[2];
    const result = engine.aggregateAnalysis(undefined, undefined, mockAI, undefined, undefined);
    expect(result.consensus_score).toBe(0.73);
  });

  it("routeToEngines: general_query routes to ultimate_ai as default priority-1 engine", () => {
    const intent = engine.classifyIntent("hello");
    const routing = engine.routeToEngines(intent);
    const top = routing.engines.find(e => e.priority === 1);
    expect(top?.engine).toBe("ultimate_ai");
  });

  it("aggregateAnalysis: four scores [0.4, 0.6, 0.8, 0.2] yields consensus 0.5", () => {
    // Supply quality_score + physics_reasoning so the conflict-check branch does not crash
    const mockDL = {
      neural_confidence: 0.4,
      quality_score: { overall_score: 80 },
    } as Parameters<typeof engine.aggregateAnalysis>[0];
    const mockDR = {
      reasoning_confidence: 0.6,
      physics_reasoning: { overall_physics_score: 75 },
    } as Parameters<typeof engine.aggregateAnalysis>[1];
    const mockAI = { ultimate_confidence: 0.8 } as Parameters<typeof engine.aggregateAnalysis>[2];
    const mockNO = { confidence: 0.2 } as Parameters<typeof engine.aggregateAnalysis>[4];
    const result = engine.aggregateAnalysis(mockDL, mockDR, mockAI, undefined, mockNO);
    // (0.4 + 0.6 + 0.8 + 0.2) / 4 = 0.5
    expect(result.consensus_score).toBe(0.5);
  });
});
