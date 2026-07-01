/**
 * Tests for CADFeatureCompletenessLedgerEngine (U-CADDRAW-FEATURE-LEDGER).
 *
 * Coverage: happy + complete-pass + >=3 failure modes (empty, NaN, Infinity/negative tol) +
 * >=2 adversarial (phantom/extra geometry, raw-inch-not-converted) + spanning configs
 * (inch vs mm, diameter/chamfer/thread/gdt). The keystone test reproduces the 2026-06-16
 * yesterday-miss: a stepped bore must enumerate to 3 entries, and a model that drew only the
 * near-side bore must reconcile to 2 MISSING -- the failure the ledger exists to prevent.
 */

import { describe, it, expect } from "vitest";
import {
  cadFeatureCompletenessLedgerEngine as engine,
  CAD_FEATURE_LEDGER_SCHEMA_VERSION,
  type FeatureLedger,
  type ModelFeature,
} from "../engines/CADFeatureCompletenessLedgerEngine.js";
import type { DimensionExtractionResult, ExtractedDimension } from "../engines/PDFBlueprintDimensionExtractorEngine.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

const MM_PER_INCH = 25.4;

function dim(partial: Partial<ExtractedDimension>): ExtractedDimension {
  return {
    type: "linear",
    nominal: 1,
    tolerance_plus: 0.001,
    tolerance_minus: 0.001,
    unit: "inch",
    raw_text: "",
    ...partial,
  };
}

function extraction(partial: Partial<DimensionExtractionResult>): DimensionExtractionResult {
  return {
    dimensions: [],
    gdt_callouts: [],
    surface_finishes: [],
    threads: [],
    part_info: {},
    ...partial,
  };
}

// The 2026-06-16 stepped-bore / bushing print: near-side bore + far-side smaller bore + lead-in chamfer.
function steppedBoreExtraction(): DimensionExtractionResult {
  return extraction({
    dimensions: [
      dim({ type: "diameter", nominal: 0.75, raw_text: "DIA .750 near bore" }),
      dim({ type: "diameter", nominal: 0.5, raw_text: "DIA .500 far bore" }),
      dim({ type: "chamfer", nominal: 0.03, tolerance_plus: 0.005, tolerance_minus: 0.005, raw_text: ".030x45 lead-in" }),
    ],
    part_info: { part_number: "BUSH-1042" },
  });
}

describe("CADFeatureCompletenessLedgerEngine.build", () => {
  it("enumerates a stepped bore as 3 distinct entries (NEVER collapsed) with unique ids", () => {
    const ledger = engine.build(steppedBoreExtraction(), "BUSH-1042");
    expect(ledger.schemaVersion).toBe(CAD_FEATURE_LEDGER_SCHEMA_VERSION);
    expect(ledger.partNumber).toBe("BUSH-1042");
    expect(ledger.entries).toHaveLength(3);
    const ids = ledger.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(3); // uniqueness
    expect(ids).toContain("diameter-1");
    expect(ids).toContain("diameter-2"); // the two diameters stay separate
    expect(ids).toContain("chamfer-1");
    expect(ledger.invalidCount).toBe(0);
    expect(ledger.builtFrom).toEqual({ dimensions: 3, gdt: 0, threads: 0 });
  });

  it("converts inch to canonical mm (x25.4) -- a units mismatch is a 25.4x scale error", () => {
    const ledger = engine.build(steppedBoreExtraction(), "BUSH-1042");
    const near = ledger.entries.find((e) => e.rawText.includes("near"))!;
    expect(near.nominalMm).toBeCloseTo(0.75 * MM_PER_INCH, 9); // 19.05
    expect(near.tolPlusMm).toBeCloseTo(0.001 * MM_PER_INCH, 9); // 0.0254
    expect(near.sourceUnit).toBe("inch");
  });

  it("keeps an mm source in mm (no conversion)", () => {
    const ledger = engine.build(
      extraction({ dimensions: [dim({ type: "diameter", nominal: 19.05, unit: "mm" })] }),
      "P-MM",
    );
    expect(ledger.entries[0].nominalMm).toBeCloseTo(19.05, 9);
  });

  it("enumerates threads and GD&T callouts as ledger entries (spanning config)", () => {
    const ledger = engine.build(
      extraction({
        dimensions: [dim({ type: "diameter", nominal: 1.0 })],
        threads: [{ spec: "1/4-20 UNC", type: "imperial", major_diameter: 0.25 }],
        gdt_callouts: [{ symbol: "position", value: 0.1, datums: ["A", "B"], raw_text: "pos .1 A B" }],
      }),
      "P-MIX",
    );
    expect(ledger.entries).toHaveLength(3);
    const thread = ledger.entries.find((e) => e.featureType === "thread")!;
    expect(thread.nominalMm).toBeCloseTo(0.25 * MM_PER_INCH, 9);
    const gdt = ledger.entries.find((e) => e.featureType === "gdt")!;
    expect(gdt.datumRef).toEqual(["A", "B"]);
  });

  it("FAILURE: flags a NaN nominal as invalid (LOUD) -- never silently dropped", () => {
    const ledger = engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: NaN })] }), "P");
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].invalid).toMatch(/nominal/);
    expect(ledger.invalidCount).toBe(1);
  });

  it("ADVERSARIAL: flags Infinity tolerance and negative tolerance as invalid", () => {
    const inf = engine.build(extraction({ dimensions: [dim({ tolerance_plus: Infinity })] }), "P");
    expect(inf.entries[0].invalid).toMatch(/tolerance/);

    const neg = engine.build(extraction({ dimensions: [dim({ tolerance_minus: -0.5 })] }), "P");
    expect(neg.entries[0].invalid).toMatch(/negative/);
  });

  it("FAILURE: empty extraction yields an empty ledger (valid, not an error)", () => {
    const ledger = engine.build(extraction({}), "EMPTY");
    expect(ledger.entries).toHaveLength(0);
    expect(ledger.invalidCount).toBe(0);
  });

  it("FAILURE: empty partNumber is rejected by Zod (ledger is part-keyed)", () => {
    expect(() => engine.build(extraction({}), "")).toThrow(/partNumber/);
  });
});

