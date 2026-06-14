/**
 * TesseractOCRBridge + FreightCost — combined tests for iter7
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-TESS-OCR + U-QP-FREIGHT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TesseractOCRBridgeEngine, setDefaultOCRAdapter, type OCRAdapter } from "../engines/TesseractOCRBridgeEngine.js";
import { freightCostEngine } from "../engines/FreightCostEngine.js";

describe("TesseractOCRBridgeEngine — U-QP-TESS-OCR", () => {
  let engine: TesseractOCRBridgeEngine;
  const mockAdapter: OCRAdapter = {
    name: "mock-tesseract",
    async performOCR(image, opts) {
      return {
        text: `TOLERANCE ±0.005 SURFACE 32 Ra\nMATERIAL 6061-T6`,
        confidence: 0.92,
        words: [
          { text: "TOLERANCE", confidence: 0.95 },
          { text: "±0.005", confidence: 0.88 },
          { text: "SURFACE", confidence: 0.91 },
          { text: "32", confidence: 0.94 },
          { text: "Ra", confidence: 0.72 },
        ],
        provider: "mock-tesseract",
      };
    },
  };

  beforeEach(() => {
    engine = new TesseractOCRBridgeEngine();
    setDefaultOCRAdapter(null);
  });

  it("REJECTS when no adapter installed", async () => {
    const r = await engine.ocr({ image: new Uint8Array(100_000) });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no-ocr-adapter/);
  });

  it("happy path with mock adapter returns normalized result", async () => {
    setDefaultOCRAdapter(mockAdapter);
    const e = new TesseractOCRBridgeEngine();
    const r = await e.ocr({ image: new Uint8Array(100_000), autoClassify: false });
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/TOLERANCE/);
    expect(r.confidence).toBe(0.92);
    expect(r.word_count).toBe(5);
    expect(r.high_confidence_word_ratio).toBe(1); // all 5 ≥0.7 (0.95/0.88/0.91/0.94/0.72)
    expect(r.provider).toBe("mock-tesseract");
  });

  it("REJECTS image too small", async () => {
    const r = await engine.ocr({ image: new Uint8Array(100), adapter: mockAdapter });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/too small/);
  });

  it("REJECTS image too large", async () => {
    const r = await engine.ocr({ image: new Uint8Array(11 * 1024 * 1024), adapter: mockAdapter });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/too large/);
  });

  it("warns on small-but-valid image (quality hint)", async () => {
    const r = await engine.ocr({ image: new Uint8Array(5_000), adapter: mockAdapter, autoClassify: false });
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes("small"))).toBe(true);
  });

  it("adapter throw → ok:false + reason (never silent)", async () => {
    const throwingAdapter: OCRAdapter = {
      name: "throwing",
      async performOCR() { throw new Error("OCR API timeout"); },
    };
    const r = await engine.ocr({ image: new Uint8Array(100_000), adapter: throwingAdapter });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/ocr-adapter-threw: OCR API timeout/);
  });

  it("low confidence triggers operator-review warning", async () => {
    const lowConfAdapter: OCRAdapter = {
      name: "low-conf",
      async performOCR() {
        return { text: "blurry", confidence: 0.3, words: [{ text: "blurry", confidence: 0.3 }] };
      },
    };
    const r = await engine.ocr({ image: new Uint8Array(100_000), adapter: lowConfAdapter, autoClassify: false });
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes("operator should review"))).toBe(true);
  });

  it("setDefaultOCRAdapter + isReady reflect state", async () => {
    expect(engine.isReady()).toBe(false);
    setDefaultOCRAdapter(mockAdapter);
    const e2 = new TesseractOCRBridgeEngine();
    expect(e2.isReady()).toBe(true);
    expect(e2.getAdapterName()).toBe("mock-tesseract");
  });
});

describe("FreightCostEngine — U-QP-FREIGHT", () => {
  it("quotes ground service for small parcel by default", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 5 });
    expect(r.ok).toBe(true);
    expect(r.service_tier).toBe("ground");
    // 8 + (5 * 0.85) = 8 + 4.25 = 12.25 base; fuel 12.25*0.18 = 2.21
    expect(r.base_cost_usd).toBe(12.25);
    expect(r.fuel_surcharge_usd).toBe(2.21);
    expect(r.total_cost_usd).toBe(14.46);
    expect(r.estimated_transit_days).toBe(5);
  });

  it("recommends LTL at 150-4999 lb", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 200 });
    expect(r.service_tier).toBe("ltl");
  });

  it("recommends FTL at >=5000 lb", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 6000 });
    expect(r.service_tier).toBe("ftl");
  });

  it("switches off LTL when below 150lb floor (unless forced)", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 10, service_tier: "ltl" });
    // Not forced (input.service_tier is set but the switch checks for absence) — actually input.service_tier="ltl" IS forced
    expect(r.service_tier).toBe("ltl");
  });

  it("dim-weight beats actual when bulky", async () => {
    // 50lb actual but 30000 in³ → dim-weight 215.8lb → billable
    const r = await freightCostEngine.quote({ weight_lbs: 50, cubic_inches: 30000 });
    expect(r.warnings.some(w => w.includes("dim-weight"))).toBe(true);
    // ground at 215.8lb: 8 + 215.8*0.85 = 191.43
    expect(r.base_cost_usd).toBeGreaterThan(150);
  });

  it("insurance rider when declared value > $500", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 5, declared_value_usd: 1500 });
    // (1500 - 500) / 100 * 0.65 = 6.5
    expect(r.insurance_rider_usd).toBe(6.5);
  });

  it("no insurance rider at or below $500 floor", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 5, declared_value_usd: 400 });
    expect(r.insurance_rider_usd).toBe(0);
  });

  it("REJECTS zero/negative weight", async () => {
    const r = await freightCostEngine.quote({ weight_lbs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/positive/);
  });

  it("adapter live-api success uses live rate", async () => {
    const adapter = {
      name: "fake-api",
      async quote() {
        return {
          ok: true, service_tier: "ground" as const, base_cost_usd: 99,
          fuel_surcharge_usd: 9, insurance_rider_usd: 0, residential_surcharge_usd: 0,
          total_cost_usd: 108, estimated_transit_days: 3,
          rate_source: "live-api" as const, warnings: [],
        };
      },
    };
    const r = await freightCostEngine.quote({ weight_lbs: 5, adapter });
    expect(r.rate_source).toBe("live-api");
    expect(r.total_cost_usd).toBe(108);
  });

  it("adapter throw → static fallback + warning", async () => {
    const adapter = {
      name: "throwing-api",
      async quote() { throw new Error("API offline"); },
    };
    const r = await freightCostEngine.quote({ weight_lbs: 5, adapter });
    expect(r.rate_source).toBe("static-table-fallback");
    expect(r.warnings.some(w => w.includes("API offline"))).toBe(true);
  });
});
