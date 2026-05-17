/**
 * dispatcher.profileDeviation.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-PROFDEV dispatcher wiring.
 *
 * Drives 2 read-only ProfileDeviationAnalyzer actions through real `prism_turning`:
 *
 *   - lathe_profile_deviation_analyze → analyze(input)
 *   - lathe_profile_deviation_stats   → getStats()
 *
 * ROUTING PROOF: a synthesized profile with KNOWN deviations (basis is a flat
 * line, measured is a step) produces a known max_positive_deviation_mm. Asserting
 * the wire-side number matches the analytical answer proves the dispatcher
 * actually called the engine (not a stub).
 *
 * SAFETY NOTE: both wired actions are pure compute — no state mutation. The
 * engine is a pure analytical function (CMM-style profile deviation per ASME
 * Y14.5 zone definitions).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { profileDeviationAnalyzerEngine } from "../engines/ProfileDeviationAnalyzerEngine.js";

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

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PROFDEV — Zod schemas", () => {
  it("lathe_profile_deviation_stats schema accepts {} (no params)", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_profile_deviation_stats"].safeParse({}).success).toBe(true);
  });

  it("lathe_profile_deviation_analyze schema accepts a 2-point flat profile", () => {
    const r = TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0.01 }, { x: 10, y: 0.01 }],
      tolerance_mm: 0.05,
    });
    expect(r.success).toBe(true);
  });

  it("lathe_profile_deviation_analyze schema rejects basis with < 2 points", () => {
    const r = TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: 0.05,
    });
    expect(r.success).toBe(false);
  });

  it("lathe_profile_deviation_analyze schema rejects non-positive tolerance", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: 0,
    }).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: -0.01,
    }).success).toBe(false);
  });

  it("lathe_profile_deviation_analyze schema accepts zone_type + best_fit", () => {
    const r = TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: 0.05,
      zone_type: "unilateral_outside",
      best_fit: true,
    });
    expect(r.success).toBe(true);
  });

  it("lathe_profile_deviation_analyze schema rejects illegal zone_type", () => {
    expect(TURNING_ACTION_SCHEMAS["lathe_profile_deviation_analyze"].safeParse({
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: 0.05,
      zone_type: "tri-lateral",
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PROFDEV — prism_turning :: lathe_profile_deviation_stats", () => {
  it("returns {success: true, data: {zones, reference}}", async () => {
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_stats", {});
    const env = r as { success?: boolean; data?: { zones?: string[]; reference?: string } };
    expect(env.success).toBe(true);
    expect(Array.isArray(env.data?.zones)).toBe(true);
    // Engine ships 3 zone types
    expect(env.data?.zones).toContain("bilateral");
    expect(env.data?.zones).toContain("unilateral_outside");
    expect(env.data?.zones).toContain("unilateral_inside");
    expect(typeof env.data?.reference).toBe("string");
    expect((env.data?.reference ?? "").length).toBeGreaterThan(0);
  });

  it("data round-trips identically to direct engine call", async () => {
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_stats", {});
    const env = r as { data?: unknown };
    const direct = profileDeviationAnalyzerEngine.getStats();
    expect(env.data).toEqual(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PROFDEV — prism_turning :: lathe_profile_deviation_analyze", () => {
  it("perfectly-matched flat profile → pass=true, near-zero deviations", async () => {
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", {
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
      tolerance_mm: 0.05,
    });
    const env = r as {
      success?: boolean;
      data?: {
        pass?: boolean;
        max_positive_deviation_mm?: number;
        max_negative_deviation_mm?: number;
        total_evaluated?: number;
        points_in_zone?: number;
      };
    };
    expect(env.success).toBe(true);
    expect(env.data?.pass).toBe(true);
    expect(env.data?.max_positive_deviation_mm).toBe(0);
    expect(env.data?.max_negative_deviation_mm).toBe(0);
    // 3 basis points, all interpolatable from measured
    expect(env.data?.total_evaluated).toBe(3);
    expect(env.data?.points_in_zone).toBe(3);
  });

  it("ROUTING PROOF: measured offset by +0.1 mm → max_positive_deviation_mm === 0.1", async () => {
    // Bilateral tolerance 0.05 → ±0.025 half-zone. A +0.1 measured offset
    // produces a known +0.1 deviation, OUT of zone, pass=false. The exact
    // 0.1 round-trip proves the engine actually ran.
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", {
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
      measured: [{ x: 0, y: 0.1 }, { x: 10, y: 0.1 }, { x: 20, y: 0.1 }],
      tolerance_mm: 0.05,
    });
    const env = r as {
      data?: {
        pass?: boolean;
        max_positive_deviation_mm?: number;
        max_negative_deviation_mm?: number;
        points_out_of_zone?: number;
      };
    };
    expect(env.data?.max_positive_deviation_mm).toBeCloseTo(0.1, 9);
    expect(env.data?.max_negative_deviation_mm).toBe(0);
    expect(env.data?.pass).toBe(false);
    expect(env.data?.points_out_of_zone).toBe(3);
  });

  it("best_fit: true removes constant offset → pass=true", async () => {
    // Same +0.1 offset, but with best_fit the engine subtracts the mean
    // → deviation collapses to ~0 → pass.
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", {
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
      measured: [{ x: 0, y: 0.1 }, { x: 10, y: 0.1 }, { x: 20, y: 0.1 }],
      tolerance_mm: 0.05,
      best_fit: true,
    });
    const env = r as {
      data?: {
        pass?: boolean;
        best_fit_offset_mm?: number;
        max_positive_deviation_mm?: number;
      };
    };
    expect(env.data?.pass).toBe(true);
    // best_fit_offset_mm = mean(y_basis - y_measured) = mean(0 - 0.1) = -0.1
    expect(env.data?.best_fit_offset_mm).toBeCloseTo(-0.1, 9);
  });

  it("unilateral_outside: positive deviation always passes, negative never", async () => {
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", {
      basis: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: -0.02 }, { x: 10, y: -0.02 }],
      tolerance_mm: 0.05,
      zone_type: "unilateral_outside",
    });
    const env = r as { data?: { pass?: boolean; points_out_of_zone?: number } };
    // unilateral_outside: in-zone means dev >= 0 AND dev <= tol.
    // -0.02 is < 0, so out of zone.
    expect(env.data?.pass).toBe(false);
    expect(env.data?.points_out_of_zone).toBeGreaterThan(0);
  });

  it("dispatcher wire matches engine-direct call on every non-trivial field", async () => {
    // NOTE: slimResponse strips null/undefined/empty-array fields, so a strict
    // toEqual against the engine-direct result fails on empty `warnings:[]`.
    // We compare the load-bearing scalar/array fields instead — the slimming
    // is intentional response compression, not a data divergence.
    const input = {
      basis: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }],
      measured: [{ x: 0, y: 0.01 }, { x: 5, y: -0.02 }, { x: 10, y: 0.03 }],
      tolerance_mm: 0.1,
      zone_type: "bilateral" as const,
    };
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", input);
    const env = r as { data?: Record<string, unknown> };
    const direct = profileDeviationAnalyzerEngine.analyze(input);
    // Each load-bearing field round-trips identically:
    expect(env.data?.zone_type).toBe(direct.zone_type);
    expect(env.data?.max_positive_deviation_mm).toBe(direct.max_positive_deviation_mm);
    expect(env.data?.max_negative_deviation_mm).toBe(direct.max_negative_deviation_mm);
    expect(env.data?.rms_deviation_mm).toBe(direct.rms_deviation_mm);
    expect(env.data?.mean_deviation_mm).toBe(direct.mean_deviation_mm);
    expect(env.data?.points_in_zone).toBe(direct.points_in_zone);
    expect(env.data?.points_out_of_zone).toBe(direct.points_out_of_zone);
    expect(env.data?.total_evaluated).toBe(direct.total_evaluated);
    expect(env.data?.pass).toBe(direct.pass);
    expect(env.data?.max_deviation_location).toEqual(direct.max_deviation_location);
    expect(JSON.parse(JSON.stringify(env.data?.deviations))).toEqual(direct.deviations);
  });

  it("schema-fail (basis < 2 points) → dispatcher returns {error, ...} envelope", async () => {
    const r = await invokeHandler(turningHandler, "lathe_profile_deviation_analyze", {
      basis: [{ x: 0, y: 0 }],
      measured: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      tolerance_mm: 0.05,
    });
    // turning dispatcher uses dispatcherError on validation failure
    const data = r as { error?: string; success?: boolean };
    // Either explicit error field OR success === false
    expect(typeof data.error === "string" || data.success === false).toBe(true);
  });
});
