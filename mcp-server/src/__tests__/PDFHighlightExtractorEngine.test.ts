/**
 * PDFHighlightsOnly.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / U-HIGHLIGHTS-ONLY (F2)
 *
 * Validates the PDFHighlightExtractorEngine against synthetic PDF buffers that
 * mix /Highlight, /Square, /Text (sticky note), and /Underline annotations
 * with full-body content. The fixture-driven approach avoids checking real PDF
 * binaries into git while still exercising the PDF dict-walking + string-parsing
 * paths that a real Acrobat-saved PDF would hit.
 *
 * Coverage:
 *  - 3 fixture PDFs as required by envelope (mixed annotation types)
 *  - /Subtype matching (Highlight vs other subtypes — only Highlight extracted)
 *  - Literal string parsing with escapes
 *  - Hex string parsing with UTF-16BE BOM
 *  - /T author, /M modified date, /Rect, /QuadPoints field extraction
 *  - Multiple highlights in one PDF (deterministic ordering)
 *  - PDFs with NO highlights (zero results, not a crash)
 *  - Compressed-annotation detection (flag set, highlights[] empty)
 *  - Noise-reduction ratio math (≥90% reduction asserted)
 *  - extractHighlightsOnly(pdfPath) end-to-end via a tmpfile
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/F2
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  PDFHighlightExtractorEngine,
  HighlightAnnotationSchema,
  HighlightExtractionResultSchema,
} from "../engines/PDFHighlightExtractorEngine.js";

// ── Fixture builders ────────────────────────────────────────────────────────

/** Build a synthetic PDF body containing one /Highlight annotation with literal-string contents. */
function buildHighlightAnnot(opts: {
  contents: string;
  author?: string;
  modifiedAt?: string;
  rect?: [number, number, number, number];
  quadPoints?: number[];
}): string {
  const parts: string[] = [];
  parts.push("<<");
  parts.push("/Type /Annot");
  parts.push("/Subtype /Highlight");
  if (opts.rect) parts.push(`/Rect [${opts.rect.join(" ")}]`);
  if (opts.quadPoints) parts.push(`/QuadPoints [${opts.quadPoints.join(" ")}]`);
  // PDF literal strings need ( and ) escaped if they appear in content
  const escapedContents = opts.contents.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  parts.push(`/Contents (${escapedContents})`);
  if (opts.author !== undefined) {
    const escapedAuthor = opts.author.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    parts.push(`/T (${escapedAuthor})`);
  }
  if (opts.modifiedAt !== undefined) parts.push(`/M (${opts.modifiedAt})`);
  parts.push(">>");
  return parts.join("\n");
}

/** Build a non-highlight annotation (Square / Text / Underline) so we can prove subtype filtering. */
function buildOtherAnnot(subtype: string, contents: string): string {
  return [
    "<<",
    "/Type /Annot",
    `/Subtype /${subtype}`,
    `/Contents (${contents})`,
    ">>",
  ].join("\n");
}

