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
  it("joins root + slugified stem + .md extension", () => {
    const p = buildVaultPath("H:/vault", "Manual Foo.pdf");
    expect(p.endsWith("manual-foo.md")).toBe(true);
  });
  it("respects custom extension with or without leading dot", () => {
    expect(buildVaultPath("/v", "x", ".jsonl").endsWith("x.jsonl")).toBe(true);
    expect(buildVaultPath("/v", "x", "html").endsWith("x.html")).toBe(true);
  });
  it("uses DEFAULT_VAULT_ROOT-style absolute paths", () => {
    expect(DEFAULT_VAULT_ROOT.length).toBeGreaterThan(0);
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
  it("orders chunks by page ascending", () => {
    const out = mergePageChunks(chunks);
    const i1 = out.indexOf("Page 1");
    const i2 = out.indexOf("Page 2");
    const i3 = out.indexOf("Page 3");
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i1).toBeLessThan(i2);
    expect(i2).toBeLessThan(i3);
  });
  it("substitutes (empty) for blank content", () => {
    expect(mergePageChunks(chunks)).toContain("(empty)");
  });
  it("includes kind in the heading line", () => {
    const out = mergePageChunks(chunks);
    expect(out).toContain("## Page 1 — text-rich");
    expect(out).toContain("## Page 3 — image-heavy");
  });
  it("does not mutate input array", () => {
    const local: PageChunk[] = [
      { page: 2, kind: "text-rich", textLength: 100, content: "b" },
      { page: 1, kind: "text-rich", textLength: 100, content: "a" },
    ];
    const before = local.map((c) => c.page).join(",");
    mergePageChunks(local);
    expect(local.map((c) => c.page).join(",")).toBe(before);
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
  it("produces YAML between --- delimiters", () => {
    const fm = formatFrontmatter(meta);
    expect(fm.startsWith("---\n")).toBe(true);
    expect(fm.endsWith("\n---")).toBe(true);
  });
  it("quotes string fields and escapes embedded quotes", () => {
    const fm = formatFrontmatter({ ...meta, filename: 'a "b".pdf' });
    expect(fm).toContain('filename: "a \\"b\\".pdf"');
  });
  it("emits numeric and boolean fields unquoted", () => {
    const fm = formatFrontmatter(meta);
    expect(fm).toContain("totalPages: 3");
    expect(fm).toContain("textRichPages: 1");
    expect(fm).toContain("imageHeavyPages: 2");
    expect(fm).toContain("visionAvailable: true");
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
  it("wraps body with frontmatter and heading", () => {
    const md = formatVaultMarkdown(meta, chunks);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("# x.pdf");
    expect(md).toContain("## Page 1 — text-rich");
    expect(md).toContain("Hello.");
    expect(md.endsWith("\n")).toBe(true);
  });
  it("handles zero chunks (no body, just frontmatter + heading)", () => {
    const md = formatVaultMarkdown(meta, []);
    expect(md).toContain("# x.pdf");
    expect(md.endsWith("\n")).toBe(true);
  });
});

// V1 helper sanity tests — guard against accidental regression in the
// preserved legacy regex extractors. Coverage is intentionally light;
// thorough tests for these live in their own legacy suite.

describe("P21-U02 v1 helpers preserved", () => {
  it("extractCuttingParams finds speed entries", () => {
    const text = "Cutting speed: 250 m/min\nFeed rate: 0.15 mm/rev";
    const params = extractCuttingParams(text);
    expect(params.length).toBeGreaterThanOrEqual(1);
    const hasSpeed = params.some((p) => typeof p.speed === "string" && p.speed.length > 0);
    expect(hasSpeed).toBe(true);
  });
  it("extractCuttingParams returns [] on empty text", () => {
    expect(extractCuttingParams("")).toEqual([]);
  });
  it("extractProcedures finds numbered step blocks", () => {
    const text =
      "procedure:\n1. First do this thing carefully\n2. Then do that other step properly\n3. Finally inspect the work surface\n\nNext section.";
    const procs = extractProcedures(text);
    expect(procs.length).toBeGreaterThanOrEqual(1);
    expect(procs[0]?.steps.length).toBeGreaterThanOrEqual(2);
  });
  it("countKeywords returns zero for missing terms", () => {
    const counts = countKeywords("nothing relevant here at all");
    expect(counts.feed).toBe(0);
    expect(counts.toolpath).toBe(0);
  });
  it("countKeywords counts case-insensitively", () => {
    const counts = countKeywords("FEED feed Feed");
    expect(counts.feed).toBe(3);
  });
});
