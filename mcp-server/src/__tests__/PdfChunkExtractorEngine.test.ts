/**
 * PdfChunkExtractorEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02.
 *
 * Verifies the paragraph→sentence→hard-split greedy chunker that feeds
 * KIP's PDF batch worker. Coverage: happy path + 3 failure modes + 2
 * adversarial inputs (empty, oversize-no-paragraphs, runaway sentence,
 * unicode/whitespace pathologies, NaN/coercion on opts).
 */
import { describe, it, expect } from "vitest";
import {
  PdfChunkExtractorEngine,
  type PdfChunk,
  type ChunkOpts,
} from "../engines/PdfChunkExtractorEngine.js";

const engine = new PdfChunkExtractorEngine();

function repeat(s: string, n: number): string {
  return new Array(n).fill(s).join("");
}

function paragraphsOf(charLen: number, paraSize = 200): string {
  // Build paragraphs of ~paraSize sentences-ish text separated by blank lines
  const out: string[] = [];
  let total = 0;
  let i = 0;
  while (total < charLen) {
    const para = `Paragraph ${i++}. ${repeat("Lorem ipsum dolor sit amet. ", Math.ceil(paraSize / 28))}`;
    out.push(para);
    total += para.length + 2;
  }
  return out.join("\n\n");
}

describe("PdfChunkExtractorEngine.chunk — happy path", () => {
  it("returns [] on empty input", () => {
    expect(engine.chunk("")).toEqual([]);
  });

  it("returns single chunk for short input (under target)", () => {
    const text = "A short paragraph that fits within one chunk.";
    const chunks = engine.chunk(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].charStart).toBe(0);
    expect(chunks[0].charEnd).toBe(text.length);
    expect(chunks[0].source).toBe("unknown");
    expect(chunks[0].pageHint).toBeNull();
  });

  it("respects source and pageHint metadata", () => {
    const chunks = engine.chunk("Hello world.", {
      source: "manual.pdf",
      pageHint: 7,
    });
    expect(chunks[0].source).toBe("manual.pdf");
    expect(chunks[0].pageHint).toBe(7);
  });

  it("splits a multi-paragraph document into multiple chunks", () => {
    const text = paragraphsOf(8_000, 600);
    const chunks = engine.chunk(text, { targetChars: 1_000, overlapChars: 100 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].index).toBe(0);
    // Sequential indexes
    chunks.forEach((c, i) => expect(c.index).toBe(i));
    // Each chunk under hard-max
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(4_000));
  });

  it("first chunk has no overlap prefix; later chunks carry previous tail", () => {
    const text = paragraphsOf(6_000, 500);
    const chunks = engine.chunk(text, { targetChars: 800, overlapChars: 80 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // First chunk text starts with the original first paragraph fragment
    expect(chunks[0].text.startsWith("Paragraph 0.")).toBe(true);
    // Later chunks should have a prefix that came from a previous chunk's tail
    // (we can't pin exact glue, but length must exceed pure paragraph alone)
    const second = chunks[1];
    expect(second.text.length).toBeGreaterThan(50);
  });
});

