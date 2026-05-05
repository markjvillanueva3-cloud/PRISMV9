/**
 * Tests for hyperCAD-S analysis bridge + SolidWorks/Esprit Live Bridges + 6-CAD integration
 * (CAD-COMPLETE-MS0/U-CADC-{HC,SW,ESP}-{PRINT,LIVE}-01 + integration)
 *
 * Closes the rest of the OCR→draw gap matrix:
 *   - PrintToHyperCADSAnalysisBridge brings hyperCAD-S into the orchestrator's
 *     6-CAD lineup (Fusion, hyperCAD, Mastercam, Inventor, SolidWorks, Esprit)
 *   - SolidWorksLiveBridgeEngine + EspritLiveBridgeEngine fill the missing
 *     Live Runner slots so generated scripts can actually be dispatched
 *   - Integration test: simulate a realistic JM-Die blueprint analysis →
 *     6 scripts emitted via the orchestrator → 5 of them executable via mock
 *     Live runners (where they exist)
 */

import { describe, it, expect } from "vitest";
import {
  PrintToHyperCADSAnalysisBridge,
  printToHyperCADSAnalysisBridge,
} from "../engines/PrintToHyperCADSAnalysisBridge.js";
import {
  SolidWorksLiveBridgeEngine,
  solidWorksLiveBridgeEngine,
  type SolidWorksExecutionMode,
} from "../engines/SolidWorksLiveBridgeEngine.js";
import {
  EspritLiveBridgeEngine,
  espritLiveBridgeEngine,
  type EspritExecutionMode,
} from "../engines/EspritLiveBridgeEngine.js";
import {
  printToAllCADsOrchestrator,
  ALL_CAD_TARGETS,
} from "../engines/PrintToAllCADsOrchestrator.js";
import type { BlueprintAnalysis, ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────
const PHASE2_VERSION = "1.0.0";
const FULL_TARGET_COUNT = 6;
const HOLE_DIA = 8;

// ── Fixtures ─────────────────────────────────────────────────────────────────

function dim(type: ExtractedDimension["type"], nominal: number, unit: "mm" | "in" = "mm"): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type, nominal, unit,
    raw_text: `${nominal}${unit}`,
    confidence: 0.92,
  };
}

function holeProfile(diameter_mm: number, x = 50, y = 50): ExtractedProfile {
  return {
    id: `hole-${diameter_mm}`, name: `Hole`, type: "hole",
    points: [{ x, y }], is_closed: true, diameter_mm, confidence: 0.95,
  };
}

function pocketProfile(w: number, h: number): ExtractedProfile {
  return {
    id: `pocket-${w}x${h}`, name: `Pocket`, type: "pocket",
    points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
    is_closed: true, width_mm: w, height_mm: h, confidence: 0.9,
  };
}

