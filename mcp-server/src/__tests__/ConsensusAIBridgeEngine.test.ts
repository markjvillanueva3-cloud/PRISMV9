/**
 * ConsensusAIBridgeEngine — AI orchestrator adapter tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AI-BRIDGE.
 *
 * These tests focus on:
 *   1. Cache-hit projection (verified end-to-end via real persistence)
 *   2. Input validation
 *   3. AIBridgeStep shape conformance to AutonomousAIOrchestrationEngine.ExecutionStep
 *
 * Live fan-out tests would require Codex + Ollama processes; those are
 * integration tests, not unit. The cache-hit path exercises the full
 * projection pipeline without network calls.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConsensusAIBridgeEngine } from "../engines/ConsensusAIBridgeEngine.js";
import { consensusObsidianPersistenceEngine, type ConsensusResultLike } from "../engines/ConsensusObsidianPersistenceEngine.js";

let engine: ConsensusAIBridgeEngine;
let tmpRoot: string;

const TEST_PROMPT = "Should this code use a hashmap or a btree?";

function fakeResult(rec: "accept" | "review" | "escalate" = "accept", agreement: number = 0.85): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "Use hashmap — O(1) average", latencyMs: 1500, tokens: 40, error: null },
    ],
    successCount: 1,
    agreementScore: agreement,
    consensus: { answer: "Use hashmap — O(1) average", voters: ["gpt-5.5"], confidence: agreement },
    recommendation: rec,
    totalLatencyMs: 4000,
    factCheck: {},
  };
}

beforeEach(() => {
  engine = new ConsensusAIBridgeEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ai-bridge-"));
  // Point recall at our tmp wiki via env override (PRISM_WIKI_ROOT is read at module init,
  // so we use direct persistence to tmpRoot then ensure recall sees it via env)
  process.env.PRISM_WIKI_ROOT = tmpRoot;
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  delete process.env.PRISM_WIKI_ROOT;
});

describe("ConsensusAIBridgeEngine — cache-hit projection", () => {
  it("returns cached step when prompt was previously persisted", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      taskType: "decide",
      sourceSession: "test",
      result: fakeResult("accept", 0.85),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });

    const step = await engine.reason({ prompt: TEST_PROMPT, taskType: "decide", caller: "TestEngine" });
    expect(step.output.cached).toBe(true);
    expect(step.output.recommendation).toBe("accept");
    expect(step.output.agreementScore).toBe(0.85);
    expect(step.output.voters).toEqual(["gpt-5.5"]);
    expect(step.output.voterCount).toBe(1);
    expect(step.status).toBe("completed");
    expect(step.reasoning).toMatch(/cache-hit/);
  });

  it("forceLive bypasses cache and would attempt live (we expect failure without daemons)", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    // No Codex/Ollama running in test env — bridge should NOT return cached output;
    // it will go live, models will fail, and the bridge will return a step with
    // either successCount=0 (escalated) or with errors. Either way, cached must be false.
    const step = await engine.reason({ prompt: TEST_PROMPT, forceLive: true, timeoutMs: 1000, includeClaude: false });
    expect(step.output.cached).toBe(false);
  }, 15_000);

  it("cached step's confidence ladder reflects agreement score", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: "high agreement prompt",
      result: fakeResult("accept", 0.9),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    consensusObsidianPersistenceEngine.persist({
      prompt: "medium agreement prompt",
      result: fakeResult("review", 0.5),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    consensusObsidianPersistenceEngine.persist({
      prompt: "low agreement prompt",
      result: fakeResult("escalate", 0.2),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });

    const high = await engine.reason({ prompt: "high agreement prompt" });
    const med = await engine.reason({ prompt: "medium agreement prompt" });
    const low = await engine.reason({ prompt: "low agreement prompt" });

    expect(high.confidence).toBe(0.9);
    expect(med.confidence).toBe(0.6);
    expect(low.confidence).toBe(0.3);
  });

  it("escalate cached entry projects to status='escalated'", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: "escalate prompt",
      result: fakeResult("escalate", 0.1),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: "escalate prompt" });
    expect(step.status).toBe("escalated");
  });
});

describe("ConsensusAIBridgeEngine — AIBridgeStep shape", () => {
  it("step matches ExecutionStep contract: type/resource/action fixed", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: TEST_PROMPT, taskType: "decide", caller: "TestEngine" });
    expect(step.type).toBe("engine");
    expect(step.resource).toBe("ConsensusAIBridgeEngine");
    expect(step.action).toBe("reason");
  });

  it("step.input echoes prompt + taskType + caller", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: TEST_PROMPT, taskType: "review", caller: "MyOrchestrator" });
    expect(step.input.prompt).toBe(TEST_PROMPT);
    expect(step.input.taskType).toBe("review");
    expect(step.input.caller).toBe("MyOrchestrator");
  });

  it("default taskType=decide and caller=unknown when omitted", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: TEST_PROMPT });
    expect(step.input.taskType).toBe("decide");
    expect(step.input.caller).toBe("unknown");
  });

  it("output has all required telemetry fields populated", async () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: TEST_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: TEST_PROMPT });
    expect(typeof step.output.answer).toBe("string");
    expect(typeof step.output.recommendation).toBe("string");
    expect(Array.isArray(step.output.voters)).toBe(true);
    expect(typeof step.output.voterCount).toBe("number");
    expect(typeof step.output.agreementScore).toBe("number");
    expect(typeof step.output.cached).toBe("boolean");
    expect(typeof step.output.promptHash).toBe("string");
    expect(step.output.promptHash).toHaveLength(64);
    expect(typeof step.output.sha8).toBe("string");
    expect(step.output.sha8).toHaveLength(8);
    expect(typeof step.output.reward).toBe("number");
  });
});

describe("ConsensusAIBridgeEngine — failure modes", () => {
  it("rejects null/undefined request", async () => {
    await expect(engine.reason(null as unknown as { prompt: string })).rejects.toThrow(/AIBridgeRequest/);
    await expect(engine.reason(undefined as unknown as { prompt: string })).rejects.toThrow(/AIBridgeRequest/);
  });

  it("rejects empty prompt", async () => {
    await expect(engine.reason({ prompt: "" })).rejects.toThrow(/non-empty/);
  });

  it("rejects non-string prompt", async () => {
    await expect(engine.reason({ prompt: 42 as unknown as string })).rejects.toThrow(/non-empty/);
  });
});

describe("ConsensusAIBridgeEngine — adversarial inputs", () => {
  it("100KB prompt cache hit succeeds", async () => {
    const big = "Should this " + "x".repeat(100_000);
    consensusObsidianPersistenceEngine.persist({
      prompt: big,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: big });
    expect(step.output.cached).toBe(true);
  });

  it("unicode prompt preserved through cache round-trip", async () => {
    const p = "compute 切削 force";
    consensusObsidianPersistenceEngine.persist({
      prompt: p,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const step = await engine.reason({ prompt: p });
    expect(step.output.cached).toBe(true);
    expect(step.input.prompt).toBe(p);
  });
});
