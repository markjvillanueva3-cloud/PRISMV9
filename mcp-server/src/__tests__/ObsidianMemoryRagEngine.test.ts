/**
 * ObsidianMemoryRagEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U05.
 *
 * Verifies the keyword-overlap RAG engine that surfaces vault entries
 * (memories + tribal) when the user prompt contains memory-recall
 * keywords. Pure read-only fs scan; no Qdrant dependency.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ObsidianMemoryRagEngine } from "../engines/ObsidianMemoryRagEngine.js";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-rag-${prefix}-`));
}

function writeMd(dir: string, name: string, body: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, body, "utf-8");
  return p;
}

describe("ObsidianMemoryRagEngine — shouldTrigger", () => {
  const engine = new ObsidianMemoryRagEngine();

  it("fires on 'remember' keyword", () => {
    expect(engine.shouldTrigger("can you remember what we said about chip load")).toBe(true);
  });

  it("fires on 'recall' keyword", () => {
    expect(engine.shouldTrigger("recall my preference for tool selection")).toBe(true);
  });

  it("fires on 'last time' phrase", () => {
    expect(engine.shouldTrigger("what did we decide last time about feedrates")).toBe(true);
  });

  it("fires on 'previous' keyword", () => {
    expect(engine.shouldTrigger("apply the previous tool wear settings to this job")).toBe(true);
  });

  it("does NOT fire on a regular machining question", () => {
    expect(engine.shouldTrigger("what is the kc1.1 constant for steel")).toBe(false);
  });

  it("does NOT fire on a too-short prompt", () => {
    expect(engine.shouldTrigger("recall")).toBe(false);
  });

  it("does NOT fire on empty prompt", () => {
    expect(engine.shouldTrigger("")).toBe(false);
  });

  it("forceSearch=true bypasses keyword detection", () => {
    expect(engine.shouldTrigger("kc1.1 steel", true)).toBe(true);
  });

  it("forceSearch=true overrides empty-query short-circuit", () => {
    expect(engine.shouldTrigger("", true)).toBe(true);
  });
});

describe("ObsidianMemoryRagEngine — query()", () => {
  let memoriesDir: string;
  let tribalDir: string;
  const engine = new ObsidianMemoryRagEngine();

  beforeEach(() => {
    memoriesDir = mkTmp("mem");
    tribalDir = mkTmp("trib");
  });

  afterEach(() => {
    for (const d of [memoriesDir, tribalDir]) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("returns empty result with triggered=false when no memory keyword", () => {
    writeMd(memoriesDir, "feedback.md", "# F\nuser likes deep adaptive roughing");
    const r = engine.query({ query: "kc1.1 steel constant", memoriesDir, tribalDir });
    expect(r.triggered).toBe(false);
    expect(r.hits).toEqual([]);
    expect(r.scanned).toBe(0);
  });

  it("returns top-K hits ranked by score on memory-keyword query", () => {
    writeMd(memoriesDir, "a.md", "# A\nadaptive roughing chip load steel cutting force");
    writeMd(memoriesDir, "b.md", "# B\nadaptive roughing steel");
    writeMd(memoriesDir, "c.md", "# C\nlathe threading thread pitch");

    const r = engine.query({
      query: "remember the adaptive roughing chip load settings for steel",
      memoriesDir, tribalDir, topK: 3,
    });
    expect(r.triggered).toBe(true);
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
    expect(r.hits[0].filename).toBe("a.md");
    expect(r.hits[0].source).toBe("memory");
    const filenames = r.hits.map((h) => h.filename);
    expect(filenames.includes("c.md")).toBe(false);
    expect(filenames.includes("a.md")).toBe(true);
    expect(filenames.includes("b.md")).toBe(true);
  });

  it("scores tribal/ entries and returns them with source='tribal'", () => {
    writeMd(tribalDir, "edm-001.md", "# E\nWEDM wire feed taper compensation");
    const r = engine.query({
      query: "remember the WEDM wire feed setting we used",
      memoriesDir, tribalDir,
    });
    expect(r.hits.length).toBeGreaterThanOrEqual(1);
    expect(r.hits[0].source).toBe("tribal");
    expect(r.hits[0].filename).toBe("edm-001.md");
    expect(r.hits[0].title).toBe("E");
  });

  it("strips frontmatter and uses # heading as title", () => {
    writeMd(memoriesDir, "fm.md", "---\nkind: mirrored_memory\nschema_version: 1.0.0\n---\n\n# Real Title Here\nbody adaptive roughing");
    const r = engine.query({ query: "remember adaptive roughing", memoriesDir, tribalDir });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].title).toBe("Real Title Here");
    expect(r.hits[0].body).toContain("body adaptive roughing");
    expect(r.hits[0].body.includes("kind: mirrored_memory")).toBe(false);
    expect(r.hits[0].body.includes("# Real Title Here")).toBe(false);
  });

  it("falls back to filename (without .md) when no # heading", () => {
    writeMd(memoriesDir, "noheading.md", "just body adaptive roughing content");
    const r = engine.query({ query: "remember adaptive roughing", memoriesDir, tribalDir });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].title).toBe("noheading");
  });

  it("respects topK", () => {
    for (let i = 0; i < 10; i++) {
      writeMd(memoriesDir, `t${i}.md`, `# T${i}\nadaptive roughing entry ${i} chip load`);
    }
    const r = engine.query({ query: "remember adaptive roughing", memoriesDir, tribalDir, topK: 3 });
    expect(r.hits.length).toBe(3);
    expect(r.scanned).toBe(10);
  });

  it("respects maxBodyChars and appends [...truncated]", () => {
    writeMd(memoriesDir, "big.md", `# Big\nadaptive roughing ${"X".repeat(5_000)}`);
    const r = engine.query({
      query: "remember adaptive roughing",
      memoriesDir, tribalDir, maxBodyChars: 200,
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].body.length).toBeLessThanOrEqual(220);
    expect(r.hits[0].body.endsWith("[…truncated]")).toBe(true);
  });

  it("graceful when memoriesDir is missing", () => {
    const r = engine.query({
      query: "remember anything",
      memoriesDir: "/no/such/dir",
      tribalDir,
    });
    expect(r.triggered).toBe(true);
    expect(r.hits).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("graceful when both source dirs are missing", () => {
    const r = engine.query({
      query: "remember anything",
      memoriesDir: "/no/such/mem",
      tribalDir: "/no/such/trib",
    });
    expect(r.triggered).toBe(true);
    expect(r.hits).toEqual([]);
    expect(r.scanned).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("forceSearch=true triggers even without memory keywords", () => {
    writeMd(memoriesDir, "x.md", "# X\nadaptive roughing");
    const r = engine.query({
      query: "adaptive roughing",
      memoriesDir, tribalDir, forceSearch: true,
    });
    expect(r.triggered).toBe(true);
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits[0].filename).toBe("x.md");
  });

  it("variability: 3+ mixed-source corpora yield correctly-tagged hits", () => {
    writeMd(memoriesDir, "feedback_a.md", "# Feedback A\nadaptive roughing high MRR");
    writeMd(memoriesDir, "user_role.md", "# Role\nuser is CNC programmer");
    writeMd(tribalDir, "tribal-1.md", "# Tip 1\nadaptive roughing chip load 0.15 mm");
    writeMd(tribalDir, "tribal-2.md", "# Tip 2\nthread cutting infeed compound");

    const r = engine.query({
      query: "remember adaptive roughing",
      memoriesDir, tribalDir, topK: 5,
    });
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
    const sources = new Set(r.hits.map((h) => h.source));
    expect(sources.has("memory")).toBe(true);
    expect(sources.has("tribal")).toBe(true);
    const filenames = r.hits.map((h) => h.filename);
    expect(filenames.includes("tribal-2.md")).toBe(false);
    expect(filenames.includes("user_role.md")).toBe(false);
  });

  it("ignores non-.md files in vault dirs", () => {
    writeMd(memoriesDir, "good.md", "# G\nadaptive roughing");
    fs.writeFileSync(path.join(memoriesDir, "ignore.txt"), "adaptive roughing in txt", "utf-8");
    fs.writeFileSync(path.join(memoriesDir, "ignore.json"), "{\"x\": \"adaptive roughing\"}", "utf-8");
    const r = engine.query({ query: "remember adaptive roughing", memoriesDir, tribalDir });
    expect(r.hits.length).toBe(1);
    expect(r.scanned).toBe(1);
  });
});

describe("ObsidianMemoryRagEngine — formatForInjection", () => {
  const engine = new ObsidianMemoryRagEngine();

  it("returns empty string when no hits", () => {
    expect(engine.formatForInjection({
      ok: true, triggered: true, hits: [], scanned: 5, query: "x", durationMs: 1,
    })).toBe("");
  });

  it("returns empty string when not triggered", () => {
    expect(engine.formatForInjection({
      ok: true, triggered: false, hits: [], scanned: 0, query: "x", durationMs: 1,
    })).toBe("");
  });

  it("renders hits as markdown with source/filename/score per entry", () => {
    const out = engine.formatForInjection({
      ok: true, triggered: true, scanned: 2, query: "remember adaptive", durationMs: 5,
      hits: [
        { source: "memory", filename: "a.md", fullPath: "/x/a.md", title: "Title A", body: "body a", score: 12.5, uniqueOverlap: 2, totalOverlap: 4 },
        { source: "tribal", filename: "t1.md", fullPath: "/x/t1.md", title: "Title T", body: "body t", score: 6.0, uniqueOverlap: 1, totalOverlap: 2 },
      ],
    });
    expect(out).toContain("## 🧠 Memory recall");
    expect(out).toContain("Query: remember adaptive");
    expect(out).toContain("memory: Title A");
    expect(out).toContain("tribal: Title T");
    expect(out).toContain("`a.md`");
    expect(out).toContain("`t1.md`");
    expect(out).toContain("score:12.5");
    expect(out).toContain("body a");
    expect(out).toContain("body t");
  });

  it("includes scanned/hit counts in the header", () => {
    const out = engine.formatForInjection({
      ok: true, triggered: true, scanned: 100, query: "remember x", durationMs: 5,
      hits: [
        { source: "memory", filename: "a.md", fullPath: "/x/a.md", title: "A", body: "x", score: 1, uniqueOverlap: 1, totalOverlap: 1 },
      ],
    });
    expect(out).toContain("1 of 100 vault entries matched");
  });
});

describe("ObsidianMemoryRagEngine — tokenization + overlap", () => {
  const engine = new ObsidianMemoryRagEngine();

  it("tokenize ignores tokens shorter than 3 chars", () => {
    const t = engine.tokenize("a bc def ghij");
    expect(t.has("a")).toBe(false);
    expect(t.has("bc")).toBe(false);
    expect(t.has("def")).toBe(true);
    expect(t.has("ghij")).toBe(true);
  });

  it("tokenize counts repeats", () => {
    const t = engine.tokenize("kienzle kienzle steel");
    expect(t.get("kienzle")).toBe(2);
    expect(t.get("steel")).toBe(1);
  });

  it("overlap returns unique=tokens, total=doc-occurrences", () => {
    const prompt = engine.tokenize("kienzle steel");
    const doc = engine.tokenize("kienzle kienzle steel constant kienzle");
    const o = engine.overlap(prompt, doc);
    expect(o.unique).toBe(2);
    expect(o.total).toBe(4);
  });

  it("overlap returns 0 when no shared tokens", () => {
    const o = engine.overlap(engine.tokenize("alpha"), engine.tokenize("beta gamma delta"));
    expect(o.unique).toBe(0);
    expect(o.total).toBe(0);
  });
});
