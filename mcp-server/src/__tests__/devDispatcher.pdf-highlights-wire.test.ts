/**
 * devDispatcher.pdf-highlights-wire.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / F2 (U-HIGHLIGHTS-ONLY) — round-trip wire test for
 * the `pdf_highlights_extract` action that exposes PDFHighlightExtractorEngine
 * through the `prism_dev` dispatcher.
 *
 * The engine itself is exhaustively unit-tested in PDFHighlightExtractorEngine.test.ts
 * (22 cases — /Highlight subtype filtering, escape sequences, hex strings,
 * compressed-annotation detection). This file verifies ONLY the wiring seam:
 *  - the action is registered in the dispatcher z.enum + reachable
 *  - ACTION_DEV_SCHEMAS.pdf_highlights_extract rejects a missing/empty pdf_path
 *    BEFORE the case handler runs (the case handler has no inline guard because
 *    of this — see devDispatcher.ts case comment)
 *  - a valid pdf_path round-trips through schema validation -> normalizeParams
 *    -> the switch -> the engine and returns a real HighlightExtractionResult
 *  - a non-existent file surfaces the engine's descriptive throw as an error
 *    response (the dispatcher's outer try/catch), not a silent success
 *
 * Fixture PDFs are written to os.tmpdir() because the wired action only exposes
 * the disk-path entry point (extractHighlightsOnly), not extractFromBuffer.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): Promise<Handler> {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return handler;
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

// ── Fixture builders (self-contained — the engine test's builders are not exported) ──

/** One uncompressed /Highlight annotation dict with literal-string /Contents. */
function highlightAnnot(opts: { contents: string; author?: string; modifiedAt?: string }): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const parts = ["<<", "/Type /Annot", "/Subtype /Highlight", `/Contents (${esc(opts.contents)})`];
  if (opts.author !== undefined) parts.push(`/T (${esc(opts.author)})`);
  if (opts.modifiedAt !== undefined) parts.push(`/M (${esc(opts.modifiedAt)})`);
  parts.push(">>");
  return parts.join("\n");
}

/** A non-Highlight annotation (Square / Text / Underline) — must be filtered out. */
function otherAnnot(subtype: string, contents: string): string {
  return ["<<", "/Type /Annot", `/Subtype /${subtype}`, `/Contents (${contents})`, ">>"].join("\n");
}

/** Wrap annotation dicts into a minimal uncompressed PDF envelope with body text. */
function buildPDF(annots: string[]): Buffer {
  const lines = [
    "%PDF-1.7",
    "1 0 obj", "<<", "/Type /Catalog", "/Pages 2 0 R", ">>", "endobj",
    "2 0 obj", "<<", "/Type /Pages", "/Count 1", ">>", "endobj",
    `% body: ${"Lorem ipsum dolor sit amet ".repeat(120)}`,
    "",
    ...annots.flatMap((a, i) => [`${10 + i} 0 obj`, a, "endobj", ""]),
    "%%EOF",
  ];
  return Buffer.from(lines.join("\n"), "latin1");
}

const tmpFiles: string[] = [];
function writeFixture(name: string, buf: Buffer): string {
  const p = path.join(os.tmpdir(), `prism-f2-wire-${process.pid}-${Date.now()}-${name}.pdf`);
  fs.writeFileSync(p, buf);
  tmpFiles.push(p);
  return p;
}