/** Wrap annotations into a minimal PDF envelope with body text. */
function buildPDF(annots: string[], bodyText: string = "Lorem ipsum dolor sit amet ".repeat(200)): Buffer {
  const lines: string[] = [
    "%PDF-1.7",
    "1 0 obj",
    "<<",
    "/Type /Catalog",
    "/Pages 2 0 R",
    ">>",
    "endobj",
    "2 0 obj",
    "<<",
    "/Type /Pages",
    "/Count 1",
    ">>",
    "endobj",
    `% body: ${bodyText}`,
    "",
    ...annots.flatMap((a, i) => [`${10 + i} 0 obj`, a, "endobj", ""]),
    "%%EOF",
  ];
  return Buffer.from(lines.join("\n"), "latin1");
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("PDFHighlightExtractorEngine — F2 highlights-only extraction", () => {
  describe("extractFromBuffer — fixture 1: single highlight with author + date", () => {
    const annot = buildHighlightAnnot({
      contents: "Kienzle formula: Fc = kc1.1 * ap * fz^(1-mc)",
      author: "Mark V",
      modifiedAt: "D:20260515120000Z",
      rect: [72.0, 720.0, 540.0, 750.0],
      quadPoints: [72, 720, 540, 720, 72, 750, 540, 750],
    });
    const pdf = buildPDF([annot]);

    it("returns exactly 1 highlight with correct contents/author/modifiedAt", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture1");
      expect(r.highlightsFound).toBe(1);
      expect(r.highlights.length).toBe(1);
      expect(r.highlights[0].contents).toBe("Kienzle formula: Fc = kc1.1 * ap * fz^(1-mc)");
      expect(r.highlights[0].author).toBe("Mark V");
      expect(r.highlights[0].modifiedAt).toBe("D:20260515120000Z");
    });

    it("returns rect and quadPoints as number arrays", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture1");
      expect(r.highlights[0].rect).toEqual([72.0, 720.0, 540.0, 750.0]);
      expect(r.highlights[0].quadPoints).toEqual([72, 720, 540, 720, 72, 750, 540, 750]);
    });

    it("schema validation passes for the result", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture1");
      expect(() => HighlightExtractionResultSchema.parse(r)).not.toThrow();
      expect(() => HighlightAnnotationSchema.parse(r.highlights[0])).not.toThrow();
    });

    it("byteOffset is non-negative and within pdf length", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture1");
      expect(r.highlights[0].byteOffset).toBeGreaterThanOrEqual(0);
      expect(r.highlights[0].byteOffset).toBeLessThan(pdf.length);
    });

    it("does NOT flag the PDF as compressed (uncompressed fixture)", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture1");
      expect(r.compressedAnnotations).toBe(false);
    });
  });

  describe("extractFromBuffer — fixture 2: 3 highlights + 2 non-highlight annots (subtype filter)", () => {
    const pdf = buildPDF([
      buildHighlightAnnot({ contents: "First highlight", author: "Alice" }),
      buildOtherAnnot("Square", "This is a square box annotation, ignore me"),
      buildHighlightAnnot({ contents: "Second highlight", author: "Bob" }),
      buildOtherAnnot("Text", "This is a sticky note, also ignore"),
      buildHighlightAnnot({ contents: "Third highlight", author: "Carol" }),
      buildOtherAnnot("Underline", "Underline annot — not highlight"),
    ]);

    it("extracts exactly 3 highlights, skipping Square/Text/Underline subtypes", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture2");
      expect(r.highlightsFound).toBe(3);
      expect(r.highlights.length).toBe(3);
    });

    it("highlights are returned in document order (byteOffset ascending)", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture2");
      const offsets = r.highlights.map((h) => h.byteOffset);
      const sorted = [...offsets].sort((a, b) => a - b);
      expect(offsets).toEqual(sorted);
    });

    it("contents map to (Alice→first, Bob→second, Carol→third)", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture2");
      expect(r.highlights[0].author).toBe("Alice");
      expect(r.highlights[0].contents).toBe("First highlight");
      expect(r.highlights[1].author).toBe("Bob");
      expect(r.highlights[1].contents).toBe("Second highlight");
      expect(r.highlights[2].author).toBe("Carol");
      expect(r.highlights[2].contents).toBe("Third highlight");
    });

    it("does NOT include text from the body, Square, Text, or Underline annots", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "fixture2");
      const allText = r.highlights.map((h) => h.contents).join(" ");
      expect(allText.includes("square box annotation")).toBe(false);
      expect(allText.includes("sticky note")).toBe(false);
      expect(allText.includes("Underline annot")).toBe(false);
      expect(allText.includes("Lorem ipsum")).toBe(false);
    });
  });

  describe("extractFromBuffer — fixture 3: hex string + UTF-16BE BOM + escape chars", () => {
    // Build a hex-string Contents with UTF-16BE BOM 0xFEFF prefix encoding "Hi 🔧"
    // Note: surrogate pair for 🔧 = U+1F527 → 0xD83D 0xDD27 in UTF-16
    // Simplification: just use ASCII through hex → "Hello"
    const hexHelloUtf16Be = "FEFF00480065006C006C006F"; // "Hello" with BOM
    const pdfHex = Buffer.from(
      [
        "%PDF-1.7",
        "1 0 obj",
        "<<",
        "/Type /Annot",
        "/Subtype /Highlight",
        `/Contents <${hexHelloUtf16Be}>`,
        "/T (Operator \\(Mark\\))",
        "/M (D:20260101)",
        ">>",
        "endobj",
        "%%EOF",
      ].join("\n"),
      "latin1",
    );

    it("decodes hex string with UTF-16BE BOM correctly", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdfHex, "fixture3");
      expect(r.highlightsFound).toBe(1);
      expect(r.highlights[0].contents).toBe("Hello");
    });

    it("decodes literal string with escaped parentheses correctly", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdfHex, "fixture3");
      expect(r.highlights[0].author).toBe("Operator (Mark)");
    });

    it("missing /QuadPoints and /Rect produce empty arrays (not undefined)", () => {
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdfHex, "fixture3");
      expect(r.highlights[0].rect).toEqual([]);
      expect(r.highlights[0].quadPoints).toEqual([]);
    });
  });

  describe("envelope acceptance — noise-reduction ratio ≥90% vs full body", () => {
    it("a 5KB PDF with 50 bytes of highlights drops total ingest size by ≥90%", () => {
      const annot = buildHighlightAnnot({ contents: "kc1.1=1800 N/mm²", author: "M" });
      const bigBody = "Lorem ipsum dolor sit amet ".repeat(500); // ~13.5KB body padding
      const pdf = buildPDF([annot], bigBody);
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "noise");

      const ingestedHighlightBytes = r.highlights.reduce((acc, h) => acc + h.contents.length, 0);
      const reductionRatio = 1 - ingestedHighlightBytes / pdf.length;
      expect(reductionRatio).toBeGreaterThan(0.9);
      expect(r.highlightsFound).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("PDF with NO highlights returns highlights:[] and highlightsFound:0", () => {
      const pdf = buildPDF([
        buildOtherAnnot("Square", "box"),
        buildOtherAnnot("Text", "note"),
      ]);
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "no-highlights");
      expect(r.highlightsFound).toBe(0);
      expect(r.highlights).toEqual([]);
      expect(r.noiseReductionRatio).toBe(0);
    });

    it("PDF with /Filter /FlateDecode flag is reported as compressed", () => {
      const pdf = Buffer.from(
        [
          "%PDF-1.7",
          "5 0 obj",
          "<< /Length 100 /Filter /FlateDecode >>",
          "stream",
          "...binary blob...",
          "endstream",
          "endobj",
          "%%EOF",
        ].join("\n"),
        "latin1",
      );
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "compressed");
      expect(r.compressedAnnotations).toBe(true);
    });

    it("subtype /Highlight2 (longer name with prefix collision) is NOT a false-positive — Name-terminator strict", () => {
      // Per ISO 32000-2 §7.3.5, a PDF Name terminates at whitespace or one of
      // ( ) < > [ ] { } / %. /Highlight2 is a longer Name (the `2` is a
      // regular Name char), so it must NOT match our /Highlight matcher.
      const pdf = Buffer.from(
        [
          "%PDF-1.7",
          "1 0 obj",
          "<<",
          "/Type /Annot",
          "/Subtype /Highlight2",
          "/Contents (false positive bait)",
          ">>",
          "endobj",
          "%%EOF",
        ].join("\n"),
        "latin1",
      );
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "false-positive-bait");
      expect(r.highlightsFound).toBe(0);
      expect(r.highlights).toEqual([]);
    });

    it("subtype /Highlight followed by a / delimiter IS a match (Name terminator: delimiter)", () => {
      // Tightly-packed Acrobat output: `/Subtype /Highlight/Rect [...]` — no
      // whitespace between /Highlight and the next /Name. The `/` is a Name
      // delimiter so this MUST match.
      const pdf = Buffer.from(
        [
          "%PDF-1.7",
          "1 0 obj",
          "<<",
          "/Type /Annot/Subtype /Highlight/Rect [0 0 1 1]/Contents (tight pack)",
          ">>",
          "endobj",
          "%%EOF",
        ].join("\n"),
        "latin1",
      );
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "tight-pack");
      expect(r.highlightsFound).toBe(1);
      expect(r.highlights[0].contents).toBe("tight pack");
      expect(r.highlights[0].rect).toEqual([0, 0, 1, 1]);
    });

    it("guards against string-context >> false-positives (P0 fix: string-aware walker)", () => {
      // Without a string-aware walker, the literal `>>` inside /Contents would
      // close the outer dict prematurely. With the forward state machine the
      // string is skipped wholesale and the dict's real `>>` is found.
      const pdf = Buffer.from(
        [
          "%PDF-1.7",
          "1 0 obj",
          "<<",
          "/Type /Annot",
          "/Subtype /Highlight",
          "/Contents (compare a >> b inline)",
          "/T (Author)",
          ">>",
          "endobj",
          "%%EOF",
        ].join("\n"),
        "latin1",
      );
      const r = PDFHighlightExtractorEngine.extractFromBuffer(pdf, "string-context");
      expect(r.highlightsFound).toBe(1);
      expect(r.highlights[0].contents).toBe("compare a >> b inline");
      expect(r.highlights[0].author).toBe("Author");
    });

    it("MAX_PDF_BYTES guard throws on oversize buffer", () => {
      // Construct a >200MB buffer cheaply via Buffer.alloc (sparse-zero) — we
      // never actually have to scan it; the guard fires up front.
      const oversize = Buffer.alloc(200_000_001);
      expect(() => PDFHighlightExtractorEngine.extractFromBuffer(oversize, "oversize"))
        .toThrow(/MAX_PDF_BYTES/);
    });
  });

  describe("extractHighlightsOnly — file-on-disk integration", () => {
    let tmpFile: string;

    beforeAll(() => {
      const annot = buildHighlightAnnot({
        contents: "Boothroyd Ra: f^2/(32r)",
        author: "Reviewer",
        modifiedAt: "D:20260515",
      });
      const pdf = buildPDF([annot]);
      tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pdf-highlight-")), "test.pdf");
      fs.writeFileSync(tmpFile, pdf);
    });

    afterAll(() => {
      try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch { /* tolerate */ }
    });

    it("reads from disk and produces the same result as buffer extraction", () => {
      const r = PDFHighlightExtractorEngine.extractHighlightsOnly(tmpFile);
      expect(r.highlightsFound).toBe(1);
      expect(r.highlights[0].contents).toBe("Boothroyd Ra: f^2/(32r)");
      expect(r.highlights[0].author).toBe("Reviewer");
      expect(r.source).toBe(tmpFile);
    });

    it("throws on missing file path", () => {
      expect(() => PDFHighlightExtractorEngine.extractHighlightsOnly("H:/nonexistent.pdf"))
        .toThrow(/file not found/);
    });

    it("throws on empty path", () => {
      expect(() => PDFHighlightExtractorEngine.extractHighlightsOnly(""))
        .toThrow(/pdfPath required/);
    });
  });
});
