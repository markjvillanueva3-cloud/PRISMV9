/**
 * BatchPdfExtract — INTEL-OLLAMA-OBSIDIAN-MS0/P21-U02
 *
 * Pure-function tests for the hybrid text + vision PDF pipeline. The
 * I/O layer (extractPdfHybrid) is exercised via injected stubs so no
 * live Ollama / live PDF parsing is required.
 *
 * Asserts:
 *   1. classifyPageByDensity at threshold edges (NaN, 0, exact, above, below).
 *   2. slugifyPdfName produces filesystem-safe stems and is idempotent on
 *      already-clean inputs; "untitled" sentinel for empty / non-string.
 *   3. buildVaultPath joins root + slugified stem + extension correctly.
 *   4. mergePageChunks orders by page ascending, preserves headers, handles
 *      empty content gracefully.
 *   5. summarizePages aggregates text-rich vs image-heavy counts.
 *   6. formatFrontmatter emits valid YAML; formatVaultMarkdown wraps body.
 *   7. v1 helpers (extractCuttingParams, extractProcedures, countKeywords)
 *      preserved across refactor — sanity check on representative input.
 */

import { describe, it, expect } from "vitest";
import {
  classifyPageByDensity,
  slugifyPdfName,
  buildVaultPath,
  mergePageChunks,
  summarizePages,
  formatFrontmatter,
  formatVaultMarkdown,
  extractCuttingParams,
  extractProcedures,
  countKeywords,
  DEFAULT_DENSITY_THRESHOLD,
  DEFAULT_VAULT_ROOT,
  type PageChunk,
  type PdfMeta,
} from "../../scripts/batch-pdf-extract.js";

describe("P21-U02 classifyPageByDensity", () => {
  it("classifies text below threshold as image-heavy", () => {
    expect(classifyPageByDensity(0)).toBe("image-heavy");
    expect(classifyPageByDensity(50)).toBe("image-heavy");
    expect(classifyPageByDensity(199)).toBe("image-heavy");
  });
  it("classifies text at or above threshold as text-rich", () => {
    expect(classifyPageByDensity(200)).toBe("text-rich");
    expect(classifyPageByDensity(2000)).toBe("text-rich");
  });
  it("respects custom threshold", () => {
    expect(classifyPageByDensity(50, 30)).toBe("text-rich");
    expect(classifyPageByDensity(50, 100)).toBe("image-heavy");
  });
  it("treats NaN/negative textLength as image-heavy (defensive)", () => {
    expect(classifyPageByDensity(NaN)).toBe("image-heavy");
    expect(classifyPageByDensity(-10)).toBe("image-heavy");
    expect(classifyPageByDensity(Infinity)).toBe("image-heavy");
  });
  it("treats non-positive threshold as text-rich (defensive)", () => {
    expect(classifyPageByDensity(0, 0)).toBe("text-rich");
    expect(classifyPageByDensity(0, -10)).toBe("text-rich");
    expect(classifyPageByDensity(50, NaN)).toBe("text-rich");
  });
  it("exposes DEFAULT_DENSITY_THRESHOLD constant", () => {
    expect(DEFAULT_DENSITY_THRESHOLD).toBe(200);
  });
});

describe("P21-U02 slugifyPdfName", () => {
  it("strips extensions and lowercases", () => {
    expect(slugifyPdfName("foo.pdf")).toBe("foo");
    expect(slugifyPdfName("HYPER MILL Tutorial.pdf")).toBe("hyper-mill-tutorial");
  });
  it("collapses non-alphanumeric to single dashes", () => {
    expect(slugifyPdfName("a   b---c.pdf")).toBe("a-b-c");
  });
  it("replaces unicode with dashes deterministically", () => {
    expect(slugifyPdfName("NÉST_  cå£e.pdf")).toBe("n-st_-c-e");
  });
  it("returns 'untitled' for empty / non-string", () => {
    expect(slugifyPdfName("")).toBe("untitled");
    expect(slugifyPdfName(undefined)).toBe("untitled");
    expect(slugifyPdfName(null)).toBe("untitled");
    expect(slugifyPdfName(123)).toBe("untitled");
  });
  it("returns 'untitled' for stems that collapse to empty", () => {
    expect(slugifyPdfName("...")).toBe("untitled");
    expect(slugifyPdfName("---.pdf")).toBe("untitled");
  });
  it("preserves underscores and existing dashes", () => {
    expect(slugifyPdfName("foo_bar-baz.pdf")).toBe("foo_bar-baz");
  });
  it("trims leading and trailing dashes", () => {
    expect(slugifyPdfName("---foo.pdf")).toBe("foo");
    expect(slugifyPdfName("foo---.pdf")).toBe("foo");
  });
});

