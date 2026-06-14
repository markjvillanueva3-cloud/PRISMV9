// BlueprintOCRAdapter contract test surface
// slot:kilo iter 8, 2026-05-23, U-OCR-ADAPTER-IFACE
//
// Verifies the BlueprintOCRAdapter interface contract + the summarizeConfidence
// helper. No concrete OCR backend is invoked here — that's the multi-session
// ML work routed to dedicated chats per KILO-QUEUE-PSN-SYNERGY-2026-05-23.

import { describe, it, expect } from "vitest";
import {
  summarizeConfidence,
  type BlueprintOCRAdapter,
  type BlueprintOCRResult,
  type ExtractedDimension,
  type GDTCallout,
  type PMIAnnotation,
  type ExtractedMaterial,
  type OCRConfidenceSummary,
} from "../engines/BlueprintOCRAdapter.js";

describe("summarizeConfidence", () => {
  it("returns zeros on empty input", () => {
    const result = summarizeConfidence([]);
    expect(result.overall).toBe(0);
    expect(result.min).toBe(0);
    expect(result.low_confidence_count).toBe(0);
    expect(result.missing_confidence_count).toBe(0);
  });

  it("computes geometric mean for valid confidences", () => {
    // GM of [0.9, 0.9, 0.9] = 0.9
    const result = summarizeConfidence([0.9, 0.9, 0.9]);
    expect(result.overall).toBeCloseTo(0.9, 5);
    expect(result.min).toBeCloseTo(0.9, 5);
    expect(result.low_confidence_count).toBe(0);
    expect(result.missing_confidence_count).toBe(0);
  });

  it("penalizes single weak field via geometric mean", () => {
    // GM([0.99, 0.99, 0.1]) should be much lower than arithmetic mean
    const result = summarizeConfidence([0.99, 0.99, 0.1]);
    const arithMean = (0.99 + 0.99 + 0.1) / 3;
    expect(result.overall).toBeLessThan(arithMean);
    expect(result.min).toBeCloseTo(0.1, 5);
  });

  it("counts low-confidence fields with default threshold 0.7", () => {
    const result = summarizeConfidence([0.95, 0.85, 0.6, 0.4, 0.9]);
    // 0.6 and 0.4 are below 0.7
    expect(result.low_confidence_count).toBe(2);
  });

  it("respects custom low-confidence threshold", () => {
    const result = summarizeConfidence([0.95, 0.85, 0.6, 0.4, 0.9], 0.5);
    // Only 0.4 below 0.5
    expect(result.low_confidence_count).toBe(1);
  });

  it("counts missing/NaN confidence entries separately", () => {
    const result = summarizeConfidence([0.9, NaN, 0.8, NaN, 0.7]);
    expect(result.missing_confidence_count).toBe(2);
    // overall computed from the 3 valid entries
    expect(result.overall).toBeGreaterThan(0);
  });

  it("returns zero overall when all entries missing", () => {
    const result = summarizeConfidence([NaN, NaN, NaN]);
    expect(result.overall).toBe(0);
    expect(result.min).toBe(0);
    expect(result.missing_confidence_count).toBe(3);
  });

  it("clamps zero/negative confidence via log safety floor", () => {
    // Tests the Math.max(c, 1e-9) safety floor — no throw, finite result
    const result = summarizeConfidence([0.9, 0, 0.9]);
    expect(Number.isFinite(result.overall)).toBe(true);
    expect(result.min).toBe(0);
  });
});

describe("BlueprintOCRAdapter type contract", () => {
  it("allows a minimal conforming adapter implementation", () => {
    const stub: BlueprintOCRAdapter = {
      backend: "test-stub",
      version: "0.0.0",
      async extract(source: string): Promise<BlueprintOCRResult> {
        return {
          source,
          dimensions: [],
          pmi: [],
          confidence: { overall: 1, min: 1, low_confidence_count: 0, missing_confidence_count: 0 },
          backend: "test-stub",
          duration_ms: 0,
        };
      },
      async ping(): Promise<boolean> {
        return true;
      },
    };
    expect(stub.backend).toBe("test-stub");
    expect(typeof stub.extract).toBe("function");
    expect(typeof stub.ping).toBe("function");
  });

  it("dimension shape carries mandatory tolerance bounds + confidence", () => {
    const dim: ExtractedDimension = {
      id: "D1",
      nominal: 25.4,
      unit: "mm",
      tolerance: { min: 25.38, max: 25.42 },
      confidence: 0.92,
    };
    expect(dim.tolerance.min).toBeLessThan(dim.nominal);
    expect(dim.tolerance.max).toBeGreaterThan(dim.nominal);
    expect(dim.confidence).toBeGreaterThan(0);
  });

  it("GD&T callout structure supports MMC/LMC/RFS + datums", () => {
    const gdt: GDTCallout = {
      symbol: "TRUE_POSITION",
      value: 0.1,
      unit: "mm",
      material_condition: "MMC",
      datums: ["A", "B", "C"],
      confidence: 0.88,
    };
    expect(gdt.datums).toHaveLength(3);
    expect(gdt.material_condition).toBe("MMC");
  });

  it("PMI annotation supports free-form type + per-field confidence", () => {
    const pmi: PMIAnnotation = {
      type: "surface_finish",
      value: "Ra 1.6",
      confidence: 0.75,
    };
    expect(pmi.type).toBe("surface_finish");
    expect(pmi.confidence).toBeGreaterThan(0);
  });

  it("material extraction supports optional ISO group inference", () => {
    const matWithGroup: ExtractedMaterial = {
      material_name: "1045 steel",
      iso_group: "P",
      confidence: 0.95,
    };
    const matWithoutGroup: ExtractedMaterial = {
      material_name: "unknown alloy",
      confidence: 0.65,
    };
    expect(matWithGroup.iso_group).toBe("P");
    expect(matWithoutGroup.iso_group).toBeUndefined();
  });
});
