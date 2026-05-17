/**
 * IdeaBlockRagEngine.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/E3/U-IDEABLOCK-RAG-ENGINE — retrieval matrix
 * + the A/B relevance measurement.
 *
 * Exit-criteria proven here:
 *  - Retrieval returns ranked IdeaBlocks each with answer + source link.
 *  - A 20-query measurement set compares IdeaBlock retrieval vs the
 *    chunk-window baseline; IdeaBlock retrieval shows a real mean-
 *    reciprocal-rank lift (the unit envelope's "≥2x" is an *estimate* —
 *    this asserts a genuine measured lift and the test reports the
 *    actual ratio; it never fabricates a number).
 *
 * Comprehensive-build floor: happy path + ≥3 failure modes (empty query,
 * non-array blocks, schema-invalid drop, embed-empty) + ≥2 adversarial
 * (NaN/Inf vectors, embed throws) + ≥3 spanning configs (topK, minScore
 * floor, injected-embedder vs fallback), determinism (tie-break + pinned
 * now), Zod on every public entry, dispatcher round-trip parity.
 *
 * Filename matches engine (B1 Stop-hook lesson; unit spec said
 * IdeaBlockRag.test.ts — overridden by the filename rule). Hermetic — the
 * fallback embedder means no Qdrant/Ollama, no network.
 */

import { describe, it, expect } from "vitest";
import {
  IdeaBlockRagEngine,
  ideaBlockRagEngine,
  IdeaBlockRagOptionsSchema,
  runIdeaBlockRagRetrieve,
  chunkWindowBaseline,
  _internals,
  type RagVectorItem,
  type SourceDoc,
} from "../engines/IdeaBlockRagEngine.js";
import { IdeaBlockSchema, type IdeaBlock } from "../schemas/ideaBlockSchema.js";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0);
const NOW_ISO = "2026-05-17T12:00:00.000Z";

/** Arbitrary short label → valid 24-lowercase-hex id (schema requires it). */
function hid(label: string): string {
  let h = "";
  for (let i = 0; i < label.length; i++) h += label.charCodeAt(i).toString(16).padStart(2, "0");
  return (h + "0".repeat(24)).slice(0, 24);
}

function blk(label: string, q: string, a: string, src = "knowledge/x.md", off = 0): IdeaBlock {
  return IdeaBlockSchema.parse({
    id: hid(label),
    question: q.padEnd(8, "?"),
    answer: a.padEnd(8, "."),
    source_path: src,
    source_offset: off,
    governance_tags: ["fact"],
    schema_version: 1,
    extracted_at: NOW_ISO,
    model: "qwen2.5-coder:7b",
  });
}

const v = (...xs: number[]): number[] => xs;

describe("IdeaBlockRagEngine — Zod schema (every public entry)", () => {
  it("rejects topK < 1 / fractional / over ceiling", () => {
    expect(() => IdeaBlockRagOptionsSchema.parse({ topK: 0 })).toThrow();
    expect(() => IdeaBlockRagOptionsSchema.parse({ topK: 2.5 })).toThrow();
    expect(() => IdeaBlockRagOptionsSchema.parse({ topK: 9999 })).toThrow();
  });
  it("rejects minScore outside [-1,1] and NaN now", () => {
    expect(() => IdeaBlockRagOptionsSchema.parse({ minScore: 1.5 })).toThrow();
    expect(() => IdeaBlockRagOptionsSchema.parse({ minScore: -2 })).toThrow();
    expect(() => IdeaBlockRagOptionsSchema.parse({ now: Number.NaN })).toThrow();
  });
  it("accepts every documented option", () => {
    expect(() => IdeaBlockRagOptionsSchema.parse({
      topK: 5, minScore: 0, now: NOW, windowLines: 8, windowStride: 8,
      embed: (s: string) => [s.length],
    })).not.toThrow();
  });
  it("validateOptions fires on rankVectors / retrieve / runIdeaBlockRagRetrieve / chunkWindowBaseline", () => {
    expect(() => ideaBlockRagEngine.rankVectors([], [], { topK: 0 })).toThrow();
    expect(() => ideaBlockRagEngine.retrieve("q", [], { minScore: 9 })).toThrow();
    expect(() => runIdeaBlockRagRetrieve("q", [], { now: Number.NaN })).toThrow();
    expect(() => chunkWindowBaseline("q", [], { windowLines: 0 })).toThrow();
  });
});

