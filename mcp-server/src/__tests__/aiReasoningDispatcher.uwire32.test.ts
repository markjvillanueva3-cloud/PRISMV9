/**
 * aiReasoningDispatcher U-WIRE32 round-trip tests — TransferLearningBridgeEngine.
 *
 * Validates analogy_register / analogy_register_many / analogy_find /
 * analogy_inventory through prism_ai. Unlike U-WIRE31's exception engine,
 * this engine has clear() so we can guarantee fresh state per test —
 * makes the cosine/jaccard/cross-domain math fully deterministic.
 *
 * Algorithm (engine source):
 *   score = 0.7 * cosine(tf_query, tf_problem) + 0.3 * jaccard(tags_q, tags_p)
 *   if cross-domain: score *= 1.10
 *
 * Cosine is on lowercased, deduped, stopword-stripped bag-of-words over
 * (title + description + tags). Stopwords list lives inline in the engine.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE32
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  transferLearningBridgeEngine,
  type SolvedProblem,
} from "../engines/TransferLearningBridgeEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = [
  "analogy_register",
  "analogy_register_many",
  "analogy_find",
  "analogy_inventory",
] as const;

/** Seed corpus designed to produce predictable analogies. */
function seedCorpus(): SolvedProblem[] {
  return [
    {
      id: "MILL-001",
      domain: "milling",
      title: "Adaptive spindle speed for chatter avoidance in deep pocket",
      description:
        "Variable RPM modulation suppressed regenerative chatter when finishing deep aluminum pockets",
      tags: ["chatter", "spindle", "adaptive", "finishing"],
      solution: "Apply ±5% sinusoidal RPM variation at 0.5 Hz around stable lobe",
    },
    {
      id: "TURN-001",
      domain: "turning",
      title: "Adaptive spindle modulation for boring chatter",
      description:
        "Variable RPM around stable lobe stopped chatter on long boring bar in steel",
      tags: ["chatter", "spindle", "adaptive", "boring"],
      solution: "Pulse RPM ±3% at 0.3 Hz; mass damper added to bar shank",
    },
    {
      id: "GRIND-001",
      domain: "grinding",
      title: "Wheel dressing schedule for surface finish",
      description: "Frequent dressing improved Ra on hardened steel by 40%",
      tags: ["wheel", "dressing", "surface-finish"],
      solution: "Dress every 8 parts with 0.025mm depth single-point diamond",
    },
    {
      id: "WEDM-001",
      domain: "wire-edm",
      title: "Skim pass strategy for tight tolerance carbide",
      description: "Three skim passes after rough cut held ±0.005mm on carbide die",
      tags: ["skim", "tolerance", "carbide"],
      solution: "Rough -> 2x skim at -50% energy -> 1x finish at -75% energy",
    },
  ];
}

