/**
 * Tests for CADSketchDimensionGateEngine (U-CADDRAW-SKETCH-DIM-GATE) -- the sketch-first gate.
 *
 * Coverage: happy (all captured) + partial (block 3D) + out-of-tol + empty + non-sketchable-deferred
 * + extra-advisory + invalid-blocks + non-mutation + idempotent re-eval + dispatcher round-trip.
 * The gate composes the feature-completeness ledger; the keystone case is a stepped bore whose
 * far-bore + chamfer, if not sketched, BLOCK the 3D build (pass=false) at the cheap early stage.
 */

import { describe, it, expect } from "vitest";
import { cadSketchDimensionGateEngine as gate } from "../engines/CADSketchDimensionGateEngine.js";
import {
  cadFeatureCompletenessLedgerEngine as ledgerEngine,
  type FeatureLedger,
  type ModelFeature,
} from "../engines/CADFeatureCompletenessLedgerEngine.js";
import type { DimensionExtractionResult, ExtractedDimension } from "../engines/PDFBlueprintDimensionExtractorEngine.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

const MM_PER_INCH = 25.4;

function dim(p: Partial<ExtractedDimension>): ExtractedDimension {
  return { type: "linear", nominal: 1, tolerance_plus: 0.001, tolerance_minus: 0.001, unit: "inch", raw_text: "", ...p };
}
function extraction(p: Partial<DimensionExtractionResult>): DimensionExtractionResult {
  return { dimensions: [], gdt_callouts: [], surface_finishes: [], threads: [], part_info: {}, ...p };
}
function steppedBoreLedger(): FeatureLedger {
  return ledgerEngine.build(
    extraction({
      dimensions: [
        dim({ type: "diameter", nominal: 0.75, raw_text: "near" }),
        dim({ type: "diameter", nominal: 0.5, raw_text: "far" }),
        dim({ type: "chamfer", nominal: 0.03, tolerance_plus: 0.005, tolerance_minus: 0.005, raw_text: "lead-in" }),
      ],
    }),
    "BUSH-1042",
  );
}
const D = (mm: number): ModelFeature => ({ featureType: "diameter", valueMm: mm });
const CH = (mm: number): ModelFeature => ({ featureType: "chamfer", valueMm: mm });