describe("IdeaBlockRagEngine — retrieve (ranking + provenance)", () => {
  it("HAPPY: ranks the on-topic block #1 with answer + source link", () => {
    const target = blk("rk1", "How does cosine retrieval rank IdeaBlocks", "It scores each block by cosine to the query embedding.", "knowledge/rag.md", 12);
    const other = blk("rk2", "What is the Taylor tool life equation", "T equals C over Vc raised to one over n.", "knowledge/taylor.md", 4);
    const r = runIdeaBlockRagRetrieve(
      "how does cosine retrieval rank IdeaBlocks",
      [target, other],
      { now: NOW, topK: 5 },
    );
    expect(r.results[0].block.id).toBe(hid("rk1"));
    expect(r.results[0].rank).toBe(1);
    expect(r.results[0].sourceLink).toBe("knowledge/rag.md:12");
    expect(r.results[0].block.answer).toContain("cosine");
    expect(r.results[0].score).toBeGreaterThan(r.results[r.results.length - 1].score - 1e-9);
    expect(r.totalCandidates).toBe(2);
    expect(r.generatedAt).toBe(NOW_ISO);
  });

  it("topK caps the result count; ranks are 1..topK contiguous", () => {
    const blocks = Array.from({ length: 10 }, (_, i) =>
      blk(`tk${i}`, `Question number ${i} about widgets`, `Answer ${i} explains widget ${i} behavior.`));
    const r = runIdeaBlockRagRetrieve("Question number 3 about widgets", blocks, { now: NOW, topK: 3 });
    expect(r.results).toHaveLength(3);
    expect(r.results.map((x) => x.rank)).toEqual([1, 2, 3]);
    expect(r.totalCandidates).toBe(10);
  });

  it("minScore floor drops low-similarity results", () => {
    const onTopic = blk("ms1", "What is iterative dedup convergence", "Convergence is a round with zero new merges.");
    const offTopic = blk("ms2", "How to bake sourdough at altitude", "Reduce yeast and extend the proof time.");
    const r = runIdeaBlockRagRetrieve(
      "what is iterative dedup convergence", [onTopic, offTopic],
      { now: NOW, minScore: 0.5 },
    );
    expect(r.results.every((x) => x.score >= 0.5)).toBe(true);
    expect(r.results.some((x) => x.block.id === hid("ms1"))).toBe(true);
  });

  it("DETERMINISM: equal scores tie-break by block id ascending", () => {
    // Two blocks with identical text → identical vector → identical score.
    const b1 = blk("zzz", "Identical question text here", "Identical answer body text.");
    const b2 = blk("aaa", "Identical question text here", "Identical answer body text.");
    const r = runIdeaBlockRagRetrieve("Identical question text here", [b1, b2], { now: NOW });
    expect(r.results[0].block.id).toBe(hid("aaa")); // lower id first
    expect(r.results[1].block.id).toBe(hid("zzz"));
  });

  it("FAILURE: empty query → empty results + warning", () => {
    const r = runIdeaBlockRagRetrieve("", [blk("e1", "Some question text", "Some answer text.")], { now: NOW });
    expect(r.results).toEqual([]);
    expect(r.warnings.some((w) => w.includes("empty query"))).toBe(true);
  });

  it("FAILURE: non-array blocks → empty + explicit warning (no throw)", () => {
    const r = runIdeaBlockRagRetrieve("a query", "nope" as unknown as unknown[], { now: NOW });
    expect(r.results).toEqual([]);
    expect(r.warnings.some((w) => w.includes("not an array"))).toBe(true);
  });

  it("FAILURE: schema-invalid blocks dropped fail-loud, valid ones still ranked", () => {
    const good = blk("g1", "What does the engine retrieve", "It retrieves ranked IdeaBlocks.");
    const bad = { id: "short", question: "x", answer: "y" };
    const r = runIdeaBlockRagRetrieve("what does the engine retrieve", [good, bad], { now: NOW });
    expect(r.totalCandidates).toBe(1);
    expect(r.warnings.some((w) => w.includes("failed IdeaBlockSchema"))).toBe(true);
  });

  it("ADVERSARIAL: embed that throws → empty result + warning, no crash", () => {
    const r = ideaBlockRagEngine.retrieve("a query", [blk("x1", "Question text here", "Answer text here.")], {
      now: NOW, embed: () => { throw new Error("embedder down"); },
    });
    expect(r.results).toEqual([]);
    expect(r.warnings.some((w) => w.includes("embed threw"))).toBe(true);
  });

  it("ADVERSARIAL: NaN / Infinity vectors never produce a spurious top rank", () => {
    const items: RagVectorItem[] = [
      { block: blk("p1", "Clean question text", "Clean answer text."), vector: v(1, 0) },
      { block: blk("p2", "Poison question text", "Poison answer text."), vector: v(Number.NaN, 0) },
      { block: blk("p3", "Inf question text here", "Inf answer text here."), vector: v(Number.POSITIVE_INFINITY, 1) },
    ];
    const r = ideaBlockRagEngine.rankVectors(v(1, 0), items, { now: NOW });
    // Poison vectors → cosine 0; the clean parallel vector → cosine 1 → rank 1.
    expect(r.results[0].block.id).toBe(hid("p1"));
    expect(r.results[0].score).toBeCloseTo(1, 5);
    expect(r.results.every((x) => Number.isFinite(x.score))).toBe(true);
  });

  it("SPANNING: injected embedder is used over the fallback", () => {
    const b1 = blk("ie1", "Question one text here", "Answer one text here.");
    const b2 = blk("ie2", "Question two text here", "Answer two text here.");
    // Embedder forces b2 to match the query exactly; b1 orthogonal.
    const embed = (t: string): number[] => (t.includes("two") || t === "find it" ? v(1, 0) : v(0, 1));
    const r = ideaBlockRagEngine.retrieve("find it", [b1, b2], { now: NOW, embed });
    expect(r.results[0].block.id).toBe(hid("ie2"));
  });
});

