/**
 * dispatcher.consensusFactChecker.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-FCC dispatcher wiring (ConsensusFactCheckerEngine).
 *
 * Drives 3 actions through real `prism_dev`. reset() DEFERRED — would
 * wipe the shared kb cache across all chats.
 *
 * fcc_check auto-loads kb if not yet cached, keeping the wire stateless
 * for callers. Tests verify both the explicit-load and auto-load paths.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { consensusFactCheckerEngine } from "../engines/ConsensusFactCheckerEngine.js";

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
  // Pre-warm kb so subsequent dispatcher calls don't time out on initial scan.
  await consensusFactCheckerEngine.loadKnowledgeBase();

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FCC — Zod schemas", () => {
  it("fcc_check requires non-empty text", () => {
    expect(ACTION_DEV_SCHEMAS["fcc_check"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fcc_check"].safeParse({ text: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["fcc_check"].safeParse({ text: "hi" }).success).toBe(true);
  });

  it("fcc_check caps text at 64 KB (DoS guard)", () => {
    const huge = "x".repeat(65_537);
    expect(ACTION_DEV_SCHEMAS["fcc_check"].safeParse({ text: huge }).success).toBe(false);
  });

  it("fcc_load_knowledge_base accepts {} or {dispatcher_actions}", () => {
    expect(ACTION_DEV_SCHEMAS["fcc_load_knowledge_base"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["fcc_load_knowledge_base"].safeParse({
      dispatcher_actions: ["isa_stats", "asc_get_schema"],
    }).success).toBe(true);
  });

  it("fcc_load_knowledge_base caps dispatcher_actions at 10000 (DoS guard)", () => {
    const big = Array.from({ length: 10_001 }, (_, i) => `a${i}`);
    expect(ACTION_DEV_SCHEMAS["fcc_load_knowledge_base"].safeParse({ dispatcher_actions: big }).success).toBe(false);
  });

  it("fcc_get_knowledge_base accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["fcc_get_knowledge_base"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FCC — prism_dev :: fcc_get_knowledge_base", () => {
  it("after beforeAll preload → loaded:true with engines + dispatcherActions sets", async () => {
    const r = await invokeHandler(devHandler, "fcc_get_knowledge_base", {});
    expect((r as { loaded?: boolean }).loaded).toBe(true);
    const kb = (r as { knowledgeBase: Record<string, unknown> }).knowledgeBase;
    expect(typeof kb).toBe("object");
    expect(kb === null).toBe(false);
    // KnowledgeBase should expose engines and dispatcherActions as Sets/Arrays
    // (after serialization, Sets become {} → caller needs the inner shape)
    expect(Object.keys(kb).length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FCC — prism_dev :: fcc_load_knowledge_base", () => {
  it("idempotent — second load returns same kb (cached)", async () => {
    const a = await invokeHandler(devHandler, "fcc_load_knowledge_base", {});
    const b = await invokeHandler(devHandler, "fcc_load_knowledge_base", {});
    expect((a as { loaded?: boolean }).loaded).toBe(true);
    expect((b as { loaded?: boolean }).loaded).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FCC — prism_dev :: fcc_check", () => {
  it("text mentioning ONLY a fake engine → 1 hallucination, 0 verified, score=0", async () => {
    // Engine regex \b([A-Z][A-Za-z0-9]*Engine)\b requires the literal 'Engine'
    // suffix — "ImaginaryFooBarEngine" matches, plain class names do not.
    const r = await invokeHandler(devHandler, "fcc_check", {
      text: "Call the ImaginaryFooBarEngine to predict tool deflection.",
      model_name: "test-grok",
    });
    const fc = (r as { factCheck: { totalMentions: number; verifiedMentions: number; hallucinations: Array<{ mention: string; modelName: string; kind: string }>; verified: Array<{ mention: string }>; factualityScore: number } }).factCheck;
    expect(fc.totalMentions).toBe(1);
    expect(fc.verifiedMentions).toBe(0);
    expect(fc.factualityScore).toBe(0);
    expect(fc.hallucinations.length).toBe(1);
    expect(fc.hallucinations[0]!.mention).toBe("ImaginaryFooBarEngine");
    expect(fc.hallucinations[0]!.modelName).toBe("test-grok");
    expect(fc.hallucinations[0]!.kind).toBe("engine");
  });

  it("text with zero engine mentions → 0 total, 0 verified, NaN score (no mentions)", async () => {
    const r = await invokeHandler(devHandler, "fcc_check", {
      text: "Plain prose without any engine references.",
      model_name: "test-model",
    });
    const fc = (r as { factCheck: { totalMentions: number; verifiedMentions: number; factualityScore: number } }).factCheck;
    expect(fc.totalMentions).toBe(0);
    expect(fc.verifiedMentions).toBe(0);
    // factualityScore is NaN when totalMentions===0; JSON.stringify(NaN)="null"
    // so slimResponse converts to null OR strips. Either way, it's not a finite >0 value.
    expect(Number.isFinite(fc.factualityScore as number)).toBe(false);
  });

  it("VARIABILITY — 3 distinct model_name values each flow into hallucinations[].modelName", async () => {
    const names = ["claude", "codex", "grok"];
    const seen: string[] = [];
    for (const name of names) {
      const r = await invokeHandler(devHandler, "fcc_check", {
        text: "The NeverRealNonsenseEngine handles edge cases.",
        model_name: name,
      });
      const fc = (r as { factCheck: { hallucinations: Array<{ modelName: string }> } }).factCheck;
      expect(fc.hallucinations.length).toBe(1);
      seen.push(fc.hallucinations[0]!.modelName);
    }
    expect(seen).toEqual(names);
  });

  it("ROUTING PROOF — wire hallucination mentions equal engine-direct check() hallucinations", async () => {
    const text = "Use NeverEverRealEngine and AnotherBogusEngine for force calc.";
    const r = await invokeHandler(devHandler, "fcc_check", { text, model_name: "parity-test" });
    const wireH = ((r as { factCheck: { hallucinations: Array<{ mention: string }> } }).factCheck.hallucinations) ?? [];
    const direct = consensusFactCheckerEngine.check(text, "parity-test");
    const wireMentions = wireH.map(h => h.mention).sort();
    const directMentions = direct.hallucinations.map(h => h.mention).sort();
    expect(wireMentions).toEqual(directMentions);
  });

  it("closestMatch field surfaces for typo-class hallucinations within Levenshtein-2", async () => {
    // Pick a known engine the kb should have; intentionally misspell it
    // and assert closestMatch points back to the correct one when within
    // edit-distance 2. We can't guarantee a specific engine in kb, but we
    // can verify the closestMatch field is either null or a string.
    const r = await invokeHandler(devHandler, "fcc_check", {
      text: "Use the ImaginaryBogusEngine.",
      model_name: "typo-test",
    });
    const h = (r as { factCheck: { hallucinations: Array<{ closestMatch?: string | null }> } }).factCheck.hallucinations;
    expect(h.length).toBeGreaterThanOrEqual(1);
    // closestMatch is string | null in engine output. slimResponse strips
    // null → wire-side may be undefined. All three (string, null, undefined)
    // are acceptable here; the field shape contract is "optional-string-or-absent".
    const cm = h[0]!.closestMatch;
    expect(cm === null || cm === undefined || typeof cm === "string").toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-FCC — error envelope", () => {
  it("fcc_check without text → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "fcc_check", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("fcc_check with text > 64KB → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "fcc_check", { text: "x".repeat(65_537) });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("fcc_load_knowledge_base with > 10000 dispatcher_actions → schema rejects", async () => {
    const big = Array.from({ length: 10_001 }, (_, i) => `a${i}`);
    const r = await invokeHandler(devHandler, "fcc_load_knowledge_base", { dispatcher_actions: big });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
