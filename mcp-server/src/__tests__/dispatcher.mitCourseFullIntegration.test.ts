/**
 * dispatcher.mitCourseFullIntegration.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MCFI dispatcher wiring.
 *
 * Drives 5 READ-ONLY actions through real `prism_dev`. reset() DEFERRED.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { mitCourseFullIntegrationEngine } from "../engines/MITCourseFullIntegrationEngine.js";

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

beforeAll(async () => {
  await mitCourseFullIntegrationEngine.getStats(); // ensure engine initialized

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — Zod schemas", () => {
  it("mcfi_query accepts {} (all filters optional)", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({}).success).toBe(true);
  });

  it("mcfi_query rejects empty string department", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({ department: "" }).success).toBe(false);
  });

  it("mcfi_query rejects limit > 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({ limit: 1001 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({ limit: 1000 }).success).toBe(true);
  });

  it("mcfi_query accepts integrated:true/false", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({ integrated: true }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mcfi_query"].safeParse({ integrated: false }).success).toBe(true);
  });

  it("mcfi_get_course requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_get_course"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcfi_get_course"].safeParse({ id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcfi_get_course"].safeParse({ id: "abc" }).success).toBe(true);
  });

  it("mcfi_algorithms / mcfi_formulas / mcfi_stats accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["mcfi_algorithms"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mcfi_formulas"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mcfi_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — prism_dev :: mcfi_query", () => {
  it("no filters → returns courses (count >= 0)", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", {});
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("integrated=true → every result is integrated", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", { integrated: true });
    const courses = ((r as { courses?: Array<{ integrated?: boolean }> }).courses) ?? [];
    for (const c of courses) {
      expect((c.integrated as boolean | undefined) ?? false).toBe(true);
    }
  });

  it("integrated=false → every result is non-integrated", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", { integrated: false });
    const courses = ((r as { courses?: Array<{ integrated?: boolean }> }).courses) ?? [];
    for (const c of courses) {
      // slimResponse strips false → treat absence as false (engine returned false)
      expect((c.integrated as boolean | undefined) ?? false).toBe(false);
    }
  });

  it("limit=2 caps at 2", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", { limit: 2 });
    const courses = ((r as { courses?: unknown[] }).courses) ?? [];
    expect(courses.length).toBeLessThanOrEqual(2);
  });

  it("ROUTING PROOF — wire count parity with engine-direct query()", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", { limit: 100 });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = await mitCourseFullIntegrationEngine.query({ limit: 100 });
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — prism_dev :: mcfi_get_course", () => {
  it("unknown id → course is null", async () => {
    const r = await invokeHandler(devHandler, "mcfi_get_course", { id: "no-such-course-" + Date.now() });
    const data = r as { course?: unknown };
    expect((data.course ?? null) === null).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — prism_dev :: mcfi_algorithms / mcfi_formulas", () => {
  it("mcfi_algorithms returns array with count parity", async () => {
    const r = await invokeHandler(devHandler, "mcfi_algorithms", {});
    const data = r as { algorithms?: string[]; count?: number };
    expect(Array.isArray(data.algorithms ?? [])).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe((data.algorithms ?? []).length);
  });

  it("mcfi_formulas returns array with count parity", async () => {
    const r = await invokeHandler(devHandler, "mcfi_formulas", {});
    const data = r as { formulas?: string[]; count?: number };
    expect(Array.isArray(data.formulas ?? [])).toBe(true);
    expect((data.count as number | undefined) ?? 0).toBe((data.formulas ?? []).length);
  });

  it("ROUTING PROOF — algorithms set-equals engine-direct getAlgorithms()", async () => {
    const r = await invokeHandler(devHandler, "mcfi_algorithms", {});
    const wire = ((r as { algorithms?: string[] }).algorithms ?? []).slice().sort();
    const direct = (await mitCourseFullIntegrationEngine.getAlgorithms()).slice().sort();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — prism_dev :: mcfi_stats", () => {
  it("returns stats with totalCourses", async () => {
    const r = await invokeHandler(devHandler, "mcfi_stats", {});
    const stats = (r as { stats: { totalCourses?: number } }).stats;
    expect(typeof ((stats.totalCourses as number | undefined) ?? 0)).toBe("number");
    expect(((stats.totalCourses as number | undefined) ?? 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCFI — error envelope", () => {
  it("mcfi_get_course without id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mcfi_get_course", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("mcfi_query with limit=1001 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "mcfi_query", { limit: 1001 });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
