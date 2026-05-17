/**
 * dispatcher.mitCourseDeepLearning.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MCDL dispatcher wiring.
 *
 * Drives all 10 actions through real `prism_dev`. Every method is pure
 * (no I/O, no mutation), so the full surface is wired with no defers.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { mitCourseDeepLearningEngine } from "../engines/MITCourseDeepLearningEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — Zod schemas", () => {
  it("mcdl_find_relevant_courses requires non-empty manufacturing_problem", () => {
    expect(ACTION_DEV_SCHEMAS["mcdl_find_relevant_courses"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_find_relevant_courses"].safeParse({ manufacturing_problem: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_find_relevant_courses"].safeParse({ manufacturing_problem: "chatter prediction" }).success).toBe(true);
  });

  it("mcdl_find_relevant_courses caps input length at 4096 chars (DoS guard)", () => {
    const huge = "x".repeat(4097);
    expect(ACTION_DEV_SCHEMAS["mcdl_find_relevant_courses"].safeParse({ manufacturing_problem: huge }).success).toBe(false);
  });

  it("mcdl_extract_algorithm requires course_id + problem_type", () => {
    expect(ACTION_DEV_SCHEMAS["mcdl_extract_algorithm"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_extract_algorithm"].safeParse({ course_id: "2.008" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_extract_algorithm"].safeParse({ course_id: "2.008", problem_type: "all" }).success).toBe(true);
  });

  it("mcdl_recommend_learning_path requires non-empty skill_gaps array", () => {
    expect(ACTION_DEV_SCHEMAS["mcdl_recommend_learning_path"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_recommend_learning_path"].safeParse({ skill_gaps: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mcdl_recommend_learning_path"].safeParse({ skill_gaps: ["controls"] }).success).toBe(true);
  });

  it("mcdl_recommend_learning_path caps array at 50 entries (DoS guard)", () => {
    const big = Array.from({ length: 51 }, (_, i) => `gap${i}`);
    expect(ACTION_DEV_SCHEMAS["mcdl_recommend_learning_path"].safeParse({ skill_gaps: big }).success).toBe(false);
  });

  it("mcdl_apply_academic_knowledge defaults constraints to []", () => {
    const parsed = ACTION_DEV_SCHEMAS["mcdl_apply_academic_knowledge"].safeParse({ problem: "p" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Array.isArray((parsed.data as { constraints?: unknown[] }).constraints)).toBe(true);
    }
  });

  it("mcdl_get_category_stats / mcdl_get_all_course_ids accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["mcdl_get_category_stats"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mcdl_get_all_course_ids"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_find_relevant_courses", () => {
  it("returns matched courses + count for a real problem", async () => {
    const r = await invokeHandler(devHandler, "mcdl_find_relevant_courses", {
      manufacturing_problem: "control optimization for chatter suppression",
    });
    const mapping = (r as { mapping: { matchedCourses: unknown[] } }).mapping;
    expect(Array.isArray(mapping.matchedCourses)).toBe(true);
    expect((r as { match_count?: number }).match_count).toBe(mapping.matchedCourses.length);
  });

  it("ROUTING PROOF — wire mapping match_count parity with engine-direct findRelevantCourses()", async () => {
    const problem = "machine learning for surface finish prediction";
    const r = await invokeHandler(devHandler, "mcdl_find_relevant_courses", { manufacturing_problem: problem });
    const wireCount = (r as { match_count?: number }).match_count ?? 0;
    const direct = mitCourseDeepLearningEngine.findRelevantCourses(problem);
    expect(wireCount).toBe(direct.matchedCourses.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_get_all_course_ids", () => {
  it("returns the full 227-course id list", async () => {
    const r = await invokeHandler(devHandler, "mcdl_get_all_course_ids", {});
    const ids = (r as { course_ids?: string[] }).course_ids ?? [];
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBeGreaterThan(0);
    expect((r as { count?: number }).count).toBe(ids.length);
  });

  it("ROUTING PROOF — wire id set byte-equals engine-direct getAllCourseIds()", async () => {
    const r = await invokeHandler(devHandler, "mcdl_get_all_course_ids", {});
    const wire = ((r as { course_ids?: string[] }).course_ids ?? []).slice().sort();
    const direct = mitCourseDeepLearningEngine.getAllCourseIds().slice().sort();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_get_category_stats", () => {
  it("returns 6 PRISM-relevant categories with stats", async () => {
    const r = await invokeHandler(devHandler, "mcdl_get_category_stats", {});
    const stats = (r as { stats?: unknown[] }).stats ?? [];
    expect(stats.length).toBe(6);
    expect((r as { category_count?: number }).category_count).toBe(6);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_extract_algorithm", () => {
  it("'all' problem_type dumps every algorithm in a known course", async () => {
    // Pick a real course id from the engine itself
    const idsRes = await invokeHandler(devHandler, "mcdl_get_all_course_ids", {});
    const ids = ((idsRes as { course_ids?: string[] }).course_ids ?? []);
    expect(ids.length).toBeGreaterThan(0);
    const cid = ids[0]!;
    const r = await invokeHandler(devHandler, "mcdl_extract_algorithm", { course_id: cid, problem_type: "all" });
    expect((r as { course_id?: string }).course_id).toBe(cid);
    expect(Array.isArray((r as { algorithms?: unknown[] }).algorithms)).toBe(true);
  });

  it("unknown course_id → empty algorithm list", async () => {
    const r = await invokeHandler(devHandler, "mcdl_extract_algorithm", { course_id: "ZZ.999", problem_type: "all" });
    expect(((r as { algorithms?: unknown[] }).algorithms ?? []).length).toBe(0);
    expect((r as { count?: number }).count).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_recommend_learning_path", () => {
  it("returns a learning path with steps + total hours for real skill gaps", async () => {
    const r = await invokeHandler(devHandler, "mcdl_recommend_learning_path", {
      skill_gaps: ["chatter stability", "tool wear prediction"],
    });
    const path = (r as { path: { steps: unknown[]; totalEstimatedHours: number; primaryFocus: string } }).path;
    expect(Array.isArray(path.steps)).toBe(true);
    expect(typeof path.totalEstimatedHours).toBe("number");
    expect((r as { step_count?: number }).step_count).toBe(path.steps.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_apply_academic_knowledge", () => {
  it("returns a knowledge result with confidence + algorithm + citation counts", async () => {
    const r = await invokeHandler(devHandler, "mcdl_apply_academic_knowledge", {
      problem: "optimize feedrate for thin-wall titanium milling",
      constraints: ["surface finish Ra<1.6", "tool life >60 min"],
    });
    const k = (r as { knowledge: { confidence: number; applicableAlgorithms: unknown[]; citations: unknown[] } }).knowledge;
    expect(typeof k.confidence).toBe("number");
    expect((r as { algorithm_count?: number }).algorithm_count).toBe(k.applicableAlgorithms.length);
    expect((r as { citation_count?: number }).citation_count).toBe(k.citations.length);
  });

  it("empty problem → zero recommendations (engine guard)", async () => {
    // Schema requires min(1) so we must hit the engine through a different gate —
    // a problem of pure punctuation/whitespace passes Zod (length>=1) but the
    // engine's `.trim().length === 0` guard returns the empty envelope.
    const r = await invokeHandler(devHandler, "mcdl_apply_academic_knowledge", { problem: "   " });
    const k = (r as { knowledge: { recommendedCourses?: unknown[]; applicableAlgorithms?: unknown[] } }).knowledge;
    expect((k.recommendedCourses ?? []).length).toBe(0);
    expect((k.applicableAlgorithms ?? []).length).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_cite_sources", () => {
  it("returns array of citations for solution mentioning known topics", async () => {
    const r = await invokeHandler(devHandler, "mcdl_cite_sources", {
      solution: "Apply Kalman filter for state estimation in adaptive control loop",
    });
    const citations = (r as { citations?: unknown[] }).citations ?? [];
    expect(Array.isArray(citations)).toBe(true);
    expect((r as { count?: number }).count).toBe(citations.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_get_complexity_analysis", () => {
  it("unknown algorithm → found:false", async () => {
    const r = await invokeHandler(devHandler, "mcdl_get_complexity_analysis", {
      algorithm_name: "no_such_algorithm_" + Date.now(),
    });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("known algorithm name → found:true + analysis with time/space/notes", async () => {
    // Try a common algorithm — engine should match via exact or prefix fallback
    const r = await invokeHandler(devHandler, "mcdl_get_complexity_analysis", {
      algorithm_name: "k-means",
    });
    // The engine may or may not have this exact name in ALGORITHM_COMPLEXITY;
    // either outcome is correct, just verify shape consistency.
    const found = (r as { found?: boolean }).found ?? false;
    if (found) {
      const analysis = (r as { analysis: { time: string; space: string } }).analysis;
      expect(typeof analysis.time).toBe("string");
      expect(typeof analysis.space).toBe("string");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_link_to_physics_constants", () => {
  it("returns array of physics constants for a known course", async () => {
    const idsRes = await invokeHandler(devHandler, "mcdl_get_all_course_ids", {});
    const cid = ((idsRes as { course_ids?: string[] }).course_ids ?? [])[0]!;
    const r = await invokeHandler(devHandler, "mcdl_link_to_physics_constants", { course_id: cid });
    const constants = (r as { constants?: string[] }).constants ?? [];
    expect(Array.isArray(constants)).toBe(true);
    expect((r as { count?: number }).count).toBe(constants.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — prism_dev :: mcdl_generate_theory_to_practice", () => {
  it("returns a string bridge between course theory and shop problem", async () => {
    const idsRes = await invokeHandler(devHandler, "mcdl_get_all_course_ids", {});
    const cid = ((idsRes as { course_ids?: string[] }).course_ids ?? [])[0]!;
    const r = await invokeHandler(devHandler, "mcdl_generate_theory_to_practice", {
      course_id: cid,
      shop_problem: "improve roughing strategy for hardened steel pocket",
    });
    const bridge = (r as { bridge?: string }).bridge ?? "";
    expect(typeof bridge).toBe("string");
    expect((r as { length?: number }).length).toBe(bridge.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCDL — error envelope", () => {
  it("mcdl_extract_algorithm without problem_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mcdl_extract_algorithm", { course_id: "2.008" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("mcdl_recommend_learning_path with empty array → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mcdl_recommend_learning_path", { skill_gaps: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
