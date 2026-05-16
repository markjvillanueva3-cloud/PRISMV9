/**
 * dispatcher.lathePartoffSafetyGate.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-PARTOFF dispatcher wiring (SAFETY-CRITICAL).
 *
 * Drives the new action through the real `prism_turning` dispatcher:
 *   - lathe_partoff_safety_gate → LathePartoffSafetyRailEngine.evaluate
 *
 * Mirrors the dispatcher.turningInspectionPlan.test.ts stub-server pattern.
 * Every assertion pins a concrete reference value derived from the engine's
 * declared thresholds (Sandvik parting guide + Machinery's Handbook 31st ed.).
 *
 * SAFETY-CRITICAL CONTRACT being asserted:
 *   - The dispatcher wraps verdict.passed as result.success → callers can
 *     short-circuit on BLOCKED without parsing the verdict body.
 *   - Zod schema rejects every non-positive numeric AND every unknown enum
 *     value at the dispatcher boundary, so the engine never sees bad inputs.
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

interface Gate {
  name: string;
  severity: "hard_block" | "warn" | "info";
  passed: boolean;
  value?: number;
  threshold?: number;
  note?: string;
}
interface Verdict {
  passed: boolean;
  gates: Gate[];
  violations: Gate[];
  advisories: Gate[];
  summary: string;
}

function safePayload(): Record<string, unknown> {
  return {
    part_diameter_mm: 25,
    parting_width_mm: 3,
    tool_overhang_mm: 6,
    spindle_rpm: 1000,
    feed_mm_per_rev: 0.08,
    material_uts_mpa: 500,
    workholding_type: "chuck",
    chip_clearance_mm: 9,
    has_subspindle_purge: false,
    chip_breaker: "none",
  };
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PARTOFF — lathe_partoff_safety_gate schema gate", () => {
  const schema = TURNING_ACTION_SCHEMAS["lathe_partoff_safety_gate"];

  it("is registered as a usable Zod schema", () => {
    expect(typeof schema.safeParse).toBe("function");
  });

  it("accepts the all-green payload", () => {
    expect(schema.safeParse(safePayload()).success).toBe(true);
  });

  it("rejects empty params (every numeric / enum field is required)", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects negative part_diameter_mm", () => {
    expect(schema.safeParse({ ...safePayload(), part_diameter_mm: -1 }).success).toBe(false);
  });

  it("rejects zero feed_mm_per_rev (must be strictly positive)", () => {
    expect(schema.safeParse({ ...safePayload(), feed_mm_per_rev: 0 }).success).toBe(false);
  });

  it("rejects an unknown workholding_type", () => {
    expect(schema.safeParse({ ...safePayload(), workholding_type: "magnetic" }).success).toBe(false);
  });

  it("rejects an unknown chip_breaker enum", () => {
    expect(schema.safeParse({ ...safePayload(), chip_breaker: "diamond" }).success).toBe(false);
  });

  it("rejects has_subspindle_purge typed as a string", () => {
    expect(schema.safeParse({ ...safePayload(), has_subspindle_purge: "false" }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PARTOFF — prism_turning :: lathe_partoff_safety_gate round-trip", () => {
  it("all-green payload → success:true, verdict.passed=true, every gate passes", async () => {
    const r = await invokeHandler(turningHandler, "lathe_partoff_safety_gate", safePayload());
    expect(r.success).toBe(true);
    const v = r.data as Verdict;
    expect(v.passed).toBe(true);
    expect(v.gates.length).toBe(7);
    // slimResponse strips empty violations/advisories arrays from the wire.
    // Semantic carriers that DO survive: gates[].passed + summary.
    expect(v.gates.every((g) => g.passed)).toBe(true);
    expect(v.summary).toBe("All parting-off safety gates passed.");
  });

  it("hard_block tool overhang → success:false (verdict.passed=false propagates to result.success)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_partoff_safety_gate", {
      ...safePayload(),
      tool_overhang_mm: 15,  // 15/3 = 5.0 > 4.0 hard_block
    });
    expect(r.success).toBe(false);
    const v = r.data as Verdict;
    expect(v.passed).toBe(false);
    expect(v.violations.some((g) => g.name === "tool_overhang_ratio" && g.severity === "hard_block")).toBe(true);
    expect(v.summary.startsWith("BLOCKED")).toBe(true);
  });

  it("warn-only payload → success:true (verdict.passed=true) with populated advisories", async () => {
    const r = await invokeHandler(turningHandler, "lathe_partoff_safety_gate", {
      ...safePayload(),
      feed_mm_per_rev: 0.18,  // warn band 0.12 < x ≤ 0.25
    });
    expect(r.success).toBe(true);
    const v = r.data as Verdict;
    expect(v.passed).toBe(true);
    expect(v.advisories.length).toBe(1);
    expect(v.advisories[0]!.name).toBe("feed_per_rev");
    expect(v.advisories[0]!.severity).toBe("warn");
  });

  it("multi-hard-block payload → success:false, summary names every blocking gate", async () => {
    const r = await invokeHandler(turningHandler, "lathe_partoff_safety_gate", {
      ...safePayload(),
      tool_overhang_mm: 15,    // hard_block
      feed_mm_per_rev: 0.30,   // hard_block
      chip_clearance_mm: 1,    // hard_block (1/3 ≈ 0.33 < 1.5)
    });
    expect(r.success).toBe(false);
    const v = r.data as Verdict;
    expect(v.passed).toBe(false);
    expect(v.summary).toContain("BLOCKED by 3 hard gate(s)");
    expect(v.summary).toContain("tool_overhang_ratio");
    expect(v.summary).toContain("feed_per_rev");
    expect(v.summary).toContain("chip_clearance");
  });

  it("rejects an invalid payload at the dispatcher boundary (success != true)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_partoff_safety_gate", {
      ...safePayload(),
      part_diameter_mm: -5,
    });
    expect(r.success).not.toBe(true);
  });
});
