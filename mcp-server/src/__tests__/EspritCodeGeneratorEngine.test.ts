/**
 * Tests for EspritCodeGeneratorEngine — CAD-COMPLETE-MS0/U-CADC-ESP-CODEGEN-01
 *
 * Verifies VB.NET emission targeting Esprit's COM API: preamble structure,
 * per-op output, unit conversion, capability enforcement, and round-trip
 * lineage. Esprit COM execution itself is mocked (Windows + Esprit required).
 */

import { describe, it, expect } from "vitest";
import {
  EspritCodeGeneratorEngine,
  espritCodeGeneratorEngine,
} from "../engines/EspritCodeGeneratorEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

const CTX_MM = { projectName: "TestPart", units: "mm" as const };
const CTX_IN = { projectName: "TestPart", units: "in" as const };
const INCH_TO_MM = 25.4;

function op(kind: CADOperation["kind"], args: Record<string, unknown> = {}): CADOperation {
  return { kind, args: args as CADOperation["args"] };
}

describe("EspritCodeGeneratorEngine — identity + capabilities", () => {
  it("exports a singleton instance of EspritCodeGeneratorEngine", () => {
    expect(espritCodeGeneratorEngine).toBeInstanceOf(EspritCodeGeneratorEngine);
  });

  it("declares version 2024 and requires subprocess (Esprit COM)", () => {
    const caps = espritCodeGeneratorEngine.getCapabilities();
    expect(caps.version).toBe("2024");
    expect(caps.requiresSubprocess).toBe(true);
    expect(caps.nativeLengthUnit).toBe("mm");
    expect(caps.nativeAngleUnit).toBe("deg");
  });

  it("supports the canonical sketch/feature/boolean op set", () => {
    const supported = espritCodeGeneratorEngine.getCapabilities().supportedOps;
    expect(supported.has("sketch_create")).toBe(true);
    expect(supported.has("sketch_circle")).toBe(true);
    expect(supported.has("sketch_rectangle")).toBe(true);
    expect(supported.has("feature_extrude")).toBe(true);
    expect(supported.has("feature_revolve")).toBe(true);
    expect(supported.has("boolean_subtract")).toBe(true);
  });

  it("does NOT support drawing or surface ops (Esprit's CAM-first nature)", () => {
    const supported = espritCodeGeneratorEngine.getCapabilities().supportedOps;
    expect(supported.has("drawing_view_section")).toBe(false);
    expect(supported.has("surface_loft")).toBe(false);
  });
});

describe("EspritCodeGeneratorEngine — preamble + epilogue", () => {
  it("emits Imports DPTechnology.Esprit and creates oApp via COM", () => {
    const s = espritCodeGeneratorEngine.buildScript([op("sketch_create", { plane: "XY" })], CTX_MM);
    expect(s.body).toContain("Imports DPTechnology.Esprit");
    expect(s.body).toContain('CreateObject("Esprit.Application")');
    expect(s.body).toContain("oApp.Visible = True");
  });

  it("opens with Sub Main() and closes with End Sub", () => {
    const s = espritCodeGeneratorEngine.buildScript([op("sketch_create", { plane: "XY" })], CTX_MM);
    expect(s.body).toContain("Sub Main()");
    expect(s.body).toContain("End Sub");
  });

  it("declares UNIT_FACTOR = 1.0 for mm and 25.4 for inches", () => {
    const mm = espritCodeGeneratorEngine.buildScript([op("sketch_create", { plane: "XY" })], CTX_MM);
    const inS = espritCodeGeneratorEngine.buildScript([op("sketch_create", { plane: "XY" })], CTX_IN);
    expect(mm.parameters.get("UNIT_FACTOR")?.value).toBe(1.0);
    expect(inS.parameters.get("UNIT_FACTOR")?.value).toBe(INCH_TO_MM);
    expect(inS.body).toContain("Dim UNIT_FACTOR As Double = 25.4");
  });

  it("appends oDoc.SaveAs(...) when ctx.outputDir is provided", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [op("sketch_create", { plane: "XY" })],
      { projectName: "MyPart", units: "mm", outputDir: "C:/exports" },
    );
    expect(s.body).toContain('oDoc.SaveAs("C:/exports/MyPart.esp")');
  });

  it("filename is `<projectName>.esprit.vb`", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [op("sketch_create", { plane: "XY" })],
      { projectName: "FlangeV2", units: "mm" },
    );
    expect(s.filename).toBe("FlangeV2.esprit.vb");
  });
});