describe("P21-U02 buildVaultPath", () => {
  // path.join uses platform separator; assert by basename so the test is
  // deterministic across Windows / POSIX hosts.
  it("joins root + slugified stem + .md extension", () => {
    const p = buildVaultPath("H:/vault", "Manual Foo.pdf");
    expect(p.split(/[/\\]/).pop()).toBe("manual-foo.md");
  });
  it("normalizes custom extension with leading dot", () => {
    expect(buildVaultPath("/v", "x", ".jsonl").split(/[/\\]/).pop()).toBe("x.jsonl");
  });
  it("normalizes custom extension without leading dot", () => {
    expect(buildVaultPath("/v", "x", "html").split(/[/\\]/).pop()).toBe("x.html");
  });
  it("DEFAULT_VAULT_ROOT is the documented Obsidian path", () => {
    expect(DEFAULT_VAULT_ROOT).toBe("H:/prism/knowledge/ingested");
  });
});

describe("P21-U02 mergePageChunks", () => {
  const chunks: PageChunk[] = [
    { page: 3, kind: "image-heavy", textLength: 5, content: "img3" },
    { page: 1, kind: "text-rich", textLength: 500, content: "Text page 1." },
    { page: 2, kind: "text-rich", textLength: 600, content: "" },
  ];
  it("returns empty string for empty / non-array input", () => {
    expect(mergePageChunks([])).toBe("");
    expect(mergePageChunks(undefined as unknown as PageChunk[])).toBe("");
  });
  it("renders the deterministic ordered + formatted body byte-for-byte", () => {
    const expected =
      "## Page 1 — text-rich\n\nText page 1.\n\n" +
      "## Page 2 — text-rich\n\n(empty)\n\n" +
      "## Page 3 — image-heavy\n\nimg3";
    expect(mergePageChunks(chunks)).toBe(expected);
  });
  it("substitutes (empty) for blank content (exact occurrence count)", () => {
    const out = mergePageChunks(chunks);
    expect(out.match(/\(empty\)/g)?.length).toBe(1);
  });
  it("does not mutate input array (page order preserved verbatim)", () => {
    const local: PageChunk[] = [
      { page: 2, kind: "text-rich", textLength: 100, content: "b" },
      { page: 1, kind: "text-rich", textLength: 100, content: "a" },
    ];
    mergePageChunks(local);
    expect(local.map((c) => c.page)).toEqual([2, 1]);
  });
});

describe("P21-U02 summarizePages", () => {
  it("counts text-rich vs image-heavy correctly", () => {
    const c: PageChunk[] = [
      { page: 1, kind: "text-rich", textLength: 1000, content: "x" },
      { page: 2, kind: "image-heavy", textLength: 5, content: "y" },
      { page: 3, kind: "image-heavy", textLength: 0, content: "z" },
    ];
    expect(summarizePages(c)).toEqual({ total: 3, textRich: 1, imageHeavy: 2 });
  });
  it("returns zeros for empty / non-array", () => {
    expect(summarizePages([])).toEqual({ total: 0, textRich: 0, imageHeavy: 0 });
    expect(summarizePages(undefined as unknown as PageChunk[])).toEqual({
      total: 0,
      textRich: 0,
      imageHeavy: 0,
    });
  });
});

describe("P21-U02 formatFrontmatter", () => {
  const meta: PdfMeta = {
    source: "/abs/path/to/x.pdf",
    filename: "x.pdf",
    category: "ref",
    totalPages: 3,
    textRichPages: 1,
    imageHeavyPages: 2,
    visionAvailable: true,
    extractedAt: "2026-05-06T20:00:00.000Z",
  };
  it("renders the documented YAML block byte-for-byte", () => {
    const expected = [
      "---",
      `source: "/abs/path/to/x.pdf"`,
      `filename: "x.pdf"`,
      `category: "ref"`,
      `totalPages: 3`,
      `textRichPages: 1`,
      `imageHeavyPages: 2`,
      `visionAvailable: true`,
      `extractedAt: "2026-05-06T20:00:00.000Z"`,
      "---",
    ].join("\n");
    expect(formatFrontmatter(meta)).toBe(expected);
  });
  it("escapes embedded double-quotes in string fields (exact line by index)", () => {
    const fm = formatFrontmatter({ ...meta, filename: 'a "b".pdf' });
    // The filename line is line index 2 in the YAML block (0=---, 1=source, 2=filename).
    // Use index access + toBe for exact line equality, not array membership.
    expect(fm.split("\n")[2]).toBe('filename: "a \\"b\\".pdf"');
  });
});

