/**
 * WebScrapeResultEngine tests — HCAP06.
 */
import { describe, it, expect } from "vitest";
import {
  WebScrapeResultEngine,
  type ScrapeResponse,
  type ScrapeBlock,
} from "../engines/WebScrapeResultEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";

const blk = (index: number, type: ScrapeBlock["type"], text: string): ScrapeBlock => ({
  index, type, text,
});

const resp = (over: Partial<ScrapeResponse> = {}): ScrapeResponse => ({
  url: "https://example.com",
  http_status: 200,
  fetched_at: ISO,
  blocks: [],
  ...over,
});

describe("WebScrapeResultEngine.analyze — happy", () => {
  it("ok=true for 200 status; ok=false for 500", () => {
    expect(WebScrapeResultEngine.analyze(resp({ http_status: 200 })).ok).toBe(true);
    expect(WebScrapeResultEngine.analyze(resp({ http_status: 500 })).ok).toBe(false);
  });

  it("counts block kinds (3 paragraphs + 2 headings + 1 table)", () => {
    const r = WebScrapeResultEngine.analyze(resp({
      blocks: [
        blk(0, "heading", "T"), blk(1, "heading", "U"),
        blk(2, "paragraph", "a"), blk(3, "paragraph", "b"), blk(4, "paragraph", "c"),
        blk(5, "table", "x"),
      ],
    }));
    expect(r.heading_count).toBe(2);
    expect(r.paragraph_count).toBe(3);
    expect(r.table_count).toBe(1);
    expect(r.block_count).toBe(6);
  });

  it("computes total_text_chars + density exactly", () => {
    const r = WebScrapeResultEngine.analyze(resp({
      blocks: [blk(0, "paragraph", "abcde"), blk(1, "paragraph", "fghij")],
    }));
    expect(r.total_text_chars).toBe(10);
    expect(r.density).toBe(5);
  });

  it("0-block response gives density=0", () => {
    const r = WebScrapeResultEngine.analyze(resp());
    expect(r.density).toBe(0);
    expect(r.block_count).toBe(0);
  });
});

describe("WebScrapeResultEngine.rankByLength", () => {
  it("ranks longer-text blocks first; ties broken by index ASC", () => {
    const blocks = [
      blk(0, "paragraph", "short"),
      blk(1, "paragraph", "long body text here body text"),
      blk(2, "paragraph", "x"),
      blk(3, "paragraph", "short"), // tied with index 0
    ];
    const ranked = WebScrapeResultEngine.rankByLength(blocks);
    expect(ranked[0].index).toBe(1);
    expect(ranked[1].index).toBe(0);
    expect(ranked[2].index).toBe(3);
    expect(ranked[3].index).toBe(2);
  });

  it("topK truncates to exactly K", () => {
    const blocks = Array.from({ length: 5 }, (_, i) => blk(i, "paragraph", "x".repeat(i + 1)));
    expect(WebScrapeResultEngine.rankByLength(blocks, 2)).toHaveLength(2);
  });
});

describe("WebScrapeResultEngine — validation", () => {
  it("rejects http_status < 100 (zod adversarial)", () => {
    expect(() => WebScrapeResultEngine.analyze(resp({ http_status: 99 }))).toThrow();
  });

  it("rejects http_status > 599 (zod adversarial)", () => {
    expect(() => WebScrapeResultEngine.analyze(resp({ http_status: 600 }))).toThrow();
  });

  it("rejects unknown block type (zod adversarial)", () => {
    expect(() => WebScrapeResultEngine.analyze(resp({
      blocks: [{ index: 0, type: "yolo", text: "x" } as never],
    }))).toThrow();
  });

  it("renderStructure shows OK tag + url + counts", () => {
    const r = WebScrapeResultEngine.analyze(resp({ blocks: [blk(0, "heading", "T")] }));
    const md = WebScrapeResultEngine.renderStructure(r);
    expect(md.includes("[SCRAPE OK 200]")).toBe(true);
    expect(md.includes("example.com")).toBe(true);
    expect(md.includes("h1")).toBe(true);
  });

  it("renderStructure shows ERR tag for 5xx", () => {
    const r = WebScrapeResultEngine.analyze(resp({ http_status: 503 }));
    expect(WebScrapeResultEngine.renderStructure(r).includes("[SCRAPE ERR 503]")).toBe(true);
  });
});