describe("U-WIRE32 — engine direct: TransferLearningBridgeEngine", () => {
  beforeEach(() => {
    // The singleton has clear() — use it for guaranteed test isolation.
    transferLearningBridgeEngine.clear();
  });

  it("register adds one problem and size() reflects it", () => {
    expect(transferLearningBridgeEngine.size()).toBe(0);
    transferLearningBridgeEngine.register(seedCorpus()[0]);
    expect(transferLearningBridgeEngine.size()).toBe(1);
  });

  it("register is idempotent on id (overwrites, not duplicates)", () => {
    const p = seedCorpus()[0];
    transferLearningBridgeEngine.register(p);
    transferLearningBridgeEngine.register(p);
    transferLearningBridgeEngine.register({ ...p, title: "rewritten title" });
    expect(transferLearningBridgeEngine.size()).toBe(1);
    const listed = transferLearningBridgeEngine.list();
    expect(listed[0].title).toBe("rewritten title");
  });

  it("register throws on missing id with descriptive error", () => {
    expect(() =>
      transferLearningBridgeEngine.register({
        id: "",
        domain: "milling",
        title: "x",
        description: "x",
        solution: "x",
      }),
    ).toThrowError(/id required/);
  });

  it("register throws on missing solution", () => {
    expect(() =>
      transferLearningBridgeEngine.register({
        id: "X",
        domain: "milling",
        title: "x",
        description: "x",
        solution: "",
      }),
    ).toThrowError(/solution required/);
  });

  it("registerMany inserts all valid entries; throws on first invalid; partial inserts kept", () => {
    const seeds = seedCorpus();
    const bad: SolvedProblem = {
      id: "BAD-1",
      domain: "milling",
      title: "x",
      description: "",
      solution: "x",
    };
    expect(() =>
      transferLearningBridgeEngine.registerMany([seeds[0], seeds[1], bad, seeds[2]]),
    ).toThrowError(/description required/);
    // First two were inserted before the bad one threw; the fourth never got registered.
    expect(transferLearningBridgeEngine.size()).toBe(2);
  });

  it("findAnalogies on empty corpus throws on empty query and returns [] for non-empty query", () => {
    expect(() => transferLearningBridgeEngine.findAnalogies("")).toThrowError(/description required/);
    expect(transferLearningBridgeEngine.findAnalogies("anything")).toEqual([]);
  });

  it("findAnalogies returns the structurally-similar match across domains for 'adaptive spindle chatter' query", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    const matches = transferLearningBridgeEngine.findAnalogies({
      description: "adaptive spindle chatter on long tool",
      domain: "milling",
      tags: ["chatter", "spindle", "adaptive"],
    });
    expect(matches.length).toBeGreaterThan(0);
    // TURN-001 should be the top cross-domain hit (same tags + cross-domain bonus).
    expect(matches[0].problem.id).toBe("TURN-001");
    expect(matches[0].crossDomain).toBe(true);
    // 0 < cosine ≤ 1 and 0 < jaccard ≤ 1 (high tag overlap).
    expect(matches[0].cosine).toBeGreaterThan(0);
    expect(matches[0].jaccard).toBeGreaterThan(0);
    expect(matches[0].score).toBeGreaterThan(0);
    // Rationale string must report both metrics.
    expect(matches[0].rationale).toContain("cosine=");
    expect(matches[0].rationale).toContain("jaccard=");
    expect(matches[0].rationale).toContain("cross-domain");
  });

  it("findAnalogies score formula matches 0.7*cos + 0.3*jac with 1.10 cross-domain multiplier (within 1e-3)", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    const matches = transferLearningBridgeEngine.findAnalogies({
      description: "adaptive spindle chatter on long tool",
      domain: "milling",
      tags: ["chatter", "spindle", "adaptive"],
    });
    for (const m of matches) {
      const baseline = 0.7 * m.cosine + 0.3 * m.jaccard;
      const expected = m.crossDomain ? baseline * 1.1 : baseline;
      // Engine round4()s each piece, so allow a small tolerance.
      expect(Math.abs(m.score - Math.round(expected * 10000) / 10000)).toBeLessThan(0.001);
    }
  });

  it("findAnalogies crossDomainOnly=true drops same-domain results", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    const matches = transferLearningBridgeEngine.findAnalogies(
      {
        description: "adaptive spindle chatter on long tool",
        domain: "milling",
        tags: ["chatter", "spindle", "adaptive"],
      },
      { crossDomainOnly: true },
    );
    for (const m of matches) {
      expect(m.problem.domain).not.toBe("milling");
      expect(m.crossDomain).toBe(true);
    }
  });

  it("findAnalogies limit=1 returns at most 1; limit=0 returns all matches above minScore", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    const limited = transferLearningBridgeEngine.findAnalogies("chatter spindle adaptive", { limit: 1 });
    expect(limited.length).toBeLessThanOrEqual(1);
    const all = transferLearningBridgeEngine.findAnalogies("chatter spindle adaptive", { limit: 0, minScore: 0 });
    // Without a domain in the query, crossDomain is false everywhere; both
    // chatter problems should appear.
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((m) => m.problem.id === "MILL-001")).toBe(true);
    expect(all.some((m) => m.problem.id === "TURN-001")).toBe(true);
  });

  it("findAnalogies minScore filters out low-similarity matches", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    // High threshold should drop everything except the strongest hits.
    const strict = transferLearningBridgeEngine.findAnalogies("adaptive spindle chatter", { minScore: 0.9 });
    for (const m of strict) {
      expect(m.score).toBeGreaterThanOrEqual(0.9);
    }
    // Permissive threshold should return strictly more matches.
    const loose = transferLearningBridgeEngine.findAnalogies("adaptive spindle chatter", { minScore: 0 });
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);
  });

  it("list returns problems sorted lexicographically by id", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    const ids = transferLearningBridgeEngine.list().map((p) => p.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("clear empties the index and resets size to 0", () => {
    transferLearningBridgeEngine.registerMany(seedCorpus());
    expect(transferLearningBridgeEngine.size()).toBe(seedCorpus().length);
    transferLearningBridgeEngine.clear();
    expect(transferLearningBridgeEngine.size()).toBe(0);
    expect(transferLearningBridgeEngine.list()).toEqual([]);
  });
});

