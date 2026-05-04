/**
 * prism_ai dispatcher — round-trip tests for LAYER-3-FULL-INTEGRATION actions.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-FULL-INTEGRATION.
 *
 * Each test exercises the engine the way the dispatcher case body does:
 * lazy import, call API with the dispatcher's parameter shape, assert the
 * exact return-shape the dispatcher wraps in `ok({...})`. This catches
 * import-path drift and engine-API rename.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { consensusObsidianPersistenceEngine, type ConsensusResultLike } from "../engines/ConsensusObsidianPersistenceEngine.js";
import { consensusRecallCacheEngine } from "../engines/ConsensusRecallCacheEngine.js";
import { wikiRetrievalContextEngine } from "../engines/WikiRetrievalContextEngine.js";
import { consensusNeuralFeedbackEngine } from "../engines/ConsensusNeuralFeedbackEngine.js";
import { geminiClientEngine } from "../engines/GeminiClientEngine.js";
import { consensusAIBridgeEngine } from "../engines/ConsensusAIBridgeEngine.js";

let tmpRoot: string;

function fakeResult(rec: "accept" | "review" | "escalate" = "accept"): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "answer-string", latencyMs: 1000, tokens: 25, error: null },
    ],
    successCount: 1,
    agreementScore: 0.9,
    consensus: { answer: "answer-string", voters: ["gpt-5.5"], confidence: 0.9 },
    recommendation: rec,
    totalLatencyMs: 3000,
    factCheck: {},
  };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-disp-l3-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("prism_ai:gemini_exec — dispatcher param shape", () => {
  it("notConfigured short-circuit returns model='gemini-2.0-flash-exp' and thinkingBudgetUsed=4096", async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const result = await geminiClientEngine.exec({ prompt: "hi" });
      expect(result.notConfigured).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.model).toBe("gemini-2.0-flash-exp");
      expect(result.thinkingBudgetUsed).toBe(4096);
      expect(result.latencyMs).toBe(0);
      expect(result.error).toMatch(/aistudio.google.com/);
    } finally {
      if (originalGemini !== undefined) process.env.GEMINI_API_KEY = originalGemini;
      if (originalGoogle !== undefined) process.env.GOOGLE_API_KEY = originalGoogle;
    }
  });

  it("notConfigured remains true when reasoningEffort=high (thinkingBudgetUsed=24576)", async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const result = await geminiClientEngine.exec({ prompt: "hi", reasoningEffort: "high" });
      expect(result.thinkingBudgetUsed).toBe(24576);
    } finally {
      if (originalGemini !== undefined) process.env.GEMINI_API_KEY = originalGemini;
      if (originalGoogle !== undefined) process.env.GOOGLE_API_KEY = originalGoogle;
    }
  });
});

describe("prism_ai:consensus_recall_cache — dispatcher param shape", () => {
  it("returns null on miss", () => {
    const r = consensusRecallCacheEngine.recall("never persisted", { wikiRoot: tmpRoot });
    expect(r).toBeNull();
  });

  it("returns CachedConsensus with all expected fields on hit", () => {
    const PROMPT = "test prompt for dispatcher round-trip";
    const persistRes = consensusObsidianPersistenceEngine.persist({
      prompt: PROMPT,
      taskType: "decide",
      sourceSession: "test-session",
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const r = consensusRecallCacheEngine.recall(PROMPT, { wikiRoot: tmpRoot });
    expect(r).not.toBeNull();
    expect(r!.cached).toBe(true);
    expect(r!.promptHash).toBe(persistRes.promptHash);
    expect(r!.recommendation).toBe("accept");
    expect(r!.agreementScore).toBe(0.9);
    expect(r!.modelVoters).toEqual(["gpt-5.5"]);
    const score = consensusRecallCacheEngine.scoreCached(r!);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("prism_ai:wiki_retrieve — dispatcher param shape", () => {
  it("returns empty result with totalEntries=0 on missing wiki", () => {
    const r = wikiRetrievalContextEngine.retrieve("Kienzle force", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
    expect(r.text).toBe("");
    expect(r.estimatedTokens).toBe(0);
    expect(r.consensusHits).toBe(0);
    expect(r.truncated).toBe(false);
  });

  it("ranks by Jaccard overlap when wiki populated", () => {
    fs.writeFileSync(path.join(tmpRoot, "index.md"),
      `## concepts\n\n- [[CuttingForce]] — CuttingForceEngine — Kienzle for milling steel | source:src/engines/CuttingForceEngine.ts\n- [[GenericPlot]] — GenericPlotEngine — generic plotting | source:src/engines/GenericPlotEngine.ts\n`,
      "utf-8");
    const r = wikiRetrievalContextEngine.retrieve("compute Kienzle force for milling steel", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBeGreaterThan(0);
    expect(r.text).toContain("CuttingForce");
    // CuttingForce should appear before GenericPlot because the prompt overlaps more
    const cuttingIdx = r.text.indexOf("CuttingForce");
    const genericIdx = r.text.indexOf("GenericPlot");
    expect(cuttingIdx).toBeGreaterThan(-1);
    if (genericIdx > -1) {
      expect(cuttingIdx).toBeLessThan(genericIdx);
    }
  });
});

describe("prism_ai:neural_feed_record — dispatcher param shape", () => {
  it("records a datum and writes a JSONL line with reward in [0,1]", () => {
    const feedPath = path.join(tmpRoot, "feed.jsonl");
    const r = consensusNeuralFeedbackEngine.record({
      prompt: "what is 12+8?",
      taskType: "math",
      sourceSession: "test",
      result: fakeResult(),
      feedPath,
    });
    expect(r.ok).toBe(true);
    expect(r.bytesWritten).toBeGreaterThan(0);
    expect(r.reward).toBeGreaterThan(0);
    expect(r.reward).toBeLessThanOrEqual(1);
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum = JSON.parse(raw.trim());
    expect(datum.prompt).toBe("what is 12+8?");
    expect(datum.task_type).toBe("math");
    expect(datum.recommendation).toBe("accept");
    expect(datum.models).toHaveLength(1);
    expect(datum.models[0].in_consensus_voters).toBe(true);
  });

  it("returns ok:false with /non-empty/ error on empty prompt", () => {
    const r = consensusNeuralFeedbackEngine.record({
      prompt: "",
      result: fakeResult(),
      feedPath: path.join(tmpRoot, "feed.jsonl"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/non-empty/);
  });
});

describe("prism_ai:neural_feed_recent — dispatcher param shape", () => {
  it("returns empty array on missing feed", () => {
    const recent = consensusNeuralFeedbackEngine.recent(50, path.join(tmpRoot, "missing.jsonl"));
    expect(recent).toEqual([]);
  });

  it("returns last N entries in append order", () => {
    const feedPath = path.join(tmpRoot, "feed.jsonl");
    const PROMPTS = ["alpha", "beta", "gamma", "delta", "epsilon"];
    for (const p of PROMPTS) {
      consensusNeuralFeedbackEngine.record({ prompt: p, result: fakeResult(), feedPath });
    }
    const recent = consensusNeuralFeedbackEngine.recent(3, feedPath);
    expect(recent.map((e) => e.prompt)).toEqual(["gamma", "delta", "epsilon"]);
  });
});

describe("prism_ai:consensus_bridge_reason — dispatcher param shape", () => {
  it("returns AIBridgeStep with cached:true and status:completed on cache hit", async () => {
    process.env.PRISM_WIKI_ROOT = tmpRoot;
    try {
      consensusObsidianPersistenceEngine.persist({
        prompt: "should we use a hashmap?",
        taskType: "decide",
        result: fakeResult("accept"),
        wikiRoot: tmpRoot,
        obsidianVaultRoot: null,
      });
      const step = await consensusAIBridgeEngine.reason({
        prompt: "should we use a hashmap?",
        taskType: "decide",
        caller: "DispatcherTest",
      });
      expect(step.output.cached).toBe(true);
      expect(step.status).toBe("completed");
      expect(step.type).toBe("engine");
      expect(step.resource).toBe("ConsensusAIBridgeEngine");
      expect(step.action).toBe("reason");
      expect(step.input.prompt).toBe("should we use a hashmap?");
      expect(step.input.caller).toBe("DispatcherTest");
      expect(step.output.recommendation).toBe("accept");
      expect(step.output.agreementScore).toBe(0.9);
      expect(step.output.voterCount).toBe(1);
      expect(step.confidence).toBeGreaterThan(0);
    } finally {
      delete process.env.PRISM_WIKI_ROOT;
    }
  });

  it("returns AIBridgeStep with status:escalated when cache says escalate", async () => {
    process.env.PRISM_WIKI_ROOT = tmpRoot;
    try {
      consensusObsidianPersistenceEngine.persist({
        prompt: "should we delete the database?",
        taskType: "decide",
        result: fakeResult("escalate"),
        wikiRoot: tmpRoot,
        obsidianVaultRoot: null,
      });
      const step = await consensusAIBridgeEngine.reason({ prompt: "should we delete the database?" });
      expect(step.output.cached).toBe(true);
      expect(step.status).toBe("escalated");
      expect(step.output.recommendation).toBe("escalate");
    } finally {
      delete process.env.PRISM_WIKI_ROOT;
    }
  });

  it("rejects empty prompt with descriptive error", async () => {
    await expect(consensusAIBridgeEngine.reason({ prompt: "" })).rejects.toThrow(/non-empty/);
  });
});
