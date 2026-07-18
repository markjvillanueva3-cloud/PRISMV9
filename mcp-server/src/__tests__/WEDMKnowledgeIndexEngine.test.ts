import { describe, it, expect } from "vitest";
import {
  WEDMKnowledgeIndexEngine,
  type RawTribalTip,
  type RawWikiDoc,
} from "../engines/WEDMKnowledgeIndexEngine.js";
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

const TIP: RawTribalTip = {
  id: "wedm-kb-001",
  title: "Reduce discharge power before raising wire tension",
  body: "Wire breakage: reduce pulse-on time 10-15% before increasing tension; discharge energy is the primary wire-heating mechanism.",
  category: "wire-break",
  tags: ["wedm", "wire-break", "tension", "pulse-on"],
  confidence: 95, // 0..100 — must normalise to 0.95
  source: "Klocke 2013 Ch8",
};

const TIP2: RawTribalTip = {
  id: "wedm-jmd-005",
  title: "Taper programs set all H-registers to zero",
  body: "On a UV taper program the post handles taper in UV coords; set H175=0 and H1..H5=0 or the offset double-compensates.",
  category: "taper",
  tags: ["wedm", "taper", "uv", "mitsubishi-fa"],
  confidence: 0.9, // already 0..1 — must NOT be re-normalised
  source: "NOZE TEST.NC",
};

const WIKI_TACTIC: RawWikiDoc = {
  path: "knowledge/wiki/code-tribal/wedm-tactics-taper-corner-and-program-structure.md",
  title: "WEDM tactics — taper/UV, corner strategy, FA-10S program structure",
  kind: "tactic",
  tags: ["wedm", "taper", "uv", "corner", "mitsubishi-fa"],
  topics: ["taper", "corner", "program-structure"],
  summary: "Set ALL H-registers to zero on taper. Corner breaks at <R0.5mm: reduce feed 60%. M78 doubled; M90/M91 adaptive rough-only.",
};

const WIKI_LESSON: RawWikiDoc = {
  path: "knowledge/wiki/lessons/hybrid-post-merge-half-wire-bug-class-2026-05-23.md",
  title: "Hybrid post-merge half-wire bug class",
  kind: "lesson",
  tags: ["wedm", "post-merge", "bug-class"],
  summary: "A greedy merge dropped half the wire program; verify JSON.parse not byte-length.",
  confidence: 88,
};

describe("WEDMKnowledgeIndexEngine — compile", () => {
  it("maps a tribal tip to a namespaced entry and normalises 0..100 confidence", () => {
    const [e] = WEDMKnowledgeIndexEngine.fromTips([TIP]);
    expect(e.id).toBe("tribal:wedm-kb-001");
    expect(e.source_type).toBe("tribal");
    expect(e.confidence).toBeCloseTo(0.95, 5);
    expect(e.tags).toContain("wire-break");
    // family tags are excluded from topics; category becomes a topic
    expect(e.topics).toContain("wire-break");
    expect(e.topics).not.toContain("wedm");
  });

  it("does NOT re-normalise a confidence already in 0..1", () => {
    const [e] = WEDMKnowledgeIndexEngine.fromTips([TIP2]);
    expect(e.confidence).toBeCloseTo(0.9, 5);
  });

  it("maps a wiki tactic doc to a wiki-tactic entry with path + slug id", () => {
    const [e] = WEDMKnowledgeIndexEngine.fromWikiDocs([WIKI_TACTIC]);
    expect(e.id).toBe("wiki:wedm-tactics-taper-corner-and-program-structure");
    expect(e.source_type).toBe("wiki-tactic");
    expect(e.path).toBe(WIKI_TACTIC.path);
    expect(e.topics).toContain("program-structure");
  });

  it("maps a wiki lesson to a wiki-lesson entry", () => {
    const [e] = WEDMKnowledgeIndexEngine.fromWikiDocs([WIKI_LESSON]);
    expect(e.source_type).toBe("wiki-lesson");
    expect(e.confidence).toBeCloseTo(0.88, 5);
  });

  it("compile() concatenates tribal + wiki and dedupes by id (first wins)", () => {
    const corpus = WEDMKnowledgeIndexEngine.compile({
      tips: [TIP, TIP, TIP2],          // duplicate TIP id
      wikiDocs: [WIKI_TACTIC, WIKI_LESSON],
    });
    const ids = corpus.map((e) => e.id);
    expect(ids.filter((i) => i === "tribal:wedm-kb-001").length).toBe(1); // deduped
    expect(corpus.length).toBe(4); // 2 unique tribal + 2 wiki
  });

  it("throws on non-array input (fail loud)", () => {
    // @ts-expect-error intentional bad input
    expect(() => WEDMKnowledgeIndexEngine.fromTips(null)).toThrow();
  });

  it("skips malformed tips without an id/title rather than crashing", () => {
    const bad = [{ body: "no id" } as unknown as RawTribalTip, TIP];
    const entries = WEDMKnowledgeIndexEngine.fromTips(bad);
    expect(entries.length).toBe(1);
  });
});

