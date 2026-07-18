/**
 * intelligenceDispatcher U-WIRE-MIT-COURSE round-trip tests.
 *
 * Validates 14 new prism_intelligence actions wiring two dispatcher-dark MIT-OCW engines:
 *   MITCourseIntegrationEngine (singleton) -> mit_list_courses / mit_get_course /
 *     mit_search_courses / mit_course_algorithms / mit_apply_to_manufacturing /
 *     mit_integration_stats
 *   MITCourseExpansionEngine (static methods on class-as-singleton) ->
 *     mit_expansion_courses / mit_expansion_stats / mit_expansion_formulas /
 *     mit_expansion_tribal_tips / mit_expansion_by_relevance /
 *     mit_expansion_high_relevance_count / mit_expansion_search_topic /
 *     mit_expansion_search_algorithm
 *
 * Pattern: LIVE dispatcher round-trip via registerIntelligenceDispatcher(shim). On success the
 * handler returns content[0].text = JSON.stringify({ action, success:true, ...out }) (the engine
 * payload spread at TOP LEVEL inside the text). On a schema failure validateActionParams (line
 * ~944, ACTION_INTELLIGENCE_SCHEMAS) makes the handler return dispatcherError, whose object
 * carries a TOP-LEVEL { success:false } -- so call() detects failure via that first. The MIT
 * guards return BEFORE the pressure-slimming branch, so the payload is never slimmed (full,
 * deterministic). Both engines are stateless registries over static course data; ids are read
 * from the registry at runtime (self-referential) so no course id is hard-coded.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 13.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-MIT-COURSE
 */

