/**
 * dispatcher.latheSequenceOptimize.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-LSO dispatcher wiring (2 actions).
 *
 * Drives both surfaces through the real `prism_turning` dispatcher:
 *   - lathe_sequence_optimize   → optimize()
 *   - lathe_sequence_validate   → validateSequence()
 *
 * The engine-direct suite (`LatheSequenceOptimizerEngine.test.ts`, 18 cases)
 * already proves the hard-constraint + soft-objective semantics. This file
 * pins three additional contracts that ONLY a dispatcher round-trip can
 * verify:
 *   1. Both actions register on the prism_turning Zod enum.
 *   2. The dispatcher wraps the engine result as { success, data }.
 *   3. The `spindle_modes: Map<string, SpindleMode>` returned by the engine
 *      is serialized to a plain object before crossing the JSON wire (a
 *      raw Map would land as `{}` and silently drop every G96/G97 hint).
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

interface OptimizeData {
  operations: Array<{ id: string; type: string }>;
  spindle_modes: Record<string, string>;  // engine emits Map; dispatcher serializes to object
  tool_changes: number;
  thermal_sequencing_active: boolean;
  constraint_violations: string[];
  optimization_score: number;
  reasoning: string[];
}

interface ValidateData {
  violations: string[];
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — both schemas registered", () => {
  it("lathe_sequence_optimize schema is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse).toBe("function");
  });

  it("lathe_sequence_validate schema is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.lathe_sequence_validate.safeParse).toBe("function");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — schema rejection paths", () => {
  it("optimize rejects empty operations array", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [],
    }).success).toBe(false);
  });

  it("optimize rejects unknown operation type", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ id: "X", type: "frobnicate" }],
    }).success).toBe(false);
  });

  it("optimize rejects missing operation id", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ type: "face" }],
    }).success).toBe(false);
  });

  it("optimize rejects empty operation id (min:1)", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ id: "", type: "face" }],
    }).success).toBe(false);
  });

  it("optimize rejects weight outside [0,1]", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ id: "F", type: "face" }],
      constraints: { weight_cycle_time: 1.5 },
    }).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ id: "F", type: "face" }],
      constraints: { weight_tool_life: -0.1 },
    }).success).toBe(false);
  });

  it("optimize accepts a minimal valid payload", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_optimize.safeParse({
      operations: [{ id: "F", type: "face" }],
    }).success).toBe(true);
  });

  it("validate rejects empty operations array", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_validate.safeParse({
      operations: [],
    }).success).toBe(false);
  });

  it("validate accepts a minimal valid payload", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_sequence_validate.safeParse({
      operations: [{ id: "F", type: "face" }],
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — prism_turning :: lathe_sequence_optimize round-trip", () => {
  it("well-formed payload → success:true with sorted operations + no violations", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [
        { id: "P", type: "part_off", tool_number: 11 },
        { id: "RO", type: "rough_od", tool_number: 5 },
        { id: "FO", type: "finish_od", tool_number: 7 },
        { id: "F", type: "face", tool_number: 1 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as OptimizeData;
    expect(data.operations[0]!.id).toBe("F");
    expect(data.operations[data.operations.length - 1]!.id).toBe("P");
    // slimResponse strips empty constraint_violations from the wire. Use the
    // inverse-check pattern documented in dispatcher.lathePartoffSafetyGate.test.ts.
    expect((data.constraint_violations ?? []).length).toBe(0);
  });

  it("serializes spindle_modes Map → plain object on the JSON wire", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [
        { id: "F", type: "face" },
        { id: "D", type: "drill" },
        { id: "T", type: "tap" },
        { id: "P", type: "part_off" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as OptimizeData;
    // CRITICAL: raw Map crosses JSON.stringify as `{}` — engine wrapper MUST
    // expand it to a Record<string, string> for the wire round-trip to work.
    expect(typeof data.spindle_modes).toBe("object");
    expect(data.spindle_modes.F).toBe("G96");
    expect(data.spindle_modes.D).toBe("G97");
    expect(data.spindle_modes.T).toBe("G97");
    expect(data.spindle_modes.P).toBe("G96");
  });

  it("thermal sequencing activates when a tolerance < 0.05mm crosses the wire", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [
        { id: "F", type: "face" },
        { id: "RO", type: "rough_od" },
        { id: "FO", type: "finish_od", tolerance_mm: 0.02 },
        { id: "P", type: "part_off" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as OptimizeData;
    expect(data.thermal_sequencing_active).toBe(true);
  });

  it("optimization_score in [0..1] and reasoning array non-empty", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [
        { id: "F", type: "face", tool_number: 1 },
        { id: "RO", type: "rough_od", tool_number: 5 },
        { id: "FO", type: "finish_od", tool_number: 5 },
        { id: "P", type: "part_off", tool_number: 11 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as OptimizeData;
    expect(data.optimization_score).toBeGreaterThanOrEqual(0);
    expect(data.optimization_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(data.reasoning)).toBe(true);
    expect(data.reasoning.length).toBeGreaterThan(0);
  });

  it("passes through optional constraints to the engine", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [
        { id: "F", type: "face" },
        { id: "FO", type: "finish_od", tolerance_mm: 0.5 },
        { id: "P", type: "part_off" },
      ],
      constraints: { force_thermal_sequencing: true },
    });
    expect(r.success).toBe(true);
    const data = r.data as OptimizeData;
    expect(data.thermal_sequencing_active).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — prism_turning :: lathe_sequence_validate round-trip", () => {
  it("well-formed sequence → success:true + violations:[]", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_validate", {
      operations: [
        { id: "F", type: "face" },
        { id: "CD", type: "center_drill" },
        { id: "D", type: "drill" },
        { id: "R", type: "ream" },
        { id: "RO", type: "rough_od" },
        { id: "FO", type: "finish_od" },
        { id: "TO", type: "thread_od" },
        { id: "P", type: "part_off" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as ValidateData;
    // slimResponse strips empty violations from the wire. Use inverse check.
    expect((data.violations ?? []).length).toBe(0);
  });

  it("part_off followed by another op → violations names the offender", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_validate", {
      operations: [
        { id: "F", type: "face" },
        { id: "P", type: "part_off" },
        { id: "RO", type: "rough_od" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as ValidateData;
    expect(data.violations.some((s) => s.includes("after part_off"))).toBe(true);
  });

  it("rough_od after finish_od is flagged", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_validate", {
      operations: [
        { id: "F", type: "face" },
        { id: "FO", type: "finish_od" },
        { id: "RO", type: "rough_od" },
        { id: "P", type: "part_off" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as ValidateData;
    expect(data.violations.some((s) => s.includes("Rough OD"))).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LSO — dispatcher boundary rejection", () => {
  it("rejects an invalid payload at the dispatcher boundary (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_sequence_optimize", {
      operations: [],  // schema requires min:1
    });
    expect(r.success).not.toBe(true);
  });
});
