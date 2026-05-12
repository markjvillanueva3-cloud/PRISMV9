/**
 * ConsensusRecallCacheEngine — short-circuit cache tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-RECALL-CACHE.
 *
 * Real fs against temp dirs. No mocks. Exact equality assertions only.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConsensusRecallCacheEngine } from "../engines/ConsensusRecallCacheEngine.js";
import { consensusObsidianPersistenceEngine, type ConsensusResultLike } from "../engines/ConsensusObsidianPersistenceEngine.js";

let engine: ConsensusRecallCacheEngine;
let tmpRoot: string;

const FAKE_PROMPT = "What is the canonical Kienzle coefficient for 1018 steel?";

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

beforeEach(() => {
  engine = new ConsensusRecallCacheEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-recall-test-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("ConsensusRecallCacheEngine — happy path", () => {
  it("returns null on cache miss", () => {
    const hit = engine.recall("never persisted prompt", { wikiRoot: tmpRoot });
    expect(hit).toBeNull();
  });

  it("returns cached entry after persist", () => {
    consensusObsidianPersistenceEngine.persist({
      prompt: FAKE_PROMPT,
      taskType: "physics",
      sourceSession: "test-1",
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });

    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot });
    expect(hit).not.toBeNull();
    expect(hit!.cached).toBe(true);
    expect(hit!.recommendation).toBe("accept");
    expect(hit!.agreementScore).toBe(0.85);
    expect(hit!.modelVoters).toEqual(["gpt-5.5"]);
    expect(hit!.answer).toBe("kc1.1 = 1800 N/mm² for ISO P group");
  });

  it("hash matches persistence engine (single source of truth)", () => {
    const persistRes = consensusObsidianPersistenceEngine.persist({
      prompt: FAKE_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot });
    expect(hit!.promptHash).toBe(persistRes.promptHash);
    expect(hit!.sha8).toBe(persistRes.promptHash.slice(0, 8));
  });

  it("scoreCached gives accept > review > escalate", () => {
    const persist = (rec: "accept" | "review" | "escalate", prompt: string) => {
      consensusObsidianPersistenceEngine.persist({ prompt, result: fakeResult(rec), wikiRoot: tmpRoot, obsidianVaultRoot: null });
      return engine.recall(prompt, { wikiRoot: tmpRoot })!;
    };
    const a = persist("accept", "prompt-a");
    const r = persist("review", "prompt-r");
    const e = persist("escalate", "prompt-e");
    const sa = engine.scoreCached(a);
    const sr = engine.scoreCached(r);
    const se = engine.scoreCached(e);
    expect(sa).toBeGreaterThan(sr);
    expect(sr).toBeGreaterThan(se);
  });
});

describe("ConsensusRecallCacheEngine — TTL enforcement", () => {
  it("returns null when artifact is older than ttlMs", () => {
    const persistRes = consensusObsidianPersistenceEngine.persist({
      prompt: FAKE_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    // Backdate the file by 8 days
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fs.utimesSync(persistRes.wikiPath, new Date(eightDaysAgo), new Date(eightDaysAgo));
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot, ttlMs: 7 * 24 * 60 * 60 * 1000 });
    expect(hit).toBeNull();
  });

  it("honors enforceTtl=false to bypass age check", () => {
    const persistRes = consensusObsidianPersistenceEngine.persist({
      prompt: FAKE_PROMPT,
      result: fakeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.utimesSync(persistRes.wikiPath, new Date(oldTime), new Date(oldTime));
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot, enforceTtl: false });
    expect(hit).not.toBeNull();
    expect(hit!.ageMs).toBeGreaterThan(7 * 24 * 60 * 60 * 1000);
  });

  it("returns hit when artifact is younger than ttlMs", () => {
    consensusObsidianPersistenceEngine.persist({ prompt: FAKE_PROMPT, result: fakeResult(), wikiRoot: tmpRoot, obsidianVaultRoot: null });
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot, ttlMs: 60_000 });
    expect(hit).not.toBeNull();
  });
});

describe("ConsensusRecallCacheEngine — failure modes", () => {
  it("returns null for empty prompt", () => {
    expect(engine.recall("", { wikiRoot: tmpRoot })).toBeNull();
  });

  it("returns null for non-string prompt", () => {
    expect(engine.recall(42 as unknown as string, { wikiRoot: tmpRoot })).toBeNull();
  });

  it("returns null when wiki root doesn't exist", () => {
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: path.join(tmpRoot, "nonexistent") });
    expect(hit).toBeNull();
  });

  it("returns null when consensus dir exists but file doesn't", () => {
    fs.mkdirSync(path.join(tmpRoot, "consensus"), { recursive: true });
    const hit = engine.recall("missing", { wikiRoot: tmpRoot });
    expect(hit).toBeNull();
  });

  it("handles malformed frontmatter gracefully (returns hit with defaults)", () => {
    const sha8 = consensusObsidianPersistenceEngine.hashPrompt(FAKE_PROMPT).slice(0, 8);
    const consensusDir = path.join(tmpRoot, "consensus");
    fs.mkdirSync(consensusDir, { recursive: true });
    fs.writeFileSync(path.join(consensusDir, `${sha8}.md`), "no frontmatter here\n", "utf-8");
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot });
    expect(hit).not.toBeNull();
    expect(hit!.recommendation).toBe("review"); // default fallback
    expect(hit!.agreementScore).toBe(0); // default fallback
  });
});

describe("ConsensusRecallCacheEngine — adversarial inputs", () => {
  it("handles 100KB prompt", () => {
    const big = "a".repeat(100_000);
    consensusObsidianPersistenceEngine.persist({ prompt: big, result: fakeResult(), wikiRoot: tmpRoot, obsidianVaultRoot: null });
    const hit = engine.recall(big, { wikiRoot: tmpRoot });
    expect(hit).not.toBeNull();
  });

  it("handles unicode prompts deterministically", () => {
    const p = "测试 🚀 émoji prompt";
    consensusObsidianPersistenceEngine.persist({ prompt: p, result: fakeResult(), wikiRoot: tmpRoot, obsidianVaultRoot: null });
    const hit = engine.recall(p, { wikiRoot: tmpRoot });
    expect(hit).not.toBeNull();
  });

  it("scoreCached clamps out-of-range agreement to [0,1]", () => {
    const sha8 = consensusObsidianPersistenceEngine.hashPrompt(FAKE_PROMPT).slice(0, 8);
    const consensusDir = path.join(tmpRoot, "consensus");
    fs.mkdirSync(consensusDir, { recursive: true });
    fs.writeFileSync(path.join(consensusDir, `${sha8}.md`),
      "---\nrecommendation: accept\nagreement_score: 1.5\nmodel_voters: []\n---\n",
      "utf-8");
    const hit = engine.recall(FAKE_PROMPT, { wikiRoot: tmpRoot })!;
    expect(hit.agreementScore).toBe(1.5); // raw value preserved
    const score = engine.scoreCached(hit);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
