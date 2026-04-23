/**
 * inventorCADCodeGenerator.sheetmetal.test.ts — U-CADC10
 *
 * Coverage for 10 sheet-metal ops + 5 hardened TranslatorAddIn-based
 * import/export ops. Invokes through cadDispatcher for round-trip wiring.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      _desc: string,
      _schema: unknown,
      handler: CapturedTool["handler"]
    ) {
      tools.push({ name, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function gen(
  operations: Array<{ kind: string; args: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({
    action: "inventor_generate_script",
    params: { operations, projectName: "u_cadc10_sheet", units: "mm" },
  });
  const asRecord = response as Record<string, unknown>;
  if (asRecord.success === false) {
    // Unexpected error — propagate so tests see the actual message
    throw new Error(`dispatcher error: ${String(asRecord.error)}`);
  }
  const content = asRecord.content as
    | Array<{ type: string; text: string }>
    | undefined;
  const text = content?.[0]?.text ?? "";
  return JSON.parse(text) as Record<string, unknown>;
}

async function rawCall(
  operations: Array<{ kind: string; args: Record<string, unknown> }>
): Promise<Record<string, unknown>> {
  const response: unknown = await handler({
    action: "inventor_generate_script",
    params: { operations, projectName: "u_cadc10_raw" },
  });
  const asRecord = response as Record<string, unknown>;
  if (asRecord.success === false) return asRecord;
  const content = asRecord.content as
    | Array<{ type: string; text: string }>
    | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as any);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─────────────────────────────────────────────────────────────────────────────
// Sheet Metal Ops (10)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC10 · sheet_metal_init", () => {
  it("emits SheetMetalComponentDefinition + thickness + K-factor", async () => {
    const r = await gen([
      {
        kind: "sheet_metal_init",
        args: { thickness: 2.0, material: "Steel_MM.ipm", k_factor: 0.44 },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("SheetMetalComponentDefinition");
    expect(s).toContain("oSmDef.Thickness.Value = 2");
    expect(s).toContain("Steel_MM.ipm");
    expect(s).toContain("0.44");
  });

  it("applies default material/thickness when unspecified", async () => {
    const r = await gen([{ kind: "sheet_metal_init", args: {} }]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("oSmDef.Thickness.Value = 1.5");
    expect(s).toContain("Default_MM.ipm");
  });
});

describe("U-CADC10 · sheet_metal_face", () => {
  it("emits FaceFeatures.Add with profile", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: { thickness: 1.5 } },
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 100, height: 60 } },
      { kind: "sheet_metal_face", args: { profile_sketch: 1 } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("FaceFeatures.CreateFaceFeatureDefinition");
    expect(s).toContain("oSmDef.FaceFeatures.Add(faceDef)");
  });

  it("enables double-sided (centerline) when requested", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_rectangle", args: { x: 0, y: 0, width: 50, height: 50 } },
      { kind: "sheet_metal_face", args: { profile_sketch: 1, double_sided: true } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("BendFromCenterline = True");
  });
});

describe("U-CADC10 · sheet_metal_flange", () => {
  it("emits FlangeFeatures.Add with edge + length + angle", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_flange",
        args: { edge_index: 2, length: 20, angle: 90 },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("FlangeFeatures.CreateFlangeDefinition");
    expect(s).toContain("90 * PI / 180");
    expect(s).toContain("Edges.Item(2)");
  });

  it("supports width-extent flanges", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_flange",
        args: { edge_index: 1, length: 15, extent: "width" },
      },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("WidthExtent");
  });

  it("rejects missing edge_index (failure mode)", async () => {
    const r = await rawCall([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_flange", args: { length: 10 } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("edge_index");
  });
});

describe("U-CADC10 · sheet_metal_contour_flange", () => {
  it("emits ContourFlangeFeatures.Add with sketch + edge", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sketch_create", args: { plane: "XZ" } },
      { kind: "sketch_line", args: { x1: 0, y1: 0, x2: 0, y2: 30 } },
      {
        kind: "sheet_metal_contour_flange",
        args: { profile_sketch: 1, edge_index: 3, width: 50 },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("ContourFlangeFeatures.CreateContourFlangeDefinition");
    expect(s).toContain("50");
  });
});

describe("U-CADC10 · sheet_metal_hem", () => {
  it("emits HemFeatures.Add with single-hem type", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_hem",
        args: { edge_index: 4, hem_type: "single", gap: 0.1, length: 3 },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("HemFeatures.CreateHemDefinition");
    expect(s).toContain("kSingleHem");
    expect(s).toContain("hemDef.Gap = 0.1");
    expect(s).toContain("hemDef.Length = 3");
  });

  it("supports teardrop, rolled, double", async () => {
    for (const [type, expected] of [
      ["teardrop", "kTeardropHem"],
      ["rolled", "kRolledHem"],
      ["double", "kDoubleHem"],
    ] as const) {
      const r = await gen([
        { kind: "sheet_metal_init", args: {} },
        { kind: "sheet_metal_hem", args: { edge_index: 1, hem_type: type } },
      ]);
      expect(r.success, `hem ${type}`).toBe(true);
      expect((r.script as string)).toContain(expected);
    }
  });

  it("rejects unknown hem_type (failure mode)", async () => {
    const r = await rawCall([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_hem", args: { edge_index: 1, hem_type: "origami" } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("unknown hem_type");
  });
});

describe("U-CADC10 · sheet_metal_bend", () => {
  it("emits BendFeatures.Add with default radius", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_bend", args: { edge_index: 5 } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("BendFeatures.CreateBendDefinition");
    expect(s).toContain("Edges.Item(5)");
    // No explicit radius line when default
    expect(s).not.toContain("BendRadius.Value");
  });

  it("applies custom radius when supplied", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_bend", args: { edge_index: 2, radius: 3 } },
    ]);
    expect(r.success).toBe(true);
    expect((r.script as string)).toContain("BendRadius.Value = 3");
  });
});

describe("U-CADC10 · sheet_metal_corner_seam", () => {
  it("emits CornerSeamFeatures.Add with no_overlap default", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_corner_seam",
        args: { edge_a: 1, edge_b: 2 },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("CornerSeamFeatures.CreateCornerSeamDefinition");
    expect(s).toContain("kCornerSeamNoOverlap");
  });

  it("supports overlap and reverse_overlap types", async () => {
    for (const [seam, expected] of [
      ["overlap", "kCornerSeamOverlap"],
      ["reverse_overlap", "kCornerSeamReverseOverlap"],
    ] as const) {
      const r = await gen([
        { kind: "sheet_metal_init", args: {} },
        {
          kind: "sheet_metal_corner_seam",
          args: { edge_a: 1, edge_b: 2, seam_type: seam },
        },
      ]);
      expect(r.success, `seam ${seam}`).toBe(true);
      expect((r.script as string)).toContain(expected);
    }
  });

  it("rejects unknown seam_type", async () => {
    const r = await rawCall([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_corner_seam",
        args: { edge_a: 1, edge_b: 2, seam_type: "quantum" },
      },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("unknown seam_type");
  });
});

describe("U-CADC10 · sheet_metal_punch", () => {
  it("emits PunchToolFeatures.Add with iFeature reference", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "sketch_point", args: { x: 25, y: 25 } },
      {
        kind: "sheet_metal_punch",
        args: {
          ide_file: "C:\\Inventor\\Catalog\\Square_Hole.ide",
          sketch_point_index: 1,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("PunchToolFeatures.CreatePunchToolDefinition");
    expect(s).toContain("C:\\\\Inventor\\\\Catalog\\\\Square_Hole.ide");
  });

  it("rejects missing ide_file", async () => {
    const r = await rawCall([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_punch", args: {} },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("ide_file");
  });
});

describe("U-CADC10 · sheet_metal_unfold / refold", () => {
  it("unfold emits UnfoldFeatures.Add with bend collection", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_unfold", args: { bend_indices: [3, 4, 5] } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("UnfoldFeatures.Add");
    expect(s).toContain("oSmDef.Features.Item(3)");
    expect(s).toContain("oSmDef.Features.Item(5)");
  });

  it("unfold rejects empty bend_indices (boundary)", async () => {
    const r = await rawCall([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_unfold", args: { bend_indices: [] } },
    ]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("bend_indices");
  });

  it("refold with explicit unfold index emits RefoldFeatures.Add", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_unfold", args: { bend_indices: [2] } },
      { kind: "sheet_metal_refold", args: { unfold_index: 3 } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("RefoldFeatures.Add");
    expect(s).toContain("Item(3)");
  });

  it("refold without index walks features to find UnfoldFeature", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_refold", args: {} },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("TypeOf smFeat Is UnfoldFeature");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hardened Translator Import/Export (5)
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC10 · hardened import/export translators", () => {
  it("import_step uses TranslatorAddIn class-id + TranslationContext", async () => {
    const r = await gen([
      { kind: "import_step", args: { file: "C:\\parts\\housing.step" } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("ApplicationAddIns.ItemById");
    expect(s).toContain("{90AF7F40-0C01-11D5-8E83-0010B541CD80}"); // STEP
    expect(s).toContain("kFileBrowseIOMechanism");
    expect(s).toContain("stepTrans.Open");
    expect(s).not.toContain("oApp.Documents.Open("); // no naive open
  });

  it("import_iges uses IGES translator class-id", async () => {
    const r = await gen([
      { kind: "import_iges", args: { file: "D:\\iges\\part.igs" } },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain("{90AF7F44-0C01-11D5-8E83-0010B541CD80}"); // IGES
    expect(s).toContain("igesTrans.Open");
  });

  it("export_step passes ApplicationProtocolType option (AP214 default)", async () => {
    const r = await gen([
      {
        kind: "export_step",
        args: {
          file: "out.stp",
          protocol: 214,
          application_protocol: 3,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain('"ApplicationProtocolType", 3');
    expect(s).toContain("SaveCopyAs");
  });

  it("export_stl emits binary/ASCII + unit + resolution options", async () => {
    const r = await gen([
      {
        kind: "export_stl",
        args: {
          file: "part.stl",
          binary: true,
          units: "millimeter",
          resolution: "high",
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain('"OutputFileType", 0'); // binary=0
    expect(s).toContain('"ExportUnits", 2'); // mm=2
    expect(s).toContain('"Resolution", 0'); // high=0
    expect(s).toContain("{533E9A98-FC3B-11D4-8E7E-0010B541CD80}"); // STL
  });

  it("export_stl ASCII mode uses OutputFileType=1 with inch units", async () => {
    const r = await gen([
      {
        kind: "export_stl",
        args: {
          file: "part.stl",
          binary: false,
          units: "inch",
          resolution: "medium",
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain('"OutputFileType", 1'); // ASCII
    expect(s).toContain('"ExportUnits", 5'); // inch=5
    expect(s).toContain('"Resolution", 1'); // medium=1
  });

  it("export_dxf emits FileVersion + ExplodeTextIntoPolylines", async () => {
    const r = await gen([
      {
        kind: "export_dxf",
        args: {
          file: "drawing.dxf",
          dxf_version: 2018,
          explode_text: true,
        },
      },
    ]);
    expect(r.success).toBe(true);
    const s = r.script as string;
    expect(s).toContain('"FileVersion", 2018');
    expect(s).toContain('"ExplodeTextIntoPolylines", True');
    expect(s).toContain("{C24E3AC4-122E-11D5-8E91-0010B541CD80}"); // DXF
  });

  it("rejects missing file arg on export_step", async () => {
    const r = await rawCall([{ kind: "export_step", args: {} }]);
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("file");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC10 · capability matrix", () => {
  it("includes all 10 sheet-metal ops", async () => {
    const res = await handler({
      action: "inventor_capabilities",
      params: {},
    });
    const body = JSON.parse(res.content[0]!.text) as Record<string, unknown>;
    const caps = body.capabilities as { supportedOps: string[] };
    for (const op of [
      "sheet_metal_init",
      "sheet_metal_face",
      "sheet_metal_flange",
      "sheet_metal_contour_flange",
      "sheet_metal_hem",
      "sheet_metal_bend",
      "sheet_metal_corner_seam",
      "sheet_metal_punch",
      "sheet_metal_unfold",
      "sheet_metal_refold",
    ]) {
      expect(caps.supportedOps, `missing op ${op}`).toContain(op);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ─────────────────────────────────────────────────────────────────────────────

describe("U-CADC10 · adversarial inputs", () => {
  it("tolerates Infinity length on flange", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      {
        kind: "sheet_metal_flange",
        args: { edge_index: 1, length: Infinity, angle: 90 },
      },
    ]);
    expect(r.success).toBe(true);
  });

  it("handles 30-bend unfold (oversize)", async () => {
    const bends = Array.from({ length: 30 }, (_, i) => i + 1);
    const r = await gen([
      { kind: "sheet_metal_init", args: {} },
      { kind: "sheet_metal_unfold", args: { bend_indices: bends } },
    ]);
    expect(r.success).toBe(true);
    // Each bend should produce one unfoldObjects.Add call
    const adds = (
      (r.script as string).match(/unfoldObjects\.Add/g) || []
    ).length;
    expect(adds).toBe(30);
  });

  it("export_stl accepts unknown units defaulting safely", async () => {
    const r = await gen([
      {
        kind: "export_stl",
        args: { file: "x.stl", units: "furlong" },
      },
    ]);
    expect(r.success).toBe(true);
    // Unknown → default mm=2
    expect((r.script as string)).toContain('"ExportUnits", 2');
  });

  it("handles NaN k_factor on init without crash", async () => {
    const r = await gen([
      { kind: "sheet_metal_init", args: { k_factor: NaN } },
    ]);
    expect(r.success).toBe(true);
  });
});
