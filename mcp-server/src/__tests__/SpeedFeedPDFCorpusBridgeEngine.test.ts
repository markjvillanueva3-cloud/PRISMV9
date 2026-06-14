/**
 * Tests for SpeedFeedPDFCorpusBridgeEngine (U-OSC9-10).
 *
 * Coverage:
 *   - Singleton + shape contract
 *   - Schema validation (domain/software/keyword/top_k bounds)
 *   - Source A — kilo tribal-seeds JSON: load, parse, map to evidence
 *   - Source B — fleet JSONL ledgers: load, line-tolerant parse, map to evidence
 *   - Domain filter (allowlist behavior + default)
 *   - Software filter (Source A only — Source B passes through)
 *   - Keyword filter + relevance scoring (multi-keyword hit count → score)
 *   - Top-K cap honors ranking
 *   - Missing-source warnings (Source A absent, Source B absent, both absent)
 *   - Malformed-JSONL line tolerance (one bad line ≠ whole file lost)
 *   - Bridge-engines + book metadata round-trip
 *   - Invariants: returned ≤ top_k, filters sum to loaded
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  speedFeedPDFCorpusBridgeEngine,
  SpeedFeedPDFCorpusBridgeEngine,
  PDFCorpusBridgeInputSchema,
  type PDFCorpusBridgeInput,
  type PDFCorpusBridgeResult,
  type PDFCorpusEvidence,
} from "../engines/SpeedFeedPDFCorpusBridgeEngine.js";

// ============================================================================
// FIXTURES — mirror live operator file shapes (verified 2026-05-26)
// ============================================================================

const KILO_SEEDS_FIXTURE = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-26T16:23:59.886Z",
  totalNodes: 148,
  totalTips: 4,
  tips: [
    {
      id: "tribal-pdf-corpus-solidworks",
      domain: "cad",
      software: "solidworks",
      title: "solidworks PDF documentation corpus (14 docs, 1060 pages)",
      text: "PRISM has 14 extracted PDF documents totaling 1,060 pages of indexed text for solidworks.",
      sourceCorpus: "cad-cam-pdf-nodes",
      nodeCount: 14,
      tags: ["cad", "solidworks", "pdf-corpus"],
      sourceType: "pointer",
    },
    {
      id: "tribal-pdf-corpus-hypermill",
      domain: "cam",
      software: "hypermill",
      title: "hypermill PDF documentation corpus",
      text: "hyperMILL post-processor and toolpath strategy documentation — covers 5-axis MILL operations and chatter avoidance.",
      sourceCorpus: "cad-cam-pdf-nodes",
      nodeCount: 113,
      tags: ["cam", "hypermill", "post-processor", "chatter", "5-axis"],
      sourceType: "pointer",
    },
    {
      id: "tribal-pdf-corpus-mastercam",
      domain: "cam",
      software: "mastercam",
      title: "mastercam corpus",
      text: "Mastercam documentation — turning + milling + threading + grooving operations across 19 PDFs.",
      sourceCorpus: "cad-cam-pdf-nodes",
      nodeCount: 19,
      tags: ["cam", "mastercam", "lathe", "mill"],
      sourceType: "pointer",
    },
  ],
};

const JSONL_LATHE_TIPS = [
  {
    id: "foc14-101",
    domain: "lathe",
    topic: "6-stage-lathe-operation-sequence",
    tip: "Canonical 6-stage lathe operation sequence: face, rough/finish, groove, thread, bore, cutoff.",
    source: { book: "Fundamentals of CNC Machining", author: "Autodesk", year: 2014, chapter: 8, pages: "8-24 to 8-25" },
    bridge_engines: ["engine.LathePostProcessorEngine", "engine.LatheGeneticAlgorithmEngine"],
    confidence: 1.0,
    audience: ["bravo", "kilo"],
    schemaVersion: "1.0.0",
  },
  {
    id: "foc14-102",
    domain: "lathe",
    topic: "chatter-stability-roughing",
    tip: "Chatter onset during roughing is dominated by tool stickout (L^3) and material modulus. Use shortest stickout that clears stock.",
    source: { book: "Fundamentals of CNC Machining", author: "Autodesk", year: 2014, chapter: 9 },
    bridge_engines: ["engine.ChatterStabilityLobeEngine"],
    confidence: 0.95,
  },
  {
    id: "foc14-103",
    domain: "mill",
    topic: "milling-coolant",
    tip: "Flood coolant for milling — keeps chip evacuation reliable on roughing passes.",
    confidence: 0.9,
  },
];

const JSONL_LATHE_TIPS_RAW = JSONL_LATHE_TIPS.map((t) => JSON.stringify(t)).join("\n");

// ============================================================================
// TEST SCAFFOLD
// ============================================================================

let tmp: string;
let tribalPath: string;
let extractedDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "sf-pdf-bridge-"));
  tribalPath = join(tmp, "cad-cam-pdf-tribal-seeds.json");
  extractedDir = join(tmp, "extracted-pdfs");
  mkdirSync(extractedDir, { recursive: true });
  writeFileSync(tribalPath, JSON.stringify(KILO_SEEDS_FIXTURE));
  writeFileSync(join(extractedDir, "autodesk-2014-lathe-tips.jsonl"), JSONL_LATHE_TIPS_RAW);
});

afterEach(() => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

function runWithFixtures(extra: Partial<PDFCorpusBridgeInput> = {}): PDFCorpusBridgeResult {
  return speedFeedPDFCorpusBridgeEngine.run({
    tribal_seeds_path: tribalPath,
    extracted_pdfs_dir: extractedDir,
    ...extra,
  });
}

/** Locate evidence by id and assert it exists (returns a value-typed reference; never null). */
function evidenceById(result: PDFCorpusBridgeResult, id: string): PDFCorpusEvidence {
  const found = result.evidence.find((e) => e.id === id);
  // Asserting via toContain on the ID list is unambiguous + emits the actual set on failure.
  expect(result.evidence.map((e) => e.id)).toContain(id);
  return found as PDFCorpusEvidence;
}