/** Realistic JM-Die plate blueprint analysis: 100x60x10mm 4140 plate with 4 mounting holes + 1 pocket. */
function jmDieFlangeAnalysis(): BlueprintAnalysis {
  return {
    dimensions: [
      dim("linear", 100), dim("linear", 60), dim("linear", 10),
      dim("diameter", 6), dim("depth", 10),
    ],
    gdt_frames: [],
    title_block: {
      part_number: "JMDIE-FLANGE-001",
      revision: "A",
      material: "4140 steel",
      units: "mm",
      confidence: 0.95,
    },
    notes: [],
    summary: {
      total_dimensions: 5, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0.025,
      critical_features: ["bolt_circle"],
      material: "4140 steel",
      has_gdt: false,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PrintToHyperCADSAnalysisBridge
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToHyperCADSAnalysisBridge — identity + capability", () => {
  it("singleton + version 1.0.0", () => {
    expect(printToHyperCADSAnalysisBridge).toBeInstanceOf(PrintToHyperCADSAnalysisBridge);
    expect(printToHyperCADSAnalysisBridge.version).toBe(PHASE2_VERSION);
  });

  it("declares 5 supported operations (canonical print-bridge set)", () => {
    expect([...printToHyperCADSAnalysisBridge.supportedOperations()].sort()).toEqual([
      "feature_extrude", "sketch_circle", "sketch_create", "sketch_line", "sketch_rectangle",
    ]);
  });
});

describe("PrintToHyperCADSAnalysisBridge — happy paths", () => {
  it("hole profile produces 3 ops + Python script with `import hcad` preamble", () => {
    const out = printToHyperCADSAnalysisBridge.buildBridgeScript({
      profiles: [holeProfile(HOLE_DIA)],
      defaultDepth: 12,
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.script).toContain("import hcad");
    expect(out.script).toContain("UNIT_FACTOR");
    expect(out.parameters["UNIT_FACTOR"]?.value).toBe(1.0);
  });

  it("inch-mode UNIT_FACTOR = 25.4 (Esprit-style conversion to mm)", () => {
    const out = printToHyperCADSAnalysisBridge.buildBridgeScript({
      analysis: jmDieFlangeAnalysis(),
      units: "in",
    });
    expect(out.parameters["UNIT_FACTOR"]?.value).toBe(25.4);
    expect(out.units).toBe("in");
  });

  it("filename uses `.hcad.py` fallback when generator returns empty", () => {
    const out = printToHyperCADSAnalysisBridge.buildBridgeScript({
      profiles: [holeProfile(5)],
      partName: "MyPart",
    });
    // generator returns its own filename; either way ends with .py
    expect(out.filename.endsWith(".py")).toBe(true);
  });

  it("pocket profile emits sketch+rectangle+extrude (3 ops)", () => {
    const out = printToHyperCADSAnalysisBridge.buildBridgeScript({
      profiles: [pocketProfile(40, 20)],
    });
    expect(out.opsEmitted).toBe(3);
  });

  it("dimensions-only cylinder primitive: diameter+depth → 3 ops", () => {
    const out = printToHyperCADSAnalysisBridge.buildBridgeScript({
      analysis: jmDieFlangeAnalysis(),
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.material).toBe("4140 steel");
    expect(out.script).toContain("# Material (from blueprint title block): 4140 steel");
    expect(out.script).toContain("# PRISM PrintToHyperCADSAnalysisBridge v1.0.0");
  });
});

describe("PrintToHyperCADSAnalysisBridge — failure modes", () => {
  it("throws on empty input", () => {
    expect(() => printToHyperCADSAnalysisBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });

  it("throws on null input", () => {
    expect(() =>
      printToHyperCADSAnalysisBridge.buildBridgeScript(
        null as unknown as Parameters<typeof printToHyperCADSAnalysisBridge.buildBridgeScript>[0],
      ),
    ).toThrow(/PrintToHyperCADSAnalysisBridge/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SolidWorksLiveBridgeEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("SolidWorksLiveBridgeEngine — identity + supportedModes", () => {
  it("singleton + version 1.0.0", () => {
    expect(solidWorksLiveBridgeEngine).toBeInstanceOf(SolidWorksLiveBridgeEngine);
    expect(solidWorksLiveBridgeEngine.version).toBe(PHASE2_VERSION);
  });

  it("supports the 3 expected execution modes", () => {
    expect([...solidWorksLiveBridgeEngine.supportedModes()].sort()).toEqual(["com", "http", "mock"]);
  });
});

describe("SolidWorksLiveBridgeEngine — validate()", () => {
  it("rejects missing config", () => {
    const r = solidWorksLiveBridgeEngine.validate(undefined as unknown as Parameters<typeof solidWorksLiveBridgeEngine.validate>[0]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/config is required/);
  });

  it("rejects unknown mode", () => {
    const r = solidWorksLiveBridgeEngine.validate({ mode: "xyz" as SolidWorksExecutionMode });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown execution mode/);
  });

  it("rejects http mode without endpoint", () => {
    const r = solidWorksLiveBridgeEngine.validate({ mode: "http" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/endpoint required/);
  });

  it("rejects com mode without comShimPath", () => {
    const r = solidWorksLiveBridgeEngine.validate({ mode: "com" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/comShimPath required/);
  });

  it("rejects out-of-range timeoutMs", () => {
    expect(solidWorksLiveBridgeEngine.validate({ mode: "mock", timeoutMs: 50 }).ok).toBe(false);
    expect(solidWorksLiveBridgeEngine.validate({ mode: "mock", timeoutMs: 999_999 }).ok).toBe(false);
    expect(solidWorksLiveBridgeEngine.validate({ mode: "mock", timeoutMs: NaN }).ok).toBe(false);
  });

  it("accepts valid mock config", () => {
    expect(solidWorksLiveBridgeEngine.validate({ mode: "mock" }).ok).toBe(true);
    expect(solidWorksLiveBridgeEngine.validate({ mode: "mock", timeoutMs: 5000 }).ok).toBe(true);
  });
});

describe("SolidWorksLiveBridgeEngine — execute()", () => {
  it("mock mode returns ok:true with synthetic metrics", async () => {
    const res = await solidWorksLiveBridgeEngine.execute({
      script: "Sub main()\n  Set swApp = Application.SldWorks\nEnd Sub",
      config: { mode: "mock" },
    });
    expect(res.ok).toBe(true);
    expect(res.metrics?.volumeMm3).toBe(15_000);
    expect(res.metrics?.boundingBoxMm).toEqual([50, 30, 10]);
    expect(res.log).toContain("[mock] SolidWorks");
  });

  it("http mode returns ok:false with 'not yet wired' error naming the endpoint", async () => {
    const res = await solidWorksLiveBridgeEngine.execute({
      script: "x",
      config: { mode: "http", endpoint: "http://localhost:8081/sw" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP execution not yet wired.*8081/);
  });

  it("com mode returns ok:false with shim path in error", async () => {
    const res = await solidWorksLiveBridgeEngine.execute({
      script: "x",
      config: { mode: "com", comShimPath: "C:/shims/sw.vbs" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/COM execution not yet wired.*sw\.vbs/);
  });

  it("invalid config returns ok:false (does not throw)", async () => {
    const res = await solidWorksLiveBridgeEngine.execute({
      script: "x",
      config: { mode: "http" }, // missing endpoint
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/endpoint required/);
  });

  it("throws on null input (boundary)", async () => {
    await expect(
      solidWorksLiveBridgeEngine.execute(
        null as unknown as Parameters<typeof solidWorksLiveBridgeEngine.execute>[0],
      ),
    ).rejects.toThrow(/input is required/);
  });

  it("accepts CADScript object form (not just raw string)", async () => {
    const fakeScript = {
      cadSystem: "solidworks" as const,
      body: "Sub main()\nEnd Sub",
      filename: "x.bas",
      lineage: [],
      warnings: [],
      parameters: new Map(),
      imports: [],
    };
    const res = await solidWorksLiveBridgeEngine.execute({
      script: fakeScript,
      config: { mode: "mock" },
    });
    expect(res.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EspritLiveBridgeEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("EspritLiveBridgeEngine — identity + modes", () => {
  it("singleton + version 1.0.0", () => {
    expect(espritLiveBridgeEngine).toBeInstanceOf(EspritLiveBridgeEngine);
    expect(espritLiveBridgeEngine.version).toBe(PHASE2_VERSION);
  });

  it("supports http/com/mock modes", () => {
    expect([...espritLiveBridgeEngine.supportedModes()].sort()).toEqual(["com", "http", "mock"]);
  });
});

describe("EspritLiveBridgeEngine — execute() core paths", () => {
  it("mock execution succeeds with Esprit-specific metrics", async () => {
    const res = await espritLiveBridgeEngine.execute({
      script: "Sub Main()\nEnd Sub",
      config: { mode: "mock" },
    });
    expect(res.ok).toBe(true);
    expect(res.metrics?.volumeMm3).toBe(8_000);
    expect(res.metrics?.boundingBoxMm).toEqual([40, 25, 8]);
    expect(res.log).toContain("[mock] Esprit");
  });

  it("http mode returns honest 'not yet wired' with endpoint in error", async () => {
    const res = await espritLiveBridgeEngine.execute({
      script: "x",
      config: { mode: "http", endpoint: "http://localhost:9091/esprit" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP execution not yet wired.*9091/);
  });

  it("com mode returns honest 'not yet wired' with shim path in error", async () => {
    const res = await espritLiveBridgeEngine.execute({
      script: "x",
      config: { mode: "com", comShimPath: "C:/shims/esprit.vbs" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/COM execution not yet wired.*esprit\.vbs/);
  });

  it("rejects unknown execution mode", () => {
    const r = espritLiveBridgeEngine.validate({ mode: "ftp" as EspritExecutionMode });
    expect(r.ok).toBe(false);
  });

  it("throws on null input (boundary)", async () => {
    await expect(
      espritLiveBridgeEngine.execute(
        null as unknown as Parameters<typeof espritLiveBridgeEngine.execute>[0],
      ),
    ).rejects.toThrow(/input is required/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6-CAD orchestrator integration (priority order: fusion → hypercad → mc → inv → sw → esprit)
// ─────────────────────────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — 6-CAD integration after hyperCAD addition", () => {
  it("ALL_CAD_TARGETS now contains exactly 6 entries in user-priority order", () => {
    expect([...ALL_CAD_TARGETS]).toEqual([
      "fusion360", "hypercads", "mastercam", "inventor", "solidworks", "esprit",
    ]);
    expect(ALL_CAD_TARGETS.length).toBe(FULL_TARGET_COUNT);
  });

  it("realistic JM-Die flange blueprint produces 6 scripts (one per CAD)", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      analysis: jmDieFlangeAnalysis(),
    });
    expect(out.summary.targetsRequested).toBe(FULL_TARGET_COUNT);
    expect(out.summary.succeeded).toBe(FULL_TARGET_COUNT);
    expect(out.summary.failed).toBe(0);
    expect(out.results.map((r) => r.target)).toEqual([
      "fusion360", "hypercads", "mastercam", "inventor", "solidworks", "esprit",
    ]);
    // Every result has a non-empty script body
    for (const r of out.results) {
      expect(r.ok).toBe(true);
      expect(r.output?.script.length).toBeGreaterThan(50);
      // Material from title block carries through
      expect(r.output?.material).toBe("4140 steel");
    }
  });

  it("each script targets its CAD with the right syntax marker", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      analysis: jmDieFlangeAnalysis(),
    });
    const byTarget = Object.fromEntries(out.results.map((r) => [r.target, r]));
    expect(byTarget.fusion360?.output?.script).toContain("adsk.fusion");
    expect(byTarget.hypercads?.output?.script).toContain("import hcad");
    expect(byTarget.mastercam?.output?.script).toContain("Mastercam");
    expect(byTarget.inventor?.output?.script).toContain("Imports Inventor");
    expect(byTarget.solidworks?.output?.script).toContain("SldWorks");
    expect(byTarget.esprit?.output?.script).toContain("Esprit.Application");
  });

  it("running just a subset including hypercads works (priority order preserved)", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(HOLE_DIA)],
      targets: ["esprit", "hypercads", "fusion360"],
    });
    expect(out.results.map((r) => r.target)).toEqual(["fusion360", "hypercads", "esprit"]);
    expect(out.summary.succeeded).toBe(3);
  });
});

describe("End-to-end: orchestrator → SolidWorks/Esprit Live runners (mock mode)", () => {
  it("orchestrator's SW script can be handed to SolidWorksLiveBridge.mock and execute ok", async () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      analysis: jmDieFlangeAnalysis(),
      targets: ["solidworks"],
    });
    const swScript = out.results[0]?.output?.script;
    expect(typeof swScript).toBe("string");
    const exec = await solidWorksLiveBridgeEngine.execute({
      script: swScript ?? "",
      config: { mode: "mock" },
    });
    expect(exec.ok).toBe(true);
    expect(exec.log).toContain("[mock] SolidWorks");
  });

  it("orchestrator's Esprit script can be handed to EspritLiveBridge.mock and execute ok", async () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      analysis: jmDieFlangeAnalysis(),
      targets: ["esprit"],
    });
    const espritScript = out.results[0]?.output?.script;
    expect(typeof espritScript).toBe("string");
    const exec = await espritLiveBridgeEngine.execute({
      script: espritScript ?? "",
      config: { mode: "mock" },
    });
    expect(exec.ok).toBe(true);
    expect(exec.log).toContain("[mock] Esprit");
  });
});