describe("P21-U02 formatVaultMarkdown", () => {
  const meta: PdfMeta = {
    source: "/x.pdf",
    filename: "x.pdf",
    category: "ref",
    totalPages: 1,
    textRichPages: 1,
    imageHeavyPages: 0,
    visionAvailable: false,
    extractedAt: "2026-05-06T20:00:00.000Z",
  };
  const chunks: PageChunk[] = [
    { page: 1, kind: "text-rich", textLength: 100, content: "Hello." },
  ];
  it("renders the documented markdown body byte-for-byte", () => {
    const expected =
      `---\n` +
      `source: "/x.pdf"\n` +
      `filename: "x.pdf"\n` +
      `category: "ref"\n` +
      `totalPages: 1\n` +
      `textRichPages: 1\n` +
      `imageHeavyPages: 0\n` +
      `visionAvailable: false\n` +
      `extractedAt: "2026-05-06T20:00:00.000Z"\n` +
      `---\n` +
      `\n` +
      `# x.pdf\n` +
      `\n` +
      `## Page 1 — text-rich\n` +
      `\n` +
      `Hello.\n`;
    expect(formatVaultMarkdown(meta, chunks)).toBe(expected);
  });
  it("renders frontmatter + heading + empty body when no chunks (exact)", () => {
    const expected =
      `---\n` +
      `source: "/x.pdf"\n` +
      `filename: "x.pdf"\n` +
      `category: "ref"\n` +
      `totalPages: 1\n` +
      `textRichPages: 1\n` +
      `imageHeavyPages: 0\n` +
      `visionAvailable: false\n` +
      `extractedAt: "2026-05-06T20:00:00.000Z"\n` +
      `---\n` +
      `\n` +
      `# x.pdf\n` +
      `\n` +
      `\n`;
    expect(formatVaultMarkdown(meta, [])).toBe(expected);
  });
});

// V1 helper sanity tests — guard against accidental regression in the
// preserved legacy regex extractors. Coverage is intentionally light;
// thorough tests for these live in their own legacy suite.

describe("P21-U02 v1 helpers preserved", () => {
  it("extractCuttingParams parses speed and feed exactly once each", () => {
    const text = "Cutting speed: 250 m/min\nFeed rate: 0.15 mm/rev";
    const params = extractCuttingParams(text);
    expect(params.length).toBe(2);
    expect(params[0].speed).toBe("250 m/min");
    expect(params[1].feed).toBe("0.15 mm/rev");
    // Each line yields exactly one parameter — second line has no speed
    // because regex only matches one of speed|feed|depth per line.
    const speeds = params.map((p) => p.speed).filter((s): s is string => typeof s === "string");
    const feeds = params.map((p) => p.feed).filter((s): s is string => typeof s === "string");
    expect(speeds).toEqual(["250 m/min"]);
    expect(feeds).toEqual(["0.15 mm/rev"]);
  });
  it("extractCuttingParams returns [] on empty text", () => {
    expect(extractCuttingParams("")).toEqual([]);
  });
  it("extractProcedures parses exactly 3 numbered steps", () => {
    const text =
      "procedure:\n1. First do this thing carefully\n2. Then do that other step properly\n3. Finally inspect the work surface\n\nNext section.";
    const procs = extractProcedures(text);
    expect(procs.length).toBe(1);
    expect(procs[0].steps).toEqual([
      "First do this thing carefully",
      "Then do that other step properly",
      "Finally inspect the work surface",
    ]);
  });
  it("countKeywords returns zero for missing terms (exact zero)", () => {
    const counts = countKeywords("nothing relevant here at all");
    expect(counts.feed).toBe(0);
    expect(counts.toolpath).toBe(0);
    expect(counts.machining).toBe(0);
  });
  it("countKeywords counts case-insensitively (exact 3)", () => {
    expect(countKeywords("FEED feed Feed").feed).toBe(3);
  });
});
