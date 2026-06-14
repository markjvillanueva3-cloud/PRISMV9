/**
 * CADLiveBlueprintOcrAdapter.test.ts — CAD-DRAW-MAX-MS1/U-PRINT-OCR-LIVE
 */

import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CADLiveBlueprintOcrAdapter,
  cadLiveBlueprintOcrAdapter,
  classifyPrintPath,
  mapDimension,
  mapAnalysisToPrintOcr,
  makeLiveOcrPrintFn,
} from "../engines/CADLiveBlueprintOcrAdapter.js";
import type { BlueprintVisionResult } from "../engines/BlueprintVisionOCREngine.js";

function makeAnalysis(overrides: Partial<BlueprintVisionResult> = {}): BlueprintVisionResult {
  return {
    dimensions: overrides.dimensions ?? [],
    notes: overrides.notes ?? [],
    profiles: overrides.profiles ?? [],
    gdt_callouts: overrides.gdt_callouts ?? [],
    material_spec: overrides.material_spec,
    surface_finish: overrides.surface_finish,
    title_block: overrides.title_block,
    overall_confidence: overrides.overall_confidence ?? 0.85,
    tokens_used: overrides.tokens_used ?? 0,
    processing_time_ms: overrides.processing_time_ms ?? 0,
    raw_response: overrides.raw_response ?? "",
  } as BlueprintVisionResult;
}

describe("classifyPrintPath", () => {
  it("accepts .png", () => expect(classifyPrintPath("/x/y.png")).toEqual({ ok: true }));
  it("accepts .jpg + .jpeg + .webp + .gif", () => {
    expect(classifyPrintPath("/x.jpg").ok).toBe(true);
    expect(classifyPrintPath("/x.jpeg").ok).toBe(true);
    expect(classifyPrintPath("/x.webp").ok).toBe(true);
    expect(classifyPrintPath("/x.gif").ok).toBe(true);
  });

  it("rejects empty string with reason", () => {
    const r = classifyPrintPath("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/non-empty/);
  });

  it(".pdf points to U-PRINT-OCR-PDF follow-up unit", () => {
    const r = classifyPrintPath("/jm/print.pdf");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/U-PRINT-OCR-PDF/);
  });

  it(".tif rejected with conversion guidance", () => {
    const r = classifyPrintPath("/jm/scan.tif");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/conversion/);
  });

  it("unsupported extension rejected with allowlist", () => {
    const r = classifyPrintPath("/x.docx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unsupported/);
  });
});

describe("mapDimension", () => {
  it("maps a basic dim with nominal value", () => {
    const out = mapDimension({ id: "D1", label: "OD", nominal: 0.5, units: "in" } as never, 0);
    expect(out).toEqual({ id: "D1", label: "OD", value: 0.5, unit: "in" });
  });

  it("generates ID when missing (DIM-NNN padded)", () => {
    const out = mapDimension({ label: "OD", nominal: 0.5 } as never, 4);
    expect(out!.id).toBe("DIM-005");
  });

  it("rejects non-finite nominal", () => {
    expect(mapDimension({ id: "D1", label: "OD", nominal: NaN } as never, 0)).toBeNull();
    expect(mapDimension({ id: "D1", label: "OD", nominal: "not a number" } as never, 0)).toBeNull();
  });

  it("preserves asymmetric tolerance", () => {
    const out = mapDimension({
      id: "D1", label: "OD", nominal: 0.5, units: "in",
      tolerance: { lower: -0.001, upper: 0.002 },
    } as never, 0);
    expect(out!.tolerance).toEqual({ lower: -0.001, upper: 0.002 });
  });

  it("falls back to type when label missing", () => {
    const out = mapDimension({ nominal: 0.5, type: "diameter" } as never, 0);
    expect(out!.label).toBe("diameter");
  });

  it("defaults unit to 'in' when missing", () => {
    const out = mapDimension({ id: "D1", label: "OD", nominal: 0.5 } as never, 0);
    expect(out!.unit).toBe("in");
  });

  it("rejects null + non-object input", () => {
    expect(mapDimension(null as never, 0)).toBeNull();
    expect(mapDimension("not an obj" as never, 0)).toBeNull();
  });
});