describe("CADFeatureCompletenessLedgerEngine.reconcile", () => {
  it("KEYSTONE: a model that drew only the near-side bore reconciles to 2 MISSING (the yesterday-miss)", () => {
    const ledger = engine.build(steppedBoreExtraction(), "BUSH-1042");
    const modelDrewOnlyNearBore: ModelFeature[] = [{ featureType: "diameter", valueMm: 0.75 * MM_PER_INCH }];
    const report = engine.reconcile(ledger, modelDrewOnlyNearBore);

    expect(report.complete).toBe(false);
    expect(report.matched).toBe(1);
    expect(report.missing).toHaveLength(2);
    const missingTypes = report.missing.map((m) => m.featureType).sort();
    expect(missingTypes).toEqual(["chamfer", "diameter"]); // far bore + lead-in chamfer
  });

  it("complete=true when the model has every feature within tolerance", () => {
    const ledger = engine.build(steppedBoreExtraction(), "BUSH-1042");
    const fullModel: ModelFeature[] = [
      { featureType: "diameter", valueMm: 0.75 * MM_PER_INCH },
      { featureType: "diameter", valueMm: 0.5 * MM_PER_INCH },
      { featureType: "chamfer", valueMm: 0.03 * MM_PER_INCH },
    ];
    const report = engine.reconcile(ledger, fullModel);
    expect(report.complete).toBe(true);
    expect(report.matched).toBe(3);
    expect(report.missing).toHaveLength(0);
    expect(report.mismatched).toHaveLength(0);
    expect(report.extra).toHaveLength(0);
  });

  it("ADVERSARIAL: a raw-inch model value (not converted to mm) does NOT spuriously match", () => {
    const ledger = engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
    // model author forgot to convert: passes 0.5 instead of 12.7 mm
    const report = engine.reconcile(ledger, [{ featureType: "diameter", valueMm: 0.5 }]);
    expect(report.matched).toBe(0);
    expect(report.mismatched).toHaveLength(1); // same type, value wildly out of band
    expect(report.mismatched[0].deltaMm).toBeCloseTo(0.5 - 12.7, 6);
  });

  it("reports a value out of tolerance as MISMATCHED (not missing) with signed delta", () => {
    const ledger = engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
    const report = engine.reconcile(ledger, [{ featureType: "diameter", valueMm: 12.7 + 0.2 }]);
    expect(report.missing).toHaveLength(0);
    expect(report.mismatched).toHaveLength(1);
    expect(report.mismatched[0].deltaMm).toBeCloseTo(0.2, 6);
  });

  it("ADVERSARIAL: phantom/hallucinated geometry in the model is reported as EXTRA", () => {
    const ledger = engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
    const report = engine.reconcile(ledger, [
      { featureType: "diameter", valueMm: 12.7 },
      { featureType: "radius", valueMm: 5.0 }, // not on the print
    ]);
    expect(report.matched).toBe(1);
    expect(report.extra).toHaveLength(1);
    expect(report.extra[0].featureType).toBe("radius");
  });

  it("FAILURE: an invalid ledger entry forces complete=false and is surfaced (never silently passed)", () => {
    const ledger = engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: NaN })] }), "P");
    const report = engine.reconcile(ledger, []);
    expect(report.invalidEntries).toHaveLength(1);
    expect(report.complete).toBe(false);
  });

  it("reconcile against an empty model marks every valid entry missing", () => {
    const ledger = engine.build(steppedBoreExtraction(), "BUSH-1042");
    const report = engine.reconcile(ledger, []);
    expect(report.missing).toHaveLength(3);
    expect(report.complete).toBe(false);
  });
});

