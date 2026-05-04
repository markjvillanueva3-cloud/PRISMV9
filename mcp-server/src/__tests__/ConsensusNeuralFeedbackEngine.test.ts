/**
 * ConsensusNeuralFeedbackEngine — JSONL training feed tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-NEURAL-FEED.
 *
 * Real fs against temp dirs. Append-only. Exact assertions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConsensusNeuralFeedbackEngine, type ConsensusResultLike, type NeuralFeedDatum } from "../engines/ConsensusNeuralFeedbackEngine.js";

let engine: ConsensusNeuralFeedbackEngine;
let tmpRoot: string;
let feedPath: string;

function fakeResult(overrides: Partial<ConsensusResultLike> = {}): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "20", latencyMs: 2000, tokens: 30, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: true, answer: "20", latencyMs: 5000, tokens: null, error: null },
      { model: "qwen2.5-coder:14b", vendor: "ollama", ok: true, answer: "20", latencyMs: 3000, tokens: null, error: null },
    ],
    successCount: 3,
    agreementScore: 0.95,
    consensus: { answer: "20", voters: ["gpt-5.5", "deepseek-r1:14b", "qwen2.5-coder:14b"], confidence: 0.95 },
    recommendation: "accept",
    totalLatencyMs: 5500,
    factCheck: {
      "gpt-5.5": { totalMentions: 2, verifiedMentions: 2, factualityScore: 1, hallucinations: [] },
      "deepseek-r1:14b": { totalMentions: 1, verifiedMentions: 1, factualityScore: 1, hallucinations: [] },
    },
    ...overrides,
  };
}

beforeEach(() => {
  engine = new ConsensusNeuralFeedbackEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-neural-feed-"));
  feedPath = path.join(tmpRoot, "feed.jsonl");
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("ConsensusNeuralFeedbackEngine — record / append", () => {
  it("appends a JSONL line on record", () => {
    const r = engine.record({ prompt: "What is 12+8?", taskType: "math", result: fakeResult(), feedPath });
    expect(r.ok).toBe(true);
    expect(r.bytesWritten).toBeGreaterThan(0);
    const raw = fs.readFileSync(feedPath, "utf-8");
    expect(raw.split("\n").filter((l) => l.length > 0)).toHaveLength(1);
  });

  it("appends multiple records in order", () => {
    engine.record({ prompt: "p1", result: fakeResult(), feedPath });
    engine.record({ prompt: "p2", result: fakeResult(), feedPath });
    engine.record({ prompt: "p3", result: fakeResult(), feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    expect(raw.split("\n").filter((l) => l.length > 0)).toHaveLength(3);
  });

  it("each line is valid JSON with required fields", () => {
    engine.record({ prompt: "test", taskType: "review", result: fakeResult(), feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum: NeuralFeedDatum = JSON.parse(raw.trim());
    expect(datum.schema_version).toBe("1.0.0");
    expect(datum.prompt).toBe("test");
    expect(datum.task_type).toBe("review");
    expect(datum.recommendation).toBe("accept");
    expect(datum.models).toHaveLength(3);
    expect(datum.reward).toBeGreaterThan(0);
    expect(datum.reward).toBeLessThanOrEqual(1);
  });

  it("creates parent directory if missing", () => {
    const deepPath = path.join(tmpRoot, "deep", "nested", "feed.jsonl");
    const r = engine.record({ prompt: "p", result: fakeResult(), feedPath: deepPath });
    expect(r.ok).toBe(true);
    expect(fs.existsSync(deepPath)).toBe(true);
  });

  it("caps prompt at 4KB and marks truncation", () => {
    const big = "x".repeat(5000);
    engine.record({ prompt: big, result: fakeResult(), feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum: NeuralFeedDatum = JSON.parse(raw.trim());
    expect(datum.prompt.endsWith("...[truncated]")).toBe(true);
    expect(datum.prompt.length).toBeLessThan(big.length);
  });
});

describe("ConsensusNeuralFeedbackEngine — reward scoring", () => {
  it("accept + high agreement + low latency yields high reward", () => {
    const fast = fakeResult({ totalLatencyMs: 1000 });
    const { reward, components } = engine.scoreReward(fast);
    expect(components.rec_score).toBe(1.0);
    expect(components.agree_score).toBe(0.95);
    expect(reward).toBeGreaterThan(0.7);
  });

  it("escalate yields low reward regardless of agreement", () => {
    const r = fakeResult({ recommendation: "escalate" });
    const { reward, components } = engine.scoreReward(r);
    expect(components.rec_score).toBe(0.1);
    expect(reward).toBeLessThan(0.2);
  });

  it("review yields mid reward", () => {
    const r = fakeResult({ recommendation: "review" });
    const { reward, components } = engine.scoreReward(r);
    expect(components.rec_score).toBe(0.5);
    expect(reward).toBeLessThan(0.6);
    expect(reward).toBeGreaterThan(0.1);
  });

  it("agreement clamped to [0,1] when out of range", () => {
    const r = fakeResult({ agreementScore: 1.5 });
    const { components } = engine.scoreReward(r);
    expect(components.agree_score).toBe(1);
  });

  it("latency penalty decays toward zero for very slow runs", () => {
    const slow = fakeResult({ totalLatencyMs: 600_000 }); // 10 min
    const { components } = engine.scoreReward(slow);
    expect(components.latency_penalty).toBeLessThan(0.0001);
  });

  it("fact_score is mean of finite factuality scores", () => {
    const r = fakeResult({
      factCheck: {
        "a": { totalMentions: 1, verifiedMentions: 1, factualityScore: 1.0, hallucinations: [] },
        "b": { totalMentions: 1, verifiedMentions: 0, factualityScore: 0.0, hallucinations: [] },
        "c": { totalMentions: 0, verifiedMentions: 0, factualityScore: NaN, hallucinations: [] },
      },
    });
    const { components } = engine.scoreReward(r);
    // mean of [1, 0] = 0.5; NaN ignored
    expect(components.fact_score).toBe(0.5);
  });

  it("fact_score defaults to 1.0 when no models have mentions", () => {
    const r = fakeResult({ factCheck: {} });
    const { components } = engine.scoreReward(r);
    expect(components.fact_score).toBe(1);
  });
});

describe("ConsensusNeuralFeedbackEngine — per-model attribution", () => {
  it("marks in_consensus_voters correctly", () => {
    engine.record({ prompt: "p", result: fakeResult(), feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum: NeuralFeedDatum = JSON.parse(raw.trim());
    expect(datum.models.every((m) => m.in_consensus_voters)).toBe(true);
  });

  it("captures hallucination count from factCheck", () => {
    const r = fakeResult({
      factCheck: {
        "gpt-5.5": {
          totalMentions: 2,
          verifiedMentions: 1,
          factualityScore: 0.5,
          hallucinations: [{ kind: "engine", mention: "FakeEngine", closestMatch: null, modelName: "gpt-5.5" }],
        },
      },
    });
    engine.record({ prompt: "p", result: r, feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum: NeuralFeedDatum = JSON.parse(raw.trim());
    const gpt = datum.models.find((m) => m.model === "gpt-5.5")!;
    expect(gpt.hallucination_count).toBe(1);
    expect(gpt.factuality_score).toBe(0.5);
  });

  it("non-voters get in_consensus_voters=false", () => {
    const r = fakeResult({
      consensus: { answer: "20", voters: ["gpt-5.5"], confidence: 0.5 },
    });
    engine.record({ prompt: "p", result: r, feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    const datum: NeuralFeedDatum = JSON.parse(raw.trim());
    const ds = datum.models.find((m) => m.model === "deepseek-r1:14b")!;
    expect(ds.in_consensus_voters).toBe(false);
  });
});

describe("ConsensusNeuralFeedbackEngine — recent reader", () => {
  it("returns last N entries", () => {
    for (let i = 0; i < 10; i++) {
      engine.record({ prompt: `p${i}`, result: fakeResult(), feedPath });
    }
    const recent = engine.recent(3, feedPath);
    expect(recent).toHaveLength(3);
    expect(recent[0].prompt).toBe("p7");
    expect(recent[1].prompt).toBe("p8");
    expect(recent[2].prompt).toBe("p9");
  });

  it("returns empty array when feed doesn't exist", () => {
    const recent = engine.recent(50, path.join(tmpRoot, "missing.jsonl"));
    expect(recent).toEqual([]);
  });

  it("skips malformed lines without crashing", () => {
    fs.writeFileSync(feedPath,
      `${JSON.stringify({ schema_version: "1.0.0", prompt: "ok" })}\nNOT JSON\n${JSON.stringify({ schema_version: "1.0.0", prompt: "also ok" })}\n`,
      "utf-8");
    const recent = engine.recent(50, feedPath);
    expect(recent).toHaveLength(2);
  });
});

describe("ConsensusNeuralFeedbackEngine — failure modes", () => {
  it("returns ok:false on empty prompt", () => {
    const r = engine.record({ prompt: "", result: fakeResult(), feedPath });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/non-empty/);
  });

  it("returns ok:false on missing result", () => {
    const r = engine.record({
      prompt: "p",
      result: undefined as unknown as ConsensusResultLike,
      feedPath,
    });
    expect(r.ok).toBe(false);
  });

  it("returns ok:false on non-array responses", () => {
    const bad = fakeResult();
    (bad as unknown as { responses: unknown }).responses = "oops";
    const r = engine.record({ prompt: "p", result: bad, feedPath });
    expect(r.ok).toBe(false);
  });
});

describe("ConsensusNeuralFeedbackEngine — adversarial inputs", () => {
  it("100KB prompt is capped, not crashed", () => {
    const big = "z".repeat(100_000);
    const r = engine.record({ prompt: big, result: fakeResult(), feedPath });
    expect(r.ok).toBe(true);
  });

  it("unicode in prompt preserved", () => {
    engine.record({ prompt: "测试 🚀 prompt", result: fakeResult(), feedPath });
    const raw = fs.readFileSync(feedPath, "utf-8");
    expect(raw).toContain("测试");
    expect(raw).toContain("🚀");
  });

  it("hashPrompt is stable + 64-hex", () => {
    const h1 = engine.hashPrompt("hello world");
    const h2 = engine.hashPrompt("hello world");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});
