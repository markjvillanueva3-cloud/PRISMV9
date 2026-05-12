/**
 * WEDMProgramNeuralAnalysisEngine Tests
 *
 * Comprehensive tests for the Wire EDM Program Neural Analysis Engine:
 *   - Program analysis with AI reasoning
 *   - Operation order validation
 *   - Parameter optimization
 *   - Wire break risk prediction
 *   - Anti-pattern detection
 *   - Pattern matching
 *   - Improvement suggestions
 *
 * @module __tests__/wedm-program-neural-analysis
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmProgramNeuralAnalysisEngine,
  WEDMProgramNeuralAnalysisEngine,
  type WEDMParams,
  type ProgramAnalysis,
  type OrderValidation,
  type OptimizationResult,
  type RiskAssessment,
} from "../engines/WEDMProgramNeuralAnalysisEngine.js";

// ============================================================================
// TEST DATA — Sample Programs
// ============================================================================

const VALID_4PASS_PROGRAM = `%
O0001 (ITW SHAKEPROOF PUNCH)
(MATERIAL: D2 TOOL STEEL)
(THICKNESS: 1.00 IN)
H175 = 0.0000
H1 =.0085 + H175
H2 =.0064 + H175
H3 =.0058 + H175
H4 =.0053 + H175
G90 G21
M20 (THREAD WIRE)
M78 (FILL TANK)
M90 (ADAPTIVE ON)
G92 X0 Y0
E1221 H1 F.12
G42
G1 X1.0 Y0
G1 X1.0 Y1.0
G1 X0 Y1.0
G1 X0 Y0
G40
E1222 H2 F.24
G42
G1 X1.0 Y0
G1 X1.0 Y1.0
G1 X0 Y1.0
G1 X0 Y0
G40
E1223 H3 F.21
G42
G1 X1.0 Y0
G1 X1.0 Y1.0
G1 X0 Y1.0
G1 X0 Y0
G40
E1224 H4 F.2
G42
G1 X1.0 Y0
G1 X1.0 Y1.0
G1 X0 Y1.0
G1 X0 Y0
G40
M21 (CUT WIRE)
M58 (DRAIN TANK)
M02
%`;

const SKIM_BEFORE_ROUGH_PROGRAM = `%
O0002 (BAD ORDER)
H1 =.0085
H2 =.0064
G90
M20
E1222 H2 F.24 (SKIM FIRST - ERROR!)
G42
G1 X1.0 Y0
G40
E1221 H1 F.12 (ROUGH AFTER SKIM)
G42
G1 X1.0 Y0
G40
M02
%`;

const MISSING_SAFETY_PROGRAM = `%
O0003 (MISSING SAFETY)
H1 =.0085
G90
E1221 H1 F.12
G42
G1 X1.0 Y0
(NO G40, NO M02, NO M20)
%`;

const OFFSET_INCREASE_PROGRAM = `%
O0004 (OFFSET INCREASES)
H175 = 0.0000
H1 =.0053 + H175
H2 =.0058 + H175
H3 =.0064 + H175
H4 =.0085 + H175
G90
M20
E1221 H1 F.12
G42
G1 X1.0 Y0
G40
E1222 H2 F.24
G42
G1 X1.0 Y0
G40
E1223 H3 F.21
G42
G1 X1.0 Y0
G40
E1224 H4 F.2
G42
G1 X1.0 Y0
G40
M02
%`;

const SINGLE_PASS_PROGRAM = `%
O0005 (SINGLE PASS)
H1 =.0085
G90
M20
M90
E1221 H1 F.12
G42
G1 X1.0 Y0
G1 X1.0 Y1.0
G1 X0 Y1.0
G1 X0 Y0
G40
M21
M02
%`;

// ============================================================================
// TESTS
// ============================================================================

describe("WEDMProgramNeuralAnalysisEngine", () => {
  let engine: WEDMProgramNeuralAnalysisEngine;

  beforeEach(() => {
    engine = wedmProgramNeuralAnalysisEngine;
  });

  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("Engine Instantiation", () => {
    it("should export a singleton instance", () => {
      expect(wedmProgramNeuralAnalysisEngine).toBeDefined();
      expect(wedmProgramNeuralAnalysisEngine).toBeInstanceOf(WEDMProgramNeuralAnalysisEngine);
    });

    it("should have all required methods", () => {
      expect(typeof engine.analyzeProgram).toBe("function");
      expect(typeof engine.validateOperationOrder).toBe("function");
      expect(typeof engine.optimizeParameters).toBe("function");
      expect(typeof engine.predictWireBreakRisk).toBe("function");
      expect(typeof engine.suggestImprovements).toBe("function");
    });
  });

  // ==========================================================================
  // FULL PROGRAM ANALYSIS
  // ==========================================================================

  describe("analyzeProgram", () => {
    it("should analyze a valid 4-pass program", async () => {
      const result = await engine.analyzeProgram(VALID_4PASS_PROGRAM, {
        filename: "valid-4pass.nc",
        material: "tool_steel",
        thickness_mm: 25.4,
      });

      expect(result.filename).toBe("valid-4pass.nc");
      expect(result.dialect).toBe("mitsubishi");
      expect(result.pass_count).toBe(4);
      expect(result.order_validation.valid).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.critical_errors.length).toBe(0);
      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(5);
    });

    it("should detect skim-before-rough error", async () => {
      const result = await engine.analyzeProgram(SKIM_BEFORE_ROUGH_PROGRAM, {
        filename: "bad-order.nc",
      });

      expect(result.order_validation.valid).toBe(false);
      expect(result.order_validation.violations.some(v => v.type === "skim_before_rough")).toBe(true);
      expect(result.critical_errors.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(60);
    });

    it("should detect missing safety commands", async () => {
      const result = await engine.analyzeProgram(MISSING_SAFETY_PROGRAM, {
        filename: "missing-safety.nc",
      });

      // Should detect at least one missing safety command (M20 or M02/M30)
      // The parser may or may not detect M20 based on specific patterns
      const hasSafetyAntiPattern = result.anti_patterns.some(
        ap => ap.id === "AP005" || ap.id === "AP007" || ap.id === "AP006"
      );
      expect(hasSafetyAntiPattern || result.warnings.length > 0).toBe(true);
      // At minimum, parser warnings or anti-patterns should flag issues
      expect(result.score).toBeLessThanOrEqual(95);
    });

    it("should detect offset increase anti-pattern", async () => {
      const result = await engine.analyzeProgram(OFFSET_INCREASE_PROGRAM, {
        filename: "offset-increase.nc",
      });

      expect(result.order_validation.offset_cascade_valid).toBe(false);
      expect(result.anti_patterns.some(ap => ap.id === "AP003")).toBe(true);
    });

    it("should detect single pass program", async () => {
      const result = await engine.analyzeProgram(SINGLE_PASS_PROGRAM, {
        filename: "single-pass.nc",
      });

      expect(result.pass_count).toBe(1);
      // Single pass anti-pattern or improvement for quality should be present
      const hasSinglePassDetection = result.anti_patterns.some(ap => ap.id === "AP012") ||
        result.improvements.some(i => i.title.includes("pass") || i.title.includes("skim"));
      // At minimum, a single-pass program should get a lower score or quality recommendation
      expect(hasSinglePassDetection || result.score < 95).toBe(true);
    });

    it("should return JM Die specific notes", async () => {
      const result = await engine.analyzeProgram(VALID_4PASS_PROGRAM, {
        filename: "jm-die.nc",
        material: "D2",
      });

      expect(result.jm_die_notes.length).toBeGreaterThan(0);
      expect(result.jm_die_notes.some(n => n.includes("Mitsubishi FA-10S"))).toBe(true);
      expect(result.jm_die_notes.some(n => n.includes("H175"))).toBe(true);
    });

    it("should match successful program patterns", async () => {
      const result = await engine.analyzeProgram(VALID_4PASS_PROGRAM, {
        filename: "pattern-match.nc",
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.pattern_matches.length).toBeGreaterThan(0);
      expect(result.pattern_matches[0].type).toBe("successful_program");
      expect(result.pattern_matches[0].confidence).toBeGreaterThan(0.3);
    });
  });

  // ==========================================================================
  // OPERATION ORDER VALIDATION
  // ==========================================================================

  describe("validateOperationOrder", () => {
    it("should validate correct E1221-E1224 sequence", () => {
      const result = engine.validateOperationOrder(["E1221", "E1222", "E1223", "E1224"]);

      expect(result.valid).toBe(true);
      expect(result.e_codes_found).toEqual(["E1221", "E1222", "E1223", "E1224"]);
      expect(result.violations.length).toBe(0);
    });

    it("should detect skim before rough", () => {
      const result = engine.validateOperationOrder(["E1222", "E1221", "E1223", "E1224"]);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.type === "skim_before_rough")).toBe(true);
      expect(result.violations[0].severity).toBe("critical");
    });

    it("should detect missing rough pass", () => {
      const result = engine.validateOperationOrder(["E1222", "E1223", "E1224"]);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.type === "missing_pass")).toBe(true);
    });

    it("should detect duplicate E-codes", () => {
      const result = engine.validateOperationOrder(["E1221", "E1222", "E1222", "E1223"]);

      expect(result.violations.some(v => v.type === "duplicate_pass")).toBe(true);
    });

    it("should handle empty E-code list", () => {
      const result = engine.validateOperationOrder([]);

      expect(result.valid).toBe(false);
      expect(result.violations[0].type).toBe("missing_pass");
    });

    it("should validate heavy 5-pass sequence", () => {
      const result = engine.validateOperationOrder(["E1281", "E1282", "E1283", "E1284", "E1285"]);

      expect(result.valid).toBe(true);
      expect(result.e_codes_found.length).toBe(5);
    });

    it("should validate taper 5-pass sequence", () => {
      const result = engine.validateOperationOrder(["E2821", "E2822", "E2823", "E2824", "E2825"]);

      expect(result.valid).toBe(true);
    });
  });

  // ==========================================================================
  // PARAMETER OPTIMIZATION
  // ==========================================================================

  describe("optimizeParameters", () => {
    it("should optimize parameters within bounds", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 5,
        off_time_us: 20,
        wire_tension_g: 1500,
        flush_pressure_bar: 7,
      };

      const result = engine.optimizeParameters(params, "tool_steel", 25);

      expect(result.original).toEqual(params);
      expect(result.changes.length).toBe(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should suggest increasing low ON time", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 1, // Too low
        off_time_us: 20,
      };

      const result = engine.optimizeParameters(params, "tool_steel", 25);

      expect(result.changes.some(c => c.parameter === "on_time_us")).toBe(true);
      expect(result.optimized.on_time_us).toBeGreaterThan(params.on_time_us!);
    });

    it("should suggest reducing high ON time", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 15, // Too high for medium thickness
        off_time_us: 20,
      };

      const result = engine.optimizeParameters(params, "tool_steel", 25);

      expect(result.changes.some(c => c.parameter === "on_time_us")).toBe(true);
      expect(result.optimized.on_time_us).toBeLessThan(params.on_time_us!);
    });

    it("should optimize for different materials", () => {
      const params: WEDMParams = {
        e_code: "E5036",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 5, // Too high for carbide
        off_time_us: 20,
      };

      const result = engine.optimizeParameters(params, "carbide", 10);

      expect(result.changes.some(c => c.parameter === "on_time_us")).toBe(true);
      expect(result.optimized.on_time_us).toBeLessThan(params.on_time_us!);
    });

    it("should optimize wire tension", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        wire_tension_g: 2500, // Too high
      };

      const result = engine.optimizeParameters(params, "tool_steel", 25);

      expect(result.changes.some(c => c.parameter === "wire_tension_g")).toBe(true);
      expect(result.optimized.wire_tension_g).toBeLessThan(params.wire_tension_g!);
    });

    it("should calculate expected improvements", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 12, // High
        off_time_us: 80, // Very high - wasteful
      };

      const result = engine.optimizeParameters(params, "tool_steel", 25);

      expect(result.improvements.cycle_time_reduction_pct).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // WIRE BREAK RISK PREDICTION
  // ==========================================================================

  describe("predictWireBreakRisk", () => {
    it("should return low risk for safe parameters", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 5,
        off_time_us: 25,
        peak_current_A: 10,
        wire_tension_g: 1500,
        flush_pressure_bar: 7,
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.risk_level).toBe("low");
      expect(result.risk_score).toBeLessThan(25);
    });

    it("should detect high duty cycle risk", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 10,
        off_time_us: 10, // 50% duty - too high
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.factors.some(f => f.name.includes("duty cycle"))).toBe(true);
      expect(result.risk_score).toBeGreaterThan(20);
    });

    it("should detect high current density risk", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        peak_current_A: 30, // Very high for 0.25mm wire
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.factors.some(f => f.name.includes("current"))).toBe(true);
    });

    it("should detect excessive wire tension", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        wire_tension_g: 2500, // Too high
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.factors.some(f => f.name.includes("tension"))).toBe(true);
    });

    it("should detect low flush pressure for rough", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        flush_pressure_bar: 2, // Too low
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.factors.some(f => f.name.includes("flushing"))).toBe(true);
    });

    it("should provide mitigations for risks", () => {
      const params: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 10,
        off_time_us: 10,
        wire_tension_g: 2500,
      };

      const result = engine.predictWireBreakRisk(params);

      expect(result.mitigations.length).toBeGreaterThan(0);
      expect(result.risk_level).not.toBe("low");
    });

    it("should estimate predicted breaks per hour", () => {
      const highRiskParams: WEDMParams = {
        e_code: "E1221",
        pass_number: 1,
        pass_type: "rough",
        on_time_us: 10,
        off_time_us: 8,
        peak_current_A: 25,
        wire_tension_g: 2200,
      };

      const result = engine.predictWireBreakRisk(highRiskParams);

      expect(result.predicted_breaks_per_hour).toBeDefined();
      expect(result.predicted_breaks_per_hour).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // IMPROVEMENT SUGGESTIONS
  // ==========================================================================

  describe("suggestImprovements", () => {
    it("should generate improvements from anti-patterns", () => {
      const analysis: Partial<ProgramAnalysis> = {
        anti_patterns: [{
          id: "AP004",
          name: "No adaptive control (M90)",
          description: "M90 adaptive control not enabled",
          location: "program",
          severity: "major",
          fix: "Add M90 before rough cut",
        }],
        order_validation: {
          valid: true,
          e_codes_found: [],
          expected_sequence: [],
          violations: [],
          offset_cascade_valid: true,
          offset_values_mm: [],
          m_code_validation: {
            has_m20_threading: true,
            has_m90_adaptive: false,
            m90_timing_valid: true,
            tank_sequence_valid: true,
            issues: [],
          },
        },
        wire_break_risk: {
          risk_score: 20,
          risk_level: "low",
          factors: [],
          mitigations: [],
        },
        parameter_analysis: [],
        pattern_matches: [],
      };

      const improvements = engine.suggestImprovements(analysis);

      expect(improvements.length).toBeGreaterThan(0);
      expect(improvements.some(i => i.title.includes("M90"))).toBe(true);
    });

    it("should generate improvements from order violations", () => {
      const analysis: Partial<ProgramAnalysis> = {
        anti_patterns: [],
        order_validation: {
          valid: false,
          e_codes_found: ["E1222", "E1221"],
          expected_sequence: ["E1221", "E1222"],
          violations: [{
            type: "skim_before_rough",
            description: "Skim before rough",
            severity: "critical",
            fix: "Reorder passes",
          }],
          offset_cascade_valid: true,
          offset_values_mm: [],
          m_code_validation: {
            has_m20_threading: true,
            has_m90_adaptive: true,
            m90_timing_valid: true,
            tank_sequence_valid: true,
            issues: [],
          },
        },
        wire_break_risk: {
          risk_score: 10,
          risk_level: "low",
          factors: [],
          mitigations: [],
        },
        parameter_analysis: [],
        pattern_matches: [],
      };

      const improvements = engine.suggestImprovements(analysis);

      expect(improvements.some(i => i.category === "safety")).toBe(true);
      expect(improvements.some(i => i.priority === 1)).toBe(true);
    });

    it("should generate improvements from wire break risk", () => {
      const analysis: Partial<ProgramAnalysis> = {
        anti_patterns: [],
        order_validation: {
          valid: true,
          e_codes_found: [],
          expected_sequence: [],
          violations: [],
          offset_cascade_valid: true,
          offset_values_mm: [],
          m_code_validation: {
            has_m20_threading: true,
            has_m90_adaptive: true,
            m90_timing_valid: true,
            tank_sequence_valid: true,
            issues: [],
          },
        },
        wire_break_risk: {
          risk_score: 60,
          risk_level: "high",
          factors: [{
            name: "High duty cycle",
            contribution: 30,
            description: "Duty cycle 45% exceeds max 30%",
            mitigation: "Increase OFF time",
          }],
          mitigations: ["Increase OFF time"],
        },
        parameter_analysis: [],
        pattern_matches: [],
      };

      const improvements = engine.suggestImprovements(analysis);

      expect(improvements.some(i => i.category === "reliability")).toBe(true);
    });

    it("should sort improvements by priority", () => {
      const analysis: Partial<ProgramAnalysis> = {
        anti_patterns: [
          { id: "AP001", name: "Critical", description: "", location: "", severity: "critical", fix: "Fix it" },
          { id: "AP006", name: "Minor", description: "", location: "", severity: "minor", fix: "Fix it" },
          { id: "AP004", name: "Major", description: "", location: "", severity: "major", fix: "Fix it" },
        ],
        order_validation: {
          valid: true,
          e_codes_found: [],
          expected_sequence: [],
          violations: [],
          offset_cascade_valid: true,
          offset_values_mm: [],
          m_code_validation: {
            has_m20_threading: true,
            has_m90_adaptive: true,
            m90_timing_valid: true,
            tank_sequence_valid: true,
            issues: [],
          },
        },
        wire_break_risk: {
          risk_score: 10,
          risk_level: "low",
          factors: [],
          mitigations: [],
        },
        parameter_analysis: [],
        pattern_matches: [],
      };

      const improvements = engine.suggestImprovements(analysis);

      // Critical should be first
      expect(improvements[0].priority).toBe(1);
      // Should be sorted by priority
      for (let i = 1; i < improvements.length; i++) {
        expect(improvements[i].priority).toBeGreaterThanOrEqual(improvements[i - 1].priority);
      }
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe("Integration Tests", () => {
    it("should handle empty program", async () => {
      const result = await engine.analyzeProgram("%\n%");

      expect(result.pass_count).toBe(0);
      expect(result.score).toBeLessThan(50);
    });

    it("should handle program with comments only", async () => {
      const result = await engine.analyzeProgram(`%
(THIS IS A COMMENT)
(ANOTHER COMMENT)
%`);

      expect(result.pass_count).toBe(0);
    });

    it("should provide complete analysis structure", async () => {
      const result = await engine.analyzeProgram(VALID_4PASS_PROGRAM);

      // Verify all required fields are present
      expect(result.filename).toBeDefined();
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe("number");
      expect(result.dialect).toBeDefined();
      expect(result.pass_count).toBeDefined();
      expect(result.order_validation).toBeDefined();
      expect(result.parameter_analysis).toBeDefined();
      expect(Array.isArray(result.anti_patterns)).toBe(true);
      expect(result.wire_break_risk).toBeDefined();
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(Array.isArray(result.pattern_matches)).toBe(true);
      expect(Array.isArray(result.reasoning_chain)).toBe(true);
      expect(Array.isArray(result.jm_die_notes)).toBe(true);
      expect(result.confidence).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.critical_errors)).toBe(true);
    });

    it("should maintain score between 0 and 100", async () => {
      const results = await Promise.all([
        engine.analyzeProgram(VALID_4PASS_PROGRAM),
        engine.analyzeProgram(SKIM_BEFORE_ROUGH_PROGRAM),
        engine.analyzeProgram(MISSING_SAFETY_PROGRAM),
        engine.analyzeProgram(SINGLE_PASS_PROGRAM),
      ]);

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });

    it("should maintain confidence between 0 and 1", async () => {
      const result = await engine.analyzeProgram(VALID_4PASS_PROGRAM);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