describe("U-WIRE32 — schema integrity", () => {
  it("all 4 analogy_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of NEW_ACTIONS) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions and have safeParse", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of NEW_ACTIONS) {
      const schema = map[a];
      expect(schema === null || schema === undefined).toBe(false);
      expect(typeof (schema as { safeParse?: unknown }).safeParse).toBe("function");
    }
  });

  it("analogy_register requires problem with all five string fields non-empty", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.analogy_register.safeParse({}).success).toBe(false);
    expect(
      map.analogy_register.safeParse({
        problem: { id: "X", domain: "milling", title: "t", description: "d", solution: "s" },
      }).success,
    ).toBe(true);
    // Missing solution
    expect(
      map.analogy_register.safeParse({
        problem: { id: "X", domain: "milling", title: "t", description: "d" },
      }).success,
    ).toBe(false);
    // Empty id (min(1))
    expect(
      map.analogy_register.safeParse({
        problem: { id: "", domain: "milling", title: "t", description: "d", solution: "s" },
      }).success,
    ).toBe(false);
  });

  it("analogy_register accepts optional tags array but rejects non-array tags", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.analogy_register.safeParse({
        problem: { id: "X", domain: "milling", title: "t", description: "d", solution: "s", tags: ["chatter"] },
      }).success,
    ).toBe(true);
    expect(
      map.analogy_register.safeParse({
        problem: { id: "X", domain: "milling", title: "t", description: "d", solution: "s", tags: "chatter" },
      }).success,
    ).toBe(false);
  });

  it("analogy_register_many requires non-empty problems array", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.analogy_register_many.safeParse({}).success).toBe(false);
    expect(map.analogy_register_many.safeParse({ problems: [] }).success).toBe(false);
    expect(
      map.analogy_register_many.safeParse({
        problems: [{ id: "X", domain: "milling", title: "t", description: "d", solution: "s" }],
      }).success,
    ).toBe(true);
  });

  it("analogy_find accepts both string query and structured AnalogyQuery", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.analogy_find.safeParse({ query: "free text" }).success).toBe(true);
    expect(
      map.analogy_find.safeParse({
        query: { description: "x", domain: "milling", tags: ["chatter"] },
      }).success,
    ).toBe(true);
    // Empty string query rejected
    expect(map.analogy_find.safeParse({ query: "" }).success).toBe(false);
    // Structured without description rejected
    expect(map.analogy_find.safeParse({ query: { domain: "milling" } }).success).toBe(false);
    // Missing query entirely rejected
    expect(map.analogy_find.safeParse({}).success).toBe(false);
  });

  it("analogy_find options validates limit≥0, minScore∈[0,1], crossDomainOnly bool", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.analogy_find.safeParse({ query: "x", options: { limit: 5, minScore: 0.1, crossDomainOnly: true } }).success,
    ).toBe(true);
    expect(map.analogy_find.safeParse({ query: "x", options: { limit: -1 } }).success).toBe(false);
    expect(map.analogy_find.safeParse({ query: "x", options: { minScore: 1.5 } }).success).toBe(false);
    expect(map.analogy_find.safeParse({ query: "x", options: { minScore: -0.1 } }).success).toBe(false);
    expect(map.analogy_find.safeParse({ query: "x", options: { limit: 1.5 } }).success).toBe(false);
  });

  it("analogy_inventory accepts empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.analogy_inventory.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE32 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    transferLearningBridgeEngine.clear();
  });

  it("analogy_register happy path → registered:true with size:1", async () => {
    const r = await executeAIReasoningAction("analogy_register" as AIReasoningAction, {
      problem: seedCorpus()[0],
    });
    expect(r.success).toBe(true);
    const data = r.data as { registered?: boolean; id?: string; size?: number };
    expect(data.registered).toBe(true);
    expect(data.id).toBe("MILL-001");
    expect(data.size).toBe(1);
  });

  it("analogy_register on engine.assertValid failure → registered:false with engine error message", async () => {
    // Schema requires min(1) on solution — to reach engine's assertValid throw
    // path we feed a value that survives Zod (one whitespace char) but fails
    // engine's trim()-based check.
    const r = await executeAIReasoningAction("analogy_register" as AIReasoningAction, {
      problem: { id: "X", domain: "milling", title: "t", description: "d", solution: " " },
    });
    expect(r.success).toBe(true);
    const data = r.data as { registered?: boolean; id?: string; error?: string; size?: number };
    expect(data.registered).toBe(false);
    expect(data.id).toBe("X");
    expect((data.error ?? "").toLowerCase()).toContain("required");
  });

  it("analogy_register_many happy path → inserted equals count and size grows accordingly", async () => {
    const corpus = seedCorpus();
    const r = await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, {
      problems: corpus,
    });
    expect(r.success).toBe(true);
    const data = r.data as { registered?: boolean; inserted?: number; size?: number };
    expect(data.registered).toBe(true);
    expect(data.inserted).toBe(corpus.length);
    expect(data.size).toBe(corpus.length);
  });

  it("analogy_register_many partial-insert: bad entry mid-stream surfaces error + inserted count", async () => {
    const corpus = seedCorpus();
    const bad = { id: "BAD-2", domain: "x", title: "x", description: "x", solution: " " };
    const r = await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, {
      problems: [corpus[0], corpus[1], bad, corpus[2]],
    });
    expect(r.success).toBe(true);
    const data = r.data as { registered?: boolean; inserted?: number; size?: number; error?: string };
    expect(data.registered).toBe(false);
    expect(data.inserted).toBe(2); // first two before throw
    expect(data.size).toBe(2);
    expect((data.error ?? "").toLowerCase()).toContain("required");
  });

  it("analogy_find returns ranked matches with metadata for cross-domain query", async () => {
    await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, {
      problems: seedCorpus(),
    });
    const r = await executeAIReasoningAction("analogy_find" as AIReasoningAction, {
      query: {
        description: "adaptive spindle chatter on long tool",
        domain: "milling",
        tags: ["chatter", "spindle", "adaptive"],
      },
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      matches?: Array<{
        problem?: { id?: string; domain?: string };
        score?: number;
        cosine?: number;
        jaccard?: number;
        crossDomain?: boolean;
      }>;
      count?: number;
    };
    const matches = data.matches ?? [];
    expect(matches.length).toBeGreaterThan(0);
    expect(data.count).toBe(matches.length);
    // Top hit is TURN-001 (cross-domain, same tags as MILL-001).
    expect(matches[0].problem?.id).toBe("TURN-001");
    expect(matches[0].crossDomain).toBe(true);
    // Sorted descending by score.
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score!).toBeGreaterThanOrEqual(matches[i].score!);
    }
  });

  it("analogy_find with string query (no domain) returns matches without crossDomain bonus", async () => {
    await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, {
      problems: seedCorpus(),
    });
    const r = await executeAIReasoningAction("analogy_find" as AIReasoningAction, {
      query: "chatter spindle adaptive",
    });
    expect(r.success).toBe(true);
    const data = r.data as { matches?: Array<{ crossDomain?: boolean }>; count?: number };
    const matches = data.matches ?? [];
    expect(matches.length).toBeGreaterThan(0);
    // No query.domain → crossDomain is false everywhere.
    for (const m of matches) {
      expect(m.crossDomain).toBe(false);
    }
  });

  it("analogy_inventory returns sorted problem list + size after batch register", async () => {
    await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, {
      problems: seedCorpus(),
    });
    const r = await executeAIReasoningAction("analogy_inventory" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { problems?: Array<{ id?: string }>; size?: number };
    const problems = data.problems ?? [];
    expect(data.size).toBe(seedCorpus().length);
    expect(problems.length).toBe(seedCorpus().length);
    const ids = problems.map((p) => p.id ?? "");
    expect(ids).toEqual([...ids].sort());
  });

  it("analogy_register FAIL: missing problem → schema rejects", async () => {
    const r = await executeAIReasoningAction("analogy_register" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("analogy_register FAIL: problem with empty id rejected by schema (min(1))", async () => {
    const bad: Record<string, unknown> = {
      problem: { id: "", domain: "milling", title: "t", description: "d", solution: "s" },
    };
    const r = await executeAIReasoningAction("analogy_register" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("analogy_register_many FAIL: empty problems array rejected", async () => {
    const r = await executeAIReasoningAction("analogy_register_many" as AIReasoningAction, { problems: [] });
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("analogy_find FAIL: missing query rejected", async () => {
    const r = await executeAIReasoningAction("analogy_find" as AIReasoningAction, {});
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("analogy_find FAIL: empty string query rejected", async () => {
    const r = await executeAIReasoningAction("analogy_find" as AIReasoningAction, { query: "" });
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("analogy_find FAIL: options.minScore out of [0,1] range rejected", async () => {
    const r = await executeAIReasoningAction("analogy_find" as AIReasoningAction, {
      query: "x",
      options: { minScore: 2 },
    });
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("U-WIRE32 — singleton continuity", () => {
  it("transferLearningBridgeEngine singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/TransferLearningBridgeEngine.js");
    expect(mod.transferLearningBridgeEngine).toBe(transferLearningBridgeEngine);
  });
});