describe("CADSketchDimensionGateEngine.evaluate", () => {
  it("PASS when sketches capture every sketchable print dim within tolerance + advances them to 'sketched'", () => {
    const ledger = steppedBoreLedger();
    const r = gate.evaluate(ledger, [D(0.75 * MM_PER_INCH), D(0.5 * MM_PER_INCH), CH(0.03 * MM_PER_INCH)]);
    expect(r.pass).toBe(true);
    expect(r.capturedCount).toBe(3);
    expect(r.uncaptured).toHaveLength(0);
    expect(r.advancedLedger.entries.every((e) => e.status === "sketched")).toBe(true);
    // input ledger untouched (pure)
    expect(ledger.entries.every((e) => e.status === "extracted")).toBe(true);
  });

  it("KEYSTONE: BLOCKS 3D (pass=false) when the far bore + lead-in chamfer are not sketched", () => {
    const ledger = steppedBoreLedger();
    const r = gate.evaluate(ledger, [D(0.75 * MM_PER_INCH)]); // only the near bore drawn
    expect(r.pass).toBe(false);
    expect(r.capturedCount).toBe(1);
    expect(r.uncaptured).toHaveLength(2);
    expect(r.uncaptured.map((e) => e.featureType).sort()).toEqual(["chamfer", "diameter"]);
  });

  it("BLOCKS when a sketch dimension is out of the print tolerance band", () => {
    const ledger = ledgerEngine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
    const r = gate.evaluate(ledger, [D(12.7 + 0.2)]); // 0.5in=12.7mm, +0.2 out of +/-0.0254
    expect(r.pass).toBe(false);
    expect(r.outOfTol).toHaveLength(1);
    expect(r.uncaptured).toHaveLength(0);
  });

  it("an empty sketch set captures nothing and blocks", () => {
    const r = gate.evaluate(steppedBoreLedger(), []);
    expect(r.pass).toBe(false);
    expect(r.capturedCount).toBe(0);
    expect(r.uncaptured).toHaveLength(3);
  });

  it("DEFERS non-sketchable features (GD&T/thread) -- they never block the sketch gate", () => {
    const ledger = ledgerEngine.build(
      extraction({
        dimensions: [dim({ type: "diameter", nominal: 0.5 })],
        gdt_callouts: [{ symbol: "position", value: 0.1, datums: ["A"], raw_text: "pos .1 A" }],
        threads: [{ spec: "1/4-20", type: "imperial", major_diameter: 0.25 }],
      }),
      "P",
    );
    const r = gate.evaluate(ledger, [D(12.7)]); // only the diameter is sketchable
    expect(r.pass).toBe(true);
    expect(r.deferredNonSketchable.map((e) => e.featureType).sort()).toEqual(["gdt", "thread"]);
  });

  it("ADVISORY: an extra sketch dim not on the print is reported but does NOT block", () => {
    const ledger = ledgerEngine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
    const r = gate.evaluate(ledger, [D(12.7), { featureType: "radius", valueMm: 5 }]);
    expect(r.pass).toBe(true);
    expect(r.notOnPrint).toHaveLength(1);
    expect(r.notOnPrint[0].featureType).toBe("radius");
  });

  it("an invalid ledger entry (malformed extraction) blocks the gate", () => {
    const ledger = ledgerEngine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: NaN })] }), "P");
    const r = gate.evaluate(ledger, []);
    expect(r.pass).toBe(false);
    expect(r.invalid).toHaveLength(1);
  });

  it("is idempotent on re-evaluation (already-sketched entries are not re-advanced/throwing)", () => {
    const ledger = steppedBoreLedger();
    const first = gate.evaluate(ledger, [D(0.75 * MM_PER_INCH), D(0.5 * MM_PER_INCH), CH(0.03 * MM_PER_INCH)]);
    // feed the advanced ledger back in -- entries already 'sketched'
    const second = gate.evaluate(first.advancedLedger, [D(0.75 * MM_PER_INCH), D(0.5 * MM_PER_INCH), CH(0.03 * MM_PER_INCH)]);
    expect(second.pass).toBe(true);
    expect(second.capturedCount).toBe(3);
    expect(second.advancedLedger.entries.every((e) => e.status === "sketched")).toBe(true);
  });

  it("throws on a non-ledger input (fail loud)", () => {
    // @ts-expect-error -- deliberately bad
    expect(() => gate.evaluate(null, [])).toThrow(/ledger/i);
  });
});

describe("cadDispatcher round-trip (cad_sketch_dim_gate)", () => {
  function callCad(action: string, params: Record<string, unknown>) {
    let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>) | undefined;
    const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerCadDispatcher(server as any);
    if (!handler) throw new Error("prism_cad handler was not registered");
    return handler({ action, params }).then((res) => JSON.parse(res.content[0].text));
  }

  it("round-trips build -> sketch gate through prism_cad (blocks on the uncaptured far bore)", async () => {
    const built = await callCad("cad_feature_ledger_build", { extraction: steppedBoreLedgerExtraction(), partNumber: "BUSH-1042" });
    const r = await callCad("cad_sketch_dim_gate", { ledger: built.ledger, sketchDimensions: [D(0.75 * MM_PER_INCH)] });
    expect(r.capturedCount).toBe(1);
    expect(r.uncaptured).toHaveLength(2);
    expect(r.pass).not.toBe(true);
  });
});

function steppedBoreLedgerExtraction(): DimensionExtractionResult {
  return extraction({
    dimensions: [
      dim({ type: "diameter", nominal: 0.75, raw_text: "near" }),
      dim({ type: "diameter", nominal: 0.5, raw_text: "far" }),
      dim({ type: "chamfer", nominal: 0.03, tolerance_plus: 0.005, tolerance_minus: 0.005, raw_text: "lead-in" }),
    ],
  });
}
