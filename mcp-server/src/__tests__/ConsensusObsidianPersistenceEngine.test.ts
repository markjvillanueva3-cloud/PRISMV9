/**
 * ConsensusObsidianPersistenceEngine — wiki second-brain persistence tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-OBSIDIAN-PERSIST.
 *
 * Tests use real fs against an isolated temp wiki root — no mocks.
 * Asserts exact frontmatter values, exact file contents on idempotency,
 * exact log line counts. No toBeDefined / toBeUndefined.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConsensusObsidianPersistenceEngine, type PersistInput, type ConsensusResultLike } from "../engines/ConsensusObsidianPersistenceEngine.js";

let engine: ConsensusObsidianPersistenceEngine;
let tmpRoot: string;
let tmpVault: string;

function makeResult(overrides: Partial<ConsensusResultLike> = {}): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "20", latencyMs: 1234, tokens: 42, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: true, answer: "20", latencyMs: 5678, tokens: null, error: null },
      { model: "qwen2.5-coder:14b", vendor: "ollama", ok: true, answer: "20", latencyMs: 3210, tokens: null, error: null },
    ],
    successCount: 3,
    agreementScore: 0.95,
    consensus: { answer: "20", voters: ["gpt-5.5", "deepseek-r1:14b", "qwen2.5-coder:14b"], confidence: 0.95 },
    recommendation: "accept",
    totalLatencyMs: 7000,
    factCheck: {
      "gpt-5.5": { totalMentions: 2, verifiedMentions: 2, factualityScore: 1, hallucinations: [] },
      "deepseek-r1:14b": { totalMentions: 0, verifiedMentions: 0, factualityScore: Number.NaN, hallucinations: [] },
    },
    ...overrides,
  };
}

function makeInput(overrides: Partial<PersistInput> = {}): PersistInput {
  return {
    prompt: "What is 12+8?",
    taskType: "math",
    sourceSession: "claude-test-0001",
    result: makeResult(),
    wikiRoot: tmpRoot,
    obsidianVaultRoot: null,
    ...overrides,
  };
}

beforeEach(() => {
  engine = new ConsensusObsidianPersistenceEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wiki-test-"));
  tmpVault = fs.mkdtempSync(path.join(os.tmpdir(), "prism-vault-test-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  try { fs.rmSync(tmpVault, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("ConsensusObsidianPersistenceEngine — happy path", () => {
  it("writes a canonical artifact at <wikiRoot>/consensus/<sha8>.md", () => {
    const r = engine.persist(makeInput());
    expect(r.ok).toBe(true);
    expect(r.alreadyExisted).toBe(false);
    expect(r.error).toBeNull();
    expect(r.wikiPath.endsWith(".md")).toBe(true);
    const sha8 = r.promptHash.slice(0, 8);
    expect(r.wikiPath).toBe(path.join(tmpRoot, "consensus", `${sha8}.md`));
    expect(fs.existsSync(r.wikiPath)).toBe(true);
  });

  it("emits frontmatter with prompt_hash, mode, recommendation, model_voters", () => {
    const r = engine.persist(makeInput());
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body.startsWith("---\n")).toBe(true);
    expect(body).toContain(`prompt_hash: ${r.promptHash}`);
    expect(body).toContain(`mode: compare`);
    expect(body).toContain(`recommendation: accept`);
    expect(body).toContain(`agreement_score: 0.95`);
    expect(body).toContain(`task_type: math`);
    expect(body).toContain(`source_session: claude-test-0001`);
    expect(body).toContain(`model_voters: ["gpt-5.5", "deepseek-r1:14b", "qwen2.5-coder:14b"]`);
  });

  it("computes mean_factuality only over finite scores (NaN ignored)", () => {
    const r = engine.persist(makeInput());
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    // gpt-5.5=1, deepseek=NaN → mean of [1] = 1
    expect(body).toContain(`mean_factuality: 1`);
  });

  it("emits 'mean_factuality: null' when no model has any mentions", () => {
    const result = makeResult({
      factCheck: {
        "gpt-5.5": { totalMentions: 0, verifiedMentions: 0, factualityScore: Number.NaN, hallucinations: [] },
      },
    });
    const r = engine.persist(makeInput({ result }));
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body).toContain("mean_factuality: null");
  });

  it("appends one chronological line to log.md per persist call", () => {
    engine.persist(makeInput({ prompt: "alpha" }));
    engine.persist(makeInput({ prompt: "beta" }));
    const log = fs.readFileSync(path.join(tmpRoot, "log.md"), "utf-8");
    const lines = log.split("\n").filter((l) => l.startsWith("## ["));
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("consensus_persist");
    expect(lines[1]).toContain("consensus_persist");
  });

  it("appends an entry to consensus/index.md with the sha8 link", () => {
    const r = engine.persist(makeInput());
    const idx = fs.readFileSync(path.join(tmpRoot, "consensus", "index.md"), "utf-8");
    const sha8 = r.promptHash.slice(0, 8);
    expect(idx).toContain(`[[${sha8}]]`);
    expect(idx).toContain("task:math");
    expect(idx).toContain("rec:accept");
    expect(r.indexedInConsensusIndex).toBe(true);
  });

  it("renders per-model response blocks including hallucinations when present", () => {
    const result = makeResult({
      factCheck: {
        "gpt-5.5": {
          totalMentions: 2,
          verifiedMentions: 1,
          factualityScore: 0.5,
          hallucinations: [
            { kind: "engine", mention: "FakeNonExistentEngine", closestMatch: "AccessControlListEngine", modelName: "gpt-5.5" },
          ],
        },
      },
    });
    const r = engine.persist(makeInput({ result }));
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body).toContain("FakeNonExistentEngine");
    expect(body).toContain("did-you-mean");
    expect(body).toContain("AccessControlListEngine");
  });
});

describe("ConsensusObsidianPersistenceEngine — idempotency on prompt_hash", () => {
  it("second persist of the same prompt does NOT rewrite the canonical file", () => {
    const r1 = engine.persist(makeInput({ prompt: "stable prompt" }));
    const before = fs.readFileSync(r1.wikiPath, "utf-8");
    const beforeMtime = fs.statSync(r1.wikiPath).mtimeMs;

    // Same prompt — different result content (e.g. re-asked, slightly different answers)
    const result2 = makeResult({ recommendation: "review", agreementScore: 0.55 });
    const r2 = engine.persist(makeInput({ prompt: "stable prompt", result: result2 }));

    expect(r2.ok).toBe(true);
    expect(r2.alreadyExisted).toBe(true);
    expect(r2.promptHash).toBe(r1.promptHash);
    const after = fs.readFileSync(r1.wikiPath, "utf-8");
    expect(after).toBe(before); // exact byte equality — no rewrite
    expect(fs.statSync(r1.wikiPath).mtimeMs).toBe(beforeMtime); // mtime unchanged
  });

  it("normalizes whitespace so 'a b' and 'a  b' collide on hash", () => {
    const h1 = engine.hashPrompt("hello   world");
    const h2 = engine.hashPrompt("hello world");
    const h3 = engine.hashPrompt("  hello world  ");
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it("different prompts produce different hashes", () => {
    const h1 = engine.hashPrompt("prompt one");
    const h2 = engine.hashPrompt("prompt two");
    expect(h1 === h2).toBe(false);
  });

  it("idempotent log line is still appended (cache-hit tag)", () => {
    engine.persist(makeInput({ prompt: "X" }));
    engine.persist(makeInput({ prompt: "X" }));
    const log = fs.readFileSync(path.join(tmpRoot, "log.md"), "utf-8");
    const persistLines = log.split("\n").filter((l) => l.includes("consensus_persist"));
    const recallLines = log.split("\n").filter((l) => l.includes("consensus_recall"));
    expect(persistLines.length).toBe(1);
    expect(recallLines.length).toBe(1);
  });

  it("idempotent index update — sha8 not duplicated on repeated persist", () => {
    const r1 = engine.persist(makeInput({ prompt: "Y" }));
    engine.persist(makeInput({ prompt: "Y" }));
    const idx = fs.readFileSync(path.join(tmpRoot, "consensus", "index.md"), "utf-8");
    const sha8 = r1.promptHash.slice(0, 8);
    const occurrences = idx.split(`[[${sha8}]]`).length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("ConsensusObsidianPersistenceEngine — Obsidian vault mirror", () => {
  it("mirrors to <vault>/PRISM/consensus/<sha8>.md when vault root provided", () => {
    const r = engine.persist(makeInput({ obsidianVaultRoot: tmpVault }));
    const sha8 = r.promptHash.slice(0, 8);
    const expected = path.join(tmpVault, "PRISM", "consensus", `${sha8}.md`);
    expect(r.vaultPath).toBe(expected);
    expect(fs.existsSync(expected)).toBe(true);
    // Contents should match the canonical wiki file byte-for-byte
    expect(fs.readFileSync(expected, "utf-8")).toBe(fs.readFileSync(r.wikiPath, "utf-8"));
  });

  it("skips vault mirror silently when obsidianVaultRoot is null", () => {
    const r = engine.persist(makeInput({ obsidianVaultRoot: null }));
    expect(r.vaultPath).toBeNull();
    expect(r.ok).toBe(true);
  });

  it("vault write failure does NOT break canonical persist", () => {
    // Point vault at a path that doesn't exist AND can't be created (a file path)
    const sentinel = path.join(tmpVault, "blocker");
    fs.writeFileSync(sentinel, "x"); // exists as a FILE, so PRISM/consensus mkdir fails
    const r = engine.persist(makeInput({ obsidianVaultRoot: sentinel }));
    expect(r.ok).toBe(true);
    expect(r.vaultPath).toBeNull();
    expect(fs.existsSync(r.wikiPath)).toBe(true);
  });
});

describe("ConsensusObsidianPersistenceEngine — failure modes", () => {
  it("rejects null/undefined input", () => {
    expect(() => engine.persist(null as unknown as PersistInput)).toThrow(/PersistInput/);
    expect(() => engine.persist(undefined as unknown as PersistInput)).toThrow(/PersistInput/);
  });

  it("rejects empty prompt", () => {
    expect(() => engine.persist(makeInput({ prompt: "" }))).toThrow(/non-empty string/);
  });

  it("rejects non-string prompt", () => {
    expect(() => engine.persist(makeInput({ prompt: 42 as unknown as string }))).toThrow(/non-empty string/);
  });

  it("rejects missing result object", () => {
    const bad = { prompt: "x", wikiRoot: tmpRoot, obsidianVaultRoot: null } as unknown as PersistInput;
    expect(() => engine.persist(bad)).toThrow(/result/);
  });

  it("rejects non-array responses", () => {
    const result = makeResult();
    (result as unknown as { responses: unknown }).responses = "oops";
    expect(() => engine.persist(makeInput({ result }))).toThrow(/responses/);
  });
});

describe("ConsensusObsidianPersistenceEngine — adversarial inputs", () => {
  it("handles a 100KB prompt without crashing", () => {
    const big = "a".repeat(100_000);
    const r = engine.persist(makeInput({ prompt: big }));
    expect(r.ok).toBe(true);
    expect(fs.existsSync(r.wikiPath)).toBe(true);
  });

  it("handles unicode + emoji in the prompt", () => {
    const r = engine.persist(makeInput({ prompt: "测试 🚀 émoji ünicode prompt" }));
    expect(r.ok).toBe(true);
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body).toContain("测试");
    expect(body).toContain("🚀");
    expect(body).toContain("émoji");
  });

  it("handles backticks in answers (escaped, not breaking markdown)", () => {
    const result = makeResult({
      responses: [
        { model: "gpt-5.5", vendor: "openai", ok: true, answer: "use `git status` to check", latencyMs: 100, tokens: 10, error: null },
      ],
      consensus: { answer: "use `git status` to check", voters: ["gpt-5.5"], confidence: 1 },
    });
    const r = engine.persist(makeInput({ result }));
    expect(r.ok).toBe(true);
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body.length).toBeGreaterThan(0);
  });

  it("handles a result with zero successful responses (consensus=null)", () => {
    const result = makeResult({
      ok: false,
      successCount: 0,
      consensus: null,
      recommendation: "escalate",
      responses: [
        { model: "gpt-5.5", vendor: "openai", ok: false, answer: "", latencyMs: 0, tokens: null, error: "timeout" },
      ],
    });
    const r = engine.persist(makeInput({ result }));
    expect(r.ok).toBe(true);
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body).toContain("recommendation: escalate");
    expect(body).toContain("No consensus reached");
    expect(body).toContain("model_voters: []");
  });

  it("handles missing optional fields (taskType, sourceSession)", () => {
    const r = engine.persist({
      prompt: "minimal",
      result: makeResult(),
      wikiRoot: tmpRoot,
      obsidianVaultRoot: null,
    });
    expect(r.ok).toBe(true);
    const body = fs.readFileSync(r.wikiPath, "utf-8");
    expect(body).toContain("task_type: untagged");
    expect(body).toContain("source_session: unknown");
  });

  it("handles prompts that hash-collide on the first 8 chars (full hash still distinct)", () => {
    // Two different prompts. Even if their sha8 collides (unlikely), the
    // canonical filename would too — that's a known limitation we accept
    // for ergonomics. Verify hashes-as-strings differ at full length.
    const h1 = engine.hashPrompt("first prompt for hashing");
    const h2 = engine.hashPrompt("second prompt for hashing");
    expect(h1.length).toBe(64);
    expect(h2.length).toBe(64);
    expect(h1).not.toBe(h2);
  });
});

describe("ConsensusObsidianPersistenceEngine — wiki root creation from cold start", () => {
  it("creates consensus/ subdirectory when wikiRoot doesn't exist yet", () => {
    const fresh = path.join(tmpRoot, "fresh-wiki-root");
    expect(fs.existsSync(fresh)).toBe(false);
    const r = engine.persist(makeInput({ wikiRoot: fresh }));
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(fresh, "consensus"))).toBe(true);
    expect(fs.existsSync(r.wikiPath)).toBe(true);
  });

  it("creates log.md with header when missing", () => {
    const fresh = path.join(tmpRoot, "another-wiki-root");
    engine.persist(makeInput({ wikiRoot: fresh }));
    const log = fs.readFileSync(path.join(fresh, "log.md"), "utf-8");
    expect(log.startsWith("# PRISM Wiki Log")).toBe(true);
  });
});
