/**
 * dispatcher.latheBacktrace.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE turning dispatcher wiring.
 *
 * Drives 2 READ-ONLY actions through real `prism_turning`:
 *   - lathe_backtrace_trace → trace({blocks, failing_block_n, max_depth?})
 *   - lathe_backtrace_stats → getStats() — reference standard
 *
 * Pure functions on the engine (no state mutation); no DEFERRED methods.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { latheProgramBacktraceEngine } from "../engines/LatheProgramBacktraceEngine.js";

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

const SAMPLE_BLOCKS = [
  { n: 10, kind: "tool_change" as const, text: "T0101", params: { tool_id: "T01" } },
  { n: 20, kind: "offset_set" as const, text: "G54", params: { wcs: "G54" } },
  { n: 30, kind: "feed_set" as const, text: "F0.15", params: { feed: 0.15 } },
  { n: 40, kind: "spindle_set" as const, text: "S1200 M3", params: { rpm: 1200 } },
  { n: 50, kind: "motion" as const, text: "G1 X10 Z-5", params: { x: 10, z: -5 } },
  { n: 60, kind: "motion" as const, text: "G1 X10 Z-15", params: { x: 10, z: -15 } },
];

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE — Zod schemas", () => {
  it("lathe_backtrace_stats accepts {}", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_stats"].safeParse({}).success).toBe(true);
  });

  it("lathe_backtrace_trace requires blocks + failing_block_n", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({}).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({ blocks: [] }).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({
      blocks: [{ n: 1, kind: "motion" }], failing_block_n: 1,
    }).success).toBe(true);
  });

  it("lathe_backtrace_trace rejects unknown block kind", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({
      blocks: [{ n: 1, kind: "not_a_kind" }],
      failing_block_n: 1,
    }).success).toBe(false);
  });

  it("lathe_backtrace_trace rejects max_depth > 1000 (DoS guard)", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({
      blocks: [{ n: 1, kind: "motion" }], failing_block_n: 1, max_depth: 1001,
    }).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({
      blocks: [{ n: 1, kind: "motion" }], failing_block_n: 1, max_depth: 1000,
    }).success).toBe(true);
  });

  it("lathe_backtrace_trace rejects negative failing_block_n", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_backtrace_trace"].safeParse({
      blocks: [{ n: 1, kind: "motion" }], failing_block_n: -1,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE — prism_turning :: lathe_backtrace_stats", () => {
  it("returns reference field", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_stats", {});
    const res = r as { success?: boolean; data: { reference: string } };
    expect(res.success).toBe(true);
    expect(typeof res.data.reference).toBe("string");
    expect(res.data.reference.length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire byte-equals engine-direct getStats()", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_stats", {});
    const wire = (r as { data: unknown }).data;
    const direct = latheProgramBacktraceEngine.getStats();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE — prism_turning :: lathe_backtrace_trace", () => {
  it("normal trace from N60 → finds causes from history", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: SAMPLE_BLOCKS, failing_block_n: 60,
    });
    const res = r as { success?: boolean; data: { failing_block_n: number; causes: Array<{ n: number; kind: string; weight: number }>; top_suspect?: { kind: string } } };
    expect(res.success).toBe(true);
    expect(res.data.failing_block_n).toBe(60);
    expect((res.data.causes ?? []).length).toBeGreaterThan(0);
    // Highest-weight kind should be offset_set or tool_change per KIND_WEIGHT table
    if (res.data.top_suspect) {
      expect(["offset_set", "tool_change", "wcs_shift"]).toContain(res.data.top_suspect.kind);
    }
  });

  it("unknown failing_block_n → no causes, has reasoning", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: SAMPLE_BLOCKS, failing_block_n: 999,
    });
    const res = r as { data: { causes?: unknown[]; reasoning?: string[] } };
    expect(((res.data.causes as unknown[] | undefined) ?? []).length).toBe(0);
    expect(((res.data.reasoning ?? []).join(" ")).toLowerCase()).toContain("not found");
  });

  it("max_depth=1 → bounded backtrace", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: SAMPLE_BLOCKS, failing_block_n: 60, max_depth: 1,
    });
    const res = r as { data: { causes?: Array<{ n: number }> } };
    const causes = res.data.causes ?? [];
    // With max_depth=1, only block at index failIdx-1 (N50) should be examined
    for (const c of causes) {
      expect(c.n).toBeGreaterThanOrEqual(50);
      expect(c.n).toBeLessThan(60);
    }
  });

  it("causes are ranked descending by weight", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: SAMPLE_BLOCKS, failing_block_n: 60,
    });
    const causes = (r as { data: { causes?: Array<{ weight: number }> } }).data.causes ?? [];
    for (let i = 1; i < causes.length; i++) {
      expect(causes[i]!.weight).toBeLessThanOrEqual(causes[i - 1]!.weight);
    }
  });

  it("ROUTING PROOF — wire trace shape matches engine-direct", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: SAMPLE_BLOCKS, failing_block_n: 60,
    });
    const wire = (r as { data: { causes?: Array<{ n: number }> } }).data;
    const direct = latheProgramBacktraceEngine.trace({
      blocks: SAMPLE_BLOCKS, failing_block_n: 60,
    });
    expect(((wire.causes as Array<{ n: number }> | undefined) ?? []).length).toBe(direct.causes.length);
  });

  it("VARIABILITY — 3 different failing-block locations all produce valid traces", async () => {
    for (const failing of [20, 40, 60]) {
      const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
        blocks: SAMPLE_BLOCKS, failing_block_n: failing,
      });
      const res = r as { success?: boolean; data: { failing_block_n: number } };
      expect(res.success).toBe(true);
      expect(res.data.failing_block_n).toBe(failing);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE — error envelope", () => {
  it("lathe_backtrace_trace without blocks → schema rejects", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", { failing_block_n: 60 });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("lathe_backtrace_trace with empty blocks → schema rejects", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", { blocks: [], failing_block_n: 1 });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("lathe_backtrace_trace with invalid kind → schema rejects", async () => {
    const r = await invokeHandler(turningHandler, "lathe_backtrace_trace", {
      blocks: [{ n: 1, kind: "totally_invalid" }], failing_block_n: 1,
    });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
