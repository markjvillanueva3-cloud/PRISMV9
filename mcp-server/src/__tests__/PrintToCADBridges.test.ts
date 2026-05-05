/**
 * Tests for PrintToMastercamBridge / PrintToInventorBridge / PrintToSolidWorksBridge / PrintToEspritBridge
 * (CAD-COMPLETE-MS0/U-CADC-{MC|INV|SW|ESP}-PRINT-01)
 *
 * Each bridge delegates ops translation to PrintToCADTranslator (covered by its
 * own test file) and routes them through a CAD-specific generator. These tests
 * verify:
 *   - Round-trip identity (singleton + version)
 *   - CAD-system-specific syntax markers in output script
 *   - Parameter pass-through (radius, depth, dimensions)
 *   - Material trailer comment style matches host language
 *   - Throws on the same canonical failure shapes as Fusion bridge
 */

import { describe, it, expect } from "vitest";
import {
  printToMastercamBridge,
  PrintToMastercamBridge,
} from "../engines/PrintToMastercamBridge.js";
import {
  printToInventorBridge,
  PrintToInventorBridge,
} from "../engines/PrintToInventorBridge.js";
import {
  printToSolidWorksBridge,
  PrintToSolidWorksBridge,
} from "../engines/PrintToSolidWorksBridge.js";
import {
  printToEspritBridge,
  PrintToEspritBridge,
} from "../engines/PrintToEspritBridge.js";
import { espritCodeGeneratorEngine } from "../engines/EspritCodeGeneratorEngine.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Shared fixtures ──────────────────────────────────────────────────────────

function dim(
  type: ExtractedDimension["type"],
  nominal: number,
  unit: "mm" | "in" = "mm",
): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    nominal,
    unit,
    raw_text: `${nominal}${unit}`,
    confidence: 0.9,
  };
}

function holeProfile(diameter_mm: number, x = 50, y = 50): ExtractedProfile {
  return {
    id: `hole-${diameter_mm}`,
    name: `Hole Ø${diameter_mm}`,
    type: "hole",
    points: [{ x, y }],
    is_closed: true,
    diameter_mm,
    confidence: 0.95,
  };
}

function pocketProfile(w: number, h: number): ExtractedProfile {
  return {
    id: `pocket-${w}x${h}`,
    name: `Pocket ${w}x${h}`,
    type: "pocket",
    points: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    is_closed: true,
    width_mm: w,
    height_mm: h,
    confidence: 0.9,
  };
}

// ── Mastercam ────────────────────────────────────────────────────────────────

