/**
 * dispatcher.consensusRecallCache.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE dispatcher wiring.
 *
 * Drives 2 READ-ONLY actions through real `prism_dev`:
 *
 *   - consensus_cache_recall → engine.recall(prompt, opts)
 *   - consensus_cache_score  → composes recall + scoreCached on the server
 *                              (caller does NOT shuttle CachedConsensus over the wire)
 *
 * No write methods exist on this engine. The persistence write path lives
 * on ConsensusObsidianPersistenceEngine (already wired elsewhere); this
 * test uses it to set up hermetic cache-hit fixtures in a temp wikiRoot.
 *
 * ROUTING PROOF:
 *  - Wire miss returns {hit:false}; wire hit returns {hit:true, cached:{...}}
 *  - Wire hit.cached.promptHash == persist().promptHash (engine reuses
 *    the single-source-of-truth hash function)
 *  - Wire score == engine-direct scoreCached(engine.recall(...))
 *
 * Hermetic: every test uses a fresh tmpdir for wikiRoot (no PRISM-state leak).
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { ConsensusRecallCacheEngine } from "../engines/ConsensusRecallCacheEngine.js";
import {
  consensusObsidianPersistenceEngine,
  type ConsensusResultLike,
} from "../engines/ConsensusObsidianPersistenceEngine.js";

const PROMPT = "What is the canonical Kienzle coefficient for 1018 steel?";

function fakeResult(rec: "accept" | "review" | "escalate" = "accept"): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "kc1.1 = 1800 N/mm² for ISO P group", latencyMs: 1000, tokens: 50, error: null },
    ],
    successCount: 1,
    agreementScore: 0.85,
    consensus: { answer: "kc1.1 = 1800 N/mm² for ISO P group", voters: ["gpt-5.5"], confidence: 0.85 },
    recommendation: rec,
    totalLatencyMs: 5000,
    factCheck: {},
  };
}

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
let tmpRoot: string;

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-wire-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — Zod schemas", () => {
  it("consensus_cache_recall requires non-empty prompt", () => {
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({ prompt: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({ prompt: "hello" }).success).toBe(true);
  });

  it("consensus_cache_recall rejects negative ttlMs", () => {
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", ttlMs: -1,
    }).success).toBe(false);
  });

  it("consensus_cache_recall rejects ttlMs > 90 days (DoS guard)", () => {
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", ttlMs: NINETY_DAYS_MS + 1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", ttlMs: NINETY_DAYS_MS,
    }).success).toBe(true);
  });

  it("consensus_cache_recall accepts enforceTtl boolean", () => {
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", enforceTtl: false,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", enforceTtl: "no",
    }).success).toBe(false);
  });

  it("consensus_cache_score requires non-empty prompt", () => {
    expect(ACTION_DEV_SCHEMAS["consensus_cache_score"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_score"].safeParse({ prompt: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["consensus_cache_score"].safeParse({ prompt: "x" }).success).toBe(true);
  });

  it("consensus_cache_recall rejects empty-string wikiRoot", () => {
    expect(ACTION_DEV_SCHEMAS["consensus_cache_recall"].safeParse({
      prompt: "x", wikiRoot: "",
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — prism_dev :: consensus_cache_recall (miss path)", () => {
  it("never-persisted prompt → hit:false (slimResponse-safe explicit discriminator)", async () => {
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: "never persisted prompt " + Date.now(),
      wikiRoot: tmpRoot,
    });
    expect(r.hit).toBe(false);
  });

  it("cache directory absent → still hit:false (no error, no throw)", async () => {
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: PROMPT,
      wikiRoot: path.join(tmpRoot, "does-not-exist"),
    });
    expect(r.hit).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — prism_dev :: consensus_cache_recall (hit path)", () => {
  it("after persist → hit:true with cached payload matching what was persisted", async () => {
    const persistRes = consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult("accept"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: PROMPT,
      wikiRoot: tmpRoot,
    });
    expect(r.hit).toBe(true);
    const cached = r.cached as { promptHash: string; sha8: string; recommendation: string; agreementScore: number; modelVoters: string[]; cached: boolean };
    expect(cached.promptHash).toBe(persistRes.promptHash);
    expect(cached.sha8).toBe(persistRes.promptHash.slice(0, 8));
    expect(cached.recommendation).toBe("accept");
    expect(cached.agreementScore).toBe(0.85);
    expect(JSON.stringify(cached.modelVoters)).toBe(JSON.stringify(["gpt-5.5"]));
    expect(cached.cached).toBe(true);
  });

  it("ROUTING PROOF — wire payload byte-equals engine-direct recall result", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult("review"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: PROMPT, wikiRoot: tmpRoot,
    });
    const wireCached = r.cached as Record<string, unknown>;

    const directEngine = new ConsensusRecallCacheEngine();
    const directHit = directEngine.recall(PROMPT, { wikiRoot: tmpRoot });
    expect(directHit).not.toBe(null);
    // Per-field equality on the load-bearing fields (ageMs varies between calls
    // — wire snapshot was taken first, then engine-direct read milliseconds
    // later, so ageMs ≠. Validate every OTHER field byte-for-byte.)
    expect(wireCached.promptHash).toBe(directHit!.promptHash);
    expect(wireCached.sha8).toBe(directHit!.sha8);
    expect(wireCached.recommendation).toBe(directHit!.recommendation);
    expect(wireCached.agreementScore).toBe(directHit!.agreementScore);
    // slimResponse strips null → both sides nullish-coalesce to null for parity
    expect((wireCached.meanFactuality as unknown) ?? null).toBe(directHit!.meanFactuality ?? null);
    expect(JSON.stringify(wireCached.modelVoters)).toBe(JSON.stringify(directHit!.modelVoters));
    expect(wireCached.answer).toBe(directHit!.answer);
    expect(wireCached.body).toBe(directHit!.body);
  });

  it("ttlMs=1ms + enforceTtl=true → hit:false despite the file existing (TTL gate works)", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    // Wait > 1 ms to ensure the file is "stale"
    await new Promise((resolve) => setTimeout(resolve, 5));
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: PROMPT, wikiRoot: tmpRoot, ttlMs: 1, enforceTtl: true,
    });
    expect(r.hit).toBe(false);
  });

  it("ttlMs=1ms + enforceTtl=false → hit:true (TTL ignored when enforceTtl=false)", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {
      prompt: PROMPT, wikiRoot: tmpRoot, ttlMs: 1, enforceTtl: false,
    });
    expect(r.hit).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — prism_dev :: consensus_cache_score", () => {
  it("miss → hit:false AND score=0 (slimResponse strips 0 — fall back via nullish-coalesce)", async () => {
    const r = await invokeHandler(devHandler, "consensus_cache_score", {
      prompt: "never persisted score test " + Date.now(),
      wikiRoot: tmpRoot,
    });
    expect(r.hit).toBe(false);
    expect((r.score as number | undefined) ?? 0).toBe(0);
  });

  it("hit accept+0.85 agreement → score > 0 AND score <= 1 (composite formula upper-bound)", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult("accept"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = await invokeHandler(devHandler, "consensus_cache_score", {
      prompt: PROMPT, wikiRoot: tmpRoot,
    });
    expect(r.hit).toBe(true);
    const score = r.score as number;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("hit escalate < hit review < hit accept (composite ordering on identical agreement)", async () => {
    const acceptRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-wire-accept-"));
    const reviewRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-wire-review-"));
    const escalateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-wire-escalate-"));
    try {
      for (const [rec, root] of [["accept", acceptRoot], ["review", reviewRoot], ["escalate", escalateRoot]] as const) {
        consensusObsidianPersistenceEngine.persist({
          prompt: PROMPT,
          result: fakeResult(rec),
          wikiRoot: root,
          obsidianVaultRoot: null,
        });
      }
      const acceptR = await invokeHandler(devHandler, "consensus_cache_score", { prompt: PROMPT, wikiRoot: acceptRoot });
      const reviewR = await invokeHandler(devHandler, "consensus_cache_score", { prompt: PROMPT, wikiRoot: reviewRoot });
      const escalateR = await invokeHandler(devHandler, "consensus_cache_score", { prompt: PROMPT, wikiRoot: escalateRoot });
      const a = acceptR.score as number;
      const rv = reviewR.score as number;
      const e = escalateR.score as number;
      expect(a).toBeGreaterThan(rv);
      expect(rv).toBeGreaterThan(e);
    } finally {
      for (const r of [acceptRoot, reviewRoot, escalateRoot]) {
        try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    }
  });

  it("ROUTING PROOF — wire score equals engine-direct scoreCached(recall())", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      result: fakeResult("accept"),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = await invokeHandler(devHandler, "consensus_cache_score", { prompt: PROMPT, wikiRoot: tmpRoot });
    const wireScore = r.score as number;

    const directEngine = new ConsensusRecallCacheEngine();
    const directHit = directEngine.recall(PROMPT, { wikiRoot: tmpRoot });
    expect(directHit).not.toBe(null);
    const directScore = directEngine.scoreCached(directHit!);
    // Both wire-side recall and direct recall happened ms apart so ageMs differs
    // by the test's elapsed time. Recency-decay is exp(-ageDays/14) — for a
    // millisecond delta, the difference in the final 4-decimal-rounded score
    // is bounded by ~1e-9, well under the rounded precision.
    expect(Math.abs(wireScore - directScore)).toBeLessThan(0.0001);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE — error envelope", () => {
  it("consensus_cache_recall without prompt → schema rejects with mention of 'prompt'", async () => {
    const r = await invokeHandler(devHandler, "consensus_cache_recall", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/prompt/i);
  });

  it("consensus_cache_score without prompt → schema rejects with mention of 'prompt'", async () => {
    const r = await invokeHandler(devHandler, "consensus_cache_score", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/prompt/i);
  });
});