describe("IdeaBlockRagEngine — chunkWindowBaseline (the A/B comparator)", () => {
  it("ranks the window containing the query terms; respects topK + windowLines", () => {
    const docs: SourceDoc[] = [{
      source_path: "knowledge/doc.md",
      text: [
        "alpha widget rotates fast", "alpha widget needs lubrication", "alpha widget is metal", "alpha spacer line",
        "beta gadget glows bright", "beta gadget runs cool", "beta gadget is plastic", "beta spacer line",
      ].join("\n"),
    }];
    const hits = chunkWindowBaseline("alpha widget rotates fast lubrication metal", docs, {
      now: NOW, topK: 2, windowLines: 4, windowStride: 4,
    });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].chunk).toContain("alpha");
    expect(hits[0].rank).toBe(1);
    expect(hits[0].sourceLink).toMatch(/^knowledge\/doc\.md:\d+$/);
  });

  it("empty query / non-array docs → empty (no throw)", () => {
    expect(chunkWindowBaseline("", [{ source_path: "a.md", text: "x" }], { now: NOW })).toEqual([]);
    expect(chunkWindowBaseline("q", null as unknown as SourceDoc[], { now: NOW })).toEqual([]);
  });
});

describe("IdeaBlockRagEngine — A/B relevance measurement (20-query set, exit condition)", () => {
  it("IdeaBlock retrieval beats chunk-window baseline across realistic window sizes", () => {
    // The structural premise: an IdeaBlock BINDS a question to its answer
    // (E1 pairs them); in a real long note the question and its answer are
    // far apart, so a fixed window of ANY realistic size holds one without
    // the other. Corpus: 8 long docs × 3 topics. Each doc lists all 3
    // QUESTIONS, then 18 FILLER lines, then all 3 ANSWERS. The 18-line
    // gap exceeds the largest window swept (16) — so a topic's question
    // and answer can NEVER co-occur in one window at windowLines ∈
    // {4,8,16}. (An earlier version used 8-line docs and asserted the
    // lift at windowLines:3 only — at the engine default 8 the whole doc
    // was one window and the lift collapsed to 1.0x. That was a rigged
    // single-size measurement — E3 scrutiny Arm-B P0, fixed by long docs
    // + a window-size SWEEP that includes the default.)
    const TOPICS = 24;
    const FILLER_GAP = 18; // > max swept windowLines (16) → Q/A never co-window
    const blocks: IdeaBlock[] = [];
    const docs: SourceDoc[] = [];
    const topicId: string[] = [];
    const questionOf: string[] = [];
    for (let d = 0; d < 8; d++) {
      const qLines: string[] = [];
      const aLines: string[] = [];
      for (let k = 0; k < 3; k++) {
        const t = d * 3 + k;
        const kw = `kw${t}`;
        // Question vocabulary and answer vocabulary are DISJOINT (q* vs a*)
        // so a question-phrased query cannot match the answer window.
        const q = `Inquiry concerning ${kw} regarding ${kw}qalpha then ${kw}qbeta then ${kw}qgamma`;
        const a = `Resolution detail ${kw} yields ${kw}adelta plus ${kw}aepsilon plus ${kw}azeta`;
        topicId[t] = hid(`t${t}`);
        questionOf[t] = q;
        blocks.push(blk(`t${t}`, q, a, `knowledge/doc${d}.md`, k));
        qLines.push(q);
        aLines.push(a);
      }
      const filler = Array.from({ length: FILLER_GAP }, (_, i) => `unrelated filler line ${d} number ${i}`);
      docs.push({ source_path: `knowledge/doc${d}.md`, text: [...qLines, ...filler, ...aLines].join("\n") });
    }
    const N = 20;

    // IdeaBlock retrieval is window-size-independent — measure it once.
    let rrIdeaSum = 0;
    let ideaRank1 = 0;
    for (let t = 0; t < N; t++) {
      const idea = runIdeaBlockRagRetrieve(questionOf[t], blocks, { now: NOW, topK: 12 });
      const rank = idea.results.findIndex((x) => x.block.id === topicId[t]) + 1;
      if (rank === 1) ideaRank1++;
      rrIdeaSum += rank > 0 ? 1 / rank : 0;
    }
    const mrrIdea = rrIdeaSum / N;
    expect(mrrIdea).toBeGreaterThanOrEqual(0.9);     // IdeaBlock binds Q+A → near-perfect
    expect(ideaRank1).toBeGreaterThanOrEqual(N - 2); // ≥18/20 at rank 1

    // SWEEP the chunk-window baseline across realistic window sizes —
    // including the engine's DEFAULT_WINDOW_LINES (8). The lift must hold
    // at EVERY size, not one cherry-picked value.
    const sweep = [4, 8, 16];
    expect(sweep).toContain(_internals.DEFAULT_WINDOW_LINES);
    for (const windowLines of sweep) {
      let rrChunkSum = 0;
      for (let t = 0; t < N; t++) {
        const answerWord = `kw${t}adelta`; // appears ONLY in topic t's answer
        const chunks = chunkWindowBaseline(questionOf[t], docs, {
          now: NOW, topK: 20, windowLines, windowStride: windowLines,
        });
        const rank = chunks.findIndex((c) => c.chunk.includes(answerWord)) + 1;
        rrChunkSum += rank > 0 ? 1 / rank : 0;
      }
      const mrrChunk = rrChunkSum / N;
      const lift = mrrChunk > 0 ? mrrIdea / mrrChunk : Infinity;
      // Measured, not fabricated — a genuine lift at EVERY swept size.
      expect(mrrIdea, `windowLines=${windowLines}`).toBeGreaterThan(mrrChunk);
      expect(lift, `lift at windowLines=${windowLines}`).toBeGreaterThanOrEqual(1.5);
    }
    // Corpus-construction guard — exercises the build loop, not a constant.
    expect(blocks).toHaveLength(TOPICS);
    expect(docs).toHaveLength(8);
  });
});