describe("mapAnalysisToPrintOcr", () => {
  it("empty analysis → empty arrays + confidence preserved", () => {
    const out = mapAnalysisToPrintOcr("/p.png", makeAnalysis({ overall_confidence: 0.92 }));
    expect(out.dimensions).toEqual([]);
    expect(out.features).toEqual([]);
    expect(out.ocrConfidence).toBe(0.92);
    expect(out.printPath).toBe("/p.png");
  });

  it("maps dimensions through mapDimension", () => {
    const analysis = makeAnalysis({
      dimensions: [
        { id: "D1", label: "OD", nominal: 0.5, units: "in" } as never,
        { id: "D2", label: "len", nominal: 1.25, units: "in" } as never,
      ],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.dimensions).toHaveLength(2);
    expect(out.dimensions[0].value).toBe(0.5);
  });

  it("filters non-numeric dims silently", () => {
    const analysis = makeAnalysis({
      dimensions: [
        { id: "D1", label: "OD", nominal: 0.5 } as never,
        { id: "D2", label: "bad", nominal: NaN } as never,
        { id: "D3", label: "len", nominal: 1.0 } as never,
      ],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.dimensions).toHaveLength(2);
    expect(out.dimensions.map(d => d.id)).toEqual(["D1", "D3"]);
  });

  it("extracts profile features", () => {
    const analysis = makeAnalysis({
      profiles: [
        { id: "PR1", name: "outer", type: "external", points: [], is_closed: true, confidence: 0.9 },
      ] as never,
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.features).toHaveLength(1);
    expect(out.features[0].kind).toBe("external");
    expect(out.features[0].detail).toBe("outer");
  });

  it("extracts GD&T callouts as gdt:* features", () => {
    const analysis = makeAnalysis({
      gdt_callouts: [{ symbol: "position", tolerance_value: 0.005 } as never],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.features[0].kind).toBe("gdt:position");
    expect(out.features[0].detail).toBe("0.005");
  });
});

describe("CADLiveBlueprintOcrAdapter.ocrPrint", () => {
  it("rejects unsupported extension before file existence check", async () => {
    const eng = new CADLiveBlueprintOcrAdapter();
    await expect(eng.ocrPrint("/jm/print.pdf")).rejects.toThrow(/U-PRINT-OCR-PDF/);
  });

  it("rejects missing file with file-not-found error", async () => {
    const eng = new CADLiveBlueprintOcrAdapter();
    await expect(eng.ocrPrint("/nonexistent/file.png")).rejects.toThrow(/file not found/);
  });

  it("happy path with injected analyzer (no live Claude Vision call)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cad-live-ocr-test-"));
    const tmpFile = join(dir, "fake.png");
    writeFileSync(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // fake PNG header
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const analyzer = {
        analyzeBlueprint: async () => makeAnalysis({
          dimensions: [{ id: "D1", label: "OD", nominal: 0.500, units: "in" } as never],
          overall_confidence: 0.91,
        }),
      };
      const out = await eng.ocrPrint(tmpFile, { analyzer });
      expect(out.printPath).toBe(tmpFile);
      expect(out.dimensions).toHaveLength(1);
      expect(out.dimensions[0].value).toBe(0.5);
      expect(out.ocrConfidence).toBe(0.91);
    } finally {
      try { unlinkSync(tmpFile); } catch { /* best-effort */ }
    }
  });

  it("propagates analyzer errors", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cad-live-ocr-test-err-"));
    const tmpFile = join(dir, "fake.png");
    writeFileSync(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const analyzer = { analyzeBlueprint: async () => { throw new Error("vision-api-down"); } };
      await expect(eng.ocrPrint(tmpFile, { analyzer })).rejects.toThrow(/vision-api-down/);
    } finally {
      try { unlinkSync(tmpFile); } catch { /* best-effort */ }
    }
  });
});

describe("singleton + curry helper", () => {
  it("singleton is the engine class", () => {
    expect(cadLiveBlueprintOcrAdapter).toBeInstanceOf(CADLiveBlueprintOcrAdapter);
  });

  it("makeLiveOcrPrintFn returns a usable curried fn", () => {
    const fn = makeLiveOcrPrintFn({ blueprintType: "milling" });
    expect(typeof fn).toBe("function");
  });
});