// ============================================================================
// TESTS
// ============================================================================

describe("SpeedFeedPDFCorpusBridgeEngine — singleton + shape", () => {
  it("exports a singleton instance of the class", () => {
    expect(speedFeedPDFCorpusBridgeEngine).toBeInstanceOf(SpeedFeedPDFCorpusBridgeEngine);
  });

  it("exposes run()", () => {
    expect(typeof speedFeedPDFCorpusBridgeEngine.run).toBe("function");
  });
});

describe("PDFCorpusBridgeInputSchema — Zod validation", () => {
  it("accepts empty input + applies top_k default 10", () => {
    const parsed = PDFCorpusBridgeInputSchema.parse({});
    expect(parsed.top_k).toBe(10);
    expect(parsed.domains).toEqual(undefined);
  });

  it("rejects bad domain enum", () => {
    expect(() => PDFCorpusBridgeInputSchema.parse({ domains: ["rocket"] })).toThrow();
  });

  it("rejects top_k > 100", () => {
    expect(() => PDFCorpusBridgeInputSchema.parse({ top_k: 200 })).toThrow();
  });

  it("rejects > 20 keywords", () => {
    const kws = Array.from({ length: 21 }, (_, i) => `kw${i}`);
    expect(() => PDFCorpusBridgeInputSchema.parse({ keywords: kws })).toThrow();
  });

  it("rejects empty keyword string", () => {
    expect(() => PDFCorpusBridgeInputSchema.parse({ keywords: [""] })).toThrow();
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — Source A (kilo tribal seeds)", () => {
  it("loads all 3 fixture tips when no domain filter restricts", () => {
    // Use exhaustive domain list so all 3 tips (1 cad + 2 cam) survive.
    const result = runWithFixtures({ domains: ["cad", "cam", "lathe", "mill", "wedm", "training", "mfg", "machine"] });
    expect(result.summary.sources_read.kilo).toBe(true);
    const kiloTips = result.evidence.filter((e) => e.source === "kilo-tribal-seeds");
    expect(kiloTips.length).toBe(3);
  });

  it("normalizes a kilo tip into PDFCorpusEvidence with all expected fields", () => {
    const result = runWithFixtures({ domains: ["cam"] });
    const hyperMill = evidenceById(result, "tribal-pdf-corpus-hypermill");
    expect(hyperMill.source).toBe("kilo-tribal-seeds");
    expect(hyperMill.domain).toBe("cam");
    expect(hyperMill.software).toBe("hypermill");
    expect(hyperMill.title).toBe("hypermill PDF documentation corpus");
    expect(hyperMill.text).toContain("hyperMILL post-processor");
    expect(hyperMill.tags).toEqual(["cam", "hypermill", "post-processor", "chatter", "5-axis"]);
    expect(hyperMill.confidence).toBe(0.5); // pointer-tip baseline
    expect(hyperMill.bridge_engines).toEqual([]); // Source A has no bridge_engines field
  });

  it("skips Source A when file absent + emits warning", () => {
    rmSync(tribalPath);
    const result = runWithFixtures();
    expect(result.summary.sources_read.kilo).toBe(false);
    expect(result.summary.warnings.some((w) => /tribal-seeds file not found/.test(w))).toBe(true);
  });

  it("skips Source A on malformed JSON + warns + Source B still loads", () => {
    writeFileSync(tribalPath, "{ not valid json");
    const result = runWithFixtures();
    expect(result.summary.sources_read.kilo).toBe(false);
    expect(result.summary.warnings.some((w) => /failed to parse kilo tribal-seeds/.test(w))).toBe(true);
    expect(result.evidence.filter((e) => e.source === "fleet-jsonl").length).toBeGreaterThan(0);
  });

  it("skips Source A when tips array is missing", () => {
    writeFileSync(tribalPath, JSON.stringify({ schemaVersion: "1.0.0", totalTips: 0 })); // no tips[]
    const result = runWithFixtures();
    expect(result.summary.sources_read.kilo).toBe(false);
    expect(result.summary.warnings.some((w) => /no tips array/.test(w))).toBe(true);
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — Source B (fleet JSONL)", () => {
  it("loads all 3 JSONL tips", () => {
    const result = runWithFixtures();
    expect(result.summary.sources_read.fleet_jsonl_count).toBe(1);
    const jsonlTips = result.evidence.filter((e) => e.source === "fleet-jsonl");
    expect(jsonlTips.length).toBe(3);
  });

  it("preserves book metadata + bridge_engines + topic + confidence", () => {
    const result = runWithFixtures();
    const lathe6stage = evidenceById(result, "foc14-101");
    expect(lathe6stage.domain).toBe("lathe");
    expect(lathe6stage.topic).toBe("6-stage-lathe-operation-sequence");
    expect(lathe6stage.confidence).toBe(1.0);
    expect(lathe6stage.bridge_engines).toEqual([
      "engine.LathePostProcessorEngine",
      "engine.LatheGeneticAlgorithmEngine",
    ]);
    expect(lathe6stage.book).toEqual({
      author: "Autodesk",
      title: "Fundamentals of CNC Machining",
      year: 2014,
      chapter: 8,
      pages: "8-24 to 8-25",
    });
  });

  it("tolerates one malformed JSONL line — rest of file still parses", () => {
    const raw = [JSON.stringify(JSONL_LATHE_TIPS[0]), "{ garbage line", JSON.stringify(JSONL_LATHE_TIPS[2])].join("\n");
    writeFileSync(join(extractedDir, "autodesk-2014-lathe-tips.jsonl"), raw);
    const result = runWithFixtures();
    const ids = result.evidence.filter((e) => e.source === "fleet-jsonl").map((e) => e.id);
    expect(ids).toEqual(["foc14-101", "foc14-103"]);
  });

  it("skips rows missing id or tip", () => {
    const raw = [
      JSON.stringify({ id: "no-tip-row" }),
      JSON.stringify({ tip: "no id" }),
      JSON.stringify(JSONL_LATHE_TIPS[0]),
    ].join("\n");
    writeFileSync(join(extractedDir, "autodesk-2014-lathe-tips.jsonl"), raw);
    const result = runWithFixtures();
    const ids = result.evidence.filter((e) => e.source === "fleet-jsonl").map((e) => e.id);
    expect(ids).toEqual(["foc14-101"]);
  });

  it("skips Source B when dir absent + warns", () => {
    rmSync(extractedDir, { recursive: true, force: true });
    const result = runWithFixtures();
    expect(result.summary.sources_read.fleet_jsonl_count).toBe(0);
    expect(result.summary.warnings.some((w) => /extracted-pdfs dir not found/.test(w))).toBe(true);
  });

  it("reads multiple JSONL files in the dir + aggregates", () => {
    writeFileSync(
      join(extractedDir, "second-file.jsonl"),
      JSON.stringify({ id: "x-1", domain: "mill", topic: "extra", tip: "extra mill tip", confidence: 0.7 }),
    );
    const result = runWithFixtures();
    expect(result.summary.sources_read.fleet_jsonl_count).toBe(2);
    const xrow = evidenceById(result, "x-1");
    expect(xrow.domain).toBe("mill");
    expect(xrow.text).toBe("extra mill tip");
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — domain filter", () => {
  it("default allowlist (mill/lathe/wedm/cam/training/mfg/machine) drops 'cad'", () => {
    const result = runWithFixtures();
    const domains = result.evidence.map((e) => e.domain);
    expect(domains).not.toContain("cad");
    expect(domains.filter((d) => d === "cam").length).toBe(2);
  });

  it("restrictive domain filter ['lathe'] keeps only lathe rows", () => {
    const result = runWithFixtures({ domains: ["lathe"] });
    const allDomains = result.evidence.map((e) => e.domain);
    expect(allDomains).toEqual(["lathe", "lathe"]); // foc14-101 and foc14-102
  });

  it("filtered_by_domain reconciles against total_loaded", () => {
    const result = runWithFixtures({ domains: ["lathe"] });
    expect(result.summary.total_loaded).toBe(6); // 3 kilo + 3 jsonl
    expect(result.summary.returned).toBe(2); // only 2 lathe tips
    expect(result.summary.filtered_by_domain).toBe(4); // 1 cad + 2 cam + 1 mill dropped
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — software filter", () => {
  it("filter ['hypermill'] keeps only the hyperMILL Source A tip; Source B unaffected", () => {
    const result = runWithFixtures({ software: ["hypermill"] });
    const kiloIds = result.evidence.filter((e) => e.source === "kilo-tribal-seeds").map((e) => e.id);
    expect(kiloIds).toEqual(["tribal-pdf-corpus-hypermill"]);
    expect(result.evidence.filter((e) => e.source === "fleet-jsonl").length).toBeGreaterThan(0);
  });

  it("software match is case-insensitive", () => {
    const result = runWithFixtures({ software: ["HYPERMILL"] });
    const kiloIds = result.evidence.filter((e) => e.source === "kilo-tribal-seeds").map((e) => e.id);
    expect(kiloIds).toEqual(["tribal-pdf-corpus-hypermill"]);
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — keyword filter + relevance scoring", () => {
  it("keyword 'chatter' keeps both rows mentioning chatter; drops non-matching", () => {
    const result = runWithFixtures({ keywords: ["chatter"] });
    const ids = result.evidence.map((e) => e.id);
    expect(ids).toContain("tribal-pdf-corpus-hypermill"); // hits 'chatter avoidance'
    expect(ids).toContain("foc14-102"); // topic 'chatter-stability-roughing'
    expect(ids).not.toContain("foc14-101"); // lathe sequence — no chatter mention
  });

  it("multi-keyword scoring — more hits → higher relevance_score", () => {
    const result = runWithFixtures({ keywords: ["chatter", "stickout", "tool"] });
    const foc102 = evidenceById(result, "foc14-102");
    // text mentions 'chatter', 'stickout', 'tool' → 3 hits + 0.95 confidence = 3.95
    expect(foc102.relevance_score).toBeGreaterThanOrEqual(3);
    expect(foc102.relevance_score).toBeLessThanOrEqual(4);
  });

  it("no keywords → relevance_score equals confidence", () => {
    const result = runWithFixtures();
    const foc101 = evidenceById(result, "foc14-101");
    expect(foc101.relevance_score).toBe(1.0); // confidence = 1.0
  });

  it("filtered_by_keywords counts rows dropped by keyword filter", () => {
    const result = runWithFixtures({ keywords: ["chatter"] });
    expect(result.summary.filtered_by_keywords).toBeGreaterThan(0);
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — top_k + ranking", () => {
  it("top_k caps the result count", () => {
    const result = runWithFixtures({ top_k: 2 });
    expect(result.evidence.length).toBe(2);
    expect(result.summary.returned).toBe(2);
  });

  it("results sorted by relevance descending", () => {
    const result = runWithFixtures();
    const scores = result.evidence.map((e) => e.relevance_score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("top_k=1 with multi-keyword surfaces the highest-scoring evidence (foc14-102)", () => {
    const result = runWithFixtures({ keywords: ["chatter", "stickout"], top_k: 1 });
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].id).toBe("foc14-102");
  });
});

describe("SpeedFeedPDFCorpusBridgeEngine.run() — invariants", () => {
  it("both sources missing → empty evidence + two warnings", () => {
    rmSync(tribalPath);
    rmSync(extractedDir, { recursive: true, force: true });
    const result = runWithFixtures();
    expect(result.evidence).toEqual([]);
    expect(result.summary.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.summary.total_loaded).toBe(0);
  });

  it("returned + dropped counts reconcile against total_loaded", () => {
    const result = runWithFixtures({ domains: ["lathe"] });
    const acc =
      result.summary.returned +
      result.summary.filtered_by_domain +
      result.summary.filtered_by_software +
      result.summary.filtered_by_keywords;
    expect(acc).toBe(result.summary.total_loaded);
  });

  it("each returned evidence has a non-zero relevance_score after ranking", () => {
    const result = runWithFixtures();
    for (const e of result.evidence) {
      expect(e.relevance_score).toBeGreaterThan(0);
    }
  });
});