describe("EspritCodeGeneratorEngine — per-op emission", () => {
  it("sketch_circle emits CreateCircle with cx, cy, radius * UNIT_FACTOR", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_circle", { centerX: 10, centerY: 20, radius: 5 }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("oGeo.CreateCircle(10 * UNIT_FACTOR, 20 * UNIT_FACTOR, 5 * UNIT_FACTOR)");
  });

  it("sketch_rectangle emits CreateRectangle with origin + width + height", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_rectangle", { x: 0, y: 0, width: 40, height: 25 }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("CreateRectangle(0 * UNIT_FACTOR, 0 * UNIT_FACTOR, 40 * UNIT_FACTOR, 25 * UNIT_FACTOR)");
  });

  it("sketch_line emits CreateLine with the four endpoint coords", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_line", { x1: 0, y1: 0, x2: 50, y2: 30 }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("CreateLine(0 * UNIT_FACTOR, 0 * UNIT_FACTOR, 50 * UNIT_FACTOR, 30 * UNIT_FACTOR)");
  });

  it("sketch_arc emits CreateArc with center, radius, start angle, end angle", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_arc", { centerX: 0, centerY: 0, radius: 10, startAngle: 0, endAngle: 90 }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("CreateArc(0 * UNIT_FACTOR, 0 * UNIT_FACTOR, 10 * UNIT_FACTOR, 0, 90)");
  });

  it("feature_extrude with operation='cut' emits oFeatures.Extrude(-depth, \"Cut\")", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_circle", { centerX: 0, centerY: 0, radius: 4 }),
        op("feature_extrude", { depth: 12, direction: "negative", operation: "cut" }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain('oFeatures.Extrude(-12 * UNIT_FACTOR, "Cut")');
  });

  it("feature_extrude with operation='join' emits Add", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_circle", { centerX: 0, centerY: 0, radius: 4 }),
        op("feature_extrude", { depth: 8, direction: "positive", operation: "join" }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain('oFeatures.Extrude(8 * UNIT_FACTOR, "Add")');
  });

  it("feature_revolve emits Revolve(angle)", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("feature_revolve", { angle: 270 }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("oFeatures.Revolve(270)");
  });

  it("feature_hole emits AddHole with x, y, dia, depth converted via UNIT_FACTOR", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [op("feature_hole", { x: 10, y: 5, diameter: 6, depth: 15 })],
      CTX_MM,
    );
    expect(s.body).toContain("AddHole(10 * UNIT_FACTOR, 5 * UNIT_FACTOR, 6 * UNIT_FACTOR, 15 * UNIT_FACTOR)");
  });

  it("boolean_union / subtract / intersect emit the corresponding oSolids method", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("boolean_union"),
        op("boolean_subtract"),
        op("boolean_intersect"),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("oSolids.Union()");
    expect(s.body).toContain("oSolids.Subtract()");
    expect(s.body).toContain("oSolids.Intersect()");
  });

  it("import_step emits oDoc.Import with file path", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [op("import_step", { path: "C:/parts/flange.step" })],
      CTX_MM,
    );
    expect(s.body).toContain('oDoc.Import("C:/parts/flange.step")');
  });

  it("custom op emits the raw code block verbatim", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [op("custom", { code: "Dim oTool As Object = oDoc.ToolManager.GetTool(1)" })],
      CTX_MM,
    );
    expect(s.body).toContain("Dim oTool As Object = oDoc.ToolManager.GetTool(1)");
  });
});

describe("EspritCodeGeneratorEngine — capability + lineage + parameters", () => {
  it("throws UnsupportedCapabilityError for drawing_view_section", () => {
    expect(() =>
      espritCodeGeneratorEngine.buildScript([op("drawing_view_section", {})], CTX_MM),
    ).toThrow(/does not support operation 'drawing_view_section'/);
  });

  it("emits parameter UNIT_FACTOR + per-feature params (extrude_depth, fillet_radius)", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_circle", { centerX: 0, centerY: 0, radius: 5 }),
        op("feature_extrude", { depth: 20, operation: "new_body" }),
        op("feature_fillet", { radius: 1.5 }),
      ],
      CTX_MM,
    );
    expect(s.parameters.get("UNIT_FACTOR")?.value).toBe(1.0);
    expect(s.parameters.get("extrude_depth")?.value).toBe(20);
    expect(s.parameters.get("fillet_radius")?.value).toBe(1.5);
  });

  it("lineage records one entry per op with monotonic line ranges", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("sketch_circle", { centerX: 0, centerY: 0, radius: 5 }),
        op("feature_extrude", { depth: 10, operation: "new_body" }),
      ],
      CTX_MM,
    );
    expect(s.lineage.length).toBe(3);
    for (let i = 1; i < s.lineage.length; i++) {
      expect(s.lineage[i]!.lineStart).toBeGreaterThanOrEqual(s.lineage[i - 1]!.lineEnd);
    }
  });

  it("op-comment header appears for every op (' ── Op N: kind ──')", () => {
    const s = espritCodeGeneratorEngine.buildScript(
      [
        op("sketch_create", { plane: "XY" }),
        op("feature_extrude", { depth: 10, operation: "new_body" }),
      ],
      CTX_MM,
    );
    expect(s.body).toContain("' ── Op 0: sketch_create ──");
    expect(s.body).toContain("' ── Op 1: feature_extrude ──");
  });
});

describe("EspritCodeGeneratorEngine — runScriptBody mock + edge cases", () => {
  it("runScriptBody returns ok:false with explicit 'not yet wired' error (Esprit COM unmocked)", async () => {
    const s = espritCodeGeneratorEngine.buildScript([op("sketch_create", { plane: "XY" })], CTX_MM);
    const res = await espritCodeGeneratorEngine.executeScript(s);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not yet wired/);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("empty op list still emits a valid Sub Main()/End Sub skeleton", () => {
    const s = espritCodeGeneratorEngine.buildScript([], CTX_MM);
    expect(s.body).toContain("Sub Main()");
    expect(s.body).toContain("End Sub");
    expect(s.lineage.length).toBe(0);
  });
});
