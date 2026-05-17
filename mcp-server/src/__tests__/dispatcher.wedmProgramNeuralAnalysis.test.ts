/**
 * dispatcher.wedmProgramNeuralAnalysis.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WPNA (WEDMProgramNeuralAnalysisEngine).
 *
 * 4 read-only neural-analysis actions through real `prism_dev`:
 *   wpna_validate_order       validateOperationOrder(ecodes[]) — sync
 *   wpna_predict_break_risk   predictWireBreakRisk(params) — sync
 *   wpna_optimize_parameters  optimizeParameters(params, mat?, thick?) — sync
 *   wpna_analyze_program      analyzeProgram(content, opts?) — async
 *
 * Pure compute (engine composes WireEDMProgramParserEngine + physics models).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmProgramNeuralAnalysisEngine } from "../engines/WEDMProgramNeuralAnalysisEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const ROUGH_PARAMS = {
  e_code: "E1221",
  pass_number: 1,
  pass_type: "rough" as const,
  on_time_us: 5,
  off_time_us: 14,
  peak_current_A: 30,
  wire_tension_g: 1500,
  flush_pressure_bar: 8,
};

const SKIM_PARAMS = {
  e_code: "E2200",
  pass_number: 2,
  pass_type: "skim" as const,
  on_time_us: 1,
  off_time_us: 6,
  peak_current_A: 5,
  wire_tension_g: 800,
  flush_pressure_bar: 3,
};

const MINIMAL_NC = `
G54
M20
E1221
G92 X0 Y0
G01 X10.0 Y0
G02 X20.0 Y10.0 I10.0 J0
M30
`.trim();

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — Zod schemas", () => {
  it("wpna_validate_order accepts empty array (engine handles); caps at 50", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_validate_order"].safeParse({ ecodes: [] }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpna_validate_order"].safeParse({
      ecodes: ["E1221", "E2200"],
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpna_validate_order"].safeParse({
      ecodes: new Array(51).fill("E1221"),
    }).success).toBe(false);
  });

  it("wpna_validate_order rejects ecode > 16 chars (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_validate_order"].safeParse({
      ecodes: ["E" + "X".repeat(20)],
    }).success).toBe(false);
  });

  it("wpna_predict_break_risk requires e_code + pass_number + pass_type", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_predict_break_risk"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpna_predict_break_risk"].safeParse(ROUGH_PARAMS).success).toBe(true);
  });

  it("wpna_predict_break_risk rejects pass_type 'INVALID' (strict enum)", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_predict_break_risk"].safeParse({
      ...ROUGH_PARAMS, pass_type: "INVALID",
    }).success).toBe(false);
  });

  it("wpna_predict_break_risk caps physical dimensions (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_predict_break_risk"].safeParse({
      ...ROUGH_PARAMS, peak_current_A: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpna_predict_break_risk"].safeParse({
      ...ROUGH_PARAMS, on_time_us: 1_000_000,
    }).success).toBe(false);
  });

  it("wpna_optimize_parameters caps material at 64 chars + thickness at 1000mm", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_optimize_parameters"].safeParse({
      ...ROUGH_PARAMS, material: "X".repeat(100),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpna_optimize_parameters"].safeParse({
      ...ROUGH_PARAMS, thickness_mm: 1001,
    }).success).toBe(false);
  });

  it("wpna_analyze_program caps programContent at 1MB (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["wpna_analyze_program"].safeParse({
      programContent: "G54",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpna_analyze_program"].safeParse({
      programContent: "G54".repeat(500_000), // ~1.5MB
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — prism_dev :: wpna_validate_order", () => {
  it("returns valid + violations + e_codes_found with explicit discriminators", async () => {
    const r = await invokeHandler(devHandler, "wpna_validate_order", {
      ecodes: ["E1221", "E2200"],
    });
    const res = (r as { result: { valid: boolean; violations?: unknown[]; e_codes_found: string[] } }).result;
    expect(typeof res.valid).toBe("boolean");
    // slimResponse drops empty arrays — violations may be undefined if valid path.
    const violations = res.violations ?? [];
    expect(Array.isArray(violations)).toBe(true);
    expect(res.e_codes_found).toEqual(["E1221", "E2200"]);
    expect(r.is_valid).toBe(res.valid);
    expect(r.violation_count).toBe(violations.length);
    expect(r.ecode_count).toBe(res.e_codes_found.length);
  });

  it("empty ecode list returns valid=false + critical missing_pass", async () => {
    const r = await invokeHandler(devHandler, "wpna_validate_order", { ecodes: [] });
    expect(r.is_valid).toBe(false);
    expect(typeof r.critical_violation_count).toBe("number");
    expect((r.critical_violation_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("skim-before-rough flagged as critical violation (last-digit heuristic)", async () => {
    // Engine line 1122-1125 uses LAST-DIGIT detection: rough=ends in 1,
    // skim=ends in 2/3/4/5. E1222 (skim) before E1221 (rough).
    const r = await invokeHandler(devHandler, "wpna_validate_order", {
      ecodes: ["E1222", "E1221"],
    });
    expect(r.is_valid).toBe(false);
    expect((r.critical_violation_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("ROUTING PROOF — wire violation_count equals engine-direct validateOperationOrder()", async () => {
    const ecodes = ["E1221", "E2200", "E2300"];
    const r = await invokeHandler(devHandler, "wpna_validate_order", { ecodes });
    const direct = wedmProgramNeuralAnalysisEngine.validateOperationOrder(ecodes);
    expect(r.violation_count).toBe(direct.violations.length);
    expect(r.is_valid).toBe(direct.valid);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — prism_dev :: wpna_predict_break_risk", () => {
  it("returns risk_score ∈ [0,100] + risk_level enum + factors[]", async () => {
    const r = await invokeHandler(devHandler, "wpna_predict_break_risk", ROUGH_PARAMS);
    const res = (r as { result: { risk_score: number; risk_level: string; factors: unknown[]; mitigations: unknown[] } }).result;
    expect(res.risk_score).toBeGreaterThanOrEqual(0);
    expect(res.risk_score).toBeLessThanOrEqual(100);
    expect(["low", "moderate", "high", "critical"]).toContain(res.risk_level);
    expect(Array.isArray(res.factors)).toBe(true);
    expect(Array.isArray(res.mitigations)).toBe(true);
    expect(r.factor_count).toBe(res.factors.length);
    expect(r.mitigation_count).toBe(res.mitigations.length);
    expect(r.risk_level).toBe(res.risk_level);
  });

  it("has_predicted_breaks discriminator matches optional field presence", async () => {
    const r = await invokeHandler(devHandler, "wpna_predict_break_risk", ROUGH_PARAMS);
    const res = (r as { result: { predicted_breaks_per_hour?: number } }).result;
    expect(r.has_predicted_breaks).toBe(typeof res.predicted_breaks_per_hour === "number");
  });

  it("VARIABILITY — rough vs skim both return valid risk_level", async () => {
    const rRough = await invokeHandler(devHandler, "wpna_predict_break_risk", ROUGH_PARAMS);
    const rSkim = await invokeHandler(devHandler, "wpna_predict_break_risk", SKIM_PARAMS);
    expect(["low", "moderate", "high", "critical"]).toContain(rRough.risk_level);
    expect(["low", "moderate", "high", "critical"]).toContain(rSkim.risk_level);
  });

  it("ROUTING PROOF — wire risk_score equals engine-direct predictWireBreakRisk()", async () => {
    const r = await invokeHandler(devHandler, "wpna_predict_break_risk", ROUGH_PARAMS);
    const direct = wedmProgramNeuralAnalysisEngine.predictWireBreakRisk(ROUGH_PARAMS);
    expect((r as { result: { risk_score: number } }).result.risk_score).toBe(direct.risk_score);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — prism_dev :: wpna_optimize_parameters", () => {
  it("returns original + optimized + changes + improvements", async () => {
    const r = await invokeHandler(devHandler, "wpna_optimize_parameters", ROUGH_PARAMS);
    const res = (r as { result: { original: { e_code: string }; optimized: { e_code: string }; changes?: unknown[]; improvements: { cycle_time_reduction_pct: number } } }).result;
    expect(res.original.e_code).toBe(ROUGH_PARAMS.e_code);
    expect(res.optimized.e_code).toBe(ROUGH_PARAMS.e_code);
    // slimResponse drops empty arrays — changes may be undefined when no
    // bound violations detected (params already optimal).
    const changes = res.changes ?? [];
    expect(Array.isArray(changes)).toBe(true);
    expect(r.change_count).toBe(changes.length);
    expect(r.cycle_time_reduction_pct).toBe(res.improvements.cycle_time_reduction_pct);
  });

  it("VARIABILITY — 3 distinct material/thickness configs all return well-formed", async () => {
    const configs: Array<{ material: string; thickness_mm: number }> = [
      { material: "tool_steel", thickness_mm: 10 },
      { material: "tool_steel", thickness_mm: 50 },
      { material: "tool_steel", thickness_mm: 100 },
    ];
    for (const c of configs) {
      const r = await invokeHandler(devHandler, "wpna_optimize_parameters", {
        ...ROUGH_PARAMS, ...c,
      });
      const res = (r as { result: { confidence: number; optimized: { e_code: string } } }).result;
      expect(res.confidence).toBeGreaterThanOrEqual(0);
      expect(res.confidence).toBeLessThanOrEqual(1);
      expect(res.optimized.e_code).toBe(ROUGH_PARAMS.e_code);
    }
  });

  it("ROUTING PROOF — wire change_count equals engine-direct optimizeParameters().changes.length", async () => {
    const r = await invokeHandler(devHandler, "wpna_optimize_parameters", ROUGH_PARAMS);
    const direct = wedmProgramNeuralAnalysisEngine.optimizeParameters(ROUGH_PARAMS);
    expect(r.change_count).toBe(direct.changes.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — prism_dev :: wpna_analyze_program", () => {
  it("returns ProgramAnalysis with score ∈ [0, 100] + reasoning_chain", async () => {
    const r = await invokeHandler(devHandler, "wpna_analyze_program", {
      programContent: MINIMAL_NC,
      filename: "test.nc",
    });
    const res = (r as { result: { score: number; reasoning_chain: unknown[]; pass_count: number; filename: string } }).result;
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(res.reasoning_chain)).toBe(true);
    expect(res.reasoning_chain.length).toBeGreaterThanOrEqual(1);
    expect(res.filename).toBe("test.nc");
    expect(r.score).toBe(res.score);
    expect(r.pass_count).toBe(res.pass_count);
  });

  it("default filename emitted when not provided", async () => {
    const r = await invokeHandler(devHandler, "wpna_analyze_program", {
      programContent: MINIMAL_NC,
    });
    const res = (r as { result: { filename: string } }).result;
    expect(res.filename.length).toBeGreaterThan(0);
  });

  it("counts match underlying arrays (slimResponse strips empty arrays — nullish-coalesce)", async () => {
    const r = await invokeHandler(devHandler, "wpna_analyze_program", {
      programContent: MINIMAL_NC,
    });
    const res = (r as { result: { anti_patterns?: unknown[]; improvements?: unknown[]; critical_errors?: unknown[]; warnings?: unknown[] } }).result;
    // slimResponse contract drops empty arrays → use ?? [] to recover length.
    expect(r.anti_pattern_count).toBe((res.anti_patterns ?? []).length);
    expect(r.improvement_count).toBe((res.improvements ?? []).length);
    expect(r.critical_error_count).toBe((res.critical_errors ?? []).length);
    expect(r.warning_count).toBe((res.warnings ?? []).length);
  });

  it("DETERMINISM — identical NC content returns identical score + pass_count", async () => {
    const a = await invokeHandler(devHandler, "wpna_analyze_program", { programContent: MINIMAL_NC });
    const b = await invokeHandler(devHandler, "wpna_analyze_program", { programContent: MINIMAL_NC });
    expect(a.score).toBe(b.score);
    expect(a.pass_count).toBe(b.pass_count);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPNA — error envelope", () => {
  it("wpna_validate_order with > 50 ecodes → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpna_validate_order", {
      ecodes: new Array(100).fill("E1221"),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpna_predict_break_risk without e_code → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpna_predict_break_risk", {
      pass_number: 1,
      pass_type: "rough",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpna_optimize_parameters with bad pass_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpna_optimize_parameters", {
      ...ROUGH_PARAMS, pass_type: "INVALID",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpna_analyze_program with empty programContent → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "wpna_analyze_program", {
      programContent: "",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