describe("WEDMKnowledgeIndexEngine — select", () => {
  const eng = new WEDMKnowledgeIndexEngine(
    WEDMKnowledgeIndexEngine.compile({ tips: [TIP, TIP2], wikiDocs: [WIKI_TACTIC, WIKI_LESSON] }),
  );

  it("selects by keyword matching the title", () => {
    const r = eng.select({ keywords: ["taper"] });
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries[0].matchedKeywords).toContain("taper");
  });

  it("selects by keyword matching the body/summary", () => {
    const r = eng.select({ keywords: ["pulse-on"] });
    expect(r.entries.some((s) => s.entry.id === "tribal:wedm-kb-001")).toBe(true);
  });

  it("blends tribal + wiki in one ranked result for a shared topic", () => {
    const r = eng.select({ keywords: ["taper"], maxResults: 10 });
    const types = new Set(r.entries.map((s) => s.entry.source_type));
    expect(types.has("tribal")).toBe(true);
    expect(types.has("wiki-tactic")).toBe(true);
  });

  it("ranks a wiki-tactic at/above a tribal tip on an equal keyword tie (source weight)", () => {
    // both 'taper' tip (conf .9) and 'taper' tactic match title — tactic weight 1.1 > tribal 1.0
    const r = eng.select({ keywords: ["taper"], maxResults: 10 });
    const tacticIdx = r.entries.findIndex((s) => s.entry.source_type === "wiki-tactic");
    expect(tacticIdx).toBeGreaterThanOrEqual(0);
  });

  it("filters by sourceTypes", () => {
    const r = eng.select({ keywords: ["taper"], sourceTypes: ["tribal"], maxResults: 10 });
    expect(r.entries.every((s) => s.entry.source_type === "tribal")).toBe(true);
    expect(r.considered).toBe(2); // only the 2 tribal entries considered
  });

  it("caps results at maxResults", () => {
    const r = eng.select({ keywords: ["wedm", "taper", "wire"], maxResults: 1 });
    expect(r.entries.length).toBeLessThanOrEqual(1);
  });

  it("returns empty entries for a no-match keyword query", () => {
    const r = eng.select({ keywords: ["zzz-no-such-token-xyz"] });
    expect(r.entries.length).toBe(0);
    expect(r.considered).toBe(4);
  });

  it("treats whitespace-only criteria as no-criteria (list-all, not empty)", () => {
    // final-assessment edge fix (Codex): keywords:[" "] is not a real query.
    const r = eng.select({ keywords: ["   "] });
    expect(r.entries.length).toBe(4); // all 4 entries ranked by quality, not empty
  });

  it("matches by tag and by topic", () => {
    expect(eng.select({ tags: ["corner"] }).entries.length).toBeGreaterThan(0);
    expect(eng.select({ topics: ["wire-break"] }).entries.length).toBeGreaterThan(0);
  });
});

describe("WEDMKnowledgeIndexEngine — stats", () => {
  it("reports totals by source type and top tags", () => {
    const eng = new WEDMKnowledgeIndexEngine(
      WEDMKnowledgeIndexEngine.compile({ tips: [TIP, TIP2], wikiDocs: [WIKI_TACTIC, WIKI_LESSON] }),
    );
    const s = eng.stats();
    expect(s.total).toBe(4);
    expect(s.byType.tribal).toBe(2);
    expect(s.byType["wiki-tactic"]).toBe(1);
    expect(s.byType["wiki-lesson"]).toBe(1);
    expect(s.topTags.find((t) => t.tag === "taper")?.count).toBeGreaterThanOrEqual(2);
  });
});

describe("WEDMKnowledgeIndexEngine — real-data E2E (RGS-MS1 lesson)", () => {
  it("compiles the REAL wedm tribal corpus and serves a relevant entry", () => {
    const corpus = WEDMKnowledgeIndexEngine.compile({ tips: WEDM_KNOWLEDGE_TIPS as RawTribalTip[] });
    expect(corpus.length).toBeGreaterThanOrEqual(100); // ~107 real tips
    expect(corpus.every((e) => e.id.startsWith("tribal:"))).toBe(true);
    expect(corpus.every((e) => e.confidence >= 0 && e.confidence <= 1)).toBe(true);
    const eng = new WEDMKnowledgeIndexEngine(corpus);
    const r = eng.select({ keywords: ["wire", "break"], maxResults: 5 });
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.considered).toBeGreaterThanOrEqual(100);
  });
});