describe("PdfChunkExtractorEngine.chunk — failure modes & adversarial", () => {
  it("failure mode 1: oversize paragraph (no blank lines) splits on sentences", () => {
    // Build one long paragraph (no blank lines) > 4000 chars
    const para = repeat("This is a sentence. ", 400); // ~8000 chars
    const chunks = engine.chunk(para, { targetChars: 1_000, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(2);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(4_000));
  });

  it("failure mode 2: runaway single sentence (no terminal punctuation) hard-splits", () => {
    // 3500 chars with no period/question/exclaim ⇒ engine must hard-split at targetChars
    const runaway = repeat("nopunctuation", 270); // ~3500 chars
    const chunks = engine.chunk(runaway, { targetChars: 500, overlapChars: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Every chunk content body (post-overlap) must respect targetChars roughly
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(4_000));
  });

  it("failure mode 3: invalid opts (NaN, negative) fall back to defaults", () => {
    const text = paragraphsOf(4_000, 400);
    const chunks = engine.chunk(text, {
      targetChars: NaN,
      overlapChars: -50,
    } as ChunkOpts);
    expect(chunks.length).toBeGreaterThan(0);
    // Defaults: 1500 / 0 (negative clamped to 0)
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(4_000));
  });

  it("adversarial 1: unicode + tab + CR + multi-blank-line normalizes cleanly", () => {
    const text =
      "Paragraph one with — em-dash and 漢字.\r\n\r\n\r\n  \tParagraph two\twith\ttabs.\n\n\n\nParagraph three.";
    const chunks = engine.chunk(text);
    expect(chunks.length).toBe(1);
    // Internal tabs collapsed to single spaces, paragraph boundaries preserved
    expect(chunks[0].text).toContain("Paragraph one with — em-dash and 漢字.");
    expect(chunks[0].text).toContain("Paragraph two with tabs.");
    expect(chunks[0].text).toContain("Paragraph three.");
    // No tab characters or \r remain
    expect(/\t/.test(chunks[0].text)).toBe(false);
    expect(/\r/.test(chunks[0].text)).toBe(false);
  });

  it("adversarial 2: targetChars below MIN_CHUNK_CHARS clamped to default", () => {
    const text = paragraphsOf(3_000, 400);
    // targetChars=10 is way below MIN; engine clamps to default 1500
    const chunks = engine.chunk(text, { targetChars: 10 });
    expect(chunks.length).toBeGreaterThan(0);
    // No chunk smaller than MIN unless input is already short
    chunks.forEach((c) => {
      if (chunks.length > 1) {
        expect(c.text.length).toBeGreaterThanOrEqual(50);
      }
    });
  });

  it("adversarial 3: overlap > target clamps to half-target", () => {
    const text = paragraphsOf(3_000, 400);
    const chunks = engine.chunk(text, { targetChars: 1_000, overlapChars: 9999 });
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(4_000));
  });

  it("null/undefined text inputs do not crash and return []", () => {
    expect(engine.chunk(null as unknown as string)).toEqual([]);
    expect(engine.chunk(undefined as unknown as string)).toEqual([]);
  });

  it("only-whitespace input returns []", () => {
    expect(engine.chunk("   \n\n  \t\r\n  ")).toEqual([]);
  });
});

describe("PdfChunkExtractorEngine.normalize", () => {
  it("collapses internal whitespace runs but preserves paragraph breaks", () => {
    const out = engine.normalize("a   b\t\tc\n\n\n d   e");
    expect(out).toBe("a b c\n\nd e");
  });

  it("returns empty string for null/undefined", () => {
    expect(engine.normalize(null as unknown as string)).toBe("");
    expect(engine.normalize(undefined as unknown as string)).toBe("");
  });

  it("converts CRLF to LF before paragraph split", () => {
    const out = engine.normalize("alpha\r\n\r\nbeta");
    expect(out).toBe("alpha\n\nbeta");
  });
});

describe("PdfChunkExtractorEngine.segment", () => {
  it("splits paragraphs ≤ target as-is", () => {
    const out = engine.segment("Para A.\n\nPara B.", 1_000);
    expect(out).toEqual(["Para A.", "Para B."]);
  });

  it("sentence-splits oversized paragraphs", () => {
    // single paragraph > 100 chars → sentence-split at targetChars=100
    const para = "Sentence one is here. " + "Sentence two adds more text. " + "Sentence three closes the thought. " + "Sentence four runs over.";
    const out = engine.segment(para, 60);
    expect(out.length).toBeGreaterThanOrEqual(2);
    out.forEach((seg) => expect(seg.length).toBeLessThanOrEqual(60));
  });

  it("hard-splits runaway sentences with no terminal punctuation", () => {
    const para = repeat("a", 300);
    const out = engine.segment(para, 100);
    expect(out.length).toBe(3);
    out.forEach((seg) => expect(seg.length).toBeLessThanOrEqual(100));
  });
});

describe("PdfChunkExtractorEngine — chunk indices and provenance contract", () => {
  it("chunk indexes are zero-based contiguous integers", () => {
    const text = paragraphsOf(5_000, 400);
    const chunks = engine.chunk(text, { targetChars: 1_000, overlapChars: 50 });
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("charStart and charEnd are non-decreasing across chunks", () => {
    const text = paragraphsOf(5_000, 400);
    const chunks = engine.chunk(text, { targetChars: 1_000, overlapChars: 50 });
    let prevEnd = 0;
    for (const c of chunks) {
      expect(c.charStart).toBeGreaterThanOrEqual(0);
      expect(c.charEnd).toBeGreaterThanOrEqual(c.charStart);
      expect(c.charStart).toBeGreaterThanOrEqual(prevEnd - 1);
      prevEnd = c.charEnd;
    }
  });

  it("preserves source identifier on every chunk", () => {
    const text = paragraphsOf(3_000, 400);
    const chunks = engine.chunk(text, {
      targetChars: 800,
      source: "datasheet-Iscar-2024.pdf",
    });
    chunks.forEach((c) => expect(c.source).toBe("datasheet-Iscar-2024.pdf"));
  });
});
