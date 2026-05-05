/**
 * KnowledgeIngestEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02.
 *
 * Verifies the orchestrator that walks a PDF through extractor→chunker→
 * embedder→Qdrant. Uses stub `Embedder` and stub `QdrantMemoryEngine`-shape
 * objects so tests run with no Python interpreter and no Qdrant container.
 * The Python extractor is exercised by stubbing the script with a tiny
 * Node JS file that emits the same JSON-lines protocol — that gives real
 * subprocess coverage without depending on pypdf at test time.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  KnowledgeIngestEngine,
  createKnowledgeIngestEngine,
  type IngestSourceMeta,
} from "../engines/KnowledgeIngestEngine.js";
import type {
  Embedder,
  MemoryResult,
  QdrantMemoryEngine,
  RememberInput,
  MemoryKind,
} from "../engines/QdrantMemoryEngine.js";

// -------- shared test rig --------

let tmpDir: string;
let stubScript: string;
let stubPdf: string;
let stubPdfEmpty: string;
let stubPdfFailing: string;
let stubScriptCrashing: string;

const NODE_BIN = process.execPath;

function makeStubExtractor(content: string, exitCode = 0, emitSummary = true): string {
  const filePath = path.join(tmpDir, `stub-${Math.random().toString(36).slice(2)}.mjs`);
  const lines: string[] = [];
  // emit page lines
  for (const block of content.split("|||")) {
    if (block.trim().length === 0) continue;
    const [pageStr, ...rest] = block.split("::");
    const page = Number(pageStr);
    const text = rest.join("::");
    lines.push(JSON.stringify({ page, text }));
  }
  if (emitSummary) {
    const totalChars = content.split("|||").reduce(
      (acc, b) => acc + (b.split("::").slice(1).join("::").length),
      0,
    );
    lines.push(JSON.stringify({
      summary: { pages: content.split("|||").filter((b) => b.trim()).length, chars: totalChars, path: "<stub>", size: 0 },
    }));
  }
  const js = `process.stdout.write(${JSON.stringify(lines.join("\n") + "\n")});\nprocess.exit(${exitCode});\n`;
  writeFileSync(filePath, js, "utf8");
  return filePath;
}

beforeAll(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "kie-test-"));
  stubPdf = path.join(tmpDir, "fake.pdf");
  writeFileSync(stubPdf, "%PDF-stub\n", "utf8");
  stubPdfEmpty = path.join(tmpDir, "empty.pdf");
  writeFileSync(stubPdfEmpty, "%PDF-empty\n", "utf8");
  stubPdfFailing = path.join(tmpDir, "broken.pdf");
  writeFileSync(stubPdfFailing, "%PDF-broken\n", "utf8");

  // Default stub script: 3 pages of meaningful text
  const longPage = "Spec sheet for insert IC907. Coating: TiAlN. Substrate: tungsten carbide. " +
    "Recommended cutting speed Vc = 180 m/min for 4140 steel. Feed per tooth fz = 0.12 mm. " +
    "Depth of cut ap = 2.5 mm. Width of cut ae = 0.5×D.";
  const content = `1::${longPage}|||2::${longPage} Insert grade IC908 for stainless steel.|||3::${longPage} See page 47 for force tables.`;
  stubScript = makeStubExtractor(content);
  stubScriptCrashing = makeStubExtractor("", 2, false);
});

afterAll(() => {
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// -------- in-memory stub QdrantMemoryEngine --------

class StubMemoryEngine {
  upserts: RememberInput[] = [];
  failNext = 0;
  embedderRef: Embedder | null = null;

  async remember(input: RememberInput): Promise<MemoryResult<void>> {
    if (this.failNext > 0) {
      this.failNext--;
      return { ok: false, error: "stub forced failure" };
    }
    const validKinds: MemoryKind[] = ["wiki", "tip", "rule", "engine", "skill", "note"] as MemoryKind[];
    if (!validKinds.includes(input.kind as MemoryKind)) {
      return { ok: false, error: `bad kind: ${input.kind}` };
    }
    this.upserts.push(input);
    return { ok: true, value: undefined };
  }

  setEmbedder(fn: Embedder | null): void {
    this.embedderRef = fn;
  }
}

function makeStubMemory(): StubMemoryEngine {
  return new StubMemoryEngine();
}

// Stub embedder — produces a deterministic 768-dim vector
const stubEmbedder: Embedder = async (text: string) => {
  const seed = text.length % 7;
  return Array.from({ length: 768 }, (_, i) => (i + seed) / 1000);
};

// -------- tests --------

describe("KnowledgeIngestEngine — construction", () => {
  it("throws when memory dep is missing", () => {
    expect(() => new KnowledgeIngestEngine(undefined as unknown as { memory: QdrantMemoryEngine })).toThrow(/memory dep required/);
    expect(() => new KnowledgeIngestEngine({} as { memory: QdrantMemoryEngine })).toThrow(/memory dep required/);
  });

  it("createKnowledgeIngestEngine returns an engine", () => {
    const memory = makeStubMemory() as unknown as QdrantMemoryEngine;
    const engine = createKnowledgeIngestEngine({ memory });
    expect(engine).toBeInstanceOf(KnowledgeIngestEngine);
  });

  it("auto-installs embedder onto memory if provided", () => {
    const stub = makeStubMemory();
    new KnowledgeIngestEngine({ memory: stub as unknown as QdrantMemoryEngine, embedder: stubEmbedder });
    expect(stub.embedderRef).toBe(stubEmbedder);
  });
});

describe("KnowledgeIngestEngine.chunkId", () => {
  it("produces 32-char hex id deterministically", () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    const a = engine.chunkId("foo.pdf", 0);
    const b = engine.chunkId("foo.pdf", 0);
    const c = engine.chunkId("foo.pdf", 1);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("different sources produce different ids for same chunk index", () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    expect(engine.chunkId("a.pdf", 0)).not.toBe(engine.chunkId("b.pdf", 0));
  });
});

describe("KnowledgeIngestEngine.metadataFor", () => {
  it("packs source meta + chunk provenance", () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    const meta: IngestSourceMeta = {
      source: "iscar-2024.pdf",
      title: "Iscar Catalog 2024",
      vendor: "Iscar",
      category: "insert-catalog",
      tags: ["milling", "carbide"],
    };
    const md = engine.metadataFor(
      { index: 5, text: "foo", charStart: 100, charEnd: 200, source: "iscar-2024.pdf", pageHint: 12 },
      meta,
    );
    expect(md.source).toBe("iscar-2024.pdf");
    expect(md.title).toBe("Iscar Catalog 2024");
    expect(md.vendor).toBe("Iscar");
    expect(md.category).toBe("insert-catalog");
    expect(md.tags).toEqual(["milling", "carbide"]);
    expect(md.chunkIndex).toBe(5);
    expect(md.pageHint).toBe(12);
    expect(md.charStart).toBe(100);
    expect(md.charEnd).toBe(200);
    expect(typeof md.ingestedAt).toBe("string");
    // ISO8601 sanity
    expect(Number.isNaN(Date.parse(md.ingestedAt as string))).toBe(false);
  });

  it("substitutes nulls/[] for missing optional fields", () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    const md = engine.metadataFor(
      { index: 0, text: "x", charStart: 0, charEnd: 1, source: "s", pageHint: null },
      { source: "s" },
    );
    expect(md.title).toBeNull();
    expect(md.vendor).toBeNull();
    expect(md.category).toBeNull();
    expect(md.tags).toEqual([]);
    expect(md.pageHint).toBeNull();
  });
});

describe("KnowledgeIngestEngine.ingestPdf — input validation", () => {
  it("throws on missing pdfPath", async () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    await expect(engine.ingestPdf("", { source: "x" })).rejects.toThrow(/pdfPath required/);
  });

  it("throws on missing meta.source", async () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    await expect(engine.ingestPdf(stubPdf, { source: "" })).rejects.toThrow(/meta.source required/);
  });

  it("throws when file does not exist", async () => {
    const engine = new KnowledgeIngestEngine({ memory: makeStubMemory() as unknown as QdrantMemoryEngine });
    await expect(engine.ingestPdf("Z:/no/such/file.pdf", { source: "x" })).rejects.toThrow(/file not found/);
  });
});

describe("KnowledgeIngestEngine.ingestPdf — happy path", () => {
  it("extracts, chunks, and upserts under kind='wiki' with deterministic ids", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const result = await engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf", title: "Fake", vendor: "TestVendor", category: "test" },
      { pythonBin: NODE_BIN, extractorScript: stubScript, timeoutMs: 30_000 },
    );

    expect(result.source).toBe("fake.pdf");
    expect(result.pages).toBe(3);
    expect(result.chars).toBeGreaterThan(100);
    expect(result.chunks).toBeGreaterThan(0);
    expect(result.upserted).toBe(result.chunks);
    expect(result.errors).toEqual([]);
    expect(result.empty).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Each upsert went to kind='wiki'
    for (const u of stub.upserts) {
      expect(u.kind).toBe("wiki");
      expect(typeof u.id).toBe("string");
      expect(u.text.length).toBeGreaterThan(0);
      expect(u.metadata?.source).toBe("fake.pdf");
      expect(u.metadata?.vendor).toBe("TestVendor");
    }

    // Re-running produces same ids ⇒ idempotency
    const ids1 = stub.upserts.map((u) => u.id);
    const stub2 = makeStubMemory();
    const engine2 = new KnowledgeIngestEngine({
      memory: stub2 as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    await engine2.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: stubScript, timeoutMs: 30_000 },
    );
    const ids2 = stub2.upserts.map((u) => u.id);
    expect(ids2).toEqual(ids1);
  });

  it("propagates pageHint from source page through to chunk metadata", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const longPage = "Spec sheet for insert IC907. Coating: TiAlN. Substrate: tungsten carbide. " +
      "Recommended cutting speed Vc = 180 m/min for 4140 steel. Feed per tooth fz = 0.12 mm. " +
      "Depth of cut ap = 2.5 mm. Width of cut ae = 0.5×D.";
    const content = `1::${longPage}|||2::${longPage} Insert grade IC908 for stainless steel.|||3::${longPage} See page 47 for force tables.`;
    const localStub = makeStubExtractor(content);
    await engine.ingestPdf(
      stubPdf,
      { source: "phinted.pdf" },
      { pythonBin: NODE_BIN, extractorScript: localStub, timeoutMs: 30_000 },
    );
    const pages = new Set(stub.upserts.map((u) => u.metadata?.pageHint));
    expect(pages.has(1)).toBe(true);
    expect(pages.has(2)).toBe(true);
    expect(pages.has(3)).toBe(true);
  });

  it("dryRun extracts+chunks but skips Qdrant upsert", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const result = await engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: stubScript, timeoutMs: 30_000, dryRun: true },
    );
    expect(result.chunks).toBeGreaterThan(0);
    expect(result.upserted).toBe(0);
    expect(stub.upserts.length).toBe(0);
  });
});

describe("KnowledgeIngestEngine.ingestPdf — failure modes", () => {
  it("failure mode 1: extractor produces empty PDF text → result.empty=true, no upsert", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const emptyScript = makeStubExtractor("1::|||2::");
    const result = await engine.ingestPdf(
      stubPdfEmpty,
      { source: "empty.pdf" },
      { pythonBin: NODE_BIN, extractorScript: emptyScript, timeoutMs: 30_000 },
    );
    expect(result.empty).toBe(true);
    expect(result.upserted).toBe(0);
    expect(stub.upserts.length).toBe(0);
  });

  it("failure mode 2: extractor exits non-zero → ingestPdf rejects", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    await expect(engine.ingestPdf(
      stubPdfFailing,
      { source: "broken.pdf" },
      { pythonBin: NODE_BIN, extractorScript: stubScriptCrashing, timeoutMs: 30_000 },
    )).rejects.toThrow(/extractor exit/);
  });

  it("failure mode 3: per-chunk upsert failure recorded, not thrown; remaining chunks still ingest", async () => {
    const stub = makeStubMemory();
    stub.failNext = 2; // first 2 upserts fail
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const result = await engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: stubScript, timeoutMs: 30_000 },
    );
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].reason).toContain("forced failure");
    expect(result.upserted).toBe(result.chunks - 2);
  });
});

describe("KnowledgeIngestEngine.ingestPdf — adversarial", () => {
  it("adversarial 1: extractor produces malformed JSON line is skipped silently", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    // emit one good page, one garbage line, then summary
    const garbageScript = path.join(tmpDir, "garbage-stub.mjs");
    const lines = [
      JSON.stringify({ page: 1, text: "Real content here. Lots of detail. More words to make it chunkable. " + "x ".repeat(200) }),
      "this is not json",
      JSON.stringify({ summary: { pages: 1, chars: 500, path: "<stub>", size: 0 } }),
    ];
    writeFileSync(garbageScript, `process.stdout.write(${JSON.stringify(lines.join("\n") + "\n")});\nprocess.exit(0);\n`, "utf8");
    const result = await engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: garbageScript, timeoutMs: 30_000 },
    );
    expect(result.pages).toBe(1);
    expect(result.chunks).toBeGreaterThan(0);
    expect(result.upserted).toBe(result.chunks);
  });

  it("adversarial 2: extractor times out → ingestPdf rejects with timeout", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    // Hung script: writes nothing, sleeps forever
    const hungScript = path.join(tmpDir, "hung-stub.mjs");
    writeFileSync(hungScript, `setInterval(() => {}, 1000);\n`, "utf8");
    await expect(engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: hungScript, timeoutMs: 250 },
    )).rejects.toThrow(/timeout/);
  });

  it("adversarial 3: extractor produces no summary → reject with diagnostic", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const noSummaryScript = path.join(tmpDir, "nosumm-stub.mjs");
    writeFileSync(
      noSummaryScript,
      `process.stdout.write(${JSON.stringify(JSON.stringify({ page: 1, text: "hi" }) + "\n")});\nprocess.exit(0);\n`,
      "utf8",
    );
    await expect(engine.ingestPdf(
      stubPdf,
      { source: "fake.pdf" },
      { pythonBin: NODE_BIN, extractorScript: noSummaryScript, timeoutMs: 30_000 },
    )).rejects.toThrow(/no summary/);
  });
});

describe("KnowledgeIngestEngine — provenance contract integration", () => {
  it("upserted chunks carry source, vendor, category, tags into Qdrant payload", async () => {
    const stub = makeStubMemory();
    const engine = new KnowledgeIngestEngine({
      memory: stub as unknown as QdrantMemoryEngine,
      embedder: stubEmbedder,
    });
    const meta: IngestSourceMeta = {
      source: "sandvik-2024.pdf",
      title: "Sandvik Coromant Catalog 2024",
      vendor: "Sandvik",
      category: "insert-catalog",
      tags: ["turning", "iso-p"],
    };
    await engine.ingestPdf(
      stubPdf,
      meta,
      { pythonBin: NODE_BIN, extractorScript: stubScript, timeoutMs: 30_000 },
    );
    expect(stub.upserts.length).toBeGreaterThan(0);
    for (const u of stub.upserts) {
      expect(u.metadata?.source).toBe("sandvik-2024.pdf");
      expect(u.metadata?.title).toBe("Sandvik Coromant Catalog 2024");
      expect(u.metadata?.vendor).toBe("Sandvik");
      expect(u.metadata?.category).toBe("insert-catalog");
      expect(u.metadata?.tags).toEqual(["turning", "iso-p"]);
    }
  });

  it("stub PDF file size is observable (sanity rig check)", () => {
    expect(statSync(stubPdf).size).toBeGreaterThan(0);
  });
});