import { describe, it, expect } from "vitest";
import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerIntelligenceDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_intelligence") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  // A handler that surfaces { blocked:true } or an error-without-success is a failure.
  if (parsed && typeof parsed === "object" && (parsed.blocked === true || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("U-WIRE-MIT-COURSE -- MITCourseIntegration + MITCourseExpansion via prism_intelligence", () => {
  it("registers the prism_intelligence tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_intelligence");
    expect(tool?.name).toBe("prism_intelligence");
  });

  // -- MITCourseIntegrationEngine ------------------------------------------
  it("mit_list_courses returns the course registry", async () => {
    const s = newServer();
    const r = await call(s, "mit_list_courses");
    expect(r.ok).toBe(true);
    expect((r.data.courses as unknown[]).length).toBeGreaterThan(0);
  });

  it("mit_list_courses with a valid PPDomain returns a (sub)set of the registry", async () => {
    const s = newServer();
    const all = await call(s, "mit_list_courses");
    const total = (all.data.courses as unknown[]).length;
    const r = await call(s, "mit_list_courses", { domain: "manufacturing" });
    expect(r.ok).toBe(true);
    const filtered = r.data.courses as unknown[];
    expect(Array.isArray(filtered)).toBe(true);
    expect(filtered.length).toBeLessThanOrEqual(total); // a domain filter never widens the set
  });

  it("mit_list_courses invalid domain -> error (schema enum, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "mit_list_courses", { domain: "not-a-real-domain" });
    expect(r.ok).toBe(false);
  });

  it("mit_get_course round-trips a real course id (self-referential)", async () => {
    const s = newServer();
    const list = await call(s, "mit_list_courses");
    const id = (list.data.courses as Array<{ id: string }>)[0]!.id;
    const r = await call(s, "mit_get_course", { courseId: id });
    expect(r.ok).toBe(true);
    expect(r.data.course ?? null).not.toBe(null);
  });

  it("mit_get_course unknown id -> null (?? null)", async () => {
    const s = newServer();
    const r = await call(s, "mit_get_course", { courseId: "no-such-course-zzz" });
    expect(r.ok).toBe(true);
    expect(r.data.course ?? null).toBe(null);
  });

  it("mit_get_course missing courseId -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "mit_get_course", {});
    expect(r.ok).toBe(false);
  });

  it("mit_search_courses by a real course id -> at least that course matches", async () => {
    const s = newServer();
    const list = await call(s, "mit_list_courses");
    const id = (list.data.courses as Array<{ id: string }>)[0]!.id;
    const r = await call(s, "mit_search_courses", { query: id });
    expect(r.ok).toBe(true);
    const res = r.data.result as { query: string; matchCount: number; courses: unknown[] };
    expect(res.query).toBe(id);
    expect(res.matchCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.courses)).toBe(true);
  });

  it("mit_search_courses empty query -> error (schema min(1), failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "mit_search_courses", { query: "" });
    expect(r.ok).toBe(false);
  });

  it("mit_course_algorithms: totalAlgorithms === algorithms.length (self-consistent)", async () => {
    const s = newServer();
    const list = await call(s, "mit_list_courses");
    const id = (list.data.courses as Array<{ id: string }>)[0]!.id;
    const r = await call(s, "mit_course_algorithms", { courseId: id });
    expect(r.ok).toBe(true);
    const ex = r.data.extraction as { algorithms: unknown[]; totalAlgorithms: number; courseId: string };
    expect(typeof ex.courseId).toBe("string");
    expect(ex.totalAlgorithms).toBe((ex.algorithms ?? []).length);
  });

  it("mit_apply_to_manufacturing: unknown course -> confidence 0 (deterministic miss path)", async () => {
    const s = newServer();
    const r = await call(s, "mit_apply_to_manufacturing", { courseId: "no-such-course-zzz", problem: "reduce chatter in a deep pocket" });
    expect(r.ok).toBe(true);
    const app = r.data.application as { problem: string; confidence: number };
    expect(app.problem).toBe("reduce chatter in a deep pocket");
    expect(app.confidence).toBe(0); // 0 survives slimResponse
  });

  it("mit_apply_to_manufacturing missing problem -> error (schema, failure mode)", async () => {
    const s = newServer();
    const list = await call(s, "mit_list_courses");
    const id = (list.data.courses as Array<{ id: string }>)[0]!.id;
    const r = await call(s, "mit_apply_to_manufacturing", { courseId: id });
    expect(r.ok).toBe(false);
  });

  it("mit_integration_stats: totalCourses > 0", async () => {
    const s = newServer();
    const r = await call(s, "mit_integration_stats");
    expect(r.ok).toBe(true);
    const stats = r.data.stats as { totalCourses: number; coveragePercent: number };
    expect(stats.totalCourses).toBeGreaterThan(0);
    expect(typeof stats.coveragePercent).toBe("number");
  });

  // -- MITCourseExpansionEngine (static methods) ---------------------------
  it("mit_expansion_courses returns the supplementary course set", async () => {
    const s = newServer();
    const r = await call(s, "mit_expansion_courses");
    expect(r.ok).toBe(true);
    expect((r.data.courses as unknown[]).length).toBeGreaterThan(0); // EXPANDED_COURSES ships content
  });

  it("mit_expansion_stats: originalCount === 29 (hard constant) + numeric totals", async () => {
    const s = newServer();
    const r = await call(s, "mit_expansion_stats");
    expect(r.ok).toBe(true);
    const st = r.data.stats as { originalCount: number; totalFormulas: number; totalTribalTips: number };
    expect(st.originalCount).toBe(29);
    expect(typeof st.totalFormulas).toBe("number");
    expect(typeof st.totalTribalTips).toBe("number");
  });

  it("mit_expansion_formulas + mit_expansion_tribal_tips return arrays", async () => {
    const s = newServer();
    const f = await call(s, "mit_expansion_formulas");
    expect(f.ok).toBe(true);
    expect(Array.isArray(f.data.formulas ?? [])).toBe(true);
    const t = await call(s, "mit_expansion_tribal_tips");
    expect(t.ok).toBe(true);
    expect(Array.isArray(t.data.tips ?? [])).toBe(true);
  });

  it("mit_expansion_high_relevance_count === mit_expansion_by_relevance('high').length (cross-check)", async () => {
    const s = newServer();
    const c = await call(s, "mit_expansion_high_relevance_count");
    expect(c.ok).toBe(true);
    const count = c.data.count as number;
    expect(typeof count).toBe("number");
    const hi = await call(s, "mit_expansion_by_relevance", { relevance: "high" });
    expect(hi.ok).toBe(true);
    expect((hi.data.courses as unknown[]).length).toBe(count);
  });

  it("mit_expansion_by_relevance invalid enum -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "mit_expansion_by_relevance", { relevance: "extreme" });
    expect(r.ok).toBe(false);
  });

  it("mit_expansion_search_topic round-trips a real topic (self-referential)", async () => {
    const s = newServer();
    const all = await call(s, "mit_expansion_courses");
    const courses = all.data.courses as Array<{ topics: string[]; algorithms: string[] }>;
    const topic = courses.find((c) => c.topics?.length)?.topics[0];
    expect(typeof topic).toBe("string"); // expanded courses carry topics; fail loud if not
    const r = await call(s, "mit_expansion_search_topic", { topic: topic as string });
    expect(r.ok).toBe(true);
    expect((r.data.courses as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it("mit_expansion_search_algorithm returns an array", async () => {
    const s = newServer();
    const r = await call(s, "mit_expansion_search_algorithm", { algorithm: "optimization" });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.courses ?? [])).toBe(true);
  });

  it("mit_expansion_search_topic empty -> error (schema min(1), failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "mit_expansion_search_topic", { topic: "" });
    expect(r.ok).toBe(false);
  });
});
