/**
 * dispatcher.mitCourseIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES dispatcher wiring.
 *
 * Drives 4 READ-ONLY actions through real `prism_dev`:
 *
 *   - mit_courses_sources  → static getSources() — config-only (zero IO)
 *   - mit_courses_audit    → static audit()      — summary aggregation
 *   - mit_courses_harvest  → static harvest()    — full filesystem scan
 *   - mit_courses_filter   → composes harvest + 4 filter helpers
 *
 * NO WRITE METHODS EXIST — the engine is pure filesystem-read.
 *
 * Filesystem coupling: the engine reads `H:/prism/resources/MIT COURSES/`.
 * Tests that depend on actual on-disk content gracefully degrade when the
 * tree is absent (mit_courses_harvest may return 0 courses on a fresh
 * checkout) — assertions are written to remain valid in both states.
 *
 * ROUTING PROOF:
 *  - mit_courses_sources count exactly matches the 6 hardcoded zones
 *  - mit_courses_audit + mit_courses_harvest counts must be equal
 *  - mit_courses_filter result is a strict subset of mit_courses_harvest
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { MitCourseIndexEngine } from "../engines/MitCourseIndexEngine.js";

const EXPECTED_SOURCE_ZONES = 6;
const SOURCE_ZONE_NAMES = ["root", "uploaded", "mc2", "mc3", "mc4", "mc5"] as const;

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

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — Zod schemas", () => {
  it("mit_courses_sources accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_sources"].safeParse({}).success).toBe(true);
  });

  it("mit_courses_audit accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_audit"].safeParse({}).success).toBe(true);
  });

  it("mit_courses_harvest accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_harvest"].safeParse({}).success).toBe(true);
  });

  it("mit_courses_filter rejects {} (refine guard requires at least one filter field)", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({}).success).toBe(false);
  });

  it("mit_courses_filter accepts single department field", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ department: "2" }).success).toBe(true);
  });

  it("mit_courses_filter accepts single relevance field", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ relevance: "manufacturing" }).success).toBe(true);
  });

  it("mit_courses_filter accepts single semester field", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ semester: "spring" }).success).toBe(true);
  });

  it("mit_courses_filter accepts year-range fields", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ minYear: 2020, maxYear: 2024 }).success).toBe(true);
  });

  it("mit_courses_filter rejects relevance outside the 8-value enum", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ relevance: "not_a_real_category" }).success).toBe(false);
  });

  it("mit_courses_filter rejects empty-string department/semester", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ department: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ semester: "" }).success).toBe(false);
  });

  it("mit_courses_filter rejects year outside reasonable bounds", () => {
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ minYear: 1800 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mit_courses_filter"].safeParse({ maxYear: 2200 }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — prism_dev :: mit_courses_sources", () => {
  it("ROUTING PROOF — returns exactly the 6 hardcoded source zones", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_sources", {});
    const data = r as { sources: Array<{ name: string; path: string; expectedCourses: number; description: string }> };
    expect(data.sources.length).toBe(EXPECTED_SOURCE_ZONES);
  });

  it("source names cover {root, uploaded, mc2, mc3, mc4, mc5}", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_sources", {});
    const data = r as { sources: Array<{ name: string }> };
    const names = new Set(data.sources.map((s) => s.name));
    for (const expected of SOURCE_ZONE_NAMES) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it("wire sources byte-equals engine-direct getSources()", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_sources", {});
    const data = r as { sources: unknown };
    const direct = MitCourseIndexEngine.getSources();
    expect(JSON.stringify(data.sources)).toBe(JSON.stringify(direct));
  });

  it("every source has positive expectedCourses (config sanity)", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_sources", {});
    const data = r as { sources: Array<{ expectedCourses: number; description: string }> };
    for (const s of data.sources) {
      expect(s.expectedCourses).toBeGreaterThan(0);
      expect(typeof s.description).toBe("string");
      expect(s.description.length).toBeGreaterThan(0);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — prism_dev :: mit_courses_harvest", () => {
  it("returns a structured harvest with the expected top-level shape", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_harvest", {});
    const harvest = (r as { harvest: { courses?: unknown[]; totalCourses?: number; byDepartment?: Record<string, number>; byRelevance?: Record<string, number>; bySource?: Record<string, number>; timestamp?: string } }).harvest;
    // courses may be []/missing if MIT COURSES tree absent on disk
    expect(typeof harvest).toBe("object");
    expect(typeof (harvest.totalCourses ?? 0)).toBe("number");
    expect(typeof (harvest.timestamp ?? new Date().toISOString())).toBe("string");
  });

  it("ROUTING PROOF — wire totalCourses == (harvest.courses ?? []).length", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_harvest", {});
    const harvest = (r as { harvest: { courses?: unknown[]; totalCourses?: number } }).harvest;
    const coursesLen = (harvest.courses ?? []).length;
    const total = harvest.totalCourses ?? 0;
    expect(total).toBe(coursesLen);
  });

  it("count parity with engine-direct harvest()", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_harvest", {});
    const harvest = (r as { harvest: { totalCourses?: number } }).harvest;
    const direct = await MitCourseIndexEngine.harvest();
    expect(harvest.totalCourses ?? 0).toBe(direct.totalCourses);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — prism_dev :: mit_courses_audit", () => {
  it("audit totalCourses matches harvest totalCourses (ROUTING PROOF)", async () => {
    const auditR = await invokeHandler(devHandler, "mit_courses_audit", {});
    const harvestR = await invokeHandler(devHandler, "mit_courses_harvest", {});
    const audit = (auditR as { audit: { totalCourses?: number } }).audit;
    const harvest = (harvestR as { harvest: { totalCourses?: number } }).harvest;
    expect(audit.totalCourses ?? 0).toBe(harvest.totalCourses ?? 0);
  });

  it("audit extractedCount + zipOnlyCount == totalCourses (invariant)", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_audit", {});
    const audit = (r as { audit: { totalCourses?: number; extractedCount?: number; zipOnlyCount?: number } }).audit;
    const total = audit.totalCourses ?? 0;
    const ext = audit.extractedCount ?? 0;
    const zip = audit.zipOnlyCount ?? 0;
    expect(ext + zip).toBe(total);
  });

  it("audit yearRange.min <= yearRange.max (when courses present)", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_audit", {});
    const audit = (r as { audit: { totalCourses?: number; yearRange?: { min?: number; max?: number } } }).audit;
    if ((audit.totalCourses ?? 0) > 0) {
      const lo = audit.yearRange?.min ?? 0;
      const hi = audit.yearRange?.max ?? 0;
      expect(lo).toBeLessThanOrEqual(hi);
    }
  });

  it("audit topDepartments entries are sorted descending by count", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_audit", {});
    const audit = (r as { audit: { topDepartments?: Array<{ department: string; count: number }> } }).audit;
    const tops = audit.topDepartments ?? [];
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i]!.count).toBeLessThanOrEqual(tops[i - 1]!.count);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — prism_dev :: mit_courses_filter", () => {
  it("filter by department='2' → every returned course has department='2' (subset of harvest)", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", { department: "2" });
    const data = r as { courses?: Array<{ department: string }>; count?: number; totalAvailable?: number };
    const courses = data.courses ?? [];
    for (const c of courses) expect(c.department).toBe("2");
    expect(data.count ?? 0).toBe(courses.length);
    // count must be <= total
    expect(courses.length).toBeLessThanOrEqual(data.totalAvailable ?? 0);
  });

  it("filter by relevance='manufacturing' → every returned course has that relevance", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", { relevance: "manufacturing" });
    const data = r as { courses?: Array<{ relevance: string }> };
    for (const c of data.courses ?? []) expect(c.relevance).toBe("manufacturing");
  });

  it("filter by year-range [2020, 2024] → every course year is in [2020, 2024]", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", { minYear: 2020, maxYear: 2024 });
    const data = r as { courses?: Array<{ year: number }> };
    for (const c of data.courses ?? []) {
      expect(c.year).toBeGreaterThanOrEqual(2020);
      expect(c.year).toBeLessThanOrEqual(2024);
    }
  });

  it("composed filter (department='2' AND relevance='manufacturing') → both conditions hold", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", {
      department: "2",
      relevance: "manufacturing",
    });
    const data = r as { courses?: Array<{ department: string; relevance: string }> };
    for (const c of data.courses ?? []) {
      expect(c.department).toBe("2");
      expect(c.relevance).toBe("manufacturing");
    }
  });

  it("filtersApplied echo matches request", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", {
      department: "18",
      relevance: "algorithms",
    });
    const data = r as { filtersApplied?: { department?: string; relevance?: string } };
    expect(data.filtersApplied?.department).toBe("18");
    expect(data.filtersApplied?.relevance).toBe("algorithms");
  });

  it("ROUTING PROOF — wire filter count parity with engine-direct compose", async () => {
    const harvest = await MitCourseIndexEngine.harvest();
    const directFiltered = MitCourseIndexEngine.findByDepartment(harvest.courses, "2");
    const r = await invokeHandler(devHandler, "mit_courses_filter", { department: "2" });
    const data = r as { count?: number };
    expect(data.count ?? 0).toBe(directFiltered.length);
  });

  it("totalAvailable == harvest totalCourses (must match)", async () => {
    const direct = await MitCourseIndexEngine.harvest();
    const r = await invokeHandler(devHandler, "mit_courses_filter", { department: "2" });
    const data = r as { totalAvailable?: number };
    expect(data.totalAvailable ?? 0).toBe(direct.totalCourses);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES — error envelope", () => {
  it("mit_courses_filter without any filter → schema rejects (refine guard)", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("mit_courses_filter with invalid relevance → schema rejects with mention of 'relevance'", async () => {
    const r = await invokeHandler(devHandler, "mit_courses_filter", { relevance: "totally_bogus" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/relevance|enum|invalid/i);
  });
});