describe("prism_dev pdf_highlights_extract wire (OBSIDIAN-INTELLIGENCE-MS3/F2)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer();
  });

  afterAll(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* already gone */ }
    }
  });

  // ── Schema validation — pdf_path is required + non-empty (runs before the case) ──

  describe("schema validation", () => {
    it("missing pdf_path → rejected with 'invalid params'", async () => {
      const r = await call(handler, "pdf_highlights_extract", {});
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("empty pdf_path → rejected (z.string().min(1))", async () => {
      const r = await call(handler, "pdf_highlights_extract", { pdf_path: "" });
      expect(String(r.error)).toMatch(/invalid params/i);
    });

    it("non-string pdf_path → rejected", async () => {
      const r = await call(handler, "pdf_highlights_extract", { pdf_path: 12345 });
      expect(String(r.error)).toMatch(/invalid params/i);
    });
  });

  // ── Round-trip extraction — valid pdf_path produces a real HighlightExtractionResult ──

  describe("round-trip — single highlight fixture", () => {
    let result: any;
    const CONTENTS = "Critical insight about adaptive feed control";
    const AUTHOR = "Mark Villanueva";

    beforeAll(async () => {
      const pdf = buildPDF([highlightAnnot({ contents: CONTENTS, author: AUTHOR, modifiedAt: "D:20260516T120000Z" })]);
      const fixturePath = writeFixture("single", pdf);
      result = await call(handler, "pdf_highlights_extract", { pdf_path: fixturePath });
    });

    it("extracts exactly one highlight", () => {
      expect(result.highlightsFound ?? 0).toBe(1);
      expect((result.highlights ?? []).length).toBe(1);
    });

    it("preserves the highlight /Contents text verbatim", () => {
      expect(result.highlights[0].contents).toBe(CONTENTS);
    });

    it("preserves the /T author field", () => {
      expect(result.highlights[0].author).toBe(AUTHOR);
    });

    it("reports the source as the disk path that was passed in", () => {
      expect(typeof result.source).toBe("string");
      expect(result.source.endsWith(".pdf")).toBe(true);
    });

    it("reports a positive bytesScanned (the file was actually read)", () => {
      expect(result.bytesScanned).toBeGreaterThan(0);
    });
  });

  describe("round-trip — subtype filtering (3 highlights + 2 non-highlight annots)", () => {
    let result: any;
    const H1 = "First highlighted passage";
    const H2 = "Second highlighted passage";
    const H3 = "Third highlighted passage";
    const SQUARE = "this is a square annotation, not a highlight";
    const STICKY = "this is a sticky note, not a highlight";

    beforeAll(async () => {
      const pdf = buildPDF([
        highlightAnnot({ contents: H1 }),
        otherAnnot("Square", SQUARE),
        highlightAnnot({ contents: H2 }),
        otherAnnot("Text", STICKY),
        highlightAnnot({ contents: H3 }),
      ]);
      const fixturePath = writeFixture("mixed", pdf);
      result = await call(handler, "pdf_highlights_extract", { pdf_path: fixturePath });
    });

    it("extracts only the 3 /Highlight annotations", () => {
      expect(result.highlightsFound ?? 0).toBe(3);
      expect((result.highlights ?? []).length).toBe(3);
    });

    it("all 3 highlight contents are present", () => {
      const texts = (result.highlights ?? []).map((h: any) => h.contents);
      expect(texts).toContain(H1);
      expect(texts).toContain(H2);
      expect(texts).toContain(H3);
    });

    it("the /Square and /Text annotation contents are NOT extracted", () => {
      const texts = (result.highlights ?? []).map((h: any) => h.contents);
      expect(texts).not.toContain(SQUARE);
      expect(texts).not.toContain(STICKY);
    });
  });

  describe("round-trip — PDF with no highlights", () => {
    it("returns zero highlights for a body-only PDF (honest empty result, not an error)", async () => {
      const pdf = buildPDF([otherAnnot("Underline", "an underline, no highlight here")]);
      const fixturePath = writeFixture("nohl", pdf);
      const r = await call(handler, "pdf_highlights_extract", { pdf_path: fixturePath });
      expect(r.error).toBeUndefined();
      expect(r.highlightsFound ?? 0).toBe(0);
      expect(r.highlights ?? []).toEqual([]);
    });
  });

  // ── Failure surfacing — engine throws are not swallowed ──

  describe("failure surfacing", () => {
    it("a non-existent (but non-empty) pdf_path surfaces an error, not a silent success", async () => {
      const missing = path.join(os.tmpdir(), `prism-f2-does-not-exist-${process.pid}-${Date.now()}.pdf`);
      const r = await call(handler, "pdf_highlights_extract", { pdf_path: missing });
      // Schema passes (non-empty string) → engine throws "file not found" →
      // dispatcher outer try/catch converts it to an error response.
      const blob = JSON.stringify(r);
      expect(blob).toMatch(/not found|error/i);
      expect(r.highlightsFound).toBeUndefined();
    });
  });
});
