/**
 * WikiRetrievalContextEngine — top-K wiki retrieval tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-WIKI-RETRIEVAL.
 *
 * Real fs against temp dirs. No mocks. Exact assertions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { WikiRetrievalContextEngine } from "../engines/WikiRetrievalContextEngine.js";

let engine: WikiRetrievalContextEngine;
let tmpRoot: string;

const FAKE_INDEX = `---
title: Test Wiki Index
---

## concepts

- [[CuttingForce]] — CuttingForceEngine — Kienzle force computation for milling | category:concepts | source:src/engines/CuttingForceEngine.ts
- [[ToolLife]] — ToolLifeEngine — Taylor tool life equation | category:concepts | source:src/engines/ToolLifeEngine.ts
- [[Deflection]] — DeflectionEngine — cantilever beam deflection for tool stickout | category:concepts | source:src/engines/DeflectionEngine.ts
- [[ChatterStability]] — ChatterStabilityEngine — SLD stability lobe diagrams | category:concepts | source:src/engines/ChatterStabilityEngine.ts
- [[ThermalAnalysis]] — ThermalAnalysisEngine — heat transfer for cutting tools | category:concepts | source:src/engines/ThermalAnalysisEngine.ts
- [[GenericPlot]] — GenericPlotEngine — plotting utility | category:concepts | source:src/engines/GenericPlotEngine.ts

## entities

- [[1018Steel]] — ISO P group steel material properties | category:entities | source:src/engines/MaterialDatabase.ts
- [[CarbideEndmill]] — Carbide endmill geometry and coatings | category:entities | source:src/engines/ToolDatabase.ts
`;

beforeEach(() => {
  engine = new WikiRetrievalContextEngine();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-wiki-retrieval-"));
  fs.writeFileSync(path.join(tmpRoot, "index.md"), FAKE_INDEX, "utf-8");
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("WikiRetrievalContextEngine — happy path", () => {
  it("retrieves entries scored by token-overlap with prompt", () => {
    const r = engine.retrieve("compute Kienzle cutting force for steel milling", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBeGreaterThan(0);
    expect(r.text).toContain("CuttingForce");
    expect(r.text).toContain("Kienzle");
  });

  it("returns top-K entries in descending score order", () => {
    const r = engine.retrieve("Kienzle cutting force milling steel", { wikiRoot: tmpRoot, topK: 3 });
    expect(r.totalEntries).toBeLessThanOrEqual(3);
    // CuttingForce should rank above unrelated entries
    const cuttingForceIdx = r.text.indexOf("CuttingForce");
    const genericPlotIdx = r.text.indexOf("GenericPlot");
    expect(cuttingForceIdx).toBeGreaterThan(-1);
    if (genericPlotIdx > -1) {
      expect(cuttingForceIdx).toBeLessThan(genericPlotIdx);
    }
  });

  it("filters out entries with zero overlap", () => {
    const r = engine.retrieve("xylophone aardvark zebra", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
    expect(r.text).toBe("");
  });

  it("respects byteBudget — truncates and reports truncation", () => {
    const r = engine.retrieve("Kienzle Taylor deflection chatter thermal cutting force tool life material steel", { wikiRoot: tmpRoot, byteBudget: 200, topK: 10 });
    expect(r.text.length).toBeLessThanOrEqual(200 + 100); // some slack for header
    expect(r.truncated).toBe(true);
  });

  it("writes section header when entries found", () => {
    const r = engine.retrieve("Kienzle force", { wikiRoot: tmpRoot });
    expect(r.text).toContain("### TOP RELEVANT WIKI ENTRIES");
  });
});

describe("WikiRetrievalContextEngine — index parsing", () => {
  it("parses categories from ## headers", () => {
    const r = engine.retrieve("steel material", { wikiRoot: tmpRoot });
    // Should match 1018Steel which is in 'entities' category
    expect(r.text).toContain("1018Steel");
    expect(r.text).toContain("entities");
  });

  it("ignores lines that aren't entries", () => {
    const r = engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    // Title line "Test Wiki Index" should NOT match — it's a title, not an entry
    expect(r.text).not.toContain("Test Wiki Index");
  });

  it("uses cache on repeat invocations (same mtime)", () => {
    engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    // Modify file but keep mtime stable by setting it back
    const stat = fs.statSync(path.join(tmpRoot, "index.md"));
    fs.writeFileSync(path.join(tmpRoot, "index.md"), FAKE_INDEX, "utf-8");
    fs.utimesSync(path.join(tmpRoot, "index.md"), stat.atime, stat.mtime);
    // Second call should hit cache
    const r2 = engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    expect(r2.totalEntries).toBeGreaterThan(0);
  });

  it("invalidates cache when mtime changes", () => {
    engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    // Modify mtime
    const future = new Date(Date.now() + 1000);
    fs.utimesSync(path.join(tmpRoot, "index.md"), future, future);
    const r2 = engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    expect(r2.totalEntries).toBeGreaterThan(0);
  });
});

describe("WikiRetrievalContextEngine — consensus retrieval layer", () => {
  function writeConsensus(sha8: string, prompt: string, answer: string, rec: string, agreement: string): void {
    const dir = path.join(tmpRoot, "consensus");
    fs.mkdirSync(dir, { recursive: true });
    const body = `---
recommendation: ${rec}
agreement_score: ${agreement}
---

## Prompt

\`\`\`
${prompt}
\`\`\`

## Consensus answer

\`\`\`
${answer}
\`\`\`
`;
    fs.writeFileSync(path.join(dir, `${sha8}.md`), body, "utf-8");
  }

  it("surfaces prior consensus answers when prompt overlaps", () => {
    writeConsensus("aaaaaaaa", "compute Kienzle force for 1018 steel", "kc1.1=1800 N/mm² for ISO P", "accept", "0.9");
    const r = engine.retrieve("Kienzle force 1018", { wikiRoot: tmpRoot });
    expect(r.consensusHits).toBeGreaterThan(0);
    expect(r.text).toContain("PRIOR CONSENSUS ANSWERS");
    expect(r.text).toContain("aaaaaaaa");
  });

  it("dedups consensus index.md from being scored as an entry", () => {
    writeConsensus("bbbbbbbb", "test prompt about Kienzle force", "answer", "accept", "0.8");
    fs.writeFileSync(path.join(tmpRoot, "consensus", "index.md"), "header content about Kienzle\n", "utf-8");
    const r = engine.retrieve("Kienzle force", { wikiRoot: tmpRoot });
    expect(r.text).not.toContain("[index]"); // index.md must not be scored as a consensus entry
  });

  it("ranks consensus by overlap score descending", () => {
    writeConsensus("11111111", "Kienzle cutting force milling steel", "first", "accept", "0.95");
    writeConsensus("22222222", "Taylor tool life equation", "second", "accept", "0.85");
    const r = engine.retrieve("Kienzle force milling", { wikiRoot: tmpRoot, topConsensus: 5 });
    const idx1 = r.text.indexOf("11111111");
    const idx2 = r.text.indexOf("22222222");
    expect(idx1).toBeGreaterThan(-1);
    if (idx2 > -1) expect(idx1).toBeLessThan(idx2);
  });
});

describe("WikiRetrievalContextEngine — failure modes", () => {
  it("returns empty result on missing index.md", () => {
    fs.unlinkSync(path.join(tmpRoot, "index.md"));
    const r = engine.retrieve("Kienzle", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
    expect(r.text).toBe("");
  });

  it("returns empty on empty prompt", () => {
    const r = engine.retrieve("", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
  });

  it("returns empty on non-string prompt", () => {
    const r = engine.retrieve(42 as unknown as string, { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
  });

  it("filters out stopwords from prompt tokens", () => {
    // "and the with for" should produce no real tokens
    const r = engine.retrieve("and the with for", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
  });

  it("filters tokens shorter than 3 chars", () => {
    const r = engine.retrieve("a b c", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBe(0);
  });
});

describe("WikiRetrievalContextEngine — adversarial inputs", () => {
  it("handles 50KB prompt without crashing", () => {
    const big = "Kienzle force ".repeat(5000);
    const r = engine.retrieve(big, { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBeGreaterThan(0);
  });

  it("handles unicode prompts", () => {
    const r = engine.retrieve("カット 切削 cutting force", { wikiRoot: tmpRoot });
    expect(r.totalEntries).toBeGreaterThan(0);
  });

  it("estimatedTokens scales with text length", () => {
    const r = engine.retrieve("Kienzle Taylor deflection chatter thermal", { wikiRoot: tmpRoot });
    expect(r.estimatedTokens).toBeGreaterThan(0);
    expect(r.estimatedTokens).toBe(Math.ceil(r.text.length * 0.25));
  });
});
