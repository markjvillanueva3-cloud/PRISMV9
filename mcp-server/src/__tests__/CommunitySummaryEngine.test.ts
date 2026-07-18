/**
 * CommunitySummaryEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06
 *
 * Hermetic: injected engine catalog (no ENGINE_DIGEST.md read) + injected Ollama
 * caller (no network). Covers the 5 spec tests (happy / empty cluster / Ollama
 * unreachable / oversized cluster / token-cap exceeded) + 2 adversarial (Ollama
 * returns empty string; 1000-engine single cluster) + clustering correctness +
 * DOMAIN_RULES order.
 */
import { describe, it, expect } from "vitest";
import { communitySummaryEngine, DOMAIN_RULES } from "../engines/CommunitySummaryEngine.js";
import type { EngineEntry } from "../engines/CommunitySummaryEngine.js";

const CATALOG: EngineEntry[] = [
  { name: "LatheTurningEngine", desc: "CSS turning + chuck safety" },
  { name: "ChuckJawEngine", desc: "chuck jaw clamp" },
  { name: "MillToolpathEngine", desc: "pocket milling toolpath" },
  { name: "WireEdmEngine", desc: "wedm spark gap" },
  { name: "NeuralTrainEngine", desc: "GNN training model" },
  { name: "RandomWidgetEngine", desc: "does an unrelated thing" },
];

describe("clusterByDomain", () => {
  it("buckets engines into the right domains; unmatched -> Other", () => {
    const clusters = communitySummaryEngine.clusterByDomain(CATALOG);
    expect(clusters.get("Lathe")!.map((e) => e.name).sort()).toEqual(["ChuckJawEngine", "LatheTurningEngine"]);
    expect(clusters.get("WEDM")!.map((e) => e.name)).toEqual(["WireEdmEngine"]);
    expect(clusters.get("Mill")!.map((e) => e.name)).toEqual(["MillToolpathEngine"]);
    expect(clusters.get("AI-ML")!.map((e) => e.name)).toEqual(["NeuralTrainEngine"]);
    expect(clusters.get("Other")!.map((e) => e.name)).toEqual(["RandomWidgetEngine"]);
  });

  it("DOMAIN_RULES order: WEDM precedes Mill (a wire-EDM engine is not swallowed by 'mill')", () => {
    const wedmIdx = DOMAIN_RULES.findIndex((r) => r.domain === "WEDM");
    const millIdx = DOMAIN_RULES.findIndex((r) => r.domain === "Mill");
    expect(wedmIdx).toBeLessThan(millIdx);
    const clusters = communitySummaryEngine.clusterByDomain([{ name: "WireEdmMillEngine", desc: "edm with mill ref" }]);
    expect(clusters.has("WEDM")).toBe(true);
    expect(clusters.has("Mill")).toBe(false);
  });
});

describe("summarizeDomain / summarizeCluster", () => {
  it("happy: extractive Lathe summary names engines, is token-bounded", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Lathe", { entries: CATALOG });
    expect(r.method).toBe("extractive");
    expect(r.count).toBe(2);
    expect(r.summary).toContain("Lathe");
    expect(r.summary).toContain("LatheTurningEngine");
    expect(r.tokens).toBeLessThanOrEqual(300);
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.truncated).toBe(false);
  });

  it("empty cluster (unknown domain) -> count 0, empty-cluster warning, no throw", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Nonexistent", { entries: CATALOG });
    expect(r.count).toBe(0);
    expect(r.summary).toContain("no engines");
    expect(r.warnings).toContain("empty cluster");
  });

  it("malformed domain throws", async () => {
    await expect(communitySummaryEngine.summarizeDomain("", { entries: CATALOG })).rejects.toThrow(/non-empty string/);
  });

  it("Ollama unreachable -> falls back to extractive + warns (no crash)", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Mill", {
      entries: CATALOG,
      useLlm: true,
      ollamaCall: async () => { throw new Error("ECONNREFUSED"); },
    });
    expect(r.method).toBe("extractive");
    expect(r.warnings.some((w) => w.includes("ollama unreachable"))).toBe(true);
    expect(r.summary).toContain("Mill");
  });

  it("adversarial: Ollama returns empty string -> extractive + 'returned empty' warn", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Mill", {
      entries: CATALOG,
      useLlm: true,
      ollamaCall: async () => "   ",
    });
    expect(r.method).toBe("extractive");
    expect(r.warnings.some((w) => w.includes("returned empty"))).toBe(true);
  });

  it("Ollama success -> method 'ollama', prose used", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Mill", {
      entries: CATALOG,
      useLlm: true,
      ollamaCall: async () => "The Mill cluster handles pocket milling and toolpaths.",
    });
    expect(r.method).toBe("ollama");
    expect(r.summary).toBe("The Mill cluster handles pocket milling and toolpaths.");
  });

  it("token-cap exceeded (Ollama returns a huge string) -> truncated + warned, never exceeds cap", async () => {
    const huge = "word ".repeat(500); // ~2500 chars -> ~625 tokens
    const r = await communitySummaryEngine.summarizeDomain("Mill", {
      entries: CATALOG,
      useLlm: true,
      maxTokens: 50,
      ollamaCall: async () => huge,
    });
    expect(r.truncated).toBe(true);
    expect(r.tokens).toBeLessThanOrEqual(50);
    expect(r.summary).toContain("[truncated]");
    expect(r.warnings.some((w) => w.includes("truncated"))).toBe(true);
  });

  it("tiny maxTokens (<= suffix cost) still holds the cap (suffix dropped, no overshoot)", async () => {
    const r = await communitySummaryEngine.summarizeDomain("Mill", { entries: CATALOG, maxTokens: 2 });
    expect(r.truncated).toBe(true);
    expect(r.tokens).toBeLessThanOrEqual(2); // cap holds even when the 15-char suffix would overshoot
  });

  it("oversized cluster (1000 engines) -> extractive stays bounded (topK cap + token-cap)", async () => {
    const big: EngineEntry[] = Array.from({ length: 1000 }, (_, i) => ({ name: `MillEngine${i}`, desc: "milling" }));
    const r = await communitySummaryEngine.summarizeDomain("Mill", { entries: big, maxTokens: 200 });
    expect(r.count).toBe(1000);
    expect(r.tokens).toBeLessThanOrEqual(200);
    expect(r.summary).toContain("+"); // "+988 more" tail
  });
});

describe("summarizeAll", () => {
  it("returns one summary per non-empty domain, deterministically ordered", async () => {
    const all = await communitySummaryEngine.summarizeAll({ entries: CATALOG });
    const domains = all.map((c) => c.domain);
    expect(domains).toEqual([...domains].sort()); // deterministic order
    expect(domains).toContain("Lathe");
    expect(domains).toContain("Other");
    // every summary is token-bounded
    expect(all.every((c) => c.tokens <= 300)).toBe(true);
    // total engines preserved across clusters (no drops)
    expect(all.reduce((s, c) => s + c.count, 0)).toBe(CATALOG.length);
  });
});
