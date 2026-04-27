/**
 * WikiIngestRouterEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI04
 *
 * Real assertions only. Mock fetch implements Ollama; index + log engines
 * are real instances pointed at tmpdir so we exercise actual atomic-write
 * + lock paths end-to-end. ≥70% Ollama-share assertion uses real token
 * sums from the engine's spend ledger, not estimates.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WikiIngestRouterEngine,
  WIKI_INGEST_OLLAMA_FLOOR,
  type StageSpend,
} from "../engines/WikiIngestRouterEngine.js";
import { WikiIndexMaintainerEngine } from "../engines/WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "../engines/WikiLogAppenderEngine.js";

interface OllamaCall {
  url: string;
  prompt: string;
}

let TMP: string;
let indexEngine: WikiIndexMaintainerEngine;
let logEngine: WikiLogAppenderEngine;
let calls: OllamaCall[];

function makeFetchStub(responseFor: (prompt: string) => { response: string; prompt_eval_count?: number; eval_count?: number }) {
  return async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ url, prompt: String(body.prompt ?? "") });
    const out = responseFor(String(body.prompt ?? ""));
    return {
      ok: true,
      status: 200,
      json: async () => ({ done: true, ...out }),
      text: async () => JSON.stringify(out),
    };
  };
}

beforeEach(async () => {
  TMP = await fs.mkdtemp(join(tmpdir(), "wiki-ingest-"));
  const indexPath = join(TMP, "index.md");
  const jsonlPath = join(TMP, "index.jsonl");
  const logPath = join(TMP, "log.md");
  indexEngine = new WikiIndexMaintainerEngine(indexPath, jsonlPath);
  logEngine = new WikiLogAppenderEngine(logPath);
  calls = [];
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

// ─── runIngest stage 2 + 3 ─────────────────────────────────────────────

describe("runIngest — stage 2 + 3", () => {
  it("returns Ollama summary, suggested refs from known slugs, and a synthesis prompt", async () => {
    const fetchImpl = makeFetchStub((prompt) => {
      if (prompt.includes("knowledge-base summarizer")) {
        return { response: "Inconel 718 is a nickel-based superalloy used in aerospace.", prompt_eval_count: 4500, eval_count: 80 };
      }
      // cross-ref stage — return only slugs that exist in known list
      return { response: "force-kienzle, thermal-johnson-cook, NOT-A-KNOWN-SLUG", prompt_eval_count: 200, eval_count: 12 };
    });

    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const r = await engine.runIngest({
      rawText: "Inconel 718 is a nickel-based superalloy with austenitic γ matrix and γ' precipitates...",
      slug: "inconel-718",
      category: "entities",
      agent: "claude-ce425dcc",
      sourcePath: "raw/articles/inconel-718-spec.md",
      knownSlugs: ["force-kienzle", "thermal-johnson-cook", "ITW"],
    });

    expect(r.summary).toStrictEqual("Inconel 718 is a nickel-based superalloy used in aerospace.");
    expect(r.suggestedRefs).toStrictEqual(["force-kienzle", "thermal-johnson-cook"]);
    expect(r.pipelineToken.spends).toHaveLength(2);
    expect(r.pipelineToken.spends[0].stage).toStrictEqual(2);
    expect(r.pipelineToken.spends[0].model).toStrictEqual("ollama");
    expect(r.pipelineToken.spends[1].stage).toStrictEqual(3);
    expect(r.pipelineToken.spends[1].model).toStrictEqual("ollama");
    expect(r.synthesisPrompt.includes("inconel-718")).toStrictEqual(true);
    expect(r.synthesisPrompt.includes("[[force-kienzle]]")).toStrictEqual(true);
  });

  it("short-circuits stage 3 when no known slugs are passed (skips Ollama call)", async () => {
    const fetchImpl = makeFetchStub((_) => ({ response: "summary", prompt_eval_count: 100, eval_count: 50 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const r = await engine.runIngest({
      rawText: "some text",
      slug: "x",
      category: "concepts",
      agent: "claude-ce425dcc",
      sourcePath: "raw/x.md",
    });
    expect(calls).toHaveLength(1); // only stage 2 hit Ollama
    expect(r.suggestedRefs).toStrictEqual([]);
    expect(r.pipelineToken.spends[1].inputTokens).toStrictEqual(0);
  });

  it("strips suggestions that are not in the known slugs list (Ollama hallucination guard)", async () => {
    const fetchImpl = makeFetchStub((prompt) => {
      if (prompt.includes("summarizer")) return { response: "ok", prompt_eval_count: 100, eval_count: 10 };
      return { response: "real-slug, hallucinated-slug, another-fake", prompt_eval_count: 50, eval_count: 5 };
    });
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const r = await engine.runIngest({
      rawText: "x",
      slug: "y",
      category: "concepts",
      agent: "claude-ce425dcc",
      sourcePath: "raw/y.md",
      knownSlugs: ["real-slug"],
    });
    expect(r.suggestedRefs).toStrictEqual(["real-slug"]);
  });

  it("rejects empty rawText", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "", prompt_eval_count: 0, eval_count: 0 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    await expect(
      engine.runIngest({
        rawText: "   ",
        slug: "x",
        category: "concepts",
        agent: "claude-ce425dcc",
        sourcePath: "x",
      })
    ).rejects.toThrow(/rawText required/);
  });

  it("rejects missing required fields (agent, slug, category, sourcePath)", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok" }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    await expect(
      engine.runIngest({ rawText: "t", slug: "", category: "concepts", agent: "a", sourcePath: "p" })
    ).rejects.toThrow(/slug required/);
    await expect(
      engine.runIngest({ rawText: "t", slug: "s", category: "", agent: "a", sourcePath: "p" })
    ).rejects.toThrow(/category required/);
    await expect(
      engine.runIngest({ rawText: "t", slug: "s", category: "concepts", agent: "", sourcePath: "p" })
    ).rejects.toThrow(/agent required/);
    await expect(
      engine.runIngest({ rawText: "t", slug: "s", category: "concepts", agent: "a", sourcePath: "" })
    ).rejects.toThrow(/sourcePath required/);
  });

  it("propagates Ollama HTTP failure", async () => {
    const failingFetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => "service down",
    });
    const engine = new WikiIngestRouterEngine({ fetchImpl: failingFetch, indexEngine, logEngine });
    await expect(
      engine.runIngest({
        rawText: "x",
        slug: "s",
        category: "concepts",
        agent: "claude-aaaaaaaa",
        sourcePath: "p",
      })
    ).rejects.toThrow(/Ollama HTTP 503/);
  });
});

// ─── finalizeIngest stage 5 + token accounting ────────────────────────

describe("finalizeIngest — stage 5 + ≥70% Ollama-share floor", () => {
  it("commits to index + log and reports ≥70% Ollama share for a 5K-word ingest", async () => {
    // Build a deterministic 5,000-word body so token estimates are stable.
    const word = "carbide";
    const rawText = Array.from({ length: 5000 }, () => word).join(" ");

    const fetchImpl = makeFetchStub((prompt) => {
      if (prompt.includes("summarizer")) {
        // Realistic Ollama returns: input is the full 5K-word source, output is ~250 words.
        return {
          response: "Carbide tooling overview. " + Array.from({ length: 250 }, () => word).join(" "),
          prompt_eval_count: Math.ceil(prompt.length / 4),
          eval_count: 250,
        };
      }
      return {
        response: "force-kienzle",
        prompt_eval_count: Math.ceil(prompt.length / 4),
        eval_count: 5,
      };
    });

    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const prepared = await engine.runIngest({
      rawText,
      slug: "carbide-overview",
      category: "concepts",
      agent: "claude-ce425dcc",
      sourcePath: "raw/articles/carbide-tooling.md",
      knownSlugs: ["force-kienzle"],
    });
    expect(prepared.pipelineToken.spends).toHaveLength(2);

    // Stage 4 is the caller's Claude synthesis. Use realistic small numbers —
    // a tight synthesis prompt + ~300-word condensed output.
    const claudeSpend = { inputTokens: 800, outputTokens: 400, model: "sonnet" as const, durationMs: 1200 };

    const r = await engine.finalizeIngest({
      pipelineToken: prepared.pipelineToken,
      synthesizedSummary: "Carbide tooling: classes, ISO ranges, and standard speed-feed window.",
      confidence: 0.85,
      claudeStageSpend: claudeSpend,
    });

    expect(r.indexResult.added).toStrictEqual(true);
    expect(r.logAppended).toStrictEqual(true);
    expect(r.spends).toHaveLength(4);

    const stage4 = r.spends.find((s) => s.stage === 4) as StageSpend;
    expect(stage4.model).toStrictEqual("sonnet");
    expect(stage4.inputTokens).toStrictEqual(800);
    expect(stage4.outputTokens).toStrictEqual(400);

    // Compute the ratio independently to assert the engine's calculation:
    const claudeTokens = claudeSpend.inputTokens + claudeSpend.outputTokens;
    expect(r.totalTokens).toStrictEqual(r.ollamaTokens + claudeTokens);
    expect(r.ollamaShare).toStrictEqual(r.ollamaTokens / r.totalTokens);
    expect(r.meetsSavingsFloor).toStrictEqual(true);
    expect(r.ollamaShare).toBeGreaterThanOrEqual(WIKI_INGEST_OLLAMA_FLOOR);

    // End-to-end disk verification.
    const idxRaw = await fs.readFile(indexEngine.getIndexPath(), "utf-8");
    expect(idxRaw.includes("[[carbide-overview]]")).toStrictEqual(true);
    const logRaw = await fs.readFile(logEngine.getLogPath(), "utf-8");
    expect(logRaw.includes("ingest | carbide-overview —")).toStrictEqual(true);
    expect(logRaw.includes("by:claude-ce425dcc")).toStrictEqual(true);
  });

  it("flags meetsSavingsFloor=false when Claude dominates token spend", async () => {
    // Tiny source — Ollama spends almost nothing, Claude spends a lot.
    const fetchImpl = makeFetchStub(() => ({ response: "tiny", prompt_eval_count: 5, eval_count: 1 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const prepared = await engine.runIngest({
      rawText: "a",
      slug: "tiny",
      category: "concepts",
      agent: "claude-aaaaaaaa",
      sourcePath: "raw/tiny.md",
      knownSlugs: ["x"],
    });
    const r = await engine.finalizeIngest({
      pipelineToken: prepared.pipelineToken,
      synthesizedSummary: "Tiny synthesis.",
      confidence: 0.5,
      claudeStageSpend: { inputTokens: 5000, outputTokens: 5000, model: "opus", durationMs: 1000 },
    });
    expect(r.meetsSavingsFloor).toStrictEqual(false);
    expect(r.ollamaShare).toBeLessThan(WIKI_INGEST_OLLAMA_FLOOR);
  });

  it("rejects out-of-range confidence", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok", prompt_eval_count: 10, eval_count: 5 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const prepared = await engine.runIngest({
      rawText: "x",
      slug: "x",
      category: "concepts",
      agent: "claude-aaaaaaaa",
      sourcePath: "raw/x.md",
    });
    await expect(
      engine.finalizeIngest({
        pipelineToken: prepared.pipelineToken,
        synthesizedSummary: "ok",
        confidence: 1.5,
        claudeStageSpend: { inputTokens: 10, outputTokens: 10, model: "sonnet", durationMs: 100 },
      })
    ).rejects.toThrow(/confidence must be in/);
  });

  it("rejects NaN confidence", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok", prompt_eval_count: 10, eval_count: 5 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const prepared = await engine.runIngest({
      rawText: "x",
      slug: "x",
      category: "concepts",
      agent: "claude-aaaaaaaa",
      sourcePath: "raw/x.md",
    });
    await expect(
      engine.finalizeIngest({
        pipelineToken: prepared.pipelineToken,
        synthesizedSummary: "ok",
        confidence: NaN,
        claudeStageSpend: { inputTokens: 10, outputTokens: 10, model: "sonnet", durationMs: 100 },
      })
    ).rejects.toThrow(/confidence must be finite/);
  });

  it("rejects empty synthesizedSummary", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok", prompt_eval_count: 10, eval_count: 5 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    const prepared = await engine.runIngest({
      rawText: "x",
      slug: "x",
      category: "concepts",
      agent: "claude-aaaaaaaa",
      sourcePath: "raw/x.md",
    });
    await expect(
      engine.finalizeIngest({
        pipelineToken: prepared.pipelineToken,
        synthesizedSummary: "   ",
        confidence: 0.5,
        claudeStageSpend: { inputTokens: 10, outputTokens: 10, model: "sonnet", durationMs: 100 },
      })
    ).rejects.toThrow(/synthesizedSummary required/);
  });

  it("re-finalize with same content is idempotent at the index layer", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok", prompt_eval_count: 100, eval_count: 50 }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });

    const prepared = await engine.runIngest({
      rawText: "carbide",
      slug: "tool-carbide",
      category: "concepts",
      agent: "claude-aaaaaaaa",
      sourcePath: "raw/c.md",
    });
    const claudeSpend = { inputTokens: 100, outputTokens: 50, model: "sonnet" as const, durationMs: 200 };
    const r1 = await engine.finalizeIngest({
      pipelineToken: prepared.pipelineToken,
      synthesizedSummary: "Carbide tooling overview.",
      confidence: 0.8,
      claudeStageSpend: claudeSpend,
      lastVerified: "2026-04-27",
    });
    const r2 = await engine.finalizeIngest({
      pipelineToken: prepared.pipelineToken,
      synthesizedSummary: "Carbide tooling overview.",
      confidence: 0.8,
      claudeStageSpend: claudeSpend,
      lastVerified: "2026-04-27", // pin to make r1 == r2 deterministically
    });
    expect(r1.indexResult.added).toStrictEqual(true);
    expect(r2.indexResult.added).toStrictEqual(false);
  });
});

// ─── execute() refusal + capabilities ─────────────────────────────────

describe("WikiIngestRouterEngine — capability surface", () => {
  it("execute() refuses with a clear error pointing to the two-step API", async () => {
    const fetchImpl = makeFetchStub(() => ({ response: "ok" }));
    const engine = new WikiIngestRouterEngine({ fetchImpl, indexEngine, logEngine });
    await expect(engine.execute({})).rejects.toThrow(/runIngest.*finalizeIngest/);
  });

  it("getCapabilities lists runIngest and finalizeIngest", () => {
    const engine = new WikiIngestRouterEngine({ indexEngine, logEngine });
    const names = engine.getCapabilities().map((c) => c.name).sort();
    expect(names).toStrictEqual(["finalizeIngest", "runIngest"]);
  });
});
