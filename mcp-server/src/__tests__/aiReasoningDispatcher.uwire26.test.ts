/**
 * aiReasoningDispatcher U-WIRE26 round-trip tests — PeerLearningCoordinatorEngine.
 *
 * Validates peer_broadcast/query/get/size through prism_ai. The engine
 * holds insights in a singleton; tests use unique session ids and unique
 * tags + bracketing summary content to avoid cross-test bleed in the
 * dispatcher singleton (engine-direct tests use fresh class instances).
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE26
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PeerLearningCoordinatorEngine,
  peerLearningCoordinatorEngine,
} from "../engines/PeerLearningCoordinatorEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE26 — engine direct: PeerLearningCoordinatorEngine", () => {
  let engine: PeerLearningCoordinatorEngine;
  beforeEach(() => {
    engine = new PeerLearningCoordinatorEngine();
  });

  it("broadcast() accepts a public insight and returns insightId", () => {
    const r = engine.broadcast({
      fromSession: "sess-a",
      summary: "Aluminum 6061 chip stays connected at high feed",
      tags: ["aluminum", "chip-control"],
      confidence: 0.85,
    });
    expect(r.accepted).toBe(true);
    expect((r.insightId ?? "").length).toBeGreaterThan(0);
    expect(engine.size()).toBe(1);
  });

  it("broadcast() rejects 'private' sensitivity (still 0 stored)", () => {
    const r = engine.broadcast({
      fromSession: "sess-a",
      summary: "Internal-only proprietary trick",
      tags: ["wedm"],
      confidence: 0.9,
      sensitivity: "private",
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/private/i);
    expect(engine.size()).toBe(0);
  });

  it("broadcast() dedups by content hash (case-insensitive, trimmed)", () => {
    const a = engine.broadcast({
      fromSession: "sess-a",
      summary: "Inconel 718 prefers PVD-coated carbide",
      tags: ["inconel"],
      confidence: 0.8,
    });
    const b = engine.broadcast({
      fromSession: "sess-b",
      summary: "  INCONEL 718 prefers PVD-coated carbide  ",
      tags: ["inconel"],
      confidence: 0.95,
    });
    expect(a.accepted).toBe(true);
    expect(b.accepted).toBe(false);
    expect(b.reason).toMatch(/duplicate/i);
    expect(engine.size()).toBe(1);
  });

  it("broadcast() throws on invalid input", () => {
    expect(() =>
      engine.broadcast({ fromSession: "", summary: "x", tags: [], confidence: 0.5 }),
    ).toThrow(/fromSession/i);
    expect(() =>
      engine.broadcast({ fromSession: "s", summary: "  ", tags: [], confidence: 0.5 }),
    ).toThrow(/summary/i);
    expect(() =>
      engine.broadcast({ fromSession: "s", summary: "x", tags: [], confidence: 1.5 }),
    ).toThrow(/confidence/i);
  });

  it("query() filters by minConfidence", () => {
    engine.broadcast({ fromSession: "s1", summary: "high-conf insight", tags: ["t"], confidence: 0.9 });
    engine.broadcast({ fromSession: "s1", summary: "low-conf insight",  tags: ["t"], confidence: 0.3 });
    expect(engine.query({ minConfidence: 0.5 }).length).toBe(1);
    expect(engine.query({ minConfidence: 0 }).length).toBe(2);
  });

  it("query() excludes specific session ids", () => {
    engine.broadcast({ fromSession: "skip-me", summary: "from skip", tags: [], confidence: 0.8 });
    engine.broadcast({ fromSession: "keep-me", summary: "from keep", tags: [], confidence: 0.8 });
    const out = engine.query({ excludeSessionIds: ["skip-me"] });
    expect(out.length).toBe(1);
    expect(out[0].fromSession).toBe("keep-me");
  });

  it("query() includeAnyTag matches if ANY tag overlaps (case-insensitive)", () => {
    engine.broadcast({ fromSession: "s", summary: "wedm ra control", tags: ["WEDM", "Ra"], confidence: 0.8 });
    engine.broadcast({ fromSession: "s", summary: "lathe threading tip", tags: ["lathe"], confidence: 0.8 });
    expect(engine.query({ includeAnyTag: ["wedm"] }).length).toBe(1);
    expect(engine.query({ includeAnyTag: ["LATHE"] }).length).toBe(1);
    expect(engine.query({ includeAnyTag: ["welding"] }).length).toBe(0);
    // Empty tag filter returns all (filter degenerates)
    expect(engine.query({ includeAnyTag: [] }).length).toBe(2);
  });

  it("query() throws on minConfidence outside [0,1]", () => {
    expect(() => engine.query({ minConfidence: -0.1 })).toThrow(/minConfidence/i);
    expect(() => engine.query({ minConfidence: 1.1 })).toThrow(/minConfidence/i);
  });

  it("query() limit caps result size; sort is newest-first by 'at' string", () => {
    engine.broadcast({ fromSession: "s", summary: "older",  at: "2026-01-01T00:00:00Z", tags: [], confidence: 0.8 });
    engine.broadcast({ fromSession: "s", summary: "newer",  at: "2026-04-01T00:00:00Z", tags: [], confidence: 0.8 });
    engine.broadcast({ fromSession: "s", summary: "newest", at: "2026-04-28T00:00:00Z", tags: [], confidence: 0.8 });
    const out = engine.query({ limit: 2 });
    expect(out.length).toBe(2);
    expect(out[0].summary).toBe("newest");
    expect(out[1].summary).toBe("newer");
  });

  it("get() returns the stored insight by id, null otherwise", () => {
    const r = engine.broadcast({ fromSession: "s", summary: "find me by id", tags: [], confidence: 0.7 });
    expect(r.accepted).toBe(true);
    const found = engine.get(r.insightId!);
    expect(found === null).toBe(false);
    expect(found?.summary).toBe("find me by id");
    expect(engine.get("nonexistent-id")).toBe(null);
  });

  it("clear() empties insights AND the dedup hash set (so re-broadcast works after clear)", () => {
    engine.broadcast({ fromSession: "s", summary: "X", tags: [], confidence: 0.5 });
    expect(engine.size()).toBe(1);
    expect(engine.broadcast({ fromSession: "s", summary: "X", tags: [], confidence: 0.5 }).accepted).toBe(false);
    engine.clear();
    expect(engine.size()).toBe(0);
    // After clear, the same content can be re-broadcast
    expect(engine.broadcast({ fromSession: "s", summary: "X", tags: [], confidence: 0.5 }).accepted).toBe(true);
  });
});

describe("U-WIRE26 — schema integrity", () => {
  it("all 4 peer_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of ["peer_broadcast", "peer_query", "peer_get", "peer_size"]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of ["peer_broadcast", "peer_query", "peer_get", "peer_size"]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("peer_broadcast schema rejects empty fromSession/summary, missing tags, bad confidence", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    const base = { fromSession: "s", summary: "x", tags: [], confidence: 0.5 };
    expect(map.peer_broadcast.safeParse({ ...base, fromSession: "" }).success).toBe(false);
    expect(map.peer_broadcast.safeParse({ ...base, summary: "" }).success).toBe(false);
    expect(map.peer_broadcast.safeParse({ ...base, tags: "not-an-array" }).success).toBe(false);
    expect(map.peer_broadcast.safeParse({ ...base, confidence: 1.5 }).success).toBe(false);
    expect(map.peer_broadcast.safeParse(base).success).toBe(true);
  });

  it("peer_broadcast schema rejects unknown sensitivity values", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    const base = { fromSession: "s", summary: "x", tags: [], confidence: 0.5 };
    expect(map.peer_broadcast.safeParse({ ...base, sensitivity: "secret" }).success).toBe(false);
    expect(map.peer_broadcast.safeParse({ ...base, sensitivity: "public" }).success).toBe(true);
  });

  it("peer_query schema accepts empty params and rejects bad minConfidence", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.peer_query.safeParse({}).success).toBe(true);
    expect(map.peer_query.safeParse({ minConfidence: 2 }).success).toBe(false);
    expect(map.peer_query.safeParse({ limit: -1 }).success).toBe(false);
  });

  it("peer_get schema requires a non-empty id", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.peer_get.safeParse({}).success).toBe(false);
    expect(map.peer_get.safeParse({ id: "" }).success).toBe(false);
    expect(map.peer_get.safeParse({ id: "abc" }).success).toBe(true);
  });
});

describe("U-WIRE26 — dispatcher round-trip: prism_ai", () => {
  // Use unique tag namespace per test so the persistent singleton state
  // can't bleed answers between tests.
  const ns = (name: string) => `uwire26-${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  it("peer_broadcast happy path returns accepted=true + insightId", async () => {
    const tag = ns("happy");
    const r = await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "test-sess",
      summary: `${tag} ${Math.random().toString(36).slice(2)}`,  // unique to dodge dedup
      tags: [tag],
      confidence: 0.8,
    });
    expect(r.success).toBe(true);
    const data = r.data as { accepted?: boolean; insightId?: string };
    expect(data.accepted).toBe(true);
    expect((data.insightId ?? "").length).toBeGreaterThan(0);
  });

  it("peer_broadcast → peer_get round-trip preserves the summary", async () => {
    const tag = ns("round_trip");
    const summary = `${tag} round-trip insight ${Math.random().toString(36).slice(2)}`;
    const broadcast = await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "rt-sess",
      summary,
      tags: [tag],
      confidence: 0.9,
    });
    expect(broadcast.success).toBe(true);
    const id = (broadcast.data as { insightId: string }).insightId;

    const got = await executeAIReasoningAction("peer_get" as AIReasoningAction, { id });
    expect(got.success).toBe(true);
    const data = got.data as { insight?: { summary?: string; fromSession?: string } | null };
    expect(data.insight?.summary).toBe(summary);
    expect(data.insight?.fromSession).toBe("rt-sess");
  });

  it("peer_query filters newly broadcast insights by tag", async () => {
    const tag = ns("query_tag");
    const summary = `${tag} unique-content ${Math.random().toString(36).slice(2)}`;
    await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "q-sess",
      summary,
      tags: [tag, "noise"],
      confidence: 0.7,
    });
    const r = await executeAIReasoningAction("peer_query" as AIReasoningAction, {
      includeAnyTag: [tag],
    });
    expect(r.success).toBe(true);
    const data = r.data as { insights?: Array<{ summary: string }>; count?: number };
    expect((data.insights ?? []).map((i) => i.summary).includes(summary)).toBe(true);
    expect(typeof data.count).toBe("number");
  });

  it("peer_size returns a non-negative integer", async () => {
    const r = await executeAIReasoningAction("peer_size" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { size?: number };
    expect(typeof data.size).toBe("number");
    expect((data.size ?? -1)).toBeGreaterThanOrEqual(0);
  });

  it("peer_broadcast FAIL: missing required field → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "s",
      tags: [],
      confidence: 0.5,
      // missing summary
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("peer_broadcast FAIL: confidence out of range → schema rejects", async () => {
    const r = await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "s",
      summary: "valid",
      tags: [],
      confidence: 2.0,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("peer_get FAIL: empty id → schema rejects", async () => {
    const r = await executeAIReasoningAction("peer_get" as AIReasoningAction, { id: "" });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("peer_broadcast 'private' sensitivity returns accepted=false (engine business rule, not schema rejection)", async () => {
    const r = await executeAIReasoningAction("peer_broadcast" as AIReasoningAction, {
      fromSession: "s",
      summary: `${ns("private")} secret ${Math.random()}`,
      tags: [],
      confidence: 0.9,
      sensitivity: "private",
    });
    // success at the dispatcher layer (envelope), but acceptance at the engine layer is false
    expect(r.success).toBe(true);
    const data = r.data as { accepted?: boolean; reason?: string };
    expect(data.accepted).toBe(false);
    expect((data.reason ?? "")).toMatch(/private/i);
  });
});

describe("U-WIRE26 — singleton state continuity", () => {
  it("peerLearningCoordinatorEngine singleton is the same object across imports", async () => {
    const mod = await import("../engines/PeerLearningCoordinatorEngine.js");
    expect(mod.peerLearningCoordinatorEngine).toBe(peerLearningCoordinatorEngine);
  });
});
