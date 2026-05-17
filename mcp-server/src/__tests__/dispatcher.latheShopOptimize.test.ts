/**
 * dispatcher.latheShopOptimize.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-LSO dispatcher wiring.
 *
 * Drives 2 new actions through the real `prism_turning` dispatcher:
 *   - lathe_shop_optimize_program  → LatheShopAwareOptimizationEngine.optimizeProgram
 *   - lathe_shop_optimize_customer → LatheShopAwareOptimizationEngine.optimizeCustomerPrograms
 *
 * Verifies (a) Zod schema gates bad input before the engine is reached, and
 * (b) valid inputs reach the engine and produce real OptimizedProgram shapes
 * (machine recommendation, parameter changes, tribal knowledge, safety, etc).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

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

// JM Die-format synthetic lathe program — the underlying parser
// (latheAITrainingEngine.parseProgram) expects the $NAME.MIN%...M2% wrapper
// and NATnn operation prefix used in JM Die's real Mazak/Okuma programs.
// Matches the format that LatheShopAwareOptimizationEngine's engine-direct
// tests use (src/__tests__/LatheShopAwareOptimizationEngine.test.ts:13-47).
const SYNTHETIC_LATHE = `$BUSHING.MIN%
NAT01 (OD ROUGH .032R)
T010101
G50 S1200
G96 S250 M3
G0 X1.5 Z.05 M8
G1 X-.04 F.005
G85 NTURN D.08 U.01 W.005 F.006
G80
G0 X20 Z20
M1

NAT03 (CENTER DRILL)
T030303
G97 S600 M3
G0 X0 Z.1
G1 Z-.15 F.002
G0 X20 Z20
M1

NAT11 (CUTOFF .125)
T111111
G50 S800
G96 S150 M3
G0 X1.5 Z-.5
G1 X-.04 F.0012
G0 X20 Z20
M2%`;

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — Zod schema gates", () => {
  it("lathe_shop_optimize_program schema is registered as a Zod schema", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s).not.toBeNull();
    expect(typeof (s as { safeParse: unknown }).safeParse).toBe("function");
  });

  it("lathe_shop_optimize_customer schema is registered as a Zod schema", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_customer"];
    expect(s).not.toBeNull();
    expect(typeof (s as { safeParse: unknown }).safeParse).toBe("function");
  });

  it("program schema rejects empty object (no content/filepath)", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("program schema rejects empty content string", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s.safeParse({ content: "", filepath: "x.MIN" }).success).toBe(false);
  });

  it("program schema rejects empty filepath string", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s.safeParse({ content: SYNTHETIC_LATHE, filepath: "" }).success).toBe(false);
  });

  it("program schema rejects missing content", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s.safeParse({ filepath: "x.MIN" }).success).toBe(false);
  });

  it("program schema rejects missing filepath", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    expect(s.safeParse({ content: SYNTHETIC_LATHE }).success).toBe(false);
  });

  it("program schema accepts a valid {content, filepath}", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_program"];
    const r = s.safeParse({ content: SYNTHETIC_LATHE, filepath: "BUSHING.MIN" });
    expect(r.success).toBe(true);
  });

  it("customer schema rejects empty programs array", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_customer"];
    expect(s.safeParse({ programs: [] }).success).toBe(false);
  });

  it("customer schema rejects missing programs key", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_customer"];
    expect(s.safeParse({}).success).toBe(false);
  });

  it("customer schema rejects programs[i] missing required fields", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_customer"];
    expect(s.safeParse({ programs: [{ content: "x" }] }).success).toBe(false);
    expect(s.safeParse({ programs: [{ filepath: "x.MIN" }] }).success).toBe(false);
    expect(s.safeParse({ programs: [{ content: "", filepath: "x.MIN" }] }).success).toBe(false);
  });

  it("customer schema accepts a valid 1-program batch", () => {
    const s = TURNING_ACTION_SCHEMAS["lathe_shop_optimize_customer"];
    const r = s.safeParse({ programs: [{ content: SYNTHETIC_LATHE, filepath: "x.MIN" }] });
    expect(r.success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — prism_turning :: lathe_shop_optimize_program", () => {
  it("synthetic lathe gcode → returns raw OptimizedProgram (engine shape, not {success,data} wrapper)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_program", {
      content: SYNTHETIC_LATHE,
      filepath: "BUSHING.MIN",
    });
    // The engine returns OptimizedProgram DIRECTLY. The dispatcher wraps in
    // {content:[{text:JSON.stringify(slimResponse(result))}]}. After parsing,
    // we get the OptimizedProgram fields at the top level — no {success,data}.
    const data = r as {
      original_filepath: string;
      original_score: number;
      optimized_score: number;
      improvement_points: number;
      improvement_percentage: number;
      recommended_machine: string;
      machine_reasoning: string;
      recommended_tooling?: Array<unknown>;
      parameter_changes?: Array<unknown>;
      tribal_knowledge_applied?: Array<string>;
      safety_improvements?: Array<string>;
      estimated_cycle_time_reduction_pct: number;
      optimized_gcode: string;
    };
    // ROUTING PROOF: filepath round-trips → confirms engine actually ran (not a stub)
    expect(data.original_filepath).toBe("BUSHING.MIN");
    // Scores are real numbers in [0,100]
    expect(typeof data.original_score).toBe("number");
    expect(typeof data.optimized_score).toBe("number");
    expect(data.optimized_score).toBeGreaterThanOrEqual(0);
    expect(data.optimized_score).toBeLessThanOrEqual(100);
    // Improvement is a finite number (can be 0 if already optimal)
    expect(typeof data.improvement_points).toBe("number");
    expect(Number.isFinite(data.improvement_points)).toBe(true);
    // Machine recommendation is a real string (one of JM_DIE_LATHES keys)
    expect(typeof data.recommended_machine).toBe("string");
    expect(data.recommended_machine.length).toBeGreaterThan(0);
    expect(typeof data.machine_reasoning).toBe("string");
    expect(data.machine_reasoning.length).toBeGreaterThan(0);
    // Arrays may be stripped by slimResponse when empty; if present, must be arrays.
    // Use the inverse-check pattern: undefined === empty, otherwise must be array.
    if (data.recommended_tooling !== undefined) expect(Array.isArray(data.recommended_tooling)).toBe(true);
    if (data.parameter_changes !== undefined) expect(Array.isArray(data.parameter_changes)).toBe(true);
    if (data.tribal_knowledge_applied !== undefined) expect(Array.isArray(data.tribal_knowledge_applied)).toBe(true);
    if (data.safety_improvements !== undefined) expect(Array.isArray(data.safety_improvements)).toBe(true);
    // Cycle-time reduction is a finite number (slimResponse keeps numeric 0)
    expect(typeof data.estimated_cycle_time_reduction_pct).toBe("number");
    expect(Number.isFinite(data.estimated_cycle_time_reduction_pct)).toBe(true);
    // Optimized gcode is real non-empty text
    expect(typeof data.optimized_gcode).toBe("string");
    expect(data.optimized_gcode.length).toBeGreaterThan(0);
  });

  it("missing content → dispatcher throws (success:false)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_program", {
      filepath: "x.MIN",
    });
    expect(r.success).toBe(false);
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/content|filepath|required/i);
  });

  it("missing filepath → dispatcher throws (success:false)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_program", {
      content: SYNTHETIC_LATHE,
    });
    expect(r.success).toBe(false);
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/content|filepath|required/i);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — prism_turning :: lathe_shop_optimize_customer", () => {
  it("2-program batch → returns {optimized[], summary} (engine shape)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_customer", {
      programs: [
        { content: SYNTHETIC_LATHE, filepath: "PART_A.MIN" },
        { content: SYNTHETIC_LATHE, filepath: "PART_B.MIN" },
      ],
    });
    // Engine returns {optimized, summary} directly — no {success,data} wrapper
    const data = r as {
      optimized: Array<{ original_filepath: string }>;
      summary: {
        total_programs: number;
        avg_original_score: number;
        avg_optimized_score: number;
        total_improvement_points: number;
        total_safety_fixes: number;
        estimated_total_cycle_time_savings_pct: number;
      };
    };
    // Both programs went through — ROUTING PROOF via filepath round-trip
    expect(Array.isArray(data.optimized)).toBe(true);
    expect(data.optimized.length).toBe(2);
    expect(data.optimized[0].original_filepath).toBe("PART_A.MIN");
    expect(data.optimized[1].original_filepath).toBe("PART_B.MIN");
    // Aggregate summary is real numbers
    expect(data.summary.total_programs).toBe(2);
    expect(typeof data.summary.avg_original_score).toBe("number");
    expect(typeof data.summary.avg_optimized_score).toBe("number");
    expect(Number.isFinite(data.summary.total_improvement_points)).toBe(true);
    expect(typeof data.summary.total_safety_fixes).toBe("number");
    expect(data.summary.total_safety_fixes).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(data.summary.estimated_total_cycle_time_savings_pct)).toBe(true);
  });

  it("empty programs array → dispatcher throws (success:false)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_customer", {
      programs: [],
    });
    expect(r.success).toBe(false);
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/programs|non-empty|required/i);
  });

  it("programs[i] missing filepath → dispatcher throws (success:false)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_shop_optimize_customer", {
      programs: [{ content: SYNTHETIC_LATHE }],
    });
    expect(r.success).toBe(false);
    expect(String((r as { error?: unknown }).error ?? "")).toMatch(/filepath|programs|required/i);
  });
});