describe("CADFeatureCompletenessLedgerEngine.advance", () => {
  function freshLedger(): FeatureLedger {
    return engine.build(extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }), "P");
  }

  it("advances a feature forward and does not mutate the input ledger", () => {
    const ledger = freshLedger();
    const next = engine.advance(ledger, "diameter-1", "modeled");
    expect(next.entries[0].status).toBe("modeled");
    expect(ledger.entries[0].status).toBe("extracted"); // input untouched (pure)
  });

  it("FAILURE: a backward transition throws (a never-drawn feature must not look validated)", () => {
    const ledger = engine.advance(freshLedger(), "diameter-1", "modeled");
    expect(() => engine.advance(ledger, "diameter-1", "extracted")).toThrow(/backward/);
  });

  it("FAILURE: advancing an unknown feature id throws", () => {
    expect(() => engine.advance(freshLedger(), "nope-9", "modeled")).toThrow(/unknown feature id/);
  });

  it("ADVERSARIAL: an unknown status string throws", () => {
    // @ts-expect-error -- deliberately bad status
    expect(() => engine.advance(freshLedger(), "diameter-1", "shipped")).toThrow(/unknown status/);
  });
});

describe("cadDispatcher round-trip (prism_cad wiring)", () => {
  // Capture the handler registered by registerCadDispatcher via a minimal mock server.
  function cadHandler() {
    let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>) | undefined;
    const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerCadDispatcher(server as any);
    if (!handler) throw new Error("prism_cad handler was not registered");
    return handler;
  }
  async function callCad(action: string, params: Record<string, unknown>) {
    const res = await cadHandler()({ action, params });
    return JSON.parse(res.content[0].text);
  }

  it("round-trips build -> reconcile through prism_cad (keystone, end-to-end)", async () => {
    const built = await callCad("cad_feature_ledger_build", {
      extraction: steppedBoreExtraction(),
      partNumber: "BUSH-1042",
    });
    expect(built.success).toBe(true);
    expect(built.ledger.entries).toHaveLength(3);

    const rec = await callCad("cad_feature_ledger_reconcile", {
      ledger: built.ledger,
      modelFeatures: [{ featureType: "diameter", valueMm: 0.75 * MM_PER_INCH }],
    });
    expect(rec.matched).toBe(1);
    expect(rec.missing).toHaveLength(2); // far bore + lead-in chamfer -- the yesterday-miss, caught at the gate
  });

  it("dispatcher guards a missing required param (no partNumber)", async () => {
    const res = await callCad("cad_feature_ledger_build", { extraction: steppedBoreExtraction() });
    expect(res.error).toMatch(/partNumber/);
  });

  it("round-trips a forward status advance through prism_cad", async () => {
    const built = await callCad("cad_feature_ledger_build", {
      extraction: extraction({ dimensions: [dim({ type: "diameter", nominal: 0.5 })] }),
      partNumber: "P",
    });
    const advanced = await callCad("cad_feature_ledger_status", {
      ledger: built.ledger,
      featureId: "diameter-1",
      toStatus: "modeled",
    });
    expect(advanced.success).toBe(true);
    expect(advanced.ledger.entries[0].status).toBe("modeled");
  });
});