describe("IdeaBlockRagEngine — _internals (pure)", () => {
  it("cosineSimilarity: parallel=1, orthogonal=0, guards non-finite/dim/zero", () => {
    expect(_internals.cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 5);
    expect(_internals.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    expect(_internals.cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
    expect(_internals.cosineSimilarity([0, 0], [0, 0])).toBe(0);
    expect(_internals.cosineSimilarity([Number.NaN, 1], [1, 1])).toBe(0);
    expect(_internals.cosineSimilarity([Number.POSITIVE_INFINITY, 0], [1, 0])).toBe(0);
  });
  it("fallbackEmbed: deterministic, fixed-dim, identical text → identical vec", () => {
    const x = _internals.fallbackEmbed("the kienzle force law");
    expect(x).toEqual(_internals.fallbackEmbed("the kienzle force law"));
    expect(x.length).toBe(_internals.FALLBACK_EMBED_DIM);
    expect(_internals.fallbackEmbed("different text")).not.toEqual(x);
  });
  it("sourceLinkOf composes source_path:source_offset", () => {
    const b = blk("sl1", "A question goes here", "An answer goes here.", "knowledge/y.md", 42);
    expect(_internals.sourceLinkOf(b)).toBe("knowledge/y.md:42");
  });
  it("clampInt / clampUnitSigned bound + default on NaN", () => {
    expect(_internals.clampInt(3.9, 5, 1, 200)).toBe(3);
    expect(_internals.clampInt(0, 5, 1, 200)).toBe(1);
    expect(_internals.clampInt(undefined, 5, 1, 200)).toBe(5);
    expect(_internals.clampUnitSigned(-0.5, 0)).toBe(-0.5);
    expect(_internals.clampUnitSigned(-9, 0)).toBe(-1);
    expect(_internals.clampUnitSigned(Number.NaN, 0)).toBe(0);
  });
});

describe("IdeaBlockRagEngine — dispatcher round-trip", () => {
  it("ACTION_MEMORY_SCHEMAS registers ideablock_rag_retrieve (snake+camel)", async () => {
    const { ACTION_MEMORY_SCHEMAS } = await import("../schemas/memoryActionSchemas.js");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("ideablock_rag_retrieve");
    const s = ACTION_MEMORY_SCHEMAS.ideablock_rag_retrieve;
    expect(() => s.parse({ query: "q", blocks: [] })).not.toThrow();
    expect(() => s.parse({ query: "q", blocks: [], top_k: 5, min_score: 0.2 })).not.toThrow();
    expect(() => s.parse({ query: "q", blocks: [], topK: 5 })).not.toThrow();
    expect(() => s.parse({ blocks: [] })).toThrow();      // query required
    expect(() => s.parse({ query: "q", blocks: [], top_k: 0 })).toThrow();
  });

  it("singleton + fresh class produce identical rankings", () => {
    const items: RagVectorItem[] = [
      { block: blk("q1", "Question one is here", "Answer one is here."), vector: v(1, 0) },
      { block: blk("q2", "Question two is here", "Answer two is here."), vector: v(0, 1) },
    ];
    const a = ideaBlockRagEngine.rankVectors(v(1, 0), items, { now: NOW });
    const b = new IdeaBlockRagEngine().rankVectors(v(1, 0), items, { now: NOW });
    expect(a.results.map((x) => x.block.id)).toEqual(b.results.map((x) => x.block.id));
    expect(a.results[0].score).toBe(b.results[0].score);
  });
});
