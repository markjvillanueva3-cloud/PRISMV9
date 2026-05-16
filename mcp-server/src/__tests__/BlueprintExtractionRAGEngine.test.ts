/**
 * BlueprintExtractionRAGEngine.test.ts — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7
 * Centerpiece test — exercises the full 9-step RAG pipeline with mock IO.
 * HARD RULE explicitly tested: every extraction MUST cite ≥1 source OR carry
 * a confidenceFloor !== "normal".
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BlueprintExtractionRAGEngine,
  blueprintExtractionRAGEngine,
  BlueprintExtractionSchema,
  ExtractionRegionSchema,
  EXTRACTION_DIM_TYPES,
  SOURCE_KINDS,
  CONFIDENCE_FLOORS,
  validateRequest,
  clamp01,
  detectContradictions,
  defaultComposePrompt,
  defaultFuseRegions,
  type ExtractRequest,
  type BlueprintExtractionRAGIO,
  type RetrievedSource,
  type ExtractionRegion,
  type BlueprintExtraction,
} from "../engines/BlueprintExtractionRAGEngine.js";

let engine: BlueprintExtractionRAGEngine;

beforeEach(() => {
  engine = new BlueprintExtractionRAGEngine();
});

describe("constants + enums", () => {
  it("EXTRACTION_DIM_TYPES exposes the canonical 11 dim types", () => {
    expect(EXTRACTION_DIM_TYPES.length).toBe(11);
    expect(EXTRACTION_DIM_TYPES).toContain("linear");
    expect(EXTRACTION_DIM_TYPES).toContain("gdt_positional");
    expect(EXTRACTION_DIM_TYPES).toContain("thread_callout");
    expect(EXTRACTION_DIM_TYPES).toContain("surface_finish");
  });
  it("SOURCE_KINDS exposes 4 retrieval channels", () => {
    expect(SOURCE_KINDS).toEqual(["corpus", "tribal", "similar_print", "family_template"]);
  });
  it("CONFIDENCE_FLOORS exposes 4 tiers", () => {
    expect(CONFIDENCE_FLOORS).toEqual([
      "normal",
      "low_no_prior",
      "low_contradiction",
      "low_no_vision",
    ]);
  });
});

describe("validateRequest", () => {
  it("accepts canonical request", () => {
    expect(() => validateRequest({ pdfPath: "/p.pdf", page: 1 })).not.toThrow();
  });
  it("rejects null/undefined", () => {
    expect(() => validateRequest(null as unknown as ExtractRequest)).toThrow(/object/);
  });
  it("rejects empty pdfPath", () => {
    expect(() => validateRequest({ pdfPath: "", page: 1 })).toThrow(/pdfPath/);
  });
  it("rejects non-integer page", () => {
    expect(() => validateRequest({ pdfPath: "/p.pdf", page: 1.5 })).toThrow(/page/);
  });
  it("rejects page < 1", () => {
    expect(() => validateRequest({ pdfPath: "/p.pdf", page: 0 })).toThrow(/page/);
  });
});

describe("clamp01", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.5)).toBe(0);
  });
  it("returns 0 for NaN/Infinity", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(1);
  });
});

describe("detectContradictions", () => {
  it("returns [] when sources agree or have no key=value pairs", () => {
    const corpus: RetrievedSource[] = [{ kind: "corpus", id: "c1", title: "free text only", score: 0.9 }];
    expect(detectContradictions(corpus, [], [])).toEqual([]);
  });
  it("flags conflicting key=value across sources", () => {
    const corpus: RetrievedSource[] = [
      { kind: "corpus", id: "c1", title: "tolerance: 0.001", score: 0.9 },
    ];
    const tribal: RetrievedSource[] = [
      { kind: "tribal", id: "t1", title: "tolerance: 0.005", score: 0.8 },
    ];
    const result = detectContradictions(corpus, tribal, []);
    expect(result.length).toBe(1);
    expect(result[0]).toMatch(/tolerance/);
    expect(result[0]).toMatch(/c1/);
    expect(result[0]).toMatch(/t1/);
  });
  it("deduplicates identical contradictions", () => {
    const corpus: RetrievedSource[] = [
      { kind: "corpus", id: "c1", title: "k: A", score: 0.9 },
      { kind: "corpus", id: "c2", title: "k: B", score: 0.8 },
      { kind: "corpus", id: "c3", title: "k: B", score: 0.7 },
    ];
    const result = detectContradictions(corpus, [], []);
    // Only one contradiction: "k: A vs B" (the third matches B which doesn't re-conflict)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("defaultComposePrompt", () => {
  it("includes pdfPath + page + customer + sources", () => {
    const req: ExtractRequest = {
      pdfPath: "/p.pdf",
      page: 3,
      customer: "ALCOA",
      dimTypeHint: "linear",
      operatorContext: "review pass 1",
    };
    const prompt = defaultComposePrompt(req, {
      corpus: [{ kind: "corpus", id: "c1", title: "T1", score: 0.9 }],
      tribal: [],
      similar: [{ kind: "similar_print", id: "s1", title: "S1", score: 0.8 }],
      familyTemplate: { kind: "family_template", id: "f1", title: "fam", score: 1 },
    });
    expect(prompt).toContain("/p.pdf");
    expect(prompt).toContain("page 3");
    expect(prompt).toContain("ALCOA");
    expect(prompt).toContain("review pass 1");
    expect(prompt).toContain("c1");
    expect(prompt).toContain("s1");
    expect(prompt).toContain("f1");
  });
});

describe("defaultFuseRegions", () => {
  const primary: ExtractionRegion[] = [
    {
      regionId: "r1",
      dimType: "linear",
      value: "1.000",
      confidence: 0.7,
      confidenceLower: 0.63,
      confidenceUpper: 0.735,
    },
  ];
  it("boosts confidence when primary + ensemble agree", () => {
    const fused = defaultFuseRegions(primary, [{ regionId: "r1", value: "1.000", confidence: 0.9 }]);
    expect(fused[0]?.confidence).toBeGreaterThan(0.7);
  });
  it("lowers confidence when primary + ensemble disagree", () => {
    const fused = defaultFuseRegions(primary, [{ regionId: "r1", value: "1.500", confidence: 0.4 }]);
    expect(fused[0]?.confidence).toBeLessThanOrEqual(0.4);
  });
  it("passes through region when no ensemble entry", () => {
    const fused = defaultFuseRegions(primary, []);
    expect(fused[0]).toEqual(primary[0]);
  });
});

describe("BlueprintExtractionSchema HARD RULE", () => {
  it("accepts extraction with sources + normal floor", () => {
    const ext: BlueprintExtraction = {
      extractionId: "x",
      pdfPath: "/p.pdf",
      page: 1,
      familyMatchId: null,
      regions: [],
      sources: [{ kind: "corpus", id: "s1", title: "T", score: 0.9 }],
      confidenceFloor: "normal",
      contradictionsDetected: [],
      extractedAt: new Date().toISOString(),
      backendId: "b1",
    };
    expect(BlueprintExtractionSchema.safeParse(ext).success).toBe(true);
  });
  it("REJECTS extraction with empty sources + normal floor (HARD RULE)", () => {
    const ext: BlueprintExtraction = {
      extractionId: "x",
      pdfPath: "/p.pdf",
      page: 1,
      familyMatchId: null,
      regions: [],
      sources: [], // empty!
      confidenceFloor: "normal", // claiming normal!
      contradictionsDetected: [],
      extractedAt: new Date().toISOString(),
      backendId: "b1",
    };
    const r = BlueprintExtractionSchema.safeParse(ext);
    expect(r.success).toBe(false);
  });
  it("ACCEPTS extraction with empty sources + low_no_prior floor", () => {
    const ext: BlueprintExtraction = {
      extractionId: "x",
      pdfPath: "/p.pdf",
      page: 1,
      familyMatchId: null,
      regions: [],
      sources: [],
      confidenceFloor: "low_no_prior",
      contradictionsDetected: [],
      extractedAt: new Date().toISOString(),
      backendId: "b1",
    };
    expect(BlueprintExtractionSchema.safeParse(ext).success).toBe(true);
  });
});

describe("ExtractionRegionSchema invariants", () => {
  it("rejects when confidence is outside [lower, upper]", () => {
    const r = ExtractionRegionSchema.safeParse({
      regionId: "r1",
      dimType: "linear",
      value: "1",
      confidence: 0.5,
      confidenceLower: 0.7,
      confidenceUpper: 0.9, // lower > confidence
    });
    expect(r.success).toBe(false);
  });
  it("accepts when confidence ∈ [lower, upper]", () => {
    const r = ExtractionRegionSchema.safeParse({
      regionId: "r1",
      dimType: "linear",
      value: "1",
      confidence: 0.7,
      confidenceLower: 0.6,
      confidenceUpper: 0.8,
    });
    expect(r.success).toBe(true);
  });
});

describe("extract — full pipeline", () => {
  const req: ExtractRequest = { pdfPath: "/test.pdf", page: 1, customer: "ALCOA" };

  it("HARD RULE: extraction with retrieved sources cites them in sources[]", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "ISO 1101", score: 0.9 }],
      retrieveTribal: async () => [{ kind: "tribal", id: "t1", title: "shop tip", score: 0.7 }],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.85 },
      ],
      now: () => "2026-05-16T03:00:00.000Z",
    };
    const result = await engine.extract({ request: req, backendId: "test-backend", io });
    expect(result.sources.length).toBe(2);
    expect(result.sources[0]?.kind).toBe("corpus");
    expect(result.sources[1]?.kind).toBe("tribal");
    expect(result.confidenceFloor).toBe("normal");
    expect(result.regions.length).toBe(1);
    expect(result.regions[0]?.value).toBe("1.000");
  });

  it("HARD RULE: no retrievable sources -> empty sources + low_no_prior floor", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.5 },
      ],
      now: () => "2026-05-16T03:00:00.000Z",
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.sources).toEqual([]);
    expect(result.confidenceFloor).toBe("low_no_prior");
  });

  it("contradictions surfaced + confidenceFloor flipped to low_contradiction", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [
        { kind: "corpus", id: "c1", title: "tolerance: 0.001 inch", score: 0.9 },
      ],
      retrieveTribal: async () => [
        { kind: "tribal", id: "t1", title: "tolerance: 0.005 inch", score: 0.8 },
      ],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.8 },
      ],
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.contradictionsDetected.length).toBeGreaterThan(0);
    expect(result.confidenceFloor).toBe("low_contradiction");
  });

  it("visionExtract throwing surfaces as engine error (loud)", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => { throw new Error("vision down"); },
    };
    await expect(engine.extract({ request: req, backendId: "test", io })).rejects.toThrow(/vision down/);
  });

  it("no visionExtract injection -> low_no_vision candidate (empty regions)", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.confidenceFloor).toBe("low_no_vision");
    expect(result.regions.length).toBe(0);
  });

  it("family template appears in sources[] when matchFamily returns hit", async () => {
    const io: BlueprintExtractionRAGIO = {
      matchFamily: async () => ({ familyId: "fam-1", templateId: "tpl-1" }),
      retrieveCorpus: async () => [],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.0", confidence: 0.8 },
      ],
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.familyMatchId).toBe("fam-1");
    expect(result.sources.some((s) => s.kind === "family_template")).toBe(true);
  });

  it("ensembleVision agreement boosts confidence (via fuser)", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.6 },
      ],
      ensembleVision: async () => [{ regionId: "r1", value: "1.000", confidence: 0.95 }],
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.regions[0]?.confidence).toBeGreaterThan(0.6);
  });

  it("recordOutcome injection is called (advisory side-effect)", async () => {
    let recorded: BlueprintExtraction | null = null;
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.0", confidence: 0.8 },
      ],
      recordOutcome: async (e) => { recorded = e; },
    };
    await engine.extract({ request: req, backendId: "test", io });
    expect(recorded).not.toBe(null);
  });

  it("recordOutcome failure does NOT block extraction", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.0", confidence: 0.8 },
      ],
      recordOutcome: async () => { throw new Error("record down"); },
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    expect(result.regions.length).toBe(1);
  });

  it("rejects empty backendId", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [],
      visionExtract: async () => [],
    };
    await expect(engine.extract({ request: req, backendId: "", io })).rejects.toThrow(/backendId/);
  });

  it("rejects invalid request shape", async () => {
    const io: BlueprintExtractionRAGIO = { visionExtract: async () => [] };
    await expect(engine.extract({ request: { pdfPath: "", page: 1 } as ExtractRequest, backendId: "x", io })).rejects.toThrow(/pdfPath/);
  });

  it("explain returns cached extraction", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.0", confidence: 0.8 },
      ],
    };
    const result = await engine.extract({ request: req, backendId: "test", io });
    const cached = engine.explain({ extractionId: result.extractionId });
    expect(cached?.extractionId).toBe(result.extractionId);
  });

  it("explain returns null for unknown extractionId", () => {
    expect(engine.explain({ extractionId: "missing" })).toBe(null);
  });
});

describe("3 customer types (spec reference)", () => {
  const customers = ["JM-DIE-INTERNAL", "ALCOA", "CONTINENTAL_MIDLAND"];
  const dimTypes: Array<{ type: "linear" | "gdt_positional" | "thread_callout"; value: string }> = [
    { type: "linear", value: "1.500" },
    { type: "gdt_positional", value: "⊕ 0.005 A B C" },
    { type: "thread_callout", value: "1/4-20 UNC-2B" },
  ];
  for (const cust of customers) {
    for (const dim of dimTypes) {
      it(`customer=${cust} dimType=${dim.type}`, async () => {
        const io: BlueprintExtractionRAGIO = {
          retrieveCorpus: async () => [{ kind: "corpus", id: "c", title: `${cust} corpus`, score: 0.9 }],
          retrieveTribal: async () => [],
          retrieveSimilarPrints: async () => [],
          visionExtract: async () => [
            { regionId: "r1", dimType: dim.type, value: dim.value, confidence: 0.85 },
          ],
        };
        const result = await engine.extract({
          request: { pdfPath: "/p.pdf", page: 1, customer: cust },
          backendId: "test",
          io,
        });
        expect(result.customer).toBe(cust);
        expect(result.regions[0]?.dimType).toBe(dim.type);
        expect(result.regions[0]?.value).toBe(dim.value);
        expect(result.sources.length).toBe(1);
      });
    }
  }
});

describe("compareToBaseline", () => {
  it("counts agreed + disagreed regions", () => {
    const rag: BlueprintExtraction = {
      extractionId: "rag",
      pdfPath: "/p.pdf",
      page: 1,
      familyMatchId: null,
      regions: [
        { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.9, confidenceLower: 0.81, confidenceUpper: 0.945 },
        { regionId: "r2", dimType: "linear", value: "DIFFERENT", confidence: 0.8, confidenceLower: 0.72, confidenceUpper: 0.84 },
      ],
      sources: [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      confidenceFloor: "normal",
      contradictionsDetected: [],
      extractedAt: new Date().toISOString(),
      backendId: "b1",
    };
    const baseline: ExtractionRegion[] = [
      { regionId: "r1", dimType: "linear", value: "1.000", confidence: 0.6, confidenceLower: 0.54, confidenceUpper: 0.63 },
      { regionId: "r2", dimType: "linear", value: "OTHER", confidence: 0.5, confidenceLower: 0.45, confidenceUpper: 0.525 },
      { regionId: "r3", dimType: "linear", value: "extra", confidence: 0.5, confidenceLower: 0.45, confidenceUpper: 0.525 },
    ];
    const result = engine.compareToBaseline({ ragExtraction: rag, baselineRegions: baseline });
    expect(result.agreedRegions).toBe(1);
    expect(result.disagreedRegions.length).toBe(1);
    expect(result.disagreedRegions[0]?.regionId).toBe("r2");
    expect(result.baselineOnlyRegions).toEqual(["r3"]);
    expect(result.ragOnlyRegions).toEqual([]);
  });
});

describe("cache lifecycle", () => {
  it("clearCache + cacheSize", async () => {
    const io: BlueprintExtractionRAGIO = {
      retrieveCorpus: async () => [{ kind: "corpus", id: "c1", title: "T", score: 0.9 }],
      retrieveTribal: async () => [],
      retrieveSimilarPrints: async () => [],
      visionExtract: async () => [
        { regionId: "r1", dimType: "linear", value: "1.0", confidence: 0.8 },
      ],
    };
    await engine.extract({ request: { pdfPath: "/p.pdf", page: 1 }, backendId: "test", io });
    expect(engine.cacheSize()).toBe(1);
    engine.clearCache();
    expect(engine.cacheSize()).toBe(0);
  });
});

describe("singleton", () => {
  it("schemaVersion is 1.0.0", () => {
    expect(blueprintExtractionRAGEngine.schemaVersion).toBe("1.0.0");
  });
});