describe("PrintToMastercamBridge", () => {
  it("singleton + version identity", () => {
    expect(printToMastercamBridge).toBeInstanceOf(PrintToMastercamBridge);
    expect(printToMastercamBridge.version).toBe("1.0.0");
  });

  it("emits Mastercam C# preamble: NetHook3App class + ArcGeometry for circle (radius=4)", () => {
    const out = printToMastercamBridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.script).toContain("NetHook3App");
    expect(out.script).toContain("ArcGeometry");
    expect(out.script).toMatch(/Radius\s*=\s*4\s*\*\s*UNIT_FACTOR/);
    expect(out.opsEmitted).toBe(3);
  });

  it("uses .cs filename and C++/C# trailer comment '// PRISM PrintToMastercamBridge'", () => {
    const out = printToMastercamBridge.buildBridgeScript({
      profiles: [holeProfile(5)],
    });
    expect(out.filename.endsWith(".cs")).toBe(true);
    expect(out.script).toContain("// PRISM PrintToMastercamBridge v1.0.0");
  });

  it("box primitive from 3 linears emits 4 LineGeometry rect lines", () => {
    const out = printToMastercamBridge.buildBridgeScript({
      dimensions: [dim("linear", 100), dim("linear", 50), dim("linear", 25)],
    });
    expect(out.parameters["extrude_depth"]?.value).toBe(25);
    const lineMatches = out.script.match(/LineGeometry/g) ?? [];
    expect(lineMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("throws on empty input", () => {
    expect(() => printToMastercamBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });
});

// ── Inventor ─────────────────────────────────────────────────────────────────

describe("PrintToInventorBridge", () => {
  it("singleton + version identity", () => {
    expect(printToInventorBridge).toBeInstanceOf(PrintToInventorBridge);
    expect(printToInventorBridge.version).toBe("1.0.0");
  });

  it("emits Inventor iLogic preamble: 'Imports Inventor' + AddByCenterRadius (radius=4)", () => {
    const out = printToInventorBridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.script).toContain("Imports Inventor");
    expect(out.script).toContain("ThisApplication");
    // Inventor call: AddByCenterRadius(<point>, 4)
    expect(out.script).toContain("AddByCenterRadius");
    expect(out.script).toMatch(/CreatePoint2d\(50, 50\), 4\)/);
    expect(out.opsEmitted).toBe(3);
  });

  it("uses .iLogicVb filename and VB-style trailer comment ' PRISM PrintToInventorBridge'", () => {
    const out = printToInventorBridge.buildBridgeScript({
      profiles: [holeProfile(5)],
    });
    expect(out.filename.endsWith(".iLogicVb")).toBe(true);
    expect(out.script).toContain("' PRISM PrintToInventorBridge v1.0.0");
  });

  it("documentType=part is the default and appears in the script header", () => {
    const out = printToInventorBridge.buildBridgeScript({
      dimensions: [dim("diameter", 20)],
    });
    expect(out.script).toContain("Document Type: part");
  });

  it("throws on null", () => {
    expect(() =>
      printToInventorBridge.buildBridgeScript(null as unknown as Parameters<typeof printToInventorBridge.buildBridgeScript>[0]),
    ).toThrow(/PrintToInventorBridge/);
  });
});

// ── SolidWorks ───────────────────────────────────────────────────────────────

describe("PrintToSolidWorksBridge", () => {
  it("singleton + version identity", () => {
    expect(printToSolidWorksBridge).toBeInstanceOf(PrintToSolidWorksBridge);
    expect(printToSolidWorksBridge.version).toBe("1.0.0");
  });

  it("emits SolidWorks VBA preamble: 'SldWorks' + 'Set swApp' + circle radius=4mm", () => {
    const out = printToSolidWorksBridge.buildBridgeScript({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.script).toContain("SldWorks");
    expect(out.script).toContain("Set swApp");
    // SW emits parameter "circle_radius" in mm via em.parameter call
    expect(out.parameters["circle_radius"]?.value).toBe(4);
  });

  it("uses .bas filename and VBA-style trailer comment ' PRISM PrintToSolidWorksBridge'", () => {
    const out = printToSolidWorksBridge.buildBridgeScript({
      profiles: [pocketProfile(40, 20)],
    });
    expect(out.filename.endsWith(".bas")).toBe(true);
    expect(out.script).toContain("' PRISM PrintToSolidWorksBridge v1.0.0");
  });

  it("throws on empty input", () => {
    expect(() => printToSolidWorksBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });
});

// ── Esprit ───────────────────────────────────────────────────────────────────

describe("EspritCodeGeneratorEngine — direct buildScript", () => {
  it("emits VB targeting Esprit COM API with CreateCircle for a circle op", () => {
    const script = espritCodeGeneratorEngine.buildScript(
      [
        { kind: "sketch_create", args: { plane: "XY" } },
        { kind: "sketch_circle", args: { centerX: 0, centerY: 0, radius: 5 } },
        {
          kind: "feature_extrude",
          args: { depth: 10, direction: "positive", operation: "new_body" },
        },
      ],
      { projectName: "TestEsprit", units: "mm" },
    );
    expect(script.body).toContain("CreateObject(\"Esprit.Application\")");
    expect(script.body).toContain("CreateCircle(0 * UNIT_FACTOR, 0 * UNIT_FACTOR, 5 * UNIT_FACTOR)");
    expect(script.body).toContain("oFeatures.Extrude(10 * UNIT_FACTOR");
    expect(script.filename).toBe("TestEsprit.esprit.vb");
    expect(script.body).toContain("End Sub");
  });

  it("declares mm UNIT_FACTOR=1 for mm units, 25.4 for inches", () => {
    const mmScript = espritCodeGeneratorEngine.buildScript(
      [{ kind: "sketch_create", args: { plane: "XY" } }],
      { projectName: "x", units: "mm" },
    );
    const inScript = espritCodeGeneratorEngine.buildScript(
      [{ kind: "sketch_create", args: { plane: "XY" } }],
      { projectName: "x", units: "in" },
    );
    expect(mmScript.parameters.get("UNIT_FACTOR")?.value).toBe(1.0);
    expect(inScript.parameters.get("UNIT_FACTOR")?.value).toBe(25.4);
  });

  it("throws UnsupportedCapabilityError for an unsupported op kind", () => {
    expect(() =>
      espritCodeGeneratorEngine.buildScript(
        [{ kind: "drawing_view_section", args: {} }],
        { projectName: "x", units: "mm" },
      ),
    ).toThrow(/does not support operation/);
  });
});

describe("PrintToEspritBridge", () => {
  it("singleton + version identity", () => {
    expect(printToEspritBridge).toBeInstanceOf(PrintToEspritBridge);
    expect(printToEspritBridge.version).toBe("1.0.0");
  });

  it("emits Esprit VB script with COM marker + circle + extrude (3 ops)", () => {
    const out = printToEspritBridge.buildBridgeScript({
      profiles: [holeProfile(10)],
      defaultDepth: 8,
    });
    expect(out.opsEmitted).toBe(3);
    expect(out.script).toContain("Esprit.Application");
    expect(out.script).toContain("CreateCircle");
    expect(out.script).toContain("oFeatures.Extrude(-8");
    expect(out.parameters["extrude_depth"]?.value).toBe(8);
  });

  it("uses .esprit.vb filename and VB-comment trailer ' PRISM PrintToEspritBridge'", () => {
    const out = printToEspritBridge.buildBridgeScript({
      profiles: [holeProfile(6)],
    });
    expect(out.filename.endsWith(".esprit.vb")).toBe(true);
    expect(out.script).toContain("' PRISM PrintToEspritBridge v1.0.0");
  });

  it("throws on empty input", () => {
    expect(() => printToEspritBridge.buildBridgeScript({})).toThrow(/at least one of/);
  });
});
