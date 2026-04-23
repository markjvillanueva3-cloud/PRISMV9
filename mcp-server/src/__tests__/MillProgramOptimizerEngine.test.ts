/**
 * MillProgramOptimizerEngine Tests
 * ================================
 *
 * JM Die mill program optimizer: shop inventory lookup, machine scoring,
 * material SFM ranges, per-op optimization, reporting, dispatcher wiring.
 *
 * Coverage: all 6 ISO groups, 4 tool types, 4 machines, edge cases
 * (NaN/Infinity/empty/unknown), adversarial inputs, dispatcher round-trip.
 *
 * @module __tests__/MillProgramOptimizerEngine.test
 * @milestone MILL-MASTER-P4/U11-OPT
 */

import { describe, it, expect } from "vitest";
import {
  MillProgramOptimizerEngine,
  millProgramOptimizerEngine,
  type MillMachineSpec,
  type ShopTool,
  type OperationOptimization,
  type ProgramOptimization,
} from "../engines/MillProgramOptimizerEngine.js";
import { MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

// Typed reach-in for private methods (engines use private methods that are
// unit-testable; we surface them via a structural type cast — single assertion).
type OptimizerInternals = MillProgramOptimizerEngine & {
  getSFMRange(iso: string): { min: number; max: number; typical: number };
  findBestTool(type: string, diameterMm: number): ShopTool | null;
  selectBestMachine(iso: string, operations: Array<{ rpm: number; tool_number: number }>): MillMachineSpec;
  optimizeOperation(
    op: { tool_number: number; operation_type: string; rpm: number; feed_ipm: number;
          doc_in: number; tool_type: string; tool_diameter_mm: number; surface_footage: number },
    iso: string,
  ): OperationOptimization;
  optimizations: ProgramOptimization[];
};

const reach = (engine: MillProgramOptimizerEngine): OptimizerInternals =>
  engine as OptimizerInternals;

const newEngine = (): MillProgramOptimizerEngine => new MillProgramOptimizerEngine();

// ============================================================================
// getSFMRange — ISO material groups
// ============================================================================

describe("MillProgramOptimizerEngine — getSFMRange", () => {
  const engine = newEngine();

  it("P-group (steel) typical = 200", () => {
    const r = reach(engine).getSFMRange("P");
    expect(r.typical).toBe(200);
    expect(r.min).toBe(80);
    expect(r.max).toBe(400);
  });

  it("M-group (stainless) typical = 150", () => {
    expect(reach(engine).getSFMRange("M").typical).toBe(150);
  });

  it("K-group (cast iron) typical = 250", () => {
    expect(reach(engine).getSFMRange("K").typical).toBe(250);
  });

  it("N-group (aluminum) typical = 800 (highest)", () => {
    const n = reach(engine).getSFMRange("N");
    expect(n.typical).toBe(800);
    expect(n.typical).toBeGreaterThan(reach(engine).getSFMRange("P").typical);
  });

  it("S-group (superalloy) typical = 80 (lowest)", () => {
    expect(reach(engine).getSFMRange("S").typical).toBe(80);
  });

  it("H-group (hardened) typical = 100", () => {
    expect(reach(engine).getSFMRange("H").typical).toBe(100);
  });

  it("unknown ISO falls back to P-group", () => {
    const unknown = reach(engine).getSFMRange("Z");
    expect(unknown.typical).toBe(200);
    expect(unknown.min).toBe(80);
    expect(unknown.max).toBe(400);
  });

  it("empty string ISO falls back to P-group", () => {
    expect(reach(engine).getSFMRange("").typical).toBe(200);
  });

  it("min < typical < max for all 6 canonical ISO groups", () => {
    for (const iso of ["P", "M", "K", "N", "S", "H"]) {
      const r = reach(engine).getSFMRange(iso);
      expect(r.min).toBeLessThan(r.typical);
      expect(r.typical).toBeLessThan(r.max);
    }
  });
});

// ============================================================================
// findBestTool — shop inventory lookup
// ============================================================================

describe("MillProgramOptimizerEngine — findBestTool", () => {
  const engine = newEngine();

  it("finds flat endmill at exact diameter 6.35mm", () => {
    const tool = reach(engine).findBestTool("flat_endmill", 6.35);
    expect(tool === null).toBe(false);
    expect(tool?.diameter_mm).toBe(6.35);
    expect(tool?.type).toBe("flat_endmill");
  });

  it("returns identifier EM-6.35-4FL for 6.35mm endmill", () => {
    const tool = reach(engine).findBestTool("flat_endmill", 6.35);
    expect(tool?.id).toBe("EM-6.35-4FL");
  });

  it("returns null for unknown tool type", () => {
    expect(reach(engine).findBestTool("plasma_cutter", 10)).toBe(null);
  });

  it("returns null when no tool within 2mm tolerance", () => {
    expect(reach(engine).findBestTool("spot_drill", 100)).toBe(null);
  });

  it("finds twist_drill at 6.35mm", () => {
    const tool = reach(engine).findBestTool("twist_drill", 6.35);
    expect(tool?.type).toBe("twist_drill");
    expect(tool?.diameter_mm).toBe(6.35);
  });

  it("finds tap at 6.0mm", () => {
    const tool = reach(engine).findBestTool("tap", 6.0);
    expect(tool?.type).toBe("tap");
    expect(tool?.id).toBe("TAP-M6");
  });

  it("finds face_mill at 50.8mm", () => {
    const tool = reach(engine).findBestTool("face_mill", 50.8);
    expect(tool?.diameter_mm).toBe(50.8);
  });

  it("NaN diameter returns null", () => {
    expect(reach(engine).findBestTool("flat_endmill", NaN)).toBe(null);
  });

  it("Infinity diameter returns null", () => {
    expect(reach(engine).findBestTool("flat_endmill", Infinity)).toBe(null);
  });

  it("prefers closer diameter: 7mm query picks 6.35 over 12.7", () => {
    const tool = reach(engine).findBestTool("flat_endmill", 7);
    expect(tool?.diameter_mm).toBe(6.35);
  });
});

// ============================================================================
// selectBestMachine — machine scoring
// ============================================================================

describe("MillProgramOptimizerEngine — selectBestMachine", () => {
  const engine = newEngine();

  it("aluminum (N) picks machine with N in optimal_materials", () => {
    const m = reach(engine).selectBestMachine("N", [
      { rpm: 10000, tool_number: 1 }, { rpm: 12000, tool_number: 2 },
    ]);
    expect(m.optimal_materials.includes("N")).toBe(true);
  });

  it("steel (P) picks machine with P in optimal_materials", () => {
    const m = reach(engine).selectBestMachine("P", [{ rpm: 5000, tool_number: 1 }]);
    expect(m.optimal_materials.includes("P")).toBe(true);
  });

  it("cast iron (K) picks Haas or Roku-Roku (only ones supporting K)", () => {
    const m = reach(engine).selectBestMachine("K", [{ rpm: 4000, tool_number: 1 }]);
    expect(["Haas VF-2SS", "Roku-Roku"].includes(m.name)).toBe(true);
  });

  it("returns a machine even for unknown material", () => {
    const m = reach(engine).selectBestMachine("X", [{ rpm: 1000, tool_number: 1 }]);
    expect(m.id.length).toBeGreaterThan(0);
    expect(m.max_rpm).toBeGreaterThan(0);
  });

  it("returns a machine for empty operations list", () => {
    const m = reach(engine).selectBestMachine("P", []);
    expect(m.id.length).toBeGreaterThan(0);
  });

  it("highest-RPM machine preferred for high-RPM ops", () => {
    // 15000 RPM ops — only Okuma (15000) and Roku-Roku (40000) meet the bar
    const m = reach(engine).selectBestMachine("N", [
      { rpm: 15000, tool_number: 1 },
    ]);
    expect(m.max_rpm).toBeGreaterThanOrEqual(15000);
  });

  it("handles Infinity rpm in operations without crash", () => {
    const m = reach(engine).selectBestMachine("P", [
      { rpm: Infinity, tool_number: 1 },
    ]);
    expect(m.id.length).toBeGreaterThan(0);
  });

  it("picks machine with tool_capacity >= distinct tool count", () => {
    const ops = Array.from({ length: 5 }, (_, i) => ({ rpm: 3000, tool_number: i + 1 }));
    const m = reach(engine).selectBestMachine("P", ops);
    expect(m.tool_capacity).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// optimizeOperation
// ============================================================================

describe("MillProgramOptimizerEngine — optimizeOperation", () => {
  const engine = newEngine();

  const SAMPLE_OP = {
    tool_number: 1,
    operation_type: "roughing",
    rpm: 3000,
    feed_ipm: 20,
    doc_in: 0.1,
    tool_type: "flat_endmill",
    tool_diameter_mm: 6.35,
    surface_footage: 200,
  };

  it("returns correctly shaped OperationOptimization", () => {
    const r = reach(engine).optimizeOperation(SAMPLE_OP, "P");
    expect(r.tool_number).toBe(1);
    expect(r.operation_type).toBe("roughing");
    expect(r.original_rpm).toBe(3000);
    expect(typeof r.optimized_rpm).toBe("number");
    expect(r.improvement_reason.length).toBeGreaterThan(0);
  });

  it("recommends EM-6.35-4FL when 6.35mm endmill in inventory", () => {
    const r = reach(engine).optimizeOperation(SAMPLE_OP, "P");
    expect(r.tool_recommendation).toBe("EM-6.35-4FL");
  });

  it("SFM correction triggered when surface_footage 75% off target", () => {
    // P-group target = 200 SFM; 50 is 75% below → triggers correction
    const wayOff = { ...SAMPLE_OP, surface_footage: 50 };
    const r = reach(engine).optimizeOperation(wayOff, "P");
    expect(r.improvement_reason.includes("SFM correction")).toBe(true);
  });

  it("no divide-by-zero when rpm=0", () => {
    const zeroRpm = { ...SAMPLE_OP, rpm: 0, feed_ipm: 0 };
    const r = reach(engine).optimizeOperation(zeroRpm, "P");
    expect(Number.isFinite(r.optimized_rpm)).toBe(true);
    expect(Number.isFinite(r.optimized_feed)).toBe(true);
  });

  it("unknown material falls back to P-group SFM without NaN", () => {
    const r = reach(engine).optimizeOperation(SAMPLE_OP, "Z");
    expect(Number.isFinite(r.optimized_rpm)).toBe(true);
  });

  it("preserves operation_type for drilling", () => {
    const drillOp = { ...SAMPLE_OP, tool_type: "twist_drill", operation_type: "drilling" };
    const r = reach(engine).optimizeOperation(drillOp, "P");
    expect(r.operation_type).toBe("drilling");
  });

  it("every ISO group produces finite optimized_rpm", () => {
    for (const iso of ["P", "M", "K", "N", "S", "H"]) {
      const r = reach(engine).optimizeOperation(SAMPLE_OP, iso);
      expect(Number.isFinite(r.optimized_rpm)).toBe(true);
    }
  });
});

// ============================================================================
// getOptimizations / generateReport
// ============================================================================

describe("MillProgramOptimizerEngine — reporting", () => {
  it("fresh engine has empty optimizations array", () => {
    expect(newEngine().getOptimizations().length).toBe(0);
  });

  it("generateReport on empty engine has header but no 'Program:' lines", () => {
    const report = newEngine().generateReport();
    expect(report.includes("MILL PROGRAM OPTIMIZATION REPORT")).toBe(true);
    expect(report.includes("Program:")).toBe(false);
  });

  it("generateReport includes injected program details", () => {
    const engine = newEngine();
    reach(engine).optimizations.push({
      original_path: "/test/fake.nc",
      program_number: "O1234",
      customer: "ACME",
      material_iso: "P",
      original_cycle_time_min: 10,
      optimized_cycle_time_min: 8,
      time_savings_pct: 20,
      operations_optimized: [{
        tool_number: 1, operation_type: "roughing",
        original_rpm: 3000, optimized_rpm: 4000,
        original_feed: 20, optimized_feed: 25,
        original_doc: 0.1, optimized_doc: 0.1,
        improvement_reason: "AI: RPM 3000 -> 4000",
      }],
      issues_fixed: 1, issues_remaining: 0,
      recommended_machine: "Haas VF-2SS",
      confidence: 0.85,
    });
    const report = engine.generateReport();
    expect(report.includes("O1234")).toBe(true);
    expect(report.includes("ACME")).toBe(true);
    expect(report.includes("Haas VF-2SS")).toBe(true);
    expect(report.includes("20% faster")).toBe(true);
  });

  it("getOptimizations returns a copy (mutation isolated)", () => {
    const engine = newEngine();
    const copy = engine.getOptimizations();
    copy.push({} as ProgramOptimization);
    expect(engine.getOptimizations().length).toBe(0);
  });
});

// ============================================================================
// Singleton export
// ============================================================================

describe("MillProgramOptimizerEngine — singleton", () => {
  it("singleton exists and has getOptimizations method", () => {
    expect(typeof millProgramOptimizerEngine.getOptimizations).toBe("function");
  });

  it("singleton SFM range for P matches new-instance value", () => {
    expect(reach(millProgramOptimizerEngine).getSFMRange("P").typical).toBe(200);
  });
});

// ============================================================================
// Dispatcher wiring
// ============================================================================

describe("Dispatcher wiring — mill_program_optimize", () => {
  it("action is in enum", () => {
    expect(MILL_DISPATCHER_ACTIONS.includes("mill_program_optimize")).toBe(true);
  });

  it("schema accepts op='list'", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_program_optimize"];
    expect(typeof schema?.safeParse).toBe("function");
    const parsed = schema.safeParse({ material: "4140", op: "list" });
    expect(parsed.success).toBe(true);
  });

  it("schema accepts op='report'", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_program_optimize"];
    const parsed = schema.safeParse({ material: "4140", op: "report" });
    expect(parsed.success).toBe(true);
  });

  it("schema accepts op='optimize' with file_path", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_program_optimize"];
    const parsed = schema.safeParse({
      material: "4140", op: "optimize", file_path: "H:/some/program.nc",
    });
    expect(parsed.success).toBe(true);
  });

  it("schema rejects invalid op", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_program_optimize"];
    const parsed = schema.safeParse({ material: "4140", op: "nuke" });
    expect(parsed.success).toBe(false);
  });

  it("schema rejects non-string file_path", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_program_optimize"];
    const parsed = schema.safeParse({
      material: "4140", op: "optimize", file_path: 12345,
    });
    expect(parsed.success).toBe(false);
  });
});
