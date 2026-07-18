/**
 * aiReasoningDispatcher mit_course_knowledge_query wiring (U-MIT-KNOWLEDGE-QUERY-WIRE).
 *
 * Dark-facade fix: probed query/search/getCourse (none exist on MITCourseKnowledgeEngine)
 * -> always "method not callable". Now routes via a `scope` discriminator (default both)
 * to the real searchAlgorithms / searchCourses, with a non-empty-query crash-guard
 * (the searches do query.toLowerCase() with no guard).
 *
 * NOTE: the dispatcher's slimResponse strips empty arrays, so tests assert on the
 * scope routing + REAL result content (relevanceScore) for queries known to match,
 * rather than on the presence of an empty arm.
 */
import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

type AnyAction = Parameters<typeof executeAIReasoningAction>[0];

describe("aiReasoningDispatcher mit_course_knowledge_query — dark-action fix (real searches)", () => {
  it("default scope=both -> real search results, NOT 'method not callable'", async () => {
    const r = await executeAIReasoningAction("mit_course_knowledge_query" as AnyAction, { query: "sort" });
    expect(JSON.stringify(r).slice(0, 160)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as { query: string; scope: string };
    expect(d.scope).toBe("both");
    expect(d.query).toBe("sort");
    // at least one arm returned a real ranked result (proves searchAlgorithms/searchCourses ran)
    expect(JSON.stringify(r.data)).toMatch(/relevanceScore/);
  });

  it("scope routing is honored (algorithms vs courses select the requested corpus)", async () => {
    const algo = await executeAIReasoningAction("mit_course_knowledge_query" as AnyAction, { query: "sort", scope: "algorithms" });
    expect(algo.success).toBe(true);
    expect((algo.data as { scope: string }).scope).toBe("algorithms");
    const courses = await executeAIReasoningAction("mit_course_knowledge_query" as AnyAction, { query: "algorithms", scope: "courses" });
    expect(courses.success).toBe(true);
    expect((courses.data as { scope: string }).scope).toBe("courses");
    // the course query for "algorithms" matches 6.006 -> a real ranked course result
    expect(JSON.stringify(courses.data)).toMatch(/relevanceScore/);
  });

  it("crash-guard: a missing/empty query is rejected (searches would crash on .toLowerCase())", async () => {
    const r1 = await executeAIReasoningAction("mit_course_knowledge_query" as AnyAction, {});
    expect(r1.success).toBe(false);
    const r2 = await executeAIReasoningAction("mit_course_knowledge_query" as AnyAction, { query: "   " });
    expect(r2.success).toBe(false);
  });
});
